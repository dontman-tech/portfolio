# AGENTS.md

Portfolio site for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer.

**Zero-build static site.** One `index.html` holds the markup, the styles and the scripts.
Tailwind arrives from `cdn.tailwindcss.com`, Lucide from `unpkg.com/lucide@latest`, Kanit from
Google Fonts. There is no npm, no bundler, no React, and no build step. The prior
React + Vite + Framer Motion build (and the static-HTML authoring studio before it) was removed
wholesale. Do not reintroduce either.

## Layout

```
index.html                    the entire site
favicon.svg                   favicon referenced by index.html
CNAME                         tamif.is-a.dev
robots.txt, sitemap.xml       crawler metadata
.nojekyll                     skips Jekyll on GitHub Pages
.github/workflows/deploy.yml  uploads the repo root as the Pages artifact
```

## Preview

```bash
python3 -m http.server 12000   # then open http://localhost:12000
```

## Conventions

**Deploy path.** The workflow runs `actions/upload-pages-artifact` with `path: .`, so the repo
root *is* the artifact and root-relative URLs like `favicon.svg` resolve. `.nojekyll` and `CNAME`
sit at the root for the same reason — moving them into a subdirectory silently drops the custom
domain.

**Marquee.** Both rows are built in JS from the `STACK` and `TOOLING` arrays, each rendered
twice. The `@keyframes` translate exactly `-50%`, which is one full set, so the loop wraps with
no blank space. Row 1 moves right, row 2 moves left. Every tile is `420px x 270px`, `#141414`,
`rounded-2xl`.

**Animation is opt-in.** Marquee keyframes and the magnetic portrait are both gated behind
`prefers-reduced-motion: no-preference`, and the bio/stack effects are plain scroll listeners
with a per-word opacity floor of `0.2`, so no copy is ever fully invisible.

**Palette.** Literal `#0C0C0C` (surface), `#141414` (raised card), `#D7E2EA` (body text on dark),
and the `#646973 → #BBCCD7` gradient in `.hero-heading`. Services is the only white surface;
Projects overlaps it with `-mt-12` and a `rounded-t-[50px]` top so the sections read as a stack.

**Content truthfulness.** Project copy must match the repository it links to; verify a claim
against the README before writing it. Lumina appears as participation in the Prometheus AI
Hackathon — a "4th place" ranking was deliberately removed, do not reinstate it. All project links
point at `https://github.com/dontman-tech`; swap in per-repo URLs only once the repo exists.
