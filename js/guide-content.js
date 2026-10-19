/* ==========================================================================
   Sky-Myce — player guide content
   --------------------------------------------------------------------------
   This is the whole guide. Edit it here; guide.html renders whatever is in
   SKYMYCE_GUIDE. No build step, no framework.

   HOW TO EDIT (human or AI):

   chapters: [{
     id: 'kebab-case-id',            // used for anchors and the table of contents
     title: 'Chapter title',
     icon: 'download',                // one of the icon keys in js/guide.js
     summary: 'One sentence under the chapter title.',
     steps: [{
       id: 'kebab-case-id',           // anchor: guide.html#kebab-case-id
       title: 'Step title',
       shortcuts: ['F2', '/sm'],      // optional keyboard/command chips
       body: [                        // blocks, rendered in order:
         { p: 'Paragraph with `code`, **bold**, and [links](https://…).' },
         { ul: ['Bullet one', 'Bullet two'] },
         { ol: ['First', 'Second'] },
         { code: 'ffmpeg -i raw.mkv …' },
         { callout: { tone: 'tip', title: 'Optional title', text: '…' } }  // tone: tip | info | warn
       ],
       media: [{                      // rendered under the step, in a grid
         id: 'party-finder-board',    // file slug — see assets/guide/README.md
         kind: 'image',               // 'image' or 'video'
         caption: 'Shown in the board screen.',
         alt: 'Accessible description',
         src: 'assets/guide/custom-file.png',  // optional explicit override
         pending: true                // true = capture still needed (shows a slot)
       }],
       links: [{ label: 'Open the Discord', href: 'https://…' }]   // optional
     }]
   }]

   MEDIA CONVENTION — files live in assets/guide/ and are found automatically:
     image slot id "party-finder"  →  party-finder.png | .webp | .jpg | .gif
     video slot id "goldor-leap"   →  goldor-leap.mp4 | .webm (+ poster .jpg)
   Drop the file in with the right name and it appears — no code changes.
   Missing files render as "capture pending" slots showing the expected path.
   ========================================================================== */

