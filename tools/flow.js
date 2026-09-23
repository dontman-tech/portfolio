/**
 * Contact flow — the "four taps, then a real email" interaction.
 *
 * Asserts the whole story: every step can be chosen, Back rewinds, the
 * generated mailto is well-formed and encodes the answers, and the copy
 * button produces the same brief. This is the conversion path, so it gets its
 * own suite.
 *
 * Run:  node tools/flow.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: [],
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => document.querySelector('#contact').scrollIntoView());
  await page.waitForTimeout(800);

  const stepCount = await page.$$eval('[data-flow-slide]', (els) => els.length);
  check('contact flow has multiple steps', stepCount >= 4, `${stepCount} slides`);

  const activeInfo = () => page.evaluate(() => {
    const slide = document.querySelector('[data-flow-slide].is-active');
    const active = Array.from(document.querySelectorAll('[data-flow-slide]'))
      .findIndex((el) => el.classList.contains('is-active'));
    return {
      active,
      total: document.querySelectorAll('[data-flow-slide]').length,
      heading: slide?.querySelector('h3, .flow__h, .h3')?.textContent?.trim(),
      options: slide ? slide.querySelectorAll('[data-flow-opt]').length : 0,
      progress: document.querySelector('[data-flow-progress]')?.textContent?.trim()
        || document.querySelector('.flow__progress')?.textContent?.trim(),
    };
  });

  // Step through choosing the first option at each stage until the handoff.
  const selections = [];
  for (let step = 0; step < stepCount; step++) {
    const info = await activeInfo();
    if (!info.options) break;
    const first = page.locator('[data-flow-slide].is-active [data-flow-opt]').first();
    selections.push((await first.innerText()).trim().split('\n')[0]);
    await first.click();
    await page.waitForTimeout(450);
  }

  check('every step offered selectable options', selections.length >= 3,
    selections.join(' → '));

  await page.waitForTimeout(900); // let the handoff slide's transition settle
  const handoff = await page.evaluate(() => {
    const slides = Array.from(document.querySelectorAll('[data-flow-slide]'));
    const slide = slides[slides.length - 1];
    const mail = document.querySelector('[data-flow-mail]');
    return {
      isLast: !slide.querySelector('[data-flow-opt]'),
      visible: getComputedStyle(slide).opacity === '1',
      href: mail?.getAttribute('href') || '',
      text: slide.innerText.trim().slice(0, 500),
      recapRows: slide.querySelectorAll('.recap__row').length,
      buttons: Array.from(slide.querySelectorAll('button, a')).map((b) => b.innerText.trim()).filter(Boolean),
    };
  });
  check('flow ends on a handoff step', handoff.isLast && handoff.visible,
    `visible=${handoff.visible} · ${handoff.buttons.join(' · ')}`);
  check('handoff recaps the chosen answers', handoff.recapRows >= 3, `${handoff.recapRows} rows`);
  check('handoff builds a mailto link', handoff.href.startsWith('mailto:'), handoff.href.slice(0, 90));
  check('mailto targets the right address', handoff.href.includes('tamif@dontman.tech'));
  check('mailto carries a subject', /subject=/.test(handoff.href));
  check('mailto carries the selected answers',
    /body=/.test(handoff.href) && handoff.href.length > 200,
    `${handoff.href.length} chars`);
  check('handoff explains what happens next',
    /edit it before sending|no obligation/i.test(handoff.text));

  // Back rewinds
  const backBtn = page.locator('[data-flow-back]').first();
  if (await backBtn.count()) {
    await backBtn.click();
    await page.waitForTimeout(450);
    const rewound = await activeInfo();
    check('Back returns to a previous step',
      rewound.active === stepCount - 2, `now on slide ${rewound.active + 1}/${rewound.total}`);
  } else {
    check('Back control exists', false, 'not found');
  }

  // Forward again, without re-picking: re-choosing the same option advances.
  await page.locator('[data-flow-slide].is-active [data-flow-opt]').first().click();
  await page.waitForTimeout(900);

  // Copy-the-brief button produces text
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const copyBtn = page.locator('[data-flow-copy]').first();
  if (await copyBtn.count()) {
    await copyBtn.click().catch(() => {});
    await page.waitForTimeout(600);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    check('copy the brief writes a brief to the clipboard',
      clip.length > 60 && /Hi Tamif/.test(clip), `${clip.length} chars`);
    check('the copied brief matches the email body',
      decodeURIComponent(handoff.href.split('body=')[1] || '') === clip,
      'mailto body and clipboard text are identical');
    const toast = await page.locator('[role="status"], .toast').first().innerText().catch(() => '');
    check('copy action gives feedback', toast.length > 0, toast.trim().slice(0, 70));
  } else {
    check('copy-the-brief control exists', false, 'not found');
  }

  // The flow must not be a traditional form
  const inputs = await page.$$eval('#contact input, #contact textarea, #contact select',
    (els) => els.filter((e) => e.type !== 'hidden').map((e) => e.type || e.tagName));
  check('no traditional form fields in the contact section',
    inputs.length === 0, `${inputs.length} field(s)`);

  await browser.close();
  const bad = results.filter((r) => !r.pass);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  if (bad.length) { console.log('failing:', bad.map((b) => b.name).join(', ')); process.exit(1); }
})();
