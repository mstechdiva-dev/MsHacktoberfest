import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DEFAULT_SKIN, resolveSkin } from "../lib/skins.js";
import { applyLook, skinToJson } from "../lib/looks.js";
import { FACES, OUTFITS, DOORS, OPENS, ENTRANCES, ids } from "../lib/skinOptions.js";

const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("an empty look leaves the skin alone", () => {
  assert.deepEqual(applyLook(DEFAULT_SKIN, {}).skin, DEFAULT_SKIN);
  assert.deepEqual(applyLook(DEFAULT_SKIN, null).skin, DEFAULT_SKIN);
});

test("a look changes only what it names and keeps the rest of the skin", () => {
  const { skin, problems } = applyLook(DEFAULT_SKIN, { face: { style: "alien" }, outfit: { style: "tophat", accent: "#ffcc00" } });
  assert.equal(skin.face.style, "alien");
  assert.equal(skin.outfit.style, "tophat");
  assert.equal(skin.outfit.accent, "#ffcc00");
  assert.equal(skin.outfit.hood, DEFAULT_SKIN.outfit.hood);
  assert.equal(skin.eyes.color, DEFAULT_SKIN.eyes.color);
  assert.deepEqual(problems, []);
});

test("applying a look never changes the skin it was given", () => {
  const before = JSON.stringify(DEFAULT_SKIN);
  applyLook(DEFAULT_SKIN, { face: { style: "redhead", hair: "#c2410c" } });
  assert.equal(JSON.stringify(DEFAULT_SKIN), before);
});

test("a bad value in a look is dropped and reported", () => {
  const { skin, problems } = applyLook(DEFAULT_SKIN, { face: { style: "clown" }, eyes: { color: "blue" } });
  assert.equal(skin.face.style, "void");
  assert.equal(skin.eyes.color, DEFAULT_SKIN.eyes.color);
  assert.equal(problems.length, 2);
});

test("every look in the picker passes the skin checker", () => {
  for (const f of ids(FACES)) assert.deepEqual(applyLook(DEFAULT_SKIN, { face: { style: f } }).problems, [], f);
  for (const o of ids(OUTFITS)) assert.deepEqual(applyLook(DEFAULT_SKIN, { outfit: { style: o } }).problems, [], o);
  for (const d of ids(DOORS)) assert.deepEqual(applyLook(DEFAULT_SKIN, { door: { style: d } }).problems, [], d);
  for (const d of ids(OPENS)) assert.deepEqual(applyLook(DEFAULT_SKIN, { door: { opens: d } }).problems, [], d);
  for (const e of ids(ENTRANCES)) assert.deepEqual(applyLook(DEFAULT_SKIN, { entrance: { style: e } }).problems, [], e);
});

test("every look in the picker has a rule in the stylesheet (the default look needs none)", () => {
  const need = [
    ...ids(FACES).filter((i) => i !== "void").map((i) => `data-face="${i}"`),
    ...ids(OUTFITS).filter((i) => i !== "hood").map((i) => `data-outfit="${i}"`),
    ...ids(DOORS).filter((i) => i !== "wood").map((i) => `data-door="${i}"`),
    ...ids(OPENS).filter((i) => i !== "swing").map((i) => `data-opens="${i}"`),
    ...ids(ENTRANCES).filter((i) => i !== "walk-out").map((i) => `data-entrance="${i}"`),
  ];
  for (const rule of need) assert.ok(css.includes(rule), `no style rule for ${rule}`);
});

test("the copied skin.json is a complete skin that passes the checker", () => {
  const { skin } = applyLook(DEFAULT_SKIN, { face: { style: "redhead" } });
  const text = skinToJson(skin, "Red", "me");
  const back = JSON.parse(text);
  assert.equal(back.name, "Red");
  assert.deepEqual(resolveSkin(back).problems, []);
  assert.equal(resolveSkin(back).skin.face.style, "redhead");
});
