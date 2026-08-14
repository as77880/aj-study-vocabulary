# AJ Study Academy — Daily English Vocabulary PWA

A mobile-first, offline-first Progressive Web App for learning English vocabulary — 10 words a day, Hindi meanings, examples, synonyms/antonyms, word families, text-to-speech, and full offline support. Built with vanilla HTML/CSS/JS only — no frameworks, no backend.

## 1. Project Overview

- 100-day structured learning system (10 words/day)
- Tap-to-reveal word cards with full details
- Hindi meanings, Simple→Better word upgrades, word families, examples, synonyms/antonyms
- Search across all fields (English + Hindi)
- Progress tracking, streaks, day-locking, review of past days
- Dark mode, installable PWA, 100% offline after first load
- No login, no tracking, no backend — everything stored in `localStorage` on-device

## 2. ⚠️ Current Data Status — Read This First

**The vocabulary database currently contains 102 fully-detailed, real words (Days 1–11), not the full 1000.**

Every one of these 102 records is genuine, hand-written, fully-fielded vocabulary (no placeholders, no "Word 1/Word 2" filler) — you can verify by opening `data/vocabulary.json`. The app is 100% functionally complete and works correctly end-to-end with this dataset: daily unlocking, streaks, search, review, progress, offline caching all operate exactly as they will at 1000 words.

To reach 1000 words, the dataset needs to be extended in the same JSON structure — I did not fabricate the remaining ~900 records because the master prompt explicitly forbids placeholder/fake vocabulary. I can generate the remaining words in follow-up batches (real words, same schema) — just ask and I'll continue from id 103 onward.

## 3. Project Structure

```
aj-vocab/
├── index.html              # App shell, all views
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching (cache-first, versioned)
├── README.md
├── css/
│   └── style.css           # All styling, dark mode, responsive
├── js/
│   └── app.js               # All application logic
├── data/
│   └── vocabulary.json     # Vocabulary database (102 records currently)
└── assets/images/
    ├── logo-full.svg / logo.png       # Full logo (symbol + wordmark + tagline)
    ├── logo-icon.svg                  # App icon version (symbol only)
    ├── logo-light.svg / .png          # Transparent, for light UI
    ├── logo-dark.svg / .png           # For dark UI / navy background
    ├── logo-mono-black.png / logo-mono-white.png
    ├── icon-16/32/180/192/512/1024.png
    ├── app-icon.png
    └── favicon.png
```

## 4. How to Run Locally

Browsers block `fetch()` of local JSON files under `file:///`, so use a static server:

```bash
cd aj-vocab
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser. (Python here is only a dev convenience — the deployed app needs no backend/Python at all.)

## 5. How the PWA Works

- `manifest.json` defines app name, icons, colors, and standalone display mode.
- `service-worker.js` pre-caches all core files on install (cache-first strategy) and cleans up old cache versions on activate.
- After the first successful load, the app works fully offline — vocabulary data, all UI, search, and progress all function without network.

## 6. Installing on Android

1. Open the deployed HTTPS URL in Chrome.
2. Tap the "Install App" button in Settings (or the browser's "Add to Home Screen" menu option).
3. The app icon will appear on your home screen and launch in standalone mode.

## 7. Installing on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap the Share icon → "Add to Home Screen".
3. Confirm — the app icon appears on your home screen.

(iOS Safari does not support the `beforeinstallprompt` API, so the in-app "Install" button will not appear there — the Share → Add to Home Screen path is the standard iOS method.)

## 8. Offline Mode

Once loaded successfully over HTTPS (or localhost) one time, all core features work with no network connection: today's words, review of past days, search, marking words learned, progress, streaks, and theme. The 🟢/🔴 indicator in the top-right shows current connectivity but never blocks functionality.

## 9. Updating / Extending Vocabulary

Add more records to `data/vocabulary.json` following the exact same schema as existing entries (`id`, `word`, `meaningHindi`, `simpleWord`, `betterWord`, `partOfSpeech`, `pronunciation`, `example`, `exampleHindi`, `synonyms`, `antonyms`, `wordFamily`, `commonWordFamilies`, `level`). IDs must be sequential and unique. The app automatically maps IDs 1–10 → Day 1, 11–20 → Day 2, etc., so as long as IDs stay sequential, no code changes are needed to grow the dataset toward 1000.

## 10. LocalStorage Keys

| Key | Purpose |
|---|---|
| `aj_startDate` | ISO date learning began (used to calculate current day) |
| `aj_hasStarted` | Whether onboarding is complete |
| `aj_learnedWords` | Array of learned word IDs |
| `aj_completedDays` | Array of completed day numbers |
| `aj_currentStreak` / `aj_longestStreak` | Streak counters |
| `aj_lastCompletedDate` | Last date a day was completed (streak calc) |
| `aj_theme` | `light` or `dark` |

## 11. Deployment

Deploy as a static site to GitHub Pages, Netlify, Vercel, or Cloudflare Pages — no build step, no backend. **HTTPS is required** for the service worker/install prompt to work (localhost is exempt for development).

## 12. Troubleshooting

- **Blank word list / "Vocabulary data unavailable":** you're likely opening via `file://` — use a local server (see §4) or check your deployment's file paths.
- **Install button never appears:** some browsers/platforms (notably iOS Safari) don't support `beforeinstallprompt` — use "Add to Home Screen" manually.
- **Offline mode not working:** the service worker only activates after the *first successful online load* over HTTPS or localhost — reload once while online first.

## 13. Logo Asset Structure

See `assets/images/`. SVG sources are included for every variant so they can be re-exported at any size without quality loss. PNGs are pre-exported at the standard PWA/favicon sizes (16, 32, 180, 192, 512, 1024).

## 14. Updating / Replacing Branding

Replace the relevant file(s) in `assets/images/` keeping the same filenames, and no other file needs to change — `index.html` and `manifest.json` reference these exact paths.

## 15. Service Worker Cache Updates

To ship an update, bump `CACHE_VERSION` in `service-worker.js` (e.g. `v1` → `v2`). The new service worker will pre-cache fresh files under the new cache name and automatically delete old `aj-study-vocabulary-*` caches on activation — no manual cache clearing needed for users.
