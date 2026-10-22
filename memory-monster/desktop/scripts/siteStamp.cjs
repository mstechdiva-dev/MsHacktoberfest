// Fingerprint of everything the built site comes from, so the app can tell when it is out of date.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// What goes into the site. Folders are walked; single files are read directly.
const FOLDERS = ["app", "components", "lib", "skins", "community-skins", "public"];
const FILES = ["settings.json", "package.json", "next.config.js"];
// The landing page video is not part of the app, and it is large to read.
const SKIP = new Set([".mp4"]);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (!SKIP.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
}

function siteFingerprint(root) {
  const files = [];
  for (const folder of FOLDERS) walk(path.join(root, folder), files);
  for (const file of FILES) if (fs.existsSync(path.join(root, file))) files.push(path.join(root, file));
  const hash = crypto.createHash("sha1");
  for (const file of files) {
    // Forward slashes so the same files give the same fingerprint on every system.
    hash.update(path.relative(root, file).split(path.sep).join("/"));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex");
}

module.exports = { siteFingerprint, FOLDERS, FILES };
