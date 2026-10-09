# Cozy Wash: Complete Build Plan

A cozy browser laundry game you play once a day. Flip tiles to find the laundry, sort it, dose the washer, pay with a coin or a tap, wash, move the clothes to the dryer, and fold each piece into the basket. When the basket is full, a receipt prints, and you're done until tomorrow. It's full of traps: a red sock in the whites, a phone in a pocket, a cat in the pile. Built in the open for Hacktoberfest 2026.

- Name: **Cozy Wash** (formerly ASMR Wash)
- Domain: **cozywash.app** (purchased)
- Repo: public. The sounds in this copy are all generated in code as placeholders. They can be replaced with licensed commercial sounds.
- Hosting: **Vercel** (static site plus two serverless functions)
- Model harness: **OpenRouter**, free open-weight models only
- Database: **none**

> **How to use this file:** put it in the repo root as `PLAN.md`. Build the milestones in section 20 in order. Each one has acceptance checks, and the next milestone doesn't start until those pass. Section 21 lists every decision. Anything marked "default" can be changed before building.

---

## 1. Ground rules

- Plain HTML, CSS and JavaScript ES modules. There's **no build step for the game**: `index.html` loads `src/main.js` directly.
- Node is used only for the two API functions in `/api`, the tests, and the helper scripts in `/tools`.
- No logins, no accounts, no emails, no database. The only cookie is one signed, HttpOnly date stamp that stops a second live note on the same day (section 13). No tracking cookies.
- Everything a player owns lives in `localStorage` (section 14).
- The daily cap is **OpenRouter's free-model daily allowance**, so no counter table is needed (section 11).
- All text from the model is rendered with `textContent`, never `innerHTML`.
- The game must be fully playable with **no API key, no network and no sound files**. Practice mode, template notes and synthesized sounds cover all three.
- Contributors add items, wardrobe parts, folds, seasons and sound packs as **data files**, with no code changes.
- All drawings are simple inline SVG. No image files are needed.

---

## 2. Game loop

