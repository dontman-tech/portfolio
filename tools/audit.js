/**
 * Design audit.
 *
 * Measures the page the way a reviewer would: does anything overflow, is text
 * clipped, is the vertical rhythm consistent, are headings in order, are tap
 * targets big enough, and is contrast acceptable. Also reports the vertical
 * budget of each section so dead space is visible as a number.
 *
 * Run:  node tools/audit.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:12000';

const lum = (r, g, b) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const [l1, l2] = [lum(...a), lum(...b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const parseRgb = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1500);

  console.log('=== VERTICAL BUDGET (1440x900) ===');
  const budget = await page.evaluate(() => {
    const rows = [];
    const add = (name, el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      rows.push({ name, top: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
    };
    add('hero', document.querySelector('.hero'));
    add('marquee', document.querySelector('.marquee'));
    add('method (steps)', document.querySelector('#method'));
    add('  step 1', document.querySelector('#method .step:nth-child(1)'));
    add('  step 2', document.querySelector('#method .step:nth-child(2)'));
    add('  step 3', document.querySelector('#method .step:nth-child(3)'));
    add('work', document.querySelector('#work'));
    add('about', document.querySelector('#about'));
    add('contact', document.querySelector('#contact'));
    add('footer', document.querySelector('.footer'));
    return { rows, total: document.documentElement.scrollHeight, vh: window.innerHeight };
  });

  const vh = budget.vh;
  for (const r of budget.rows) {
    console.log(
      `${r.name.padEnd(22)} top=${String(r.top).padStart(6)}  h=${String(r.h).padStart(6)}  ` +
      `= ${(r.h / vh).toFixed(2)} viewports`
    );
  }
  console.log(`TOTAL ${budget.total}px = ${(budget.total / vh).toFixed(1)} viewports\n`);

  console.log('=== OVERFLOW / CLIPPING ===');
  const overflow = await page.evaluate(() => {
    const problems = [];
    const vw = window.innerWidth;

    // An element only matters if nothing above it clips it. Decorative layers
    // (aurora blobs, marquee track) legitimately extend past the viewport and
    // are clipped by an ancestor's overflow:hidden.
    const isClipped = (el) => {
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return true;
        node = node.parentElement;
      }
      return false;
    };

    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;

      const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '');

      // Element sticks out past the viewport horizontally and nothing clips it
      if ((r.right > vw + 2 || r.left < -2) && !isClipped(el)) {
        problems.push({
          kind: 'h-overflow',
          el: tag,
          detail: `left=${Math.round(r.left)} right=${Math.round(r.right)} vw=${vw}`,
        });
      }

      // Text clipped vertically by a fixed-height overflow:hidden box
      if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
        const hasText = el.textContent && el.textContent.trim().length > 0;
        // The hero headline masks are intentional; they are translated into
        // place, so scrollHeight exceeds clientHeight by design during the
        // entrance animation only. `.sr-only` uses the standard 1px clip
        // idiom, which is also intentional. Report everything else.
        if (hasText && !el.closest('.hero__title') && !el.classList.contains('sr-only')) {
          problems.push({
            kind: 'v-clip',
            el: tag,
            detail: `scrollH=${el.scrollHeight} clientH=${el.clientHeight}`,
          });
        }
      }
    });

    return {
      problems: problems.slice(0, 25),
      count: problems.length,
      docOverflow: document.documentElement.scrollWidth - vw,
    };
  });

  console.log(`document horizontal overflow: ${overflow.docOverflow}px`);
  console.log(`issues found: ${overflow.count}`);
  overflow.problems.forEach((p) => console.log(`  [${p.kind}] ${p.el} — ${p.detail}`));
  console.log();

  console.log('=== HEADING HIERARCHY ===');
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3,h4')).map((h) => ({
      level: Number(h.tagName[1]),
      text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 58),
      size: Math.round(parseFloat(getComputedStyle(h).fontSize)),
    })));
  headings.forEach((h) => console.log(`  h${h.level} (${h.size}px)  ${h.text}`));
  const h1s = headings.filter((h) => h.level === 1).length;
  let order = true;
  let prev = 1;
  for (const h of headings) {
    if (h.level > prev + 1) order = false;
    prev = h.level;
  }
  console.log(`  → h1 count: ${h1s} (want 1) · levels skip-free: ${order}\n`);

  console.log('=== CONTRAST (body text on glass) ===');
  const contrastData = await page.evaluate(() => {
    const out = [];
    const pick = ['.hero__lede', '.lead', '.chapter__body', '.fact__v', '.outcome__k',
      '.stat__label', '.flow__hint', '.footer__bottom', '.tl__where', '.recap__k'];
    for (const sel of pick) {
      const el = document.querySelector(sel);
      if (!el) continue;
      out.push({
        sel,
        color: getComputedStyle(el).color,
        size: Math.round(parseFloat(getComputedStyle(el).fontSize)),
      });
    }
    return out;
  });

  // The glass panels sit on the page's dark ink gradient; sample the real
  // painted backdrop behind the hero instead of assuming a flat colour.
  const bgSamples = await page.evaluate(() => {
    const out = {};
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      // Walk up for the nearest painted background
      let node = el;
      while (node && node !== document.documentElement) {
        const c = getComputedStyle(node).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        node = node.parentElement;
      }
      return 'rgb(5,7,13)';
    };
    out.hero = sample('.hero__lede');
    out.chapter = sample('.chapter__body');
    out.fact = sample('.fact__v');
    return out;
  });

  console.log('  sampled backdrops:', JSON.stringify(bgSamples));
  for (const c of contrastData) {
    const fg = parseRgb(c.color);
    const bg = parseRgb(bgSamples.hero || 'rgb(5,7,13)');
    const ratio = contrast(fg, bg);
    const large = c.size >= 24;
    const min = large ? 3 : 4.5;
    const ok = ratio >= min;
    console.log(
      `  ${ok ? 'OK  ' : 'LOW '} ${c.sel.padEnd(18)} ${c.size}px  ratio ${ratio.toFixed(2)}:1 ` +
      `(min ${min})  ${c.color}`
    );
  }
  console.log();

  console.log('=== SPACING RHYTHM (section padding) ===');
  const rhythm = await page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('.section, .chapter, .hero, .footer').forEach((el) => {
      const cs = getComputedStyle(el);
      rows.push({
        el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + (el.className.split(' ')[0] || '')),
        pt: cs.paddingTop,
        pb: cs.paddingBottom,
      });
    });
    return rows;
  });
  rhythm.forEach((r) => console.log(`  ${r.el.padEnd(24)} padding ${r.pt} / ${r.pb}`));
  const uniq = new Set(rhythm.map((r) => `${r.pt}/${r.pb}`));
  console.log(`  → distinct vertical paddings: ${uniq.size} (want few, for consistency)\n`);

  console.log('=== MOBILE TAP TARGETS (390x844) ===');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'load' });
  await m.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await m.waitForTimeout(1200);
  const taps = await m.evaluate(() => {
    const small = [];
    document.querySelectorAll('a, button, [role="button"], input[type="range"]').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 40) {
        small.push({
          el: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 34),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    });
    return small;
  });
  console.log(`  controls under 40px tall: ${taps.length}`);
  taps.slice(0, 14).forEach((t) => console.log(`   ${t.h}px  "${t.el}" (w=${t.w})`));

  console.log('\n=== IMAGE / ASSET WEIGHT ===');
  const assets = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((e) => ({
      name: e.name.split('/').pop(),
      kb: Math.round((e.transferSize || e.encodedBodySize || 0) / 1024),
      type: e.initiatorType,
    })));
  const total = assets.reduce((s, a) => s + a.kb, 0);
  assets.sort((a, b) => b.kb - a.kb).slice(0, 12).forEach((a) => console.log(`  ${String(a.kb).padStart(5)} KB  ${a.type.padEnd(8)} ${a.name}`));
  console.log(`  TOTAL transferred: ${total} KB across ${assets.length} requests`);

  const metrics = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((p) => p.name === 'first-contentful-paint');
    return {
      domContentLoaded: Math.round(n.domContentLoadedEventEnd),
      load: Math.round(n.loadEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
    };
  });
  console.log(`  FCP ${metrics.fcp}ms · DOMContentLoaded ${metrics.domContentLoaded}ms · load ${metrics.load}ms`);

  console.log('\n=== SPACING ACROSS DEVICE PROFILES ===');
  const profiles = [
    ['phone', 390, 844],
    ['tablet', 834, 1112],
    ['desktop', 1440, 900],
  ];
  for (const [name, w, h] of profiles) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto(BASE + '/', { waitUntil: 'load' });
    await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
    await p.waitForTimeout(1200);
    const report = await p.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const secs = Array.from(document.querySelectorAll('section.section'));
      const pads = secs.map((s) => ({
        id: s.id || '(work-rest)',
        pt: Math.round(parseFloat(getComputedStyle(s).paddingTop)),
        pb: Math.round(parseFloat(getComputedStyle(s).paddingBottom)),
      }));
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const rows = Array.from(document.querySelectorAll('.hero__grid, .steps, .about__facts, .cards, .thirds'))
        .map((el) => ({
          cls: el.className.split(' ')[0],
          cols: getComputedStyle(el).gridTemplateColumns.split(' ').length,
        }));
      return {
        rail: cs.getPropertyValue('--rail').trim(),
        sectionY: cs.getPropertyValue('--section-y').trim(),
        pads,
        overflow,
        rows,
      };
    });
    const padSet = [...new Set(report.pads.map((p) => `${p.pt}/${p.pb}`))];
    console.log(
      `  ${name.padEnd(8)} ${String(w).padStart(4)}x${h}  rail=${report.rail.padEnd(7)} ` +
      `section-y=${report.sectionY.padEnd(7)} overflow=${report.overflow}px`
    );
    console.log(`           distinct section paddings: ${padSet.length} (${padSet.join(', ')})`);
    console.log(`           grids: ${report.rows.map((r) => `${r.cls}=${r.cols}col`).join(' · ')}`);
    await p.close();
  }

  await browser.close();
})();
