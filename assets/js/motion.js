/* ==========================================================================
   motion.js — the site's animation engine.

   One rAF loop does all scroll-driven work so reads and writes stay batched
   and never thrash layout. Everything degrades gracefully:
     · prefers-reduced-motion  → static, fully readable page
     · no IntersectionObserver → reveals resolve immediately
     · small viewports / touch → parallax and pin are skipped or simplified

   Data-attribute contract (set in markup):
     data-reveal[="up|left|right|scale"]   fade + lift on enter
     data-stagger                          fade + lift children, index-delayed
     data-clip / data-clip-x               clip-path reveal
     data-scrub                            continuous scroll-mapped transform
       data-scrub-y  px travel (negative = slower/background layer)
       data-scrub-s  scale delta across the range
       data-scrub-o  minimum opacity at the range edges (default 1 = no fade)
     data-parallax="0.18"                  px-per-scroll parallax factor
     data-tilt="7"                         max degrees of 3D tilt on pointer move
     data-magnetic="14"                    pointer-attracted offset in px
     data-pin                              sticky narrative container
       [data-pin-layer]                     stacked panels that swap in place
       [data-pin-tick]                      progress ticks
     data-count="120"                      count-up number on first view
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0 || 1));
    return t * t * (3 - 2 * t);
  };

  /** Multiplier so the studio panel can dial motion up or down. */
  const motionScale = () => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue('--motion'));
    return Number.isFinite(v) ? v : 1;
  };

  /* ---------------------------------------------------------------------
     Reveal: fade + lift, stagger and clip-path, via one observer.
     --------------------------------------------------------------------- */
  const revealTargets = new Set();

  const resolveReveal = (el) => {
    el.classList.add('is-in');
    revealTargets.delete(el);
    if (!revealTargets.size) revealObserver?.disconnect();
  };

  let revealObserver = null;

  if ('IntersectionObserver' in window && !reduced.matches) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            resolveReveal(entry.target);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );
  }

  const observeReveal = (el, delay) => {
    if (delay != null) el.style.setProperty('--reveal-delay', `${delay}ms`);
    if (!revealObserver) {
      el.classList.add('is-in');
      return;
    }
    revealTargets.add(el);
    revealObserver.observe(el);
  };

  const registerReveals = (scope = document) => {
    scope.querySelectorAll('[data-reveal], [data-clip], [data-clip-x]').forEach((el) => {
      const kind = el.dataset.reveal;
      if (kind === 'left') el.style.setProperty('--reveal-x', '-34px');
      if (kind === 'right') el.style.setProperty('--reveal-x', '34px');
      observeReveal(el, el.dataset.delay ? Number(el.dataset.delay) : undefined);
    });

    scope.querySelectorAll('[data-stagger]').forEach((group) => {
      const step = Number(group.dataset.stagger) || 70;
      const base = Number(group.dataset.delay) || 0;
      // Children are observed individually — a wrapper whose children are all
      // transparent still reports itself as intersecting, but observing it
      // would reveal the group before it is actually on screen.
      Array.from(group.children).forEach((child, i) => {
        observeReveal(child, base + i * step);
      });
    });
  };

  /* ---------------------------------------------------------------------
     Count-up for hero metrics.
     --------------------------------------------------------------------- */
  const runCount = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.countSuffix || '';
    const dur = reduced.matches ? 0 : 1100;
    const t0 = performance.now();

    const step = (now) => {
      const t = dur ? clamp((now - t0) / dur) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  let countObserver = null;
  if ('IntersectionObserver' in window) {
    countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
  }

  const registerCounts = (scope = document) => {
    scope.querySelectorAll('[data-count]').forEach((el) => {
      if (countObserver && !reduced.matches) countObserver.observe(el);
      else el.textContent = `${el.dataset.count}${el.dataset.countSuffix || ''}`;
    });
  };

  /* ---------------------------------------------------------------------
     Scroll-driven layer: scrub, parallax, pin, progress.
     --------------------------------------------------------------------- */
  const scrubEls = [];
  const parallaxEls = [];
  const pinEls = [];

  const registerScrollWork = (scope = document) => {
    scope.querySelectorAll('[data-scrub]').forEach((el) => {
      if (scrubEls.some((r) => r.el === el)) return;
      scrubEls.push({
        el,
        y: Number(el.dataset.scrubY) || 0,
        s: Number(el.dataset.scrubS) || 0,
        o: el.dataset.scrubO != null ? Number(el.dataset.scrubO) : 1,
      });
    });

    scope.querySelectorAll('[data-parallax]').forEach((el) => {
      if (parallaxEls.some((r) => r.el === el)) return;
      parallaxEls.push({ el, f: Number(el.dataset.parallax) || 0.15, cur: 0 });
    });

    scope.querySelectorAll('[data-pin]').forEach((el) => {
      if (pinEls.some((r) => r.el === el)) return;
      pinEls.push({
        el,
        layers: Array.from(el.querySelectorAll('[data-pin-layer]')),
        ticks: Array.from(el.querySelectorAll('[data-pin-tick]')),
        active: -1,
      });
    });
  };

  const measure = (rec, vh) => {
    const r = rec.el.getBoundingClientRect();
    rec.top = r.top;
    rec.height = r.height;
    rec.center = r.top + r.height / 2;
    rec.vh = vh;
  };

  const progressOf = (rec) => {
    // 0 → element's top just entered the viewport bottom
    // 1 → element's bottom just left the viewport top
    const span = rec.vh + rec.height;
    if (span <= 0) return 0.5;
    return clamp((rec.vh - rec.top) / span);
  };

  let vh = window.innerHeight;
  let lastScroll = -1;
  let needsMeasure = true;
  let progressEl = null;

  const tick = () => {
    const scale = motionScale();
    const y = window.scrollY || window.pageYOffset;

    if (progressEl) {
      const max = document.documentElement.scrollHeight - vh;
      root.style.setProperty('--page-progress', max > 0 ? clamp(y / max).toFixed(4) : '0');
    }

    const still = reduced.matches || scale === 0;

    if (!still && (y !== lastScroll || needsMeasure)) {
      lastScroll = y;

      if (needsMeasure) {
        scrubEls.forEach((r) => measure(r, vh));
        parallaxEls.forEach((r) => measure(r, vh));
        pinEls.forEach((r) => {
          measure(r, vh);
          r.span = Math.max(1, r.height - vh);
        });
        needsMeasure = false;
      } else {
        // Keep geometry fresh without re-reading every frame: cheap deltas.
        const dy = y - (tick._y ?? y);
        scrubEls.forEach((r) => { r.top -= dy; r.center -= dy; });
        parallaxEls.forEach((r) => { r.top -= dy; r.center -= dy; });
        pinEls.forEach((r) => { r.top -= dy; r.center -= dy; });
      }
      tick._y = y;

      scrubEls.forEach((r) => {
        const p = progressOf(r);
        const signed = p * 2 - 1;
        r.el.style.setProperty('--scrub-y', `${(-signed * r.y * scale).toFixed(2)}px`);
        if (r.s) r.el.style.setProperty('--scrub-s', (1 + (p - 0.5) * r.s * scale).toFixed(4));
        if (r.o < 1) {
          const edge = Math.min(smoothstep(0, 0.24, p), smoothstep(1, 0.76, p));
          r.el.style.setProperty('--scrub-o', (r.o + (1 - r.o) * edge).toFixed(3));
        }
      });

      parallaxEls.forEach((r) => {
        const offset = (r.center - vh / 2) * -r.f * scale;
        r.cur = lerp(r.cur, offset, 0.14);
        r.el.style.setProperty('--par-y', `${r.cur.toFixed(2)}px`);
      });

      pinEls.forEach((r) => {
        const p = clamp((y - r.top) / r.span);
        const n = r.layers.length;
        if (!n) return;
        const idx = Math.min(n - 1, Math.floor(p * n));
        if (idx === r.active) return;
        r.active = idx;
        r.layers.forEach((layer, i) => {
          layer.classList.toggle('is-active', i === idx);
          layer.classList.toggle('is-past', i < idx);
        });
        r.ticks.forEach((tk, i) => {
          tk.classList.toggle('is-active', i === idx);
          tk.classList.toggle('is-past', i < idx);
        });
      });
    }

    requestAnimationFrame(tick);
  };

  const onResize = () => {
    vh = window.innerHeight;
    needsMeasure = true;
    tick._y = undefined;
  };

  /* ---------------------------------------------------------------------
     3D tilt — glass panes lean toward the pointer.
     --------------------------------------------------------------------- */
  const bindTilt = (el) => {
    const max = Number(el.dataset.tilt) || 7;
    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };

    const render = () => {
      cur.x = lerp(cur.x, target.x, 0.16);
      cur.y = lerp(cur.y, target.y, 0.16);
      el.style.transform =
        `perspective(1100px) rotateX(${cur.y.toFixed(3)}deg) rotateY(${cur.x.toFixed(3)}deg)`;
      if (Math.abs(cur.x - target.x) > 0.01 || Math.abs(cur.y - target.y) > 0.01) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    const kick = () => { if (!raf) raf = requestAnimationFrame(render); };

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      target = { x: px * max * 2, y: -py * max * 2 };
      kick();
    });

    el.addEventListener('pointerleave', () => {
      target = { x: 0, y: 0 };
      kick();
    });
  };

  /* ---------------------------------------------------------------------
     Magnetic hover — buttons lean toward the cursor, then spring back.
     --------------------------------------------------------------------- */
  const bindMagnetic = (el) => {
    const pull = Number(el.dataset.magnetic) || 12;
    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };

    const render = () => {
      cur.x = lerp(cur.x, target.x, 0.2);
      cur.y = lerp(cur.y, target.y, 0.2);
      el.style.setProperty('--mag-x', `${cur.x.toFixed(2)}px`);
      el.style.setProperty('--mag-y', `${cur.y.toFixed(2)}px`);
      if (Math.abs(cur.x - target.x) > 0.05 || Math.abs(cur.y - target.y) > 0.05) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      target = {
        x: ((e.clientX - r.left) / r.width - 0.5) * pull * 2,
        y: ((e.clientY - r.top) / r.height - 0.5) * pull,
      };
      if (!raf) raf = requestAnimationFrame(render);
    });

    el.addEventListener('pointerleave', () => {
      target = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(render);
    });
  };

  /* ---------------------------------------------------------------------
     Press + spring — every pressable surface compresses on contact.
     --------------------------------------------------------------------- */
  const bindPress = () => {
    const selector = '.btn, .opt, .icon-btn, .chip, .route, .swatch, .seg__btn, .nav__link, .mailto, [data-press]';

    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest(selector);
      if (el) el.classList.add('is-pressed');
    }, { passive: true });

    const release = () => {
      document.querySelectorAll(`${selector}.is-pressed`).forEach((el) => {
        el.classList.remove('is-pressed');
      });
    };

    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    document.addEventListener('pointerleave', release, { passive: true });
  };

  /* ---------------------------------------------------------------------
     Cursor spotlight — a soft light that tracks the pointer.
     --------------------------------------------------------------------- */
  const bindSpotlight = (el) => {
    let raf = 0;
    let target = { x: vh ? window.innerWidth / 2 : 0, y: 0 };
    let cur = { ...target };

    const render = () => {
      cur.x = lerp(cur.x, target.x, 0.09);
      cur.y = lerp(cur.y, target.y, 0.09);
      el.style.transform = `translate3d(${cur.x - 280}px, ${cur.y - 280}px, 0)`;
      raf = Math.abs(cur.x - target.x) > 0.5 || Math.abs(cur.y - target.y) > 0.5
        ? requestAnimationFrame(render)
        : 0;
    };

    window.addEventListener('pointermove', (e) => {
      target = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(render);
    }, { passive: true });
  };

  /* ---------------------------------------------------------------------
     Nav: condensed state + active chapter tracking.
     --------------------------------------------------------------------- */
  const bindNav = () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const stuck = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
    stuck();
    window.addEventListener('scroll', stuck, { passive: true });

    const links = Array.from(document.querySelectorAll('.nav__link[data-target]'));
    const sections = links
      .map((l) => document.getElementById(l.dataset.target))
      .filter(Boolean);

    if (!sections.length || !('IntersectionObserver' in window)) return;

    const active = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => {
            l.setAttribute('aria-current', String(l.dataset.target === entry.target.id));
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach((s) => active.observe(s));
  };

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  const init = () => {
    progressEl = document.querySelector('.progress');

    registerReveals();
    registerCounts();
    registerScrollWork();
    bindNav();
    bindPress();

    if (!reduced.matches && finePointer.matches) {
      document.querySelectorAll('[data-tilt]').forEach(bindTilt);
      document.querySelectorAll('[data-magnetic]').forEach(bindMagnetic);
      const spot = document.querySelector('.spotlight');
      if (spot) bindSpotlight(spot);
    }

    // Elements injected later (toasts, flow slides) can request the same setup.
    window.OHMotion = {
      register: (scope) => {
        registerReveals(scope);
        registerCounts(scope);
        registerScrollWork(scope);
        if (!reduced.matches && finePointer.matches) {
          scope.querySelectorAll('[data-tilt]').forEach(bindTilt);
        }
        needsMeasure = true;
      },
      remeasure: () => { needsMeasure = true; },
    };

    if (document.readyState === 'complete') onResize();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    // Late-loading images change geometry; re-measure once they land.
    window.addEventListener('load', () => { needsMeasure = true; });

    requestAnimationFrame(() => {
      requestAnimationFrame(tick);
    });

    reduced.addEventListener?.('change', () => {
      needsMeasure = true;
      if (reduced.matches) {
        revealTargets.forEach((el) => el.classList.add('is-in'));
        revealTargets.clear();
        document.querySelectorAll('[data-scrub]').forEach((el) => {
          el.style.removeProperty('--scrub-y');
          el.style.removeProperty('--scrub-s');
          el.style.removeProperty('--scrub-o');
        });
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
