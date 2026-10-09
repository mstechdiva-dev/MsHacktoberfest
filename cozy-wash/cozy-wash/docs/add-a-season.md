# Add a season

Seasons follow the calendar (`config/seasons.json`). Fall is done; winter, spring and summer are open.

Winter, spring and summer are empty folders with a README. Add `seasons/<id>/season.json` (copy `seasons/fall/season.json` to start), delete the README, and fill in:

```json
{
  "id": "winter",
  "name": "Winter",
  "accent": "#7fb2d6",
  "itemIds": ["ugly-sweater", "mittens"],
  "colors": [{ "id": "frost", "name": "Frost", "hex": "#dfeef7", "bin": "white", "bleed": 0 }],
  "patterns": [{ "id": "snowflakes", "name": "snowflake", "svg": "stars" }],
  "houseNotes": { "bleed": ["Something red got into the snow."] }
}
```

- Each item in `itemIds` needs its own file in `items/` with `"season": "winter"` and `"kind": "bonus"`.
- Season colors and patterns only show up while the season is on.
- Season house notes are added in front of the normal ones.

Try it with `?season=winter&newday=1&fast=1`, then `npm run check`.
