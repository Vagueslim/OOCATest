import { test, expect, type Page } from '@playwright/test';
import { catalog, shownCatalog } from './catalog-test-data';

const key = 'ooca-demo:saved-quotes:v1';
const melancholy = shownCatalog.find(
  (quote) => quote.headword.toLowerCase() === 'melancholy',
)!;
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const entries = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || '{"entries":[]}').entries,
    key,
  );
const deckState = (page: Page) =>
  page.locator('.quote-deck .swiper-slide').evaluateAll((slides) => ({
    ids: slides.map((slide) =>
      slide.querySelector('[data-quote-id]')?.getAttribute('data-quote-id'),
    ),
    cursor: slides.findIndex((slide) =>
      slide.classList.contains('swiper-slide-active'),
    ),
  }));
const fixtureCatalog = [
  melancholy,
  ...catalog.filter((quote) => quote.id !== melancholy.id),
];
const legacy = {
  id: 'previous-round',
  quoteId: melancholy.id,
  quoteText: 'ข้อความเดิมที่เก็บไว้ ก่อนแก้ catalog',
  focus: 'things',
  savedAt: '2026-11-01T06:00:00.000Z',
  localDay: '2026-11-01',
};

async function begin(page: Page) {
  await page.goto('/');
  await button(page, 'เปิดอ่าน').click();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    melancholy.id,
  );
}
async function reflect(page: Page) {
  await begin(page);
  await button(page, 'เลือกข้อความนี้').click();
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เราเลือก', exact: true }),
  ).toBeFocused();
}
async function memo(page: Page, focus?: string) {
  await reflect(page);
  if (focus)
    await page.getByRole('radio', { name: focus, exact: true }).check();
  await button(page, 'ต่อไป').click();
  await expect(
    page.getByRole('heading', { name: 'เขียนถึงตัวเอง', exact: true }),
  ).toBeFocused();
}
async function noOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function capture(page: Page, name: string) {
  await noOverflow(page);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `evidence/figma-20261110/${name}.png`,
    fullPage: true,
  });
}
async function mockCalendar(page: Page) {
  const external: string[] = [];
  await page.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === '127.0.0.1' || hostname === 'localhost')
      return route.fallback();
    external.push(route.request().url());
    return route.abort();
  });
  await page.route('**/src/googleCalendar.ts*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
  export class CalendarError extends Error{constructor(code){super(code);this.code=code;}}
  export const calls=[];export let preparations=0;let resolve;
  export function settle(){resolve({id:'mock-event',htmlLink:'https://calendar.google.com/calendar/event?eid=mock'});}
  export const googleCalendarClient={configured:true,async prepare(){preparations++;},createEvent(event){calls.push(structuredClone(event));return new Promise(done=>{resolve=done;});}};
 `,
    }),
  );
  return {
    external,
    state: () =>
      page.evaluate(async () => {
        const path = '/src/googleCalendar.ts';
        const module = await import(/* @vite-ignore */ path);
        return { calls: module.calls, preparations: module.preparations };
      }),
    settle: () =>
      page.evaluate(async () => {
        const path = '/src/googleCalendar.ts';
        (await import(/* @vite-ignore */ path)).settle();
      }),
  };
}

test.use({ timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T06:00:00.000Z'));
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });
  await page.route('**/src/catalog.json*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export default ' + JSON.stringify(fixtureCatalog) + ';',
    }),
  );
});

test('Figma flow: memo saves privately, confirms Done and resumes the same card and deck with a fresh selection', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, legacy }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, entries: [legacy] }),
      ),
    { key, legacy },
  );
  await begin(page);
  await button(page, 'เปลี่ยนข้อความ').click();
  const chosen = fixtureCatalog[1],
    before = await deckState(page);
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    chosen.id,
  );
  await button(page, 'เลือกข้อความนี้').click();
  expect(await entries(page)).toEqual([legacy]);
  await expect(
    page.getByRole('radio', { name: 'ไม่ระบุ', exact: true }),
  ).toBeChecked();
  await page.getByRole('radio', { name: 'คนอื่น', exact: true }).check();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE MEMO MUST NOT BE SAVED');
  expect(await entries(page)).toEqual([legacy]);
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  await expect(page.locator('.screen-done h1')).toBeFocused();
  const stored = await entries(page);
  expect(stored).toHaveLength(2);
  expect(stored[0]).toEqual(legacy);
  expect(stored[1]).toMatchObject({
    quoteId: chosen.id,
    focus: 'other',
    localDay: '2026-11-10',
  });
  expect(Object.keys(stored[1]).sort()).toEqual([
    'focus',
    'id',
    'localDay',
    'quoteId',
    'quoteText',
    'savedAt',
  ]);
  expect(stored[1].quoteText).toContain(chosen.headword);
  expect(stored[1].quoteText).toContain(chosen.text);
  expect(JSON.stringify(stored)).not.toContain('PRIVATE MEMO');
  await button(page, 'ดูข้อความที่เก็บไว้').click();
  await expect(
    page.getByRole('combobox', { name: 'เลือกเดือน', exact: true }),
  ).toHaveValue('2026-11');
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    chosen.id,
  );
  await button(page, 'กลับ').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  await expect(page.locator('.screen-done h1')).toBeFocused();
  expect(await entries(page)).toEqual(stored);
  await button(page, 'เลือกคำใหม่').click();
  await expect(
    page.getByRole('heading', { name: 'พบข้อความ', exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    chosen.id,
  );
  expect(await deckState(page)).toEqual(before);
  await button(page, 'ข้อความก่อนหน้า').click();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    melancholy.id,
  );
  await button(page, 'เปลี่ยนข้อความ').click();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    chosen.id,
  );
  await button(page, 'เลือกข้อความนี้').click();
  await expect(
    page.getByRole('radio', { name: 'ไม่ระบุ', exact: true }),
  ).toBeChecked();
  await button(page, 'ต่อไป').click();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  const secondSave = await entries(page);
  expect(secondSave).toHaveLength(3);
  expect(secondSave[2]).toMatchObject({ quoteId: chosen.id, focus: null });
  expect(secondSave[2].id).not.toBe(stored[1].id);
});

test('Figma flow: failed storage write preserves draft and selection without claiming success', async ({
  page,
}) => {
  await memo(page, 'สิ่งอื่น');
  await page.getByRole('textbox').fill('PRIVATE DRAFT RETAINED AFTER FAILURE');
  await page.evaluate((key) => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException('Test storage failure', 'QuotaExceededError');
      return write.call(this, name, value);
    };
  }, key);
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.save-status')).toHaveText(
    'ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',
  );
  await expect(page.getByRole('textbox')).toHaveValue(
    'PRIVATE DRAFT RETAINED AFTER FAILURE',
  );
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    melancholy.id,
  );
  expect(await entries(page)).toEqual([]);
  await expect(page.locator('.screen-write')).toBeVisible();
  await expect(page.locator('.screen-done')).toHaveCount(0);
  await expect(page.locator('.history-view')).toHaveCount(0);
  await button(page, 'กลับไปเลือกมุม').click();
  await expect(
    page.getByRole('radio', { name: 'สิ่งอื่น', exact: true }),
  ).toBeChecked();
});

test('Figma flow: daily limit keeps memo intact and still permits an unsaved exit', async ({
  page,
}) => {
  const full = Array.from({ length: 9 }, (_, index) => ({
    ...legacy,
    id: `full-${index}`,
    savedAt: `2026-11-10T0${index}:00:00.000Z`,
    localDay: '2026-11-10',
  }));
  await page.addInitScript(
    ({ key, full }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, entries: full })),
    { key, full },
  );
  await memo(page);
  await page.getByRole('textbox').fill('LIMIT DRAFT');
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.save-status')).toContainText(
    'วันนี้เก็บครบ 9 ข้อความแล้ว',
  );
  await expect(page.getByRole('textbox')).toHaveValue('LIMIT DRAFT');
  await expect(page.locator('.screen-write')).toBeVisible();
  await expect(page.locator('.screen-done')).toHaveCount(0);
  expect(await entries(page)).toEqual(full);
  await button(page, 'วันนี้ยังไม่เลือก').click();
  await expect(
    page.getByText('เหนื่อยสินะวันนี้', { exact: true }),
  ).toBeVisible();
  expect(await entries(page)).toEqual(full);
  await button(page, 'กลับไปหน้าแรก').click();
  await button(page, 'เปิดอ่าน').click();
  await button(page, 'เลือกข้อความนี้').click();
  await button(page, 'ต่อไป').click();
  await expect(page.getByRole('textbox')).toHaveValue('');
});

test('Figma flow: visiting history and reactivating its header preserves originating memo and draft', async ({
  page,
}) => {
  await memo(page, 'คนอื่น');
  await page.getByRole('textbox').fill('DRAFT WHILE READING HISTORY');
  await button(page, 'ดูย้อนหลัง').click();
  await expect(page.locator('.history-view')).toBeVisible();
  await button(page, 'ดูย้อนหลัง').click();
  await button(page, 'กลับ').click();
  await expect(page.getByRole('textbox')).toHaveValue(
    'DRAFT WHILE READING HISTORY',
  );
  await button(page, 'กลับไปเลือกมุม').click();
  await expect(
    page.getByRole('radio', { name: 'คนอื่น', exact: true }),
  ).toBeChecked();
  expect(await entries(page)).toEqual([]);
});

test('Figma flow: Reflect source disclosure starts collapsed and toggles without saving', async ({
  page,
}) => {
  await reflect(page);
  const reflectDetails = page.getByTestId('quote').locator('.source-details');
  await expect(reflectDetails).not.toHaveAttribute('open');
  await reflectDetails.locator('summary').click();
  await expect(reflectDetails).toHaveAttribute('open');
  await expect(reflectDetails.locator('.source-text')).toHaveText(
    melancholy.original,
  );
  await reflectDetails.locator('summary').click();
  await expect(reflectDetails).not.toHaveAttribute('open');
  expect(await entries(page)).toEqual([]);
});

test('Figma flow: Calendar is self-only and sends exactly one event only after review and consent', async ({
  page,
}) => {
  const calendar = await mockCalendar(page);
  await reflect(page);
  await expect(button(page, 'บอกฉันอีก 7 วัน')).toHaveCount(0);
  await page.getByRole('radio', { name: 'คนอื่น', exact: true }).check();
  await expect(button(page, 'บอกฉันอีก 7 วัน')).toHaveCount(0);
  await page.getByRole('radio', { name: 'สิ่งอื่น', exact: true }).check();
  await expect(button(page, 'บอกฉันอีก 7 วัน')).toHaveCount(0);
  await page.getByRole('radio', { name: 'ตนเอง', exact: true }).check();
  await expect(button(page, 'บอกฉันอีก 7 วัน')).toBeVisible();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE CALENDAR DRAFT');
  await expect(page.locator('.calendar-reminder')).toHaveCount(0);
  await button(page, 'กลับไปเลือกมุม').click();
  await button(page, 'บอกฉันอีก 7 วัน').click();
  const panel = page.getByRole('region', {
    name: 'เพิ่มนัดในปฏิทิน',
    exact: true,
  });
  const consent = page.getByRole('checkbox', {
    name: 'ฉันยินยอมส่งข้อมูลข้างต้นไปยัง Google Calendar',
    exact: true,
  });
  await expect(panel).toContainText('ตรวจนัดก่อนส่ง');
  await expect(panel.locator('.calendar-title')).toHaveText(
    `${melancholy.headword} · ${melancholy.text}`,
  );
  await expect(button(page, 'ตกลง สร้างนัด')).toBeDisabled();
  expect((await calendar.state()).calls).toEqual([]);
  await consent.check();
  await expect(button(page, 'ตกลง สร้างนัด')).toBeEnabled();
  expect((await calendar.state()).calls).toEqual([]);
  await button(page, 'ตกลง สร้างนัด').click();
  await expect(panel).toHaveAttribute('aria-busy', 'true');
  for (const label of [
    'กลับไปเลือกคำ',
    'ต่อไป',
    'วันนี้ยังไม่เลือก',
    'บอกฉันอีก 7 วัน',
  ])
    await expect(button(page, label)).toBeDisabled();
  for (const radio of await page.getByRole('radio').all())
    await expect(radio).toBeDisabled();
  const state = await calendar.state();
  expect(state.calls).toHaveLength(1);
  expect(state.calls[0].summary).toBe(
    `${melancholy.headword} · ${melancholy.text}`,
  );
  expect(state.calls[0].start).toEqual({
    dateTime: '2026-11-17T06:00:00.000Z',
    timeZone: 'Asia/Bangkok',
  });
  expect(JSON.stringify(state.calls[0])).not.toContain(
    'PRIVATE CALENDAR DRAFT',
  );
  expect(state.calls[0]).not.toHaveProperty('focus');
  expect(state.calls[0]).not.toHaveProperty('draft');
  await calendar.settle();
  await expect(panel.getByRole('status')).toHaveText(
    'สร้างนัดใน Google Calendar แล้ว',
  );
  await button(page, 'ต่อไป').click();
  await expect(page.getByRole('textbox')).toHaveValue('PRIVATE CALENDAR DRAFT');
  expect(await entries(page)).toEqual([]);
  expect(calendar.external).toEqual([]);
});

test('Figma flow: old snapshot is displayed verbatim and deletion requires confirmation', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, legacy }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, entries: [legacy] }),
      ),
    { key, legacy },
  );
  await page.goto('/');
  await button(page, 'ดูย้อนหลัง').click();
  await expect(page.locator('.history-snapshot')).toHaveText(legacy.quoteText);
  await page.locator('.history-entry-details > summary').click();
  await expect(page.locator('.history-saved-text')).toHaveText(
    legacy.quoteText,
  );
  await button(page, 'ลบข้อความ').click();
  expect(await entries(page)).toEqual([legacy]);
  await button(page, 'ยกเลิก').click();
  expect(await entries(page)).toEqual([legacy]);
  await button(page, 'ลบข้อความ').click();
  await button(page, 'ยืนยันลบ').click();
  expect(await entries(page)).toEqual([]);
  await expect(page.locator('.history-empty')).toHaveText(
    'เดือนนี้ยังไม่มีข้อความที่เก็บไว้',
  );
});

for (const width of [360, 390, 1440])
  test(`Figma flow: complete journey has no horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await mockCalendar(page);
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await capture(page, `flow-welcome-${width}`);
    await button(page, 'เปิดอ่าน').click();
    await capture(page, `flow-discover-${width}`);
    await button(page, 'เลือกข้อความนี้').click();
    await capture(page, `flow-reflect-${width}`);
    await page
      .getByTestId('quote')
      .locator('.source-details > summary')
      .click();
    await capture(page, `flow-source-expanded-${width}`);
    await page
      .getByTestId('quote')
      .locator('.source-details > summary')
      .click();
    await page.getByRole('radio', { name: 'ตนเอง', exact: true }).check();
    await capture(page, `flow-self-${width}`);
    await button(page, 'บอกฉันอีก 7 วัน').click();
    await capture(page, `flow-calendar-${width}`);
    await button(page, 'ต่อไป').click();
    await capture(page, `flow-memo-${width}`);
    await button(page, 'เลือกข้อความนี้').click();
    await expect(page.locator('.screen-done h1')).toBeFocused();
    await capture(page, `flow-done-${width}`);
    await button(page, 'ดูข้อความที่เก็บไว้').click();
    await capture(page, `flow-history-${width}`);
    await button(page, 'กลับ').click();
    await expect(page.locator('.screen-done')).toBeVisible();
    await button(page, 'เลือกคำใหม่').click();
    await expect(
      page.getByRole('heading', { name: 'พบข้อความ', exact: true }),
    ).toBeFocused();
    await capture(page, `flow-resume-discover-${width}`);
    await button(page, 'วันนี้ยังไม่เลือก').click();
    await capture(page, `flow-exit-${width}`);
    expect(errors).toEqual([]);
  });
