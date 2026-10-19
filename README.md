# skymyce.github.io

Marketing, guide, and leaderboard site for **Sky-Myce**, a client-side Fabric
mod for Hypixel SkyBlock.

Static, dependency-free site: `index.html`, `guide.html`, `admin.html`,
`styles.css`, `guide.css`, `admin.css`, `js/`, and `assets/`. No build step.

- **Dark by default (and only).**
- **Runs fully without a backend** — every feature falls back to preview data.
- **Admin panel** (`admin.html`) talks to the mod backend with a Discord OAuth
  cookie session.
- **Player guide** (`guide.html`) renders from `js/guide-content.js` with
  drop-in media slots for screenshots and clips.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a server rather than opening files
directly — `file://` blocks some of the JS.

## File map

| Path | Purpose |
| --- | --- |
| `js/config.js` | Site config: backend base URL, links, version, feature flags |
| `js/core.js` | Shared utilities (formatting, hashing, DOM helpers) |
| `js/api.js` | Every backend call, with offline fallback behavior |
| `js/demo.js` | Deterministic preview data (boards, announcements, profiles, stats) |
| `js/motion.js` | Animation engine (`data-reveal`, `data-count`, `data-tilt`, …) |
| `js/app.js` | Homepage behavior |
| `js/guide-content.js` | The player guide content — edit this to change the guide |
| `js/guide.js` | Guide renderer (TOC, search, progress, media, lightbox) |
| `js/admin.js` | Admin panel (sections registry, CRUD, auth gate) |
| `assets/guide/` | Guide screenshots and clips + capture standards |
| `tools/guide-audit.mjs` | Lists every guide media slot as present/missing |

## Backend

Point the site at the mod backend in `js/config.js`:

```js
window.SKYMYCE = { apiBase: 'https://api.sky-myce.example', /* … */ };
```

Leave `apiBase` blank to keep everything in preview mode. The legacy
`window.SKYMYCE_LIVE_ENDPOINT` (leaderboard-only) is still honored.

All responses are JSON. Public endpoints need CORS; admin endpoints need
CORS **with credentials** (`Access-Control-Allow-Credentials: true` and an
explicit `Access-Control-Allow-Origin`, not `*`).

### Public endpoints

```
GET /leaderboard?category&metric&period&page&limit&search
GET /announcements?limit
GET /players/{name}
GET /stats
GET /config
```

| Endpoint | Shape (fields the site reads) |
| --- | --- |
| `/leaderboard` | `{ ok, total, hasNext, updatedAt, entries: [{ player, value, samples, updatedAt }] }` |
| `/announcements` | `{ ok, updatedAt, items: [{ id, title, body, level: "info"\|"release"\|"alert", pinned, author, publishedAt }] }` |
| `/players/{name}` | `{ ok, player: { name, uuid, status, firstSeen, lastSeen, sharing: { economy, dungeons, rng, … }, ranks: [{ metric, label, period, rank, value }], badges, sampleCount } }` |
| `/stats` | `{ ok, players, sharedRecords, trackedMetrics, uptimeDays, updatedAt }` |
| `/config` | `{ ok, version, builds, links, flags, boards }` — same keys as `js/config.js` |

Anything unreachable falls back to preview data and the badge on the board
switches to “Offline preview”. With no `apiBase`, it reads “Preview data”.

### Admin endpoints + Discord OAuth

Auth flow on the backend:

1. `admin.html` redirects to `GET {apiBase}/auth/discord/login?return_to={admin URL}`.
2. The backend runs the Discord OAuth dance, checks the user's roles, sets an
   httpOnly session cookie, and redirects back to `return_to`.
3. `admin.html` verifies with `GET /admin/session` (cookie) on load.

```
GET    /admin/session                     → { ok, admin: { id, name, avatar, role } } | 401/403
POST   /auth/logout
GET    /admin/overview                    → { ok, players, banned, announcements, pendingReports, lastSyncAt }
GET    /admin/announcements
POST   /admin/announcements               body: { title, body, level, pinned }
PATCH  /admin/announcements/{id}
DELETE /admin/announcements/{id}
GET    /admin/players?query&page&limit
PATCH  /admin/players/{name}              body: { status: "active"|"paused"|"banned", sharing? }
GET    /admin/config
PUT    /admin/config                      body: { config }
GET    /admin/modules                     → { ok, items: [{ id, label, description, icon, badge }] }
GET    /admin/modules/{id}                → rendered verbatim (fields list or JSON)
```

### Admin panel

Open `admin.html`.

- **No backend configured** → the gate offers preview mode; every screen works
  against local mock data and nothing is saved.
- **Signed in** → real endpoints above. Sign-out hits `/auth/logout`.
- **Sections** live in the `SECTIONS` array at the bottom of `js/admin.js`:
  `{ id, label, icon, render(container, ctx) }`. Add an object, get a rail
  entry and `#/id` routing for free.
- **Modules** are backend-defined — add tooling on the backend and it appears
  under “Modules” without touching the site. The panel renders `fields`
  (`[{ label, value }]`) as a key/value list, or any JSON payload raw.
- Overview also renders the **guide capture checklist** — every pending media
  slot in the guide with the exact filename it expects.

## Player guide

Content lives in `js/guide-content.js`; the renderer (`js/guide.js`) handles
the table of contents, anchors, search, per-step progress (saved to
`localStorage`), video players, image lightbox, and media slots.

**Media convention** — files in `assets/guide/` are matched by slot id:

- image slot `party-finder` → `party-finder.png` → `.webp` → `.jpg` → `.gif`
- video slot `goldor-leap` → `goldor-leap.mp4` → `.webm` (+ poster `.jpg`)

Missing files render as “capture pending” slots naming the expected path, so
the guide stays presentable while media is still being captured.

**Capture pipeline** — see `assets/guide/README.md` for capture standards
(resolution, GUI scale, clip length, ffmpeg/cwebp recipes). Audit coverage
from the site root:

```sh
node tools/guide-audit.mjs          # human-readable table
node tools/guide-audit.mjs --json   # machine-readable
```

Adding a chapter or slot is one object in `js/guide-content.js` — the TOC,
anchors, search, and checklist all update automatically.

## Publish with GitHub Pages

1. Push this repository's `main` branch.
2. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose `main` and `/ (root)`, then save.

`.nojekyll` is included so asset paths are served untouched.
