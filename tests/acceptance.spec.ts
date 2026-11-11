import { test, expect, type Page } from '@playwright/test';
import { deckSize, shownIds, deckTimeout } from './catalog-test-data';
const key = 'ooca-demo:saved-quotes:v1';
const btn = (p: Page, n: string) =>
  p.getByRole('button', { name: n, exact: true });
const entries = (p: Page) =>
  p.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) || '{"entries":[]}').entries,
    key,
  );
async function start(p: Page) {
  await btn(p, 'เปิดอ่าน').click();
}
async function select(p: Page) {
  await btn(p, 'เลือกข้อความนี้').click();
  await expect(
    p.getByRole('heading', { name: 'ข้อความที่เราเลือก' }),
  ).toBeFocused();
  await expect(
    p.getByRole('radio', { name: 'ไม่ระบุ', exact: true }),
  ).toBeChecked();
  await expect(
    p.getByTestId('quote').locator('.source-details'),
  ).not.toHaveAttribute('open', '');
  await btn(p, 'ต่อไป').click();
  await expect(
    p.getByRole('heading', { name: 'เขียนถึงตัวเอง' }),
  ).toBeFocused();
}
async function save(p: Page) {
  const quote = await p.getByTestId('quote').getAttribute('data-quote-id');
  await btn(p, 'เลือกข้อความนี้').click();
  await expect(p.locator('.screen-done')).toBeVisible();
  await expect(p.locator('.screen-done h1')).toBeFocused();
  await btn(p, 'เลือกคำใหม่').click();
  await expect(p.getByRole('heading', { name: 'พบข้อความ' })).toBeFocused();
  await expect(p.getByTestId('quote')).toHaveAttribute('data-quote-id', quote!);
}
async function setFocus(p: Page, name: string) {
  await btn(p, 'กลับไปเลือกมุม').click();
  await p.getByRole('radio', { name, exact: true }).check();
  await btn(p, 'ต่อไป').click();
}
async function skip(p: Page) {
  await btn(p, 'วันนี้ยังไม่เลือก').click();
  await expect(
    p.getByRole('heading', { name: 'วันนี้ยังไม่เลือก' }),
  ).toBeFocused();
}
test.beforeEach(async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL || '/');
});
test('A02 skip ends before selecting without saving', async ({ page }) => {
  await start(page);
  await skip(page);
  await expect(
    page.getByText('เหนื่อยสินะวันนี้', { exact: true }),
  ).toBeVisible();
  await expect(btn(page, 'กลับไปหน้าแรก')).toBeVisible();
  expect(await entries(page)).toEqual([]);
});
test('A04 optional focus and memo can be skipped while saving the chosen word', async ({
  page,
}) => {
  await start(page);
  const q = await page.getByTestId('quote').getAttribute('data-quote-id');
  await select(page);
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id', q!);
  await expect(page.getByRole('textbox')).toBeEmpty();
  await save(page);
  expect(await entries(page)).toHaveLength(1);
  expect((await entries(page))[0]).toMatchObject({ quoteId: q, focus: null });
  await btn(page, 'ดูย้อนหลัง').click();
  await expect(
    page.locator('.history-swiper .swiper-slide-active .quote-card'),
  ).toHaveAttribute('data-quote-id', q!);
  await btn(page, 'กลับ').click();
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeFocused();
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id', q!);
});
test('A06 memo stays private, selected focus persists, reload reads saved snapshot', async ({
  page,
}) => {
  await start(page);
  await select(page);
  await setFocus(page, 'คนอื่น');
  await page.getByRole('textbox').fill('PRIVATE DRAFT 8675309');
  const quote = await page
    .getByTestId('quote')
    .locator('.quote-thai')
    .innerText();
  await save(page);
  const saved = await entries(page);
  expect(saved).toHaveLength(1);
  expect(saved[0].focus).toBe('other');
  expect(saved[0].quoteText).toContain(quote);
  expect(JSON.stringify(saved)).not.toContain('PRIVATE');
  await page.reload();
  await btn(page, 'ดูย้อนหลัง').click();
  expect(await entries(page)).toEqual(saved);
  await expect(page.getByText('PRIVATE DRAFT 8675309')).toHaveCount(0);
});
test('A01 complete deck and non-repeating seam', async ({ page }) => {
  test.setTimeout(deckTimeout());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  const seen = [];
  for (let i = 0; i < deckSize; i++) {
    seen.push(await page.getByTestId('quote').getAttribute('data-quote-id'));
    await btn(page, 'เปลี่ยนข้อความ').click();
  }
  expect(new Set(seen).size).toBe(deckSize);
  expect([...seen].sort()).toEqual([...shownIds].sort());
  expect(
    await page.getByTestId('quote').getAttribute('data-quote-id'),
  ).not.toBe(seen[deckSize - 1]);
});
test('A03 skip closure has Heart Hug and returns to a fresh round', async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 2; i++) {
    await skip(page);
    await expect(page.locator('.quote-character')).toHaveAttribute(
      'data-character-name',
      'Heart Hug',
    );
    await btn(page, 'กลับไปหน้าแรก').click();
    await expect(btn(page, 'เปิดอ่าน')).toBeVisible();
    expect(await entries(page)).toEqual([]);
    await start(page);
  }
});
test('A05 backtracking retains literal memo, clearing works and input has a 500 character limit', async ({
  page,
}) => {
  await start(page);
  await select(page);
  const text = '<b>คำของฉัน</b>';
  await page.getByRole('textbox').fill(text);
  await setFocus(page, 'คนอื่น');
  await expect(page.getByRole('textbox')).toHaveValue(text);
  await expect(page.locator('textarea b')).toHaveCount(0);
  await setFocus(page, 'ไม่ระบุ');
  await page.getByRole('textbox').fill('   ');
  await setFocus(page, 'สิ่งอื่น');
  await expect(page.getByRole('textbox')).toHaveValue('   ');
  await page.getByRole('textbox').fill('ก'.repeat(510));
  expect((await page.getByRole('textbox').inputValue()).length).toBe(500);
  expect(await entries(page)).toEqual([]);
});
test('A07 storage retries are idempotent and update focus without rewriting the saved wording', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/storage.ts';
    const { saveQuote, readEntries } = await import(path);
    const input = {
      id: 'same-round',
      quoteId: 'saved-id',
      quoteText: 'original saved words',
      focus: null,
    };
    const first = saveQuote(input);
    const retry = saveQuote(input);
    const updated = saveQuote({
      ...input,
      quoteText: 'later catalog wording',
      focus: 'self',
    });
    return { first, retry, updated, entries: readEntries() };
  });
  expect(result.retry).toEqual(result.first);
  expect(result.entries).toHaveLength(1);
  expect(result.updated).toEqual({ ...result.first, focus: 'self' });
});
test('A08 daily cap retains unsaved memo; deleting a saved entry restores capacity', async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  for (let i = 0; i < 9; i++) {
    await select(page);
    await save(page);
  }
  await select(page);
  await page.getByRole('textbox').fill('still private');
  await btn(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.save-status')).toHaveText(
    'วันนี้เก็บครบ 9 ข้อความแล้ว คุณยังจบรอบนี้ได้',
  );
  await expect(page.getByRole('textbox')).toHaveValue('still private');
  expect(await entries(page)).toHaveLength(9);
  await skip(page);
  await btn(page, 'กลับไปหน้าแรก').click();
  await btn(page, 'ดูย้อนหลัง').click();
  await page.locator('.history-entry-details>summary').click();
  await btn(page, 'ลบข้อความ').click();
  await btn(page, 'ยกเลิก').click();
  expect(await entries(page)).toHaveLength(9);
  await btn(page, 'ลบข้อความ').click();
  await btn(page, 'ยืนยันลบ').click();
  expect(await entries(page)).toHaveLength(8);
  await expect(page.locator('.history-carousel')).toBeFocused();
  await btn(page, 'กลับ').click();
  await start(page);
  await select(page);
  await save(page);
  expect(await entries(page)).toHaveLength(9);
});
test('A09 month filtering, exact unknown snapshots and last deletion returns keyboard focus to month', async ({
  page,
}) => {
  await page.evaluate(
    (k) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          version: 1,
          entries: [
            {
              id: 'old1',
              quoteId: 'x',
              quoteText: 'เดือนหนึ่ง',
              focus: 'other',
              savedAt: '2025-01-03T10:00:00Z',
              localDay: '2025-01-03',
            },
            {
              id: 'old2',
              quoteId: 'y',
              quoteText: 'เดือนสอง',
              focus: null,
              savedAt: '2025-02-04T10:00:00Z',
              localDay: '2025-02-04',
            },
          ],
        }),
      ),
    key,
  );
  await btn(page, 'ดูย้อนหลัง').click();
  await expect(
    page.getByText('เดือนนี้ยังไม่มีข้อความที่เก็บไว้'),
  ).toBeVisible();
  await page.getByRole('combobox').selectOption('2025-01');
  await expect(page.locator('.history-snapshot')).toHaveText('เดือนหนึ่ง');
  await page.locator('.history-entry-details>summary').click();
  await expect(page.getByText('นึกถึง: คนอื่น')).toBeVisible();
  await page.getByRole('combobox').selectOption('2025-02');
  await expect(page.locator('.history-snapshot')).toHaveText('เดือนสอง');
  await expect(page.locator('.history-entry-details')).not.toHaveAttribute(
    'open',
    '',
  );
  await page.locator('.history-entry-details>summary').click();
  await btn(page, 'ลบข้อความ').click();
  await btn(page, 'ยืนยันลบ').click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.locator('.history-empty')).toBeVisible();
  await btn(page, 'กลับ').click();
  await expect(btn(page, 'เปิดอ่าน')).toBeVisible();
});
for (const failure of ['malformed', 'write', 'read', 'schema'])
  test(
    'A10 ' + failure + ': failed save preserves memo and permits exit',
    async ({ page }) => {
      await start(page);
      await select(page);
      await page.getByRole('textbox').fill('private failure draft');
      if (failure === 'malformed' || failure === 'schema')
        await page.evaluate(
          ({ k, f }) =>
            localStorage.setItem(
              k,
              f === 'malformed'
                ? '{broken'
                : JSON.stringify({ version: 1, entries: [{ id: 'bad' }] }),
            ),
          { k: key, f: failure },
        );
      else
        await page.evaluate((f) => {
          Storage.prototype[f === 'write' ? 'setItem' : 'getItem'] = () => {
            throw new DOMException('blocked', 'SecurityError');
          };
        }, failure);
      await btn(page, 'เลือกข้อความนี้').click();
      await expect(page.locator('.save-status')).toHaveText(
        'ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',
      );
      await expect(page.getByRole('textbox')).toHaveValue(
        'private failure draft',
      );
      if (failure === 'write')
        expect(
          await page.evaluate((k) => localStorage.getItem(k), key),
        ).toBeNull();
      if (failure === 'malformed')
        expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
          '{broken',
        );
      await skip(page);
      await expect(btn(page, 'กลับไปหน้าแรก')).toBeVisible();
    },
  );
