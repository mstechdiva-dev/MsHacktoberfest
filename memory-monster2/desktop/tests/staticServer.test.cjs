const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { startStaticServer, resolveFile } = require("../lib/staticServer.cjs");

function makeSite() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mm-site-"));
  fs.writeFileSync(path.join(root, "index.html"), "<h1>home</h1>");
  fs.writeFileSync(path.join(root, "overlay.html"), "<h1>overlay</h1>");
  fs.mkdirSync(path.join(root, "_next"));
  fs.writeFileSync(path.join(root, "_next", "a.js"), "console.log(1)");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "index.html"), "<h1>docs</h1>");
  fs.writeFileSync(path.join(path.dirname(root), "secret.txt"), "do not serve");
  return root;
}

test("a route like /overlay finds overlay.html, and / finds index.html", () => {
  const root = makeSite();
  assert.equal(path.basename(resolveFile(root, "/overlay")), "overlay.html");
  assert.equal(path.basename(resolveFile(root, "/")), "index.html");
  assert.equal(path.basename(resolveFile(root, "/docs")), "index.html");
  assert.equal(path.basename(resolveFile(root, "/_next/a.js")), "a.js");
});

test("nothing outside the site folder can be reached", () => {
  const root = makeSite();
  for (const bad of ["/../secret.txt", "/..%2Fsecret.txt", "/%2e%2e/secret.txt", "/_next/../../secret.txt", "/a%00b"]) {
    assert.equal(resolveFile(root, bad), null, bad);
  }
});

test("a missing file is not found", () => {
  assert.equal(resolveFile(makeSite(), "/nope"), null);
});

test("the server answers on 127.0.0.1 with the right types, and 404 for the rest", async () => {
  const root = makeSite();
  const s = await startStaticServer({ root, port: 0 });
  try {
    assert.match(s.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const page = await fetch(`${s.origin}/overlay`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /text\/html/);
    assert.equal(await page.text(), "<h1>overlay</h1>");
    const js = await fetch(`${s.origin}/_next/a.js`);
    assert.match(js.headers.get("content-type"), /javascript/);
    assert.equal((await fetch(`${s.origin}/missing`)).status, 404);
    assert.equal((await fetch(`${s.origin}/x`, { method: "POST", body: "a" })).status, 404);
  } finally {
    await s.close();
  }
});

test("if the wanted port is taken, it picks another instead of failing", async () => {
  const root = makeSite();
  const first = await startStaticServer({ root, port: 0 });
  try {
    const second = await startStaticServer({ root, port: first.port });
    assert.notEqual(second.port, first.port);
    await second.close();
  } finally {
    await first.close();
  }
});
