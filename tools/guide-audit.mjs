#!/usr/bin/env node
/* ==========================================================================
   Sky-Myce — guide media audit
   --------------------------------------------------------------------------
   Reads js/guide-content.js, scans assets/guide/, and reports every media
   slot as present or missing (with the expected filename).

     node tools/guide-audit.mjs          table report, exit 1 if anything is missing
     node tools/guide-audit.mjs --json   machine-readable output

   Run from the site root (the folder with index.html).
   ========================================================================== */

import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm'];
const POSTER_EXTENSIONS = ['jpg', 'png', 'webp'];

const root = process.cwd();
const mediaDir = path.join(root, 'assets', 'guide');
const contentFile = path.join(root, 'js', 'guide-content.js');
const asJson = process.argv.includes('--json');

if (!existsSync(contentFile)) {
  console.error(`✗ ${contentFile} not found — run this from the site root.`);
  process.exit(2);
}

/* Load the guide content (it is a plain script assigning to window). */
globalThis.window = globalThis;
await import(pathToFileURL(contentFile).href);
const guide = globalThis.SKYMYCE_GUIDE;
if (!guide || !Array.isArray(guide.chapters)) {
  console.error('✗ js/guide-content.js did not define window.SKYMYCE_GUIDE with chapters.');
  process.exit(2);
}

let files = [];
try {
  files = await readdir(mediaDir);
} catch {
  files = [];
}
const fileSet = new Set(files.map((name) => name.toLowerCase()));

function candidates(media) {
  if (media.src) return [media.src];
  if (!media.id) return [];
  if (media.kind === 'video') {
    return [
      ...VIDEO_EXTENSIONS.map((ext) => `assets/guide/${media.id}.${ext}`),
      ...POSTER_EXTENSIONS.map((ext) => `assets/guide/${media.id}.${ext} (poster)`)
    ];
  }
  return IMAGE_EXTENSIONS.map((ext) => `assets/guide/${media.id}.${ext}`);
}

function hasFile(candidate) {
  const isPoster = candidate.endsWith(' (poster)');
  const clean = candidate.replace(' (poster)', '');
  if (candidate.includes('/') && !clean.startsWith('assets/guide/')) return existsSync(path.join(root, clean));
  const name = path.basename(clean).toLowerCase();
  return fileSet.has(name) && (!isPoster || true);
}

const rows = [];
for (const chapter of guide.chapters) {
  for (const step of chapter.steps) {
    for (const media of step.media || []) {
      const list = candidates(media);
      const found = list.filter((candidate) => hasFile(candidate));
      const required = media.kind === 'video'
        ? list.filter((candidate) => candidate.endsWith('.mp4') || candidate.endsWith('.webm'))
        : list;
      const requiredFound = required.some((candidate) => hasFile(candidate));
      rows.push({
        chapter: chapter.title,
        step: step.title,
        kind: media.kind === 'video' ? 'MP4' : 'PNG',
        id: media.id || '(inline src)',
        pending: Boolean(media.pending),
        present: requiredFound,
        expected: list[0] || '',
        found
      });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ total: rows.length, missing: rows.filter((row) => !row.present).length, rows }, null, 2));
} else {
  const pad = (value, width) => String(value).padEnd(width).slice(0, width);
  console.log(`Sky-Myce guide media — ${rows.length} slot(s)\n`);
  console.log(`${pad('KIND', 5)} ${pad('STATUS', 7)} ${pad('CHAPTER', 22)} ${pad('STEP', 26)} EXPECTED`);
  console.log('-'.repeat(110));
  for (const row of rows) {
    console.log(`${pad(row.kind, 5)} ${pad(row.present ? 'ok' : 'missing', 7)} ${pad(row.chapter, 22)} ${pad(row.step, 26)} ${row.expected}`);
  }
  const missing = rows.filter((row) => !row.present).length;
  console.log(`\n${rows.length - missing} present · ${missing} missing`);
  console.log('Missing media renders as a “capture pending” slot on guide.html.');
}

process.exit(rows.every((row) => row.present) ? 0 : 1);
