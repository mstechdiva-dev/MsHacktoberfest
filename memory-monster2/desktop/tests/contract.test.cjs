const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CH } = require("../lib/channels.cjs");

const preload = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");
const main = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
const bridge = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "desktopBridge.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

test("preload.js repeats the channel names exactly", () => {
  for (const [key, name] of Object.entries(CH)) assert.ok(preload.includes(`${key}: "${name}"`), `${key} differs in preload.js`);
});

test("every channel has a different name", () => {
  const names = Object.values(CH);
  assert.equal(new Set(names).size, names.length);
});

test("the preload exposes every function the site's bridge expects, and nothing from Node", () => {
  const listed = bridge.match(/BRIDGE_API = \[([^\]]+)\]/)[1].match(/"(\w+)"/g).map((s) => s.replace(/"/g, ""));
  assert.ok(listed.length >= 6);
  for (const fn of listed) assert.ok(preload.includes(`${fn}:`), `preload.js does not expose ${fn}`);
  assert.ok(!/exposeInMainWorld\([^)]*ipcRenderer\s*[,)]/.test(preload), "ipcRenderer must not be exposed directly");
});

test("main.js listens to every channel the page can send, and checks who sent it", () => {
  for (const key of ["close", "phase", "interactive", "status"]) assert.ok(main.includes(`CH.${key}`), `main.js ignores ${key}`);
  assert.ok(main.includes("fromOverlay"));
});

test("the installer config packs the app files and the shared reading code", () => {
  const files = pkg.build.files;
  for (const f of ["main.js", "preload.js", "lib/**", "site/**", "assets/**"]) assert.ok(files.includes(f), `${f} missing from build.files`);
  const extra = pkg.build.extraResources[0];
  assert.equal(extra.to, "helper-lib.cjs");
  assert.ok(fs.existsSync(path.join(__dirname, "..", extra.from)), "the shared reading code is not where the config says");
  assert.ok(fs.existsSync(path.join(__dirname, "..", pkg.build.win.icon)), "the installer icon is missing");
});
