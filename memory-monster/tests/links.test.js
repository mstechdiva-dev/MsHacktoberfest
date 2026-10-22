import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;

function sourceFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? sourceFiles(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []
  );
}

test("every internal link in the pages and components goes to a page that exists", () => {
  const files = [...sourceFiles("app"), ...sourceFiles("components")];
  const found = new Set();
  for (const f of files) {
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/href="(\/[a-z-]*)"/g)) found.add(m[1]);
  }
  assert.ok(found.has("/app") && found.has("/looks"));
  for (const href of found) {
    const page = href === "/" ? "app/page.js" : `app${href}/page.js`;
    assert.ok(fs.existsSync(path.join(root, page)), `${href} has no ${page}`);
  }
});
