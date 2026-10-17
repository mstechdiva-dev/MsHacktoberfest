// Memory Monster helper. Runs on your own computer, listens only on 127.0.0.1, and tells the
// Memory Monster page how full memory is and which programs use the most.
// It uses no packages: just Node. Start it with start-helper.bat (Windows) or `node memory-helper.cjs`.
const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readNow, closeProgramByName } = require("./lib.cjs");

const CONFIG_PATH = path.join(__dirname, "helper.config.json");
const TOKEN_PATH = path.join(os.homedir(), ".memory-monster-token");

function loadConfig() {
  const defaults = { port: 47200, allowedOrigins: ["http://localhost:3000"] };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
  } catch {
    return defaults;
  }
}

// The code is made once and kept, so you paste it into the page one time only.
function loadToken() {
  try {
    const t = fs.readFileSync(TOKEN_PATH, "utf8").trim();
    if (t.length >= 16) return t;
  } catch {
    // No token yet; make one below.
  }
  const t = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(TOKEN_PATH, t + "\n", { mode: 0o600 });
  return t;
}

function startServer() {
  const config = loadConfig();
  const token = loadToken();
  const tokenBuf = Buffer.from(token);

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowed = origin && config.allowedOrigins.includes(origin);
    const cors = allowed
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "x-mm-token, content-type",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-private-network": "true",
          vary: "Origin",
        }
      : {};

    if (origin && !allowed) return send(res, 403, { error: "This website is not on the allowed list." });
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }

    const given = Buffer.from(String(req.headers["x-mm-token"] || ""));
    if (given.length !== tokenBuf.length || !crypto.timingSafeEqual(given, tokenBuf)) {
      return send(res, 401, { error: "Wrong code." }, cors);
    }

    try {
      if (req.method === "GET" && req.url === "/memory") {
        return send(res, 200, await readNow(), cors);
      }
      if (req.method === "POST" && req.url === "/close") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 2000) return send(res, 413, { ok: false, error: "Too large." }, cors);
        }
        const { name } = JSON.parse(body || "{}");
        const r = await closeProgramByName(name);
        return send(res, r.ok || !r.error ? 200 : 404, r, cors);
      }
      return send(res, 404, { error: "Not found." }, cors);
    } catch (e) {
      return send(res, 500, { error: "The helper could not read that." }, cors);
    }
  });

  server.listen(config.port, "127.0.0.1", () => {
    console.log("Memory Monster helper is running.");
    console.log(`  Address:  http://127.0.0.1:${config.port}`);
    console.log(`  Code:     ${token}`);
    console.log(`  Allowed:  ${config.allowedOrigins.join(", ")}`);
    console.log("Paste the address and code into the Memory Monster settings. Close this window to stop the helper.");
  });
  return server;
}

if (require.main === module) startServer();
module.exports = { startServer };
