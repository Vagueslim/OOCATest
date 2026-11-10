import { readFileSync } from 'node:fs';
import type { Quote } from '../src/quotes';
export const catalog: Quote[] = JSON.parse(
  readFileSync(new URL('../src/catalog.json', import.meta.url), 'utf8'),
);
// Mirror the public visibility contract independently of the implementation under test.
export const shownCatalog = catalog.filter(
  (q) => q.status === undefined || q.status === 1,
);
export const shownIds = shownCatalog.map((q) => q.id);
export const deckSize = shownCatalog.length;
export const deckTimeout = (minimum = 60000, perCard = 1000) =>
  Math.max(minimum, deckSize * perCard);
