# AGENTS.md

Portfolio site for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer.

**Zero-build static site.** One `index.html` holds the markup and the scripts; one
`styles.css` holds every style. There is no npm, no bundler, no React, and no build step.
Fonts (Kanit + Space Grotesk) come from Google Fonts; there are no other CDN dependencies —
the icons are inline SVG. A prior React + Vite + Framer Motion build was removed wholesale, and
an intermediate Tailwind-CDN build was also removed. Do not reintroduce either.

## Layout

```
index.html                    the entire site: markup + one <script> block
styles.css                    the entire design system (tokens → components)
portrait.png                  hero portrait — swap this file to change the image
favicon.svg                   brand mark referenced by index.html
CNAME                         tamif.is-a.dev
robots.txt, sitemap.xml       crawler metadata
.nojekyll                     skips Jekyll on GitHub Pages
.github/workflows/deploy.yml  uploads the repo root as the Pages artifact
```

## Preview

```bash
python3 -m http.server 12000   # then open http://localhost:12000
```

## Design system

Everything lives in `styles.css`, organised as tokens first, then components. Change a token
rather than hard-coding a value.

**Palette.** `--ink #0D0D12` (dark surface), `--ink-2 #15151F` (raised dark card),
`--paper #F4EFE3` (light surface), `--cream #FFFBF2` (headings on dark), `--tangerine #FF6A3D`
(primary accent / primary CTA), `--lime #C9F24E` and `--periwinkle #8E9BFF` (secondary accents
used only in project art). Body copy is `--body-dark #C9CBD6` on ink and `--body-light #3B3B46`
on paper; muted text is `--muted-dark` / `--muted-light`.

**No decorative gradients, no glassmorphism, no pill buttons.** The old site leaned on all three;
that is what this rewrite removed. Texture comes from `.dotgrid` (a single `radial-gradient`
used as a dot pattern) and the angled `.wedge` section seams. Corners are modest radii
(`--r-sm/md/lg`), never fully rounded. If you add a surface, make it a flat colour.

**Sections alternate ink → paper → ink.** Transitions use `.wedge`, whose two CSS custom
properties are set inline per instance: `--from` paints the outgoing section colour and `--to`
is clipped in over it as a diagonal, so sections meet on a slant instead of a straight edge.
`.wedge__node` is the diamond accent. Keep `--from`/`--to` in sync with the sections either side
of the wedge or you get a visible colour step.

**Type.** Kanit (`--font-display`) is for headings, the wordmark and numbers; Space Grotesk
(`--font-body`) is the body copy; the mono stack (`--font-mono`) is for eyebrows, labels, chips
and numerals. Headings are uppercase with tight leading — `.h-display` for the hero, `.h-section`
for section titles.

**Buttons.** `.btn--primary` is the tangerine CTA with a hard offset shadow (no blur); it is the
only filled button. `.btn--ghost` is the outlined secondary. `.link-arrow` is the inline text
link. There is exactly one primary CTA per view (the nav "Hire me"), and `#contact` is the only
destination that gets one — the "Contact Me" hierarchy problem on the old site came from having
several competing filled buttons.

## Projects section

Each project is a `.proj` article in an editorial two-column row; every second one carries
`.proj--flip` so the art alternates sides. The art is a **hand-written inline SVG per project**
(`.proj__art`), each with a distinct motif and a unique `role="img"` + `aria-label`; there are no
bitmap screenshots because the projects have no stable public UI to capture. Keep the aria-labels
unique — a test asserts that the number of unique labels equals the number of projects.

Descriptions are two-tier: a short `.proj__summary` always visible, and the long technical story
inside a native `<details class="proj__detail">` ("How it works"). Native `<details>` is used on
purpose — it needs no JS, is keyboard accessible, and works with JS disabled. Do not replace it
with a scripted accordion.

Project copy must match the repository it links to; verify a claim against the repo README before
writing it. Lumina appears as participation in the Prometheus AI Hackathon — a "4th place"
ranking was deliberately removed, do not reinstate it. "Also shipped" links live repos only;
`spark-ai-powered-browser`, `tamif-bot`, `pic-to-sketch`, `CTaDI`, `liquidOs26` and the two
XYBERCLAN repos were each verified to exist before being listed.

## Portrait

`index.html` loads `portrait.png` from the repo root, so the image is swapped by replacing that
file, not by editing markup. The `error` handler **builds the fallback frame in JS** rather than
reading it from the markup, so no placeholder copy ships in the HTML for a crawler (or a visitor
with JS off) to read — that was the "Add portrait.png" defect. The handler also checks
`complete && naturalWidth === 0` after attaching, because a cached failure can fire before the
listener exists. `.portrait__block` is the tangerine offset shape behind the cut-out image;
`portrait.png` is RGBA with a transparent background, which is what makes that work.

## Accessibility

`header` / `nav` / `main` / `footer` landmarks are present, there is a `.skip-link` as the first
focusable element, `:focus-visible` draws a 3px tangerine outline, and every decorative SVG
carries `aria-hidden="true"` while every meaningful one carries `role="img"` + a label. Heading
levels never skip (one `h1`, then `h2` per section, `h3` for items). Keep `axe` clean: the nav CTA
is excluded from the `.nav-links a` colour rule via `:not(.btn)`, because inheriting the muted
link grey onto the tangerine button dropped its contrast below AA.

**Motion is opt-in.** The ticker animation and the `.reveal` transition are both neutralised
under `prefers-reduced-motion: reduce` (ticker `animation: none`, reveal forced visible,
`scroll-behavior: auto`). `.reveal` is a plain IntersectionObserver add of `.is-visible`; if you
add another animated element, gate it the same way.

**Narrow screens.** Below 470px the wordmark text is hidden and the nav links tighten, because
five links plus the brand otherwise force a horizontal scroll at 320px. `body` carries
`overflow-x: clip`, which hides this class of regression instead of failing loudly, so verify
layout at 320px with a geometry probe rather than by eye.

## Content truthfulness

Copy is written to be defensible: no rankings that were removed, no repos that do not exist, no
metrics that cannot be sourced. If you update a project, re-read its README first.
