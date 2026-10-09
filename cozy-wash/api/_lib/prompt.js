// Builds the short prompt for the attendant's note. Names are rebuilt on the server from ids.
import { pieceFromId } from '../../src/engine/generate.js';

export const SYSTEM = [
  'You are the friendly attendant at Cozy Wash, a cozy laundromat game.',
  "Write ONE short, simple sentence for the player's receipt about their laundry today.",
  'Use everyday words, no puns stacked together, no long jokes.',
  'Mention one thing that really happened, from the facts. Never invent anything.',
  'No brand names, no real people, nothing scary. Max 80 characters. Leave `lines` empty.',
  '',
  'Examples of the right tone:',
  '"Nice job catching the cat before the wash." · "The whites went pink, but you saved them." · "Every sock found its partner today."',
].join('\n');

const nameOf = (data, id) => {
  const p = pieceFromId(data, id);
  return p ? p.name : null;
};

/** True when an id names a real item or a real garment/color/pattern/fabric mix. */
export const knownId = (data, id) => Boolean(pieceFromId(data, id));

/** The facts sent to the model, built from ids (never from player text). */
export function describeDay(req, data) {
  return {
    loads: req.loads.map((l) => {
      const s = l.settings || {};
      return {
        bin: l.bin,
        items: l.itemIds.map((i) => nameOf(data, i)).filter(Boolean),
        water: s.water || 'warm',
        cycle: s.cycle || 'normal',
        facts: l.facts,
        score: Math.round(l.score),
        rewashes: l.rewashes || 0,
      };
    }),
    summary: {
      trapsCaught: req.summary.trapIdsCaught.map((i) => nameOf(data, i)).filter(Boolean),
      pocketsChecked: req.summary.pocketsChecked,
      socksPaired: req.summary.socksPaired,
      folded: req.summary.folded,
    },
  };
}

export function buildMessages(req, data) {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: JSON.stringify(describeDay(req, data)) },
  ];
}
