/* ==========================================================================
   app.js — interactive behaviour.

     · Contact flow: a four-step option picker that ends in a real handoff
     · Mobile chapter sheet, toasts, year stamping
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    bindSheet();
    bindFlow();
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
        .querySelectorAll('[data-reveal], [data-fade], [data-clip], [data-clip-x], [data-stagger] > *')
        .forEach((el) => el.classList.add('is-in'));
    }, 400);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
