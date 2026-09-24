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
assets/js/motion.js       scroll engine: reveal, scrub, fixed backdrop drift, tilt, magnetic, press
assets/js/app.js          UI logic: nav, mobile sheet, contact flow, reveal fallback
tools/                    QA suites, dev server, asset generators
                          (verify, design, a11y, focus, resilience, responsive, flow)
```

## Commands

```bash
node tools/serve.js 12000     # preview (custom 404 enabled) — use this, not `python3 -m http.server`
cd tools && npm test          # all seven QA suites
cd tools && npm run design    # one suite: verify|design|a11y|focus|resilience|responsive|flow|audit|shots
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
reveal · `data-fade` opacity-only reveal · `data-scrub` scroll scrub ·
`data-parallax-fixed` backdrop drift · `data-tilt` 3D hover ·
`data-magnetic` cursor lean · `.shift__a/.shift__b` text shift · `.is-pressed`
press+spring.

**Tokens, not literals.** Colours, spacing (`--s-*`), radii and easing come from
`tokens.css`. The palette is swappable by setting `data-palette` on `<html>` —
the tokens cascade from there, so a new theme is a token block, not a rewrite.

**Layout must survive `overflow: hidden`.** `.hero` clips its overflow, so a
child wider than the viewport is silently cropped instead of producing a
scrollbar — the phone headline used to lose its right half this way. Grid items
default to `min-width: auto`, so any grid/flex container that should shrink
needs an explicit `min-width: 0`, and fixed `minmax()` floors (a `132px` stats
track summed past a 320px screen) are the usual culprit. `tools/responsive.js`
walks real device profiles, including short landscape viewports where a stacked
hero used to run to four screens.

**Clip reveals need `threshold: 0`.** A `clip-path`-hidden element reports an
intersection ratio of 0 at every scroll position, so a non-zero
IntersectionObserver threshold silently leaves `data-clip`/`data-clip-x` content
invisible forever. The observer's `rootMargin` does the in-view gating instead.
`tools/verify.js` guards this.
