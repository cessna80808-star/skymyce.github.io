/* ==========================================================================
   Sky-Myce — backend client
   --------------------------------------------------------------------------
   Every network call the site makes goes through this file. With no
   `apiBase` configured, callers get `{ offline: true }` results and the UI
   falls back to preview data. With a base configured, requests are made
   against the contract documented in README.md.

   Public read (no credentials):
     GET /leaderboard   ?category&metric&period&page&limit&search
     GET /announcements ?limit
     GET /players/{name}
     GET /stats
     GET /config

   Admin (cookie session, requires Discord OAuth login):
     GET    /admin/session
     POST   /auth/logout
     GET    /admin/overview
     GET    /admin/announcements
     POST   /admin/announcements
     PATCH  /admin/announcements/{id}
     DELETE /admin/announcements/{id}
     GET    /admin/players ?query&page&limit
     PATCH  /admin/players/{name}
     GET    /admin/config
     PUT    /admin/config
     GET    /admin/modules
     GET    /admin/modules/{id}

   Exposes: window.SkyAPI
   ========================================================================== */

(() => {
  'use strict';

  const cfg = window.SKYMYCE || {};
  const LEGACY_ENDPOINT = window.SKYMYCE_LIVE_ENDPOINT || '';
  const BASE = String(cfg.apiBase || '').replace(/\/+$/, '');

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status || 0;
      this.payload = payload || null;
    }
  }

  function isConfigured() {
    return Boolean(BASE || LEGACY_ENDPOINT);
  }

  function buildUrl(path, params) {
    const base = path.startsWith('http') || LEGACY_ENDPOINT ? path : `${BASE}${path}`;
    const url = new URL(base, window.location.href);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  async function request(method, path, { params, body, credentials = 'omit', signal, timeoutMs = 15000 } = {}) {
    if (!isConfigured()) {
      const error = new ApiError('No backend configured', 0, null);
      error.offline = true;
      throw error;
    }

    const controller = new AbortController();
    const timer = timeoutMs ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

    let response;
    try {
      response = await fetch(buildUrl(path, params), {
        method,
        credentials,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (cause) {
      const error = new ApiError('Network request failed', 0, null);
      error.offline = true;
      error.cause = cause;
      throw error;
    } finally {
      window.clearTimeout(timer);
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message = (payload && (payload.error || payload.message)) || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  /* --------------------------------------------------------- public reads */

  async function getLeaderboard({ category, metric, period, page, limit, search } = {}) {
    const path = LEGACY_ENDPOINT || '/leaderboard';
    const data = await request('GET', path, {
      params: { category, metric, period, page, limit, search }
    });
    if (!data || data.ok !== true || !Array.isArray(data.entries)) {
      throw new ApiError('Unexpected leaderboard response', 200, data);
    }
    return {
      entries: data.entries.map((entry) => ({
        player: String(entry.player ?? 'Anonymous player'),
        value: Number(entry.value) || 0,
        samples: Number(entry.samples ?? entry.sampleSize ?? 0) || 0,
        updatedAt: Number(entry.updatedAt ?? data.updatedAt ?? Date.now())
      })),
      total: Number(data.total) || data.entries.length,
      hasNext: Boolean(data.hasNext),
      updatedAt: Number(data.updatedAt) || Date.now()
    };
  }

  async function getAnnouncements({ limit } = {}) {
    const data = await request('GET', '/announcements', { params: { limit } });
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.announcements) ? data.announcements : [];
    return {
      items: items.map((item) => ({
        id: String(item.id ?? ''),
        title: String(item.title ?? 'Untitled'),
        body: String(item.body ?? ''),
        level: ['release', 'alert', 'info'].includes(item.level) ? item.level : 'info',
        pinned: Boolean(item.pinned),
        author: item.author ? String(item.author) : '',
        publishedAt: Number(item.publishedAt) || Date.now()
      })),
      updatedAt: Number(data?.updatedAt) || Date.now()
    };
  }

  async function getPlayer(name) {
    const data = await request('GET', `/players/${encodeURIComponent(name)}`);
    const player = data?.player || data;
    if (!player || typeof player !== 'object' || !player.name) {
      throw new ApiError('Unexpected player response', 200, data);
    }
    return normalizePlayer(player);
  }

  async function getStats() {
    const data = await request('GET', '/stats');
    return {
      players: Number(data?.players ?? data?.totalPlayers ?? 0) || 0,
      sharedRecords: Number(data?.sharedRecords ?? data?.records ?? 0) || 0,
      trackedMetrics: Number(data?.trackedMetrics ?? data?.metrics ?? 0) || 0,
      uptimeDays: Number(data?.uptimeDays ?? 0) || 0,
      updatedAt: Number(data?.updatedAt) || Date.now()
    };
  }

  async function getSiteConfig() {
    const data = await request('GET', '/config');
    return data && typeof data === 'object' ? data : {};
  }

  function normalizePlayer(player) {
    return {
      name: String(player.name),
      uuid: player.uuid ? String(player.uuid) : '',
      status: ['active', 'paused', 'banned'].includes(player.status) ? player.status : 'active',
      firstSeen: Number(player.firstSeen) || 0,
      lastSeen: Number(player.lastSeen) || 0,
      sharing: player.sharing && typeof player.sharing === 'object' ? { ...player.sharing } : {},
      ranks: Array.isArray(player.ranks) ? player.ranks.map((rank) => ({
        metric: String(rank.metric ?? ''),
        label: rank.label ? String(rank.label) : window.Sky ? window.Sky.titleCase(rank.metric) : String(rank.metric ?? ''),
        period: String(rank.period ?? 'all-time'),
        rank: Number(rank.rank) || 0,
        value: Number(rank.value) || 0
      })) : [],
      badges: Array.isArray(player.badges) ? player.badges.map(String) : [],
      sampleCount: Number(player.sampleCount ?? player.samples ?? 0) || 0
    };
  }

  /* ----------------------------------------------------------------- admin */

  const admin = {
    async session() {
      try {
        const data = await request('GET', '/admin/session', { credentials: 'include' });
        if (!data || data.ok !== true || !data.admin) return null;
        return {
          id: String(data.admin.id ?? ''),
          name: String(data.admin.name ?? 'Admin'),
          avatar: data.admin.avatar ? String(data.admin.avatar) : '',
          role: String(data.admin.role ?? 'admin')
        };
      } catch (error) {
        if (error.status === 401 || error.status === 403) return null;
        throw error;
      }
    },

    loginUrl(returnTo) {
      const url = buildUrl('/auth/discord/login');
      url.searchParams.set('return_to', returnTo || window.location.href);
      return url.toString();
    },

    async logout() {
      await request('POST', '/auth/logout', { credentials: 'include' });
    },

    async overview() {
      const data = await request('GET', '/admin/overview', { credentials: 'include' });
      return {
        players: Number(data?.players ?? 0) || 0,
        banned: Number(data?.banned ?? 0) || 0,
        announcements: Number(data?.announcements ?? 0) || 0,
        pendingReports: Number(data?.pendingReports ?? 0) || 0,
        lastSyncAt: Number(data?.lastSyncAt) || Date.now(),
        raw: data
      };
    },

    async listAnnouncements({ limit } = {}) {
      const data = await request('GET', '/admin/announcements', { credentials: 'include', params: { limit } });
      const items = Array.isArray(data?.items) ? data.items : [];
      return items.map((item) => ({
        id: String(item.id ?? ''),
        title: String(item.title ?? ''),
        body: String(item.body ?? ''),
        level: ['release', 'alert', 'info'].includes(item.level) ? item.level : 'info',
        pinned: Boolean(item.pinned),
        author: item.author ? String(item.author) : '',
        publishedAt: Number(item.publishedAt) || Date.now()
      }));
    },

    createAnnouncement(draft) {
      return request('POST', '/admin/announcements', { credentials: 'include', body: draft });
    },

    updateAnnouncement(id, patch) {
      return request('PATCH', `/admin/announcements/${encodeURIComponent(id)}`, { credentials: 'include', body: patch });
    },

    deleteAnnouncement(id) {
      return request('DELETE', `/admin/announcements/${encodeURIComponent(id)}`, { credentials: 'include' });
    },

    async listPlayers({ query = '', page = 1, limit = 25 } = {}) {
      const data = await request('GET', '/admin/players', { credentials: 'include', params: { query, page, limit } });
      return {
        items: (Array.isArray(data?.items) ? data.items : []).map(normalizePlayer),
        total: Number(data?.total) || 0,
        page: Number(data?.page) || page,
        hasNext: Boolean(data?.hasNext)
      };
    },

    updatePlayer(name, patch) {
      return request('PATCH', `/admin/players/${encodeURIComponent(name)}`, { credentials: 'include', body: patch });
    },

    async getConfig() {
      const data = await request('GET', '/admin/config', { credentials: 'include' });
      return (data && typeof data === 'object' && data.config && typeof data.config === 'object') ? data.config : (data || {});
    },

    async putConfig(config) {
      const data = await request('PUT', '/admin/config', { credentials: 'include', body: { config } });
      return (data && typeof data === 'object' && data.config) ? data.config : (data || {});
    },

    async listModules() {
      const data = await request('GET', '/admin/modules', { credentials: 'include' });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.modules) ? data.modules : [];
      return items.map((item) => ({
        id: String(item.id ?? ''),
        label: String(item.label ?? 'Module'),
        description: String(item.description ?? ''),
        icon: item.icon ? String(item.icon) : '',
        badge: item.badge ? String(item.badge) : ''
      })).filter((item) => item.id);
    },

    getModule(id) {
      return request('GET', `/admin/modules/${encodeURIComponent(id)}`, { credentials: 'include' });
    }
  };

  window.SkyAPI = {
    ApiError,
    base: BASE,
    isConfigured,
    getLeaderboard,
    getAnnouncements,
    getPlayer,
    getStats,
    getSiteConfig,
    admin
  };
})();
