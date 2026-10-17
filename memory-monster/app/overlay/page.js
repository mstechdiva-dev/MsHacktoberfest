import OverlayApp from "../../components/OverlayApp";
import { loadSiteData } from "../../lib/readSkins.js";

export const metadata = { title: "Memory Monster - overlay" };
export const dynamic = "force-static";

// The page the desktop app draws over your screen. In a plain browser it explains itself.
export default function OverlayPage() {
  const { defaults, skins } = loadSiteData();
  return <OverlayApp defaults={defaults} skins={skins} />;
}
