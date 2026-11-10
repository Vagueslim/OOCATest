import {test,expect} from '@playwright/test';
const site='https://vagueslim.github.io/OOCATest/';
// Date/ICS contracts are independent of the reminder moving to the self-focus step.
const cases=[
 {zone:'Asia/Bangkok',label:'near midnight',input:'2026-11-08T23:59:59',local:'2026-11-15',utc:'20261115T060000Z',end:'20261115T061500Z'},
 {zone:'Asia/Bangkok',label:'month rollover',input:'2026-01-28T01:00:00',local:'2026-02-04',utc:'20260204T060000Z',end:'20260204T061500Z'},
 {zone:'Asia/Bangkok',label:'year rollover',input:'2026-12-28T23:59:59',local:'2027-01-04',utc:'20270104T060000Z',end:'20270104T061500Z'},
 {zone:'Asia/Bangkok',label:'leap day arrival',input:'2024-02-22T23:59:59',local:'2024-02-29',utc:'20240229T060000Z',end:'20240229T061500Z'},
 {zone:'Asia/Bangkok',label:'leap day departure',input:'2024-02-29T00:00:01',local:'2024-03-07',utc:'20240307T060000Z',end:'20240307T061500Z'},
 {zone:'America/Los_Angeles',label:'spring DST',input:'2026-03-03T23:59:59',local:'2026-03-10',utc:'20260310T200000Z',end:'20260310T201500Z'},
 {zone:'America/Los_Angeles',label:'fall DST',input:'2026-10-27T00:00:01',local:'2026-11-03',utc:'20261103T210000Z',end:'20261103T211500Z'},
 {zone:'America/Los_Angeles',label:'year rollover',input:'2026-12-28T23:59:59',local:'2027-01-04',utc:'20270104T210000Z',end:'20270104T211500Z'},
];
for(const c of cases)test.describe(`calendar module ${c.zone} ${c.label}`,()=>{
 test.use({timezoneId:c.zone});
 test('uses local seven-day date at 13:00 and UTC export formats',async({page})=>{
  await page.goto(process.env.TEST_BASE_URL||'/');
  const result=await page.evaluate(async input=>{
   const path='/src/calendar.ts';const {createCalendarReminder}=await import(path);
   const now=new Date(input),original=now.getTime();const r=createCalendarReminder(now);
   const local=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
   return {start:r.start.toISOString(),end:r.end.toISOString(),day:local(r.start),endDay:local(r.end),hour:r.start.getHours(),minute:r.start.getMinutes(),second:r.start.getSeconds(),ms:r.start.getMilliseconds(),endHour:r.end.getHours(),endMinute:r.end.getMinutes(),duration:r.end.getTime()-r.start.getTime(),timeZone:r.timeZone,event:r.event,title:r.title,ics:r.ics,filename:r.filename,unchanged:now.getTime()===original};
  },c.input);
  expect(result.day).toBe(c.local);expect(result.endDay).toBe(c.local);expect(result.hour).toBe(13);expect(result.minute).toBe(0);expect(result.second).toBe(0);expect(result.ms).toBe(0);expect(result.endHour).toBe(13);expect(result.endMinute).toBe(15);expect(result.duration).toBe(15*60*1000);expect(result.timeZone).toBe(c.zone);expect(result.unchanged).toBe(true);expect(result.filename).toBe(`pick-a-word-${c.local}-1300.ics`);
  expect(result.start.replace(/[-:]/g,'').replace('.000','')).toBe(c.utc);expect(result.end.replace(/[-:]/g,'').replace('.000','')).toBe(c.end);
  expect(result.title).toBe('ให้เวลากับตัวเอง · Pick a word!');expect(result.event.summary).toBe(result.title);expect(result.event.start).toEqual({dateTime:result.start,timeZone:c.zone});expect(result.event.end).toEqual({dateTime:result.end,timeZone:c.zone});expect(result.event.description).toContain(site);
  for(const line of result.ics.split('\r\n'))expect(Buffer.byteLength(line,'utf8')).toBeLessThanOrEqual(75);expect(result.ics).not.toContain('�');
  const ics=result.ics.replace(/\r\n[ \t]/g,'');
  expect(ics).toContain('BEGIN:VCALENDAR\r\n');expect(ics).toContain('VERSION:2.0\r\n');expect(ics).toContain('BEGIN:VEVENT\r\n');expect(ics).toContain(`DTSTART:${c.utc}\r\n`);expect(ics).toContain(`DTEND:${c.end}\r\n`);expect(ics).toContain(site);expect(ics).toContain('END:VEVENT\r\n');expect(ics.trimEnd()).toMatch(/END:VCALENDAR$/);expect(ics).not.toContain('TZID=');expect(ics).toContain('BEGIN:VALARM\r\nTRIGGER:PT0S\r\nACTION:DISPLAY');expect(ics).toContain('SUMMARY:ให้เวลากับตัวเอง · Pick a word!\r\n');
 });
});

test('calendar helper: explicit content appears exactly in body, ICS escapes it and no query URL exists',async({page})=>{
 await page.goto(process.env.TEST_BASE_URL||'/');
 const content={headword:'  CALM  ',text:'text; comma, slash\\ and\nnew line'};
 const result=await page.evaluate(async content=>{const path='/src/calendar.ts';const {createCalendarReminder}=await import(path);return createCalendarReminder(new Date('2026-11-08T12:00:00Z'),content);},content);
 expect(result.title).toBe(content.headword+' · '+content.text);expect(result.event.summary).toBe(result.title);expect(result).not.toHaveProperty('googleUrl');expect(result.event.description).not.toContain(content.text);
 const ics=result.ics.replace(/\r\n[ \t]/g,'');expect(ics).toContain('SUMMARY:  CALM   · text\\; comma\\, slash\\\\ and\\nnew line\r\n');
});
