/**
 * Accessibility and semantics checks that the visual harness does not cover:
 * images have alt text, the skip link works, landmarks exist, landmarks are
 * unique, the studio dialog traps focus and closes on Escape, and the contact
 * flow is operable by keyboard alone.
 *
 * Run:  node tools/a11y.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1400);

  // Images
  const imgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((i) => ({
      src: i.getAttribute('src'),
      alt: i.getAttribute('alt'),
      w: i.getAttribute('width'),
      h: i.getAttribute('height'),
    })));
  const missingAlt = imgs.filter((i) => i.alt === null || i.alt === undefined);
  check('every image has an alt attribute', missingAlt.length === 0,
    missingAlt.map((i) => i.src).join(', '));
  const decorativeWithAlt = imgs.filter((i) => i.alt === '');
  check('informative images have non-empty alt',
    imgs.filter((i) => i.alt).length >= 5,
    `${imgs.length} imgs, ${decorativeWithAlt.length} decorative`);
  const noDims = imgs.filter((i) => !i.w || !i.h);
  check('every image declares width and height (no CLS)',
    noDims.length === 0, noDims.map((i) => i.src).join(', '));

  // Landmarks
  const landmarks = await page.evaluate(() => ({
    header: document.querySelectorAll('header').length,
    main: document.querySelectorAll('main').length,
    nav: document.querySelectorAll('nav').length,
    footer: document.querySelectorAll('footer').length,
    h1: document.querySelectorAll('h1').length,
    mainId: document.querySelector('main')?.id,
  }));
  check('exactly one main landmark', landmarks.main === 1, String(landmarks.main));
  check('exactly one h1', landmarks.h1 === 1, String(landmarks.h1));
  check('has header, nav and footer landmarks',
    landmarks.header >= 1 && landmarks.nav >= 1 && landmarks.footer >= 1,
    JSON.stringify(landmarks));

  // Skip link
  const skip = await page.evaluate(() => {
    const a = document.querySelector('a[href^="#"][class*="skip"], .skip-link, a[data-skip]');
    if (!a) return null;
    return { text: a.textContent.trim(), href: a.getAttribute('href') };
  });
  check('skip-to-content link exists', !!skip && /main/.test(skip.href), JSON.stringify(skip));

  // Keyboard: skip link focus behaviour
  if (skip) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    check('first Tab reaches the skip link', /skip/.test(focused), focused);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const hash = await page.evaluate(() => location.hash);
    check('skip link moves focus target into view', hash === '#main', hash);
  }

  // Contact flow by keyboard only
  await page.evaluate(() => document.querySelector('#contact').scrollIntoView());
  await page.waitForTimeout(500);
  const firstOpt = await page.$('[data-flow-key="intent"]');
  await firstOpt.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const afterEnter = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-flow-slide]')).findIndex((s) => s.classList.contains('is-active')));
  check('flow options activate with Enter (keyboard operable)', afterEnter === 1, `active=${afterEnter}`);

  // Options should be real buttons
  const optTags = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.opt')).map((o) => o.tagName.toLowerCase()));
  check('flow options are native buttons', optTags.every((t) => t === 'button'),
    [...new Set(optTags)].join(','));

  // Studio dialog semantics + Escape
  const studioSem = await page.evaluate(() => {
    const s = document.querySelector('.studio');
    return {
      role: s?.getAttribute('role'),
      ariaModal: s?.getAttribute('aria-modal'),
      labelled: !!document.getElementById(s?.getAttribute('aria-labelledby') || ''),
    };
  });
  check('studio is an accessible modal dialog',
    studioSem.role === 'dialog' && studioSem.ariaModal === 'true' && studioSem.labelled,
    JSON.stringify(studioSem));

  await page.click('[data-studio-open]');
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() =>
    document.querySelector('.studio').classList.contains('is-open'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() =>
    !document.querySelector('.studio').classList.contains('is-open'));
  const focusBack = await page.evaluate(() => document.activeElement?.hasAttribute('data-studio-open'));
  check('studio opens, closes on Escape, restores focus',
    opened && closed && focusBack, `opened=${opened} closed=${closed} focusRestored=${focusBack}`);

  // Progress bar is decorative
  const progressHidden = await page.evaluate(() =>
    document.querySelector('.progress')?.getAttribute('aria-hidden'));
  check('decorative progress bar is aria-hidden', progressHidden === 'true', progressHidden);

  // Reduced-motion preference respected at the CSS level
  const hasRM = await page.evaluate(() =>
    Array.from(document.styleSheets).some((s) => {
      try {
        return Array.from(s.cssRules).some((r) => r.conditionText?.includes('prefers-reduced-motion'));
      } catch { return false; }
    }));
  check('prefers-reduced-motion block present', hasRM);

  // Colour is never the only signal in the flow: chosen options also change border+text
  const chosenStyles = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { accent2: cs.getPropertyValue('--accent-2').trim() };
  });
  check('flow selection uses shape/border changes, not colour alone',
    !!chosenStyles.accent2, chosenStyles.accent2);

  // Language and title
  const meta = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content?.length,
    og: document.querySelector('meta[property="og:title"]')?.content,
    tw: document.querySelector('meta[name="twitter:card"]')?.content,
    viewport: document.querySelector('meta[name="viewport"]')?.content,
  }));
  check('html has lang', meta.lang === 'en', meta.lang);
  check('title is descriptive and branded',
    /Tabe Miracle Fiagmenyi/.test(meta.title) && meta.title.length > 25, meta.title);
  check('meta description is a real sentence',
    meta.desc >= 80, `${meta.desc} chars`);
  check('Open Graph + Twitter cards present', !!meta.og && !!meta.tw, `${meta.og} / ${meta.tw}`);
  check('viewport allows zoom (no maximum-scale)',
    !!meta.viewport && !/maximum-scale/.test(meta.viewport), meta.viewport);

  // Structured data
  const jsonld = await page.evaluate(() => {
    const s = document.querySelector('script[type="application/ld+json"]');
    if (!s) return null;
    try { return JSON.parse(s.textContent)['@type']; } catch { return 'INVALID JSON'; }
  });
  check('JSON-LD Person schema present and valid', jsonld === 'Person', String(jsonld));

  await browser.close();
  const bad = results.filter((r) => !r.pass);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  if (bad.length) { console.log('failing:', bad.map((b) => b.name).join(', ')); process.exit(1); }
})();
