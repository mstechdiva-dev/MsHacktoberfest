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

module.exports = { isProtected, memoryPercent, topPrograms, findClosable, parseWindows, parsePs };
