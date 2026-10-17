import fs from "node:fs";
import path from "node:path";
import Landing from "../components/Landing";
import { loadSiteData } from "../lib/readSkins.js";
import { resolveSkin } from "../lib/skins.js";

export const dynamic = "force-static";

// The landing page. It is built from the same skins and settings as the app, so what it shows
// can never drift from what the app does.
export default function HomePage() {
  const { defaults, skins } = loadSiteData();
  const looks = skins
    .filter((s) => !s.error)
    .map((s) => ({ id: s.id, source: s.source, skin: resolveSkin(s.raw).skin }));
  // The short video is optional: the page shows it only when public/memory-monster-short.mp4 exists.
  const hasVideo = fs.existsSync(path.join(process.cwd(), "public", "memory-monster-short.mp4"));
  return <Landing defaults={defaults} looks={looks} hasVideo={hasVideo} />;
}
