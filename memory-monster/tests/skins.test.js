import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DEFAULT_SKIN, resolveSkin, pickSkin } from "../lib/skins.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));

test("the default skin constant matches skins/hooded-figure/skin.json", () => {
  assert.deepEqual(read("../skins/hooded-figure/skin.json"), DEFAULT_SKIN);
});

test("the template is a valid skin with no problems", () => {
  assert.deepEqual(resolveSkin(read("../skins/_template/skin.json")).problems, []);
});

test("a partial skin fills the rest from the default", () => {
  const { skin, problems } = resolveSkin({ name: "Blue", eyes: { color: "#38bdf8" } });
  assert.equal(skin.eyes.color, "#38bdf8");
  assert.equal(skin.eyes.size, DEFAULT_SKIN.eyes.size);
  assert.equal(skin.door.style, "wood");
  assert.deepEqual(problems, []);
});

test("a bad field is dropped and reported, the rest still applies", () => {
  const { skin, problems } = resolveSkin({ eyes: { color: "red", size: 1.5 }, face: { style: "clown" } });
  assert.equal(skin.eyes.color, DEFAULT_SKIN.eyes.color);
  assert.equal(skin.eyes.size, 1.5);
  assert.equal(skin.face.style, "void");
  assert.equal(problems.length, 2);
});

test("something that is not an object falls back to the default figure", () => {
  assert.deepEqual(resolveSkin(null).skin, DEFAULT_SKIN);
  assert.deepEqual(resolveSkin([1, 2]).skin, DEFAULT_SKIN);
});

test("an unknown or broken skin folder falls back with a message", () => {
  const skins = [{ id: "broken", source: "community", raw: null, error: "skin.json is not valid JSON" }];
  assert.match(pickSkin(skins, "missing").problems[0], /No skin named/);
  assert.match(pickSkin(skins, "broken").problems[0], /broken/);
  assert.deepEqual(pickSkin(skins, "broken").skin, DEFAULT_SKIN);
});

test("the retired pumpkin face is reported and falls back to the default", () => {
  const { skin, problems } = resolveSkin({ face: { style: "pumpkin" } });
  assert.equal(skin.face.style, "void");
  assert.equal(problems.length, 1);
});

test("face color, hair and trim are optional colors that are checked", () => {
  const ok = resolveSkin({ face: { style: "redhead", color: "#f2c9a5", hair: "#b7410e" }, outfit: { accent: "#123456" } });
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.skin.face.hair, "#b7410e");
  assert.equal(ok.skin.outfit.accent, "#123456");
  const bad = resolveSkin({ face: { hair: "ginger" }, outfit: { accent: 5 } });
  assert.equal(bad.problems.length, 2);
  assert.equal(bad.skin.face.hair, undefined);
});

test("the example skin in MAKE-YOUR-OWN-FIGURE.md is valid", () => {
  const guide = fs.readFileSync(new URL("../MAKE-YOUR-OWN-FIGURE.md", import.meta.url), "utf8");
  const example = JSON.parse(guide.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(resolveSkin(example).problems, []);
});
