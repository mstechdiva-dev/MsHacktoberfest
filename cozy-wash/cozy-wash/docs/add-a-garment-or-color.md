# Add a garment, color, pattern or fabric

Everyday clothes are built from four parts, so one new part adds lots of new pieces.

## Color — `wardrobe/colors.json`

```json
{ "id": "sage", "name": "Sage", "hex": "#9cb59a", "bin": "color", "bleed": 0.05 }
```

- `bin` is `white`, `dark` or `color`.
- `bleed` is the chance (0 to 1) it turns whites pink. Most colors are 0 to 0.1; reds are higher.
- Add `"looksLike": "white"` (or another bin) if it's easy to mis-sort.
- To make players unlock it, add the id to `closet.unlockOrder` in `config/game.json`. Otherwise add it to `closet.startColors`.

## Pattern — `wardrobe/patterns.json`

```json
{ "id": "zigzag", "name": "zigzag", "svg": "stripes" }
```

`svg` picks how it's drawn (`solid`, `stripes`, `dots`, `checks`, `plaid`, `stars`, `hearts`, `leaves`). A brand-new drawing needs a case in `patternDef` in `src/ui/svg.js`.

## Fabric — `wardrobe/fabrics.json`

```json
{ "id": "corduroy", "name": "corduroy", "care": { "gentle": false, "maxTemp": "warm", "bleach": false, "dryer": true, "shrinks": true } }
```

Gentle fabrics make the piece a Delicate. `bleedBonus` makes it bleed more.

## Garment — `wardrobe/garments/<id>.json`

```json
{ "id": "skirt", "name": "skirt", "art": "pants", "fold": "pants",
  "fabrics": ["cotton", "denim"], "patterns": ["solid", "plaid", "dots"],
  "pair": false, "sturdyLooking": false, "pocket": { "chance": 0.3, "contents": ["tissue", "coin"] } }
```

Add the id to `wardrobe/garments/index.json`. Then `npm run check`.
