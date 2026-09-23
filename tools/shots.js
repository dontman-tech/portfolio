/**
 * Visual QA — captures section-by-section screenshots plus a mobile pass so
 * the layout can be reviewed by eye. Also reports the fold content, which is
 * what a hiring manager actually sees in the first 30 seconds.
 *
 * Run:  node tools/shots.js
 * Out:  .agent_tmp/shots/*.png
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const OUT = path.join(__dirname, '..', '.agent_tmp', 'shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1600);

  // Above-the-fold content — the 30-second test
  const fold = await page.evaluate(() => {
    const vh = window.innerHeight;
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        top: Math.round(r.top), inFold: r.top < vh,
      };
    };
    return {
      eyebrow: pick('[data-hero-eyebrow], .hero__eyebrow, .eyebrow'),
      h1: pick('h1'),
      lede: pick('.hero__lede'),
      cta: Array.from(document.querySelectorAll('a.btn, .hero a')).slice(0, 4)
        .map((a) => ({ text: a.textContent.trim().replace(/\s+/g, ' '), top: Math.round(a.getBoundingClientRect().top) })),
      nav: Array.from(document.querySelectorAll('.nav__links a')).map((a) => a.textContent.trim()),
    };
  });

  console.log('=== ABOVE THE FOLD ===');
  console.log('eyebrow :', fold.eyebrow?.text);
  console.log('h1      :', fold.h1?.text, `(top ${fold.h1?.top}px)`);
  console.log('lede    :', fold.lede?.text, fold.lede?.inFold ? '(visible)' : '(BELOW FOLD)');
  console.log('nav     :', fold.nav.join(' · '));
  console.log('ctas    :');
  fold.cta.forEach((c) => console.log(`   ${c.top < 900 ? '✓' : '✗'} ${c.text} @${c.top}px`));

  await page.screenshot({ path: path.join(OUT, '01-hero.png') });

  // Section by section
  const sections = [
    ['#method', '02-method'],
    ['#work', '03-work'],
    ['#about', '04-about'],
    ['#contact', '05-contact'],
  ];
  for (const [sel, name] of sections) {
    const found = await page.$(sel);
    if (!found) { console.log(`missing ${sel}`); continue; }
    await found.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  }

  // Each project card
  const cards = await page.$$('.chapter');
  console.log(`\nproject cards: ${cards.length}`);
  for (let i = 0; i < cards.length; i++) {
    await cards[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    await cards[i].screenshot({ path: path.join(OUT, `project-${i + 1}.png`) });
  }

  // Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '06-footer.png') });

  // Contact flow, stepped through
  await page.evaluate(() => document.querySelector('#contact')?.scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '07-flow-step1.png') });
  for (let step = 0; step < 4; step++) {
    const opt = await page.$('[data-flow-slide].is-active .opt, [data-flow-slide].is-active .btn');
    if (!opt) break;
    await opt.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `08-flow-step${step + 2}.png`) });
  }

  // Mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'load' });
  await m.waitForTimeout(1500);
  await m.screenshot({ path: path.join(OUT, 'mobile-hero.png') });
  await m.evaluate(() => document.querySelector('#work')?.scrollIntoView());
  await m.waitForTimeout(1200);
  await m.screenshot({ path: path.join(OUT, 'mobile-work.png') });

  // 404
  const nf = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const resp = await nf.goto(BASE + '/404.html', { waitUntil: 'load' });
  await nf.waitForTimeout(900);
  await nf.screenshot({ path: path.join(OUT, '404.png') });
  console.log(`\n404 status: ${resp.status()} · screenshots → ${OUT}`);

  await browser.close();
})();
