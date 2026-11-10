import assert from 'node:assert/strict';
import path from 'node:path';
import { expect } from '@playwright/test';
import { isMain, runLiveCheck } from './live-check-runner.mjs';

const minimumContrast = 4.5;
const rgb = (color) => {
  if (!/^rgba?\(/.test(color)) return null;
  const values = color.match(/[\d.]+/g)?.map(Number);
  return values &&
    (values.length === 3 || (values.length === 4 && values[3] === 1))
    ? values.slice(0, 3)
    : null;
};
const luminance = (color) =>
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

async function measure(locator, label) {
  // Wait for actual transitions; do not wait for one hard-coded theme color.
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const style = await locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    const compositing = [];
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const current = getComputedStyle(ancestor);
      if (
        Number(current.opacity) !== 1 ||
        current.filter !== 'none' ||
        current.mixBlendMode !== 'normal'
      ) {
        compositing.push({
          element: ancestor.tagName,
          opacity: current.opacity,
          filter: current.filter,
          mixBlendMode: current.mixBlendMode,
        });
      }
    }
    return {
      foreground: computed.color,
      background: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      compositing,
    };
  });
  const foreground = rgb(style.foreground),
    background = rgb(style.background);
  const reasons = [];
  if (!foreground || !background)
    reasons.push(
      'The text or background is transparent or uses an unsupported color format.',
    );
  if (style.backgroundImage !== 'none')
    reasons.push(
      'The element has a gradient/image background; no per-pixel background measurement was made.',
    );
  if (style.compositing.length)
    reasons.push(
      'Element or ancestor opacity/filter/blend requires additional compositing measurement.',
    );
  if (reasons.length)
    return {
      label,
      ...style,
      status: 'not-assessed',
      reason: reasons.join(' '),
    };
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => a - b,
  );
  const ratio = (values[1] + 0.05) / (values[0] + 0.05);
  return {
    label,
    ...style,
    ratio,
    minimumContrast,
    status: ratio >= minimumContrast ? 'passed' : 'failed',
  };
}

async function openScreen(page, url, screen) {
  await page.goto(url);
  await page.getByRole('button', { name: 'เปิดอ่าน', exact: true }).click();
  await expect(page.getByTestId('quote')).toBeVisible();
  // Let the deck's artwork finish before this checker changes screens or reloads.
  // Otherwise a fast audit can cancel its own pending image requests on a live host.
  await page
    .locator('.quote-deck img')
    .evaluateAll((images) =>
      Promise.all(images.map((image) => image.decode())),
    );
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

export async function checkContrast({ page, result, out, url }) {
  result.scope = {
    assessed:
      'Opaque normal-size primary CTA text in Discover, Preview, Reflect and Write: default, keyboard focus and hover at 360/1440px; selected reflection radio text.',
    limitation:
      'This samples text contrast and keyboard focus activation only; it is not a complete WCAG audit. Welcome has a gradient and is outside this solid-color measurement. Disabled controls, focus-ring contrast and all other text are outside scope.',
    minimumContrast,
  };
  result.measurements = [];
  const capture = async (locator, label) => {
    const sample = await measure(locator, label);
    result.measurements.push(sample);
    result.checks.push({
      name: label,
      status: sample.status,
      passed: sample.status === 'passed',
    });
  };
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const screen of ['discover', 'preview', 'reflect', 'write']) {
      const button = await openScreen(page, url, screen);
      await page.evaluate(() => document.fonts.ready);
      await button.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await capture(button, `${screen} ${width}px default`);
      if (screen === 'discover')
        await page.screenshot({
          path: path.join(out, `discover-${width}.png`),
          fullPage: true,
        });
      await button.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      assert.equal(
        await button.evaluate((element) => element.matches(':focus-visible')),
        true,
        `${screen} ${width}px: keyboard focus is visible`,
      );
      result.checks.push({
        name: `${screen} ${width}px keyboard focus activation`,
        passed: true,
      });
      await capture(button, `${screen} ${width}px keyboard focus`);
      await button.hover();
      await capture(button, `${screen} ${width}px hover`);
      if (screen === 'reflect') {
        const selected = page.locator('.choices input:checked+span');
        await expect(selected).toBeVisible();
        await capture(selected, `selected reflection radio ${width}px`);
      }
    }
  }
  result.fontLoaded = await page.evaluate(() =>
    document.fonts.check('16px Prompt'),
  );
  const failures = result.measurements.filter(
    (sample) => sample.status !== 'passed',
  );
  assert.equal(
    failures.length,
    0,
    failures
      .map(
        (sample) =>
          `${sample.label}: ${sample.ratio?.toFixed(2) ?? sample.status}${sample.reason ? ' — ' + sample.reason : ''}`,
      )
      .join('\n'),
  );
}

if (isMain(import.meta.url)) await runLiveCheck('contrast', checkContrast);
