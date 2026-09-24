# AGENTS.md

Portfolio site for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer.

React 19 + TypeScript + Tailwind 3 + Framer Motion + Lucide React, bundled by Vite.
Single page, dark theme (`#0C0C0C`), Kanit from Google Fonts. The audience is a
hiring manager who should understand "who / what / why talk to me" in 30–90 seconds.

The previous static-HTML build (authoring studio, matrix rain, loader, theme
switcher, `tools/` QA suites) was replaced wholesale. Do not reintroduce it.

## Layout

```
index.html                    document shell, Kanit font, page title, favicon link
src/main.tsx                  React entry
src/index.css                 global reset, #0C0C0C, .hero-heading gradient
src/App.tsx                   section order + MotionConfig(reducedMotion="user")
src/sections/                 Hero, Marquee, About, Services, Projects, Contact
src/components/
  ContactButton.tsx           gradient pill CTA
  LiveProjectButton.tsx       ghost outline link to GitHub
  Magnet.tsx                  cursor-following magnetic hover
  AnimatedText.tsx            scroll-driven character-by-character reveal
  CornerGraphics.tsx          inline SVG corner decorations for About
public/                       favicon.svg, robots.txt, sitemap.xml, CNAME, .nojekyll
.github/workflows/deploy.yml  build dist/ and publish to GitHub Pages
```

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:12000
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the built bundle on port 12000
```

## Conventions

**Transform ownership — the one that bites.** Framer Motion writes an inline
`transform` for any entrance/`whileInView` animation, and that overrides
Tailwind's `translate-*` classes on the *same* element. Never put both on one
node. The hero portrait is the worked example: an absolutely-positioned wrapper
carries `left-1/2 -translate-x-1/2`, and the `motion.div` entrance animation sits
on a child inside it. Collapsing them shifts the portrait right by half its width
and `overflow-x: clip` hides the evidence instead of failing loudly. Tailwind's
`sm:-translate-y-0` and `sm:translate-y-0` also collide in this file — the latter
wins the emitted CSS, so the mobile `-translate-y-1/2` centring is intentionally
dropped at `sm` where the portrait is bottom-anchored instead.

**Full-bleed headings.** `.hero-heading` consumers are sized in `vw` units, so
their container must carry no horizontal padding — padding shears the outermost
glyphs. The `overflow-hidden` wrapper that clips the entrance animation masks it.

**Scroll-driven work.** The marquee offset is `(scrollY - sectionTop +
innerHeight) * 0.3`. Row 1 advances with `translateX(offset - 200)`, row 2 with
`translateX(-(offset - 200))`, so they drift in opposite directions. Each row is
rendered three times and shifted by `-33.333%` — exactly one full set, because
percentage translates resolve against the *node's* own width, not the viewport.
Without that shift the loop exposes blank space in the sideways direction.

**Tokens vs literals.** There is no `tokens.css` any more; the palette is the
literal `#0C0C0C` (surface), `#141414` (raised card), `#D7E2EA` (body text on
dark), and the `#646973 → #BBCCD7` gradient. Body copy over dark surfaces uses
`#D7E2EA`, which clears WCAG AA. Keep new small labels at or above that.

**Sections that stack.** Services is the only white surface and its wrapper has
no `overflow-hidden`; Projects pulls itself up (`-mt-10 sm:-mt-12 md:-mt-14`,
`z-10`) so the Services rounded top corners read as a stack. That negative margin
is why `#projects` needs its own `overflowX: clip`: `#projects` is a containing
block for the sticky cards, so it is the element that would otherwise grow a
horizontal scrollbar from the marquee-width rows.

**Content truthfulness.** Project copy must match the repository it links to.
Verify a claim against the README before writing it. Lumina appears as
participation in the Prometheus AI Hackathon; a "4th place" ranking was
deliberately removed — do not reinstate it. All project links currently point at
the GitHub profile `https://github.com/dontman-tech`; swap in per-repo URLs only
once the repo actually exists.

**Accessibility.** `MotionConfig reducedMotion="user"` honours
`prefers-reduced-motion` for all Framer animations. Decorative SVGs are
`aria-hidden`. The character reveal animates opacity only, and every glyph holds
0.2 as its floor, so no copy is ever fully invisible.

## Deployment

GitHub Pages at `tamif.is-a.dev`, via `.github/workflows/deploy.yml`, which
builds `dist/` and publishes it. `public/CNAME` pins the custom domain and
`public/.nojekyll` skips Jekyll. Because the workflow uploads `dist/` (not the
repo root), both files must live in `public/` to be copied into the artifact —
putting them in the repo root silently drops the custom domain.
