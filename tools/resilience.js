/**
 * Progressive enhancement and resilience.
 *
 * Reveal animations normally hide content until JS marks it visible. If the
 * script fails to load, that content must still be readable — otherwise the
 * site looks broken to anyone on a flaky connection or with JS disabled.
 * Also covers the 404 route, the resume download and storage being unavailable.
 *
 * Run:  node tools/resilience.js
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

  /* ---- JavaScript disabled ---- */
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p1 = await noJs.newPage();
  await p1.goto(BASE + '/', { waitUntil: 'load' });
  await p1.waitForTimeout(800);

  const noJsState = await p1.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal], [data-stagger] > *'));
    const hidden = els.filter((el) => {
      const cs = getComputedStyle(el);
      return Number(cs.opacity) < 0.15 || cs.visibility === 'hidden';
    });
    return {
      total: els.length,
      hidden: hidden.length,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').length,
      h1: document.querySelector('h1')?.innerText,
    };
  });
  check('content is visible without JavaScript',
    noJsState.hidden === 0, `${noJsState.hidden}/${noJsState.total} animated elements hidden`);
  check('page text renders without JavaScript',
    noJsState.bodyText > 2500, `${noJsState.bodyText} chars`);
  check('headline is present without JavaScript',
    /survive contact with real devices/.test((noJsState.h1 || '').replace(/\s+/g, ' ')),
    (noJsState.h1 || '').replace(/\s+/g, ' '));
  await noJs.close();

  /* ---- Storage unavailable ---- */
  const noStore = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await noStore.newPage();
  const errors = [];
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.addInitScript(() => {
    // Simulate private-mode / blocked storage
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('denied', 'SecurityError'); },
    });
  });
  await p2.goto(BASE + '/', { waitUntil: 'load' });
  await p2.waitForTimeout(1500);
  check('page survives blocked localStorage', errors.length === 0, errors.join(' | '));
  const stillWorks = await p2.evaluate(() => ({
    hero: !!document.querySelector('h1')?.innerText,
    flow: !!document.querySelector('[data-flow]'),
  }));
  check('interactive content still present with storage blocked',
    stillWorks.hero && stillWorks.flow, JSON.stringify(stillWorks));
  await noStore.close();

  /* ---- Failed subresource ---- */
  const p3 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const p3errors = [];
  p3.on('pageerror', (e) => p3errors.push(e.message));
  await p3.route('**/motion.js', (r) => r.abort());
  await p3.goto(BASE + '/', { waitUntil: 'load' });
  await p3.waitForTimeout(1600);
  const afterMotionFail = await p3.evaluate(() => ({
    h1: !!document.querySelector('h1')?.innerText,
    hidden: Array.from(document.querySelectorAll('[data-reveal]')).filter((el) => {
      const cs = getComputedStyle(el);
      return Number(cs.opacity) < 0.15;
    }).length,
    total: document.querySelectorAll('[data-reveal]').length,
  }));
  check('content readable if motion.js fails to load',
    afterMotionFail.hidden === 0, `${afterMotionFail.hidden}/${afterMotionFail.total} hidden`);
  await p3.close();

  /* ---- 404 route ---- */
  const p4 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const r404 = await p4.goto(BASE + '/404.html', { waitUntil: 'load' });
  await p4.waitForTimeout(700);
  const nf = await p4.evaluate(() => ({
    h1: document.querySelector('h1')?.innerText?.trim(),
    routes: document.querySelectorAll('a[href]').length,
    hasHome: !!document.querySelector('a[href="/"], a[href="index.html"], a[href="./"]'),
    title: document.title,
  }));
  check('404 page loads', r404.status() === 200, String(r404.status()));

  // The page must also be what an unmatched path actually serves, and with a
  // genuine 404 status — otherwise crawlers would index it as real content.
  const missing = await p4.goto(BASE + '/this-path-does-not-exist', { waitUntil: 'load' });
  const missingBody = await p4.content();
  check('unknown path returns a real 404 status', missing.status() === 404, String(missing.status()));
  check('unknown path serves the custom 404 document',
    /that page moved/i.test(missingBody), 'custom document, not the server default');
  check('404 explains itself with a heading', !!nf.h1 && nf.h1.length > 3, nf.h1);
  check('404 offers a route back', nf.hasHome && nf.routes >= 3,
    `${nf.routes} links, home=${nf.hasHome}`);
  check('404 has its own title', /404|not found/i.test(nf.title), nf.title);
  await p4.close();

  /* ---- Resume download ---- */
  const p5 = await browser.newPage();
  const resumeResp = await p5.request.get(BASE + '/assets/resume/Tabe-Miracle-Fiagmenyi-Resume.pdf');
  const body = await resumeResp.body();
  check('resume PDF is reachable', resumeResp.status() === 200, String(resumeResp.status()));
  check('resume PDF is a real PDF',
    body.slice(0, 5).toString() === '%PDF-', body.slice(0, 8).toString());
  check('resume PDF is a sensible size',
    body.length > 3000 && body.length < 2_000_000, `${Math.round(body.length / 1024)} KB`);
  await p5.close();

  /* ---- Crawler files ---- */
  const p6 = await browser.newPage();
  const robots = await p6.request.get(BASE + '/robots.txt');
  const robotsText = await robots.text();
  check('robots.txt served', robots.status() === 200, String(robots.status()));
  check('robots.txt allows crawling',
    /Allow: \//.test(robotsText) && !/^Disallow: \/$/m.test(robotsText),
    robotsText.split('\n').filter((l) => l.startsWith('Allow')).slice(0, 3).join(' · '));
  check('robots.txt points at the sitemap', /Sitemap: https?:\/\//.test(robotsText));

  const sm = await p6.request.get(BASE + '/sitemap.xml');
  const smText = await sm.text();
  check('sitemap.xml served', sm.status() === 200, String(sm.status()));
  // The site's own domain lives in CNAME (GitHub Pages requirement), so assert
  // every copy — sitemap, canonical, robots — agrees with that one source.
  const domain = require('fs').readFileSync(require('path').join(__dirname, '..', 'CNAME'), 'utf8').trim();
  check('sitemap declares the canonical URL',
    smText.includes(`https://${domain}/`), domain);
  const html = await (await p6.request.get(BASE + '/')).text();
  const canonical = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  check('canonical, robots and sitemap agree on the same domain',
    canonical === `https://${domain}/` && robotsText.includes(`https://${domain}/sitemap.xml`),
    `canonical=${canonical}`);
  check('sitemap is well-formed XML',
    smText.trim().startsWith('<?xml') && smText.includes('</urlset>'));

  const manifest = await p6.request.get(BASE + '/manifest.webmanifest');
  const mText = await manifest.json().catch(() => null);
  check('web manifest is valid JSON with icons',
    !!mText && Array.isArray(mText.icons) && mText.icons.length > 0,
    mText ? `${mText.name} · ${mText.icons.length} icon(s)` : 'unparseable');
  await p6.close();

  await browser.close();
  const bad = results.filter((r) => !r.pass);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  if (bad.length) { console.log('failing:', bad.map((b) => b.name).join(', ')); process.exit(1); }
})();
