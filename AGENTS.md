# AGENTS.md

Portfolio site for Tamif Dontman — full-stack & applied AI engineer. Static
HTML/CSS/JS, no build step, no framework. The audience is a hiring manager who
should understand "who / what / why talk to me" within 30–90 seconds.

## Layout

```
index.html                single-page portfolio (hero → method → work → about → skills → contact)
404.html                  custom error page
robots.txt sitemap.xml    crawlability
manifest.webmanifest      PWA metadata
netlify.toml vercel.json  deploy config (404 routing + cache headers)
assets/css/tokens.css     design tokens: palette, glass, backgrounds, spacing, type
assets/css/base.css       resets, primitives (reveal/clip/stagger/shift/press), a11y
assets/css/site.css       component styles
assets/js/motion.js       scroll engine: reveal, scrub, pin, tilt, magnetic, press
assets/js/app.js          UI logic: nav, studio panel, contact flow, prefs
tools/                    QA suites, dev server, asset generators
```

## Commands

```bash
node tools/serve.js 12000     # preview (custom 404 enabled) — use this, not `python3 -m http.server`
cd tools && npm test          # all six QA suites
cd tools && npm run design    # one suite: verify|design|a11y|focus|resilience|flow|audit|shots
python3 tools/make_resume.py  # regenerate the PDF resume
```

Tests run against `http://127.0.0.1:12000`. Start the server first.

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

**Motion is intentional, not decorative.** `prefers-reduced-motion` disables
scrub/tilt/magnetic and reveals everything immediately. Keep that branch working
— `tools/verify.js` checks it.

**Animation vocabulary** (all in `assets/css/base.css`, driven by `motion.js`):
`data-reveal` fade+lift · `data-stagger` lists · `data-clip`/`data-clip-x` clip
reveal · `data-pin` pin+transform · `data-scrub` parallax · `data-tilt` 3D hover ·
`data-magnetic` cursor lean · `.shift__a/.shift__b` text shift · `.is-pressed`
press+spring.

**Tokens, not literals.** Colours, spacing (`--s-*`), radii and easing come from
`tokens.css`. The studio panel switches `data-palette`, `data-glass` and
`data-bg` on `<html>`; preferences persist to localStorage and must degrade
silently if storage is blocked.
