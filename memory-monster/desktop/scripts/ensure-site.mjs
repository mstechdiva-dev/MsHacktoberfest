// Makes sure the site inside the app matches the code next to it. Rebuilds only when something
// changed, so a normal start stays fast and an edited skin or setting shows up on its own.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import stamp from "./siteStamp.cjs";

const here = import.meta.dirname;
const root = path.resolve(here, "..", "..");
const site = path.resolve(here, "..", "site");
const stampFile = path.join(site, ".built-from");

const current = stamp.siteFingerprint(root);
const built = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, "utf8").trim() : "";

if (fs.existsSync(path.join(site, "overlay.html")) && built === current) {
  console.log("The site is up to date.");
} else {
  console.log(built ? "Your changes were found. Rebuilding the site..." : "Building the site (first run only)...");
  execSync("node scripts/build-site.mjs", { cwd: path.resolve(here, ".."), stdio: "inherit" });
}
