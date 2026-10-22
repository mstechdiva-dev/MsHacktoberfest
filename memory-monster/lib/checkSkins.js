// Checks every skin folder with the same rules the site uses, so a mistake shows up in the
// terminal before anyone builds or deploys.
import { resolveSkin } from "./skins.js";

// skins: [{ id, source, raw, error }] as read by lib/readSkins.js
export function checkSkins(skins) {
  return skins.map((s) => {
    if (s.error) return { id: s.id, source: s.source, problems: [s.error] };
    return { id: s.id, source: s.source, problems: resolveSkin(s.raw).problems };
  });
}
