import type { Focus } from './quotes';
export type SavedQuote = {
  id: string;
  quoteId: string;
  quoteText: string;
  focus: Focus;
  savedAt: string;
  localDay: string;
};
export const KEY = 'ooca-demo:saved-quotes:v1';
export const STORAGE_ERROR = 'ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้';
export const FULL = 'วันนี้เก็บครบ 3 ข้อความแล้ว คุณยังจบรอบนี้ได้';
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function validEntry(e: unknown): e is SavedQuote {
  if (!e || typeof e !== 'object') return false;
  const v = e as SavedQuote;
  return (
    Object.keys(v).sort().join(',') ===
      'focus,id,localDay,quoteId,quoteText,savedAt' &&
    ['id', 'quoteId', 'quoteText', 'savedAt', 'localDay'].every(
      (k) =>
        typeof v[k as keyof SavedQuote] === 'string' &&
        !!v[k as keyof SavedQuote],
    ) &&
    [null, 'self', 'other', 'things'].includes(v.focus) &&
    Number.isFinite(Date.parse(v.savedAt)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.localDay) &&
    new Date(v.localDay + 'T12:00:00').getDate() ===
      Number(v.localDay.slice(-2))
  );
}
export function readEntries(): SavedQuote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    if (
      data?.version !== 1 ||
      !Array.isArray(data.entries) ||
      !data.entries.every(validEntry) ||
      new Set(data.entries.map((e: SavedQuote) => e.id)).size !==
        data.entries.length
    )
      throw Error();
    return data.entries;
  } catch {
    throw Error(STORAGE_ERROR);
  }
}
function write(entries: SavedQuote[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, entries }));
  } catch {
    throw Error(STORAGE_ERROR);
  }
}
export function saveQuote(input: Omit<SavedQuote, 'savedAt' | 'localDay'>) {
  const entries = readEntries();
  const old = entries.find((e) => e.id === input.id);
  if (old) {
    const updated = { ...old, focus: input.focus };
    if (old.focus !== input.focus)
      write(entries.map((e) => (e.id === input.id ? updated : e)));
    return updated;
  }
  const today = localDay();
  if (entries.filter((e) => e.localDay === today).length >= 3)
    throw Error(FULL);
  const entry = {
    ...input,
    savedAt: new Date().toISOString(),
    localDay: today,
  };
  write([...entries, entry]);
  return entry;
}
export function deleteQuote(id: string) {
  const entries = readEntries();
  const next = entries.filter((e) => e.id !== id);
  write(next);
  return next;
}
