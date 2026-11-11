import { test, expect, type Page } from '@playwright/test';
import { shownCatalog } from './catalog-test-data';
import { characterByQuote } from '../src/characters';

const key = 'ooca-demo:saved-quotes:v1';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const entries = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || '{"entries":[]}').entries,
    key,
  );

test.use({ reducedMotion: 'reduce' });

test('Done keeps the selected Mooca across preview, save and History, then follows the next selection', async ({
  page,
}) => {
  const poses = ['Sunny Friend', 'Back View', 'Quiet Moment'];
  const cards = poses.map((name) =>
    shownCatalog.find((quote) => characterByQuote[quote.id].name === name)!,
  );
  await page.route('**/src/catalog.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(cards)};`,
    }),
  );
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });
  await page.goto('/');
  await button(page, 'เปิดอ่าน').click();
  for (const [index, card] of cards.entries()) {
    await expect(page.getByTestId('quote')).toHaveAttribute(
      'data-quote-id',
      card.id,
    );
    const artwork = page.getByTestId('quote').locator('.quote-character');
    await expect(artwork).toHaveAttribute('data-character-name', poses[index]);
    const source = await artwork.locator('img').getAttribute('src');
    await page.getByRole('button', { name: /^ขยายข้อความ/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.quote-character')).toHaveAttribute(
      'data-character-name',
      poses[index],
    );
    await button(page, 'เลือกข้อความนี้').click();
    await expect(
      page.getByTestId('quote').locator('.quote-character img'),
    ).toHaveAttribute('src', source!);
    await button(page, 'ต่อไป').click();
    await page.getByRole('textbox').fill('PRIVATE SAME MOOCA DRAFT');
    await button(page, 'เลือกข้อความนี้').click();
    const done = page.locator('.screen-done');
    await expect(done).toBeVisible();
    await expect(done.locator('.character-tag')).toHaveText(poses[index]);
    const completedArt = done.getByRole('img', {
      name: `Mooca ${poses[index]}`,
      exact: true,
    });
    await expect(completedArt).toBeVisible();
    await expect(completedArt.locator('img')).toHaveAttribute('src', source!);
    await completedArt
      .locator('img')
      .evaluate((image) => (image as HTMLImageElement).decode());
    const bounds = (await completedArt.boundingBox())!;
    expect(bounds.width).toBe(166);
    expect(bounds.height).toBe(176);
    const saved = await entries(page);
    expect(saved).toHaveLength(index + 1);
    expect(saved[index].quoteId).toBe(card.id);
    expect(Object.keys(saved[index]).sort()).toEqual(
      ['id', 'quoteId', 'quoteText', 'focus', 'savedAt', 'localDay'].sort(),
    );
    expect(JSON.stringify(saved)).not.toContain('PRIVATE SAME MOOCA DRAFT');
    await button(page, 'ดูข้อความที่เก็บไว้').click();
    await button(page, 'กลับ').click();
    await expect(done.locator('.character-tag')).toHaveText(poses[index]);
    await expect(done.locator('.quote-character img')).toHaveAttribute(
      'src',
      source!,
    );
    expect(await entries(page)).toEqual(saved);
    await button(page, 'เลือกคำใหม่').click();
    await expect(page.getByTestId('quote')).toHaveAttribute(
      'data-quote-id',
      card.id,
    );
    if (index < cards.length - 1) await button(page, 'เปลี่ยนข้อความ').click();
  }
});

