import { test, expect, type Page } from '@playwright/test';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const active = (page: Page) => page.getByTestId('quote');
const id = (page: Page) => active(page).getAttribute('data-quote-id');
const preview = (page: Page) =>
  page.getByRole('dialog', { name: 'อ่านข้อความเต็ม' });
const open = (page: Page) => page.getByRole('button', { name: /^ขยายข้อความ/ });
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach('focus-diagnostic', {
      body: JSON.stringify(
        await page.evaluate(() => ({
          activeTag: document.activeElement?.tagName,
          activeText: document.activeElement?.textContent?.slice(0, 160),
          activeClass: (document.activeElement as HTMLElement)?.className,
          documentFocused: document.hasFocus(),
          screen: document.querySelector('main')?.className,
        })),
      ),
      contentType: 'application/json',
    });
  }
});

test.beforeEach(async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL || '/');
  await button(page, 'เปิดอ่าน').click();
});

test('expand: front card grows from its position, then returns to the same card without selecting', async ({
  page,
}) => {
  const first = await id(page);
  await active(page).scrollIntoViewIfNeeded();
  const rect = (await active(page).boundingBox())!;
  // Playwright may scroll a long tap target by a pixel before pointerdown.
  // Measure the actual activation position, not the earlier auto-scroll setup.
  await page.evaluate(() =>
    document.addEventListener(
      'pointerdown',
      () => {
        (window as any).previewActivationScroll = scrollY;
      },
      { once: true },
    ),
  );
  // Record the real animation when created; slow CI can inspect it after it has finished.
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.matches('.quote-preview'))
        (window as any).previewAnimationDuration =
          animation.effect?.getComputedTiming().duration;
      return animation;
    };
  });
  const historyLength = await page.evaluate(() => history.length);
  await open(page).click();
  const scroll = await page.evaluate(
    () => (window as any).previewActivationScroll as number,
  );
  await expect(preview(page)).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).previewAnimationDuration),
  ).toBeGreaterThan(0);
  await expect(preview(page)).toHaveAttribute('data-phase', 'open');
  const expanded = (await preview(page).boundingBox())!;
  expect(expanded.width).toBeGreaterThan(rect.width);
  expect(expanded.height).toBeGreaterThanOrEqual(
    page.viewportSize()!.height - 2,
  );
  await expect(preview(page).locator('.quote-card')).toHaveAttribute(
    'data-quote-id',
    first!,
  );
  await expect(preview(page).locator('.source-details')).not.toHaveAttribute(
    'open',
    '',
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('ooca-demo:saved-quotes:v1'),
    ),
  ).toBeNull();
  await page.screenshot({
    path: 'evidence/expanded-card-mobile.png',
    fullPage: false,
  });
  await button(page, 'กลับไปดูการ์ด').click();
  await expect(preview(page)).toHaveCount(0);
  expect(await id(page)).toBe(first);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await expect(open(page)).toBeFocused();
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeVisible();
});

test('expand: selection is explicit and opens the same existing reflection flow', async ({
  page,
}) => {
  await button(page, 'เปลี่ยนข้อความ').click();
  const current = await id(page);
  await open(page).click();
  await button(page, 'เลือกข้อความนี้').click();
  await expect(preview(page)).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'ข้อความที่เราเลือก' }),
  ).toBeFocused();
  expect(await id(page)).toBe(current);
  await expect(
    page.getByRole('radio', { name: 'ไม่ระบุ', exact: true }),
  ).toBeChecked();
  await expect(active(page).locator('.source-details')).not.toHaveAttribute(
    'open',
    '',
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('ooca-demo:saved-quotes:v1'),
    ),
  ).toBeNull();
  await button(page, 'ต่อไป').click();
  await button(page, 'เลือกข้อความนี้').click();
  await expect(page.locator('.screen-done')).toBeVisible();
  await expect(page.locator('.screen-done h1')).toBeFocused();
  await button(page, 'เลือกคำใหม่').click();
  await expect(page.getByRole('heading', { name: 'พบข้อความ' })).toBeFocused();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ooca-demo:saved-quotes:v1')!),
  );
  expect(saved.entries).toHaveLength(1);
  expect(saved.entries[0].quoteId).toBe(current);
  expect(await id(page)).toBe(current);
  await expect(button(page, 'ข้อความก่อนหน้า')).toBeEnabled();
  await button(page, 'ดูย้อนหลัง').click();
  await button(page, 'กลับ').click();
  expect(await id(page)).toBe(current);
});

