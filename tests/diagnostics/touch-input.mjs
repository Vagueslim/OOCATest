// Native-control comparison: no React, no app handlers, no gesture suppression.
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const results = [];
for (const method of ['raw', 'browser'])
  for (let run = 0; run < 3; run++) {
    const page = await browser.newPage({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 360, height: 800 },
    });
    await page.setContent(
      '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:24px}h2{margin-top:350px;height:100px;touch-action:pan-y}details{margin-top:250px}summary{height:48px}footer{height:600px}</style><h2>Winner</h2><details><summary>Original and translation</summary><p>Native content</p></details><footer></footer>',
    );
    const c = await page.context().newCDPSession(page),
      b = await page.locator('h2').boundingBox(),
      x = b.x + b.width - 15,
      y = b.y + 45;
    if (method === 'raw') {
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 6; i++) {
        await c.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x - (25 * i) / 6, y }],
        });
        await page.waitForTimeout(20);
      }
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await page.waitForTimeout(150);
    } else
      await c.send('Input.synthesizeScrollGesture', {
        x,
        y,
        xDistance: -25,
        yDistance: 0,
        gestureSourceType: 'touch',
        speed: 500,
        preventFling: true,
      });
    await page.evaluate(() => {
      window.observed = [];
      for (const type of [
        'pointerdown',
        'pointerup',
        'touchstart',
        'touchend',
        'click',
      ])
        document.addEventListener(
          type,
          (e) =>
            window.observed.push({
              type,
              target: e.target.tagName,
              defaultPrevented: e.defaultPrevented,
            }),
          true,
        );
    });
    await page.locator('summary').tap();
    await page.waitForTimeout(350);
    results.push({
      method,
      run,
      opened: await page.locator('details').evaluate((e) => e.open),
      events: await page.evaluate(() => window.observed),
    });
    await page.close();
  }
await mkdir('evidence', { recursive: true });
const result = {
  browser: browser.version(),
  checkedAt: new Date().toISOString(),
  results,
};
await writeFile(
  'evidence/touch-diagnosis.json',
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (results.some((r) => r.method === 'browser' && !r.opened))
  process.exitCode = 1;
