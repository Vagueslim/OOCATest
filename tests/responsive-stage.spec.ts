import {test, expect} from '@playwright/test';

for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  test(`responsive stage stays centered at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.goto('/');
    const checkStage = async () => {
      const box = await page.locator('main').boundingBox();
      expect(box!.width).toBeCloseTo(Math.min(width, 1024), 0);
      expect(box!.x).toBeCloseTo((width - Math.min(width, 1024)) / 2, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('sky');
    };
    await checkStage();
    await page.screenshot({path: `evidence/figma-20261110/stage-welcome-${width}.png`, fullPage: true});
    await page.locator('.welcome-start').click();
    await checkStage();
    const header = page.locator('.app-header');
    await expect(header.locator('.app-wordmark')).toHaveText('Pick a word!');
    await expect(header.getByRole('button',{name:'ดูย้อนหลัง',exact:true})).toBeVisible();
    await expect(header.locator('.journey-mark, .brand-dot')).toHaveCount(0);
    const headerStyle = await header.evaluate(el => {
      const style = getComputedStyle(el);
      return {background: style.backgroundColor, radius: parseFloat(style.borderRadius)};
    });
    expect(headerStyle.background).toBe('rgb(255, 255, 255)');
    expect(headerStyle.radius).toBeGreaterThanOrEqual(20);
    const card = page.getByTestId('quote');
    await expect(card).toBeVisible();
    await page.screenshot({path: `evidence/figma-20261110/stage-discover-${width}.png`, fullPage: true});
    await page.locator('.card-expand-control').first().click();
    const dialog = page.locator('.quote-preview');
    await expect(dialog).toHaveAttribute('data-phase', 'open');
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.width).toBeCloseTo(width < 700 ? width : Math.min(width - 48, 760), 0);
    await page.screenshot({path: `evidence/figma-20261110/stage-expanded-${width}.png`});
    await page.locator('.preview-back').click();
    await expect(dialog).toHaveCount(0);
    await expect(card).toBeVisible();
  });
}
