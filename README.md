# TAMIF — Portfolio

Single-page portfolio for **Tabe Miracle Fiagmenyi** — full-stack & applied AI engineer.
React + TypeScript + Tailwind CSS + Framer Motion + Lucide React, bundled with Vite.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:12000
npm run build      # typecheck (tsc --noEmit) + production bundle into dist/
npm run preview    # serve the built bundle on port 12000
```

## Structure

```
index.html                    document shell, Kanit font, page title
src/main.tsx                  React entry
src/index.css                 global reset, #0C0C0C background, .hero-heading gradient
src/App.tsx                   section order + MotionConfig(reducedMotion="user")
src/sections/                 Hero, Marquee, About, Services, Projects, Contact
src/components/
  ContactButton.tsx           gradient pill CTA
  LiveProjectButton.tsx       ghost outline link to GitHub
  Magnet.tsx                  cursor-following magnetic hover
  AnimatedText.tsx            scroll-driven character-by-character reveal
  CornerGraphics.tsx          inline SVG corner decorations for About
public/                       favicon, robots.txt, sitemap.xml, CNAME, .nojekyll
```

## Notes

**Dark theme.** `#0C0C0C` on `html`, `body`, `#root` and the main wrapper. The
Services section is the one inverted (white) surface, and it overlaps the
Projects section via negative margin so the rounded top corners read as a stack.

**Kanit** is loaded from Google Fonts (weights 300–900) in `index.html`.

**`.hero-heading`** is the shared gradient treatment — a `linear-gradient` clipped
to the text. Used by the hero `h1` and the About/Projects/Contact headings.
Its container carries no horizontal padding: the heading is sized in `vw` units,
so padding would shear the outermost glyphs (`overflow-hidden` hides the damage).

**Animated transforms vs Tailwind translates.** Positioning and animation are
kept on separate elements wherever an entrance/`whileInView` transform is
involved. Framer Motion writes an inline `transform` that overrides Tailwind's
`translate-*` classes on the same node — applying both to one element silently
breaks the centring.

**Scroll-driven work** (marquee offset, character reveal) is derived from scroll
position. The marquee advances with `translateX(offset - 200)` on one row and
`translateX(-(offset - 200))` on the other so they drift in opposite directions,
with each row rendered three times and shifted by `-33.333%` (one full set) so
the loop never exposes a gap.

**Accessibility.** `MotionConfig reducedMotion="user"` honours
`prefers-reduced-motion`. Decorative graphics are `aria-hidden`. Body copy
rendered over dark surfaces is `#D7E2EA`, which clears WCAG AA contrast.

## Deployment

GitHub Pages at `tamif.is-a.dev`, via `.github/workflows/deploy.yml` (builds
`dist/` and publishes it). `public/CNAME` pins the custom domain and
`public/.nojekyll` skips Jekyll processing. Both are copied into `dist/` at
build time, so they must stay in `public/` rather than the repo root.
