// Server side only (build time): reads the skin folders and settings.json from disk.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readSkins(dir, source) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(base, d.name, "skin.json"), "utf8"));
        return { id: d.name, source, raw, error: "" };
      } catch (e) {
        return { id: d.name, source, raw: null, error: "skin.json is missing or is not valid JSON" };
      }
    });
}

export function loadSiteData() {
  const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, "settings.json"), "utf8"));
  const skins = [...readSkins("skins", "built-in"), ...readSkins("community-skins", "community")];
  return { defaults, skins };
}
