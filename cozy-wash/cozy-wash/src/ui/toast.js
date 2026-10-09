// Small notices and sound captions.
const region = () => document.getElementById('toasts');

export function toast(text, { ms = 2600, tone = 'info' } = {}) {
  const r = region();
  if (!r) return;
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  el.textContent = text;
  r.appendChild(el);
  while (r.children.length > 3) r.firstElementChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function caption(text) {
  toast(`♪ ${text}`, { ms: 1400, tone: 'caption' });
}
