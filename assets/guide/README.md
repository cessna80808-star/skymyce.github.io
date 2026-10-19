# Guide media

Drop screenshots and clips here and they appear on `guide.html` automatically.
Match the **slot id** from `js/guide-content.js` to the filename.

## File names

| Slot kind | Accepted files | Example |
| --- | --- | --- |
| image | `<id>.png` → `.webp` → `.jpg` → `.jpeg` → `.gif` | `party-finder-board.png` |
| video | `<id>.mp4` → `.webm`, plus poster `<id>.jpg` → `.png` → `.webp` | `goldor-leap.mp4` + `goldor-leap.jpg` |

First extension found wins, in the order listed. Missing media renders as a
dashed “capture pending” slot that names the exact path it expects, so a
half-finished guide still reads cleanly.

List every slot and its status from the site folder:

```sh
node tools/guide-audit.mjs          # table report
node tools/guide-audit.mjs --json   # machine-readable
```

Adding a new slot is one entry in `js/guide-content.js` — no manifest, no
build step, no code changes.

## Capture standards

**Screenshots**

- 2560×1440 (or 1920×1080), GUI scale 2, full brightness.
- Use Minecraft's `F2`; captures land in `screenshots/`.
- Windowed 1:1 — no desktop, no Discord overlays, no other windows.
- Crop nothing. The guide frames at 16:9 and scales down for the web.
- Keep the relevant tooltip or chat line visible; hide the mouse pointer
  unless the pointer is the point of the shot.

**Clips**

- Under 20 seconds. Show the moment, nothing else.
- No music, no voice-over — the guide stays readable without sound.
- Record at 60 fps if the motion matters (run flow, graphs), 30 fps otherwise.
- Trim start/end tightly; a clip should loop-read cleanly.

**Compression**

```sh
# stills — prefer WebP, fall back to optimized PNG
cwebp -q 82 shot.png -o party-finder-board.webp
pngquant --quality 65-85 shot.png

# clips — H.264 MP4, web-friendly, plus a poster frame
ffmpeg -i raw.mkv -vf "scale=1600:-2" -c:v libx264 -pix_fmt yuv420p \
  -crf 23 -preset slow -movflags +faststart goldor-leap.mp4
ffmpeg -i goldor-leap.mp4 -ss 00:00:02 -vframes 1 -vf "scale=1600:-2" goldor-leap.jpg

# optional WebM sibling for smaller files
ffmpeg -i raw.mkv -vf "scale=1600:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 goldor-leap.webm
```

Keep stills under ~500 KB and clips under ~4 MB where possible.

## Slot inventory

The full, always-current list lives in `js/guide-content.js` (every `media`
entry). The admin panel's Overview also renders it as a live capture
checklist: **admin.html → Overview → Guide capture checklist**.
