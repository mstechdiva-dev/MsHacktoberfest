// Builds the site as plain files and copies them next to the app, so the desktop app needs
// no Vercel and no internet. Run with: npm run build:site
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import stamp from "./siteStamp.cjs";

const here = import.meta.dirname;
const root = path.resolve(here, "..", "..");
const site = path.resolve(here, "..", "site");

// The site's own packages (Next.js and React) are installed on the first run, so the desktop
// folder is all anyone has to set up by hand.
if (!fs.existsSync(path.join(root, "node_modules", "next"))) {
  console.log("Installing the site's packages (first run only)...");
  execSync("npm install", { cwd: root, stdio: "inherit" });
}

execSync("npm run build", { cwd: root, env: { ...process.env, MM_EXPORT: "1" }, stdio: "inherit" });

fs.rmSync(site, { recursive: true, force: true });
fs.cpSync(path.join(root, "out"), site, { recursive: true });
// The landing page video is for the web, not for the app.
fs.rmSync(path.join(site, "memory-monster-short.mp4"), { force: true });
// Remember what this build came from, so ensure-site.mjs can tell when the code has changed.
fs.writeFileSync(path.join(site, ".built-from"), stamp.siteFingerprint(root));
console.log(`Site copied to ${site}`);
