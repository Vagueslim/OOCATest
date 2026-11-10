import { test, expect, type Locator, type Page } from '@playwright/test';

type Screen = 'discover' | 'preview' | 'reflect' | 'write';

// These labels are normal-size text. WCAG 2.2 SC 1.4.3 requires at least 4.5:1.
// Measure the rendered colors, so changes to tokens or the CSS cascade are covered.
async function contrast(button: Locator) {
  await button.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      foreground: computed.color,
      background: computed.backgroundColor,
      image: computed.backgroundImage,
      opacity: computed.opacity,
    };
  });
  const channels = (color: string) => {
    const values = color.match(/[\d.]+/g)!.map(Number);
    expect(
      values.length === 3 || values[3] === 1,
      'Contrast measurement requires an opaque color',
    ).toBe(true);
    return values.slice(0, 3);
  };
  expect(style.image, 'A gradient needs a per-stop contrast measurement').toBe(
    'none',
  );
  expect(
    Number(style.opacity),
    'Contrast measurement requires an opaque button',
  ).toBe(1);
  const luminance = (color: number[]) =>
    color
      .map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  const values = [
    luminance(channels(style.foreground)),
    luminance(channels(style.background)),
  ].sort((a, b) => a - b);
  return { ...style, ratio: (values[1] + 0.05) / (values[0] + 0.05) };
}

async function openScreen(page: Page, screen: Screen) {
  await page.goto('/');
  await page.getByRole('button', { name: 'เปิดอ่าน', exact: true }).click();
  if (screen === 'preview') {
    await page.getByRole('button', { name: /^ขยายข้อความ / }).click();
    return page
      .getByRole('dialog')
      .getByRole('button', { name: 'เลือกข้อความนี้', exact: true });
  }
  if (screen === 'reflect' || screen === 'write')
    await page
      .getByRole('button', { name: 'เลือกข้อความนี้', exact: true })
      .click();
  if (screen === 'write')
    await page.getByRole('button', { name: 'ต่อไป', exact: true }).click();
  return page.getByRole('button', {
    name: screen === 'reflect' ? 'ต่อไป' : 'เลือกข้อความนี้',
    exact: true,
  });
}

test.use({ reducedMotion: 'reduce' });
for (const width of [360, 1440])
  for (const screen of ['discover', 'preview', 'reflect', 'write'] as const) {
    test(`Primary CTA text remains readable in default, keyboard focus and hover: ${screen} at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const button = await openScreen(page, screen);
      await page.evaluate(() => document.fonts.ready);
      await button.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const samples: Array<
        Awaited<ReturnType<typeof contrast>> & { state: string }
      > = [];
      const check = async (state: string) => {
        const sample = await contrast(button);
        samples.push({ state, ...sample });
        expect
          .soft(
            sample.ratio,
            `${screen} ${state}: ${sample.foreground} on ${sample.background}`,
          )
          .toBeGreaterThanOrEqual(4.5);
      };
      await check('default');
      await button.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      expect(
        await button.evaluate((element) => element.matches(':focus-visible')),
      ).toBe(true);
      await check('keyboard focus');
      await button.hover();
      await check('hover');
      await testInfo.attach('rendered-button-contrast', {
        body: JSON.stringify(samples, null, 2),
        contentType: 'application/json',
      });
    });
  }
