# AGENTS.md

Portfolio site for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer. Static
HTML/CSS/JS, no build step, no framework. The audience is a hiring manager who
should understand "who / what / why talk to me" within 30–90 seconds.

This is the **production build**. The authoring studio, the matrix-rain
background and the loading screen have been removed on purpose — do not
reintroduce them. The palette is Apple's light appearance only; there is no
theme switcher and no `data-palette` override.

## Layout

```
index.html                single-page portfolio (hero → work → method → wider range → about → contact)
404.html                  custom error page
robots.txt sitemap.xml    crawlability
manifest.webmanifest      PWA metadata
netlify.toml vercel.json  deploy config (404 routing + cache headers)
assets/css/tokens.css     design tokens: Apple palette, surfaces, spacing, type, easing
assets/css/base.css       resets, primitives (reveal/clip/stagger/shift/press), a11y
assets/css/site.css       component styles
assets/js/motion.js       scroll engine: reveal, parallax, tilt, magnetic, press, spotlight
assets/js/app.js          UI logic: nav, mobile sheet, contact flow, toasts
tools/                    QA suites, dev server, asset generators
```

## Commands

```bash
node tools/serve.js 12000     # preview (custom 404 enabled) — use this, not `python3 -m http.server`
cd tools && npm test          # all six QA suites
cd tools && npm run design    # one suite: verify|design|a11y|focus|resilience|flow|audit|shots
python3 tools/make_resume.py  # regenerate the PDF resume (needs `pip install reportlab`)
./tools/deploy.sh             # publish to GitHub Pages + open the is-a.dev PR
```

Tests run against `http://127.0.0.1:12000`. Start the server first.

## Deployment

Hosted on GitHub Pages at `tamif.is-a.dev`. `CNAME` (the custom domain) and
`.nojekyll` (skip Jekyll) are committed in the repo root — Pages requires the
former and the site assumes the latter. `netlify.toml` and `vercel.json` are
kept for alternative hosts; they are inert on Pages.

`tools/deploy.sh` is idempotent: it creates the repo, pushes `master`, enables
Pages, sets the custom domain, then forks `is-a-dev/register` and opens a PR
adding `domains/tamif.json`. Re-running it skips completed steps.

The token must carry `administration=write`, `repository_creation=write`,
`pages=write`, `contents=write` and `pull_requests=write`. A GitHub App
installation token generally has none of these — repo creation and Pages
enablement both return `Resource not accessible by integration` without them.


## Conventions

**Progressive enhancement.** `index.html`/`404.html` swap `no-js` → `js` in an
inline head script *before* stylesheets load, and every reveal/clip/stagger rule
is scoped to `html.js`. Without JavaScript nothing is hidden. `app.js` also has a
`revealFallback()` that force-reveals content if `motion.js` fails to load. Do
not add a rule that hides content outside `html.js` — `tools/resilience.js`
asserts all of this.

**Content truthfulness.** Project copy must match the repository it links to.
Verify a claim against the README before writing it (e.g. Air Canvas uses four
fingers + pinch, not an open hand). The mailto body and the "copy the brief"
button share one `buildBrief()` function so they cannot drift.

The Prometheus AI Hackathon appears as **participation and the product built
(Lumina)** only — the "4th place" ranking was deliberately removed from both the
site and `tools/make_resume.py`. Do not reinstate it; `tools/verify.js` asserts
the resume source stays free of it.

**Motion is intentional, not decorative.** `prefers-reduced-motion` disables
parallax/tilt/magnetic and reveals everything immediately. Keep that branch
working — `tools/verify.js` checks it.

Smoothness comes from two rules in `motion.js`: all scroll-driven effects read
from a *smoothed* scroll position (an exponential follow of the real `scrollY`,
so a 100px wheel step glides rather than jumps), and reads/writes are batched
into one `requestAnimationFrame` loop with `transform`/`opacity` only — never a
layout property. `tools/verify.js` asserts the easing converges rather than
snapping.

**Animation vocabulary** (all in `assets/css/base.css`, driven by `motion.js`):
`data-reveal` fade+lift · `data-stagger` lists · `data-clip`/`data-clip-x` clip
reveal · `data-parallax` background drift · `data-tilt` 3D hover ·
`data-magnetic` cursor lean · `data-count` count-up · `.shift__a/.shift__b` text
shift · `.is-pressed` press+spring. There is deliberately no pin/scrub-jack:
the method section is three ordinary cards, not a sticky carousel.

**Tokens, not literals.** Colours, spacing (`--s-*`), radii and easing come from
`tokens.css`. Changing a value there changes it everywhere; do not hardcode a
hex or a px that already has a token.

**Contrast contract.** Apple's Secondary Gray (`#86868B`) measures 3.6:1 on
white, so it clears WCAG AA *only as large text*. `.lead` therefore switches to
`--subhead` at ≥900px where it renders at 24px+, and stays `--text-muted`
(Dark Gray, 7.5:1) below that. Any new small label must use `--text-muted` or
`--text-faint`, never `--subhead`. `tools/design.js` measures this from rendered
pixels, not from token values.

**Cross-device fit.** Every grid track that holds text is written
`minmax(0, 1fr)`, and `.hero` sets an explicit single column — an implicit `auto`
track sizes to the widest child's max-content and silently pushes content past a
phone viewport (the `.hero__status` pill caused exactly this). `tools/design.js`
asserts no element is wider than its own viewport at 390/834/1440px.

**Layered backgrounds.** `.bg` holds the mesh and three parallax blobs, driven by
`data-parallax`. Nothing else layers behind the content; the grain, vignette,
matrix rain and loader are gone.
