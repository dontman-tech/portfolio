# TAMIF — Portfolio

Static single-page portfolio for **Tabe Miracle Fiagmenyi** — full-stack & applied AI engineer.

Zero-build: one `index.html` with vanilla ES6, Tailwind via CDN, Lucide via CDN, Kanit from
Google Fonts. No npm, no bundler, no Node step.

## Preview locally

```bash
python3 -m http.server 12000
```

Then open <http://localhost:12000>.

## Deploy

GitHub Pages at `tamif.is-a.dev`. `.github/workflows/deploy.yml` uploads the repository root as
the Pages artifact, so the site goes live on every push to `main`. `CNAME` pins the custom domain.

## Files

```
index.html                    the entire site (markup, styles, scripts)
portrait.png                  hero portrait — replace with your own image
favicon.svg                   favicon
CNAME                         custom domain for GitHub Pages
robots.txt, sitemap.xml       crawler metadata
.github/workflows/deploy.yml  publish the repo root to GitHub Pages
```

## Swapping the hero portrait

`index.html` loads `portrait.png` from the repo root. Replace that file with an image of your
choice and the site picks it up — no code changes. A portrait-shaped image (roughly 4:5) works
best; the hero reserves its width at 280–520px depending on breakpoint.

If `portrait.png` is missing or fails to load, the page falls back to a dashed "Add portrait.png"
placeholder rather than a broken image icon.