1. **Cover**: the cover page with the neon sign and spinning machines (section 3a). Tapping **Enter Cozy Wash** continues.
1a. **Start**: the game checks the status. If Cozy Wash is closed, the closed screen shows (section 12). If the player already finished today, the See you tomorrow screen shows (section 13).
2. **Sort**: flip 16 face-down tiles and sort each item into Whites, Darks, Colors, Delicates or Don't wash. This usually makes 3 to 4 loads.
3. **Load**: pick a bin to wash, choose the cycle (normal or gentle) and the water (cold, warm or hot), and pour in detergent, softener, bleach or color rescue.
4. **Pay**: take a coin from the coin cup and tap the machine, or pick up the phone and hold it over the green tap-to-pay symbol.
5. **Wash**: fill, tumble, drain, spin. **45 seconds.**
6. **Result**: score, an instant house note, damage, and a rewash option if anything came out pink, stained or grubby.
7. **Dry**: drag each item into the dryer (or onto the drying rack if it's tagged Hang dry), add a dryer sheet if you like, close the door, press Start. **15 seconds.** No dryer settings.
8. **Fold**: 4 taps per item. Each tap visibly folds it, and it ends as a neat square or rectangle that drops into the white laundry basket.
9. Repeat steps 3 to 8 for each load. **When the last load is folded into the basket, the game is over for the day.**
10. **Receipt**: a laundromat-style receipt prints with everything you did and a short attendant's note (the one model call of the day). It ends with "Have a nice day! Thank you for visiting Cozy Wash." and an **Exit** button.
11. **See you tomorrow**: Exit leads to a goodbye screen with a countdown to the next game.

**Step tabs** (sort, load, wash, dry, fold, receipt) at the top show progress. In a live game, a tab can only open steps already reached. In Practice mode or with `?dev=1`, every tab can be opened at any time, and a demo load is created if needed, so each phase can be viewed on its own.

---

## 3. File tree (every file the build creates)

```
cozy-wash/
├── index.html                    App shell: header (status pill, sound toggle, settings button), step tabs, #app mount, loads src/main.js as a module
├── favicon.svg
├── vercel.json                   Function config: includes data folders the API reads (section 11)
├── styles/
│   └── main.css                  All styles; CSS variables for colors; reduced motion and dark mode
├── src/
│   ├── main.js                   Boot: load config + data, check status, pick mode (live/practice), route to the right screen
│   ├── state.js                  Single game state object, screen router, save/load to localStorage
│   ├── screens/
│   │   ├── cover.js              Cover page (section 3a): neon sign, spinning washer and dryer, Enter
│   │   ├── sort.js               Flip-tile grid, bins, pockets, sock pairing, saved-it
│   │   ├── load.js               Washer, cycle, water, dosing, drum contents, pay (coin cup + phone)
│   │   ├── wash.js               45-second cycle animation, countdown, bubbles
│   │   ├── result.js             Score, house note, damage, rewash
│   │   ├── dry.js                Drag to dryer or rack, dryer sheet, Start, 15-second dry
│   │   ├── fold.js               4-tap folding, laundry basket
│   │   ├── receipt.js            Calls net/client.recap(), prints the receipt, Copy, Exit
│   │   ├── goodbye.js            See you tomorrow: countdown, last receipt, closet, shelf
│   │   └── closed.js             Closed banner, endless wash loop, Check again, auto-check, sleep timer
│   ├── engine/
│   │   ├── rng.js                Seeded random (mulberry32)
│   │   ├── pile.js               Builds the day's 16 tiles from the seed
│   │   ├── generate.js           Makes clothes from garment × color × pattern × fabric
│   │   ├── rules.js              Pure functions: odds, damage, score, rewash
│   │   ├── fold.js               Plays a fold pattern step by step on an SVG
│   │   └── receipt.js            Builds receipt lines, title and personal bests from the day's stats
│   ├── audio/
│   │   ├── audio.js              Manifest loader, play(), loops, unlock on first tap, volume, mute, captions
│   │   └── synth.js              Web Audio fallback for every core sound id
│   ├── net/
│   │   ├── client.js             getStatus(), recap(); live vs practice; timeouts; fallbacks
│   │   └── mock.js               Template notes and fake status for Practice mode and ?sign= overrides
│   ├── data/
│   │   └── loader.js             Loads items, wardrobe, folds, art, templates, active season
│   └── ui/
│       ├── svg.js                Draws clothing from art definitions, with color and pattern
│       ├── props.js              Inline SVG for machines, coin cup, phone, reader, dryer, rack, basket, sheet box, door sign, tile back, receipt slot
│       ├── drag.js               Pointer-event drag and drop with keyboard alternatives
│       ├── phone-cursor.js       Phone that replaces the mouse pointer over the tap-to-pay area
│       ├── signs.js              Header pill, door sign, pay-button state, toasts for status changes
│       ├── settings.js           Settings panel: sound on/off, volume, captions, room tone, reduced motion
│       ├── toast.js              Captions and small notices
│       └── a11y.js               Keyboard handling, focus management, live regions
├── items/
│   ├── index.json                List of every named item file (CI checks it matches the folder)
│   └── *.json                    One file per named item (section 5)
├── wardrobe/
│   ├── garments/*.json           One file per garment type (section 6)
│   ├── colors.json
│   ├── patterns.json
│   └── fabrics.json
├── folds/
│   └── shirt.json  pants.json  towel.json  socks.json  smooth.json  triangle.json
├── art/
│   └── *.json                    One file per art shape: garments, named items, traps (section 8)
├── seasons/
│   └── fall/season.json  winter/season.json  spring/season.json  summer/season.json
├── sounds/
│   ├── default/
│   │   ├── manifest.json         Sound id → file, loop points, volume, caption
│   │   └── *.mp3                 Optional; missing core files fall back to synth
│   └── CREDITS.md                Source and license for every file
├── messages/
│   └── templates.json            House notes, fallback notes, titles, signs, screen text (section 16)
├── config/
│   ├── game.json                 Every tuning number (section 17)
│   ├── seasons.json              Season date ranges
│   └── model.json                OpenRouter models, tokens, temperature, timeout
├── api/                          Vercel serverless functions (Node)
│   ├── status.js                 GET  /api/status
│   ├── recap.js                  POST /api/recap
│   └── _lib/
│       ├── openrouter.js         Request builder, error mapping (402/429/5xx/timeout)
│       ├── schema.js             Zod schemas for the request and the model output
│       ├── prompt.js             Builds the prompt from ids, using the item and wardrobe files
│       ├── cookie.js             Signs and checks the once-a-day cookie
│       ├── status.js             Shared open/closed logic for both functions
│       ├── data.js               Reads the data files from disk (API, tools and tests)
│       └── reopen.js             Next midnight UTC as an ISO string
├── tools/
│   ├── check-data.mjs            Validates items, wardrobe, folds, art, seasons, templates and the sound manifest
│   ├── draft-item.mjs            Starts a new item file from a template and adds it to items/index.json
│   └── serve.mjs                 Tiny static server for Practice mode (no dependencies)
├── tests/
│   ├── rules.test.mjs            Odds, damage, score, rewash, dryer sheet, rack
│   ├── pile.test.mjs             Day composition, seed replay, variety
│   ├── generate.test.mjs         Every generated item is valid
│   ├── data.test.mjs             All data files valid, index.json complete
│   └── api.test.mjs              recap/status with a fake OpenRouter (no network)
├── docs/
│   ├── cover.html                The owner's cover design (reference for screens/cover.js)
│   ├── architecture.md
│   └── add-an-item.md  add-a-garment-or-color.md  add-a-season.md  add-a-fold.md  add-a-sound-pack.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── bug.yml  new-item.yml  new-color-or-garment.yml  new-season.yml  sound-pack.yml  fold-pattern.yml
│   ├── pull_request_template.md
│   └── workflows/ci.yml          npm ci → npm run check → npm test
├── package.json                  "type": "module"; dependency: zod; scripts below
├── .env.example                  OPENROUTER_API_KEY=   COZY_COOKIE_SECRET=   COZY_MAINTENANCE=0
├── .gitignore                    .env, .vercel, node_modules
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE                       MIT (default)
└── PLAN.md                       This file
```

**package.json scripts**
- `"serve": "node tools/serve.mjs"` runs the game alone, in Practice mode, on http://localhost:5173.
- `"dev": "vercel dev"` runs the game plus the API, using `.env`.
- `"check": "node tools/check-data.mjs"`
- `"test": "node --test \"tests/*.test.mjs\""`

ES modules don't load from `file://`, so the folder always has to be served.

**Mode detection** on boot: `GET /api/status` with a 3-second timeout.
- A 404 (no API, for example `npm run serve`) or running on `localhost` without an API means **Practice mode**.
- A timeout or a 5xx on the live site means **Offline**.
- Otherwise it's **live**, open or closed per the response.

---

## 3a. Cover page (sits on top of the game)

The first thing players see is the cover: the owner's design in `docs/cover.html` (add that file to the repo as provided). The builder ports its look into `src/screens/cover.js`, so it's the first screen of the same app.

**Keep from the design:** the neon "cozywash / ENTER" sign, the two front-loading machines with spinning drums, water and bubbles in the washer, the warm dryer, the plant, the headline, colors and layout, and its phone sizes and reduced-motion rule.

**Change when porting:**
- **Enter Cozy Wash** (and tapping the neon sign) goes into the game instead of opening the welcome popup. Remove the popup and its "Location, opening hours, and booking details coming soon" text, since Cozy Wash is a game.
- What Enter does depends on the status: start or resume today's game, show the closed screen, or show See you tomorrow (section 2, step 1). The button text follows: "Enter Cozy Wash", "Closed for today", or "See you tomorrow".
- Washer display shows **0:45** and dryer **0:15**, matching the real cycles.
- Add the header status pill (section 12) next to the nav.
- Replace the ✦ and ↗ characters with small inline SVG icons, and the text bubbles (◦ ○ ◦) with drawn bubbles.
- One small line under the button: "A cozy laundry game. One basket a day."

**Acceptance check:** the cover loads first, the drums spin, and Enter leads to the right screen for open, closed, done-for-today and in-progress games.

---

## 4. Sorting: the flip-tile grid

**The day's tiles**
- **16 face-down tiles in a 4 × 4 grid.** It fits a 360 px phone screen without scrolling, with tiles at least 72 px.
- Each day has: **3 trap tiles**, **1 or 2 named bonus items**, **1 sock pair (2 tiles)**, and generated clothes for the rest. At least **1 look-alike**, at least **1 delicate item**, and items for at least 3 different bins.
- **2 items have a pocket.** Pocket contents are extra, not tiles, and don't count toward the 3 traps.
- The tiles are built by `engine/pile.js` from the seed, which is the player's local date (`YYYY-MM-DD`). The same date always gives the same tiles, which makes testing easy.
- **The clothes change every day.** At most 4 items can repeat from the day before (same named id, or same garment + color + pattern + fabric). Traps, the look-alike, pocket contents and the sock pair are picked fresh. Tile positions are shuffled.

**Playing**
- **Tap a tile** to flip it (`tile-flip`). It shows the item, its color, and its care tag.
- A revealed item has to be sorted before another tile can be flipped, and sorting locks it in.
- **Five bins:** Whites, Darks, Colors, Delicates, Don't wash. Tap a bin to drop the item in (`bin-drop`).
- Keyboard: arrow keys move between tiles, Enter flips, and 1 to 5 picks a bin.
- **Delicates** holds anything with `care.gentle: true`: the teddy bear, baby blanket, and wool, silk or lace clothes.
- **Pockets:** an item with a pocket shows a pocket icon. Tapping it plays `pocket-rustle` and reveals what's inside (tissue, coin, pen, phone or crayon). That becomes its own item to sort. An unchecked pocket goes into the wash with the item.
- **Sock pair:** each day has exactly one pair. It's picked from the named pairs (red, white) or the generated `socks` garment, 50/50. The pair's two tiles share a `pairId` set by `pile.js` (an item file only says `"pair": true`). When both are sorted into the same bin they snap together (`sock-match`, +1 tidy bonus). If they end up in different bins, each sock is a "Lost sock?" on the receipt, and each one folds alone with the `socks` fold (step 1 becomes "smooth it flat"). Folded counts count socks one by one.
- **Saved it:** a trap dropped in Don't wash plays `saved-it`, adds +1 tidy bonus, and goes to the rescue shelf. The cat also plays `cat-meow` when its tile flips.
- There's no on-the-spot feedback for a wrong bin. Mistakes show up after the wash.
- When every tile is sorted, each non-empty bin except Don't wash shows **Wash this load**. Loads can be washed in any order.
- **Drum order:** items go into the washer in the order they were sorted into that bin. "Neighbors" in the damage rules means the item before and after in that order.

**Version 2 (contributor project, not in v1): dig-through pile.** Items overlap with random position and tilt. Covered items are dimmed and show only an edge. You drag the top item off. Overlap uses rough bounding boxes, with no physics library.

---

## 5. Named items

Hand-made items live in `items/`, one JSON file each, listed in `items/index.json`. These are the ones with stories and special rules: the red sock, the teddy bear, the baby blanket, every trap, pocket contents and season specials. Everyday clothes are generated (section 6).

```json
{
  "id": "red-sock",
  "name": "Red sock",
  "kind": "everyday",
  "bin": "color",
  "fabric": "cotton",
  "color": "#d33a3a",
  "pattern": "solid",
  "art": "sock",
  "tags": ["Bleeds", "Wash with colors"],
  "bleeder": 0.35,
  "care": { "gentle": false, "maxTemp": "warm", "bleach": false, "dryer": true, "shrinks": false },
  "fold": "socks",
  "pair": true,
  "pocket": null,
  "rarity": "common",
  "season": null,
  "unlock": null,
  "onWrong": { "damage": "none", "fact": "bleed" }
}
```

| Field | Values |
|---|---|
| `id` | lowercase with dashes, unique |
| `kind` | `everyday`, `bonus`, `trap`, `pocket` (only appears inside pockets) |
| `bin` | `white`, `dark`, `color`, `delicate`, `nowash` (the right bin) |
| `pattern` | an id from `wardrobe/patterns.json` |
| `tags` | words from the tag list below |
| `bleeder` | 0 to 1 base bleed odds, or omitted |
| `care` | `gentle` (bool), `maxTemp` (`cold`/`warm`/`hot`), `bleach` (bool), `dryer` (bool; false means Hang dry), `shrinks` (bool) |
| `fold` | id of a file in `folds/` (traps use `null`) |
| `pair` | true if it comes as 2 tiles that pair up |
| `pocket` | `null`, or `{ "chance": 0.5, "contents": ["tissue","coin","pen","phone","crayon"] }` |
| `rarity` | `common`, `uncommon`, `rare` (weights in `config/game.json`) |
| `unlock` | `null`, or `{ "type": "cleanStreak", "count": 3 }` (must be unlocked before it appears) |
| `onWrong.damage` | what happens if it's washed in a load other than its `bin` (for traps, any wash at all): `self` (ruined), `neighbors` (ruined plus the item before and after it), `stain` (stains neighbors, can be fixed by rewash), `none` |
| `onWrong.fact` | the fact code it adds (section 7) |

**Tag list** (shown on care tags): `Bleeds`, `Wash with colors`, `Wash with whites`, `Wash with darks`, `Cold water only`, `Gentle cycle`, `No bleach`, `Hang dry`, `Dry clean only`, `Do not wash`, `Check pockets`.

**Named items for v1**

| Group | Items |
|---|---|
| Everyday | red sock (pair), white socks (pair) |
| Bonus | teddy bear (`delicate`, fold `smooth`), baby blanket (`delicate`, fold `towel`), sneakers (`color`, fold `null`, thump in the drum, go on the rack), pillow (`white`, fold `smooth`, Hang dry) |
| Look-alikes | cream knit sweater (looks white, wool, `delicate`), pale pink tee (looks white, `color`) |
| Traps | phone, keys, pen, crayon, leather jacket, silk blouse (dry clean only), sleepy cat |
| Pocket only | tissue, coin |
| Fall season | witch hat (`color`, bleeds orange), pumpkin sweater (`color`, wool, `delicate`), costume cape (`dark`, Hang dry) |

That's 20 named item files. Traps have `bin: "nowash"` and `fold: null`.

---

## 6. Growing wardrobe: no two games the same

Most clothes are made from four parts:

| Part | File | v1 contents | Decides |
|---|---|---|---|
| Garment | `wardrobe/garments/*.json` | tee, shirt, tank top, hoodie, sweater, jacket, onesie, flannel shirt, lace top, jeans, leggings, sweatpants, pajama pants, socks, towel, dish towel, pillowcase, bandana (18 files) | Art, fold, allowed fabrics and patterns, pair |
| Color | `wardrobe/colors.json` | white, ivory, cream, light gray, gray, charcoal, black, navy, brown, red, cherry, orange, mustard, yellow, mint, green, teal, blue, sky, lavender, purple, blush pink, pink, denim blue (24) | Bin, bleed odds, look-alike |
| Pattern | `wardrobe/patterns.json` | solid, stripes, polka dots, plaid, checks, stars, hearts (7) | Looks only |
| Fabric | `wardrobe/fabrics.json` | cotton, jersey, denim, fleece, linen, wool, silk, lace (8) | Care rules |

```json
// colors.json (array)
{ "id": "cream", "name": "Cream", "hex": "#f3ead2", "bin": "white", "looksLike": "white", "bleed": 0 }
{ "id": "cherry", "name": "Cherry", "hex": "#c2185b", "bin": "color", "bleed": 0.30 }
{ "id": "navy", "name": "Navy", "hex": "#1f2a44", "bin": "dark", "looksLike": "black", "bleed": 0.05 }

// patterns.json (array)
{ "id": "stripes", "name": "striped", "svg": "stripes" }

// fabrics.json (array)
{ "id": "wool", "name": "wool", "care": { "gentle": true, "maxTemp": "cold", "bleach": false, "dryer": false, "shrinks": true } }
{ "id": "denim", "name": "denim", "care": { "gentle": false, "maxTemp": "warm", "bleach": false, "dryer": true, "shrinks": false }, "bleedBonus": 0.10 }

// garments/hoodie.json
{ "id": "hoodie", "name": "hoodie", "art": "hoodie", "fold": "shirt", "sturdyLooking": true,
  "fabrics": ["cotton", "fleece"], "patterns": ["solid", "stripes"], "pair": false, "pocket": { "chance": 0.3, "contents": ["tissue","coin","pen","phone","crayon"] } }
```

**How a piece is made** (`engine/generate.js`)
- Pick a garment, then a fabric and a pattern that garment allows, then a color from the player's closet.
- **Id:** `gen:<garment>:<color>:<pattern>:<fabric>`, for example `gen:hoodie:navy:solid:fleece`. The server rebuilds the name from this id and the wardrobe files, so ids are all it needs.
- **Name:** color, then pattern (skipped if solid), then fabric if it's not cotton, then garment. For example "Mustard striped tee", "Navy fleece hoodie", "Cream wool sweater". Names are under 30 characters.
- **Bin:** a gentle fabric (wool, silk, lace) goes to Delicates. Otherwise the color's `bin` decides. Patterned items use their main color.
- **Bleed odds:** the color's `bleed` plus the fabric's `bleedBonus`.
- **Tags:** built from the bin and care: for example `Wash with darks`, `Cold water only`, `Gentle cycle`, `No bleach`, `Hang dry`.
- **Look-alikes:** any piece whose color has a `looksLike` different from its bin, or a gentle fabric on a garment marked `"sturdyLooking": true` (sweater, jacket, hoodie). The tag always tells the truth.
- **Art:** the garment's SVG shape filled with the color, with the pattern as an SVG `<pattern>` overlay. A new color or pattern needs no new art.

**The stack grows**
- **For each player:** the closet starts with 12 colors (white, cream, gray, charcoal, black, navy, red, blue, green, yellow, pink, brown) and 2 patterns (solid, stripes). Every finished day unlocks one more color or pattern (`unlock` sound, "New in your closet: Mustard!"). A regular player has everything within about 5 weeks.
- **For everyone:** contributors add garments, colors, patterns and fabrics as data files. One new color multiplies across every garment, pattern and fabric. These make great `good first issue`s.
- **Seasons** add their own colors and patterns while they're active.

**Acceptance checks**
- `generate.test.mjs`: 10,000 generated pieces all have a valid id, name under 30 characters, bin, tags, care, art and fold.
- Each garment lists only fabrics and patterns that make sense for it, so there are no silk sneakers.

---

## 7. Wash rules (`engine/rules.js`)

The code decides every outcome. The model only writes the attendant's note on the receipt. All numbers are in `config/game.json → rules` (section 17).

**Inputs**
```js
// load
{ bin: "white", items: [ /* item objects in drum order */ ] }
// settings
{ cycle: "normal", water: "hot", detergent: 2, softener: 0, bleach: 0, rescue: 0 }
```

| Rule | Default |
|---|---|
| Bleed odds per bleeder | its bleed value + hot 0.35 / warm 0.10 / cold −0.25 + 0.05 per bleach capful, kept between 0 and 0.95 |
| Bleed hits | Only matters if the load has white items. A hit turns every white item pink |
| Suds overflow | detergent 4, or detergent 3 or more with softener 2 or more |
| Bleach ruins | any item with `care.bleach: false` when bleach is 1 or more |
| Heavy bleach | bleach 3 tires colored items |
| Too hot | an item washed above its `care.maxTemp` with `shrinks: true` shrinks |
| Gentle items | an item with `care.gentle: true` on the normal cycle gets stretched |
| Teddy | hot water makes him flat (looks only, no penalty) |
| Trap in the drum | apply its `onWrong.damage`. Ruined items leave the load |
| Unchecked tissue | lint on every dark item in the load |
| No detergent | the whole load is "still a bit grubby" |

**Score per load** (starts at 100, kept between 0 and 100)

| Event | Points |
|---|---|
| Each ruined item | −20 |
| Bleed (pink whites) | −20 |
| Suds overflow | −10 |
| Heavy bleach | −10 |
| Each shrunk item | −15 |
| Each stretched item | −10 |
| Each stained item | −10 |
| Each item with lint | −5 |
| No detergent | −15 |
| Dried without a sheet (static) | −5 |
| Dried with a sheet (fresh) | +5 |
| Tidy bonus: each sock pair matched, each trap saved (`tidy` in `config/game.json`) | +1 each, added to the day's best-day score and printed on the receipt as `Tidy bonus +N`. It doesn't change a load's score |

**Rewash** (only offered when a load has pink, stained or grubby items)
- Pay again (coin or tap), choose new settings, then a **quick cycle of 25 seconds** (fill 5, tumble 12, drain 4, spin 4).
- Fix odds for pink or stained items: 0.35 + 0.20 per bleach capful + 0.30 with color rescue + 0.05 if not cold, at most 0.90. Grubby is always fixed with detergent.
- Up to 3 rewashes per load. Each rewash runs the full rules again, so it can cause new damage.

**Two scores per load:** `computeOutcome()` gives the **wash score** shown on the result screen. After drying, `computeDry(load, outcome, { sheet, rackIds })` adds `fresh` or `static` and any `dryer_shrunk` items and gives the **final score**. The receipt shows final scores.

`computeOutcome(load, settings, rng)` returns:
```js
{ pinked: [], ruined: [], shrunk: [], stretched: [], stained: [], linted: [], suds: false,
  heavyBleach: false, grubby: false, score: 85, facts: ["bleed", "teddy_flat"] }
```

**Fact codes** (used for house notes, receipt lines and the attendant's note): `clean`, `bleed`, `suds`, `bleach_ruined`, `colors_tired`, `shrunk`, `stretched`, `teddy_flat`, `phone_ruined`, `keys_clank`, `pen_ink`, `crayon_melt`, `cat_woke`, `tissue_lint`, `leather_ruined`, `silk_ruined`, `grubby`, `rewash_fixed`, `rewash_faded`, `static`, `fresh`, `lost_sock`, `rack_saved`, `dryer_shrunk`.

**House note:** after each wash, the result screen shows one short line picked from `messages/templates.json → houseNotes[<fact>]`. The most serious fact wins. No model call.

---

## 7a. Washer, detergents and dryer

**Washer settings** (Load screen)
- **Cycle:** normal or gentle (`ui-click`).
- **Water:** cold, warm or hot, on a dial (`dial-click`).

**Detergents** (bottles on a shelf above the washer)
- **Detergent:** tap the bottle to pour one capful into the dispenser drawer (`pour-liquid`). 0 to 4.
- **Softener:** 0 to 3 capfuls (`pour-liquid`).
- **Bleach:** 0 to 3 capfuls (`pour-liquid`).
- **Color rescue:** 0 or 1 scoop (`pour-powder`). Only helps on a rewash.
- The dispenser drawer shows each amount as colored layers. Tap the drawer to empty it and start over (`pour-liquid`, played softly).
- **One capful of detergent is the sweet spot** for a small load, two for a full one. The house note teaches this after a mistake.

**Loading the drum:** the load's items are shown beside the open washer, and the player taps **Load** to put them in (`drum-drop` for each). Last chance to take something out: tap an item in the drum to pull it back to its bin (`bin-drop`).

**Wash cycle: 45 seconds**

| Phase | Seconds | You see and hear |
|---|---|---|
| Fill | 8 | Water rises, `wash-fill` |
| Tumble | 20 | Clothes tumble and suds build, `wash-tumble` looping. `trap-clank` if keys, phone or a coin are inside. `sneaker-thump` if sneakers are inside. `suds-overflow` if suds overflow |
| Drain | 7 | Water level drops, `wash-drain`. `tissue-poof` if a tissue exploded |
| Spin | 10 | Fast spin, `wash-spin`, then the `wash-end` buzzer |

- **Clothes in the drum look like clothes.** Every item in the washer and dryer is drawn with its real art (the same `art/*.json` shape, color and pattern used everywhere else): tees, jeans, socks, towels and hoodies, scattered at different angles and tumbling with the drum. Never plain blobs. Wet items in the washer are drawn a little darker. The closed-screen loop and the cover use the same drawings.
- A countdown shows on the washer's little display.
- Tap the glass for bubbles (`bubble-pop`). Poke an item to make it tumble differently.
- Then the result screen shows the **wash score** (`result-good` for 80 or higher, `result-bad` below 80).

**Moving to the dryer**
- The washer door opens (`door-open`) and the dryer door opens (`door-open`). The wet clothes show inside, a little darker and droopy.
- **Drag each item** into the dryer (`drum-drop`), or onto the **drying rack** (`rack-hang`).
- Items tagged **Hang dry** belong on the rack. If they go in the dryer they shrink (`dryer_shrunk`). Everything else can go in the dryer. Items on the rack aren't penalized.
- **Move all** puts everything in the dryer except Hang dry items, which go on the rack. It's for keyboard players or anyone in a hurry.

**Dryer sheets**
- A box of dryer sheets sits on top of the dryer. Drag one sheet into the dryer (`sheet-pull`). One is plenty; a second one bounces back out with "One sheet is plenty."
- **With a sheet:** clothes come out fresh (+5, `fresh`) with a little sparkle.
- **Without a sheet:** static cling. Socks stick to shirts, and unloading plays `static-zap` (−5, `static`).
- Sheets are unlimited and free, like coins.

**Dryer: 15 seconds, no settings**
- Close the door (`door-close`) and press **Start** (`dryer-start`). There's nothing to pay and nothing to set.
- `dryer-tumble` loops, then the `dryer-end` buzzer. Rack items sway gently at the same time.
- Clothes come out fluffy, then go to the folding table.

**Acceptance check:** a wash takes 45 seconds with all four phases in sync with the sound. Every item can be dragged to the dryer or the rack, and Move all works with a keyboard. Dryer sheet on and off both work. The dryer has only a Start button and takes 15 seconds.

---

## 8. Folding (`engine/fold.js`)

**Art format** (`art/*.json`): one outline path plus a few detail lines, drawn in its own viewBox. The same art draws the item on tiles, in the drum, on the result screen and on the dryer list.

```json
{ "id": "tee", "viewBox": [32, 30],
  "outline": "M6 4 L12 2 Q16 6 20 2 L26 4 L31 10 L25 13 L25 28 L7 28 L7 13 L1 10 Z",
  "details": ["M12 2.8 Q16 7 20 2.8"] }
```

**Fold format** (`folds/*.json`): 5 frames and 4 steps on a 100 × 100 folding table. Frame 0 is the item lying flat; frames 1 to 4 are its shape after each tap. Every frame has the same number of points, so the game can tween smoothly from one to the next. Each step has the tap point, the dashed fold line (or `null`) and the duration.

```json
{ "id": "shirt",
  "frames": [ [[20,12],[36,8],[50,14],[64,8],[80,12],[96,30],[80,38],[80,88],[20,88],[20,38],[4,30]], "…4 more frames…" ],
  "steps": [
    { "label": "1", "point": [22,52], "line": [[36,0],[36,100]], "ms": 380 },
    { "label": "2", "point": [74,52], "line": [[64,0],[64,100]], "ms": 380 },
    { "label": "3", "point": [50,16], "line": [[0,24],[100,24]], "ms": 380 },
    { "label": "4", "point": [50,80], "line": [[0,56],[100,56]], "ms": 420 }
  ],
  "finish": "rectangle" }
```

All six folds are written this way. `check-data.mjs` checks each fold has exactly 5 frames with the same point count and 4 steps with a tap point. (This replaced the earlier "named parts flip over a line" idea: tweening whole frames is simpler to author, works for every garment with one outline, and still visibly changes the shape on every tap.)

**Every fold is 4 taps, and every item ends as a neat square or rectangle.**

| Fold | Steps | Ends as | Garments and items |
|---|---|---|---|
| `shirt` | Left side in, right side in, sleeves down, fold in half | Rectangle | tee, shirt, tank top, hoodie (hood folds with the sleeves), sweater, jacket, onesie, flannel shirt, lace top |
| `pants` | Half lengthwise, tuck the waist, half at the knee, half again | Rectangle | jeans, leggings, sweatpants, pajama pants |
| `towel` | Half, half the other way, half again, final half | Square | towel, dish towel, pillowcase, baby blanket |
| `socks` | Line up the pair, fold the toes up, roll (`sock-roll`), tuck the cuff | Small square bundle | socks |
| `triangle` | Corner to corner, fold the point in, sides in, half | Small square | bandana |
| `smooth` | Four smoothing strokes (`fur-smooth`) | Pillow: rectangle. Teddy sits on the shelf instead (the one exception) | teddy bear, pillow |

Sneakers have no fold. They go straight into the basket after drying. The teddy bear counts as done when he sits on the shelf.

**How it plays**
- The item lies flat on the folding table. The four numbered points sit on it, and only the next one is active, with a faint dashed line where that fold happens.
- Tapping it tweens the shape to the next frame (`fold-flap-1` and `fold-flap-2`, alternating). Tapping out of order shows a small hint and does nothing.
- Color and pattern stay on the shape, so a striped shirt still looks striped when folded. Pink and stained items keep their look.
- After the 4th tap, the item snaps into its clean finished shape and slides into the basket (`basket-drop`).
- With reduced motion turned on, each step simply swaps to the next shape.
- `tools/check-data.mjs` fails if a fold's frames don't line up.

**Laundry basket**
- A white laundry basket sits beside the folding table and fills up as folded items stack inside.
- When the last item of a load is done (in the basket, or the teddy on the shelf), a **Load done** card shows (`result-good`) with **Next load**.
- When the last load is in the basket, the game is over for the day and the receipt prints (section 13).

**Acceptance check:** every tap visibly changes the shape. Every item takes 4 taps (except sneakers) and ends as a square or rectangle (except the teddy). Each finished item lands in the basket, and a full basket ends the game.

---

## 9. Payment

Both ways are on every machine. Both start the same wash, and both are free.

**Coin cup**
- A cup of quarters sits on the counter and never runs out.
- **Click the cup** to take a coin (`coin-grab`). The coin follows the cursor or sits above your finger.
- **Tap the machine.** The coin slot glows while you hold a coin. The coin drops in (`coin-drop`, then a random `coin-clink-1`, `-2` or `-3`, then `coin-start`) and the wash starts.
- Tapping anywhere else puts the coin back in the cup (`coin-grab`).
- Keyboard: Enter on the cup takes a coin, and Enter on the machine pays.

**Tap to pay**
- The machine has a reader with a **green contactless symbol** (curved wave lines) that glows and pulses slowly.
- **Mouse and trackpad players** (devices matching `(hover: hover) and (pointer: fine)`): when the pointer enters the pay area around the reader, the normal cursor hides and a drawn **phone follows the pointer** (`phone-pickup` plays once). It's an SVG element positioned with the pointer, about 70 px tall, tilting slightly in the direction of movement. Leaving the pay area brings the normal cursor back. Built in `src/ui/phone-cursor.js`.
  - Over the green symbol, the symbol highlights (`tap-hover`). **Click and hold for 1 second** to pay; the phone's screen flashes **"Paid ✓"** and the reader shows the green check.
  - No drag is needed on these devices, and the phone on the counter is hidden.
- **Touch players** (phones and tablets, no hover): a **phone** sits on the counter. **Drag it to pick it up** (`phone-pickup`). It lifts with a shadow and tilts slightly.
- **Move it over the green symbol.** The symbol highlights: the glow brightens and the waves light up one by one (`tap-hover`).
- **Hold it there for 1 second.** The phone flashes **"Paid ✓"**, the reader shows a green check and **PAID** (`tap-beep`), and the wash starts.
- Pulling away early fades the highlight (`tap-decline`). Letting go somewhere else sends the phone back to the counter.
- 5% of the time the reader blinks amber, shows "Try again" (`tap-decline`), and needs a second hold.
- Without dragging: Enter on the phone picks it up, and Enter again holds it on the reader. Pressing and holding the green symbol for 1 second also works.

**Acceptance check:** on desktop, the pointer turns into the phone over the pay area and back to normal outside it, and holding over the symbol for 1 second pays. On a phone, dragging the phone onto the symbol and holding pays. Cup then machine starts the wash on both. Pulling away early cancels. With reduced motion, the phone follows without tilting.

---

## 10. The model, via OpenRouter

**What it does:** writes **one short, simple sentence** for the receipt (the attendant's note), about one real moment from the day. It's the friendly sign-off a laundromat attendant might say as you leave, and it's the one place the game uses the model. That's **one call per player per day**. It never decides outcomes. Everything during play uses template house notes.

**Models** (`config/model.json`):
```json
{
  "models": ["openai/gpt-oss-20b:free", "openai/gpt-oss-120b:free"],
  "maxTokens": 200,
  "temperature": 0.9,
  "timeoutMs": 8000
}
```
- **Free models only, $0 a day.** gpt-oss is open weights under Apache 2.0, and its OpenRouter page says it supports structured outputs. The 120B version is the backup.
- OpenRouter free models allow 20 requests a minute and **50 a day**. After a one-time purchase of $10 in credits, the allowance becomes **1,000 a day**. Free requests don't use up the credits.
- Free model names change often. Check both on openrouter.ai before launch and swap them in `config/model.json` if needed. Any open model whose page says it supports structured outputs will work (Qwen and Mistral are good alternatives).
- If both models fail, the receipt uses a template note.

**Request** (`api/_lib/openrouter.js`): `POST https://openrouter.ai/api/v1/chat/completions`
```json
{
  "models": ["openai/gpt-oss-20b:free", "openai/gpt-oss-120b:free"],
  "messages": [
    { "role": "system", "content": "<system prompt below>" },
    { "role": "user", "content": "<facts JSON below>" }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "attendant_note",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["headline", "lines"],
        "properties": {
          "headline": { "type": "string", "description": "One short, simple sentence, max 80 characters" },
          "lines": { "type": "array", "maxItems": 0, "items": { "type": "string" } }
        }
      }
    }
  },
  "provider": { "require_parameters": true },
  "max_tokens": 200,
  "temperature": 0.9
}
```
Headers: `Authorization: Bearer $OPENROUTER_API_KEY`, `HTTP-Referer: https://cozywash.app`, `X-Title: Cozy Wash`.

**System prompt** (`api/_lib/prompt.js`):
> You are the friendly attendant at Cozy Wash, a cozy laundromat game. Write ONE short, simple sentence for the player's receipt about their laundry today. Use everyday words, no puns stacked together, no long jokes. Mention one thing that really happened, from the facts. Never invent anything. No brand names, no real people, nothing scary. Max 80 characters. Leave `lines` empty.
>
> Examples of the right tone: "Nice job catching the cat before the wash." · "The whites went pink, but you saved them." · "Every sock found its partner today."

**Facts sent to the model** (built on the server from ids, never from player text):
```json
{ "loads": [
    { "bin": "white", "items": ["White socks", "Cream tee", "Red sock"], "water": "hot", "cycle": "normal",
      "facts": ["bleed", "rewash_fixed"], "score": 60, "rewashes": 1 },
    { "bin": "delicate", "items": ["Teddy bear", "Lavender wool sweater"], "water": "cold", "cycle": "gentle",
      "facts": ["fresh"], "score": 100, "rewashes": 0 }
  ],
  "summary": { "trapsCaught": ["Sleepy cat"], "pocketsChecked": 2, "socksPaired": 1, "folded": 11 } }
```

**Validation:** the server checks the output with Zod and trims strings to the limits. If it fails, the note comes from `messages/templates.json → noteFallback`.

**ElevenLabs on OpenRouter:** only text-to-speech and speech-to-text are listed there, no sound effects. A spoken attendant voice could come later; it's not in v1.

---

## 11. API and the daily cap (no database)

**The cap** is OpenRouter's free-model daily allowance (50, or 1,000 after the one-time $10). It resets at **midnight UTC**. When it runs out, OpenRouter refuses free-model requests with HTTP 429.

**Safety net:** give the key a **daily credit limit of $0**, so a mistake can never spend money. That limit answers with HTTP 402 and `error.metadata.limit_source = "openrouter_key_limit"`, which is treated the same as the cap.

**`vercel.json`**
```json
{ "functions": { "api/*.js": { "includeFiles": "{config,items,wardrobe,messages,seasons}/**" } } }
```
This lets the functions read the data files they need. The server's id lookup also merges the active season's colors, patterns and items, so ids like `gen:sweater:pumpkin:leaves:wool` are valid.

### `GET /api/status`
- Calls `GET https://openrouter.ai/api/v1/key` and reads `free_model_daily_requests` (`used`, `limit`, `remaining`).
- Response:
```json
{ "open": true, "reason": "open", "reopensAt": "2026-10-09T00:00:00Z", "gamesToday": 37 }
```
- `reason`: `open`, `daily_cap` (when `remaining` is 0) or `maintenance` (when the Vercel setting `COZY_MAINTENANCE=1`, the owner's off switch).
- `gamesToday` is `free_model_daily_requests.used`, roughly the number of games finished today by everyone. It's the only shared count.
- `Cache-Control: s-maxage=30`, so most checks never reach OpenRouter.

### `POST /api/recap`
- Called once, when the receipt prints. Validated with Zod. Unknown ids are rejected:
```json
{ "loads": [
    { "bin": "white", "itemIds": ["white-socks", "gen:tee:cream:solid:cotton", "red-sock"],
      "settings": { "cycle": "normal", "water": "hot", "detergent": 2, "softener": 0, "bleach": 0, "rescue": 0 },
      "facts": ["bleed", "rewash_fixed"], "score": 60, "rewashes": 1 }
  ],
  "summary": { "trapIdsCaught": ["sleepy-cat"], "pocketsChecked": 2, "socksPaired": 1, "folded": 11 } }
```
- Limits: at most 6 loads, 20 item ids per load, 12 facts per load, and 8 KB.

| Case | HTTP | Body |
|---|---|---|
| Model answered | 200 | `{ "status":"ok", "source":"model", "headline":"...", "lines":["..."] }` and sets the cookie |
| Already had a live note today (cookie) | 200 | `{ "status":"ok", "source":"fallback", ... }` (template note, no model call) |
| Model failed, timed out, per-minute 429 or 5xx | 200 | `{ "status":"ok", "source":"fallback", "busy": true, ... }` |
| Daily allowance used up, or key limit | 200 | `{ "status":"closed", "source":"fallback", "reopensAt":"...", ... }` |
| Bad request | 400 | `{ "error":"bad_request" }` |

- On any 429, the server re-checks `/api/v1/key`. If `remaining` is 0 it's `closed`; otherwise it's `busy`.
- The receipt **always prints**. Every non-error answer includes a note, either from the model or from templates.

### The once-a-day cookie (`api/_lib/cookie.js`)
- Name `cw_day`, value `<UTC date>.<HMAC-SHA256 signature>` using `COZY_COOKIE_SECRET`. HttpOnly, Secure, SameSite=Lax, expires at the next midnight UTC.
- If a valid cookie for today's UTC date is present, the server skips the model.
- If `COZY_COOKIE_SECRET` isn't set (local or preview), the cookie is skipped.

### What "no database" means
- **Cap:** OpenRouter's free daily allowance, with a $0 key limit as a backstop.
- **Shared count:** `gamesToday` from OpenRouter.
- **Player data:** `localStorage` only.
- **Optional visit counting:** Vercel Web Analytics, one script tag.
- **No per-visitor limit** beyond the once-a-day rules (section 13). If someone drains the allowance, Cozy Wash closes early for everyone that day. That's accepted for v1.

---

## 12. Closed and status signs

### When Cozy Wash is closed
- Being closed stops **new games from starting**. A game already in progress always finishes, and its receipt uses a template note.
- The start screen becomes the **closed screen**: an endless cycle of a washer running (fill → tumble about 3 times → drain → spin → repeat), with the water level moving in time with the sound. It shows the player's last load from their saved receipts, or a default load.
- The banner (from `messages/templates.json → signs.closed`):
  > **Cozy Wash is closed for the day.**
  > We've washed enough bundles today. Back at {local time}.
  > Today at Cozy Wash: {gamesToday} visits finished.
  > You: {washed} washed · {dried} dried · {folded} folded (all-time)
- `reopensAt` is shown in the player's own time zone.
- **Check again** button, plus an automatic check every 3 minutes while the tab is visible (paused when hidden).
- Tap the glass for bubbles (`bubble-pop`). Poke a sock to change its spin.
- **Sleep timer:** after 30 minutes the loop pauses with "Still there?" and a Keep listening button.
- When it reopens: toast **"Cozy Wash is open again!"** (`unlock`) and a **Start today's wash** button.

### Status signs
Every sign's text is in `messages/templates.json → signs`. Signs use text plus an icon, never color alone, and are announced to screen readers (`role="status"`, `aria-live="polite"`). Code lives in `src/ui/signs.js`.

**Where they show**
1. **Header pill** on every screen.
2. **Door sign** on the Load screen: a hanging OPEN/CLOSED flip sign that swings when the status changes (`sign-flip`).
3. **Start button** on the start screen: disabled with the short sign text when a new game can't start.
4. **Full closed screen** (above).

| State | When | Header pill | Sign text (default) | What works |
|---|---|---|---|---|
| Open | Status says open | ● Open | Door sign shows OPEN | Everything |
| Closed for the day | Daily allowance used up, or key limit | ● Closed | **Cozy Wash is closed for the day.** We've washed enough bundles today. Back at {local time}. | Games in progress finish; closed screen for new ones |
| Closed for tidy-up | `COZY_MAINTENANCE=1` | ● Closed | **Cozy Wash is closed for a quick tidy-up.** Back soon. | Same, with no reopen time |
| Busy | The receipt's note fell back because the model was slow or rate-limited | ● Busy (2 minutes) | On the receipt: *The attendant is busy, so here's a note from the house.* | Everything |
| Offline | Status check timed out or got a 5xx on the live site | ● Offline | **Can't reach Cozy Wash right now.** You can still play; your receipt will use a house note. [Try again] | Everything, with template notes. A new game can start in Offline only if the player hasn't finished today |
| Practice | Running locally without the API | ● Practice | Footer: *Practice mode: no live notes.* | Everything, all tabs open |
| Done for today | Player finished today | ● See you tomorrow | See you tomorrow screen (section 13) | Look at the receipt, closet and shelf |
| Reopened | A check finds it open again | ● Open | Toast: **Cozy Wash is open again!** | Everything |

**Rules**
- On the live site, a failed status check shows **Offline**, never Closed. Closed only shows when the server says so.
- Status is checked on load, every 3 minutes while visible, and on Check again.
- **Testing overrides:** `?sign=closed`, `maintenance`, `busy`, `offline`, `practice`, `done`, `reopened`.

**Acceptance check:** each `?sign=` override shows the right pill, door sign, start-button state and text, on a phone and on desktop, and a screen reader announces it.

---

## 13. The receipt and once a day

### The receipt
When the last load lands in the basket, a receipt prints out of a slot (`receipt-print`) and scrolls up. It's narrow, in monospace, with a dashed tear line and a slight curl. It's clearly a game receipt: no prices, no payment details, no real business info.

```
        COZY WASH
       cozywash.app
   Thu Oct 08 2026  4:12 PM
--------------------------------
LOADS                         4
  Whites ............ 60 / 100  (pink, fixed on rewash)
  Colors ............ 92 / 100
  Delicates ........ 100 / 100
  Darks ............. 85 / 100
--------------------------------
Washed                       14
Dried                        12
Hung on rack                  2
Folded                       14
Pockets checked               2
Traps caught      3 (cat, phone, crayon)
Socks paired                  1
Rewashes                      1
Dryer sheets                  3
Paid with          coin x3, tap x2
New in your closet       Mustard
--------------------------------
TITLE: Cat Rescuer
--------------------------------
Attendant's note:
 "Nice job catching the cat before the wash."
--------------------------------
       Have a nice day!
 Thank you for visiting Cozy Wash.
--------------------------------
          [ Exit ]
```

- Everything except the attendant's note is built in code (`engine/receipt.js`). The note comes from `/api/recap`, or from templates if that isn't available.
- **Titles** are picked by rules in `messages/templates.json → titles`, for example "Sock Whisperer" (pair matched), "Pink Load Pro" (bleed happened), "Cat Rescuer" (cat caught), "Pocket Detective" (both pockets checked), "Fresh Start" (every load 90 or above), "Static Shock" (no dryer sheets at all). Titles are checked in the order they're listed; the first one that matches wins. If none match, the title is **"Laundry Star"**.
- **Copy** copies a short text version to share (`ui-click`).
- **Exit** (`ui-click`) goes to the See you tomorrow screen. Browsers don't let a page close its own tab, so Exit ends the game rather than closing the window.

### Once a day
- When the receipt prints, the game saves `playedOn` (the player's local date) and the receipt.
- **See you tomorrow** shows "Your laundry's all done for today. Come back tomorrow for a fresh basket," a countdown to local midnight, today's receipt, the closet and the shelf.
- After local midnight it shows **Start today's wash**, with a fresh set of tiles.
- A game in progress is saved after every step, so a refresh or a closed tab picks up where it left off.

### Keeping people from playing again
There are no logins and no database, so nothing can fully stop a repeat. A private window or another device starts fresh. Three layers keep it fair and keep the cost capped:
1. **Browser save:** `playedOn` blocks a second game in the same browser on the same local day.
2. **Signed cookie:** stops the same browser from getting a second live note on the same UTC day, even if it clears its saved game but keeps cookies (section 11).
3. **Daily allowance:** caps the total, whatever happens.

**Two clocks, on purpose:** the game day follows the player's local midnight, and live notes follow OpenRouter's midnight UTC. A player whose local day starts before midnight UTC may get a house note instead of a live one for that day. That's accepted.

**Testing:** `?newday=1` clears `playedOn`. It only works on `localhost` or a hostname ending in `.vercel.app` (preview deployments), never on cozywash.app.

**Acceptance check:** a full basket prints the receipt with every stat and a note. Exit goes to See you tomorrow. A second game the same day is blocked in the same browser. The cookie stops a second live note. Refreshing mid-game resumes at the same step.

---

## 14. Saved data (`localStorage`)

All under one key, `cozywash:v1`, as JSON. Every read and write is wrapped in try/catch, so the game still works if storage is blocked (it just won't remember).

| Field | Contents |
|---|---|
| `settings` | sound on/off, volume, captions, reduced-motion override, room tone on/off |
| `game` | today's game in progress: seed, tiles, bins, loads, current step, stats so far |
| `playedOn` | local date of the last finished game |
| `receipts` | the last 7 receipts |
| `closet` | unlocked colors and patterns |
| `shelf` | unlocked bonus items and rescued traps |
| `progress` | clean-load streak and unlock counters |
| `counts` | all-time items washed, dried, hung and folded |
| `bests` | best day score, titles earned |

---

## 15. Seasons

- `config/seasons.json` holds date ranges (month-day, the player's local date):
```json
[ { "id": "fall",   "from": "09-22", "to": "12-20" },
  { "id": "winter", "from": "12-21", "to": "03-19" },
  { "id": "spring", "from": "03-20", "to": "06-20" },
  { "id": "summer", "from": "06-21", "to": "09-21" } ]
```
- `seasons/<id>/season.json`:
```json
{ "id": "fall", "name": "Fall", "accent": "#d9822b",
  "itemIds": ["witch-hat", "pumpkin-sweater", "costume-cape"],
  "colors": [ { "id": "pumpkin", "name": "Pumpkin", "hex": "#e8772e", "bin": "color", "bleed": 0.25 } ],
  "patterns": [ { "id": "leaves", "name": "leafy", "svg": "leaves" } ],
  "houseNotes": { "bleed": ["Something orange got a little too festive."] } }
```
- During a season, each day has a `config/game.json → seasonItemChance` (default 0.6) chance that one season item replaces a bonus item, and season colors and patterns join the generator.
- `?season=winter` forces a season for testing.
- v1 ships **fall** fully. Winter, spring and summer ship as empty folders with a README, as starter issues.

---

## 16. Messages (`messages/templates.json`)

Every piece of text the game shows is here, so it's easy to edit and translate later.

```json
{
  "houseNotes": {
    "clean": ["Fresh, folded-feeling and smelling great.", "Spotless. Very satisfying."],
    "bleed": ["Your whites are now a very confident pink."],
    "phone_ruined": ["The phone did not survive. Your socks are mourning."],
    "cat_woke": ["The cat woke up mid-cycle. Nobody is happy. (Cat is fine, just offended.)"],
    "grubby": ["No detergent? These are only sort of clean."]
  },
  "noteFallback": { "headline": ["What a load of laundry!"], "byFact": { "bleed": ["The whites had a pink moment."] } },
  "titles": [ { "id": "sock-whisperer", "name": "Sock Whisperer", "rule": "allPairsMatched" } ],
  "defaultTitle": "Laundry Star",
  "signs": { "closed": "...", "maintenance": "...", "busy": "...", "offline": "...", "practice": "...", "reopened": "..." },
  "screens": {
    "goodbye": "Your laundry's all done for today. Come back tomorrow for a fresh basket.",
    "unlock": "New in your closet: {name}!",
    "lostSock": "Lost sock?",
    "oneSheet": "One sheet is plenty.",
    "receiptThanks": ["Have a nice day!", "Thank you for visiting Cozy Wash."],
    "stillThere": "Still there?"
  }
}
```

- Every fact code in section 7 needs at least two house notes and one fallback line. `check-data.mjs` enforces it.
- Title `rule` names map to functions in `engine/receipt.js`: `allPairsMatched`, `bleedHappened`, `catCaught`, `allPocketsChecked`, `allLoadsAbove90`, `noDryerSheets`.
- `titles` is in priority order: the first matching title wins. `defaultTitle` ("Laundry Star") is used when none match.

---

## 17. Configuration (`config/game.json`)

```json
{
  "tiles": { "count": 16, "columns": 4, "traps": 3, "bonus": [1, 2], "pockets": 2, "minLookAlikes": 1, "minDelicates": 1, "maxRepeatsFromYesterday": 4, "allowSameTrapInPocket": false },
  "seasonItemChance": 0.6,
  "rarity": { "common": 70, "uncommon": 25, "rare": 5 },
  "closet": { "startColors": ["white","cream","gray","charcoal","black","navy","red","blue","green","yellow","pink","brown"], "startPatterns": ["solid","stripes"],
              "unlockOrder": ["mustard","plaid","teal","dots","lavender","orange","checks","mint","cherry","stars","sky","purple","hearts","ivory","light-gray","denim-blue","blush-pink"] },
  "dosing": { "detergent": 4, "softener": 3, "bleach": 3, "rescue": 1 },
  "washPhases": { "fill": 8, "tumble": 20, "drain": 7, "spin": 10 },
  "rewashPhases": { "fill": 5, "tumble": 12, "drain": 4, "spin": 4 },
  "dryerSeconds": 15,
  "rules": {
    "bleedTemp": { "cold": -0.25, "warm": 0.10, "hot": 0.35 },
    "bleedPerBleach": 0.05, "bleedMax": 0.95,
    "sudsDetergent": 4, "sudsComboDetergent": 3, "sudsComboSoftener": 2,
    "heavyBleach": 3,
    "rewashBase": 0.35, "rewashPerBleach": 0.20, "rewashRescue": 0.30, "rewashNotCold": 0.05, "rewashMax": 0.90,
    "rewashLimit": 3
  },
  "score": { "ruined": -20, "bleed": -20, "suds": -10, "heavyBleach": -10, "shrunk": -15, "stretched": -10,
             "stained": -10, "lint": -5, "grubby": -15, "static": -5, "fresh": 5, "goodResult": 80 },
  "pay": { "tapHoldMs": 1000, "tapGlitchChance": 0.05 },
  "status": { "timeoutMs": 3000, "autoCheckMinutes": 3, "busyMinutes": 2 },
  "closedLoop": { "sleepMinutes": 30 }
}
```
`check-data.mjs` validates this file against a schema, and every number in sections 4 to 13 comes from here.

---

## 18. Sounds

**42 core sounds and 8 extras, 50 in total.** All the machines are front loaders, so there are no lid sounds. Every core sound has a synthesized fallback in `audio/synth.js`. Extras stay silent if their file is missing.

| # | Sound id | When it plays | Loop |
|---|---|---|---|
| 1 | `ui-click` | Buttons, tabs, cycle choice, Copy, Exit | |
| 2 | `sign-flip` | Door sign swings | |
| 3 | `tile-flip` | Flip a tile | |
| 4 | `bin-drop` | Item into a sorting bin | |
| 5 | `saved-it` | Trap into Don't wash | |
| 6 | `pocket-rustle` | Check a pocket | |
| 7 | `sock-match` | Sock pair snaps together | |
| 8 | `unlock` | New closet color or pattern, new shelf item, reopened | |
| 9 | `door-open` | Washer or dryer opens | |
| 10 | `door-close` | Washer or dryer closes | |
| 11 | `drum-drop` | Item into the washer or dryer | |
| 12 | `pour-liquid` | Detergent, softener or bleach capful | |
| 13 | `pour-powder` | Color rescue scoop | |
| 14 | `dial-click` | Water dial | |
| 15 | `coin-grab` | Take a coin from the cup, or put it back | |
| 16 | `coin-drop` | Coin into the slot | |
| 17 | `coin-clink-1` | Coin lands inside | |
| 18 | `coin-clink-2` | Coin lands inside | |
| 19 | `coin-clink-3` | Coin lands inside | |
| 20 | `coin-start` | Machine kicks on | |
| 21 | `phone-pickup` | Pick up the phone | |
| 22 | `tap-hover` | Phone over the green symbol | |
| 23 | `tap-beep` | Paid | |
| 24 | `tap-decline` | Pulled away early, or glitch | |
| 25 | `wash-fill` | Water rushing in | |
| 26 | `wash-tumble` | Washing | Yes |
| 27 | `wash-drain` | Water draining | |
| 28 | `wash-spin` | Spin up and down | |
| 29 | `wash-end` | Washer buzzer | |
| 30 | `bubble-pop` | Tap the glass | |
| 31 | `rack-hang` | Item onto the drying rack | |
| 32 | `sheet-pull` | Dryer sheet out of the box | |
| 33 | `dryer-start` | Press Start | |
| 34 | `dryer-tumble` | Drying | Yes |
| 35 | `dryer-end` | Dryer buzzer | |
| 36 | `static-zap` | Unloading without a dryer sheet | |
| 37 | `fold-flap-1` | Fold step | |
| 38 | `fold-flap-2` | Fold step | |
| 39 | `basket-drop` | Folded item into the basket | |
| 40 | `result-good` | Score 80 or higher, Load done | |
| 41 | `result-bad` | Score below 80 | |
| 42 | `receipt-print` | Receipt prints | |
| 43 | `sock-roll` | Socks fold, step 3 (extra) | |
| 44 | `fur-smooth` | Smooth fold steps (extra) | |
| 45 | `trap-clank` | Keys, phone or coin in the drum (extra) | |
| 46 | `sneaker-thump` | Sneakers in the drum (extra) | Yes |
| 47 | `suds-overflow` | Suds overflow (extra) | |
| 48 | `tissue-poof` | Tissue exploded (extra) | |
| 49 | `cat-meow` | Cat tile flipped, or cat in the drum (extra) | |
| 50 | `room-tone` | Quiet laundromat background, if turned on (extra) | Yes |

**File rules**
- `.mp3`, mono, 44.1 kHz. One-shots under 2 seconds and 60 KB. Loops 4 to 10 seconds and under 200 KB.
- Loops play through Web Audio with `loopStart` and `loopEnd` from the manifest, which skips the tiny gap MP3 adds.
- Sounds load lazily by screen.
- Every sound has a caption for captions mode.
- Browsers block sound until the first tap, so the sound toggle starts off with a "Tap to turn sound on" hint.
- The settings panel (gear in the header, `src/ui/settings.js`) holds sound on/off, volume, captions, room tone and reduced motion.

```json
{ "wash-tumble": { "file": "wash-tumble.mp3", "loop": true, "loopStart": 0.05, "loopEnd": 6.0, "volume": 0.7, "caption": "Drum tumbling" } }
```

**Where the sound files live**
- **This copy:** no recorded sound files. Every sound is generated in code by `audio/synth.js`, so the game works with sound out of the box. These are placeholders: they can be replaced with licensed commercial sounds, CC0 sounds or your own, by adding files to `sounds/default/` and naming them in the manifest.

**Where to get them** (no self-recording; everything is sourced or generated)

| Source | Which sounds | License | In the public copy? |
|---|---|---|---|
| **Kenney** (kenney.nl) | UI sounds: clicks, sign flip, tile flip, chimes, unlock, good and bad result (about 10) | CC0 | Yes |
| **Freesound** (freesound.org), CC0 filter | Anything missing from the two above | CC0 only | Yes, listed in `CREDITS.md` |
| **Generated in code** (`audio/synth.js`) | Tap-to-pay hover, beep and decline, plus a stand-in for every core sound until its file exists | Ours | Yes |

**Rules**
- This copy has no recorded files. Use CC0 or your own sounds, or sounds you hold a license for.
- Never use CC-BY-NC files.
- Trim every loop (`wash-tumble`, `dryer-tumble`, `sneaker-thump`, `room-tone`) so it repeats without a click, and set `loopStart`/`loopEnd` in the manifest.
- Every file is listed in `sounds/CREDITS.md` with its source and license.


---

## 18a. Look and feel (matches the cover)

The whole game uses the cover's look (`docs/cover.html`): a soft blue laundromat, glossy white machines with dark glass doors, a neon sign, a plant. Every screen should feel like the same room.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#dceffc` | `#10222e` | Page background |
| `--ink` | `#18394d` | `#e6f3fb` | Main text |
| `--muted` | `#527284` | `#9bb7c7` | Secondary text (check 4.5:1 on its background) |
| `--accent` | `#398caf` | `#6cbbe0` | Links, highlights, active tabs |
| `--button` | `#224b60` | `#3f7d9b` | Main buttons (white text) |
| `--button-hover` | `#326780` | `#4f93b4` | Button hover |
| `--machine` | `#ffffff` → `#c9d7e3` gradient | `#dfe8ef` → `#9fb2c1` | Washer and dryer bodies |
| `--machine-edge` | `#c3d3df` | `#7e93a3` | Machine borders, dividers |
| `--glass` | `#396177` → `#0c2636` | same | Washer glass |
| `--glass-dry` | `#705b45` → `#282e35` | same | Dryer glass |
| `--display` | `#19394b` with `#9cf6e4` text | same | Machine timers |
| `--neon-pink` | `#ff6ed7` | same | Neon sign glow |
| `--neon-cyan` | `#54f5ef` | same | Neon sign second line |
| `--ok` | `#61bd97` (dot), `#47877b` (text) | `#7fd3ad` | Open, paid, good scores |
| `--warn` | `#e0a030` | `#f0b84a` | Busy, reader glitch |
| `--plant` | `#6b9d83`, `#477f69`, `#85ae91` | same | Plant leaves |
| `--pot` | `#df9c7b` → `#f4bb9b` | same | Plant pot |
| `--paper` | `#fffdf6` | `#fffdf6` | Receipt (always light) |

- **Type:** **Outfit** (headings, neon sign, brand) and **DM Sans** (body, buttons), loaded from Google Fonts with `display=swap` and system fallbacks. Machine timers and the receipt use the system monospace font.
- **Shapes:** soft rounded corners (20 px machines, 24 to 32 px buttons and dialogs), light shadows, subtle gradients on machine bodies and door rings like the cover.
- **Motion:** smooth, never bouncy. Drums spin like the cover (washer about 4 s a turn, dryer about 7 s in reverse), water sloshes, the neon glows slowly.
- **Layout:** centered scenes, max width about 1250 px, the machines as the centerpiece. The cover's phone breakpoints (760 px and 520 px) are the pattern for every screen.
- All colors live as CSS variables on `:root`, so a future theme only changes those.

---

## 19. Accessibility and performance

- Mouse, touch and keyboard everywhere. Every drag has a keyboard or tap alternative. Focus is always visible.
- Text labels on every bin, color and sign, never color alone. Pink items say "(pink)".
- Captions mode shows sound captions as toasts.
- `prefers-reduced-motion`: no spins, tilts or flips, just fades and shape swaps.
- AA contrast for text.
- Initial load under 500 KB, not counting sounds and the two web fonts. No framework, no third-party scripts except the optional analytics.
- Works at 360 px wide with no horizontal scroll.

---

## 20. Milestones and acceptance checks

| # | Milestone | Done when |
|---|---|---|
| M1 | **Scaffold** | The file tree exists. `npm run check` and `npm test` pass in CI. `npm run serve` shows the app shell in Practice mode with all tabs open |
| M2 | **Data and rules** | 20 named items, 18 garments, 24 colors, 7 patterns, 8 fabrics, 6 folds, art for every garment and item, the fall season, templates and config all pass `check-data.mjs`. `generate.test.mjs` and `rules.test.mjs` pass |
| M3 | **Sort** | The 4 × 4 grid follows section 4: traps, look-alike, pockets, sock pair, saved-it, keyboard play. The same date gives the same tiles. `pile.test.mjs` passes, including the variety check over 10 days |
| M4 | **Load and pay** | Washer, cycle, water dial, detergent shelf and dispenser drawer, loading the drum, coin cup and tap-to-pay phone, with synth sounds |
| M5 | **Wash and result** | The 45-second cycle runs in sync with sound. The outcome comes from `rules.js` and the house note from templates. Rewash works with the 25-second quick cycle, up to 3 times |
| M6 | **Dry and fold** | Drag to dryer or rack, Move all, dryer sheet, Start, 15-second dry. Every fold is 4 taps and ends as a square or rectangle. Items land in the basket. Reduced motion works |
| M7 | **API** | `/api/status` and `/api/recap` work with `vercel dev`. `api.test.mjs` covers ok, invalid JSON, timeout, per-minute 429, daily-cap 429, 402 and the cookie |
| M8 | **Receipt and once a day** | Section 13's acceptance check passes |
| M9 | **Closed and signs** | Section 12's acceptance check passes. The closed screen loop, Check again, auto-check and sleep timer all work |
| M10 | **Sound pack** | All 42 core sounds have files (Kenney or Freesound CC0, or your own) or synth fallbacks. Loops have no audible click. `CREDITS.md` is complete |
| M11 | **Launch** | Deployed on Vercel, cozywash.app connected, OpenRouter key set up, docs written, issue templates and labels in place, `hacktoberfest` topic added, 10 or more `good first issue`s open |

### Deploy steps (M11)
1. Create the OpenRouter key and set its daily credit limit to $0. When players start hitting 50 a day, buy $10 of credits once to raise the allowance to 1,000.
2. Check that both model names in `config/model.json` are still listed on openrouter.ai.
3. Import the GitHub repo into Vercel. No build command; the output is the repo root.
4. Add `OPENROUTER_API_KEY` and `COZY_COOKIE_SECRET` (a long random string) to Production only. Previews run without them and use house notes, which is safe for pull requests from forks.
5. Add `cozywash.app` in Vercel and set the DNS records at Porkbun as Vercel shows them.
6. Check that `/api/status` says open and that finishing a game gives a receipt with `"source":"model"`.

### GitHub setup
- Topics: `hacktoberfest`, `game`, `javascript`, `open-source`.
- Labels: `good first issue`, `help wanted`, `item`, `wardrobe`, `season`, `sound`, `fold`, `a11y`, `bug`, `hacktoberfest-accepted`.
- Starter issues: winter, spring and summer seasons; new colors, patterns, garments and fabrics; new traps; new house notes and titles; better or alternate sound effects (CC0 or generated); the dig-through pile (v2); translations; a spoken attendant voice (later).

---

## 21. Decisions

**Decided by the owner**
- Name Cozy Wash, domain cozywash.app, public repo, Hacktoberfest
- No database, no logins; OpenRouter with free open-weight models, no frontier models; $0 a day, $10 once when needed
- Once a day: a full basket ends the game; a receipt shows everything done and says "Have a nice day! Thank you for visiting Cozy Wash." with an Exit button
- One live note per player per day; replays limited by a browser save plus a signed cookie (a private window can still replay; accepted)
- 16 tiles in a 4 × 4 grid, no levels; the clothes change every day
- Growing wardrobe: garment × color × pattern × fabric; each player's closet grows daily; contributors grow it for everyone
- Five bins including Delicates; multiple loads per game
- Washer: cold, warm or hot; 45-second wash
- Drag clothes to the dryer; no dryer settings; 15 seconds
- Dryer sheets
- Every fold is 4 taps and ends as a square or rectangle; folded items go into a white laundry basket
- Coin cup (click the cup, tap the machine) and tap to pay (pick up the phone, hold it over the glowing green symbol, it shows Paid) on every machine; unlimited
- Item-only damage; rewash allowed, up to 3 tries
- Closed message: "Cozy Wash is closed for the day. We've washed enough bundles today."; endless wash loop with Check again and auto-check; signs for every state
- Counts of items washed, dried and folded
- Seasons
- Flip-tile sorting for v1, dig-through pile later
- The cover page (owner's design) sits in front of the game, and the whole game matches its look: soft blue, glossy machines, Outfit and DM Sans

**Defaults (change before building if needed)**

| Question | Default |
|---|---|
| Language | Plain JS ES modules, JSDoc comments, Zod on the server only |
| Model's job | Writes the receipt note only; code decides outcomes |
| License | MIT |
| Flipped tiles | Lock in once sorted |
| Seasons | Follow the calendar, with a URL override |
| Drying rack | Hang dry items go on the rack; in the dryer they shrink |
| Rewash | Pay again, 25-second quick cycle |
| Closed | Stops new games; games in progress always finish |
| Day boundary | Player's local midnight; live notes reset at midnight UTC |

---

## 22. Known risks

- **One person can drain the daily allowance** from private windows. Accepted for v1.
- **Free model names change.** They're in `config/model.json`; check before launch.
- **Structured output support varies by provider.** `require_parameters: true` handles it, and template notes cover failures.
- **Sound licenses.** Follow the rules in section 18: licensed commercial sounds only with a license that allows it, CC0 from Kenney or Freesound, never NC. When unsure, leave the file out.
