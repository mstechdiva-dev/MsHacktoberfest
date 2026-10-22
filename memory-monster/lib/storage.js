// localStorage wrapper. Private windows and blocked storage throw, so every call is guarded
// and the app works (just without remembering) when storage is not available.

export function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is blocked; nothing to do.
  }
}
