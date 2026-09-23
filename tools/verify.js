/**
 * Verification harness.
 *
 * Drives the real page in headless Chromium and asserts the behaviours the
 * design brief depends on: no console errors, reveals actually fire, the pin
 * narrative advances, the contact flow reaches its handoff slide, the studio
 * panel re-themes the document, and reduced-motion renders a static page.
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

  // Scroll-driven scrub writes a transform
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(700);
  const scrubY = await page.evaluate(() => {
    const el = document.querySelector('[data-scrub]');
    return el.style.getPropertyValue('--scrub-y');
  });
  check('scrub drives a transform value', !!scrubY && scrubY !== '0px', scrubY);

  // Progress rail advances
  const prog = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--page-progress').trim());
  check('page progress rail advances', parseFloat(prog) > 0, prog);

  // Pin narrative: scroll into it and confirm the active layer changes
  const pinTop = await page.evaluate(() => {
    const el = document.querySelector('[data-pin]');
    return el.getBoundingClientRect().top + window.scrollY;
  });
  const layer0 = await page.evaluate(() =>
    document.querySelectorAll('[data-pin-layer]')[0].classList.contains('is-active'));
  await page.evaluate((y) => window.scrollTo(0, y + 900), pinTop);
  await page.waitForTimeout(700);
  const activeIdx = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-pin-layer]')).findIndex((l) =>
      l.classList.contains('is-active')));
  check('pin narrative advances past layer 0', layer0 && activeIdx > 0, `active=${activeIdx}`);

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
    /^mailto:tamif@dontman\.tech\?subject=/.test(mailHref || '') && /body=/.test(mailHref || ''),
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

  // Studio: palette switch retints tokens
  const before = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  await page.click('[data-studio-open]');
  await page.waitForTimeout(500);
  await page.click('[data-palette-btn="ember"]');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  check('studio palette switch retints the theme', before !== after, `${before} → ${after}`);

  // Title customisation
  await page.fill('[data-title-input]', 'Custom Title Test');
  await page.waitForTimeout(300);
  const title = await page.title();
  check('studio edits the document title', title === 'Custom Title Test', title);

  // Favicon customisation
  await page.click('[data-favicon-btn="orbit"]');
  await page.waitForTimeout(300);
  const fav = await page.getAttribute('link[rel="icon"][type="image/svg+xml"]', 'href');
  check('studio swaps the favicon', /image\/svg\+xml/.test(fav || '') && /ellipse/.test(decodeURIComponent(fav || '')));

  // Prefs persist across a reload
  await page.reload({ waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(900);
  const persisted = await page.evaluate(() => document.documentElement.dataset.palette);
  check('studio preferences persist', persisted === 'ember', persisted);

  // Reset clears
  await page.click('[data-studio-open]');
  await page.waitForTimeout(400);
  await page.click('[data-reset]');
  await page.waitForTimeout(500);
  const resetPal = await page.evaluate(() => document.documentElement.dataset.palette || '');
  check('studio reset returns to defaults', resetPal === '', resetPal || '(none)');

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
  const rmScrub = await rmPage.evaluate(() =>
    document.querySelector('[data-scrub]').style.getPropertyValue('--scrub-y'));
  check('reduced motion disables scrub transforms', !rmScrub, rmScrub || '(none)');
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
