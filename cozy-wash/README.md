# Cozy Wash

A cozy laundry game you play once a day. Flip the tiles to find the laundry, sort it, dose the washer, pay with a coin or a tap, wash, dry, and fold each piece into the basket. When the basket's full, a receipt prints and you're done until tomorrow.

Watch out for the red sock in the whites, the phone in a pocket and the cat napping in the pile.

Live at **[cozywash.app](https://cozywash.app)**. Built in the open for Hacktoberfest 2026.

## Contents

- [How to play](#how-to-play)
- [Run it on your computer](#run-it-on-your-computer)
- [Run it with the attendant's note](#run-it-with-the-attendants-note)
- [Put it online](#put-it-online)
- [How to change and add things](#how-to-change-and-add-things)
- [About the sounds](#about-the-sounds)
- [Checks and tests](#checks-and-tests)
- [Handy URL switches](#handy-url-switches)
- [How it fits together](#how-it-fits-together)
- [Contributing](#contributing)

## How to play

You get one new basket a day. The same date always gives the same basket.

1. **Cover.** Press Enter to go in.
2. **Sort.** Sixteen tiles are face down. Flip a tile to see the piece, then put it in a bin: Whites, Darks, Colors, Delicates, or Don't wash for anything that shouldn't go in the machine. Check the pockets, and watch for a lone sock.
3. **Load.** Each bin is a load. Pick the cycle and the water, add detergent, softener or bleach, then pay with a coin or a tap.
4. **Wash.** Watch the cycle run: fill, tumble, drain, spin. If a load comes out pink, stained or grubby, you can rewash it, up to three times.
5. **Dry.** Move each piece to the dryer or the drying rack. Anything marked Hang dry goes on the rack. Add one dryer sheet, or live with a little static.
6. **Fold.** Follow the guide line and fold each piece into a neat square or rectangle, then drop it in the basket.
7. **Receipt.** A receipt prints with everything you did, a title like Cat Rescuer or Sock Whisperer, and a short note from the attendant.

Every finished day unlocks one more color or pattern for your closet, until you have them all.

**Keyboard.** The whole game plays with a keyboard. Tab moves between buttons, and Enter or Space presses them. On the sort screen the arrow keys move between the tiles, Enter flips one, and the number keys 1 to 5 put the piece in a bin (1 Whites, 2 Darks, 3 Colors, 4 Delicates, 5 Don't wash). There are captions for every sound, a reduced-motion setting, and light and dark themes that follow your device.

## Run it on your computer

You need **Node 20 or newer**.

```bash
git clone https://github.com/MSHacktoberfest/cozywash.git
cd cozywash
npm install
npm run serve
```

Open http://localhost:5173.

With no API running, the game plays in **Practice mode**. Everything works, the receipt uses a house note, and all six step tabs are open from the first screen, so you can jump straight to sort, load, wash, dry, fold or the receipt. Opening a tab before you've started makes a demo load for you.

No API key, network or sound files are needed.

## Run it with the attendant's note

The note on the receipt can come from a model through [OpenRouter](https://openrouter.ai). The model only writes that one short line. The game decides every outcome in code.

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm install --global vercel`.
2. Copy the example settings: `cp .env.example .env.local`.
3. Open `.env.local` and fill in:
   - `OPENROUTER_API_KEY`: your OpenRouter key. Leave it empty to always use house notes.
   - `COZY_COOKIE_SECRET`: any long random string. It signs the once-a-day cookie. Leave it empty to skip the cookie.
   - `COZY_MAINTENANCE`: `0` normally. Set it to `1` to show the "closed for a quick tidy-up" sign.
4. Start it: `npm run dev`.

Never commit `.env.local`. It is already in `.gitignore`.

## Put it online

The project is plain files plus a few functions in `api/`, so it deploys to [Vercel](https://vercel.com) without a build step.

1. Push your copy to GitHub and import it as a new project in Vercel.
2. Leave the build command and output folder empty.
3. In the project's settings, add the same three names as above (`OPENROUTER_API_KEY`, `COZY_COOKIE_SECRET`, `COZY_MAINTENANCE`) as environment variables.
4. Deploy. To use your own domain, add it in Vercel's Domains settings and set the DNS records Vercel shows you.
5. Visit the site and play one game to check the receipt prints.

The daily cap is OpenRouter's free-model allowance. When it runs out, the shop shows a closed sign until midnight UTC, and a game you've already started always finishes.

To switch the shop off for a while, set `COZY_MAINTENANCE=1` and redeploy.

## How to change and add things

Clothes, colors, folds, seasons, house notes and sounds are all data files, so most changes need no code. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then pick a guide:

| I want to... | Do this |
|---|---|
| Add an item (a piece of laundry) | Follow [Add an item](docs/add-an-item.md). `npm run draft-item` starts the file for you. |
| Add a garment or a color | Follow [Add a garment or color](docs/add-a-garment-or-color.md). |
| Add a season | Follow [Add a season](docs/add-a-season.md). Fall is the first season. Winter, spring and summer are open for you to build. |
| Add a fold | Follow [Add a fold](docs/add-a-fold.md). |
| Add or replace sounds | Follow [Add a sound pack](docs/add-a-sound-pack.md), or the short steps below. |
| Change how the game plays (timings, cap, rules) | Edit `config/game.json`, then run `npm run check`. |
| Change the colors of the whole look | Edit the tokens at the top of `styles/main.css`. They come in light and dark. |
| Change the house notes on the receipt | Edit the files in `messages/`. Every fact needs at least two house notes and a fallback line. |
| Understand the code | Read [docs/architecture.md](docs/architecture.md). |

After any change, run `npm run check` and `npm test`. They tell you in plain words what's wrong.

### Replace a sound

Every sound in the game is made in code, and any one of them can be replaced with a recording. You can use CC0 sounds, sounds you made, or licensed commercial sounds.

1. Get a short mono or stereo **mp3**. One-shots work best under 2 seconds. Loops should be 4 to 10 seconds.
2. Put the file in `sounds/default/`.
3. Open `sounds/default/manifest.json`, find the sound by its name (for example `ui-click`) and change `"file": null` to the file name, `"file": "click.mp3"`. One file can serve several sounds.
4. For a **loop** (`wash-tumble`, `wash-fill`, `wash-drain`, `wash-spin`, `dryer-tumble`), trim the file so its end meets its start with no click. The game repeats the whole file after skipping the first 0.05 s. Set `loopEnd` only to repeat part of it.
5. Optionally add `"maxSeconds": 1.5` to a one-shot. The game stops it there with a short fade, so a long recording is never a problem. The game also cuts silence off the start and end of short sounds by itself.
6. List the file in `sounds/CREDITS.md` with its source and license.
7. Run `npm run check`. It fails if the manifest names a missing file or a file isn't credited.

## About the sounds

This copy has **no recorded sound files**. Every sound is made in code (`src/audio/synth.js`), so the game plays with sound out of the box. These are placeholders: they can be replaced with licensed commercial sounds, or any sounds you have the right to use, one at a time and without changing any code. See [Replace a sound](#replace-a-sound), [docs/add-a-sound-pack.md](docs/add-a-sound-pack.md) and [sounds/CREDITS.md](sounds/CREDITS.md).

Sounds start off until the player turns them on.

## Checks and tests

```bash
npm run check   # every data file, and the rules the data has to follow
npm test        # the game, the data checks, the API, the look
```

`npm run check` reads all the data files and tells you in plain words what's wrong. Among other things it makes sure:

- every fact has at least two house notes and a fallback line,
- every title points at a rule that exists,
- `config/game.json` has every setting it should, with sensible values,
- each item's fields make sense (care, rarity, pockets, unlocks, traps with no fold),
- every fold really ends as a neat square or rectangle,
- every sound has a caption and a stand-in,
- every sound file in the manifest exists and is credited.

`npm test` covers the wash rules, the daily basket (including a year of days that never repeat more than four pieces), 10,000 generated pieces, sorting and lost socks, the receipt line by line, the status signs, the API with a fake OpenRouter, and the colors, including text contrast in light and dark. It also tries broken copies of the data to make sure the checks catch them.

CI runs both on every pull request.

## Handy URL switches

| Add to the URL | What it does |
|---|---|
| `?fast=1` | Runs every timer 10× faster |
| `?dev=1` | Opens every step tab and skips the live note |
| `?newday=1` | Lets you play again today (localhost and `*.vercel.app` previews only) |
| `?season=fall` | Forces a season |
| `?sign=closed` | Shows a status sign: `closed`, `maintenance`, `busy`, `offline`, `practice`, `done`, `reopened` |

The signs are the pill in the header, the door sign on the load screen, the cover's Enter button, and the closed screen. `?sign=reopened` shows the closed screen and then reopens it, so you can see the toast and the Start button.

## How it fits together

- Plain HTML, CSS and JavaScript modules. No build step: `index.html` loads `src/main.js`.
- The game decides every outcome in code (`src/engine/rules.js`). The model only writes one short line on the receipt.
- No database and no accounts. Your closet, shelf, receipts and clean-load streak live in your browser. A damaged or older save is tidied up when it loads.
- Clothes, colors, folds, seasons and sounds are all data files, so you can add to the game without touching code.
- Every color is a token at the top of `styles/main.css`, in light and dark, so a new theme only changes those.
- Node is only for the `api/` functions, the tests and the tools. `zod` is the only dependency.

More detail in [docs/architecture.md](docs/architecture.md) and the full design in [PLAN.md](PLAN.md).

## Contributing

New items, colors, garments, folds, seasons, house notes and sounds are all welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then pick a guide from [How to change and add things](#how-to-change-and-add-things). Open an issue with one of the templates, or send a pull request.

## License

[MIT](LICENSE)
