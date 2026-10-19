/* ==========================================================================
   Sky-Myce — homepage behavior
   --------------------------------------------------------------------------
   Leaderboards, announcements, live stats, and player lookup. Everything
   reads through js/api.js, which falls back to preview data when no backend
   is configured, so the page is fully functional either way.

   URL state:  ?section=boards  (see README)
   Exposes:    window.SkyHome (debug handle)
   ========================================================================== */

(() => {
  'use strict';

  const cfg = window.SKYMYCE;
  const Sky = window.Sky;
  const { qs, qsa, el, hash, formatValue, formatNumber, formatRelative, initials } = Sky;

  const PAGE_SIZE = (cfg.boards && cfg.boards.pageSize) || 10;

  const state = {
    category: 'economy',
    metric: 'networth',
    period: 'all-time',
    page: 1,
    query: '',
    lookup: ''
  };

  let requestSeq = 0;

  /* ------------------------------------------------------------ URL state */

  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('category');
    const category = SkyDemo.categories.find((item) => item.id === categoryId);
    if (category) {
      state.category = category.id;
      const metric = params.get('metric');
      state.metric = metric && category.metrics.includes(metric) ? metric : category.metrics[0];
    } else {
      const metric = params.get('metric');
      const found = SkyDemo.categories.find((item) => item.metrics.includes(metric));
      if (found) {
        state.category = found.id;
        state.metric = metric;
      }
    }
    const period = params.get('period');
    if (period && ['all-time', 'weekly', 'monthly'].includes(period)) state.period = period;
    const page = Number(params.get('page'));
    if (page > 0) state.page = Math.min(Math.floor(page), 999);
    const query = params.get('q');
    if (query) state.query = query;
  }

  function writeUrl() {
    const params = new URLSearchParams();
    params.set('category', state.category);
    params.set('metric', state.metric);
    if (state.period !== 'all-time') params.set('period', state.period);
    if (state.page > 1) params.set('page', String(state.page));
    if (state.query.trim()) params.set('q', state.query.trim());
    const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }

  /* ------------------------------------------------------------ elements */

  const listEl = qs('#board-list');
  const selectEl = qs('#metric-select');
  const periodEl = qs('#period-control');
  const searchEl = qs('#search-input');
  const titleEl = qs('#metric-title');
  const descEl = qs('#metric-desc');
  const updatedEl = qs('#board-updated');
  const rangeEl = qs('#board-range');
  const pageLabelEl = qs('#page-label');
  const prevEl = qs('#page-prev');
  const nextEl = qs('#page-next');
  const sourceEl = qs('#board-source');
  const sourceLabelEl = qs('#board-source-label');
  const categoryButtons = qsa('.cat');

  const announcementsEl = qs('#announcements-list');
  const statsEls = {
    players: qs('#stat-players'),
    records: qs('#stat-records'),
    metrics: qs('#stat-metrics'),
    uptime: qs('#stat-uptime')
  };

  const lookupForm = qs('#lookup-form');
  const lookupInput = qs('#lookup-input');
  const lookupResult = qs('#lookup-result');

  /* ------------------------------------------------------------- sources */

  function setSource(source) {
    if (!sourceEl) return;
    sourceEl.dataset.state = source;
    if (source === 'live') {
      sourceLabelEl.textContent = 'Live rankings';
      sourceEl.title = 'Live community rankings.';
    } else if (source === 'offline') {
      sourceLabelEl.textContent = 'Offline preview';
      sourceEl.title = 'The live feed is unavailable right now — showing preview data.';
    } else {
      sourceLabelEl.textContent = 'Preview data';
      sourceEl.title = 'Illustrative sample data. Point the site at a live leaderboard endpoint to show real rankings.';
    }
  }

  /* ------------------------------------------------------------ rendering */

  function skeleton() {
    listEl.innerHTML = '';
    for (let i = 0; i < 6; i += 1) {
      const row = document.createElement('li');
      row.className = 'board-row skeleton';
      row.innerHTML = '<span class="sk sk-rank"></span><span class="sk sk-player"></span><span class="sk sk-value"></span>';
      listEl.appendChild(row);
    }
  }

  function emptyState() {
    const li = document.createElement('li');
    li.className = 'board-empty';
    li.innerHTML = '<strong>No players match that search.</strong>Try a shorter name, or clear the filter.<br><button type="button" data-clear>Clear search</button>';
    listEl.appendChild(li);
  }

  function buildRow(entry, metric, rank) {
    const li = document.createElement('li');
    li.className = 'board-row';
    li.style.setProperty('--delay', `${Math.min((rank - 1) % PAGE_SIZE, 9) * 40}ms`);

    const rankEl = document.createElement('span');
    rankEl.className = 'rank';
    if (!state.query.trim() && rank <= 3) rankEl.classList.add(`rank-${rank}`);
    rankEl.textContent = String(rank);

    const playerEl = document.createElement('span');
    playerEl.className = 'player';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.style.setProperty('--h', String(SkyDemo.avatarHues[hash(entry.player) % SkyDemo.avatarHues.length]));
    avatar.textContent = initials(entry.player);
    const names = document.createElement('span');
    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = entry.player;
    const subEl = document.createElement('span');
    subEl.className = 'player-sub';
    subEl.textContent = `${formatNumber(entry.samples)} ${metric.sample}`;
    names.append(nameEl, subEl);
    playerEl.append(avatar, names);

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    const strong = document.createElement('strong');
    strong.textContent = formatValue(entry.value, metric);
    const unit = document.createElement('span');
    unit.textContent = metric.unitLabel;
    valueEl.append(strong, unit);

    if (window.SkyMotion && rank <= PAGE_SIZE) {
      window.SkyMotion.countTo(strong, entry.value, (value) => formatValue(value, metric), 700 + rank * 40);
    }

    li.append(rankEl, playerEl, valueEl);

    if (window.SkyMotion && !window.SkyMotion.reduced && typeof li.animate === 'function') {
      li.animate(
        [
          { opacity: 0, transform: 'translateY(10px) scale(0.995)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 420, delay: Math.min((rank - 1) % PAGE_SIZE, 9) * 34, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
      );
    }

    return li;
  }

  function render(result) {
    const metric = SkyDemo.metrics[state.metric];
    titleEl.textContent = metric.label;
    descEl.textContent = metric.description;
    updatedEl.textContent = `Updated ${formatRelative(result.updatedAt)}`;
    setSource(result.source);

    listEl.innerHTML = '';
    if (result.entries.length === 0) {
      emptyState();
    } else {
      const firstRank = (state.page - 1) * PAGE_SIZE + 1;
      result.entries.forEach((entry, index) => {
        listEl.appendChild(buildRow(entry, metric, firstRank + index));
      });
    }

    const start = result.entries.length === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
    const end = (state.page - 1) * PAGE_SIZE + result.entries.length;
    const query = state.query.trim();
    rangeEl.textContent = query
      ? `${result.matched} ${result.matched === 1 ? 'result' : 'results'} for “${query}” · ${SkyDemo.periodLabels[state.period]}`
      : `Top ${start}–${end} of ${formatNumber(result.total)} consenting players · ${SkyDemo.periodLabels[state.period]}`;

    const pageCount = Math.max(result.pageCount || state.page, state.page);
    pageLabelEl.textContent = `Page ${state.page} of ${pageCount}`;
    prevEl.disabled = state.page <= 1;
    nextEl.disabled = !result.entries.length || state.page >= pageCount;
  }

  async function refresh() {
    const seq = ++requestSeq;
    writeUrl();
    if (window.SkyAPI.isConfigured()) skeleton();

    let result = null;
    let offline = false;

    if (window.SkyAPI.isConfigured()) {
      try {
        const live = await window.SkyAPI.getLeaderboard({
          category: state.category,
          metric: state.metric,
          period: state.period,
          page: state.page,
          limit: PAGE_SIZE,
          search: state.query.trim()
        });
        result = {
          entries: live.entries,
          matched: live.total,
          total: live.total,
          pageCount: live.hasNext ? state.page + 1 : state.page,
          source: 'live',
          updatedAt: live.updatedAt
        };
      } catch {
        offline = true;
      }
    }

    if (!result) {
      const pageSize = PAGE_SIZE;
      const demo = SkyDemo.leaderboard(state, pageSize);
      state.page = demo.page;
      result = demo;
      if (offline) result.source = 'offline';
    }

    if (seq !== requestSeq) return;
    render(result);
  }

  /* ------------------------------------------------------------- controls */

  function metricOptions(category) {
    selectEl.innerHTML = '';
    const found = SkyDemo.categories.find((item) => item.id === category);
    found.metrics.forEach((id) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = SkyDemo.metrics[id].label;
      selectEl.appendChild(option);
    });
    selectEl.value = state.metric;
  }

  function selectCategory(category) {
    state.category = category;
    state.metric = SkyDemo.categories.find((item) => item.id === category).metrics[0];
    state.page = 1;
    categoryButtons.forEach((button) => {
      const active = button.dataset.category === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    metricOptions(category);
    refresh();
  }

  function selectMetric(metric) {
    state.metric = metric;
    state.page = 1;
    refresh();
  }

  function selectPeriod(period) {
    state.period = period;
    state.page = 1;
    qsa('button', periodEl).forEach((button) => {
      const active = button.dataset.period === period;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    refresh();
  }

  function bindControls() {
    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => selectCategory(button.dataset.category));
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const index = categoryButtons.indexOf(button);
        const next = event.key === 'ArrowRight'
          ? (index + 1) % categoryButtons.length
          : (index - 1 + categoryButtons.length) % categoryButtons.length;
        categoryButtons[next].focus();
        selectCategory(categoryButtons[next].dataset.category);
      });
    });

    selectEl.addEventListener('change', () => selectMetric(selectEl.value));

    periodEl.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-period]');
      if (button) selectPeriod(button.dataset.period);
    });

    const onSearch = Sky.debounce(() => {
      state.query = searchEl.value;
      state.page = 1;
      refresh();
    }, 160);

    searchEl.addEventListener('input', onSearch);

    searchEl.addEventListener('search', () => {
      if (searchEl.value === '') {
        state.query = '';
        state.page = 1;
        refresh();
      }
    });

    listEl.addEventListener('click', (event) => {
      if (event.target.closest('[data-clear]')) {
        searchEl.value = '';
        state.query = '';
        state.page = 1;
        refresh();
      }
    });

    prevEl.addEventListener('click', () => {
      if (state.page > 1) {
        state.page -= 1;
        refresh();
      }
    });

    nextEl.addEventListener('click', () => {
      state.page += 1;
      refresh();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && document.activeElement !== searchEl && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchEl.focus();
      }
    });
  }

  /* ------------------------------------------------------------- sections */

  function renderAnnouncements(items) {
    if (!announcementsEl) return;
    announcementsEl.innerHTML = '';
    if (!items.length) {
      announcementsEl.innerHTML = '<li class="news-empty">No announcements yet — the first one will land here.</li>';
      return;
    }

    items.slice(0, 3).forEach((item, index) => {
      const li = el('li', {
        class: `news-card level-${item.level}`,
        'data-reveal': '',
        style: `--reveal-delay:${index * 90}ms`
      },
        el('div', { class: 'news-top' }, [
          el('span', { class: `news-pill pill-${item.level}`, text: item.level === 'release' ? 'Release' : item.level === 'alert' ? 'Alert' : 'Notice' }),
          item.pinned ? el('span', { class: 'news-pin', title: 'Pinned', text: '★' }) : null,
          el('span', { class: 'news-time', text: formatRelative(item.publishedAt) })
        ]),
        el('h3', { text: item.title }),
        el('p', { text: item.body })
      );
      if (item.author) li.append(el('span', { class: 'news-author', text: `— ${item.author}` }));
      announcementsEl.appendChild(li);
    });

    if (window.SkyMotion) window.SkyMotion.scan(announcementsEl);
  }

  async function loadAnnouncements() {
    if (!announcementsEl || cfg.flags.announcements === false) return;
    let items = null;
    if (window.SkyAPI.isConfigured()) {
      try {
        items = (await window.SkyAPI.getAnnouncements({ limit: 3 })).items;
      } catch {
        items = null;
      }
    }
    renderAnnouncements(items || SkyDemo.announcements.slice(0, 3));
  }

  async function loadStats() {
    if (!statsEls.players) return;
    let data = null;
    if (window.SkyAPI.isConfigured() && cfg.flags.stats !== false) {
      try {
        data = await window.SkyAPI.getStats();
      } catch {
        data = null;
      }
    }
    if (!data || !data.players) data = SkyDemo.stats();

    const pairs = [
      [statsEls.players, data.players, 'compact'],
      [statsEls.records, data.sharedRecords, 'compact'],
      [statsEls.metrics, data.trackedMetrics, 'number'],
      [statsEls.uptime, data.uptimeDays, 'number']
    ];
    pairs.forEach(([node, value, format]) => {
      if (!node) return;
      node.dataset.count = String(value);
      node.dataset.countFormat = format;
    });

    const statsSection = qs('#stats-section');
    if (statsSection) {
      const note = qs('#stats-updated', statsSection);
      if (note) note.textContent = `Synced ${formatRelative(data.updatedAt)} · updates hourly`;
      if (window.SkyMotion) {
        qsa('[data-count]', statsSection).forEach((node) => window.SkyMotion.countTo(node, Number(node.dataset.count), window.SkyMotion.countFormat[node.dataset.countFormat || 'number'], 1100));
      }
    }
  }

  /* --------------------------------------------------------------- lookup */

  function sharingChips(player) {
    const wrap = el('div', { class: 'lookup-sharing' });
    const shared = Object.entries(player.sharing).filter(([, on]) => on).map(([key]) => key);
    if (!shared.length) {
      wrap.append(el('span', { class: 'chip chip-off', text: 'Not sharing any category yet' }));
      return wrap;
    }
    shared.forEach((key) => wrap.append(el('span', { class: 'chip chip-on', text: Sky.titleCase(key) })));
    return wrap;
  }

  function renderProfile(player, { preview = false } = {}) {
    lookupResult.innerHTML = '';
    lookupResult.hidden = false;

    const card = el('article', { class: 'lookup-card' });

    const head = el('div', { class: 'lookup-head' }, [
      el('span', { class: 'avatar avatar-lg', style: `--h:${SkyDemo.avatarHues[hash(player.name) % SkyDemo.avatarHues.length]}` , text: initials(player.name) }),
      el('div', { class: 'lookup-identity' }, [
        el('h3', { text: player.name }),
        el('p', {
          text: player.lastSeen
            ? `Last seen ${formatRelative(player.lastSeen)} · ${formatNumber(player.sampleCount)} shared records`
            : `${formatNumber(player.sampleCount)} shared records`
        })
      ]),
      preview ? el('span', { class: 'lookup-preview', text: 'Preview' }) : el('span', { class: `lookup-status status-${player.status}`, text: player.status })
    ]);

    card.append(head);

    if (player.badges && player.badges.length) {
      card.append(el('div', { class: 'lookup-badges' }, player.badges.map((badge) => el('span', { class: 'badge', text: badge }))));
    }

    card.append(el('h4', { class: 'lookup-sub', text: 'Sharing categories' }), sharingChips(player));

    if (player.ranks && player.ranks.length) {
      const ranks = el('ul', { class: 'lookup-ranks' }, player.ranks.map((rank) => {
        const metric = SkyDemo.metrics[rank.metric] || {};
        const value = formatValue(rank.value, metric);
        return el('li', {}, [
          el('span', { class: 'lookup-rank', text: `#${formatNumber(rank.rank)}` }),
          el('span', { class: 'lookup-metric', text: rank.label || Sky.titleCase(rank.metric) }),
          el('span', { class: 'lookup-period', text: SkyDemo.periodLabels[rank.period] || Sky.titleCase(rank.period) }),
          el('strong', { text: value })
        ]);
      }));
      card.append(el('h4', { class: 'lookup-sub', text: 'Board placement' }), ranks);
    } else {
      card.append(el('p', { class: 'lookup-none', text: 'No board placement in the current period.' }));
    }

    card.append(el('p', { class: 'lookup-note', text: preview
      ? 'Preview profile — generated locally, not from the live backend.'
      : 'Shared with the community through the mod. Players control every category.' }));

    lookupResult.append(card);
    if (window.SkyMotion) window.SkyMotion.scan(lookupResult);
  }

  function lookupError(message) {
    lookupResult.innerHTML = '';
    lookupResult.hidden = false;
    lookupResult.append(el('p', { class: 'lookup-error', text: message }));
  }

  function bindLookup() {
    if (!lookupForm || cfg.flags.lookup === false) return;

    lookupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = lookupInput.value.trim();
      if (!name) {
        lookupInput.focus();
        return;
      }
      state.lookup = name;

      const button = qs('button', lookupForm);
      button.disabled = true;
      button.classList.add('is-busy');
      lookupResult.innerHTML = '<div class="lookup-card lookup-loading"><span class="sk sk-player"></span><span class="sk sk-value"></span></div>';
      lookupResult.hidden = false;

      let player = null;
      let preview = false;
      if (window.SkyAPI.isConfigured()) {
        try {
          player = await window.SkyAPI.getPlayer(name);
        } catch (error) {
          if (error.status === 404) {
            lookupError(`No shared profile for “${name}”. Players appear here after opting in to sharing.`);
            button.disabled = false;
            button.classList.remove('is-busy');
            return;
          }
        }
      }
      if (!player) {
        player = SkyDemo.profile(name);
        preview = true;
      }

      renderProfile(player, { preview });
      button.disabled = false;
      button.classList.remove('is-busy');
    });
  }

  /* ------------------------------------------------------- nav & scrollspy */

  function bindScrollSpy() {
    const navLinks = qsa('.nav-links a[href^="#"]');
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const active = link.getAttribute('href') === `#${entry.target.id}`;
            link.classList.toggle('is-current', active);
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((section) => spy.observe(section));
    }
  }

  /* --------------------------------------------------------------- start */

  function init() {
    readUrl();
    if (window.SkyMotion) window.SkyMotion.init();
    metricOptions(state.category);
    qsa('.cat').forEach((button) => {
      const active = button.dataset.category === state.category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    qsa('button', periodEl).forEach((button) => {
      const active = button.dataset.period === state.period;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (state.query) searchEl.value = state.query;

    bindControls();
    bindLookup();
    bindScrollSpy();

    refresh();
    loadAnnouncements();
    loadStats();
  }

  window.SkyHome = { state, refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
