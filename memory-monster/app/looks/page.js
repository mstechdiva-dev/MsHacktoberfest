import LookStudio from "../../components/LookStudio";
import { loadSiteData } from "../../lib/readSkins.js";

export const metadata = { title: "Look Studio - Memory Monster" };
export const dynamic = "force-static";

export default function LooksPage() {
  const { defaults, skins } = loadSiteData();
  return <LookStudio defaults={defaults} skins={skins} />;
}
