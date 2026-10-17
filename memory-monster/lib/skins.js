// Skin loading. Every field is optional; anything missing or wrong falls back to the default
// figure, so a broken skin can never break the app.

import { FACES, OUTFITS, DOORS, OPENS, ENTRANCES, ids } from "./skinOptions.js";

export const DEFAULT_SKIN = {
  name: "Hooded Figure",
  author: "Cheryl",
  eyes: { color: "#ff2a2a", size: 1, glow: 1, pulseSeconds: 1.2, flicker: true },
  outfit: { style: "hood", hood: "#0a0a0e", coat: "#050507" },
  face: { style: "void" },
  door: { style: "wood", glow: "#ff0000", opens: "swing" },
  mood: { darkness: 0.75, tint: "#280000" },
  entrance: { style: "walk-out" },
  words: {
    arrive: "You are running all of this at once.",
    reminder: "Still crowded. Close a few and I will go back to the dark.",
    leave: "Better. Back to the dark.",
  },
};

const COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// Merge one section, checking each field with its own validator. Bad values are reported, not used.
// A few fields (face.color, face.hair, outfit.accent) have no default here: when a skin leaves
// them out, the stylesheet uses the colors that suit the chosen face or outfit.
function section(raw, key, checks, problems) {
  const base = DEFAULT_SKIN[key];
  const src = isObj(raw?.[key]) ? raw[key] : {};
  const out = { ...base };
  for (const [field, ok] of Object.entries(checks)) {
    if (src[field] === undefined) continue;
    if (ok(src[field])) out[field] = src[field];
    else problems.push(`${key}.${field} is not valid, so the default is used.`);
  }
  return out;
}

const color = (v) => typeof v === "string" && COLOR.test(v);
const num = (min, max) => (v) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const oneOf = (list) => (v) => list.includes(v);
const text = (v) => typeof v === "string" && v.length > 0 && v.length <= 160;

export function resolveSkin(raw) {
  const problems = [];
  if (!isObj(raw)) {
    return { skin: DEFAULT_SKIN, problems: ["The skin file could not be read, so the default figure is used."] };
  }
  const skin = {
    name: text(raw.name) ? raw.name : DEFAULT_SKIN.name,
    author: text(raw.author) ? raw.author : DEFAULT_SKIN.author,
    eyes: section(raw, "eyes", { color, size: num(0.3, 3), glow: num(0, 2), pulseSeconds: num(0.2, 10), flicker: (v) => typeof v === "boolean" }, problems),
    outfit: section(raw, "outfit", { style: oneOf(ids(OUTFITS)), hood: color, coat: color, accent: color }, problems),
    face: section(raw, "face", { style: oneOf(ids(FACES)), color, hair: color }, problems),
    door: section(raw, "door", { style: oneOf(ids(DOORS)), glow: color, opens: oneOf(ids(OPENS)) }, problems),
    mood: section(raw, "mood", { darkness: num(0, 0.95), tint: color }, problems),
    entrance: section(raw, "entrance", { style: oneOf(ids(ENTRANCES)) }, problems),
    words: section(raw, "words", { arrive: text, reminder: text, leave: text }, problems),
  };
  return { skin, problems };
}

// skins is the list the server read from disk: [{ id, source, raw }] where raw is the parsed
// skin.json, or null with error set when the file would not parse.
export function pickSkin(skins, id) {
  const found = skins.find((s) => s.id === id);
  if (!found) {
    return { skin: DEFAULT_SKIN, problems: [`No skin named "${id}" was found, so the default figure is used.`] };
  }
  if (found.error) {
    return { skin: DEFAULT_SKIN, problems: [`${found.id}/skin.json has a problem (${found.error}), so the default figure is used.`] };
  }
  return resolveSkin(found.raw);
}
