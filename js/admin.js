/* ==========================================================================
   Sky-Myce — admin panel
   --------------------------------------------------------------------------
   A static admin SPA for the mod backend. Auth is Discord OAuth handled by
   the backend (cookie session); this page only renders and calls the admin
   endpoints documented in README.md.

   With no backend configured, the panel runs in preview mode against local
   mock data so every screen stays developable.

   ADDING A SECTION: add an object to the SECTIONS array at the bottom of
   this file — { id, label, icon, render(container, ctx) }. It shows up in
   the rail and in routing (#/id) automatically. Backend-defined modules
   appear under “Modules” without any site changes.

   Exposes: window.SkyAdmin
   ========================================================================== */

(() => {
  'use strict';

  const cfg = window.SKYMYCE;
  const Sky = window.Sky;
  const { qs, qsa, el, escapeHtml, formatNumber, formatRelative, formatDateTime, titleCase, hash, mulberry32, debounce } = Sky;

  const state = {
    session: null,
    preview: false,
    view: 'dashboard',
    moduleData: {}
  };

  const mock = {
    announcements: null,
    players: null,
    config: null,
    overview: null
  };

  /* --------------------------------------------------------------- icons */

  const ICONS = {
    dashboard: '<path d="M2.5 8.2L8 3l5.5 5.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7.4V13h8V7.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    news: '<rect x="2.5" y="3" width="11" height="10" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.8 5.8h6.4M4.8 8h6.4M4.8 10.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    users: '<circle cx="6" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.4 13.2c.5-2.2 2-3.4 3.6-3.4s3.1 1.2 3.6 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="11.6" cy="6.6" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.8 9.8c1.6 0 2.6 1 3 2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    sliders: '<path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="5" r="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10.5" cy="8" r="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="11" r="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    puzzle: '<path d="M6.2 2.8h1.6a1 1 0 0 1 1 1v.7h1.5a1 1 0 0 1 1 1v1.6h.6a1.1 1.1 0 0 1 0 2.2h-.6v1.9a1 1 0 0 1-1 1H8.8v-.6a1.1 1.1 0 0 0-2.2 0v.6H4.9a1 1 0 0 1-1-1V9.6h-.6a1.1 1.1 0 0 1 0-2.2h.6V5.5a1 1 0 0 1 1-1h1.3v-.7a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
    camera: '<rect x="2" y="4.6" width="12" height="8" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 4.6l1-1.6h2l1 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    shield: '<path d="M8 2l5 2v4c0 3-2 5.4-5 6.4C5 13.4 3 11 3 8V4l5-2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.8 8.2l1.5 1.5 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    logout: '<path d="M6.5 3H4.6A1.6 1.6 0 0 0 3 4.6v6.8A1.6 1.6 0 0 0 4.6 13h1.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 8h6.4m0 0L11 5.6M13.4 8L11 10.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.6V5h-2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    trash: '<path d="M3.5 4.5h9M6.5 4.5V3.4a.9.9 0 0 1 .9-.9h1.2a.9.9 0 0 1 .9.9v1.1M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M9.8 3.2l3 3L6.4 12.6l-3.4.4.4-3.4 6.4-6.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
  };

  function svg(name, size = 16) {
    return `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* --------------------------------------------------------------- toasts */

  function toast(message, { tone = 'info', timeout = 4200 } = {}) {
    const host = qs('#admin-toasts');
    const node = el('div', { class: `toast toast-${tone}`, role: 'status' }, [
      el('span', { class: 'toast-dot' }),
      el('span', { text: message })
    ]);
    host.append(node);
    requestAnimationFrame(() => node.classList.add('is-in'));
    window.setTimeout(() => {
      node.classList.remove('is-in');
      window.setTimeout(() => node.remove(), 260);
    }, timeout);
  }

  /* -------------------------------------------------------------- confirm */

  function confirmAction({ title, body, confirmLabel = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const overlay = qs('#admin-confirm');
      overlay.innerHTML = '';
      overlay.append(el('div', { class: 'confirm-card', role: 'alertdialog' }, [
        el('h3', { text: title }),
        el('p', { text: body }),
        el('div', { class: 'confirm-actions' }, [
          el('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancel', onclick: () => close(false) }),
          el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', text: confirmLabel, onclick: () => close(true) })
        ])
      ]));
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-open'));

      function close(result) {
        overlay.classList.remove('is-open');
        window.setTimeout(() => { overlay.hidden = true; overlay.innerHTML = ''; }, 180);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(event) {
        if (event.key === 'Escape') close(false);
      }
      document.addEventListener('keydown', onKey);
    });
  }

  /* ---------------------------------------------------------- mock backing */

  function mockAnnouncements() {
    if (!mock.announcements) mock.announcements = SkyDemo.announcements.map((item) => ({ ...item }));
    return mock.announcements;
  }

  function mockPlayers() {
    if (mock.players) return mock.players;
    mock.players = SkyDemo.players.map((name) => {
      const profile = SkyDemo.profile(name);
      const r = mulberry32(hash(`admin:${name}`));
      const status = r() > 0.94 ? 'banned' : r() > 0.86 ? 'paused' : 'active';
      return {
        name,
        uuid: '',
        status,
        firstSeen: profile.firstSeen,
        lastSeen: profile.lastSeen,
        sharing: profile.sharing,
        ranks: profile.ranks,
        badges: profile.badges,
        sampleCount: profile.sampleCount
      };
    });
    return mock.players;
  }

  function mockOverview() {
    if (!mock.overview) {
      const players = mockPlayers();
      mock.overview = {
        players: players.length * 837,
        banned: players.filter((player) => player.status === 'banned').length * 12,
        announcements: mockAnnouncements().length,
        pendingReports: 17,
        lastSyncAt: Date.now() - 1000 * 60 * 4
      };
    }
    return mock.overview;
  }

  function mockConfig() {
    if (!mock.config) {
      mock.config = {
        version: cfg.version,
        builds: { ...cfg.builds },
        links: { ...cfg.links },
        flags: { ...cfg.flags },
        boards: { ...cfg.boards }
      };
    }
    return mock.config;
  }

  /* ------------------------------------------------------------ view host */

  function renderView() {
    const host = qs('#admin-view');
    host.innerHTML = '';
    const section = SECTIONS.find((item) => item.id === state.view) || SECTIONS[0];
    qsa('#admin-nav [data-view]').forEach((button) => {
      const active = button.dataset.view === section.id;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const crumb = qs('#admin-crumb');
    if (crumb) crumb.textContent = section.label;
    section.render(host, { reload: renderView });
    if (window.SkyMotion) window.SkyMotion.scan(host);
  }

  function go(view) {
    state.view = view;
    const known = SECTIONS.some((section) => section.id === view);
    if (!known) state.view = 'dashboard';
    if (window.location.hash.slice(2) !== state.view) {
      window.history.replaceState(null, '', `#/${state.view}`);
    }
    renderView();
  }

  /* -------------------------------------------------------------- chrome */

  function setStatus(kind, text) {
    const node = qs('#admin-status');
    if (!node) return;
    node.dataset.state = kind;
    qs('#admin-status-label', node).textContent = text;
  }

  function renderUserChip() {
    const host = qs('#admin-user');
    host.innerHTML = '';
    if (state.preview || !state.session) {
      host.append(el('span', { class: 'chip chip-warn', text: 'Preview mode' }));
      return;
    }
    const session = state.session;
    host.append(el('div', { class: 'user-chip' }, [
      session.avatar
        ? el('img', { class: 'user-avatar', src: session.avatar, alt: '', width: 26, height: 26 })
        : el('span', { class: 'user-avatar user-avatar-fallback', text: Sky.initials(session.name) }),
      el('span', { class: 'user-name', text: session.name }),
      el('span', { class: 'user-role', text: session.role }),
      el('button', {
        class: 'btn btn-ghost btn-small', type: 'button',
        onclick: async () => {
          try {
            await SkyAPI.admin.logout();
          } catch { /* session may already be gone */ }
          window.location.reload();
        }
      }, [el('span', { html: svg('logout', 14) }), el('span', { text: 'Sign out' })])
    ]));
  }

  /* ------------------------------------------------------- gate & session */

  function showGate(reason) {
    const host = qs('#auth-gate');
    host.hidden = false;
    qs('#admin-shell').hidden = true;
    const body = qs('#auth-gate-body');
    body.innerHTML = '';

    if (reason === 'unconfigured') {
      body.append(
        el('h2', { text: 'Backend not configured' }),
        el('p', { text: 'Point the site at the mod backend before signing in. Set apiBase in js/config.js, then reload this page.' }),
        el('code', { class: 'gate-code', text: "apiBase: 'https://api.sky-myce.example'" })
      );
    } else if (reason === 'denied') {
      body.append(
        el('h2', { text: 'Access denied' }),
        el('p', { text: 'You signed in, but this account is missing the admin role on the backend.' })
      );
    } else {
      body.append(
        el('h2', { text: 'Sign in to continue' }),
        el('p', { text: 'Admin access uses Discord. The backend checks your roles and keeps the session in an httpOnly cookie.' })
      );
    }

    const actions = el('div', { class: 'gate-actions' });
    if (reason !== 'unconfigured') {
      actions.append(el('a', {
        class: 'btn btn-primary',
        href: SkyAPI.admin.loginUrl(window.location.href)
      }, [el('span', { html: svg('shield', 15) }), el('span', { text: 'Sign in with Discord' })]));
    }
    actions.append(el('button', {
      class: 'btn btn-ghost', type: 'button',
      onclick: () => enterPreview()
    }, [el('span', { text: 'Continue in preview mode' })]));

    body.append(actions);
    body.append(el('p', { class: 'gate-note', text: 'Preview mode simulates every screen with local data. Nothing is saved to the backend.' }));
  }

  function enterPreview() {
    state.preview = true;
    state.session = null;
    qs('#auth-gate').hidden = true;
    qs('#admin-shell').hidden = false;
    setStatus('preview', 'Preview data');
    renderUserChip();
    buildNav();
    go(state.view);
    toast('Preview mode — changes are not persisted.', { tone: 'warn' });
  }

  async function boot() {
    window.history.replaceState(null, '', `#/${state.view}`);
    if (!SkyAPI.isConfigured()) {
      showGate('unconfigured');
      return;
    }
    try {
      const session = await SkyAPI.admin.session();
      if (!session) {
        showGate('signin');
        return;
      }
      state.session = session;
      qs('#auth-gate').hidden = true;
      qs('#admin-shell').hidden = false;
      setStatus('live', `Connected · ${SkyAPI.base}`);
      renderUserChip();
      buildNav();
      go(state.view);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showGate('denied');
      } else {
        showGate('signin');
        toast(error.offline ? 'Backend unreachable — you can continue in preview mode.' : 'Session check failed.', { tone: 'warn' });
      }
    }
  }

  /* --------------------------------------------------------------- nav */

  function buildNav() {
    const nav = qs('#admin-nav');
    nav.innerHTML = '';
    SECTIONS.forEach((section) => {
      nav.append(el('button', {
        class: 'rail-link', type: 'button', dataset: { view: section.id },
        onclick: () => go(section.id)
      }, [
        el('span', { class: 'rail-icon', html: svg(section.icon, 15) }),
        el('span', { text: section.label })
      ]));
    });
    nav.append(el('div', { class: 'rail-foot' }, [
      el('a', { class: 'rail-back', href: 'index.html' }, [el('span', { text: '← Back to site' })])
    ]));
  }

  /* ----------------------------------------------------------------- data */

  async function withBackend(previewFn, liveFn, { label = 'Load' } = {}) {
    if (state.preview || !SkyAPI.isConfigured()) return previewFn();
    return liveFn();
  }

  /* ===================================================================== */
  /*  Sections                                                             */
  /* ===================================================================== */

  /* ---------------------------------------------------------- dashboard */

  function sectionDashboard(host, ctx) {
    const wrap = el('div', { class: 'panel-stack' });
    host.append(wrap);

    wrap.append(el('div', { class: 'panel-head' }, [
      el('div', {}, [
        el('h1', { text: 'Overview' }),
        el('p', { class: 'panel-sub', text: state.preview ? 'Simulated data — connect the backend for real numbers.' : 'Live from the mod backend.' })
      ]),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ctx.reload() },
        [el('span', { html: svg('refresh', 14) }), el('span', { text: 'Refresh' })])
    ]));

    const tiles = el('div', { class: 'tile-grid' });
    wrap.append(tiles);
    tiles.append(el('div', { class: 'tile tile-loading', text: 'Loading…' }));

    (async () => {
      let overview;
      try {
        overview = await withBackend(mockOverview, () => SkyAPI.admin.overview());
      } catch (error) {
        tiles.innerHTML = '';
        tiles.append(el('div', { class: 'tile tile-error', text: `Could not load overview: ${error.message}` }));
        return;
      }
      tiles.innerHTML = '';
      const items = [
        { label: 'Tracked players', value: overview.players, format: 'compact' },
        { label: 'Pending reports', value: overview.pendingReports, format: 'number' },
        { label: 'Announcements', value: overview.announcements, format: 'number' },
        { label: 'Banned', value: overview.banned, format: 'number' }
      ];
      items.forEach((item, index) => {
        const strong = el('strong', { text: '0' });
        tiles.append(el('div', { class: 'tile' }, [
          el('span', { class: 'tile-label', text: item.label }),
          strong,
          el('span', { class: 'tile-foot', text: index === 0 ? `synced ${formatRelative(overview.lastSyncAt)}` : '\u00a0' })
        ]));
        if (window.SkyMotion) window.SkyMotion.countTo(strong, item.value, window.SkyMotion.countFormat[item.format], 800 + index * 90);
      });
    })();

    /* guide capture checklist — derived from guide content, no backend needed */
    const guide = window.SKYMYCE_GUIDE;
    if (guide) {
      const slots = [];
      guide.chapters.forEach((chapter) => chapter.steps.forEach((step) => (step.media || []).forEach((media) => {
        if (media.pending) slots.push({ chapter: chapter.title, step: step.title, id: media.id, kind: media.kind });
      })));
      const checklist = el('section', { class: 'panel' }, [
        el('div', { class: 'panel-head' }, [
          el('div', {}, [
            el('h2', { text: 'Guide capture checklist' }),
            el('p', { class: 'panel-sub', text: `${slots.length} media slots are waiting for screenshots or clips.` })
          ]),
          el('a', { class: 'btn btn-ghost', href: 'guide.html', target: '_blank', rel: 'noopener' }, [el('span', { text: 'Open guide' })])
        ])
      ]);
      if (slots.length) {
        const list = el('ul', { class: 'checklist' });
        slots.forEach((slot) => {
          const file = slot.kind === 'video' ? `${slot.id}.mp4 + ${slot.id}.jpg` : `${slot.id}.png`;
          list.append(el('li', {}, [
            el('span', { class: 'checklist-kind', text: slot.kind === 'video' ? 'MP4' : 'PNG' }),
            el('span', { class: 'checklist-chapter', text: slot.chapter }),
            el('span', { class: 'checklist-step', text: slot.step }),
            el('code', { text: `assets/guide/${file}` })
          ]));
        });
        checklist.append(list);
      } else {
        checklist.append(el('p', { class: 'panel-sub', text: 'Every slot has media marked in.' }));
      }
      wrap.append(checklist);
    }
  }

  /* -------------------------------------------------------- announcements */

  function sectionAnnouncements(host, ctx) {
    const wrap = el('div', { class: 'panel-stack' });
    host.append(wrap);

    const listPanel = el('section', { class: 'panel' });
    wrap.append(el('div', { class: 'panel-head' }, [
      el('div', {}, [
        el('h1', { text: 'Announcements' }),
        el('p', { class: 'panel-sub', text: 'Shown on the homepage and pushed to mod users on next sync.' })
      ]),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: () => openEditor(null) },
        [el('span', { html: svg('plus', 14) }), el('span', { text: 'New announcement' })])
    ]));
    wrap.append(listPanel);

    const editorHost = el('div', { class: 'editor-host', hidden: true });
    wrap.append(editorHost);

    async function load() {
      listPanel.innerHTML = '<p class="panel-sub">Loading…</p>';
      let items;
      try {
        items = await withBackend(() => mockAnnouncements(), () => SkyAPI.admin.listAnnouncements());
      } catch (error) {
        listPanel.innerHTML = '';
        listPanel.append(el('p', { class: 'panel-error', text: `Could not load announcements: ${error.message}` }));
        return;
      }

      listPanel.innerHTML = '';
      if (!items.length) {
        listPanel.append(el('p', { class: 'panel-sub', text: 'Nothing published yet.' }));
        return;
      }
      const list = el('ul', { class: 'ann-list' });
      items
        .slice()
        .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.publishedAt - a.publishedAt))
        .forEach((item) => {
          list.append(el('li', { class: `ann-item level-${item.level}` }, [
            el('div', { class: 'ann-body' }, [
              el('div', { class: 'ann-top' }, [
                el('span', { class: `news-pill pill-${item.level}`, text: item.level === 'release' ? 'Release' : item.level === 'alert' ? 'Alert' : 'Notice' }),
                item.pinned ? el('span', { class: 'news-pin', text: '★ pinned' }) : null,
                el('span', { class: 'ann-date', text: formatDateTime(item.publishedAt) })
              ]),
              el('h3', { text: item.title }),
              el('p', { text: item.body }),
              item.author ? el('span', { class: 'news-author', text: `— ${item.author}` }) : null
            ]),
            el('div', { class: 'ann-actions' }, [
              el('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => openEditor(item) },
                [el('span', { html: svg('edit', 14) }), el('span', { text: 'Edit' })]),
              el('button', {
                class: 'btn btn-ghost btn-small btn-danger-ghost', type: 'button',
                onclick: async () => {
                  const ok = await confirmAction({
                    title: 'Delete announcement?',
                    body: `“${item.title}” will be removed for everyone at next sync.`,
                    confirmLabel: 'Delete',
                    danger: true
                  });
                  if (!ok) return;
                  try {
                    if (state.preview || !SkyAPI.isConfigured()) {
                      const all = mockAnnouncements();
                      const index = all.findIndex((entry) => entry.id === item.id);
                      if (index >= 0) all.splice(index, 1);
                    } else {
                      await SkyAPI.admin.deleteAnnouncement(item.id);
                    }
                    toast('Announcement deleted.');
                    load();
                  } catch (error) {
                    toast(`Delete failed: ${error.message}`, { tone: 'danger' });
                  }
                }
              }, [el('span', { html: svg('trash', 14) }), el('span', { text: 'Delete' })])
            ])
          ]));
        });
      listPanel.append(list);
    }

    function openEditor(item) {
      editorHost.hidden = false;
      editorHost.innerHTML = '';
      const isNew = !item;
      const draft = item ? { ...item } : { title: '', body: '', level: 'info', pinned: false };

      const titleInput = el('input', { class: 'field-input', type: 'text', value: draft.title, maxLength: 90, placeholder: 'Sky-Myce 2.5.16 — …' });
      const levelSelect = el('select', { class: 'field-input' }, ['info', 'release', 'alert'].map((level) =>
        el('option', { value: level, text: titleCase(level), selected: draft.level === level })));
      const pinnedInput = el('input', { type: 'checkbox', checked: draft.pinned });
      const bodyInput = el('textarea', { class: 'field-input field-area', rows: 4, maxLength: 320, placeholder: 'One or two sentences players will see.' });
      bodyInput.value = draft.body;

      const previewCard = el('div', { class: 'ann-preview' });
      function refreshPreview() {
        previewCard.className = `ann-preview level-${levelSelect.value}`;
        previewCard.innerHTML = '';
        previewCard.append(
          el('span', { class: `news-pill pill-${levelSelect.value}`, text: levelSelect.value === 'release' ? 'Release' : levelSelect.value === 'alert' ? 'Alert' : 'Notice' }),
          el('h3', { text: titleInput.value || 'Announcement title' }),
          el('p', { text: bodyInput.value || 'Announcement body text appears here.' })
        );
      }
      [titleInput, bodyInput].forEach((node) => node.addEventListener('input', refreshPreview));
      levelSelect.addEventListener('change', refreshPreview);
      refreshPreview();

      const form = el('form', { class: 'editor-form' }, [
        el('div', { class: 'field-row' }, [
          el('label', { class: 'field' }, [el('span', { text: 'Title' }), titleInput]),
          el('label', { class: 'field field-narrow' }, [el('span', { text: 'Level' }), levelSelect])
        ]),
        el('label', { class: 'field' }, [el('span', { text: 'Body' }), bodyInput]),
        el('label', { class: 'field field-check' }, [pinnedInput, el('span', { text: 'Pin to the top of the strip' })]),
        el('div', { class: 'editor-actions' }, [
          el('button', { class: 'btn btn-primary', type: 'submit' }, [el('span', { text: isNew ? 'Publish' : 'Save changes' })]),
          el('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancel', onclick: () => { editorHost.hidden = true; editorHost.innerHTML = ''; } })
        ])
      ]);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
          title: titleInput.value.trim(),
          body: bodyInput.value.trim(),
          level: levelSelect.value,
          pinned: pinnedInput.checked
        };
        if (!payload.title || !payload.body) {
          toast('Title and body are required.', { tone: 'warn' });
          return;
        }
        try {
          if (state.preview || !SkyAPI.isConfigured()) {
            const all = mockAnnouncements();
            if (isNew) {
              all.unshift({ id: `mock-${Date.now()}`, author: 'You (preview)', publishedAt: Date.now(), ...payload });
            } else {
              const index = all.findIndex((entry) => entry.id === item.id);
              if (index >= 0) all[index] = { ...all[index], ...payload };
            }
          } else if (isNew) {
            await SkyAPI.admin.createAnnouncement(payload);
          } else {
            await SkyAPI.admin.updateAnnouncement(item.id, payload);
          }
          toast(isNew ? 'Announcement published.' : 'Announcement updated.');
          editorHost.hidden = true;
          editorHost.innerHTML = '';
          load();
        } catch (error) {
          toast(`Save failed: ${error.message}`, { tone: 'danger' });
        }
      });

      editorHost.append(el('section', { class: 'panel editor-panel' }, [
        el('div', { class: 'panel-head' }, [
          el('h2', { text: isNew ? 'New announcement' : 'Edit announcement' }),
          el('p', { class: 'panel-sub', text: state.preview ? 'Preview mode — the result will not be saved.' : 'Saved to the backend immediately.' })
        ]),
        form,
        el('div', { class: 'editor-preview-wrap' }, [
          el('span', { class: 'panel-sub', text: 'Preview' }),
          previewCard
        ])
      ]));
      editorHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    load();
  }

  /* -------------------------------------------------------------- players */

  function sectionPlayers(host) {
    const wrap = el('div', { class: 'panel-stack' });
    host.append(wrap);

    const search = el('input', { class: 'field-input', type: 'search', placeholder: 'Filter by name…', spellcheck: 'false' });
    const tableHost = el('section', { class: 'panel' });
    const pagerHost = el('div', { class: 'table-footer' });

    wrap.append(el('div', { class: 'panel-head' }, [
      el('div', {}, [
        el('h1', { text: 'Players & sharing' }),
        el('p', { class: 'panel-sub', text: 'Who shares what, their last sync, and moderation state.' })
      ]),
      el('label', { class: 'field-search' }, [el('span', { html: svg('users', 14) }), search])
    ]));
    wrap.append(tableHost, pagerHost);

    const page = { value: 1, limit: 12, total: 0 };

    async function load() {
      tableHost.innerHTML = '<p class="panel-sub">Loading…</p>';
      let result;
      try {
        result = await withBackend(() => {
          const query = search.value.trim().toLowerCase();
          const filtered = mockPlayers().filter((player) => !query || player.name.toLowerCase().includes(query));
          const start = (page.value - 1) * page.limit;
          return {
            items: filtered.slice(start, start + page.limit),
            total: filtered.length,
            hasNext: start + page.limit < filtered.length
          };
        }, () => SkyAPI.admin.listPlayers({
          query: search.value.trim(),
          page: page.value,
          limit: page.limit
        }));
      } catch (error) {
        tableHost.innerHTML = '';
        tableHost.append(el('p', { class: 'panel-error', text: `Could not load players: ${error.message}` }));
        return;
      }

      tableHost.innerHTML = '';
      page.total = result.total;

      if (!result.items.length) {
        tableHost.append(el('p', { class: 'panel-sub', text: 'No players match.' }));
        pagerHost.innerHTML = '';
        return;
      }

      const table = el('table', { class: 'data-table' });
      table.append(el('thead', {}, el('tr', {}, [
        el('th', { text: 'Player' }),
        el('th', { text: 'Status' }),
        el('th', { text: 'Sharing' }),
        el('th', { text: 'Last sync' }),
        el('th', { text: 'Samples' }),
        el('th', { text: '' })
      ])));

      const tbody = el('tbody');
      result.items.forEach((player) => {
        const shared = Object.entries(player.sharing || {}).filter(([, on]) => on).map(([key]) => titleCase(key));
        const statusCell = el('td', {}, el('span', { class: `status-pill status-${player.status}`, text: titleCase(player.status) }));
        const actionLabel = player.status === 'banned' ? 'Unban' : 'Ban';
        const action = el('button', {
          class: `btn btn-small ${player.status === 'banned' ? 'btn-ghost' : 'btn-danger-ghost'}`,
          type: 'button',
          onclick: async () => {
            const ok = await confirmAction({
              title: player.status === 'banned' ? `Unban ${player.name}?` : `Ban ${player.name}?`,
              body: player.status === 'banned'
                ? 'They will appear on boards again after the next sync.'
                : 'They disappear from all boards and their shared data is ignored at sync.',
              confirmLabel: actionLabel,
              danger: player.status !== 'banned'
            });
            if (!ok) return;
            try {
              if (state.preview || !SkyAPI.isConfigured()) {
                const found = mockPlayers().find((entry) => entry.name === player.name);
                if (found) found.status = found.status === 'banned' ? 'active' : 'banned';
              } else {
                await SkyAPI.admin.updatePlayer(player.name, { status: player.status === 'banned' ? 'active' : 'banned' });
              }
              toast(`${player.name} ${player.status === 'banned' ? 'unbanned' : 'banned'}.`);
              load();
            } catch (error) {
              toast(`Update failed: ${error.message}`, { tone: 'danger' });
            }
          }
        }, [el('span', { text: actionLabel })]);

        tbody.append(el('tr', { class: player.status === 'banned' ? 'row-banned' : '' }, [
          el('td', { class: 'cell-player' }, el('span', { class: 'player-inline' }, [
            el('span', { class: 'avatar avatar-sm', style: `--h:${SkyDemo.avatarHues[hash(player.name) % SkyDemo.avatarHues.length]}`, text: Sky.initials(player.name) }),
            el('span', { text: player.name })
          ])),
          statusCell,
          el('td', { text: shared.length ? shared.join(', ') : '—', class: 'cell-muted' }),
          el('td', { class: 'cell-muted', text: player.lastSeen ? formatRelative(player.lastSeen) : '—' }),
          el('td', { class: 'cell-muted', text: formatNumber(player.sampleCount || 0) }),
          el('td', { class: 'cell-actions' }, action)
        ]));
      });

      table.append(tbody);
      tableHost.append(table);

      pagerHost.innerHTML = '';
      const pages = Math.max(1, Math.ceil(page.total / page.limit));
      pagerHost.append(
        el('span', { class: 'panel-sub', text: `${formatNumber(page.total)} players · page ${page.value} of ${pages}` }),
        el('div', { class: 'pager' }, [
          el('button', {
            class: 'btn btn-ghost btn-small', type: 'button', text: 'Previous', disabled: page.value <= 1,
            onclick: () => { page.value -= 1; load(); }
          }),
          el('button', {
            class: 'btn btn-ghost btn-small', type: 'button', text: 'Next', disabled: !result.hasNext,
            onclick: () => { page.value += 1; load(); }
          })
        ])
      );
    }

    search.addEventListener('input', debounce(() => { page.value = 1; load(); }, 200));
    load();
  }

  /* --------------------------------------------------------------- config */

  const CONFIG_FIELDS = [
    { path: 'version', label: 'Mod version', type: 'text' },
    { path: 'builds.minecraft', label: 'Minecraft version', type: 'text' },
    { path: 'builds.java', label: 'Java version', type: 'text' },
    { path: 'links.download', label: 'Download URL', type: 'text' },
    { path: 'links.discord', label: 'Discord invite', type: 'text' },
    { path: 'links.source', label: 'Source URL', type: 'text' },
    { path: 'boards.pageSize', label: 'Board page size', type: 'number' }
  ];

  const CONFIG_FLAGS = [
    { path: 'flags.lookup', label: 'Player lookup on homepage' },
    { path: 'flags.announcements', label: 'Announcements strip' },
    { path: 'flags.stats', label: 'Live stat counters' },
    { path: 'flags.guide', label: 'Player guide link in nav' }
  ];

  function getPath(object, path) {
    return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), object);
  }

  function setPath(object, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((node, key) => (node[key] = node[key] || {}), object);
    target[last] = value;
  }

  function sectionConfig(host) {
    const wrap = el('div', { class: 'panel-stack' });
    host.append(wrap);

    const formPanel = el('section', { class: 'panel' });
    wrap.append(el('div', { class: 'panel-head' }, [
      el('div', {}, [
        el('h1', { text: 'Site config' }),
        el('p', { class: 'panel-sub', text: 'Values the site reads at load. Saved to the backend so every visitor picks them up without a deploy.' })
      ]),
      el('div', { class: 'head-actions' }, [
        el('button', {
          class: 'btn btn-ghost', type: 'button',
          onclick: async () => {
            try {
              const payload = JSON.stringify(current, null, 2);
              await navigator.clipboard.writeText(payload);
              toast('Config JSON copied to clipboard.');
            } catch {
              toast('Clipboard unavailable — open the console to copy.', { tone: 'warn' });
              console.log(JSON.stringify(current, null, 2));
            }
          }
        }, [el('span', { text: 'Copy JSON' })]),
        el('button', { class: 'btn btn-primary', type: 'submit', dataset: { role: 'save' }, form: 'config-form' },
          [el('span', { text: state.preview ? 'Save (preview)' : 'Save to backend' })])
      ])
    ]));
    wrap.append(formPanel);

    let current = {};

    (async () => {
      formPanel.innerHTML = '<p class="panel-sub">Loading…</p>';
      let loaded;
      try {
        loaded = await withBackend(mockConfig, () => SkyAPI.admin.getConfig());
      } catch (error) {
        formPanel.innerHTML = '';
        formPanel.append(el('p', { class: 'panel-error', text: `Could not load config: ${error.message}` }));
        return;
      }

      current = {
        version: loaded.version ?? cfg.version,
        builds: { ...cfg.builds, ...(loaded.builds || {}) },
        links: { ...cfg.links, ...(loaded.links || {}) },
        flags: { ...cfg.flags, ...(loaded.flags || {}) },
        boards: { ...cfg.boards, ...(loaded.boards || {}) }
      };

      formPanel.innerHTML = '';
      const form = el('form', { class: 'editor-form', id: 'config-form' });

      const grid = el('div', { class: 'field-grid' });
      CONFIG_FIELDS.forEach((field) => {
        const input = el('input', { class: 'field-input', type: field.type, value: String(getPath(current, field.path) ?? '') });
        input.addEventListener('input', () => {
          setPath(current, field.path, field.type === 'number' ? Number(input.value) || 0 : input.value);
        });
        grid.append(el('label', { class: 'field' }, [el('span', { text: field.label }), input]));
      });
      form.append(grid);

      const flagList = el('div', { class: 'flag-list' });
      CONFIG_FLAGS.forEach((flag) => {
        const checkbox = el('input', { type: 'checkbox', checked: Boolean(getPath(current, flag.path)) });
        checkbox.addEventListener('change', () => setPath(current, flag.path, checkbox.checked));
        flagList.append(el('label', { class: 'switch-row' }, [checkbox, el('span', { class: 'switch-ui' }), el('span', { text: flag.label })]));
      });
      form.append(el('h3', { class: 'form-sub', text: 'Homepage features' }), flagList);

      const linkGrid = el('div', { class: 'field-grid' });
      Object.keys(cfg.links).forEach((key) => {
        const input = el('input', { class: 'field-input', type: 'text', value: String(current.links[key] ?? '') });
        input.addEventListener('input', () => { current.links[key] = input.value; });
        linkGrid.append(el('label', { class: 'field' }, [el('span', { text: `links.${key}` }), input]));
      });
      form.append(el('h3', { class: 'form-sub', text: 'Links' }), linkGrid);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          if (state.preview || !SkyAPI.isConfigured()) {
            mock.config = current;
            toast('Preview mode — config kept locally only.', { tone: 'warn' });
          } else {
            await SkyAPI.admin.putConfig(current);
            toast('Config saved to the backend.');
          }
        } catch (error) {
          toast(`Save failed: ${error.message}`, { tone: 'danger' });
        }
      });

      formPanel.append(form);

      formPanel.append(el('div', { class: 'panel-note' }, [
        el('p', { text: 'The public site reads the same values through GET /config at load. Toggling a flag hides the matching section on the homepage after a refresh — no deploy needed.' })
      ]));
    })();
  }

  /* -------------------------------------------------------------- modules */

  function sectionModules(host) {
    const wrap = el('div', { class: 'panel-stack' });
    host.append(wrap);

    wrap.append(el('div', { class: 'panel-head' }, [
      el('div', {}, [
        el('h1', { text: 'Modules' }),
        el('p', { class: 'panel-sub', text: 'Backend-defined tooling. The backend lists what it exposes; this page renders it — no site deploy per module.' })
      ]),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => load() },
        [el('span', { html: svg('refresh', 14) }), el('span', { text: 'Refresh' })])
    ]));

    const grid = el('div', { class: 'module-grid' });
    const detail = el('section', { class: 'panel module-detail', hidden: true });
    wrap.append(grid, detail);

    async function load() {
      grid.innerHTML = '<p class="panel-sub">Loading…</p>';
      detail.hidden = true;
      let modules;
      try {
        modules = await withBackend(() => [
          { id: 'tips-log', label: 'Ingest log', description: 'Feed health and rejected records (example preview module).', icon: 'news', badge: 'example' },
          { id: 'export', label: 'Data export', description: 'Dump aggregate boards as JSON (example preview module).', icon: 'sliders', badge: 'example' }
        ], () => SkyAPI.admin.listModules());
      } catch (error) {
        grid.innerHTML = '';
        grid.append(el('p', { class: 'panel-error', text: `Could not load modules: ${error.message}` }));
        return;
      }

      grid.innerHTML = '';
      if (!modules.length) {
        grid.append(el('p', { class: 'panel-sub', text: 'The backend exposes no extra modules yet.' }));
      }

      modules.forEach((module) => {
        const button = el('button', { class: 'module-card', type: 'button' }, [
          el('span', { class: 'module-icon', html: svg(module.icon || 'puzzle', 16) }),
          el('span', { class: 'module-meta' }, [
            el('strong', { text: module.label }),
            el('small', { text: module.description })
          ]),
          module.badge ? el('span', { class: 'chip chip-warn', text: module.badge }) : el('span', { class: 'module-open', text: 'Open →' })
        ]);
        button.addEventListener('click', () => openModule(module));
        grid.append(button);
      });

      grid.append(el('div', { class: 'panel-note module-note' }, [
        el('p', { html: 'Adding a panel section is a code change in <code>js/admin.js</code> (one entry in <code>SECTIONS</code>). Adding a module here is a backend change — see README → “Admin panel”.' })
      ]));
    }

    async function openModule(module) {
      detail.hidden = false;
      detail.innerHTML = '<p class="panel-sub">Loading…</p>';
      let payload;
      try {
        payload = await withBackend(() => ({
          ok: true,
          module: module.id,
          preview: true,
          fields: [
            { label: 'Status', value: 'Preview placeholder' },
            { label: 'Note', value: 'Connect the backend to render real module output.' }
          ]
        }), () => SkyAPI.admin.getModule(module.id));
      } catch (error) {
        detail.innerHTML = '';
        detail.append(el('p', { class: 'panel-error', text: `Could not load module: ${error.message}` }));
        return;
      }

      detail.innerHTML = '';
      detail.append(el('div', { class: 'panel-head' }, [
        el('div', {}, [
          el('h2', { text: module.label }),
          el('p', { class: 'panel-sub', text: module.description || module.id })
        ]),
        el('button', { class: 'btn btn-ghost btn-small', type: 'button', text: 'Close', onclick: () => { detail.hidden = true; } })
      ]));

      const fields = Array.isArray(payload?.fields) ? payload.fields : null;
      if (fields) {
        const rows = el('div', { class: 'kv-list' });
        fields.forEach((field) => rows.append(el('div', { class: 'kv-row' }, [
          el('span', { class: 'kv-key', text: String(field.label ?? '') }),
          el('span', { class: 'kv-value', text: String(field.value ?? '') })
        ])));
        detail.append(rows);
      } else {
        detail.append(el('pre', { class: 'json-view', text: JSON.stringify(payload, null, 2) }));
      }
    }

    load();
  }

  /* ===================================================================== */
  /*  Registry                                                             */
  /* ===================================================================== */

  const SECTIONS = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard', render: sectionDashboard },
    { id: 'announcements', label: 'Announcements', icon: 'news', render: sectionAnnouncements },
    { id: 'players', label: 'Players', icon: 'users', render: sectionPlayers },
    { id: 'config', label: 'Site config', icon: 'sliders', render: sectionConfig },
    { id: 'modules', label: 'Modules', icon: 'puzzle', render: sectionModules }
  ];

  window.SkyAdmin = { state, go, sections: SECTIONS, toast };

  function init() {
    if (!qs('#admin-shell')) return;
    const hashView = window.location.hash.replace(/^#\/?/, '');
    if (hashView && SECTIONS.some((section) => section.id === hashView)) state.view = hashView;
    window.addEventListener('hashchange', () => {
      const view = window.location.hash.replace(/^#\/?/, '');
      if (view && view !== state.view) go(view);
    });
    boot();
    if (window.SkyMotion) window.SkyMotion.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
