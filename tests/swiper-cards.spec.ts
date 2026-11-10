import { test, expect, type Page } from '@playwright/test';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const active = (page: Page) => page.getByTestId('quote');
const id = (page: Page) => active(page).getAttribute('data-quote-id');
const settled = (page: Page) =>
  expect
    .poll(() =>
      page.locator('.quote-swiper').evaluate((el: any) => el.swiper.animating),
    )
    .toBe(false);
test.beforeEach(async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL || '/');
  await expect(page).toHaveTitle('Pick a word!');
  await expect(
    page.getByRole('heading', { name: 'ค่อย ๆ อยู่กับคำหนึ่งคำ', exact: true }),
  ).toBeVisible();
  await button(page, 'เปิดอ่าน').click();
});

test('cards: desktop mouse drag, button animation, active accessibility and explicit source reading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const first = await id(page);
  await expect(page.locator('.quote-swiper')).toBeVisible();
  await expect(page.locator('.swiper-slide:not([inert])')).toHaveCount(1);
  await button(page, 'เปลี่ยนข้อความ').click();
  const second = await id(page);
  expect(second).not.toBe(first);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page
      .locator('.quote-swiper .swiper-slide-active')
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeGreaterThan(0);
  await settled(page);
  await button(page, 'ข้อความก่อนหน้า').click();
  await settled(page);
  expect(await id(page)).toBe(first);
  const heading = active(page).locator('.quote-headword');
  await heading.scrollIntoViewIfNeeded();
  const box = (await heading.boundingBox())!;
  await page.mouse.move(box.x + box.width - 15, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 15, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await settled(page);
  expect(await id(page)).toBe(second);
  await expect(active(page).locator('.source-details')).not.toBeVisible();
  await page.getByRole('button', { name: /^ขยายข้อความ/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const details = page.getByRole('dialog').locator('details');
  await expect(details).not.toHaveAttribute('open', '');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await button(page, 'กลับไปดูการ์ด').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(active(page)).toBeVisible();
  expect(await id(page)).toBe(second);
  expect(
    await page.evaluate(() =>
      localStorage.getItem('ooca-demo:saved-quotes:v1'),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'evidence/swipe-restore-20261110/swiper-cards-desktop.png',
    fullPage: true,
  });
});

test('cards: narrow and large phones show the active card and two stacked previews without page overflow', async ({
  page,
}) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await settled(page);
    const geometry = await page.locator('.quote-swiper').evaluate((el) => {
      const viewport = el.getBoundingClientRect();
      const slides = Array.from(el.querySelectorAll('.swiper-slide')).map(
        (slide) => ({
          active: slide.classList.contains('swiper-slide-active'),
          opacity: Number(getComputedStyle(slide).opacity),
          rect: slide.getBoundingClientRect(),
        }),
      );
      const visible = slides.filter(
        (slide) =>
          slide.opacity > 0 &&
          Math.min(slide.rect.right, viewport.right) -
            Math.max(slide.rect.left, viewport.left) >
            1,
      );
      return {
        left: viewport.left,
        right: viewport.right,
        visible: visible.map((slide) => ({
          active: slide.active,
          x: slide.rect.x,
          right: slide.rect.right,
        })),
        overflow: getComputedStyle(el).overflowX,
      };
    });
    expect(geometry.visible.map((slide) => slide.active)).toEqual([
      true,
      false,
      false,
    ]);
    expect(geometry.overflow).toBe('visible');
    expect(geometry.visible[1].x).toBeGreaterThan(geometry.visible[0].x);
    expect(geometry.visible[2].x).toBeGreaterThan(geometry.visible[1].x);
    expect(geometry.visible[1].x).toBeLessThan(geometry.visible[0].right);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'evidence/swipe-restore-20261110/swiper-cards-' + width + '.png',
      fullPage: true,
    });
  }
});

test('cards: selection during movement uses the visible current card, and a new round resets browsing', async ({
  page,
}) => {
  const first = await id(page);
  await button(page, 'เปลี่ยนข้อความ').click();
  const selected = await id(page);
  expect(selected).not.toBe(first);
  await button(page, 'เลือกข้อความนี้').click();
  expect(await id(page)).toBe(selected);
  await expect(page.locator('.quote-swiper')).toHaveCount(0);
  await button(page, 'วันนี้ยังไม่เลือก').click();
  await button(page, 'กลับไปหน้าแรก').click();
  await button(page, 'เปิดอ่าน').click();
  await expect(button(page, 'ข้อความก่อนหน้า')).toBeDisabled();
  await expect(page.locator('.swiper-slide-active')).toHaveAttribute(
    'data-deck-index',
    '0',
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('ooca-demo:saved-quotes:v1'),
    ),
  ).toBeNull();
});

test('cards: reduced motion keeps browsing without animated transitions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page
        .locator('.quote-swiper')
        .evaluate((el: any) => el.swiper.params.speed),
    )
    .toBe(0);
  const first = await id(page);
  await button(page, 'เปลี่ยนข้อความ').click();
  expect(await id(page)).not.toBe(first);
  expect(
    await page
      .locator('.quote-swiper .swiper-wrapper')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  await button(page, 'ข้อความก่อนหน้า').click();
  expect(await id(page)).toBe(first);
});
