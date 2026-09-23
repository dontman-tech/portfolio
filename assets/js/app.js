/* ==========================================================================
   app.js — interactive behaviour.

     · Contact flow: a four-step option picker that ends in a real handoff
     · Customisation studio: palette, glass density, background mode, motion,
       accent hue, site title and favicon — all persisted to localStorage
     · Mobile chapter sheet, toasts, year stamping
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------
     Persistence
     --------------------------------------------------------------------- */
  const KEY = 'oh.portfolio.prefs.v1';

  const readPrefs = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  };

  const writePrefs = (patch) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }));
    } catch {
      /* storage disabled — the site still works, just without memory */
    }
  };

  /* ---------------------------------------------------------------------
     Focus containment for overlays.

     `inert` keeps a closed overlay out of the tab order, but it does nothing
     while the overlay is open. These helpers cycle Tab within the open
     container so keyboard users cannot wander into the page behind it.
     --------------------------------------------------------------------- */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const focusablesIn = (host) =>
    $$(FOCUSABLE, host).filter((el) => {
      if (el.hasAttribute('inert') || el.closest('[inert]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      return el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0;
    });

  // The browser applies an `inert` removal asynchronously — roughly two frames
  // later — and a focus() call before that lands is silently refused. Retry
  // across frames until the element actually holds focus.
  const focusNow = (el, tries = 5) => {
    if (!el) return;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el && tries > 0) {
      requestAnimationFrame(() => focusNow(el, tries - 1));
    }
  };

  const trapFocus = (host, e) => {
    if (e.key !== 'Tab') return;
    const items = focusablesIn(host);
    const active = document.activeElement;

    // The panel's controls are mid-transition for a frame or two after it
    // opens, so the focusable list can briefly be empty. Swallow the Tab
    // instead of letting the default action leave the dialog.
    if (!items.length) {
      if (!host.contains(active)) e.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    // Focus can still be on the opener for a frame or two after the panel
    // opens (removing `inert` is asynchronous). Pull it inside rather than
    // letting the tab order wander off into the page behind the dialog.
    if (!host.contains(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
  const toastHost = $('.toasts');

  const toast = (message, kind = 'ok') => {
    if (!toastHost) return;
    const el = document.createElement('div');
    el.className = `toast glass toast--${kind}`;
    el.setAttribute('role', 'status');
    el.textContent = message;
    toastHost.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 4200);
  };

  /* ---------------------------------------------------------------------
     Mobile chapter sheet
     --------------------------------------------------------------------- */
  const bindSheet = () => {
    const sheet = $('.sheet');
    const toggle = $('[data-sheet-open]');
    const close = $('[data-sheet-close]');
    if (!sheet || !toggle) return;

    const setOpen = (open) => {
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', String(!open));
      // `inert` (not just aria-hidden) is what actually removes the closed
      // overlay's controls from the tab order.
      sheet.toggleAttribute('inert', !open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
      if (open) requestAnimationFrame(() => focusNow($('.sheet__link', sheet)));
      else toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(!sheet.classList.contains('is-open')));
    close?.addEventListener('click', () => setOpen(false));
    $$('.sheet__link', sheet).forEach((l) => l.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (!sheet.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      trapFocus(sheet, e);
    });
  };

  /* ---------------------------------------------------------------------
     Contact flow — slides, not a form.
     --------------------------------------------------------------------- */
  const FLOW_KEYS = ['intent', 'context', 'shape', 'contact'];

  const bindFlow = () => {
    const flow = $('[data-flow]');
    if (!flow) return;

    const slides = $$('[data-flow-slide]', flow);
    const steps = $$('.flow__step', flow);
    const backBtn = $('[data-flow-back]', flow);
    const recapHost = $('[data-flow-recap]', flow);
    const mailLink = $('[data-flow-mail]', flow);
    const mailBody = $('[data-flow-mailbody]', flow);
    const copyBtn = $('[data-flow-copy]', flow);

    const answers = {};
    let index = 0;

    // `moveFocus` is false for the initial render: stealing focus on page load
    // would make the first Tab stop a contact option instead of the skip link,
    // which breaks keyboard orientation before the visitor has scrolled here.
    const render = (next, moveFocus = true) => {
      index = Math.max(0, Math.min(slides.length - 1, next));

      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
        slide.classList.toggle('is-back', i < index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });

      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === index);
        s.classList.toggle('is-done', i < index);
      });

      if (backBtn) backBtn.hidden = index === 0;

      const live = $('[data-flow-live]', flow);
      if (live) {
        live.textContent = `Step ${index + 1} of ${slides.length}: ${FLOW_KEYS[index]}`;
      }

      if (index === slides.length - 1) buildRecap();

      if (!moveFocus || reduced.matches) return;
      const focusTarget = slides[index].querySelector('.opt, .btn');
      if (focusTarget) {
        setTimeout(() => focusTarget.focus({ preventScroll: true }), 340);
      }
    };

    // One source of truth for the message text, so the mailto body and the
    // "copy the brief" button can never drift apart.
    const buildBrief = () =>
      [
        'Hi Tamif,',
        '',
        `I'm reaching out about: ${answers.intent || '—'}`,
        answers.context ? `Context: ${answers.context}` : '',
        answers.shape ? `Preferred format: ${answers.shape}` : '',
        answers.contact ? `You can reply to: ${answers.contact}` : '',
        '',
        'Thanks,',
      ]
        .filter(Boolean)
        .join('\n');

    const buildRecap = () => {
      if (!recapHost) return;
      const rows = [
        ['Reason', answers.intent],
        ['Context', answers.context],
        ['Format', answers.shape],
        ['Reply to', answers.contact || 'your reply'],
      ].filter(([, v]) => v);

      recapHost.innerHTML = rows
        .map(
          ([k, v]) =>
            `<div class="recap__row"><span class="recap__k">${k}</span><span class="recap__v">${v}</span></div>`
        )
        .join('');

      const subject = `Portfolio enquiry — ${answers.intent || 'hello'}`;
      const body = buildBrief();
      const mail = `mailto:${mailLink?.dataset.mailTo || ''}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

      if (mailLink) mailLink.href = mail;
      if (mailBody) mailBody.textContent = `${answers.intent || '—'} · ${answers.shape || '—'}`;
      flow.dataset.mailto = mail;
    };

    flow.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-flow-opt]');
      if (opt) {
        const key = opt.dataset.flowKey;
        const value = opt.dataset.flowValue || opt.textContent.trim();

        answers[key] = value;
        writePrefs({ lastIntent: value });

        $$(`[data-flow-key="${key}"]`, flow).forEach((o) => {
          const chosen = o === opt;
          o.classList.toggle('is-chosen', chosen);
          o.setAttribute('aria-pressed', String(chosen));
        });

        const delay = reduced.matches ? 0 : 260;
        setTimeout(() => render(index + 1), delay);
        return;
      }

      if (e.target.closest('[data-flow-back]')) {
        render(index - 1);
        return;
      }
    });

    copyBtn?.addEventListener('click', async () => {
      const text = buildBrief();

      try {
        await navigator.clipboard.writeText(text);
        toast('Brief copied — paste it anywhere.');
      } catch {
        toast('Clipboard blocked by the browser. Use the email button instead.', 'warn');
      }
    });

    // Keyboard: arrows move between slides.
    flow.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') render(index + 1);
      if (e.key === 'ArrowLeft') render(index - 1);
    });

    render(0, false);
  };

  /* ---------------------------------------------------------------------
     Customisation studio
     --------------------------------------------------------------------- */
  const DEFAULT_TITLE = document.title;

  const applyPrefs = (prefs) => {
    if (prefs.palette) {
      root.dataset.palette = prefs.palette;
      $$('[data-palette-btn]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.paletteBtn === prefs.palette))
      );
    }
    if (prefs.glass) {
      root.dataset.glass = prefs.glass;
      $$('[data-glass-btn]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.glassBtn === prefs.glass))
      );
    }
    if (prefs.bg) {
      root.dataset.bg = prefs.bg;
      $$('[data-bg-btn]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.bgBtn === prefs.bg))
      );
    }
    if (prefs.motion != null) {
      root.style.setProperty('--motion', String(prefs.motion));
      const range = $('[data-motion-range]');
      if (range) range.value = String(prefs.motion);
      const out = $('[data-motion-out]');
      if (out) out.textContent = `${Math.round(prefs.motion * 100)}%`;
    }
    if (prefs.hue) {
      root.style.setProperty('--hue-shift', `${prefs.hue}deg`);
      const hueRange = $('[data-hue-range]');
      if (hueRange) hueRange.value = String(prefs.hue);
      const hueOut = $('[data-hue-out]');
      if (hueOut) hueOut.textContent = `${prefs.hue}°`;
    }
    if (prefs.title) {
      document.title = prefs.title;
      const titleInput = $('[data-title-input]');
      if (titleInput) titleInput.value = prefs.title;
      const titleOut = $('[data-title-out]');
      if (titleOut) titleOut.textContent = prefs.title;
    }
    if (prefs.favicon) {
      setFavicon(prefs.favicon);
      $$('[data-favicon-btn]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.faviconBtn === prefs.favicon))
      );
    }
    if (prefs.spotlight === false) {
      const spot = $('.spotlight');
      if (spot) spot.hidden = true;
    }
  };

  /* ---------------------------------------------------------------------
     Favicon: generated at runtime so it can be re-coloured on demand.
     --------------------------------------------------------------------- */
  const FAVICONS = {
    monogram: (c1, c2) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="64" height="64" rx="16" fill="url(#g)"/>
        <text x="32" y="45" font-family="Sora,Segoe UI,sans-serif" font-size="38"
          font-weight="700" fill="#08101c" text-anchor="middle">T</text>
      </svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
    glass: (c1, c2) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="64" height="64" rx="16" fill="#0b101a"/>
        <rect x="6" y="6" width="52" height="52" rx="13" fill="url(#g)" opacity=".22"/>
        <rect x="6" y="6" width="52" height="52" rx="13" fill="none" stroke="url(#g)" stroke-width="3"/>
        <path d="M20 42 L32 20 L44 42" fill="none" stroke="url(#g)" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
    orbit: (c1, c2) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="64" height="64" rx="16" fill="#0b101a"/>
        <circle cx="32" cy="32" r="9" fill="url(#g)"/>
        <ellipse cx="32" cy="32" rx="24" ry="11" fill="none" stroke="url(#g)"
          stroke-width="3" transform="rotate(-28 32 32)"/>
        <circle cx="50" cy="22" r="4.5" fill="${c2}"/>
      </svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
  };

  const setFavicon = (name) => {
    const style = getComputedStyle(root);
    const c1 = style.getPropertyValue('--accent').trim() || '#6ea8ff';
    const c2 = style.getPropertyValue('--accent-2').trim() || '#7bf1d9';
    const build = FAVICONS[name] || FAVICONS.monogram;
    const href = build(c1, c2);

    $$('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      if (link.dataset.keep) return;
      link.href = href;
    });
    const svgIcon = $('link[rel="icon"][type="image/svg+xml"]');
    if (svgIcon) svgIcon.href = href;
  };

  const bindStudio = () => {
    const studio = $('.studio');
    const openers = $$('[data-studio-open]');
    const close = $('[data-studio-close]');
    if (!studio) return;
    let lastFocus = null;

    const setOpen = (open) => {
      studio.classList.toggle('is-open', open);
      studio.setAttribute('aria-hidden', String(!open));
      studio.toggleAttribute('inert', !open);
      openers.forEach((o) => o.setAttribute('aria-expanded', String(open)));
      document.body.classList.toggle('is-locked', open);
      if (open) {
        lastFocus = document.activeElement;
        // The click that opened this panel focuses its own button as a default
        // action, which runs after this handler — so defer our focus a frame.
        requestAnimationFrame(() => focusNow($('button, input', studio)));
      } else if (lastFocus && document.contains(lastFocus)) {
        lastFocus.focus();
      }
    };

    openers.forEach((o) => o.addEventListener('click', () => setOpen(!studio.classList.contains('is-open'))));
    close?.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => {
      if (!studio.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      trapFocus(studio, e);
    });

    studio.addEventListener('click', (e) => {
      const palette = e.target.closest('[data-palette-btn]');
      if (palette) {
        root.dataset.palette = palette.dataset.paletteBtn;
        $$('[data-palette-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b === palette)));
        writePrefs({ palette: palette.dataset.paletteBtn });
        // Accent colours feed the runtime favicon, so rebuild it.
        setFavicon(root.dataset.faviconName || readPrefs().favicon || 'monogram');
        toast(`Palette: ${palette.dataset.paletteName || palette.dataset.paletteBtn}`);
        return;
      }

      const glass = e.target.closest('[data-glass-btn]');
      if (glass) {
        root.dataset.glass = glass.dataset.glassBtn;
        $$('[data-glass-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b === glass)));
        writePrefs({ glass: glass.dataset.glassBtn });
        return;
      }

      const bg = e.target.closest('[data-bg-btn]');
      if (bg) {
        root.dataset.bg = bg.dataset.bgBtn;
        $$('[data-bg-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b === bg)));
        writePrefs({ bg: bg.dataset.bgBtn });
        return;
      }

      const fav = e.target.closest('[data-favicon-btn]');
      if (fav) {
        root.dataset.faviconName = fav.dataset.faviconBtn;
        $$('[data-favicon-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b === fav)));
        setFavicon(fav.dataset.faviconBtn);
        writePrefs({ favicon: fav.dataset.faviconBtn });
        toast('Favicon updated in the browser tab.');
        return;
      }

      if (e.target.closest('[data-reset]')) {
        try { localStorage.removeItem(KEY); } catch { /* ignore */ }
        root.removeAttribute('data-palette');
        root.removeAttribute('data-glass');
        root.removeAttribute('data-bg');
        root.style.removeProperty('--motion');
        root.style.removeProperty('--hue-shift');
        document.title = DEFAULT_TITLE;
        const ti = $('[data-title-input]');
        if (ti) ti.value = DEFAULT_TITLE;
        const to = $('[data-title-out]');
        if (to) to.textContent = DEFAULT_TITLE;
        setFavicon('monogram');
        toast('Studio reset to defaults.');
      }
    });

    const motionRange = $('[data-motion-range]');
    motionRange?.addEventListener('input', () => {
      const v = Number(motionRange.value);
      root.style.setProperty('--motion', String(v));
      const out = $('[data-motion-out]');
      if (out) out.textContent = `${Math.round(v * 100)}%`;
      writePrefs({ motion: v });
      window.OHMotion?.remeasure();
    });

    const hueRange = $('[data-hue-range]');
    hueRange?.addEventListener('input', () => {
      const v = Number(hueRange.value);
      root.style.setProperty('--hue-shift', `${v}deg`);
      const out = $('[data-hue-out]');
      if (out) out.textContent = `${v}°`;
      writePrefs({ hue: v });
      const bgs = $$('.bg__blob');
      bgs.forEach((b) => { b.style.filter = `blur(70px) hue-rotate(${v}deg)`; });
    });

    const titleInput = $('[data-title-input]');
    titleInput?.addEventListener('input', () => {
      const v = titleInput.value.trim() || DEFAULT_TITLE;
      document.title = v;
      const out = $('[data-title-out]');
      if (out) out.textContent = v;
      writePrefs({ title: v });
    });

    const spotToggle = $('[data-spotlight-toggle]');
    spotToggle?.addEventListener('change', () => {
      const spot = $('.spotlight');
      if (spot) spot.hidden = !spotToggle.checked;
      writePrefs({ spotlight: spotToggle.checked });
    });
  };

  /* ---------------------------------------------------------------------
     Misc
     --------------------------------------------------------------------- */
  const bindMisc = () => {
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

    // Chapter sheet links: stagger index for the cascade.
    $$('.sheet__link').forEach((l, i) => l.style.setProperty('--i', String(i)));

    // Resume download feedback.
    $$('[data-resume]').forEach((a) => {
      a.addEventListener('click', () => toast('Resume download starting…'));
    });
  };

  const init = () => {
    applyPrefs(readPrefs());
    bindSheet();
    bindFlow();
    bindStudio();
    bindMisc();
    revealFallback();
  };

  // motion.js owns the reveal animations. If it fails to load or throws, its
  // observer never marks anything visible and the page would stay blank, so
  // force everything in once it's clear the engine never showed up.
  const revealFallback = () => {
    setTimeout(() => {
      if (window.OHMotion) return;
      document
        .querySelectorAll('[data-reveal], [data-clip], [data-clip-x], [data-stagger] > *')
        .forEach((el) => el.classList.add('is-in'));
    }, 400);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
