# Contributing to Cozy Wash

Thanks for stopping by. Most of the game is data, so a lot of good changes are just a new JSON file.

## Getting set up

```bash
npm install
npm run serve      # http://localhost:5173, Practice mode
npm run check      # checks every data file, and says in plain words what to fix
npm test
```

Add `?fast=1&dev=1&newday=1` to the URL while you work. It speeds up the timers, opens every tab and lets you replay the day.

## Good first changes

- A new named item: a trap, a bonus piece or a look-alike ([guide](docs/add-an-item.md))
- A new color, pattern, fabric or garment ([guide](docs/add-a-garment-or-color.md))
- A season: winter, spring and summer are waiting ([guide](docs/add-a-season.md))
- House notes and receipt titles in `messages/templates.json`
- A fold for a new shape ([guide](docs/add-a-fold.md))
- Sounds, CC0 only ([guide](docs/add-a-sound-pack.md))
- Accessibility fixes: keyboard play, screen reader text, contrast

## Rules of the house

- Keep it cozy. No gore, nothing mean, nothing scary beyond a sleepy cat in the laundry.
- Outcomes come from `src/engine/rules.js`, never from the model.
- Model text is shown with `textContent` or escaped. Never put it in `innerHTML` raw.
- Sounds must be CC0 or made by you. No CC-BY-NC. List every file in `sounds/CREDITS.md`.
- `npm run check` and `npm test` must pass.

## Pull requests

1. Fork, branch, change.
2. Run `npm run check` and `npm test`.
3. Play through once with `?fast=1` if you touched anything you can see.
4. Open the PR and fill in the template. Screenshots help for anything visual.

By contributing you agree your work is shared under the MIT license, and you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
