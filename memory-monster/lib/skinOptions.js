// The one list of looks a skin can use. The skin checker, the Look Studio and the tests all read
// this, so adding a look means adding it here and giving it a rule in app/globals.css.

export const FACES = [
  { id: "void", label: "Black void" },
  { id: "skull", label: "Skull" },
  { id: "mask", label: "Pale mask" },
  { id: "grin", label: "Glowing grin" },
  { id: "redhead", label: "Redhead" },
  { id: "alien", label: "Green alien" },
];

export const OUTFITS = [
  { id: "hood", label: "Hood and long coat" },
  { id: "cloak", label: "Cloak" },
  { id: "trench", label: "Trench coat and hat" },
  { id: "tophat", label: "Top hat and tails" },
  { id: "hoodie", label: "Hoodie and jeans" },
];

export const DOORS = [
  { id: "wood", label: "Wooden door" },
  { id: "metal", label: "Metal door" },
  { id: "curtain", label: "Stage curtain" },
  { id: "portal", label: "Portal" },
];

export const OPENS = [
  { id: "swing", label: "Swings open" },
  { id: "slide", label: "Slides open" },
];

export const ENTRANCES = [
  { id: "walk-out", label: "Walks out" },
  { id: "rise", label: "Rises up" },
  { id: "slide", label: "Slides in" },
  { id: "drop", label: "Drops down" },
];

export const EYE_COLORS = [
  { id: "#ff2a2a", label: "Red" },
  { id: "#38bdf8", label: "Ice blue" },
  { id: "#4ade80", label: "Green" },
  { id: "#facc15", label: "Gold" },
  { id: "#c084fc", label: "Violet" },
  { id: "#f8fafc", label: "White" },
];

export const ids = (list) => list.map((o) => o.id);
