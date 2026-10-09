// What you can do with the glass of a machine: pop bubbles, poke a piece so it spins its own way.

/** Drift a few bubbles up the glass. */
export function bubbles(glass, n = 1, reduced = false) {
  if (reduced || !glass) return;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span');
    const size = 6 + Math.random() * 16;
    b.className = 'bub';
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${10 + Math.random() * 80}%`;
    b.style.animationDelay = `${Math.random() * 0.4}s`;
    glass.appendChild(b);
    setTimeout(() => b.remove(), 3000);
  }
}

/**
 * Tap the glass for bubbles, poke a piece in the drum to send it spinning its own way.
 * @param {HTMLElement} glass the .glass element
 * @param {{audio:{play:Function}, reduced?:boolean}} o
 */
export function wireGlass(glass, { audio, reduced = false }) {
  if (!glass) return;
  glass.addEventListener('click', () => { bubbles(glass, 4, reduced); audio.play('bubble-pop'); });
  glass.addEventListener('click', (e) => {
    const piece = e.target.closest('.drum-item');
    if (!piece) return;
    e.stopPropagation();
    const dir = Math.random() < 0.5 ? -1 : 1;
    piece.style.setProperty('--poke-deg', `${dir * (160 + Math.round(Math.random() * 200))}deg`);
    piece.style.setProperty('--poke-ms', `${700 + Math.round(Math.random() * 600)}ms`);
    piece.classList.remove('poked');
    void piece.offsetWidth;
    if (!reduced) piece.classList.add('poked');
    audio.play('ui-click');
  }, true);
}
