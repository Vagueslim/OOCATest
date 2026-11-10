import { test, expect, type Page } from '@playwright/test';

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const preview = (page: Page) => page.getByRole('dialog');
const opener = (page: Page) =>
  page.getByRole('button', { name: /^ขยายข้อความ/ });
const savedKey = 'ooca-demo:saved-quotes:v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.99999;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(process.env.TEST_BASE_URL || '/');
  await page.evaluate(() => document.fonts.ready);
  await button(page, 'เปิดอ่าน').click();
});

for (const viewport of [
  { width: 665, height: 604 },
  { width: 390, height: 844 },
]) {
  test(`preview actions follow content in one scroll container at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const quoteId = await page
      .getByTestId('quote')
      .getAttribute('data-quote-id');
    await opener(page).click();
    const dialog = preview(page),
      back = button(page, 'กลับไปดูการ์ด'),
      select = button(page, 'เลือกข้อความนี้');
    await expect(dialog).toHaveAttribute('data-phase', 'open');
    await expect(dialog.locator('#preview-title')).toBeFocused();
    expect(await dialog.evaluate((el) => el.scrollTop)).toBe(0);
    await expect(dialog.locator('.preview-top button')).toHaveCount(0);
    await expect(dialog.locator('.preview-bottom .preview-back')).toHaveCount(
      1,
    );
    await expect(dialog.locator('.source-details')).not.toHaveAttribute(
      'open',
      '',
    );
    await dialog.locator('.source-details summary').click();
    await dialog.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(select).not.toBeInViewport();
    await expect(back).not.toBeInViewport();
    const layout = await dialog.evaluate((el) => ({
      overflow: getComputedStyle(el).overflowY,
      footerPosition: getComputedStyle(el.querySelector('.preview-bottom')!)
        .position,
      readingOverflow: getComputedStyle(el.querySelector('.preview-reading')!)
        .overflowY,
      readingHeight: (el.querySelector('.preview-reading') as HTMLElement)
        .clientHeight,
      readingScrollHeight: (el.querySelector('.preview-reading') as HTMLElement)
        .scrollHeight,
      overflows: el.scrollHeight > el.clientHeight,
      fits: el.scrollWidth <= el.clientWidth,
    }));
    expect(layout.overflow).toBe('auto');
    expect(layout.footerPosition).toBe('static');
    expect(layout.readingOverflow).toBe('visible');
    expect(layout.readingHeight).toBe(layout.readingScrollHeight);
    expect(layout.overflows).toBe(true);
    expect(layout.fits).toBe(true);
    await page.screenshot({
      path: `evidence/browser-comments-20261110/preview-top-${viewport.width}x${viewport.height}.png`,
    });
    const before = (await dialog.locator('.preview-bottom').boundingBox())!.y;
    const rect = (await dialog.boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.wheel(0, 240);
    await expect
      .poll(() => dialog.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(100);
    const scrolled = await dialog.evaluate((el) => el.scrollTop);
    const after = (await dialog.locator('.preview-bottom').boundingBox())!.y;
    expect(before - after).toBeCloseTo(scrolled, 0);
    expect(
      await dialog.locator('.preview-reading').evaluate((el) => el.scrollTop),
    ).toBe(0);
    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(select).toBeInViewport();
    await expect(back).toBeInViewport();
    const selectBox = (await select.boundingBox())!,
      backBox = (await back.boundingBox())!;
    expect(backBox.y).toBeGreaterThanOrEqual(selectBox.y + selectBox.height);
    await page.screenshot({
      path: `evidence/browser-comments-20261110/preview-bottom-${viewport.width}x${viewport.height}.png`,
    });
    await back.click();
    await expect(dialog).toHaveCount(0);
    await expect(opener(page)).toBeFocused();
    await expect(page.getByTestId('quote')).toHaveAttribute(
      'data-quote-id',
      quoteId!,
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), savedKey),
    ).toBeNull();
  });
}

test('preview title focus, keyboard wrap, Escape, backdrop and bottom selection remain functional', async ({
  page,
}) => {
  await page.setViewportSize({ width: 665, height: 604 });
  const quoteId = await page.getByTestId('quote').getAttribute('data-quote-id');
  await opener(page).focus();
  await page.keyboard.press('Enter');
  const dialog = preview(page);
  await expect(dialog.locator('#preview-title')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'กลับไปดูการ์ด')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.locator('.source-details summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'กลับไปดูการ์ด')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener(page)).toBeFocused();
  await opener(page).click();
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThan(10);
  await page.mouse.click(bounds.x / 2, 20);
  await expect(dialog).toHaveCount(0);
  await expect(opener(page)).toBeFocused();
  await opener(page).click();
  await dialog.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await button(page, 'เลือกข้อความนี้').click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เราเลือก', exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId('quote')).toHaveAttribute(
    'data-quote-id',
    quoteId!,
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), savedKey),
  ).toBeNull();
});
