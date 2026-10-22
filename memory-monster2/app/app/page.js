import MonsterApp from "../../components/MonsterApp";
import { loadSiteData } from "../../lib/readSkins.js";

export const metadata = { title: "Memory Monster - the app" };

// Built once at deploy time: the skin folders and settings.json are read from disk, so the
// browser gets them as plain data. Adding a skin folder and redeploying is all it takes.
export const dynamic = "force-static";

export default function AppPage() {
  const { defaults, skins } = loadSiteData();
  return <MonsterApp defaults={defaults} skins={skins} />;
}
