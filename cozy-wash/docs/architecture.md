# How Cozy Wash works

## The pieces

```
index.html ── src/main.js ── screens/*.js ── game.js ── engine/*.js
                  │                              │
                  ├── data/loader.js  (JSON files)
                  ├── audio/          (manifest + synth stand-ins)
                  ├── net/client.js ──── /api/status, /api/recap (Vercel functions)
                  └── ui/             (SVG drawings, drag, tap-to-pay, signs, toasts)
```

- **`src/engine/`** is pure JavaScript with no DOM. The browser, the API and the tests all use it.
  - `rng.js` seeded random numbers, so the same date always gives the same basket.
  - `generate.js` builds clothes from garment × color × pattern × fabric. A generated piece's id (`gen:tee:red:stripes:cotton`) is enough to rebuild it anywhere.
  - `pile.js` builds the day's 16 tiles: traps, bonus items, a sock pair, a look-alike, a delicate, every wash bin, and pockets.
  - `rules.js` decides what happens in the wash and the dryer, and the score.
  - `receipt.js` builds the receipt, picks the title and writes the fallback note.
  - `fold.js` tweens fold frames.
- **`src/game.js`** holds the day's game: sorting, loads, rewashes, drying, folding, finishing the day. Screens call it and save.
- **`src/screens/`** one file per screen. Each exports `render(ctx)` and can return a cleanup function.
- **`src/main.js`** boots, loads data, checks the status, routes between screens and draws the step tabs.

## Modes

On boot the game calls `GET /api/status` with a 3-second timeout.

| Result | Mode |
|---|---|
| 404, or running on localhost with no API | Practice: house notes, all tabs open |
| Timeout or 5xx on the live site | Offline: playable, house notes |
| `{ open: true }` | Live |
| `{ open: false }` | Closed sign until `reopensAt` |

## The attendant's note

At the end of the day the browser sends ids and facts to `POST /api/recap` (never names or free text). The server:

1. checks the body with Zod (6 loads, 20 ids and 12 facts per load, 8 KB) and turns away any id that isn't a real item or piece, with `400 {"error":"bad_request"}`,
2. skips the model if the signed `cw_day` cookie says this browser already got a note today,
3. rebuilds item names from the data files,
4. asks OpenRouter's free models for one short line, using a JSON schema,
5. checks the reply with Zod, trims it to 80 characters, and sets the cookie, which lasts until midnight UTC.

Any failure gives `source: "fallback"` and the browser uses a house note from `messages/templates.json`. A 429 with no free requests left, or a 402, closes the shop until midnight UTC.

## Saved data

Everything lives in `localStorage` under `cozywash:v1`: settings, today's game in progress, the last 7 receipts, the closet, the shelf, lifetime counts and bests, and `progress` (the clean-load streak and days played). `sanitizeSave` in `src/state.js` runs on every load, so a damaged or older save is filled in or dropped instead of crashing the game.

A load is clean at a score of 90 or more (`progress.cleanLoadScore` in `config/game.json`). Items with `"unlock": { "type": "cleanStreak", "count": 3 }` stay out of the pile until the streak is that long, then join the shelf.

## Status and signs

`src/main.js` owns the shop's status (`ctx.status`) and changes it in one place, `ctx.setStatus`. Screens that care call `ctx.onStatus(fn)` and get told when it changes: the closed screen reopens itself, and the door sign on the load screen flips. The header pill, the Enter button on the cover and the closed screen all read from the same status. The pure parts (which pill, which button label, what the closed screen says) are in `src/ui/signs.js` so the tests can reach them.

A shop that closes in the middle of a game never interrupts it. The receipt still prints, with a house note.

## Checks and tests

`npm run check` (`tools/check-data.mjs`) is where data mistakes get caught, with a message that says which file and what's wrong. `checkData()` takes the data as an argument, so the tests can hand it broken copies and make sure each mistake is caught. The stylesheet is tested too: the plan's colors, dark mode, and AA contrast for every text pair.

## Environment

| Name | What it's for |
|---|---|
| `OPENROUTER_API_KEY` | The note. Empty means house notes only |
| `COZY_COOKIE_SECRET` | Signs the once-a-day cookie. Empty skips the cookie |
| `COZY_MAINTENANCE` | `1` shows the tidy-up sign |
