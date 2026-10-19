# skymyce.github.io

Marketing and leaderboard site for **Sky-Myce**, a client-side Fabric mod for Hypixel SkyBlock.

Static, dependency-free site: `index.html`, `styles.css`, `app.js`, and `assets/`.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish with GitHub Pages

1. Push this repository's `main` branch.
2. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose `main` and `/ (root)`, then save.

`.nojekyll` is included so asset paths are served untouched.

## Leaderboards

The board UI ships with **illustrative sample data** so the page works before the
public feed exists. Everything about the board — categories, metrics, periods,
search, paging — is functional against that local data.

To show real rankings, expose a public read-only endpoint (the mod's
`/community/leaderboard` route requires an authenticated community session, so
publish a read-only mirror from the relay or a small worker) and define it
before `app.js` loads, in `index.html`:

```html
<script>window.SKYMYCE_LIVE_ENDPOINT = "https://example.com/leaderboard";</script>
```

The endpoint must send CORS headers and accept these query parameters:
`category`, `metric`, `period`, `page`, `limit`, `search`.

Expected JSON (only these fields are read):

```json
{
  "ok": true,
  "total": 246,
  "hasNext": true,
  "updatedAt": 1760000000000,
  "entries": [
    { "player": "Cessna808", "value": 4820000000, "samples": 14, "updatedAt": 1759999000000 }
  ]
}
```

If the endpoint fails, the page falls back to preview data and the source badge
switches to “Offline preview”. With no endpoint configured, it reads
“Preview data”.

## Updating content

| What | Where |
| --- | --- |
| Headlines, features, install steps, FAQ | `index.html` |
| Colors, typography, layout | `styles.css` |
| Leaderboard metrics + demo rankings | `app.js` (`METRICS`, `PLAYERS`) |
| Version string | `index.html` (hero eyebrow + install card) |
| Social preview image | `assets/og.png` |
