// Built-in stand-in sounds made with Web Audio (PLAN section 18).
// Every core sound id has a recipe, so the game has sound before any files exist.

function noiseBuffer(ctx, seconds) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(ctx, out, { freq = 600, dur = 0.12, type = 'sine', vol = 0.2, slide = 0, at = 0 }) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(ctx, out, { dur = 0.5, vol = 0.12, freq = 900, type = 'lowpass', at = 0, lfo = 0 }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  g.gain.setValueAtTime(vol, t0 + Math.max(0.06, dur - 0.15));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (lfo) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = lfo;
    lg.gain.value = vol * 0.6;
    l.connect(lg).connect(g.gain);
    l.start(t0);
    l.stop(t0 + dur);
  }
  src.connect(f).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur);
}

const chime = (notes, type = 'sine', gap = 0.11, dur = 0.22, vol = 0.16) => (ctx, out) =>
  notes.forEach((freq, i) => tone(ctx, out, { freq, type, dur, vol, at: i * gap }));

export const RECIPES = {
  'ui-click': (c, o) => tone(c, o, { freq: 900, dur: 0.05, type: 'triangle', vol: 0.12 }),
  'sign-flip': (c, o) => { tone(c, o, { freq: 300, dur: 0.08, type: 'triangle' }); tone(c, o, { freq: 240, dur: 0.1, type: 'triangle', at: 0.12 }); },
  'tile-flip': (c, o) => noise(c, o, { dur: 0.12, vol: 0.12, freq: 2500, type: 'highpass' }),
  'bin-drop': (c, o) => tone(c, o, { freq: 200, dur: 0.14, vol: 0.22, slide: 0.5 }),
  'saved-it': chime([660, 990]),
  'pocket-rustle': (c, o) => noise(c, o, { dur: 0.5, vol: 0.08, freq: 3000, type: 'bandpass', lfo: 14 }),
  'sock-match': (c, o) => { noise(c, o, { dur: 0.1, vol: 0.1, freq: 600 }); chime([1320], 'sine', 0, 0.2, 0.1)(c, o); },
  unlock: chime([784, 988, 1175, 1568], 'sine', 0.08, 0.3, 0.12),
  'door-open': (c, o) => tone(c, o, { freq: 500, dur: 0.1, type: 'square', vol: 0.05, slide: 1.4 }),
  'door-close': (c, o) => { tone(c, o, { freq: 180, dur: 0.12, vol: 0.22, slide: 0.6 }); tone(c, o, { freq: 1200, dur: 0.04, type: 'square', vol: 0.05, at: 0.05 }); },
  'drum-drop': (c, o) => noise(c, o, { dur: 0.18, vol: 0.18, freq: 400 }),
  'pour-liquid': (c, o) => noise(c, o, { dur: 0.7, vol: 0.1, freq: 1400, type: 'bandpass', lfo: 9 }),
  'pour-powder': (c, o) => noise(c, o, { dur: 0.6, vol: 0.08, freq: 5000, type: 'highpass' }),
  'dial-click': (c, o) => tone(c, o, { freq: 1500, dur: 0.03, type: 'square', vol: 0.06 }),
  'coin-grab': (c, o) => { tone(c, o, { freq: 2900, dur: 0.12, type: 'triangle', vol: 0.07 }); tone(c, o, { freq: 3400, dur: 0.1, type: 'triangle', vol: 0.05, at: 0.07 }); },
  'coin-drop': (c, o) => tone(c, o, { freq: 2400, dur: 0.18, type: 'triangle', vol: 0.1, slide: 0.8 }),
  'coin-clink-1': (c, o) => tone(c, o, { freq: 3200, dur: 0.2, type: 'triangle', vol: 0.09 }),
  'coin-clink-2': (c, o) => tone(c, o, { freq: 2700, dur: 0.22, type: 'triangle', vol: 0.09 }),
  'coin-clink-3': (c, o) => { tone(c, o, { freq: 3000, dur: 0.1, type: 'triangle', vol: 0.08 }); tone(c, o, { freq: 3300, dur: 0.14, type: 'triangle', vol: 0.07, at: 0.1 }); },
  'coin-start': (c, o) => { tone(c, o, { freq: 90, dur: 0.9, type: 'sawtooth', vol: 0.05, slide: 1.4 }); tone(c, o, { freq: 1000, dur: 0.12, vol: 0.08, at: 0.7 }); },
  'phone-pickup': (c, o) => noise(c, o, { dur: 0.12, vol: 0.08, freq: 1500, type: 'bandpass' }),
  'tap-hover': (c, o) => tone(c, o, { freq: 320, dur: 0.6, vol: 0.06, slide: 1.8 }),
  'tap-beep': (c, o) => { tone(c, o, { freq: 1400, dur: 0.1, type: 'square', vol: 0.06 }); tone(c, o, { freq: 1900, dur: 0.14, type: 'square', vol: 0.06, at: 0.13 }); },
  'tap-decline': (c, o) => tone(c, o, { freq: 300, dur: 0.3, type: 'square', vol: 0.05, slide: 0.7 }),
  'wash-fill': (c, o) => noise(c, o, { dur: 3.5, vol: 0.12, freq: 1200, type: 'bandpass', lfo: 3 }),
  'wash-tumble': (c, o) => noise(c, o, { dur: 2, vol: 0.08, freq: 500, lfo: 1.2 }),
  'wash-drain': (c, o) => noise(c, o, { dur: 3, vol: 0.1, freq: 700, type: 'bandpass', lfo: 6 }),
  'wash-spin': (c, o) => { noise(c, o, { dur: 3, vol: 0.08, freq: 2200, type: 'bandpass' }); tone(c, o, { freq: 120, dur: 3, type: 'sawtooth', vol: 0.03, slide: 2.5 }); },
  'wash-end': chime([880, 1108, 1318], 'sine', 0.2, 0.35, 0.14),
  'bubble-pop': (c, o) => tone(c, o, { freq: 700 + Math.random() * 500, dur: 0.06, vol: 0.12, slide: 1.8 }),
  'rack-hang': (c, o) => { noise(c, o, { dur: 0.2, vol: 0.1, freq: 600 }); tone(c, o, { freq: 1800, dur: 0.08, type: 'triangle', vol: 0.05, at: 0.12 }); },
  'sheet-pull': (c, o) => noise(c, o, { dur: 0.35, vol: 0.08, freq: 4000, type: 'highpass' }),
  'dryer-start': (c, o) => { tone(c, o, { freq: 1100, dur: 0.06, type: 'square', vol: 0.05 }); tone(c, o, { freq: 80, dur: 1, type: 'sawtooth', vol: 0.05, slide: 1.3, at: 0.1 }); },
  'dryer-tumble': (c, o) => noise(c, o, { dur: 2, vol: 0.07, freq: 350, lfo: 1.6 }),
  'dryer-end': (c, o) => tone(c, o, { freq: 520, dur: 0.5, type: 'square', vol: 0.05 }),
  'static-zap': (c, o) => noise(c, o, { dur: 0.15, vol: 0.12, freq: 6000, type: 'highpass', lfo: 60 }),
  'fold-flap-1': (c, o) => noise(c, o, { dur: 0.15, vol: 0.12, freq: 900 }),
  'fold-flap-2': (c, o) => noise(c, o, { dur: 0.18, vol: 0.12, freq: 700 }),
  'basket-drop': (c, o) => tone(c, o, { freq: 170, dur: 0.15, vol: 0.2, slide: 0.6 }),
  'result-good': chime([660, 880, 1046]),
  'result-bad': chime([440, 330], 'triangle', 0.16, 0.3, 0.12),
  'receipt-print': (c, o) => noise(c, o, { dur: 1.6, vol: 0.06, freq: 3500, type: 'bandpass', lfo: 30 }),
  'sock-roll': (c, o) => noise(c, o, { dur: 0.3, vol: 0.08, freq: 800 }),
  'fur-smooth': (c, o) => noise(c, o, { dur: 0.35, vol: 0.06, freq: 2500, type: 'bandpass' }),
  'trap-clank': (c, o) => { tone(c, o, { freq: 2100, dur: 0.1, type: 'triangle', vol: 0.06 }); tone(c, o, { freq: 1700, dur: 0.1, type: 'triangle', vol: 0.06, at: 0.3 }); },
  'sneaker-thump': (c, o) => { tone(c, o, { freq: 90, dur: 0.12, vol: 0.2 }); tone(c, o, { freq: 85, dur: 0.12, vol: 0.18, at: 0.6 }); },
  'suds-overflow': (c, o) => noise(c, o, { dur: 1.2, vol: 0.07, freq: 5000, type: 'highpass', lfo: 20 }),
  'tissue-poof': (c, o) => noise(c, o, { dur: 0.3, vol: 0.1, freq: 2000 }),
  'cat-meow': (c, o) => tone(c, o, { freq: 600, dur: 0.5, type: 'sawtooth', vol: 0.04, slide: 0.6 }),
  'room-tone': (c, o) => noise(c, o, { dur: 6, vol: 0.02, freq: 300 }),
};

export function playSynth(ctx, out, id) {
  const r = RECIPES[id];
  if (r) r(ctx, out);
  return Boolean(r);
}