window.SKYMYCE_GUIDE = {
  version: '2.5.15',
  updated: 'October 2026',
  intro: 'Everything Sky-Myce does, chapter by chapter — from your first launch to Goldor phase 3, HUD layouts, and the community boards. Media slots mark where screenshots and clips go; drop files into assets/guide/ and they appear here automatically.',

  chapters: [
    {
      id: 'getting-started',
      title: 'Getting started',
      icon: 'download',
      summary: 'From a fresh Fabric profile to a configured /sm menu.',
      steps: [
        {
          id: 'install',
          title: 'Install the mod',
          shortcuts: [],
          body: [
            { p: 'Sky-Myce ships as a standalone JAR. Install **Fabric** for the supported Minecraft version, keep your Fabric API dependencies, then drop the mod JAR into your `mods` folder.' },
            { ul: [
              'Fabric loader for the supported Minecraft version, Java 25',
              '`Sky-Myce-x.y.z.jar` in `.minecraft/mods`',
              'Fabric API installed and up to date'
            ] },
            { callout: { tone: 'info', text: 'Migrating from the old loader setup? Remove the old loader JAR first, then start normally. Your settings are kept.' } }
          ],
          media: [
            { id: 'install-jar', kind: 'image', caption: 'The mod JAR beside Fabric API in the mods folder.', alt: 'File manager showing the mods folder with the Sky-Myce and Fabric API JARs', pending: true }
          ],
          links: [{ label: 'Latest release', href: 'https://github.com/cessna80808-star/Sky-Myce/releases/latest' }]
        },
        {
          id: 'first-launch',
          title: 'First launch',
          shortcuts: [],
          body: [
            { p: 'Start the game with the Fabric profile. Sky-Myce initializes quietly — no chat spam, no setup wizard. If everything is healthy you will see a single line in the log and nothing else.' },
            { p: 'Open the mod menu any time with `/sm`. The first screen shows the feature list with everything you can switch on individually.' }
          ],
          media: [
            { id: 'first-launch-chat', kind: 'image', caption: 'The one-line startup message in the game log.', alt: 'Minecraft chat showing the Sky-Myce startup line', pending: true }
          ]
        },
        {
          id: 'sm-menu',
          title: 'The /sm menu',
          shortcuts: ['/sm'],
          body: [
            { p: '`/sm` is the single entry point for everything: features, HUD layout, tracker, community settings, and diagnostics. Left side is categories, right side is the settings for whatever you picked.' },
            { ul: [
              '`/sm` — open the main menu',
              '`/sm hud` — jump straight to the HUD editor',
              '`/sm leaderboard` — the in-game boards',
              '`/sm config` — search every setting by name'
            ] }
          ],
          media: [
            { id: 'sm-menu-overview', kind: 'image', caption: 'The main /sm screen, features list on the left.', alt: 'Sky-Myce main menu with feature categories', pending: true }
          ]
        },
        {
          id: 'updates',
          title: 'Updates',
          shortcuts: [],
          body: [
            { p: 'Automatic updates are **off by default**. You can turn them on per-profile in `Options → Updates`, or update manually by swapping the JAR. Release notes mirror to the announcements strip on the homepage.' }
          ],
          media: []
        }
      ]
    },
    {
      id: 'dungeons',
      title: 'Dungeons',
      icon: 'dungeon',
      summary: 'Party Finder matching, chest protection, requeue, and run tracking.',
      steps: [
        {
          id: 'party-finder',
          title: 'Party Finder matcher',
          shortcuts: ['/sm pf'],
          body: [
            { p: 'The matcher watches the Party Finder and highlights parties that fit your saved filters — floor, class needs, and difficulty score. Matches show up as a compact overlay so you do not have to refresh the finder by hand.' },
            { ul: [
              'Save filter presets per floor, e.g. “F7 — S+ oriented”',
              'Missing-player alerts when a party is one slot short',
              'One-key join for the top match'
            ] },
            { callout: { tone: 'tip', text: 'Set your alt floors in the preset list — the matcher cycles them in order when you requeue.' } }
          ],
          media: [
            { id: 'party-finder-board', kind: 'image', caption: 'Match highlighting in the Party Finder.', alt: 'Party Finder with matching parties highlighted by the overlay', pending: true },
            { id: 'party-finder-presets', kind: 'image', caption: 'Filter presets in /sm pf.', alt: 'Filter preset editor in the Sky-Myce party finder settings', pending: true }
          ]
        },
        {
          id: 'chest-safeguard',
          title: 'Chest safeguard',
          shortcuts: [],
          body: [
            { p: 'A dungeon chest reroll costs valuable items. The safeguard blocks the reroll interaction unless you confirm — a misclick cannot cost you the drop.' },
            { ul: [
              'Blocked rerolls show a short chat line explaining why',
              'Hold-to-confirm with a configurable delay',
              'Chest profit estimates are computed before you open, using current bazaar prices'
            ] }
          ],
          media: [
            { id: 'chest-safeguard', kind: 'image', caption: 'A blocked reroll with the confirmation hint.', alt: 'Dungeon chest screen with the reroll blocked by Sky-Myce', pending: true }
          ]
        },
        {
          id: 'requeue',
          title: 'Requeue and run flow',
          shortcuts: ['/sm requeue'],
          body: [
            { p: 'After a run, Sky-Myce can requeue the same party automatically and re-send your ready message. Combine with the matcher to keep floors flowing without touching the menu.' }
          ],
          media: [
            { id: 'requeue-flow', kind: 'video', caption: 'An S+ F7 run ending and requeueing automatically.', alt: 'Screen recording of a run ending and the party requeueing', pending: true }
          ]
        },
        {
          id: 'tracker',
          title: 'Run tracker',
          shortcuts: ['/sm tracker'],
          body: [
            { p: 'Every completed run is recorded locally: time, score, floor, chest outcomes, and collected loot. Personal bests and RNG history live here too — all offline, nothing leaves your machine unless you opt in to sharing.' }
          ],
          media: [
            { id: 'tracker-history', kind: 'image', caption: 'Run history with times and chest profit.', alt: 'Run tracker history view with a list of dungeon runs', pending: true }
          ]
        }
      ]
    },
    {
      id: 'goldor',
      title: 'Goldor phase 3',
      icon: 'goldor',
      summary: 'Terminal assignments, timed pre-leaps, and clean calls.',
      steps: [
        {
          id: 'phase-3-overview',
          title: 'Terminal map',
          shortcuts: [],
          body: [
            { p: 'The Goldor module shows the full phase 3 terminal map with each terminal and the recommended class assignment based on your party composition (S1 Mage, S2 Berserk, S3 Tank, S4 Healer in a standard lineup).' },
            { callout: { tone: 'tip', text: 'Assignments are suggestions — drag any terminal to a different player and the map remembers it for that party.' } }
          ],
          media: [
            { id: 'goldor-overview', kind: 'image', caption: 'The phase 3 terminal map.', alt: 'Goldor phase 3 terminal map with class assignments', pending: true }
          ]
        },
        {
          id: 'smt-calls',
          title: 'smt1: calls',
          shortcuts: [],
          body: [
            { p: 'Timed pre-leaps are broadcast as short `smt1:` messages over the relay — compact enough to never clog chat, structured so every Sky-Myce client renders the same countdown.' },
            { code: 'smt1: S3 12.4 | leap 2.1 | done' },
            { p: 'Clients in the party see a countdown bar instead of parsing text. Players without the mod just see the raw line.' }
          ],
          media: [
            { id: 'goldor-leap', kind: 'video', caption: 'A timed pre-leap with the countdown bar.', alt: 'Clip of a pre-leap call with the Sky-Myce countdown visible', pending: true }
          ]
        }
      ]
    },
    {
      id: 'hud',
      title: 'HUD & interface',
      icon: 'hud',
      summary: 'Widgets, themes, and keeping your frame rate intact.',
      steps: [
        {
          id: 'widgets',
          title: 'Widgets and layout',
          shortcuts: ['/sm hud'],
          body: [
            { p: 'Open the HUD editor with `/sm hud` and drag widgets where you want them. Everything is free-form: health and mana bars, skill XP, cooldowns, tracker numbers, and party status.' },
            { ul: [
              'Snap to screen edges with a configurable margin',
              'Loadouts — different layouts per activity',
              'Scale and opacity per widget'
            ] }
          ],
          media: [
            { id: 'hud-editor', kind: 'image', caption: 'The HUD editor mid-drag.', alt: 'HUD editor with widgets being arranged', pending: true },
            { id: 'hud-widgets', kind: 'image', caption: 'A finished combat layout.', alt: 'In-game HUD with status bars and cooldowns', pending: true }
          ]
        },
        {
          id: 'graphs',
          title: 'Graphs and session stats',
          shortcuts: [],
          body: [
            { p: 'The DPS and XP graphs render live while you play and freeze when you stop. Sessions are summarized on the HUD — coins per hour, runs per hour, and time-in-session.' }
          ],
          media: [
            { id: 'hud-graphs', kind: 'video', caption: 'Live DPS graph during a run.', alt: 'Screen recording of the live graph updating', pending: true }
          ]
        },
        {
          id: 'performance',
          title: 'Performance and Auto graphics',
          shortcuts: [],
          body: [
            { p: 'Sky-Myce measures its own frame impact. Graphics Auto reduces menu effects while your frame rate is below target, then restores them when frames recover. HUD information, dungeon tracking, routing, and the Crush Camera are **never** reduced.' }
          ],
          media: []
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      icon: 'community',
      summary: 'Relay, friends, Global Chat, and what stays local.',
      steps: [
        {
          id: 'relay',
          title: 'The relay',
          shortcuts: [],
          body: [
            { p: 'Community features ride on a small relay service: party messages, Global Chat, and shared rankings. It is optional — every local feature works with it unplugged.' },
            { ul: [
              'Connect from `/sm community`',
              'Leave any time; your local data stays local',
              'Sharing is per-category and reversible'
            ] }
          ],
          media: [
            { id: 'community-connect', kind: 'image', caption: 'Connecting to the relay.', alt: 'Community screen showing relay connection status', pending: true }
          ]
        },
        {
          id: 'friends',
          title: 'Friends and LFG',
          shortcuts: [],
          body: [
            { p: 'Add dungeon friends and see who is online, what floor they are on, and whether their party has an open slot. LFG posts are visible to friends only unless you opt into the public list.' }
          ],
          media: [
            { id: 'community-friends', kind: 'image', caption: 'The friends list with live activity.', alt: 'Friends list showing online players and their floors', pending: true }
          ]
        },
        {
          id: 'global-chat',
          title: 'Global Chat',
          shortcuts: ['/sm chat'],
          body: [
            { p: 'Global Chat is a cross-server channel for mod users, kept quiet by design: opt in, no rate spam, and local mute lists that sync nowhere.' }
          ],
          media: [
            { id: 'community-chat', kind: 'image', caption: 'Global Chat in game.', alt: 'Global chat channel with messages from several players', pending: true }
          ]
        }
      ]
    },
    {
      id: 'boards',
      title: 'Leaderboards',
      icon: 'boards',
      summary: 'How sharing, the boards, and the web view fit together.',
      steps: [
        {
          id: 'in-game-boards',
          title: 'Boards in game',
          shortcuts: ['/sm leaderboard'],
          body: [
            { p: '`/sm leaderboard` opens the same boards the website shows — economy, dungeons, and RNG, across all-time, weekly, and monthly periods.' }
          ],
          media: [
            { id: 'boards-ingame', kind: 'image', caption: 'The in-game board view.', alt: 'In-game leaderboard screen with player rankings', pending: true }
          ]
        },
        {
          id: 'sharing',
          title: 'Sharing opt-in',
          shortcuts: [],
          body: [
            { p: 'Nothing is shared until you turn it on, per category. Turn a category off and your entries disappear from that board on the next sync.' },
            { ul: [
              'Economy — net worth, purse, bank, realized bazaar profit',
              'Dungeons — completions, chest profit, average run time',
              'RNG — supported drop reports (never official drop rates)'
            ] },
            { callout: { tone: 'warn', text: 'RNG boards are community reports and are not verified. Treat them as a fun signal, not a source of truth.' } }
          ],
          media: [
            { id: 'sharing-settings', kind: 'image', caption: 'The sharing toggles in /sm community.', alt: 'Sharing category toggles in the mod settings', pending: true }
          ]
        },
        {
          id: 'web-boards',
          title: 'The web view',
          shortcuts: [],
          body: [
            { p: 'The homepage renders the same boards with search, periods, and paging. Player lookup shows what a signed-in sharer has chosen to publish — nothing more.' }
          ],
          media: [
            { id: 'web-boards', kind: 'image', caption: 'The board on the website.', alt: 'Website leaderboard with the economy category selected', pending: true }
          ]
        }
      ]
    },
    {
      id: 'contributing',
      title: 'Contributing guide media',
      icon: 'camera',
      summary: 'How the screenshots and clips in this guide get made.',
      steps: [
        {
          id: 'capture-basics',
          title: 'Capturing stills and clips',
          shortcuts: ['F2'],
          body: [
            { p: 'Screenshots use Minecraft\'s own F2 (saved to `screenshots/`). Clips use any recorder — OBS with a 20-second replay buffer is the easiest.' },
            { ul: [
              'Capture at 2560×1440, GUI scale 2, full brightness — the guide downscales for the web',
              'Windowed 1:1 captures, no desktop background',
              'Clip only the moment: under 20 seconds, no music, no voice',
              'Hide the mouse unless the pointer is the point of the capture'
            ] }
          ],
          media: [
            { id: 'capture-example', kind: 'image', caption: 'A good capture: raw, full resolution, no crop.', alt: 'Example of a full-resolution uncropped screenshot', pending: true }
          ]
        },
        {
          id: 'media-files',
          title: 'Naming and formats',
          shortcuts: [],
          body: [
            { p: 'Files are matched to guide slots by name. Each media slot in `js/guide-content.js` has an `id` — save the capture as `assets/guide/<id>.png` (stills) or `<id>.mp4` plus a `<id>.jpg` poster (clips). Extension fallbacks: `.webp`, `.jpg`, `.gif` for images; `.webm` for video.' },
            { code: 'ffmpeg -i raw.mkv -vf "scale=1600:-2" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart goldor-leap.mp4' },
            { code: 'cwebp -q 82 shot.png -o party-finder-board.webp' },
            { p: 'Run `node tools/guide-audit.mjs` from the site folder to list every slot and what is still missing.' }
          ],
          media: []
        },
        {
          id: 'media-slots',
          title: 'Filling a slot',
          shortcuts: [],
          body: [
            { p: 'Missing media shows a dashed “capture pending” slot with the exact path it expects — capture it, drop the file in `assets/guide/`, refresh, and the slot fills itself. No rebuild, no manifest to update.' },
            { callout: { tone: 'tip', title: 'Writing new chapters', text: 'Add a chapter or step in js/guide-content.js. The table of contents, anchors, search, and progress tracking all update automatically.' } }
          ],
          media: []
        }
      ]
    }
  ]
};