test('A10 failed storage update and deletion retain original entry', async ({
  page,
}) => {
  await start(page);
  await select(page);
  await save(page);
  const original = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error('blocked');
    };
  });
  const update = await page.evaluate(async () => {
    const path = '/src/storage.ts';
    const { readEntries, saveQuote } = await import(path);
    const entry = readEntries()[0];
    try {
      saveQuote({ ...entry, focus: 'self' });
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  });
  expect(update).toBe('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้');
  await btn(page, 'ดูย้อนหลัง').click();
  await page.locator('.history-entry-details>summary').click();
  await btn(page, 'ลบข้อความ').click();
  await btn(page, 'ยืนยันลบ').click();
  await expect(page.locator('.history-message')).toHaveText(update);
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    original,
  );
});
test('A11 ending and reload clear drafts while successful saves remain', async ({
  page,
}) => {
  await start(page);
  await select(page);
  await page.getByRole('textbox').fill('private');
  await save(page);
  await select(page);
  await expect(page.getByRole('textbox')).toBeEmpty();
  await page.getByRole('textbox').fill('reload private');
  await page.reload();
  await start(page);
  await select(page);
  await expect(page.getByRole('textbox')).toBeEmpty();
  expect(await entries(page)).toHaveLength(1);
  await page.getByRole('textbox').fill('skip private');
  await skip(page);
  await btn(page, 'กลับไปหน้าแรก').click();
  await start(page);
  await select(page);
  await expect(page.getByRole('textbox')).toBeEmpty();
});
test('A12 keyboard, preview focus, mobile and desktop writing evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await btn(page, 'เปิดอ่าน').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeFocused();
  await page.getByRole('button', { name: /^ขยายข้อความ/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: /^ขยายข้อความ/ }),
  ).toBeFocused();
  await select(page);
  await page.getByRole('textbox').fill('คำนี้ทำให้นึกถึงเพลงที่ชอบ');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'evidence/figma-writing-' + width + '.png',
      fullPage: true,
    });
  }
  await save(page);
  expect(errors).toEqual([]);
});
test('history navigation returns to the same deck or unfinished memo without saving', async ({
  page,
}) => {
  await start(page);
  await btn(page, 'เปลี่ยนข้อความ').click();
  const q = await page.getByTestId('quote').getAttribute('data-quote-id');
  await btn(page, 'ดูย้อนหลัง').click();
  await btn(page, 'กลับ').click();
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id', q!);
  await select(page);
  await setFocus(page, 'คนอื่น');
  await page.getByRole('textbox').fill('temporary only');
  await btn(page, 'ดูย้อนหลัง').click();
  await btn(page, 'กลับ').click();
  await expect(page.getByRole('textbox')).toHaveValue('temporary only');
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id', q!);
  expect(await entries(page)).toEqual([]);
  await btn(page, 'กลับไปเลือกมุม').click();
  await expect(
    page.getByRole('radio', { name: 'คนอื่น', exact: true }),
  ).toBeChecked();
  await btn(page, 'กลับไปเลือกคำ').click();
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id', q!);
});
