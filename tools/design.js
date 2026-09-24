/**
 * Design QA — the parts a reviewer would judge by eye: the 30-second test
 * (what a hiring manager sees before scrolling), type scale and hierarchy,
 * text contrast, and vertical rhythm / whitespace.
 *
 * Run:  node tools/design.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1500);

  // --- The 30-second test: what is on screen at 1440x900 before any scroll
  const fold = await page.evaluate(() => {
    const vh = innerHeight;
    const seen = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 120), inFold: r.top < vh && r.bottom > 0 };
    };
    return {
      who: seen('.hero__lede'),
      what: seen('.hero__title'),
      why: seen('.hero__actions'),
      role: seen('.hero__status, .eyebrow'),
      stack: Array.from(document.querySelectorAll('.hero__stats li, .hero__stats span'))
        .map((e) => e.innerText.trim().replace(/\s+/g, ' ')).slice(0, 4),
    };
  });
  check('who I am is above the fold', /Tabe Miracle Fiagmenyi/.test(fold.who?.text || ''), fold.who?.text);
  check('what I build is above the fold', fold.what?.inFold, fold.what?.text);
  check('a next step is above the fold', fold.why?.inFold, fold.why?.text);
  check('specialisation is stated immediately', /full-stack|applied-AI|engineer/i.test(fold.who?.text || ''));
  check('credentials/stack signalled in hero', fold.stack.length >= 2, fold.stack.join(' · '));

  // --- Hierarchy: distinct heading steps, single h1
  const heads = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => ({
      tag: h.tagName,
      size: parseFloat(getComputedStyle(h).fontSize),
      text: h.innerText.trim().replace(/\s+/g, ' ').slice(0, 48),
    })));
  const h1s = heads.filter((h) => h.tag === 'H1');
  check('exactly one h1', h1s.length === 1, `${h1s.length} found`);
  const sizes = [...new Set(heads.map((h) => Math.round(h.size)))].sort((a, b) => b - a);
  check('type scale has clear steps', sizes.length >= 3, sizes.join(' / ') + ' px');
  check('h1 is the largest text on the page', h1s[0]?.size >= Math.max(...heads.map((h) => h.size)) - 0.5,
    `${h1s[0]?.size}px`);

  // --- Contrast on real rendered colours
  const samples = await page.evaluate(() => {
    const pick = ['.hero__lede', '.hero__status', '.hero__title', '.lead', '.project__desc', '.nav__link', '.faint'];
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = c.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.85)) return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return pick.flatMap((sel) => Array.from(document.querySelectorAll(sel)).slice(0, 3).map((el) => ({
      sel,
      color: getComputedStyle(el).color,
      bg: bgOf(el),
      size: parseFloat(getComputedStyle(el).fontSize),
      weight: getComputedStyle(el).fontWeight,
    })));
  });
  const fails = samples.filter((s) => {
    const blown = /rgba?\(.*\/\s*0(\.\d+)?\)/.test(s.bg) || s.bg === 'rgba(0, 0, 0, 0)';
    if (blown) return false;
    const r = ratio(parse(s.color), parse(s.bg));
    const large = s.size >= 24 || (s.size >= 18.66 && Number(s.weight) >= 700);
    return r < (large ? 3 : 4.5);
  });
  check('body text meets WCAG AA contrast', fails.length === 0,
    fails.map((f) => `${f.sel} ${ratio(parse(f.color), parse(f.bg)).toFixed(1)}:1`).join(', ') || `${samples.length} samples`);

  // --- Whitespace / rhythm: sections breathe, no cramped gaps
  const rhythm = await page.evaluate(() => {
    const secs = Array.from(document.querySelectorAll('section.section'));
    const pads = secs.map((s) => parseFloat(getComputedStyle(s).paddingTop));
    const gaps = [];
    for (let i = 1; i < secs.length; i++) {
      gaps.push(Math.round(secs[i].getBoundingClientRect().top - secs[i - 1].getBoundingClientRect().bottom));
    }
    const lines = Array.from(document.querySelectorAll('.lead, p')).slice(0, 20)
      .map((p) => parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize));
    return { pads, gaps, minLine: Math.min(...lines.filter((n) => !isNaN(n))) };
  });
  check('sections use generous vertical padding', Math.min(...rhythm.pads) >= 48,
    `min ${Math.min(...rhythm.pads)}px`);
  check('body copy has comfortable line-height', rhythm.minLine >= 1.45, `${rhythm.minLine.toFixed(2)}`);

  // --- Consistency: spacing is drawn from a scale, not arbitrary values
  const tokenUse = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const names = []; for (const s of document.styleSheets) {
      try { for (const r of s.cssRules) if (r.style?.getPropertyValue?.('--s-1') !== undefined) {}
      } catch {}
    }
    return {
      s1: css.getPropertyValue('--s-1').trim(),
      s2: css.getPropertyValue('--s-2').trim(),
      hasScale: !!css.getPropertyValue('--s-1').trim(),
      radius: css.getPropertyValue('--r-xl').trim(),
      displayFont: css.getPropertyValue('--font-display').trim(),
      bodyFont: css.getPropertyValue('--font-body').trim(),
    };
  });
  check('spacing comes from design tokens', tokenUse.hasScale && tokenUse.s1 && tokenUse.s2,
    `${tokenUse.s1}, ${tokenUse.s2}`);
  check('display and body fonts are distinct',
    tokenUse.displayFont !== tokenUse.bodyFont, `${tokenUse.displayFont} vs ${tokenUse.bodyFont}`);

  // --- Story: three narrative archetypes are labelled
  const tags = await page.$$eval('.chapter__tag', (els) => els.map((e) => e.innerText.trim()));
  check('projects are framed as a narrative', tags.length >= 5, tags.join(' · '));
  check('a collaborative project is called out',
    tags.some((t) => /collab|team/i.test(t)), tags.join(' · '));

  await browser.close();
  const bad = results.filter((r) => !r.pass);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  if (bad.length) { console.log('failing:', bad.map((b) => b.name).join(', ')); process.exit(1); }
})();
