/* ==========================================================================
   Sky-Myce — motion system
   --------------------------------------------------------------------------
   One engine for every animation on the site. All effects degrade to static
   presentation when the user prefers reduced motion.

   Declarative hooks:
     [data-reveal]                 fade/slide in on scroll (variants: up,
                                   left, right, scale, blur via data-reveal)
     [data-reveal-delay="120"]     per-element delay in ms
     [data-reveal-stagger]         container: children revealed in sequence
     [data-count="12345"]          number counts up when revealed
     [data-count-format]           number | coins | compact
     [data-tilt="6"]               pointer tilt in degrees
     [data-spotlight]              cursor-follow glow (sets --mx / --my)
     [data-parallax="0.12"]        scroll parallax speed
     [data-marquee]                seamless looping ticker

   Exposes: window.SkyMotion
   ========================================================================== */

(() => {
  'use strict';

  const { qs, qsa, el } = window.Sky;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ------------------------------------------------------------- reveals */

  let observer = null;

  function revealTargets(root) {
    return qsa('[data-reveal]', root).filter((node) => !node.classList.contains('is-visible'));
  }

  function applyStagger(root) {
    qsa('[data-reveal-stagger]', root).forEach((container) => {
      if (container.dataset.staggerReady === 'true') return;
      Array.from(container.children).forEach((child, index) => {
        if (child.hasAttribute('data-reveal')) {
          child.style.setProperty('--reveal-delay', `${Math.min(index * 70, 560)}ms`);
        }
      });
      container.dataset.staggerReady = 'true';
    });
  }

  function show(target) {
    target.classList.add('is-visible');
    const countTarget = target.matches('[data-count]') ? target : qs('[data-count]', target);
    if (countTarget) countUp(countTarget);
  }

  function scan(root = document) {
    applyStagger(root);
    const targets = revealTargets(root);
    if (!targets.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((target) => show(target));
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }

    targets.forEach((target) => observer.observe(target));
  }

  /* ------------------------------------------------------------- counters */

  const countFormat = {
    number: (value) => window.Sky.formatNumber(value),
    compact: (value) => window.Sky.formatCompact(value),
    coins: (value) => window.Sky.formatCoins(value),
    raw: (value) => String(Math.round(value))
  };

  function countUp(target) {
    if (target.dataset.counted === 'true') return;
    target.dataset.counted = 'true';
    countTo(target, Number(target.dataset.count || target.textContent || 0), countFormat[target.dataset.countFormat || 'number']);
  }

  function countTo(target, value, formatter = countFormat.number, duration = 900) {
    const end = Number(value) || 0;
    const format = formatter || countFormat.number;
    if (reduced || end === 0) {
      target.textContent = format(end);
      return;
    }
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      target.textContent = format(from + (end - from) * eased);
      if (progress < 1) requestAnimationFrame(frame);
      else target.textContent = format(end);
    }
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------------- tilt */

  function initTilt(root = document) {
    if (reduced || coarse || !canHover) return;
    qsa('[data-tilt]', root).forEach((node) => {
      if (node.dataset.tiltReady === 'true') return;
      node.dataset.tiltReady = 'true';
      const max = Number(node.dataset.tilt) || 6;

      node.addEventListener('pointermove', (event) => {
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        node.style.setProperty('--tilt-x', `${(-y * max).toFixed(2)}deg`);
        node.style.setProperty('--tilt-y', `${(x * max).toFixed(2)}deg`);
      });

      node.addEventListener('pointerleave', () => {
        node.style.setProperty('--tilt-x', '0deg');
        node.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------ spotlight */

  function initSpotlight(root = document) {
    if (reduced || coarse) return;
    qsa('[data-spotlight]', root).forEach((node) => {
      if (node.dataset.spotlightReady === 'true') return;
      node.dataset.spotlightReady = 'true';
      node.addEventListener('pointermove', (event) => {
        const rect = node.getBoundingClientRect();
        node.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
        node.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
      });
    });
  }

  /* ------------------------------------------------------------- parallax */

  let parallaxNodes = [];
  let ticking = false;

  function initParallax(root = document) {
    if (reduced) return;
    parallaxNodes = parallaxNodes.concat(qsa('[data-parallax]', root));
    onParallaxScroll();
  }

  function onParallaxScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const viewport = window.innerHeight;
      for (const node of parallaxNodes) {
        const speed = Number(node.dataset.parallax) || 0.1;
        const rect = node.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - viewport / 2;
        node.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
      }
    });
  }

  /* -------------------------------------------------------------- marquee */

  function initMarquee(root = document) {
    qsa('[data-marquee]', root).forEach((track) => {
      if (track.dataset.marqueeReady === 'true') return;
      track.dataset.marqueeReady = 'true';
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('data-marquee');
      track.parentElement.append(clone);
    });
  }

  /* ------------------------------------------------------- chrome & chrome */

  function initChrome() {
    const header = qs('#site-header') || qs('.site-header') || qs('.admin-top');
    const progress = qs('#scroll-progress');

    const navToggle = qs('#nav-toggle');
    const mobileMenu = qs('#mobile-menu');
    if (navToggle && mobileMenu) {
      function closeMenu() {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
        mobileMenu.hidden = true;
      }
      navToggle.addEventListener('click', () => {
        const open = navToggle.getAttribute('aria-expanded') === 'true';
        if (open) closeMenu();
        else {
          navToggle.setAttribute('aria-expanded', 'true');
          navToggle.setAttribute('aria-label', 'Close menu');
          mobileMenu.hidden = false;
        }
      });
      mobileMenu.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
      });
    }

    function onScroll() {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }
      onParallaxScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------- setup */

  function init(root = document) {
    scan(root);
    initTilt(root);
    initSpotlight(root);
    initParallax(root);
    initMarquee(root);
    initChrome();
  }

  window.SkyMotion = {
    reduced,
    coarse,
    init,
    scan,
    countTo,
    countFormat
  };
})();
