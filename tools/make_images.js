/**
 * Renders site imagery with headless Chromium (Playwright).
 *
 * Generates:
 *   assets/img/og.png               1200x630 social card
 *   assets/img/proj-<slug>.png      project posters used on cards
 *   assets/img/apple-touch-icon.png 180x180
 *
 * Run:  node tools/make_images.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'img');

const INK = '#0B0F17';
const INK2 = '#131A26';
const A1 = '#6EA8FF';
const A2 = '#7BF1D9';
const A3 = '#B79CFF';
const TXT = '#EEF2FA';
const MUTED = '#98A4BC';

const W = 1280;
const H = 800;

const frame = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden;background:${INK};
    font-family:'Inter',system-ui,sans-serif;color:${TXT};-webkit-font-smoothing:antialiased}
  .scene{position:relative;width:${W}px;height:${H}px;overflow:hidden;
    background:
      radial-gradient(900px 620px at 12% 8%, rgba(110,168,255,.20), transparent 62%),
      radial-gradient(760px 560px at 88% 92%, rgba(123,241,217,.14), transparent 60%),
      radial-gradient(700px 520px at 72% 4%, rgba(183,156,255,.13), transparent 62%),
      linear-gradient(150deg,#0B0F17 0%,#121A28 52%,#0A0E16 100%)}
  .grid{position:absolute;inset:-20%;
    background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
    background-size:64px 64px;
    transform:perspective(1200px) rotateX(52deg) rotateZ(-14deg);
    mask-image:radial-gradient(circle at 50% 45%,#000 12%,transparent 72%)}
  .orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.6}
  .grain{position:absolute;inset:0;opacity:.5;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E")}
  ${extra}
</style></head><body><div class="scene"><div class="grid"></div>${body}
<div class="grain"></div></div></body></html>`;

const glass = (inner, style = '') =>
  `<div class="glass" style="${style}">${inner}</div>`;

const CSS = `
  .glass{position:absolute;border-radius:22px;padding:22px 24px;
    background:linear-gradient(150deg,rgba(255,255,255,.11),rgba(255,255,255,.035));
    border:1px solid rgba(255,255,255,.16);
    box-shadow:0 26px 60px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.22);
    backdrop-filter:blur(18px)}
  .kicker{font-family:'Sora';font-weight:600;font-size:12.5px;letter-spacing:.22em;
    text-transform:uppercase;color:${A2}}
  .h1{font-family:'Sora';font-weight:700;font-size:38px;line-height:1.12;letter-spacing:-.02em}
  .h2{font-family:'Sora';font-weight:600;font-size:19px;letter-spacing:-.01em}
  .body{font-size:13.6px;line-height:1.62;color:${MUTED}}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
  .chip{display:inline-block;padding:5px 11px;border-radius:999px;font-size:11.4px;
    font-family:'JetBrains Mono',monospace;color:${A1};
    background:rgba(110,168,255,.13);border:1px solid rgba(110,168,255,.3);margin:3px 5px 0 0}
  .bar{height:6px;border-radius:999px;background:linear-gradient(90deg,${A1},${A2})}
  .ring{border-radius:50%;border:8px solid rgba(255,255,255,.12);position:relative}
  .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
`;

const posters = {
  'aria-ai': {
    kicker: 'Voice AI · Python + Kotlin',
    title: 'ARIA',
    sub: 'Assistant with a modular skill router and an Android device bridge',
    body: `Say the wake word and the host machine listens. Skills are matched by regex and keyword
      confidence before the LLM is ever consulted, so device control stays instant and offline-safe.`,
    chips: ['skill router', 'memory', 'PWA', 'Flask', 'Kotlin bridge'],
    art: `
      <div class="glass" style="left:60px;top:236px;width:430px;height:212px;padding:20px">
        <div class="mono" style="font-size:11.6px;color:${A2};letter-spacing:.1em">SKILL ROUTER</div>
        <div style="margin-top:14px">
          ${[['phone_control', 0.94], ['system_control', 0.88], ['calculator', 0.81], ['memory', 0.76], ['weather', 0.62]]
            .map(
              ([n, v]) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:11px">
              <div class="mono" style="width:132px;font-size:11.4px;color:${TXT}">${n}</div>
              <div style="flex:1;height:6px;border-radius:999px;background:rgba(255,255,255,.09)">
                <div class="bar" style="width:${v * 100}%"></div></div>
              <div class="mono" style="font-size:11px;color:${MUTED}">${v.toFixed(2)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="glass" style="right:56px;top:150px;width:250px;height:250px;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center">
        <div class="ring" style="width:168px;height:168px;border-color:rgba(110,168,255,.35)">
          <div class="ring" style="position:absolute;inset:16px;border-color:rgba(123,241,217,.5)">
            <div class="ring" style="position:absolute;inset:16px;border-color:rgba(183,156,255,.55)"></div>
          </div>
        </div>
        <div style="position:absolute;text-align:center">
          <div class="mono" style="font-size:11px;letter-spacing:.16em;color:${A2}">WAKE WORD</div>
          <div class="h2" style="font-size:23px;margin-top:6px">"ARIA"</div>
        </div>
      </div>`,
  },
  'rekollect': {
    kicker: 'Two-sided marketplace · Flutter + Firebase',
    title: 'Re-kollect',
    sub: 'Waste generators and independent collectors, matched in real time',
    body: `Role-based phone auth, Firestore request lifecycle, map pinning with geocoded landmarks,
      and a collector dashboard that updates live over FCM topics.`,
    chips: ['Firestore', 'Phone auth', 'OSM / Nominatim', 'FCM', 'Flutter'],
    art: `
      <div class="glass" style="left:60px;top:250px;width:300px;height:200px">
        <div class="mono" style="font-size:11px;letter-spacing:.14em;color:${A2}">PICKUP REQUESTS</div>
        ${[['Plastic', 'Bonaberi · 2.4 km', A2], ['Organic', 'Deido · 3.1 km', A1], ['E-waste', 'Akwa · 5.0 km', A3]]
          .map(
            ([t, l, c]) => `<div style="display:flex;gap:11px;align-items:center;margin-top:14px">
            <span class="dot" style="background:${c};box-shadow:0 0 12px ${c}"></span>
            <div><div style="font-size:13.4px;font-weight:600">${t}</div>
            <div class="mono" style="font-size:10.6px;color:${MUTED}">${l}</div></div>
          </div>`
          )
          .join('')}
      </div>
      <div class="glass" style="right:56px;top:214px;width:340px;height:246px;padding:0;overflow:hidden">
        <div style="position:absolute;inset:0;background:
          radial-gradient(circle at 30% 30%,rgba(123,241,217,.22),transparent 55%),
          repeating-linear-gradient(58deg,rgba(255,255,255,.07) 0 2px,transparent 2px 30px),
          repeating-linear-gradient(-32deg,rgba(255,255,255,.07) 0 2px,transparent 2px 36px),
          linear-gradient(160deg,#0E1622,#16202F)"></div>
        <div class="dot" style="position:absolute;left:34%;top:38%;background:${A1};box-shadow:0 0 0 8px rgba(110,168,255,.2)"></div>
        <div class="dot" style="position:absolute;left:62%;top:60%;background:${A2};box-shadow:0 0 0 8px rgba(123,241,217,.18)"></div>
        <div class="dot" style="position:absolute;left:48%;top:76%;background:${A3};box-shadow:0 0 0 8px rgba(183,156,255,.16)"></div>
      </div>`,
  },
  'circo': {
    kicker: 'Team delivery · Next.js 16 + React 19',
    title: 'Ignite Circle',
    sub: 'Front end for a multi-contributor Orange internship programme product',
    body: `Built against a shared component library and Zustand store inside a distributed team,
      following a common AGENTS.md convention rather than a solo branch.`,
    chips: ['Next.js 16', 'React 19', 'Tailwind 4', 'Zustand', 'team'],
    art: `
      <div class="glass" style="left:60px;top:246px;width:470px;height:214px">
        <div class="mono" style="font-size:11px;letter-spacing:.14em;color:${A2}">SHARED COMPONENT LAYERS</div>
        <div style="margin-top:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${Array.from({ length: 12 })
            .map(
              (_, i) =>
                `<div style="height:34px;border-radius:10px;background:linear-gradient(150deg,rgba(255,255,255,${
                  0.16 - (i % 4) * 0.03
                }),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.13)"></div>`
            )
            .join('')}
        </div>
        <div class="mono" style="margin-top:16px;font-size:11px;color:${MUTED}">
          <span style="color:${A2}">+</span> 4 contributors &nbsp;·&nbsp; main protected &nbsp;·&nbsp; reviewed merges</div>
      </div>
      <div class="glass" style="right:56px;top:150px;width:280px;height:300px">
        <div class="mono" style="font-size:11px;letter-spacing:.14em;color:${A1}">COMMIT GRAPH</div>
        <svg width="100%" height="200" viewBox="0 0 240 200" style="margin-top:10px">
          <line x1="40" y1="16" x2="40" y2="184" stroke="rgba(110,168,255,.75)" stroke-width="3"/>
          ${[40, 76, 112, 148]
            .map(
              (y) =>
                `<circle cx="40" cy="${y}" r="6" fill="${INK2}" stroke="${A2}" stroke-width="3"/>
                 <line x1="46" y1="${y}" x2="${120 + (y % 3) * 22}" y2="${y}" stroke="rgba(255,255,255,.3)" stroke-width="2"/>`
            )
            .join('')}
        </svg>
      </div>`,
  },
  'pulse-fit': {
    kicker: 'Mobile craft · React Native + Expo',
    title: 'Pulse Fit',
    sub: 'Fitness tracker with animated rings and real health-store sync',
    body: `Guided live sessions, count-up progress rings and bidirectional Apple HealthKit /
      Google Fit sync — with a simulated fallback so no screen ever dead-ends.`,
    chips: ['Expo', 'Reanimated', 'HealthKit', 'SVG', 'Google Fit'],
    art: `
      <div class="glass" style="left:60px;top:240px;width:290px;height:220px">
        <div class="mono" style="font-size:11px;letter-spacing:.14em;color:${A2}">ACTIVITY</div>
        <div style="display:flex;align-items:flex-end;gap:11px;height:150px;margin-top:18px">
          ${[42, 66, 30, 88, 58, 96, 74]
            .map(
              (h) =>
                `<div style="flex:1;height:${h}%;border-radius:8px;background:linear-gradient(180deg,${A1},rgba(110,168,255,.18))"></div>`
            )
            .join('')}
        </div>
      </div>
      <div class="glass" style="right:56px;top:172px;width:300px;height:290px;display:flex;align-items:center;justify-content:center">
        <div class="ring" style="width:200px;height:200px;border-color:rgba(255,255,255,.1);
          border-top-color:${A1};border-right-color:${A1};transform:rotate(38deg)"></div>
        <div class="ring" style="position:absolute;width:150px;height:150px;border-width:7px;
          border-color:rgba(255,255,255,.08);border-bottom-color:${A2};border-left-color:${A2};transform:rotate(-24deg)"></div>
        <div style="position:absolute;text-align:center">
          <div class="h2" style="font-size:32px">14</div>
          <div class="mono" style="font-size:10.6px;letter-spacing:.16em;color:${MUTED}">DAY STREAK</div>
        </div>
      </div>`,
  },
  'air-canvas': {
    kicker: 'Computer vision · Python + MediaPipe',
    title: 'Air Canvas',
    sub: 'Draw in the air with hand gestures — five states, zero hardware',
    body: `Finger counts drive a mode machine: draw, hover, erase, palette, clear. Pinch selects a
      colour. Tuned for real-time landmark tracking on commodity webcams.`,
    chips: ['MediaPipe', 'OpenCV', 'landmarks', 'real-time'],
    art: `
      <div class="glass" style="left:60px;top:250px;width:340px;height:206px">
        <div class="mono" style="font-size:11px;letter-spacing:.14em;color:${A2}">GESTURE → MODE</div>
        ${[['1 finger', 'DRAW', A2], ['2 fingers', 'HOVER', A1], ['3 fingers', 'ERASE', A3], ['5 + pinch', 'PALETTE', A2]]
          .map(
            ([g, m, c]) => `<div style="display:flex;justify-content:space-between;margin-top:13px;
            font-size:12.6px"><span class="mono" style="color:${MUTED}">${g}</span>
            <span style="color:${c};font-weight:600;letter-spacing:.08em">${m}</span></div>`
          )
          .join('')}
      </div>
      <div class="glass" style="right:56px;top:206px;width:330px;height:252px;padding:0;overflow:hidden">
        <svg width="330" height="252" viewBox="0 0 330 252">
          <path d="M28 196 C 92 44, 148 226, 206 96 S 288 62, 306 118"
            fill="none" stroke="url(#g1)" stroke-width="6" stroke-linecap="round"/>
          <defs><linearGradient id="g1" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="${A1}"/><stop offset=".5" stop-color="${A2}"/>
            <stop offset="1" stop-color="${A3}"/></linearGradient></defs>
          ${[[28, 196], [92, 118], [148, 176], [206, 96], [252, 74], [306, 118]]
            .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${INK2}" stroke="${A2}" stroke-width="3"/>`)
            .join('')}
        </svg>
      </div>`,
  },
};

function posterHTML(slug, p) {
  return frame(
    `<div style="position:absolute;left:60px;top:56px;right:56px">
      <div class="kicker">${p.kicker}</div>
      <div class="h1" style="margin-top:14px">${p.title}</div>
      <div style="font-family:'Sora';font-weight:500;font-size:15.5px;color:${A1};margin-top:8px;max-width:760px">${p.sub}</div>
    </div>
    ${p.art}
    <div style="position:absolute;left:60px;bottom:44px;right:56px">
      <div class="body" style="max-width:820px">${p.body}</div>
      <div style="margin-top:12px">${p.chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
    </div>`,
    CSS
  );
}

function ogHTML() {
  const body = `
    <div class="glass" style="left:96px;top:150px;width:600px;padding:34px 38px">
      <div class="kicker">Portfolio · Full-Stack &amp; Applied AI Engineer</div>
      <div class="h1" style="font-size:60px;margin-top:18px">Tamif<br/>Dontman</div>
      <div class="body" style="font-size:15.4px;margin-top:18px;max-width:470px">
        I build voice-first assistants, two-sided marketplaces and cross-platform apps —
        then ship them all the way to a device.</div>
    </div>
    <div class="glass" style="right:96px;top:150px;width:340px;height:330px">
      <div class="mono" style="font-size:11.4px;letter-spacing:.18em;color:${A2}">SELECTED WORK</div>
      ${['ARIA · voice AI', 'Re-kollect · marketplace', 'Ignite Circle · team', 'Pulse Fit · mobile', 'Air Canvas · CV']
        .map(
          (t) => `<div style="display:flex;align-items:center;gap:12px;margin-top:16px;font-size:14px">
          <span class="dot" style="background:${A1};box-shadow:0 0 10px ${A1}"></span>${t}</div>`
        )
        .join('')}
      <div class="bar" style="margin-top:22px;width:120px"></div>
    </div>
    <div style="position:absolute;left:96px;bottom:78px" class="mono">
      <span style="color:${A2};font-size:13px">github.com/dontman-tech</span>
      <span style="color:${MUTED};font-size:13px">&nbsp; · &nbsp;tabe7143@gmail.com</span>
    </div>`;
  return frame(body, CSS);
}

async function main() {
  fs.mkdirSync(IMG, { recursive: true });

  const fontsCSS = `@font-face{font-family:'Sora';src:url('file://${path.join(
    __dirname, 'fonts', 'sora700.ttf'
  )}');font-weight:700}
  @font-face{font-family:'Sora';src:url('file://${path.join(__dirname, 'fonts', 'sora400.ttf')}');font-weight:400}
  @font-face{font-family:'Inter';src:url('file://${path.join(__dirname, 'fonts', 'inter400.ttf')}');font-weight:400}
  @font-face{font-family:'Inter';src:url('file://${path.join(__dirname, 'fonts', 'inter600.ttf')}');font-weight:600}
  @font-face{font-family:'JetBrains Mono';src:url('file://${path.join(__dirname, 'fonts', 'inter400.ttf')}');font-weight:400}`;

  fs.writeFileSync(path.join(__dirname, 'fonts.css'), fontsCSS);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });

  for (const [slug, p] of Object.entries(posters)) {
    await page.setContent(posterHTML(slug, p), { waitUntil: 'load' });
    await page.waitForTimeout(320);
    await page.screenshot({ path: path.join(IMG, `proj-${slug}.png`), type: 'png' });
    console.log('poster', slug);
  }

  const ogPage = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await ogPage.setContent(ogHTML().replace(`width:${W}px;height:${H}px`, 'width:1200px;height:630px')
    .replace(/html,body\{width:\d+px;height:\d+px/, 'html,body{width:1200px;height:630px')
    .replace(`.scene{position:relative;width:${W}px;height:${H}px`, `.scene{position:relative;width:1200px;height:630px`),
    { waitUntil: 'load' });
  await ogPage.waitForTimeout(320);
  await ogPage.screenshot({ path: path.join(IMG, 'og.png'), type: 'png' });
  console.log('og card');

  const iconPage = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await iconPage.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{width:180px;height:180px;overflow:hidden;background:linear-gradient(150deg,#0B0F17,#16202F);
        display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif}
      .m{width:132px;height:132px;border-radius:34px;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(150deg,rgba(110,168,255,.9),rgba(123,241,217,.75));
        box-shadow:0 16px 34px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.5);
        font-size:64px;font-weight:700;color:#08101C;letter-spacing:-.04em}
    </style></head><body><div class="m">T</div></body></html>`,
    { waitUntil: 'load' }
  );
  await iconPage.waitForTimeout(200);
  await iconPage.screenshot({ path: path.join(IMG, 'apple-touch-icon.png'), type: 'png' });
  console.log('apple touch icon');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
