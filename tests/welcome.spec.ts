import { test, expect, type Page } from '@playwright/test';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const welcome = (page: Page) =>
  page.getByRole('heading', { name: 'ค่อย ๆ อยู่กับคำหนึ่งคำ', exact: true });
const key = 'ooca-demo:saved-quotes:v1';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 360, height: 568 },
  { width: 390, height: 400 },
  { width: 1440, height: 900 },
]) {
  test(`welcome: full envelope and reachable controls at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await expect(welcome(page)).toBeVisible();
    await expect(page.locator('.welcome-wordmark')).toHaveText('Pick a word!');
    await expect(page.locator('.welcome-card-word')).toHaveText('coffee');
    await expect(page.locator('.welcome-reassurance')).toHaveText(
      'เลือกได้ ข้ามได้ จบได้เมื่อพร้อม',
    );
    await expect(
      page
        .locator('.app-header')
        .getByRole('button', { name: 'ดูย้อนหลัง', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(2);
    await expect(
      page.locator('header.brand, footer, .eyebrow, .quote-deck'),
    ).toHaveCount(0);
    const img = page.locator('.welcome-envelope>img');
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    const dimensions = await img.evaluate((el) => {
      const image = el as HTMLImageElement,
        r = image.getBoundingClientRect();
      return {
        x: r.x,
        right: r.right,
        width: r.width,
        height: r.height,
        ratio: image.naturalWidth / image.naturalHeight,
        fit: getComputedStyle(el).objectFit,
      };
    });
    expect(dimensions.x).toBeGreaterThanOrEqual(0);
    expect(dimensions.right).toBeLessThanOrEqual(viewport.width);
    expect(dimensions.width / dimensions.height).toBeCloseTo(
      dimensions.ratio,
      2,
    );
    expect(dimensions.fit).toBe('contain');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const name of ['ดูย้อนหลัง', 'เปิดอ่าน']) {
      const b = button(page, name),
        box = await b.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await button(page, 'เปิดอ่าน').scrollIntoViewIfNeeded();
    await expect(button(page, 'เปิดอ่าน')).toBeInViewport();
    await page.evaluate(() => scrollTo(0, 0));
    await page.mouse.click(5, 80);
    await page.screenshot({
      path: `evidence/figma-20261110/welcome-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
    await button(page, 'เปิดอ่าน').click();
    await expect(
      page.getByRole('heading', { name: 'พบข้อความ' }),
    ).toBeFocused();
    await expect(page.getByTestId('quote')).toBeVisible();
  });
}

test('welcome: history returns here, keyboard controls work, and no storage is changed', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await expect(welcome(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'ดูย้อนหลัง')).toBeFocused();
  expect(
    await button(page, 'ดูย้อนหลัง').evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    ),
  ).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เก็บไว้' }),
  ).toBeFocused();
  await button(page, 'กลับ').click();
  await expect(welcome(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(page, 'เปิดอ่าน')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeFocused();
  await expect(
    page.getByTestId('quote').locator('.quote-character'),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
  expect(errors).toEqual([]);
});

test('welcome: mobile tap history and start work with reduced motion', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/');
  await button(page, 'ดูย้อนหลัง').tap();
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เก็บไว้' }),
  ).toBeVisible();
  await button(page, 'กลับ').tap();
  await expect(welcome(page)).toBeVisible();
  await button(page, 'เปิดอ่าน').tap();
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeVisible();
  await page.getByRole('button', { name: /^ขยายข้อความ/ }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await button(page, 'กลับไปดูการ์ด').tap();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await context.close();
});
