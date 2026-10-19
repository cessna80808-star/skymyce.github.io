/* ==========================================================================
   Sky-Myce — site configuration
   --------------------------------------------------------------------------
   Single place to point the site at the mod backend and to tweak links,
   version strings, and feature flags. Loaded before every other script.

   Backend: leave `apiBase` blank to run the whole site in preview mode.
   Set it to the relay's public origin (no trailing slash) to go live, e.g.:

     apiBase: 'https://api.sky-myce.example'

   The legacy global `window.SKYMYCE_LIVE_ENDPOINT` is still honored for the
   leaderboard when set in index.html before these scripts load.
   ========================================================================== */

window.SKYMYCE = Object.assign({
  apiBase: '',

  version: '2.5.15',
  builds: {
    minecraft: '26.1.2',
    java: '25',
    loader: 'Fabric'
  },

  links: {
    download: 'https://github.com/cessna80808-star/Sky-Myce/releases/latest',
    releases: 'https://github.com/cessna80808-star/Sky-Myce/releases',
    guide: 'guide.html',
    manual: 'https://github.com/cessna80808-star/Sky-Myce/blob/main/MANUAL.md',
    source: 'https://github.com/cessna80808-star/Sky-Myce',
    issues: 'https://github.com/cessna80808-star/Sky-Myce/issues',
    discord: 'https://discord.gg/9TBBCBNtSZ'
  },

  boards: {
    pageSize: 10
  },

  // Homepage feature switches. The backend can override these via /config.
  flags: {
    lookup: true,
    announcements: true,
    stats: true,
    guide: true
  },

  admin: {
    title: 'Sky-Myce Admin',
    // How long a fetched admin session is trusted before it is re-checked.
    sessionRefreshMs: 10 * 60 * 1000
  }
}, window.SKYMYCE || {});
