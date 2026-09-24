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
favicon.svg                   favicon
CNAME                         custom domain for GitHub Pages
robots.txt, sitemap.xml       crawler metadata
.github/workflows/deploy.yml  publish the repo root to GitHub Pages
```