test('expand: keyboard, focus trap, Escape, rapid repeated open and interrupted close', async ({
  page,
}) => {
  const first = await id(page);
  for (let i = 0; i < 3; i++) {
    await open(page).focus();
    await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
    await expect(preview(page)).toBeVisible();
    await expect(preview(page).locator('#preview-title')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(button(page, 'กลับไปดูการ์ด')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(preview(page)).toHaveCount(0);
    await expect(open(page)).toBeFocused();
    expect(await id(page)).toBe(first);
  }
  await button(page, 'เปลี่ยนข้อความ').click();
  expect(await id(page)).not.toBe(first);
});

test('expand: source disclosure remains independent inside the preview and layouts do not overflow', async ({
  page,
}) => {
  await expect(active(page).locator('.source-details')).not.toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await open(page).click();
    await expect(preview(page)).toHaveAttribute('data-phase', 'open');
    const disclosure = preview(page).locator('.source-details');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');
    await disclosure.locator('summary').click();
    await expect(disclosure).not.toHaveAttribute('open', '');
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(preview(page)).toBeVisible();
    const bounds = (await preview(page).boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const fit = await preview(page).evaluate(
      (el) => el.scrollWidth <= el.clientWidth,
    );
    expect(fit).toBe(true);
    await button(page, 'เลือกข้อความนี้').scrollIntoViewIfNeeded();
    await expect(button(page, 'เลือกข้อความนี้')).toBeInViewport();
    await button(page, 'กลับไปดูการ์ด').scrollIntoViewIfNeeded();
    await expect(button(page, 'กลับไปดูการ์ด')).toBeInViewport();
    if (width === 1440)
      await page.screenshot({
        path: 'evidence/expanded-card-desktop.png',
        fullPage: false,
      });
    await button(page, 'กลับไปดูการ์ด').click();
    await expect(preview(page)).toHaveCount(0);
  }
  expect(
    await page.evaluate(() =>
      localStorage.getItem('ooca-demo:saved-quotes:v1'),
    ),
  ).toBeNull();
});

test('expand: reduced motion opens and closes immediately and reload resets the preview', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page).click();
  await expect(preview(page)).toHaveAttribute('data-phase', 'open');
  expect(
    await preview(page).evaluate(
      (el) =>
        el.getAnimations().filter((a) => a.playState === 'running').length,
    ),
  ).toBe(0);
  await button(page, 'กลับไปดูการ์ด').click();
  await expect(preview(page)).toHaveCount(0);
  await open(page).click();
  await page.reload();
  await expect(preview(page)).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'ค่อย ๆ อยู่กับคำหนึ่งคำ', exact: true }),
  ).toBeVisible();
});

test.describe('touch', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test('expand: swipes and short drags never expand, stationary tap opens exactly once', async ({
    page,
  }) => {
    const first = await id(page);
    const c = await page.context().newCDPSession(page);
    async function drag(dx: number, dy = 0) {
      await active(page)
        .locator('.quote-headword')
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const b = (await active(page).locator('.quote-headword').boundingBox())!;
      const x = dx < 0 ? b.x + b.width - 15 : b.x + 15,
        y = b.y + b.height / 2;
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 6; i++) {
        await c.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (dx * i) / 6, y: y + (dy * i) / 6 }],
        });
        await page.waitForTimeout(20);
      }
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    }
    await drag(-140);
    await expect.poll(() => id(page)).not.toBe(first);
    await expect(preview(page)).toHaveCount(0);
    await drag(140);
    await expect.poll(() => id(page)).toBe(first);
    await drag(-25);
    await expect(preview(page)).toHaveCount(0);
    expect(await id(page)).toBe(first);
    await drag(0, -100);
    await expect(preview(page)).toHaveCount(0);
    await open(page).tap();
    await expect(preview(page)).toHaveAttribute('data-phase', 'open');
    await button(page, 'กลับไปดูการ์ด').tap();
    await expect(preview(page)).toHaveCount(0);
    expect(await id(page)).toBe(first);
    await open(page).tap();
    await button(page, 'เลือกข้อความนี้').tap();
    await expect(
      page.getByRole('heading', { name: 'ข้อความที่เราเลือก' }),
    ).toBeFocused();
    expect(await id(page)).toBe(first);
  });
});

test('expand: a short mouse drag is not a tap, and clicking still expands afterward', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const first = await id(page);
  await active(page).locator('.quote-headword').scrollIntoViewIfNeeded();
  const box = (await active(page).locator('.quote-headword').boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 24, y, { steps: 5 });
  await page.mouse.up();
  await expect(preview(page)).toHaveCount(0);
  expect(await id(page)).toBe(first);
  await open(page).click();
  await expect(preview(page)).toHaveAttribute('data-phase', 'open');
  await button(page, 'กลับไปดูการ์ด').click();
  await expect(preview(page)).toHaveCount(0);
  await expect(open(page)).toBeFocused();
});
