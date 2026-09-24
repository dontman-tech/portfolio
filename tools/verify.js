/**
 * Verification harness.
 *
 * Drives the real page in headless Chromium and asserts the behaviours the
 * design brief depends on: no console errors, reveals actually fire, the
 * contact flow reaches its handoff slide, and reduced-motion renders a static
 * page.
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

  // Method section: three rules, each revealed as its own band
  const stepCount = await page.evaluate(() => document.querySelectorAll('#method .step').length);
  check('method section renders three steps', stepCount === 3, `${stepCount} steps`);
  // Walk the section band by band: each step is taller than the viewport, so
  // one scroll to the top only ever reveals the first.
  for (const el of await page.$$('#method .step')) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(900);
  const stepsIn = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#method .step [data-reveal]')).every((e) =>
      e.classList.contains('is-in')));
  const total = await page.evaluate(() =>
    document.querySelectorAll('#method .step [data-reveal]').length);
  check('method steps reveal on scroll', stepsIn, `allRevealed=${stepsIn} of ${total}`);

  // Regression: clip-revealed elements must actually reveal. A clipped element
  // reports intersectionRatio 0, so a non-zero observer threshold silently
  // leaves every project image invisible.
  for (const el of await page.$$('.chapter__media')) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(700);
  const clips = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.chapter__media, .step__num [data-clip-x]')).map((e) => ({
      isIn: e.classList.contains('is-in'),
      op: getComputedStyle(e).opacity,
    })));
  const clipsOk = clips.length > 0 && clips.every((c) => c.isIn && Number(c.op) > 0.9);
  check('clip-revealed media becomes visible', clipsOk,
    `${clips.filter((c) => c.isIn).length}/${clips.length} revealed`);

  // Fixed backdrop parallax: the layer must actually translate with scroll.
  const parStart = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return getComputedStyle(document.querySelector('[data-parallax-fixed]')).transform;
  });
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(500);
  const parEnd = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-parallax-fixed]')).transform);
  check('backdrop layers parallax on scroll', parStart !== parEnd, `${parStart} → ${parEnd}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

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
  const rmPin = await rmPage.evaluate(() => {
    const m = document.querySelector('[data-pin]');
    return {
      position: getComputedStyle(m).position,
      pin: m.style.getPropertyValue('--pin-s'),
    };
  });
  check('reduced motion disables the pin transform',
    rmPin.position === 'static' && !rmPin.pin,
    `position=${rmPin.position} --pin-s=${rmPin.pin || '(none)'}`);
  await rmPage.screenshot({ path: path.join(OUT, 'reduced-motion.png') });
  await rm.close();

  /* ---------- Pin + transform ---------- */
  // The brief calls for "pin + transform": the project card should hold still
  // while its (taller) copy column scrolls past, with the scroll range mapped
  // onto a settle transform. A regression here is silent — the page still
  // works, it just quietly loses the effect.
  {
    const pinPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pinPage.goto(BASE + '/', { waitUntil: 'load' });
    await pinPage.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
    await pinPage.waitForTimeout(1200);

    const geo = await pinPage.evaluate(() => {
      const ch = document.querySelector('.chapter');
      const media = ch.querySelector('.chapter__media');
      const copy = ch.querySelector('.chapter__copy');
      return {
        chapterTop: Math.round(ch.getBoundingClientRect().top + window.scrollY),
        mediaH: Math.round(media.getBoundingClientRect().height),
        copyH: Math.round(copy.getBoundingClientRect().height),
        position: getComputedStyle(media).position,
      };
    });

    check('chapter card is a sticky pin target', geo.position === 'sticky',
      `position: ${geo.position}`);
    // Pinning only reads as an effect if there is room to scroll while stuck.
    check('copy column is taller than the pinned card',
      geo.copyH > geo.mediaH + 80,
      `copy ${geo.copyH}px vs card ${geo.mediaH}px`);

    const tops = [];
    for (let i = 0; i < 7; i += 1) {
      await pinPage.evaluate((yy) => window.scrollTo(0, yy), geo.chapterTop - 200 + i * 140);
      await pinPage.waitForTimeout(240);
      tops.push(await pinPage.evaluate(() =>
        Math.round(document.querySelector('.chapter__media').getBoundingClientRect().top)));
    }

    // Once pinned the card must hold the same viewport offset for consecutive
    // steps, then release as the chapter leaves.
    const held = tops.slice(1, -1).some((t, i) => Math.abs(t - tops[i + 2]) <= 2);
    check('card stays pinned while the copy scrolls', held, `tops: ${tops.join(', ')}`);

    const pinT = await pinPage.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.chapter__media'));
      return { transform: cs.transform, pinS: cs.getPropertyValue('--pin-s').trim() };
    });
    check('pin drives a scroll-mapped transform',
      pinT.transform !== 'none' && pinT.pinS !== '',
      `transform=${pinT.transform} --pin-s=${pinT.pinS}`);
    await pinPage.close();
  }

  /* ---------- Fast-scroll resilience ---------- */
  // Reveals are scroll-triggered, so a reader who flings the page (or jumps via
  // an anchor) must never land on content that is on screen but still at
  // opacity 0. Anything visible in the viewport has to have resolved.
  {
    const fling = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await fling.goto(BASE + '/', { waitUntil: 'load' });
    await fling.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
    await fling.waitForTimeout(1200);
    await fling.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await fling.waitForTimeout(2000);

    const stranded = await fling.evaluate(() => {
      const vh = window.innerHeight;
      const els = [...document.querySelectorAll(
        '[data-reveal],[data-fade],[data-clip],[data-clip-x],[data-stagger]>*')];
      return els.filter((e) => {
        const r = e.getBoundingClientRect();
        const onScreen = r.top < vh && r.bottom > 0 && r.height > 0;
        return onScreen && parseFloat(getComputedStyle(e).opacity) < 0.9;
      }).map((e) => String(e.className).split(' ')[0]);
    });
    check('fast scroll never strands visible content', stranded.length === 0,
      stranded.slice(0, 4).join(', '));
    await fling.close();
  }

  await browser.close();

  const failedChecks = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed`);
  if (failedChecks.length) {
    console.log('failing:', failedChecks.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
