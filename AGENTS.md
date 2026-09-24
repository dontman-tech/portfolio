# AGENTS.md

Portfolio site for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer. Static
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

**Light-on-light surfaces.** The `.card` panes are deliberately light against
the dark page, so any text sitting on one needs a *fixed* colour, not
`var(--accent)` — the studio can switch the accent to orange or purple, which
drops the contrast ratio below AA on a near-white pane. `.card__meta` uses a
literal `#0066cc` for this reason; the aurora blob carries the palette instead.
Contrast was measured from rendered pixels, not estimated from token values,
because the aurora gradient behind each pane is the actual background.

**Layered backgrounds.** `.bg` holds the mesh, blobs, grain and vignette;
`.matrix-container` is a sibling holding the matrix rain. `app.js` builds one
`.matrix-pattern` strip per 1000px of viewport width and rebinds on resize, so
the columns never stretch. The loader is `display:none` unless `html.js` is
set, and carries its own CSS dismissal animation as a fallback in case
`app.js` fails to load.
