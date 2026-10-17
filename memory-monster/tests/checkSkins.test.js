import test from "node:test";
import assert from "node:assert/strict";
import { checkSkins } from "../lib/checkSkins.js";
import { loadSiteData } from "../lib/readSkins.js";

test("every skin folder in this repo passes the skin checker", () => {
  const { skins } = loadSiteData();
  assert.ok(skins.length > 0);
  for (const r of checkSkins(skins)) assert.deepEqual(r.problems, [], `${r.id}: ${r.problems.join(" ")}`);
});

test("a skin with a typo is reported with the field name", () => {
  const out = checkSkins([{ id: "typo", source: "community", raw: { face: { style: "alein" } }, error: "" }]);
  assert.match(out[0].problems[0], /face\.style/);
});

test("an unreadable skin file is reported", () => {
  const out = checkSkins([{ id: "broken", source: "community", raw: null, error: "skin.json is missing or is not valid JSON" }]);
  assert.match(out[0].problems[0], /not valid JSON/);
});
