import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isProtected, memoryPercent, topPrograms, findClosable, parseWindows, parsePs } = require("../helper/lib.cjs");

test("memory percent is real arithmetic, one decimal", () => {
  assert.equal(memoryPercent(16000, 4000), 75);
  assert.equal(memoryPercent(8000, 1000), 87.5);
  assert.equal(memoryPercent(0, 0), null);
});

test("system programs are protected, with or without .exe", () => {
  assert.equal(isProtected("explorer.exe"), true);
  assert.equal(isProtected("Svchost"), true);
  assert.equal(isProtected("chrome"), false);
});

test("the list drops protected programs and keeps the biggest", () => {
  const rows = [
    { name: "explorer", mb: 900, pids: [1] },
    { name: "chrome", mb: 3000, pids: [2, 3] },
    { name: "code", mb: 1500, pids: [4] },
    { name: "ghost", mb: 9999, pids: [] },
  ];
  assert.deepEqual(topPrograms(rows, 5).map((r) => r.name), ["chrome", "code"]);
  assert.equal(topPrograms(rows, 1).length, 1);
});

test("only a listed, unprotected program can be closed", () => {
  const list = [{ name: "chrome", mb: 3000, pids: [2] }];
  assert.equal(findClosable(list, "chrome").name, "chrome");
  assert.equal(findClosable(list, "explorer"), null);
  assert.equal(findClosable(list, "unknown"), null);
});

test("PowerShell output with one row or many is read the same", () => {
  assert.equal(parseWindows('{"name":"chrome","mb":900,"pids":5}').length, 1);
  assert.deepEqual(parseWindows('{"name":"chrome","mb":900,"pids":5}')[0].pids, [5]);
  assert.equal(parseWindows('[{"name":"a","mb":1,"pids":[1,2]},{"name":"b","mb":2,"pids":[3]}]').length, 2);
  assert.deepEqual(parseWindows(""), []);
});

test("ps output is grouped by program name", () => {
  const rows = parsePs("  10 2048 chrome\n  11 1024 chrome\n  12 512 code\n");
  const chrome = rows.find((r) => r.name === "chrome");
  assert.equal(chrome.mb, 3);
  assert.deepEqual(chrome.pids, [10, 11]);
});
