const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { siteFingerprint } = require("../scripts/siteStamp.cjs");

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mm-stamp-"));
  fs.mkdirSync(path.join(root, "skins", "ghost"), { recursive: true });
  fs.mkdirSync(path.join(root, "app"));
  fs.mkdirSync(path.join(root, "public"));
  fs.writeFileSync(path.join(root, "skins", "ghost", "skin.json"), '{"name":"Ghost"}');
  fs.writeFileSync(path.join(root, "app", "page.js"), "export default 1;");
  fs.writeFileSync(path.join(root, "settings.json"), '{"skin":"ghost"}');
  fs.writeFileSync(path.join(root, "package.json"), "{}");
  return root;
}

test("the same files give the same fingerprint", () => {
  const root = makeProject();
  assert.equal(siteFingerprint(root), siteFingerprint(root));
});

test("editing a skin changes the fingerprint", () => {
  const root = makeProject();
  const before = siteFingerprint(root);
  fs.writeFileSync(path.join(root, "skins", "ghost", "skin.json"), '{"name":"Ghost 2"}');
  assert.notEqual(siteFingerprint(root), before);
});

test("editing settings.json changes the fingerprint", () => {
  const root = makeProject();
  const before = siteFingerprint(root);
  fs.writeFileSync(path.join(root, "settings.json"), '{"skin":"other"}');
  assert.notEqual(siteFingerprint(root), before);
});

test("adding a community skin changes the fingerprint", () => {
  const root = makeProject();
  const before = siteFingerprint(root);
  fs.mkdirSync(path.join(root, "community-skins", "new"), { recursive: true });
  fs.writeFileSync(path.join(root, "community-skins", "new", "skin.json"), "{}");
  assert.notEqual(siteFingerprint(root), before);
});

test("the landing page video is ignored", () => {
  const root = makeProject();
  const before = siteFingerprint(root);
  fs.writeFileSync(path.join(root, "public", "memory-monster-short.mp4"), "video bytes");
  assert.equal(siteFingerprint(root), before);
});

test("a missing folder is fine", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mm-stamp-empty-"));
  assert.equal(typeof siteFingerprint(root), "string");
});
