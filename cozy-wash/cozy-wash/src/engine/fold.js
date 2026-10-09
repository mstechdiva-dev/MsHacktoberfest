// Fold animation helpers (PLAN section 8). A fold has 5 frames (flat + after each of 4 taps),
// each a polygon with the same number of points, so we can tween between them.

export function lerpPoints(a, b, t) {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

export function pointsAttr(points) {
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

/** Bounding box of a frame, used for the finished square/rectangle. */
export function bbox(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/**
 * Animate a polygon element from one frame to the next.
 * @param {SVGPolygonElement} el
 * @param {number[][]} from
 * @param {number[][]} to
 * @param {number} ms
 * @param {boolean} reduced skip the tween
 */
export function tweenPolygon(el, from, to, ms, reduced) {
  return new Promise((resolve) => {
    if (reduced || typeof requestAnimationFrame !== 'function') {
      el.setAttribute('points', pointsAttr(to));
      resolve();
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.setAttribute('points', pointsAttr(lerpPoints(from, to, e)));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Area of a polygon (shoelace). */
export function area(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/**
 * Is this frame a neat rectangle? Extra points are fine as long as they sit along its edges,
 * so every fold can keep the same number of points in every frame.
 */
export function isRectangle(points) {
  const b = bbox(points);
  if (b.w < 1 || b.h < 1) return false;
  const onEdge = points.every(([x, y]) => [b.x, b.x + b.w].some((e) => Math.abs(x - e) < 0.01) || [b.y, b.y + b.h].some((e) => Math.abs(y - e) < 0.01));
  return onEdge && Math.abs(area(points) - b.w * b.h) < 0.5;
}

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && n >= 0 && n <= 100);

/** Validate a fold definition. Returns a list of problems (empty if fine). */
export function checkFold(fold) {
  const problems = [];
  if (!Array.isArray(fold.frames) || fold.frames.length !== 5) problems.push('needs exactly 5 frames');
  if (!Array.isArray(fold.steps) || fold.steps.length !== 4) problems.push('needs exactly 4 steps');
  if (Array.isArray(fold.frames)) {
    const n = fold.frames[0] && fold.frames[0].length;
    fold.frames.forEach((f, i) => {
      if (!Array.isArray(f) || f.length !== n) problems.push(`frame ${i} has a different point count`);
      else if (!f.every(isPoint)) problems.push(`frame ${i} has a point outside the 100 x 100 table`);
    });
    const last = fold.frames[fold.frames.length - 1];
    if (Array.isArray(last) && last.every(isPoint)) {
      if (!['square', 'rectangle'].includes(fold.finish)) problems.push('finish must be "square" or "rectangle"');
      else if (!isRectangle(last)) problems.push('the last frame must be a neat square or rectangle (extra points are fine if they sit on its edges)');
      else if (fold.finish === 'square') { const b = bbox(last); if (Math.abs(b.w - b.h) > 1) problems.push(`finish is "square" but the last frame is ${b.w} wide and ${b.h} tall`); }
    }
  }
  if (Array.isArray(fold.steps)) {
    fold.steps.forEach((s, i) => {
      if (typeof s.ms !== 'number' || s.ms < 100 || s.ms > 2000) problems.push(`step ${i + 1} needs ms between 100 and 2000`);
      if (s.line !== null && s.line !== undefined && !(Array.isArray(s.line) && s.line.length === 2 && s.line.every(isPoint))) problems.push(`step ${i + 1} line must be null or two points`);
    });
  }
  return problems;
}
