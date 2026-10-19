/* ==========================================================================
   Sky-Myce — player guide renderer
   --------------------------------------------------------------------------
   Renders window.SKYMYCE_GUIDE (see js/guide-content.js) into guide.html:
   table of contents, chapters, steps, rich text blocks, media slots with
   convention-based file loading, step progress tracking, search, and a
   lightbox.

   Media slots look for files in assets/guide/ by slug:
     image: <id>.png → .webp → .jpg → .jpeg → .gif
     video: <id>.mp4 → .webm  (poster: <id>.jpg → .png → .webp)
   Missing files render “capture pending” slots naming the expected path.
   ========================================================================== */

(() => {
  'use strict';

  const Sky = window.Sky;
  const { qs, qsa, el, escapeHtml } = Sky;

  const guide = window.SKYMYCE_GUIDE;
  if (!guide) return;

  const STORAGE_KEY = 'skymyce.guide.progress.v1';

  const ICONS = {
    download: '<path d="M8 2v8m0 0L4.8 6.8M8 10l3.2-3.2M2 12.5V13a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 13v-.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    dungeon: '<path d="M2.5 13.5v-5L8 4l5.5 4.5v5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 13.5v-3.4h3v3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    goldor: '<rect x="2.5" y="3" width="11" height="8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 14h5M8 11v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.5 6.5h2M9 6.5h1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    hud: '<rect x="2" y="3" width="12" height="10" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.6 5.6v2.2M7 5.6v4M9.4 5.6v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    community: '<circle cx="5.6" cy="6" r="2.1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10.6" cy="6.8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.6 13c.5-2 1.7-3 3-3s2.5 1 3 3M8.8 13c.4-1.4 1.2-2.2 2-2.2s1.6.7 2 2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    boards: '<path d="M3 13V8.5M8 13V3.5M13 13V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2 13.8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>',
    camera: '<rect x="2" y="4.6" width="12" height="8" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 4.6l1-1.6h2l1 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    book: '<path d="M3 3h4.2c.9 0 1.6.7 1.6 1.6V13c0-.9-.7-1.6-1.6-1.6H3V3zM13 3H8.8c-.9 0-1.6.7-1.6 1.6V13c0-.9.7-1.6 1.6-1.6H13V3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
  };

  const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'];
  const VIDEO_EXTENSIONS = ['mp4', 'webm'];
  const POSTER_EXTENSIONS = ['jpg', 'png', 'webp'];

  let lightbox;
  let progress = loadProgress();
  let activeStepObserver = null;

  /* -------------------------------------------------------------- progress */

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* private mode — progress just does not persist */
    }
  }

  const allSteps = guide.chapters.flatMap((chapter) => chapter.steps);

  function progressCounts(steps) {
    const done = steps.filter((step) => progress[step.id]).length;
    return { done, total: steps.length };
  }

  function refreshProgress() {
    const overall = progressCounts(allSteps);
    const fill = qs('#guide-progress-fill');
    const label = qs('#guide-progress-label');
    if (fill) fill.style.width = `${overall.total ? Math.round((overall.done / overall.total) * 100) : 0}%`;
    if (label) label.textContent = `${overall.done} of ${overall.total} steps done`;

    qsa('.guide-chapter').forEach((section) => {
      const chapter = guide.chapters.find((item) => item.id === section.dataset.chapter);
      if (!chapter) return;
      const counts = progressCounts(chapter.steps);
      const pill = qs('.chapter-progress', section);
      if (pill) {
        pill.textContent = counts.done === counts.total && counts.total > 0 ? 'Complete' : `${counts.done}/${counts.total}`;
        pill.classList.toggle('is-complete', counts.done === counts.total && counts.total > 0);
      }
    });

    const tocs = qsa('#guide-toc a[href^="#"]');
    tocs.forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      link.classList.toggle('is-done', Boolean(progress[id]));
    });
  }

  /* --------------------------------------------------------------- inline */

  function inline(text) {
    return escapeHtml(text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function renderBlocks(blocks) {
    const nodes = [];
    for (const block of blocks || []) {
      if (typeof block === 'string') {
        nodes.push(el('p', { html: inline(block) }));
      } else if (block.p) {
        nodes.push(el('p', { html: inline(block.p) }));
      } else if (block.ul) {
        nodes.push(el('ul', { class: 'guide-list' }, block.ul.map((item) => el('li', { html: inline(item) }))));
      } else if (block.ol) {
        nodes.push(el('ol', { class: 'guide-list' }, block.ol.map((item) => el('li', { html: inline(item) }))));
      } else if (block.code) {
        nodes.push(el('pre', { class: 'guide-code' }, el('code', { text: block.code })));
      } else if (block.callout) {
        const tone = ['tip', 'warn', 'info'].includes(block.callout.tone) ? block.callout.tone : 'info';
        nodes.push(el('aside', { class: `guide-callout callout-${tone}` }, [
          block.callout.title ? el('strong', { text: block.callout.title }) : null,
          el('span', { html: inline(block.callout.text || '') })
        ]));
      }
    }
    return nodes;
  }

  /* ----------------------------------------------------------------- media */

  function pathFor(id, extension) {
    return `assets/guide/${id}.${extension}`;
  }

  function placeholder(item, figure) {
    const expected = item.kind === 'video'
      ? `${pathFor(item.id || 'slug', 'mp4')}  ·  poster ${pathFor(item.id || 'slug', 'jpg')}`
      : pathFor(item.id || 'slug', 'png');
    figure.classList.add('is-pending');
    figure.innerHTML = '';
    figure.append(el('div', { class: 'media-pending' }, [
      el('span', { class: 'media-pending-icon', html: `<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">${ICONS.camera}</svg>` }),
      el('strong', { text: 'Capture pending' }),
      el('code', { text: expected }),
      el('span', { class: 'media-pending-hint', text: 'Drop the file in assets/guide/ — see assets/guide/README.md' })
    ]));
  }

  function mediaFrame(item) {
    const figure = el('figure', { class: 'guide-media' });
    const caption = item.caption ? el('figcaption', { html: inline(item.caption) }) : null;

    if (item.kind === 'video') {
      const posterCandidates = item.poster ? [item.poster] : item.id ? POSTER_EXTENSIONS.map((ext) => pathFor(item.id, ext)) : [];
      const video = el('video', {
        class: 'media-frame',
        controls: true,
        playsInline: true,
        preload: 'metadata',
        muted: false
      });
      if (posterCandidates.length) video.poster = posterCandidates[0];

      const sources = (item.src ? [item.src] : item.id ? VIDEO_EXTENSIONS.map((ext) => pathFor(item.id, ext)) : [])
        .map((src) => el('source', { src, type: src.endsWith('.webm') ? 'video/webm' : 'video/mp4' }));
      sources.forEach((source) => video.append(source));

      const lastSource = sources[sources.length - 1];
      const fail = () => placeholder(item, figure);
      if (lastSource) lastSource.addEventListener('error', fail);
      video.addEventListener('error', () => { if (!video.currentSrc) fail(); });

      video.addEventListener('loadeddata', () => figure.classList.add('is-loaded'), { once: true });

      figure.append(video);
      if (posterCandidates.length) {
        const probe = new Image();
        let posterIndex = 0;
        probe.onerror = () => {
          posterIndex += 1;
          if (posterIndex < posterCandidates.length) probe.src = posterCandidates[posterIndex];
          else video.removeAttribute('poster');
        };
        probe.src = posterCandidates[0];
      }
      if (caption) figure.append(caption);
      return figure;
    }

    const candidates = item.src ? [item.src] : item.id ? IMAGE_EXTENSIONS.map((ext) => pathFor(item.id, ext)) : [];
    const frame = el('button', { class: 'media-frame', type: 'button', 'aria-label': item.alt || item.caption || 'Open screenshot' });
    const img = el('img', { alt: item.alt || '', loading: 'lazy', decoding: 'async' });
    let index = 0;

    img.addEventListener('error', () => {
      index += 1;
      if (index < candidates.length) {
        img.src = candidates[index];
        return;
      }
      placeholder(item, figure);
    });

    img.addEventListener('load', () => figure.classList.add('is-loaded'));

    if (candidates.length) img.src = candidates[0];
    else placeholder(item, figure);

    frame.append(img);
    frame.addEventListener('click', () => {
      if (!figure.classList.contains('is-loaded')) return;
      openLightbox(img.currentSrc || img.src, item.caption || item.alt || '');
    });

    figure.append(frame);
    if (caption) figure.append(caption);
    return figure;
  }

  function openLightbox(src, caption) {
    if (!lightbox) return;
    qs('#guide-lightbox-img', lightbox).src = src;
    qs('#guide-lightbox-caption', lightbox).textContent = caption;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      lightbox.hidden = true;
      qs('#guide-lightbox-img', lightbox).src = '';
    }, 220);
  }

  /* ------------------------------------------------------------ rendering */

  function renderStep(step, chapter) {
    const article = el('article', {
      class: `guide-step${progress[step.id] ? ' is-done' : ''}`,
      id: step.id,
      dataset: { step: step.id, chapter: chapter.id, search: searchText(step) }
    });

    const head = el('div', { class: 'step-head' });
    const titleWrap = el('div', { class: 'step-title' }, [
      el('h3', { text: step.title }),
      step.shortcuts && step.shortcuts.length
        ? el('span', { class: 'step-shortcuts' }, step.shortcuts.map((key) => el('kbd', { text: key })))
        : null
    ]);
    const doneButton = el('button', {
      class: 'step-done',
      type: 'button',
      'aria-pressed': String(Boolean(progress[step.id])),
      onclick: () => toggleStep(step.id, article, doneButton)
    }, [
      el('span', { class: 'step-done-check', html: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.4l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el('span', { class: 'step-done-label', text: progress[step.id] ? 'Done' : 'Mark done' })
    ]);
    head.append(titleWrap, doneButton);

    const body = el('div', { class: 'step-body' }, renderBlocks(step.body));

    article.append(head, body);

    if (step.media && step.media.length) {
      article.append(el('div', { class: `guide-media-grid${step.media.length > 1 ? ' is-multi' : ''}` }, step.media.map(mediaFrame)));
    }

    if (step.links && step.links.length) {
      article.append(el('div', { class: 'step-links' }, step.links.map((link) =>
        el('a', { class: 'link-arrow', href: link.href, text: link.label }))));
    }

    return article;
  }

  function searchText(step) {
    const chunks = [step.title];
    for (const block of step.body || []) {
      if (typeof block === 'string') chunks.push(block);
      else if (block.p) chunks.push(block.p);
      else if (block.ul) chunks.push(block.ul.join(' '));
      else if (block.ol) chunks.push(block.ol.join(' '));
      else if (block.callout) chunks.push(block.callout.text || '');
      else if (block.code) chunks.push(block.code);
    }
    for (const media of step.media || []) if (media.caption) chunks.push(media.caption);
    return chunks.join(' ').toLowerCase();
  }

  function renderChapter(chapter) {
    const section = el('section', { class: 'guide-chapter', id: chapter.id, dataset: { chapter: chapter.id } });

    const head = el('header', { class: 'chapter-head' }, [
      el('span', { class: 'chapter-icon', html: `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">${ICONS[chapter.icon] || ICONS.book}</svg>` }),
      el('div', { class: 'chapter-title' }, [
        el('h2', { text: chapter.title }),
        el('p', { text: chapter.summary || '' })
      ]),
      el('span', { class: 'chapter-progress', text: '' })
    ]);

    const steps = el('div', { class: 'chapter-steps' });
    chapter.steps.forEach((step) => steps.append(renderStep(step, chapter)));

    section.append(head, steps);
    return section;
  }

  function renderToc() {
    const toc = qs('#guide-toc');
    if (!toc) return;
    toc.innerHTML = '';
    guide.chapters.forEach((chapter) => {
      const item = el('li', { class: 'toc-chapter' });
      item.append(el('a', { class: 'toc-link', href: `#${chapter.id}` }, [
        el('span', { class: 'toc-icon', html: `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">${ICONS[chapter.icon] || ICONS.book}</svg>` }),
        el('span', { text: chapter.title })
      ]));
      const sub = el('ul', { class: 'toc-steps' }, chapter.steps.map((step) =>
        el('li', {}, el('a', { href: `#${step.id}`, text: step.title }))));
      item.append(sub);
      toc.append(item);
    });
  }

  function toggleStep(id, article, button) {
    progress[id] = !progress[id];
    if (!progress[id]) delete progress[id];
    saveProgress();
    article.classList.toggle('is-done', Boolean(progress[id]));
    button.setAttribute('aria-pressed', String(Boolean(progress[id])));
    qs('.step-done-label', button).textContent = progress[id] ? 'Done' : 'Mark done';
    button.classList.remove('pop');
    void button.offsetWidth;
    button.classList.add('pop');
    refreshProgress();
  }

  /* ---------------------------------------------------------------- search */

  function bindSearch() {
    const input = qs('#guide-search');
    const empty = qs('#guide-empty');
    if (!input) return;

    const apply = Sky.debounce(() => {
      const query = input.value.trim().toLowerCase();
      let visibleTotal = 0;

      qsa('.guide-chapter').forEach((section) => {
        let visible = 0;
        qsa('.guide-step', section).forEach((stepEl) => {
          const match = !query || stepEl.dataset.search.includes(query);
          stepEl.classList.toggle('is-hidden', !match);
          if (match) visible += 1;
        });
        section.classList.toggle('is-hidden', visible === 0);
        visibleTotal += visible;
      });

      if (empty) empty.hidden = visibleTotal !== 0;
    }, 120);

    input.addEventListener('input', apply);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && input.value) {
        input.value = '';
        apply();
      }
    });
  }

  /* ------------------------------------------------------------- toc spy & */

  function bindTocSpy() {
    if (!('IntersectionObserver' in window)) return;
    const links = qsa('#guide-toc a[href^="#"]');
    const targets = qsa('.guide-step, .guide-chapter');
    if (activeStepObserver) activeStepObserver.disconnect();
    activeStepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          const active = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('is-current', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    targets.forEach((target) => activeStepObserver.observe(target));
  }

  function bindLightbox() {
    lightbox = qs('#guide-lightbox');
    if (!lightbox) return;
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox || event.target.closest('[data-lightbox-close]')) closeLightbox();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });
  }

  function bindHero() {
    const version = qs('#guide-version');
    const updated = qs('#guide-updated');
    const intro = qs('#guide-intro');
    if (version) version.textContent = `v${guide.version}`;
    if (updated) updated.textContent = `Updated ${guide.updated}`;
    if (intro) intro.textContent = guide.intro;
  }

  function highlightDeepLink() {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('guide-step')) return;
    target.classList.add('is-highlighted');
    window.setTimeout(() => target.classList.remove('is-highlighted'), 2400);
  }

  /* ---------------------------------------------------------------- start */

  function init() {
    const chaptersEl = qs('#guide-chapters');
    if (!chaptersEl) return;

    bindHero();
    renderToc();
    chaptersEl.innerHTML = '';
    guide.chapters.forEach((chapter) => chaptersEl.append(renderChapter(chapter)));

    bindSearch();
    bindTocSpy();
    bindLightbox();
    refreshProgress();
    highlightDeepLink();

    if (window.SkyMotion) window.SkyMotion.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
