// Where the memory number comes from. A web page cannot see the whole computer, so there are
// three honest sources: a slider (demo), this browser tab (Chrome only), or the helper.

// Shown only during "Test the figure", and labelled as sample data on the card.
export const SAMPLE_TOP = [
  { name: "Sample browser", mb: 2400, pids: [] },
  { name: "Sample editor", mb: 1100, pids: [] },
  { name: "Sample video call", mb: 900, pids: [] },
  { name: "Sample game launcher", mb: 700, pids: [] },
];

// Chrome and Edge expose the tab's JavaScript memory use. It is this tab only, not the computer.
export function readTab() {
  const m = typeof performance !== "undefined" ? performance.memory : null;
  if (!m || !m.jsHeapSizeLimit) return { percent: null, error: "This browser does not share tab memory. Use Chrome or Edge, or pick another source." };
  return { percent: (m.usedJSHeapSize / m.jsHeapSizeLimit) * 100, error: "" };
}

// The helper is a small program on your own computer. Both calls send the code it printed.
export async function fetchHelper(url, token) {
  try {
    const res = await fetch(`${url}/memory`, { headers: { "x-mm-token": token }, cache: "no-store" });
    if (res.status === 401) return { percent: null, top: null, error: "The helper code is not right." };
    if (!res.ok) return { percent: null, top: null, error: `The helper answered with ${res.status}.` };
    const data = await res.json();
    return { percent: data.percent, top: data.top, error: "" };
  } catch {
    return { percent: null, top: null, error: "Could not reach the helper. Is it running?" };
  }
}

export async function closeProgram(url, token, name) {
  try {
    const res = await fetch(`${url}/close`, {
      method: "POST",
      headers: { "x-mm-token": token, "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "Could not reach the helper." };
  }
}
