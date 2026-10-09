# Add a fold

A fold is 5 frames and 4 taps on a 100 × 100 folding table (`folds/<id>.json`).

```json
{
  "id": "towel",
  "frames": [
    [[10,20],[90,20],[90,80],[10,80]],
    [[10,20],[50,20],[50,80],[10,80]],
    [[10,50],[50,50],[50,80],[10,80]],
    [[30,50],[50,50],[50,80],[30,80]],
    [[30,65],[50,65],[50,80],[30,80]]
  ],
  "steps": [
    { "label": "1", "point": [80, 50], "line": [[50,0],[50,100]], "ms": 380, "hint": "Fold in half" },
    { "label": "2", "point": [30, 30], "line": [[0,50],[100,50]], "ms": 380, "hint": "Fold in half the other way" },
    { "label": "3", "point": [15, 65], "line": [[30,0],[30,100]], "ms": 380, "hint": "Fold in half again" },
    { "label": "4", "point": [40, 55], "line": [[0,65],[100,65]], "ms": 420, "hint": "One last half" }
  ],
  "finish": "square"
}
```

- Frame 0 is the item lying flat. Frames 1 to 4 are its shape after each tap.
- **Every frame needs the same number of points**, in the same order, so the game can slide between them. Repeat a point if a corner disappears.
- Put each tap `point` on the part that moves.
- Every step needs a short `hint` ("Fold the left side in"). It shows above the table while that step is active.
- A sock folded without its partner swaps its first hint for `loneHint` if the step has one (see `folds/socks.json`).
- The last frame should be a tidy square or rectangle.

Add the id to `folds/index.json`, point a garment's or item's `fold` at it, and run `npm run check`.
