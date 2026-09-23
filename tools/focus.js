/**
 * Focus and ARIA containment checks.
 *
 * The classic bug this guards against: a panel hidden with aria-hidden="true"
 * still contains tabbable controls, so keyboard users land on invisible
 * widgets. Also checks the studio's focus trap and that dialogs do not leave
 * focus behind them when closed.
 *
 * Run:  node tools/focus.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  /* ---- Desktop ---- */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1400);

  // No tabbable control may live inside an aria-hidden subtree
  const trapped = await page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll('[aria-hidden="true"]').forEach((host) => {
      const label = host.tagName.toLowerCase() + '.' +
        (host.className || '').toString().split(' ').slice(0, 2).join('.');
      host.querySelectorAll(sel).forEach((el) => {
        // A parent with `inert` or `display:none` is genuinely unreachable
        if (el.closest('[inert]')) return;
        let node = el;
        let visible = true;
        while (node) {
          const cs = getComputedStyle(node);
          if (cs.display === 'none' || cs.visibility === 'hidden') { visible = false; break; }
          if (node === host) break;
          node = node.parentElement;
        }
        if (!visible) return;
        // Negatively-tabindexed elements are not in the tab order
        if (el.getAttribute('tabindex') === '-1') return;
        out.push(`${label} → ${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 22)}"`);
      });
    });
    return out;
  }, FOCUSABLE);

  check('no tabbable controls inside aria-hidden subtrees',
    trapped.length === 0, trapped.slice(0, 6).join(' | '));

  // The closed studio must be genuinely inert
  const studioInert = await page.evaluate(() => {
    const s = document.querySelector('.studio');
    return { inert: s.hasAttribute('inert'), ariaHidden: s.getAttribute('aria-hidden') };
  });
  check('closed studio is inert', studioInert.inert === true, JSON.stringify(studioInert));

  // Tab through the whole page and confirm nothing invisible receives focus
  const focusTrail = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const hidden = cs.visibility === 'hidden' || cs.display === 'none' ||
        Number(cs.opacity) < 0.05;
      const offscreen = r.width === 0 || r.height === 0;
      const insideAriaHidden = !!el.closest('[aria-hidden="true"]');
      return {
        el: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0],
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26),
        hidden, offscreen, insideAriaHidden,
      };
    });
    if (!info) break;
    focusTrail.push(info);
  }

  const badFocus = focusTrail.filter((f) => f.hidden || f.offscreen || f.insideAriaHidden);
  check('tab order never lands on invisible or hidden content',
    badFocus.length === 0, badFocus.map((f) => `${f.el} (${f.text})`).slice(0, 5).join(' | '));
  check('tab order reaches a healthy number of controls',
    focusTrail.length >= 12, `${focusTrail.length} stops`);

  // Studio focus trap: tabbing inside the open studio should stay inside it
  await page.click('[data-studio-open]');
  await page.waitForTimeout(500);
  let escaped = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      !!document.activeElement?.closest('.studio'));
    if (!inside) { escaped = true; break; }
  }
  check('studio traps focus while open (or closes cleanly)', escaped === false,
    escaped ? 'focus left the dialog' : 'stayed inside');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  /* ---- Mobile sheet ---- */
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'load' });
  await m.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await m.waitForTimeout(1200);

  const sheetClosedTrap = await m.evaluate((sel) => {
    const host = document.querySelector('.sheet');
    if (!host) return [];
    const out = [];
    host.querySelectorAll(sel).forEach((el) => {
      if (el.closest('[inert]') || el.getAttribute('tabindex') === '-1') return;
      out.push((el.textContent || '').trim().slice(0, 22));
    });
    return out;
  }, FOCUSABLE);
  check('closed mobile sheet is inert', sheetClosedTrap.length === 0,
    sheetClosedTrap.slice(0, 4).join(', '));

  const mobileInert = await m.evaluate(() => ({
    sheet: document.querySelector('.sheet').hasAttribute('inert'),
    studio: document.querySelector('.studio').hasAttribute('inert'),
  }));
  check('mobile sheet and studio start inert', mobileInert.sheet && mobileInert.studio,
    JSON.stringify(mobileInert));

  await browser.close();
  const bad = results.filter((r) => !r.pass);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  if (bad.length) { console.log('failing:', bad.map((b) => b.name).join(', ')); process.exit(1); }
})();
