// Serves the exported site to the app's own windows, on this computer only (127.0.0.1).
// The windows load it over http so the pages behave exactly as they do on the web, and so all of
// them share one origin, which is what lets the settings and the Look Studio reach the overlay.
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

// "/overlay" is the file overlay.html; "/" is index.html. Anything outside root is refused.
function resolveFile(root, urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (p.includes("\0")) return null;
  const base = path.resolve(root);
  const target = path.resolve(base, "." + path.posix.normalize("/" + p));
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  for (const candidate of [target, target + ".html", path.join(target, "index.html")]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next way of spelling it.
    }
  }
  return null;
}

// Starts the server. Tries `port` first so the address (and the saved choices that belong to it)
// stay the same from one run to the next; if that port is taken it picks any free one.
function startStaticServer({ root, port }) {
  const server = http.createServer((req, res) => {
    const file = req.method === "GET" || req.method === "HEAD" ? resolveFile(root, req.url || "/") : null;
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });

  const listen = (p) =>
    new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(p, "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve(server.address().port);
      });
    });

  return listen(port)
    .catch(() => listen(0))
    .then((actual) => ({ server, port: actual, origin: `http://127.0.0.1:${actual}`, close: () => new Promise((r) => server.close(r)) }));
}

module.exports = { startStaticServer, resolveFile };
