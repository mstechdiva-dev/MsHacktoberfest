// Screen-reader announcements and focus helpers.

export function announce(text) {
  const el = document.getElementById('live');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = text; }, 30);
}

/** Move focus to the main heading of a new screen. */
export function focusHeading(root) {
  const h = root.querySelector('h1, h2');
  if (h) {
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: false });
  }
}
