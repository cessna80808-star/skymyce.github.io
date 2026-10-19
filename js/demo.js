/* ==========================================================================
   Sky-Myce — preview data
   --------------------------------------------------------------------------
   Deterministic sample data used whenever the backend is not configured or
   not reachable, so every feature on the site is fully explorable before the
   public feed exists. Mirrors the shapes returned by js/api.js.

   Exposes: window.SkyDemo
   ========================================================================== */

(() => {
  'use strict';

  const { hash, mulberry32 } = window.Sky;

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

  function leaderboard(state, pageSize) {
    const ranked = rankedData(state.metric, state.period);
    const query = String(state.query || '').trim().toLowerCase();
    const filtered = query ? ranked.filter((entry) => entry.player.toLowerCase().includes(query)) : ranked;

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(state.page, pageCount);
    const start = (page - 1) * pageSize;

    return {
      entries: filtered.slice(start, start + pageSize),
      matched: filtered.length,
      total: query ? filtered.length : 180 + (hash(state.metric + state.period) % 190),
      pageCount,
      page,
      source: 'preview',
      updatedAt: ranked[0] ? ranked[0].updatedAt : Date.now()
    };
  }

  /* ------------------------------------------------------ site-wide extras */

  const ANNOUNCEMENTS = [
    {
      id: 'demo-315',
      title: 'Sky-Myce 2.5.15 — Goldor coordination',
      body: 'Phase 3 terminal assignments now broadcast as short smt1: calls, with timed pre-leaps and per-class job hints. Update from the releases page.',
      level: 'release',
      pinned: true,
      author: 'Cessna808',
      publishedAt: Date.now() - 1000 * 60 * 60 * 26
    },
    {
      id: 'demo-boards',
      title: 'Weekly boards reset in 2 days',
      body: 'Bazaar profit and dungeon chest profit boards roll over at the weekly reset. Timed run averages persist for 7 days of samples.',
      level: 'info',
      pinned: false,
      author: 'MyceliumMage',
      publishedAt: Date.now() - 1000 * 60 * 60 * 9
    },
    {
      id: 'demo-reports',
      title: 'RNG report window extended',
      body: 'Supported drop reports from the current content rotation are now accepted for 30 days instead of 14. Unsupported items still stay excluded from boards.',
      level: 'info',
      pinned: false,
      author: 'SporeLord',
      publishedAt: Date.now() - 1000 * 60 * 47
    }
  ];

  function stats() {
    return {
      players: 18432,
      sharedRecords: 41_200_000 + (hash('records') % 900_000),
      trackedMetrics: 8,
      uptimeDays: 412,
      updatedAt: Date.now() - 1000 * 60 * 3
    };
  }

  /* --------------------------------------------------------- player lookup */

  const SHARING_KEYS = ['economy', 'dungeons', 'rng', 'chat', 'events'];

  function profile(name) {
    const clean = String(name || '').trim() || 'Cessna808';
    const r = mulberry32(hash(`profile:${clean.toLowerCase()}`));

    const rankPool = Object.entries(METRICS);
    const ranks = rankPool
      .filter(() => r() > 0.42)
      .slice(0, 4)
      .map(([metricId, metric]) => {
        const period = ['all-time', 'weekly', 'monthly'][Math.floor(r() * 3)];
        const spread = metric.range[1] - metric.range[0];
        const value = metric.range[0] + spread * (0.3 + r() * 0.7);
        return {
          metric: metricId,
          label: metric.label,
          period,
          rank: 1 + Math.floor(r() * 240),
          value: metric.format === 'time' ? Math.round(value / 10) * 10 : Math.round(value)
        };
      })
      .sort((a, b) => a.rank - b.rank);

    const sharing = {};
    for (const key of SHARING_KEYS) sharing[key] = r() > 0.28;

    return {
      name: clean,
      uuid: '',
      status: r() > 0.96 ? 'paused' : 'active',
      firstSeen: Date.now() - Math.floor(90 + r() * 500) * 86400000,
      lastSeen: Date.now() - Math.floor(r() * 60) * 60000,
      sharing,
      ranks,
      badges: r() > 0.6 ? ['Founding sharer'] : [],
      sampleCount: 120 + Math.floor(r() * 4800),
      source: 'preview'
    };
  }

  window.SkyDemo = {
    categories: CATEGORIES,
    metrics: METRICS,
    players: PLAYERS,
    periodLabels: PERIOD_LABELS,
    avatarHues: AVATAR_HUES,
    leaderboard,
    rankedData,
    announcements: ANNOUNCEMENTS,
    stats,
    profile,
    sharingKeys: SHARING_KEYS
  };
})();
