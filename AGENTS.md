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
portrait.png                  hero portrait — swap this file to change the image
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

**Glass cards.** The `.card` / `.content` / `.word` / `@keyframes anim` block is a fixed 190x254
shell with a bevelled inset shadow. Projects, contact tiles and marquee tiles all reuse it by
adding `.card--fluid` (full-width, auto height) or `.card--tile` (420x270) — never by editing
`.card` itself. Two gotchas: a sticky element only travels inside its parent's box, so project
cards carry `stack-card sticky top-24` on the `.card` wrapper and keep the `<article>` static;
and `.content` is a 300%-wide flex track holding two `.word` halves, which the keyframe steps by
33.33% — the two words are the only children, so the slide loops without exposing a gap.

**Marquee tiles never go blank.** The `.content` track is 300% of the 420px tile and each `.word`
is 50% of that, with the text centred inside it. At the `-33.33%` keyframe the first word's centre
lands 105px left of the tile and the second 105px right, so *both* words sit outside the 420px
window and the tile renders empty for the middle 40% of every 6s cycle. The `.card__icon` watermark
(fixed, centred, `z-index: 0` under `.content`'s `z-index: 1`) is what keeps the card readable
there — do not drop it, and do not "fix" the keyframe by shortening the track without re-checking
that some text is on screen at every step.

**Brand icons are inlined, not fetched from Lucide.** Lucide removed its brand glyphs, so
`data-lucide="github"` and `data-lucide="linkedin"` render nothing at all. The `BRAND` map holds
simple-icons path data for the marquee tiles and the contact links; `GENERIC` holds the one entry
with no brand mark of its own (REST APIs, an inlined Lucide-shaped globe). Every marquee candidate
carries an `icon` key naming its map entry — add a tile by adding the key, not by adding another
`<script>` tag. Set `generic: true` on the item to pull from `GENERIC` instead of `BRAND`.

Anything sitting on a `.card` must use `#0C0C0C` ink, not `#D7E2EA`; the shell is light
(`rgb(223,225,235)`), so the dark-surface body colour would be invisible. Keep opacity at or above
`/60`, which is the floor that clears WCAG AA on this background. `#D7E2EA` remains correct for
everything on the `#0C0C0C` sections (hero, about, contact footer).

**Hero portrait.** `index.html` loads `portrait.png` from the repo root, so the image is swapped
by replacing that file, not by editing markup. An `onerror` handler hides the `img` and reveals
the dashed `.portrait-fallback` box, so a missing file degrades instead of showing a broken icon.
The `[hidden] { display: none !important }` rule is required — `.portrait-fallback` sets
`display: flex` and the `img` carries Tailwind's `block`, both of which would otherwise beat the
`hidden` attribute and leave both visible at once.

**Hero heading sits behind the portrait.** The `h1` wrapper carries `z-0` and the absolutely
positioned portrait wrapper carries `z-10`, so the image paints *over* the heading where the two
overlap and the top of the portrait reads as a cut-out against the glyphs. This is deliberate:
raising the heading to `z-20` was tried and reverted, because it buried the portrait behind the
text. Keep the heading's own wrapper below the portrait, and keep that wrapper free of horizontal
padding — `.hero-heading` is sized in `vw`, so padding shears the outermost glyphs. Note
`overflow-x: clip` on both the layout wrapper and `body` hides this class of regression instead of
failing loudly, so verify the stacking with a pixel probe rather than by eye.

**About CTA.** "More about me" is an `<a>` to the GitHub profile with
`rel="noopener noreferrer"`, alongside the other outbound links. It is styled as a bordered pill
rather than the gradient `.card` CTA so it reads as secondary to "Contact me".

**Cross-engine text metrics differ by design, not by bug.** Chromium quantises every Kanit glyph
advance to whole pixels, while Firefox and WebKit keep subpixel advances and agree with each other
to under 0.02px. Chromium therefore measures the same string up to ~2% wider, which can tip a
tight paragraph onto one extra line at a given width (the Services descriptions at 430px are the
worked example). This is rasteriser behaviour and no CSS property can reconcile it. Layout boxes,
section heights at 390/768/1024/1440/1920, sticky offsets, and gradient text all match exactly
across the three engines — verify with a geometry probe, and treat a lone pixel diff in a text
block as expected. Do not "fix" it by shrinking copy or padding: it only moves which width wraps.
`-webkit-text-size-adjust: 100%` is pinned on `html` so iOS Safari cannot inflate text on wide
viewports and diverge from the desktop metrics.

**Content truthfulness.** Project copy must match the repository it links to; verify a claim
against the README before writing it. Lumina appears as participation in the Prometheus AI
Hackathon — a "4th place" ranking was deliberately removed, do not reinstate it. All project links
point at `https://github.com/dontman-tech`; swap in per-repo URLs only once the repo exists.
