/**
 * Cross-platform layout harness.
 *
 * The rest of the suite runs at a single 1440px desktop viewport, so nothing
 * caught the hero being wider than a phone screen: `.hero` sets
 * `overflow: hidden`, which turns an overflowing child into silently cropped
 * content rather than a horizontal scrollbar. These checks assert that no
 * content is clipped and that navigation stays reachable on real device
 * profiles — including short landscape viewports, where a stacked hero used to
 * run to nearly four screens.
 *
 * Run:  node tools/responsive.js
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

// name, width, height, touch
const PROFILES = [
  ['galaxy-fold-outer', 280, 653, true],
  ['iphone-se', 320, 568, true],
  ['iphone-12', 390, 844, true],
  ['pixel-7', 412, 915, true],
  ['iphone-pro-max', 430, 932, true],
  ['ipad-mini-portrait', 768, 1024, true],
  ['ipad-mini-landscape', 1024, 768, true],
  ['landscape-small', 568, 320, true],
  ['landscape-iphone', 844, 390, true],
  ['laptop-short', 1280, 620, false],
  ['desktop', 1440, 900, false],
];

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const [name, width, height, touch] of PROFILES) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
    await page.waitForTimeout(900);

    // Scroll the whole page so lazy images and reveals settle, then return.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const layout = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const clipped = [];
      // Text and controls that render past the right edge are invisible to the
      // reader but still "pass" a scroll-width check because of overflow:hidden.
      const SEL = 'h1,h2,h3,h4,p,li,a,button,span,strong,img,svg,div';
      document.querySelectorAll(SEL).forEach((el) => {
        if (el.closest('.marquee')) return;      // intentionally overflowing strip
        if (el.closest('.bg')) return;           // decorative, fixed, non-content
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') return;
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        if (Number(cs.opacity) === 0) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        // Only flag elements that actually carry text or are interactive.
        const hasText = el.childElementCount === 0 && (el.textContent || '').trim().length > 0;
        const interactive = /^(A|BUTTON|IMG|SVG)$/.test(el.tagName);
        if (!hasText && !interactive) return;
        if (r.right > vw + 1 || r.left < -1) {
          clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || ''}` +
            `[${(el.textContent || '').trim().slice(0, 24)}]`);
        }
      });

      const toggle = document.querySelector('.nav__toggle');
      const t = toggle.getBoundingClientRect();
      const toggleOnScreen = getComputedStyle(toggle).display !== 'none'
        ? (t.left >= -0.5 && t.right <= vw + 0.5)
        : true;

      // The owner's own name should not be ellipsised on a phone.
      const nameEl = document.querySelector('.brand__text > span');
      const nameTruncated = nameEl.scrollWidth > nameEl.clientWidth + 1;

      const cta = document.querySelector('.nav__cta').getBoundingClientRect();

      const hero = document.querySelector('.hero');
      const hr = hero.getBoundingClientRect();
      const nav = document.querySelector('.nav__inner').getBoundingClientRect();
      const title = document.querySelector('.hero__title').getBoundingClientRect();

      // The 30-second brief: whoever lands here must see who/what/why without
      // scrolling. That means the status, headline and lede all clearing the
      // fold on every profile — a tighter rhythm beats a clipped message.
      const lede = document.querySelector('.hero__lede').getBoundingClientRect();

      return {
        vw,
        scrollOverflow: document.documentElement.scrollWidth - vw,
        clipped: [...new Set(clipped)],
        toggleOnScreen,
        nameTruncated,
        ctaOnScreen: cta.right <= vw + 0.5 && cta.left >= -0.5,
        heroScreens: +(hr.height / window.innerHeight).toFixed(2),
        navOverlapsTitle: nav.bottom > title.top + 1,
        messageAboveFold: lede.bottom <= window.innerHeight,
        // Any element whose height exceeds the viewport height by a lot usually
        // means a fixed-ratio box was stretched by a wide, short column.
        tallestRatio: Math.max(...[...document.querySelectorAll('.portrait__frame,.chapter__shot')]
          .map((e) => +(e.getBoundingClientRect().height / window.innerHeight).toFixed(2))),
      };
    });

    check(`[${name}] no horizontal scroll`,
      layout.scrollOverflow <= 1, `${layout.scrollOverflow}px`);
    check(`[${name}] no clipped text or controls`,
      layout.clipped.length === 0, layout.clipped.slice(0, 4).join(', '));
    check(`[${name}] chapter menu stays reachable`,
      layout.toggleOnScreen);
    check(`[${name}] primary CTA stays on screen`,
      layout.ctaOnScreen);
    // The Galaxy Fold's 280px outer screen is the one profile where the name is
    // allowed to ellipsis; every normal phone must show it in full.
    check(`[${name}] full name is legible`,
      !layout.nameTruncated || width <= 300,
      layout.nameTruncated ? 'name ellipsised' : '');
    check(`[${name}] nav does not overlap the headline`,
      !layout.navOverlapsTitle);
    check(`[${name}] who/what/why fits above the fold`,
      layout.messageAboveFold,
      layout.messageAboveFold ? '' : 'lede pushed below fold');

    // Stacking the hero on a short landscape viewport wasted most of the
    // screen; the two-column branch should keep it within ~2.6 screens.
    check(`[${name}] hero is not a marathon`,
      layout.heroScreens <= 3.2, `${layout.heroScreens} screens`);

    await page.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:\n' + failed.map((f) => `  - ${f.name} ${f.detail}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
