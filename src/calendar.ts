import type { CalendarEventDraft } from './googleCalendar';
export const CALENDAR_TITLE = 'ให้เวลากับตัวเอง · Pick a word!';
export const CALENDAR_SITE = 'https://vagueslim.github.io/OOCATest/';
const description = `ค่อย ๆ กลับมาให้เวลากับตัวเอง เมื่อพร้อม\nเปิด Pick a word!: ${CALENDAR_SITE}`;

export type CalendarContent = { headword: string; text: string };
export type CalendarReminder = {
  start: Date;
  end: Date;
  timeZone: string;
  title: string;
  event: CalendarEventDraft;
  ics: string;
  filename: string;
};
const utc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
// RFC 5545 folds at 75 UTF-8 octets, without splitting a Unicode code point.
function foldLine(value: string) {
  const encoder = new TextEncoder();
  let line = '',
    length = 0;
  const lines: string[] = [];
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (length + size > 75) {
      lines.push(line);
      line = ' ';
      length = 1;
    }
    line += character;
    length += size;
  }
  lines.push(line);
  return lines.join('\r\n');
}
export function createCalendarReminder(
  now: Date = new Date(),
  content?: CalendarContent,
): CalendarReminder {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError('Invalid calendar date');
  // Calendar-day arithmetic, not a 168-hour offset, preserves 13:00 across DST.
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
    13,
    0,
    0,
    0,
  );
  const end = new Date(start);
  end.setMinutes(15);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const title = content
    ? [content.headword, content.text].filter(Boolean).join(' · ')
    : CALENDAR_TITLE;
  const event: CalendarEventDraft = {
    summary: title,
    description,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OOCA//Pick a word//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:pick-a-word-${utc(start)}@vagueslim.github.io`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${CALENDAR_SITE}`,
    'CLASS:PRIVATE',
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const localDay = [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    start,
    end,
    timeZone,
    title,
    event,
    ics: lines.map(foldLine).join('\r\n') + '\r\n',
    filename: `pick-a-word-${localDay}-1300.ics`,
  };
}
