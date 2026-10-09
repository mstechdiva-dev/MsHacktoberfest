# Add an item

Named items are the special pieces in the basket: traps, bonus pieces and look-alikes. Everyday clothes come from the wardrobe instead ([guide](add-a-garment-or-color.md)).

1. Start a file:

   ```bash
   npm run draft-item -- rain-boots "Rain boots" --kind bonus --bin color --art sneaker
   ```

   This writes `items/rain-boots.json` and adds it to `items/index.json`.

2. Fill it in:

   | Field | What it means |
   |---|---|
   | `kind` | `everyday`, `bonus`, `trap` or `pocket` |
   | `bin` | The right bin: `white`, `dark`, `color`, `delicate` or `nowash`. Traps are always `nowash` |
   | `color`, `pattern` | Hex color and a pattern id from `wardrobe/patterns.json` |
   | `art` | A shape from `art/` |
   | `fold` | A fold from `folds/`, or `null` to go straight into the basket |
   | `tags` | The care tag lines the player sees |
   | `care` | `gentle`, `maxTemp` (`cold`/`warm`/`hot`), `bleach`, `dryer`, `shrinks` |
   | `rarity` | `common`, `uncommon` or `rare` |
   | `season` | A season id, or `null` |
   | `bleeder` | Optional, 0 to 1: how likely it is to bleed into whites |
   | `pair` | `true` if it comes as two tiles that pair up (socks) |
   | `pocket` | `null`, or `{ "chance": 0.5, "contents": ["tissue", "coin"] }` using ids of other items |
   | `unlock` | `null`, or `{ "type": "cleanStreak", "count": 3 }`: it stays out of the pile until the player has finished that many clean loads in a row (a load counts as clean at 90 or above). Then it joins their shelf |
   | `onWrong` | What happens if it gets washed: `damage` is `none`, `self`, `neighbors` or `stain`, and `fact` names the house note |
   | `shelf` | `true` if it goes on the player's shelf instead of the basket |

3. If you used a new `fact`, add it to `factPriority` in `messages/templates.json`, with at least two lines in `houseNotes` and one in `noteFallback.byFact`. `npm run check` fails until you do.

4. Run `npm run check` and `npm test`, then play with `?fast=1&newday=1` until your item shows up.

Need a new shape? Add `art/<id>.json` with a `viewBox`, an `outline` path and a few `details` paths, and list it in `art/index.json`.
