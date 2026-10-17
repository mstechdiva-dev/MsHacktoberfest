// Pure helpers for the Memory Monster helper, kept apart from the server so they can be tested.

// System programs the helper never lists and never closes.
const PROTECTED = new Set([
  "system", "idle", "registry", "smss", "csrss", "wininit", "winlogon", "services", "lsass",
  "svchost", "fontdrvhost", "dwm", "explorer", "memory compression", "memcompression",
  "systemd", "init", "kthreadd", "node", "sshd", "bash", "sh",
]);

function isProtected(name) {
  return PROTECTED.has(String(name).toLowerCase().replace(/\.exe$/, ""));
}

function memoryPercent(total, free) {
  if (!total || total <= 0) return null;
  return Math.round(((total - free) / total) * 1000) / 10;
}

// rows: [{ name, mb, pids }]. Drops protected programs, sorts by memory, keeps the biggest few.
function topPrograms(rows, limit = 5) {
  return rows
    .filter((r) => r && r.name && !isProtected(r.name) && Array.isArray(r.pids) && r.pids.length > 0)
    .sort((a, b) => b.mb - a.mb)
    .slice(0, limit);
}

// Only a program from the latest list can be closed, and never a protected one.
function findClosable(list, name) {
  const hit = list.find((r) => r.name === name);
  if (!hit || isProtected(hit.name)) return null;
  return hit;
}

// Windows: PowerShell groups the processes by name. Other systems: ps (used for testing here).
function parseWindows(json) {
  if (!json || !json.trim()) return [];
  const parsed = JSON.parse(json);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((r) => ({ name: String(r.name), mb: Number(r.mb), pids: [].concat(r.pids) }));
}

function parsePs(text) {
  const byName = new Map();
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (!m) continue;
    const [, pid, rssKb, name] = m;
    const row = byName.get(name) || { name, mb: 0, pids: [] };
    row.mb += Number(rssKb) / 1024;
    row.pids.push(Number(pid));
    byName.set(name, row);
  }
  return [...byName.values()].map((r) => ({ ...r, mb: Math.round(r.mb) }));
}

// ---- Reading the computer. The helper and the desktop app both use these, so there is one copy. ----
const os = require("os");
const { execFile } = require("child_process");

const IS_WIN = process.platform === "win32";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 8000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

const PS_SCRIPT =
  "Get-Process | Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ name=$_.Name; mb=[math]::Round((($_.Group | Measure-Object WorkingSet64 -Sum).Sum)/1MB); pids=@($_.Group.Id) } } | Sort-Object mb -Descending | Select-Object -First 25 | ConvertTo-Json -Compress";

// The five programs using the most memory, system programs left out.
async function readPrograms() {
  const rows = IS_WIN
    ? parseWindows(await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PS_SCRIPT]))
    : parsePs(await run("ps", ["-eo", "pid=,rss=,comm=", "--sort=-rss"]));
  return topPrograms(rows, 5);
}

// Asks one process to close. No force flag, so a program with unsaved work can ask you to save.
async function closePid(pid) {
  if (IS_WIN) await run("taskkill", ["/PID", String(pid)]);
  else process.kill(pid, "SIGTERM");
}

// Closes a program from the latest list by name. Returns { ok, closed, total } or { ok: false, error }.
async function closeProgramByName(name) {
  const hit = findClosable(await readPrograms(), name);
  if (!hit) return { ok: false, error: "That program is not on the list." };
  let closed = 0;
  for (const pid of hit.pids.slice(0, 50)) {
    try {
      await closePid(pid);
      closed += 1;
    } catch {
      // One window refusing is fine; the count tells the caller what happened.
    }
  }
  return { ok: closed > 0, closed, total: hit.pids.length };
}

// One reading: the percent of memory in use and the biggest programs.
async function readNow() {
  return { percent: memoryPercent(os.totalmem(), os.freemem()), top: await readPrograms(), at: Date.now() };
}

module.exports = { isProtected, memoryPercent, topPrograms, findClosable, parseWindows, parsePs, readPrograms, closeProgramByName, readNow };
