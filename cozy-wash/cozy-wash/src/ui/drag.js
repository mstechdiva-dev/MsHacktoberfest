// Pointer-event drag and drop (mouse, pen and touch). Keyboard players use buttons instead.

/**
 * Make an element draggable onto drop targets.
 * @param {HTMLElement} el
 * @param {{targets:()=>HTMLElement[], onDrop:(target:HTMLElement)=>void, onOver?:(target:HTMLElement|null)=>void, onStart?:()=>void, onCancel?:()=>void, keepGhost?:boolean}} opts
 */
export function draggable(el, opts) {
  let ghost = null;
  let start = null;
  let over = null;
  const hit = (x, y) => opts.targets().find((t) => {
    const r = t.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;

  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    start = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    ghost = el.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${r.width}px`;
    ghost.style.left = `${e.clientX - start.dx}px`;
    ghost.style.top = `${e.clientY - start.dy}px`;
    document.body.appendChild(ghost);
    el.classList.add('dragging');
    opts.onStart && opts.onStart();
  });
  el.addEventListener('pointermove', (e) => {
    if (!ghost) return;
    ghost.style.left = `${e.clientX - start.dx}px`;
    ghost.style.top = `${e.clientY - start.dy}px`;
    const t = hit(e.clientX, e.clientY);
    if (t !== over) {
      opts.targets().forEach((x) => x.classList.toggle('drop-over', x === t));
      over = t;
      opts.onOver && opts.onOver(t);
    }
  });
  const end = (e) => {
    if (!ghost) return;
    const t = e.type === 'pointerup' ? hit(e.clientX, e.clientY) : null;
    ghost.remove();
    ghost = null;
    el.classList.remove('dragging');
    opts.targets().forEach((x) => x.classList.remove('drop-over'));
    over = null;
    if (t) opts.onDrop(t); else opts.onCancel && opts.onCancel();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
