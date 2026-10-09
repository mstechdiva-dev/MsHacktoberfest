// Zod schemas for what comes in and what the model sends back.
import { z } from 'zod';

const BINS = ['white', 'dark', 'color', 'delicate'];
const id = z.string().min(1).max(80).regex(/^[a-z0-9:-]+$/);
const fact = z.string().min(1).max(40).regex(/^[a-z_]+$/);

export const RecapRequest = z.object({
  loads: z.array(z.object({
    bin: z.enum(BINS),
    itemIds: z.array(id).max(20),
    settings: z.object({
      cycle: z.enum(['normal', 'gentle']),
      water: z.enum(['cold', 'warm', 'hot']),
      detergent: z.number().int().min(0).max(10),
      softener: z.number().int().min(0).max(10),
      bleach: z.number().int().min(0).max(10),
      rescue: z.number().int().min(0).max(10),
    }).partial().passthrough(),
    facts: z.array(fact).max(12),
    score: z.number().min(0).max(100),
    rewashes: z.number().int().min(0).max(10).default(0),
  })).max(6),
  summary: z.object({
    trapIdsCaught: z.array(id).max(10).default([]),
    pocketsChecked: z.number().int().min(0).max(20).default(0),
    socksPaired: z.number().int().min(0).max(10).default(0),
    folded: z.number().int().min(0).max(100).default(0),
  }),
});

/** Cut to 80 characters at a word edge when there is one. */
function trimTo80(s) {
  if (s.length <= 80) return s;
  const cut = s.slice(0, 80);
  const i = cut.lastIndexOf(' ');
  return (i > 40 ? cut.slice(0, i) : cut).trim();
}

export const AttendantNote = z.object({
  headline: z.string().trim().min(3).refine((s) => !/[<>]|https?:|\n/.test(s), 'plain text only').transform(trimTo80),
  lines: z.array(z.string()).max(0).default([]),
});

/** The JSON schema the model must follow (sent to OpenRouter). */
export const ATTENDANT_JSON_SCHEMA = {
  name: 'attendant_note',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'lines'],
    properties: {
      headline: { type: 'string', description: 'One short, simple sentence, max 80 characters' },
      lines: { type: 'array', maxItems: 0, items: { type: 'string' } },
    },
  },
};
