/**
 * Verification harness.
 *
 * Drives the real page in headless Chromium and asserts the behaviours the
 * design brief depends on: no console errors, reveals actually fire, the
 * method steps are discrete page sections, the contact flow reaches its
 * handoff slide, and reduced-motion renders a static page.
 *
 * Run:  node tools/verify.js
 */
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const OUT = path.resolve(__dirname, '..', '.verify');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  /* ---------- Desktop ---------- */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  const failed = [];
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  // Smooth scrolling makes programmatic scrolls animate, which makes observer
  // timing non-deterministic in tests. Force instant scrolling.
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1400);

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('no failed requests', failed.length === 0, failed.slice(0, 3).join(' | '));

  // Fonts actually applied?
  const fontOk = await page.evaluate(() => {
    const h = getComputedStyle(document.querySelector('.display')).fontFamily;
    return /Sora/.test(h);
  });
  check('display font resolves to Sora', fontOk);

  // Hero headline present and correct
  const hero = await page.textContent('.hero__title');
  check('hero states the value proposition',
    /survive contact/.test(hero) && /real devices/.test(hero));

  // Reveals: hero items should have resolved shortly after load
  const revealed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.hero [data-reveal]')).filter((e) =>
      e.classList.contains('is-in')).length);
  check('hero reveals resolve', revealed >= 3, `${revealed} resolved`);

  // Count-up finished
  await page.waitForTimeout(1600);
  const counts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-count]')).map((e) => e.textContent));
  check('counters reach their targets', counts.join(',') === '17,5,4,2', counts.join(','));

  // Scroll-driven parallax writes a transform to the background blobs
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(900);
  const parY = await page.evaluate(() => {
    const el = document.querySelector('.bg__blob[data-parallax]');
    return el.style.getPropertyValue('--par-y');
  });
  check('scroll drives a parallax transform value', !!parY && parY !== '0px', parY);

  // The smoothed scroll follower is what keeps motion from being choppy: after
  // a jump, the transform must ease toward its destination over several frames
  // rather than snapping. Sample just after the jump and again once settled.
  const easing = await page.evaluate(async () => {
    const el = document.querySelector('.bg__blob[data-parallax]');
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1400));
    const before = parseFloat(el.style.getPropertyValue('--par-y')) || 0;
    window.scrollTo(0, 1800);
    await new Promise((r) => setTimeout(r, 40));
    const during = parseFloat(el.style.getPropertyValue('--par-y')) || 0;
    await new Promise((r) => setTimeout(r, 1400));
    const after = parseFloat(el.style.getPropertyValue('--par-y')) || 0;
    return { before, during, after };
  });
  check('scroll motion eases instead of snapping',
    Math.abs(easing.after - easing.during) > 1 &&
      Math.abs(easing.during - easing.before) < Math.abs(easing.after - easing.before),
    `${easing.before.toFixed(1)} → ${easing.during.toFixed(1)} → ${easing.after.toFixed(1)}`);

  // Progress rail advances
  const prog = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--page-progress').trim());
  check('page progress rail advances', parseFloat(prog) > 0, prog);

  // Method: three discrete steps, each its own card on the page (no pinned
  // carousel swapping layers inside a sticky viewport).
  const steps = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('#method .step'));
    return {
      count: els.length,
      numbered: els.every((e) => !!e.querySelector('.step__num')),
      titled: els.every((e) => !!e.querySelector('.step__title')),
      hasPin: !!document.querySelector('[data-pin]'),
      hasLayer: !!document.querySelector('[data-pin-layer]'),
      heights: els.map((e) => Math.round(e.getBoundingClientRect().height)),
    };
  });
  check('method is split into discrete steps', steps.count === 3 && steps.numbered && steps.titled,
    `${steps.count} steps`);
  check('the pinned carousel is gone', !steps.hasPin && !steps.hasLayer,
    `pin=${steps.hasPin} layer=${steps.hasLayer}`);
  check('every method step has real height on the page', steps.heights.every((h) => h > 120),
    steps.heights.join(', '));

  // Stagger group resolves (children carry .is-in, since each is observed)
  await page.evaluate(() => document.querySelector('#about').scrollIntoView());
  await page.waitForTimeout(1400);
  const stagger = await page.evaluate(() => {
    const kids = Array.from(document.querySelector('.about__facts').children);
    return {
      total: kids.length,
      inCount: kids.filter((k) => k.classList.contains('is-in')).length,
      opaque: kids.filter((k) => parseFloat(getComputedStyle(k).opacity) > 0.9).length,
    };
  });
  check('stagger children reveal in sequence',
    stagger.inCount === stagger.total && stagger.opaque === stagger.total,
    `${stagger.inCount}/${stagger.total} revealed, ${stagger.opaque} opaque`);

  // Skill bars animate
  const skillW = await page.evaluate(() => {
    const f = document.querySelector('.skill__fill');
    return getComputedStyle(f).transform;
  });
  check('skill bars animate from scaleX(0)', skillW !== 'none', skillW);

  // Contact flow: four clicks should reach the handoff
  await page.evaluate(() => document.querySelector('#contact').scrollIntoView());
  await page.waitForTimeout(600);

  const slideCount = await page.evaluate(() =>
    document.querySelectorAll('[data-flow-slide]').length);
  check('contact flow has four slides', slideCount === 4, String(slideCount));

  await page.click('[data-flow-key="intent"]');
  await page.waitForTimeout(600);
  await page.click('[data-flow-key="context"]');
  await page.waitForTimeout(600);
  await page.click('[data-flow-key="shape"]');
  await page.waitForTimeout(700);

  const finalActive = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-flow-slide]')).findIndex((s) =>
      s.classList.contains('is-active')));
  check('flow advances to handoff slide', finalActive === 3, `active=${finalActive}`);

  const mailHref = await page.getAttribute('[data-flow-mail]', 'href');
  check('handoff builds a real mailto with subject+body',
    /^mailto:tabe7143@gmail.com\?subject=/.test(mailHref || '') && /body=/.test(mailHref || ''),
    (mailHref || '').slice(0, 70));

  const recapRows = await page.evaluate(() =>
    document.querySelectorAll('[data-flow-recap] .recap__row').length);
  check('handoff shows a recap of choices', recapRows === 4, `${recapRows} rows`);

  const formFields = await page.evaluate(() =>
    document.querySelectorAll('#contact input, #contact textarea, #contact select').length);
  check('contact has no form fields', formFields === 0, `${formFields} inputs`);

  // Back button works
  await page.click('[data-flow-back]');
  await page.waitForTimeout(600);
  const afterBack = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-flow-slide]')).findIndex((s) =>
      s.classList.contains('is-active')));
  check('flow back button steps backwards', afterBack === 2, `active=${afterBack}`);

  // Production build: the authoring studio, matrix rain and loader are gone.
  const removed = await page.evaluate(() => ({
    studio: !!document.querySelector('.studio, [data-studio-open], [data-studio-close]'),
    matrix: !!document.querySelector('.matrix-container, [data-matrix]'),
    loader: !!document.querySelector('.loader, [data-loader]'),
    palettes: document.querySelectorAll('[data-palette-btn]').length,
  }));
  check('design studio removed from the production build', !removed.studio && !removed.palettes,
    `studio=${removed.studio} swatches=${removed.palettes}`);
  check('matrix rain removed', !removed.matrix);
  check('loader removed', !removed.loader);

  // Light Apple palette is the only theme: no data-palette override.
  const theme = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      attr: document.documentElement.dataset.palette || '',
      accent: cs.getPropertyValue('--accent').trim(),
      bg: cs.getPropertyValue('background-color').trim(),
      colorScheme: cs.getPropertyValue('color-scheme').trim(),
    };
  });
  check('site is pinned to the Apple light accent (#0071e3)', theme.accent === '#0071e3', theme.accent);
  check('site declares the light colour scheme', theme.colorScheme === 'light', theme.colorScheme);
  check('no palette override attribute remains', theme.attr === '', theme.attr || '(none)');

  // Resume: served, a real PDF, and regenerated from a source that no longer
  // claims a Prometheus placement (only participation + the product built).
  const resume = await page.request.get(BASE + '/assets/resume/Tabe-Miracle-Fiagmenyi-Resume.pdf');
  const resumeBody = await resume.body();
  check('resume PDF still served', resume.status() === 200, String(resume.status()));
  check('resume PDF is a real PDF', resumeBody.slice(0, 5).toString() === '%PDF-');
  const resumeSrc = require('fs').readFileSync(
    path.join(__dirname, 'make_resume.py'), 'utf8');
  check('resume source drops the Prometheus ranking but keeps the build',
    !/4th Place|Finalist/i.test(resumeSrc) && /Prometheus AI Hackathon/.test(resumeSrc)
      && /Lumina/.test(resumeSrc),
    'ranking removed, participation kept');

  // Screenshots for eyeballing
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'desktop-hero.png') });
  await page.screenshot({ path: path.join(OUT, 'desktop-full.png'), fullPage: true });

  /* ---------- 404 ---------- */
  const p404 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const e404 = [];
  p404.on('pageerror', (e) => e404.push(String(e)));
  await p404.goto(BASE + '/404.html', { waitUntil: 'load' });
  await p404.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await p404.waitForTimeout(1000);
  check('404 page renders without errors', e404.length === 0, e404[0] || '');
  const routes = await p404.evaluate(() => document.querySelectorAll('.route').length);
  check('404 offers recovery routes', routes === 4, `${routes} routes`);
  await p404.screenshot({ path: path.join(OUT, '404.png') });

  /* ---------- Mobile ---------- */
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mErr = [];
  mobile.on('pageerror', (e) => mErr.push(String(e)));
  await mobile.goto(BASE + '/', { waitUntil: 'load' });
  await mobile.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await mobile.waitForTimeout(1200);
  check('mobile renders without errors', mErr.length === 0, mErr[0] || '');

  // Horizontal overflow is the classic mobile bug
  const overflow = await mobile.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow on mobile', overflow <= 1, `${overflow}px`);

  // Sheet opens and closes
  await mobile.click('[data-sheet-open]');
  await mobile.waitForTimeout(500);
  const sheetOpen = await mobile.evaluate(() =>
    document.querySelector('.sheet').classList.contains('is-open'));
  await mobile.screenshot({ path: path.join(OUT, 'mobile-sheet.png') });
  await mobile.click('[data-sheet-close]');
  await mobile.waitForTimeout(500);
  const sheetClosed = await mobile.evaluate(() =>
    !document.querySelector('.sheet').classList.contains('is-open'));
  check('mobile chapter sheet opens and closes', sheetOpen && sheetClosed);

  await mobile.screenshot({ path: path.join(OUT, 'mobile-hero.png') });

  /* ---------- Reduced motion ---------- */
  const rm = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rm.newPage();
  await rmPage.goto(BASE + '/', { waitUntil: 'load' });
  await rmPage.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await rmPage.waitForTimeout(1200);
  const rmOpacity = await rmPage.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    return els.filter((e) => parseFloat(getComputedStyle(e).opacity) === 1).length;
  });
  check('reduced motion shows all content', rmOpacity > 5, `${rmOpacity} visible`);
  const rmPar = await rmPage.evaluate(() => {
    const el = document.querySelector('.bg__blob[data-parallax]');
    return el ? el.style.getPropertyValue('--par-y') : '(no element)';
  });
  check('reduced motion disables scroll transforms', !rmPar, rmPar || '(none)');
  await rmPage.screenshot({ path: path.join(OUT, 'reduced-motion.png') });
  await rm.close();

  await browser.close();

  const failedChecks = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed`);
  if (failedChecks.length) {
    console.log('failing:', failedChecks.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