test('Done confirms one private save, returns from History and resumes the same deck', async ({
  page,
}) => {
  await page.goto(process.env.TEST_BASE_URL || '/');
  await button(page, 'เปิดอ่าน').click();
  await button(page, 'เปลี่ยนข้อความ').click();
  const previous = await page
    .getByTestId('quote')
    .getAttribute('data-quote-id');
  await button(page, 'เปลี่ยนข้อความ').click();
  const selected = await page
    .getByTestId('quote')
    .getAttribute('data-quote-id');
  await button(page, 'เลือกข้อความนี้').click();
  await page.getByRole('radio', { name: 'คนอื่น', exact: true }).check();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE DONE DRAFT — NEVER STORED');
  await button(page, 'เลือกข้อความนี้').click();

  await expect(page.locator('.screen-done')).toBeVisible();
  await expect(page.locator('.screen-done h1')).toBeFocused();
  await expect(page.getByText('PRIVATE DONE DRAFT — NEVER STORED')).toHaveCount(
    0,
  );
  const saved = await entries(page);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ quoteId: selected, focus: 'other' });
  expect(Object.keys(saved[0]).sort()).toEqual(
    ['id', 'quoteId', 'quoteText', 'focus', 'savedAt', 'localDay'].sort(),
  );
  expect(JSON.stringify(saved)).not.toContain('PRIVATE DONE DRAFT');

  await button(page, 'ดูข้อความที่เก็บไว้').click();
  await expect(page.locator('.history-view')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เก็บไว้', exact: true }),
  ).toBeFocused();
  await button(page, 'กลับ').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  await expect(page.locator('.screen-done h1')).toBeFocused();
  expect(await entries(page)).toEqual(saved);

  await button(page, 'เลือกคำใหม่').click();
  await expect(
    page.getByRole('heading', { name: 'พบข้อความ', exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    selected!,
  );
  await button(page, 'ข้อความก่อนหน้า').click();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    previous!,
  );
  await button(page, 'เปลี่ยนข้อความ').click();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    selected!,
  );
  expect(await entries(page)).toEqual(saved);
});

test('Done starts fresh selections for the same card; the tenth save stays in Write with its draft', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-11-11T05:00:00Z'));
  await page.goto(process.env.TEST_BASE_URL || '/');
  await button(page, 'เปิดอ่าน').click();
  const selected = await page
    .getByTestId('quote')
    .getAttribute('data-quote-id');
  let previousSaved = await entries(page);
  for (let index = 0; index < 9; index++) {
    await button(page, 'เลือกข้อความนี้').click();
    await expect(
      page.getByRole('radio', { name: 'ไม่ระบุ', exact: true }),
    ).toBeChecked();
    await button(page, 'ต่อไป').click();
    await expect(page.getByRole('textbox')).toBeEmpty();
    if (index === 0)
      await page.getByRole('textbox').fill('FIRST PRIVATE DRAFT');
    await button(page, 'เลือกข้อความนี้').click();
    await expect(page.locator('.screen-done')).toBeVisible();
    const saved = await entries(page);
    expect(saved).toHaveLength(index + 1);
    expect(saved.slice(0, index)).toEqual(previousSaved);
    expect(saved[index]).toMatchObject({ quoteId: selected, focus: null });
    expect(new Set(saved.map((entry: { id: string }) => entry.id)).size).toBe(
      index + 1,
    );
    expect(JSON.stringify(saved)).not.toContain('FIRST PRIVATE DRAFT');
    previousSaved = saved;
    await button(page, 'เลือกคำใหม่').click();
    await expect(page.getByTestId('quote')).toHaveAttribute(
      'data-quote-id',
      selected!,
    );
    expect(await entries(page)).toEqual(saved);
  }
  await button(page, 'เลือกข้อความนี้').click();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE QUOTA DRAFT');
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-write')).toBeVisible();
  await expect(page.locator('.screen-done')).toHaveCount(0);
  await expect(page.locator('.save-status')).toContainText(
    'วันนี้เก็บครบ 9 ข้อความแล้ว',
  );
  await expect(page.getByRole('textbox')).toHaveValue('PRIVATE QUOTA DRAFT');
  expect(await entries(page)).toEqual(previousSaved);
  await button(page, 'วันนี้ยังไม่เลือก').click();
  await expect(page.locator('.screen-noSelection')).toBeVisible();
  expect(await entries(page)).toEqual(previousSaved);
});

