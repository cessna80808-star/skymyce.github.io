/* ==========================================================================
   Sky-Myce — site behavior + leaderboard preview
   --------------------------------------------------------------------------
   Rankings shown by default are illustrative sample data so the board UI can
   be developed and reviewed. To show real community rankings, expose a public
   read-only endpoint (mirroring the mod's /community/leaderboard response)
   and set it before this script runs:

     <script>window.SKYMYCE_LIVE_ENDPOINT = "https://example.com/leaderboard";</script>

   Expected response shape (only these fields are used):
     { ok: true, total, hasNext, updatedAt,
       entries: [{ player, value, samples, updatedAt }] }
   ========================================================================== */

(() => {
  'use strict';

  const LIVE_ENDPOINT = window.SKYMYCE_LIVE_ENDPOINT || '';
  const PAGE_SIZE = 10;

  /* ------------------------------------------------------------------ data */

  const CATEGORIES = [
    { id: 'economy', label: 'Economy', metrics: ['networth', 'purse', 'bank', 'bazaar_profit'] },
    { id: 'dungeons', label: 'Dungeons', metrics: ['dungeon_runs', 'dungeon_profit', 'dungeon_run_time'] },
    { id: 'rng', label: 'RNG', metrics: ['rng_drops'] }
  ];

  const METRICS = {
    networth: {
      label: 'Net worth',
      description: 'Latest complete shared valuation observed in this period — not net-worth gain.',
      unitLabel: 'coins',
      format: 'coins',
      mode: 'snapshot',
      sample: 'snapshots',
      range: [2.4e8, 1.9e10],
      curve: 2.2
    },
    purse: {
      label: 'Purse balance',
      description: 'Latest complete shared purse snapshot observed in this period — not income.',
      unitLabel: 'coins',
      format: 'coins',
      mode: 'snapshot',
      sample: 'snapshots',
      range: [1.6e7, 1.6e9],
      curve: 2.0
    },
    bank: {
      label: 'Bank balance',
      description: 'Latest complete shared bank snapshot observed in this period — not income.',
      unitLabel: 'coins',
      format: 'coins',
      mode: 'snapshot',
      sample: 'snapshots',
      range: [4.5e7, 2.4e9],
      curve: 2.0
    },
    bazaar_profit: {
      label: 'Realized Bazaar profit',
      description: 'Net sale proceeds less allocated observed acquisition cost — losses included.',
      unitLabel: 'coins',
      format: 'coins',
      mode: 'event',
      sample: 'records',
      range: [1.8e7, 1.15e9],
      curve: 2.4
    },
    dungeon_runs: {
      label: 'Dungeon completions',
      description: 'New timestamped completed-run records. Legacy aggregate totals are excluded.',
      unitLabel: 'runs',
      format: 'number',
      mode: 'event',
      sample: 'sessions',
      range: [180, 3400],
      curve: 1.9
    },
    dungeon_profit: {
      label: 'Chest profit',
      description: 'Sum of newly recorded chest profit estimates, including losses.',
      unitLabel: 'coins',
      format: 'coins',
      mode: 'event',
      sample: 'chest records',
      range: [2.2e8, 9.8e9],
      curve: 2.3
    },
    dungeon_run_time: {
      label: 'Average run time',
      description: 'Average newly completed timed runs across all floors. Faster times rank first.',
      unitLabel: 'average',
      format: 'time',
      mode: 'average',
      sample: 'timed runs',
      range: [258000, 640000],
      curve: 1.45,
      lowerIsBetter: true
    },
    rng_drops: {
      label: 'RNG drops',
      description: 'Newly accepted supported community drop reports — not official drop rates.',
      unitLabel: 'drops',
      format: 'number',
      mode: 'event',
      sample: 'reports',
      range: [9, 430],
      curve: 2.1
    }
  };

  const PLAYERS = [
    'Cessna808', 'GoldorGoblin', 'MyceliumMage', 'SporeLord', 'TerminalEnjoyer',
    'FungusAmongUs', 'NecronNapper', 'StormSoaker', 'MaxorMuncher', 'PartyFinderPro',
    'ChestRoulette', 'RngCarried', 'DungeonRat', 'BloodRushBen', 'LeapFrogger',
    'WitherWizard', 'StonkSeller', 'SkyblockSage', 'F7Fiend', 'M7Maniac',
    'CrimsonCape', 'HypixelHotbar'
  ];

  const PERIOD_LABELS = {
    'all-time': 'All time',
    weekly: 'This week',
    monthly: 'This month'
  };

  const AVATAR_HUES = [145, 168, 200, 232, 262, 20, 42, 320];

  /* ---------------------------------------------------------------- random */

  function hash(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------- demo generator */

  function sampleCount(metric, value, r, period) {
    switch (metric.sample) {
      case 'snapshots':
        if (period === 'weekly') return 1 + Math.floor(r * 4);
        if (period === 'monthly') return 3 + Math.floor(r * 8);
        return 8 + Math.floor(r * 18);
      case 'records':
        return Math.max(1, Math.round(value / (2.5e6 + r * 4e6)));
      case 'chest records':
        return Math.max(1, Math.round(value / (1.8e6 + r * 3e6)));
      case 'sessions':
        return Math.max(1, Math.round(value / (6 + r * 6)));
      case 'reports':
        return Math.max(1, Math.round(value / (2 + r * 4)));
      case 'timed runs':
        if (period === 'weekly') return 6 + Math.floor(r * 24);
        if (period === 'monthly') return 12 + Math.floor(r * 50);
        return 30 + Math.floor(r * 150);
      default:
        return 1;
    }
  }

  function buildRanked(metricId, period) {
    const metric = METRICS[metricId];
    const rows = PLAYERS.map((player) => {
      const tie = mulberry32(hash(`${player}:talent`))();
      const personal = mulberry32(hash(`${player}:${metricId}`))();
      const noise = mulberry32(hash(`${player}:${metricId}:${period}`))();

      const ability = Math.min(1, Math.max(0, 0.24 * tie + 0.76 * personal));
      const spread = metric.range[1] - metric.range[0];
      const base = metric.lowerIsBetter
        ? metric.range[0] + spread * Math.pow(1 - ability, metric.curve)
        : metric.range[0] + spread * Math.pow(ability, metric.curve);

      let factor = 1;
      if (period !== 'all-time') {
        if (metric.mode === 'event') {
          factor = period === 'weekly' ? 0.05 + noise * 0.09 : 0.16 + noise * 0.2;
        } else if (metric.mode === 'snapshot') {
          factor = period === 'weekly' ? 0.72 + noise * 0.2 : 0.84 + noise * 0.14;
        } else {
          factor = period === 'weekly' ? 0.93 + noise * 0.06 : 0.96 + noise * 0.05;
        }
      }

      let value = base * factor;
      value = metric.format === 'time' ? Math.round(value / 10) * 10 : Math.round(value);

      return {
        player,
        value,
        samples: sampleCount(metric, value, noise, period),
        updatedAt: Date.now() - Math.floor(4 + noise * 42) * 60000
      };
    });

    rows.sort((a, b) => (metric.lowerIsBetter ? a.value - b.value : b.value - a.value));
    return rows;
  }

  const rankedCache = new Map();

  function rankedData(metricId, period) {
    const key = `${metricId}|${period}`;
    if (!rankedCache.has(key)) rankedCache.set(key, buildRanked(metricId, period));
    return rankedCache.get(key);
  }

  function demoResult() {
    const metric = METRICS[state.metric];
    const ranked = rankedData(state.metric, state.period);
    const query = state.query.trim().toLowerCase();
    const filtered = query ? ranked.filter((entry) => entry.player.toLowerCase().includes(query)) : ranked;

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * PAGE_SIZE;

    return {
      entries: filtered.slice(start, start + PAGE_SIZE),
      matched: filtered.length,
      total: query ? filtered.length : 180 + (hash(state.metric + state.period) % 190),
      pageCount,
      source: 'preview',
      updatedAt: ranked[0] ? ranked[0].updatedAt : Date.now()
    };
  }

  async function liveResult() {
    const url = new URL(LIVE_ENDPOINT, window.location.href);
    url.searchParams.set('category', state.category);
    url.searchParams.set('metric', state.metric);
    url.searchParams.set('period', state.period);
    url.searchParams.set('page', String(state.page));
    url.searchParams.set('limit', String(PAGE_SIZE));
    if (state.query.trim()) url.searchParams.set('search', state.query.trim());

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.ok !== true || !Array.isArray(data.entries)) throw new Error('Unexpected leaderboard response');

    const entries = data.entries.map((entry) => ({
      player: String(entry.player ?? 'Anonymous player'),
      value: Number(entry.value) || 0,
      samples: Number(entry.samples ?? entry.sampleSize ?? 0) || 0,
      updatedAt: Number(entry.updatedAt ?? data.updatedAt ?? Date.now())
    }));

    return {
      entries,
      matched: Number(data.total) || entries.length,
      total: Number(data.total) || entries.length,
      pageCount: data.hasNext ? state.page + 1 : state.page,
      source: 'live',
      updatedAt: Number(data.updatedAt) || Date.now()
    };
  }

  /* ------------------------------------------------------------- formatting */

  const numberFormat = new Intl.NumberFormat('en-US');

  function trimDigits(value) {
    return Number(value.toFixed(value < 10 ? 2 : 1)).toString();
  }

  function formatCoins(value) {
    if (value >= 1e9) return `${trimDigits(value / 1e9)}B`;
    if (value >= 1e6) return `${trimDigits(value / 1e6)}M`;
    if (value >= 1e3) return `${trimDigits(value / 1e3)}K`;
    return numberFormat.format(Math.round(value));
  }

  function formatTime(ms) {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function formatValue(value, metric) {
    if (metric.format === 'time') return formatTime(value);
    if (metric.format === 'coins') return formatCoins(value);
    return numberFormat.format(Math.round(value));
  }

  function formatRelative(timestamp) {
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  function initials(name) {
    const clean = name.replace(/[^a-z0-9]/gi, '');
    return (clean.slice(0, 2) || '??').toUpperCase();
  }

  /* --------------------------------------------------------------- element */

  const listEl = document.getElementById('board-list');
  const selectEl = document.getElementById('metric-select');
  const periodEl = document.getElementById('period-control');
  const searchEl = document.getElementById('search-input');
  const titleEl = document.getElementById('metric-title');
  const descEl = document.getElementById('metric-desc');
  const updatedEl = document.getElementById('board-updated');
  const rangeEl = document.getElementById('board-range');
  const pageLabelEl = document.getElementById('page-label');
  const prevEl = document.getElementById('page-prev');
  const nextEl = document.getElementById('page-next');
  const sourceEl = document.getElementById('board-source');
  const sourceLabelEl = document.getElementById('board-source-label');
  const categoryButtons = Array.from(document.querySelectorAll('.cat'));

  const state = {
    category: 'economy',
    metric: 'networth',
    period: 'all-time',
    page: 1,
    query: ''
  };

  let requestSeq = 0;

  /* ------------------------------------------------------------- rendering */

  function setSource(source) {
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
    li.style.setProperty('--delay', `${Math.min((rank - 1) % PAGE_SIZE, 9) * 26}ms`);

    const rankEl = document.createElement('span');
    rankEl.className = 'rank';
    if (!state.query.trim() && rank <= 3) rankEl.classList.add(`rank-${rank}`);
    rankEl.textContent = String(rank);

    const playerEl = document.createElement('span');
    playerEl.className = 'player';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.style.setProperty('--h', String(AVATAR_HUES[hash(entry.player) % AVATAR_HUES.length]));
    avatar.textContent = initials(entry.player);
    const names = document.createElement('span');
    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = entry.player;
    const subEl = document.createElement('span');
    subEl.className = 'player-sub';
    subEl.textContent = `${numberFormat.format(entry.samples)} ${metric.sample}`;
    names.append(nameEl, subEl);
    playerEl.append(avatar, names);

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    const strong = document.createElement('strong');
    strong.textContent = formatValue(entry.value, metric);
    const unit = document.createElement('span');
    unit.textContent = metric.unitLabel;
    valueEl.append(strong, unit);

    li.append(rankEl, playerEl, valueEl);
    return li;
  }

  function render(result) {
    const metric = METRICS[state.metric];
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
      ? `${result.matched} ${result.matched === 1 ? 'result' : 'results'} for “${query}” · ${PERIOD_LABELS[state.period]}`
      : `Top ${start}–${end} of ${numberFormat.format(result.total)} consenting players · ${PERIOD_LABELS[state.period]}`;

    const pageCount = Math.max(result.pageCount || state.page, state.page);
    pageLabelEl.textContent = `Page ${state.page} of ${pageCount}`;
    prevEl.disabled = state.page <= 1;
    nextEl.disabled = !result.entries.length || state.page >= pageCount;
  }

  async function refresh() {
    const seq = ++requestSeq;
    if (LIVE_ENDPOINT) skeleton();

    let result = null;
    let offline = false;

    if (LIVE_ENDPOINT) {
      try {
        result = await liveResult();
      } catch {
        offline = true;
      }
    }

    if (!result) {
      result = demoResult();
      if (offline) result.source = 'offline';
    }

    if (seq !== requestSeq) return;
    render(result);
  }

  /* ------------------------------------------------------------- controls */

  function metricOptions(category) {
    selectEl.innerHTML = '';
    CATEGORIES.find((item) => item.id === category).metrics.forEach((id) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = METRICS[id].label;
      selectEl.appendChild(option);
    });
    selectEl.value = state.metric;
  }

  function selectCategory(category) {
    state.category = category;
    state.metric = CATEGORIES.find((item) => item.id === category).metrics[0];
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
    Array.from(periodEl.querySelectorAll('button')).forEach((button) => {
      const active = button.dataset.period === period;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    refresh();
  }

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

  let searchTimer = 0;
  searchEl.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = searchEl.value;
      state.page = 1;
      refresh();
    }, 160);
  });

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

  /* -------------------------------------------------------------- chrome */

  const header = document.getElementById('site-header');
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    mobileMenu.hidden = true;
  }

  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    if (open) {
      closeMenu();
    } else {
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

  const revealTargets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    revealTargets.forEach((target) => observer.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  }

  /* --------------------------------------------------------------- start */

  metricOptions(state.category);
  refresh();
})();
