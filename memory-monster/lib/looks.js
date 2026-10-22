// A "look" is the part of a skin you can change from the Look Studio without editing a file.
// It is laid over the chosen skin and checked by the same rules, so a bad value is dropped.
import { resolveSkin } from "./skins.js";

const SECTIONS = ["face", "outfit", "door", "entrance", "eyes"];
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

export function applyLook(skin, look) {
  if (!isObj(look)) return { skin, problems: [] };
  const merged = { ...skin };
  for (const key of SECTIONS) {
    if (isObj(look[key])) merged[key] = { ...skin[key], ...look[key] };
  }
  return resolveSkin(merged);
}

// What gets copied from the Look Studio: a complete skin.json, ready to drop in a skin folder.
export function skinToJson(skin, name = "My Look", author = "your name") {
  return JSON.stringify({ ...skin, name, author }, null, 2) + "\n";
}