test('Three existing saved quotes no longer block a fourth save and stay unchanged', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-11T05:00:00Z'));
  await page.goto(process.env.TEST_BASE_URL || '/');
  const existing = await page.evaluate((key) => {
    const now = new Date();
    const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const saved = Array.from({ length: 3 }, (_, index) => ({
      id: `existing-${index}`,
      quoteId: `legacy-${index}`,
      quoteText: `ข้อความเดิม ${index + 1}`,
      focus: 'self',
      savedAt: now.toISOString(),
      localDay,
    }));
    localStorage.setItem(key, JSON.stringify({ version: 1, entries: saved }));
    return saved;
  }, key);
  await button(page, 'เปิดอ่าน').click();
  const selected = await page
    .getByTestId('quote')
    .getAttribute('data-quote-id');
  await button(page, 'เลือกข้อความนี้').click();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE FOURTH DRAFT');
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  const saved = await entries(page);
  expect(saved).toHaveLength(4);
  expect(saved.slice(0, 3)).toEqual(existing);
  expect(saved[3]).toMatchObject({ quoteId: selected, focus: null });
  expect(JSON.stringify(saved)).not.toContain('PRIVATE FOURTH DRAFT');
  await button(page, 'ดูข้อความที่เก็บไว้').click();
  await expect(page.locator('.history-view')).toBeVisible();
  expect(await entries(page)).toEqual(saved);
});

test('A storage failure after Done preserves earlier history and the current private draft', async ({
  page,
}) => {
  await page.goto(process.env.TEST_BASE_URL || '/');
  await button(page, 'เปิดอ่าน').click();
  await button(page, 'เลือกข้อความนี้').click();
  await button(page, 'ต่อไป').click();
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  const saved = await entries(page);
  await button(page, 'เลือกคำใหม่').click();
  await button(page, 'เลือกข้อความนี้').click();
  await page.getByRole('radio', { name: 'สิ่งอื่น', exact: true }).check();
  await button(page, 'ต่อไป').click();
  await page.getByRole('textbox').fill('PRIVATE BLOCKED WRITE');
  await page.evaluate((key) => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException('Blocked test write', 'QuotaExceededError');
      return write.call(this, name, value);
    };
  }, key);
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-write')).toBeVisible();
  await expect(page.locator('.screen-done')).toHaveCount(0);
  await expect(page.locator('.save-status')).toHaveText(
    'ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',
  );
  await expect(page.getByRole('textbox')).toHaveValue('PRIVATE BLOCKED WRITE');
  expect(await entries(page)).toEqual(saved);
  await button(page, 'กลับไปเลือกมุม').click();
  await expect(
    page.getByRole('radio', { name: 'สิ่งอื่น', exact: true }),
  ).toBeChecked();
  await button(page, 'วันนี้ยังไม่เลือก').click();
  await expect(page.locator('.screen-noSelection')).toBeVisible();
  expect(await entries(page)).toEqual(saved);
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Done remains readable and keyboard navigable with reduced motion at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(process.env.TEST_BASE_URL || '/');
    await button(page, 'เปิดอ่าน').click();
    const selected = await page
      .getByTestId('quote')
      .getAttribute('data-quote-id');
    const selectedPose = await page
      .getByTestId('quote')
      .locator('.character-tag')
      .textContent();
    await button(page, 'เลือกข้อความนี้').click();
    await button(page, 'ต่อไป').click();
    await button(page, 'เลือกข้อความนี้').click();
    await expect(page.locator('.screen-done h1')).toBeFocused();
    await expect(
      page.getByRole('img', {
        name: `Mooca ${selectedPose!.trim()}`,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const saved = await entries(page);
    await page.keyboard.press('Tab');
    await expect(button(page, 'เลือกคำใหม่')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'ดูข้อความที่เก็บไว้')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.history-view')).toBeVisible();
    await button(page, 'กลับ').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.screen-done h1')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('quote')).toHaveAttribute(
      'data-quote-id',
      selected!,
    );
    expect(await entries(page)).toEqual(saved);
  });
}
