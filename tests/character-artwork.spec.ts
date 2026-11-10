import { test, expect, type Page } from '@playwright/test';
import { characters, type CharacterName } from '../src/characters';
import { characterBounds } from '../src/characterBounds';

async function gallery(page: Page) {
  await page.route('**/src/main.tsx*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
  import React from '/node_modules/.vite/deps/react.js';
  import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
  import CharacterArtwork from '/src/CharacterArtwork.tsx';
  import {characters} from '/src/characters.ts';
  import '/src/style.css';import '/src/journey.css';import '/src/stage.css';import '/src/figma.css';
  const style=document.createElement('style');
  style.textContent='.artwork-fixture{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;width:100%;max-width:none;margin:0;padding:16px}.artwork-fixture article{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px;min-width:0;border:1px solid #c7dfda;background:conic-gradient(#dce7e8 25%,#fff 0 50%,#dce7e8 0 75%,#fff 0) 0/20px 20px}.artwork-fixture h2{margin:0;padding:4px;font:14px sans-serif;background:#fff}.artwork-fixture .quote-character{align-self:center}';
  document.head.append(style);
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('main',{className:'journey-screen artwork-fixture'},Object.values(characters).map(character=>React.createElement('article',{key:character.name},React.createElement('h2',null,character.name),React.createElement(CharacterArtwork,{character})))));
 `,
    }),
  );
  await page.goto(process.env.TEST_BASE_URL || '/');
  await expect(page.locator('.quote-character')).toHaveCount(21);
  await page
    .locator('.quote-character img')
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
}

async function measurements(page: Page) {
  return page.locator('.quote-character').evaluateAll((elements) =>
    elements.map((element) => {
      const image = element.querySelector('img')!;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let xMin = canvas.width,
        yMin = canvas.height,
        xMax = -1,
        yMax = -1,
        visiblePixels = 0;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++)
          if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
            xMin = Math.min(xMin, x);
            yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x);
            yMax = Math.max(yMax, y);
            visiblePixels++;
          }
      const bounds = {
        x: xMin,
        y: yMin,
        width: xMax - xMin + 1,
        height: yMax - yMin + 1,
      };
      const slot = element.getBoundingClientRect(),
        img = image.getBoundingClientRect();
      const scaleX = img.width / image.naturalWidth,
        scaleY = img.height / image.naturalHeight;
      return {
        name: element.getAttribute('data-character-name')!,
        sourceKind: element.getAttribute('data-source-kind'),
        intrinsic: { width: image.naturalWidth, height: image.naturalHeight },
        bounds,
        visiblePixels,
        cornerAlpha: [
          pixels[3],
          pixels[(canvas.width - 1) * 4 + 3],
          pixels[(canvas.height - 1) * canvas.width * 4 + 3],
          pixels[pixels.length - 1],
        ],
        slot: { width: slot.width, height: slot.height },
        scaleX,
        scaleY,
        visible: {
          x: img.x - slot.x + bounds.x * scaleX,
          y: img.y - slot.y + bounds.y * scaleY,
          width: bounds.width * scaleX,
          height: bounds.height * scaleY,
        },
      };
    }),
  );
}

test('artwork: all 21 original assets have the recorded nontransparent pixel bounds', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await gallery(page);
  const results = await measurements(page);
  expect(results.map((result) => result.name).sort()).toEqual(
    Object.keys(characters).sort(),
  );
  for (const result of results) {
    const name = result.name as CharacterName,
      character = characters[name];
    expect(
      character.tile,
      name + ' must use its standalone artwork',
    ).toBeUndefined();
    expect(result.intrinsic, name).toEqual({
      width: character.width,
      height: character.height,
    });
    expect(result.bounds, name).toEqual(characterBounds[name]);
    expect(result.visiblePixels, name).toBeGreaterThan(1000);
    expect(result.sourceKind, name).toBe(character.sourceKind);
    const artwork = page.getByRole('img', {
      name: 'Mooca ' + name,
      exact: true,
    });
    await expect(artwork.locator('img')).toHaveAttribute('aria-hidden', 'true');
    await expect(artwork.locator('img')).toHaveAttribute('alt', '');
    if (name === 'Playful Tilt' || name === 'Back View')
      expect(
        result.cornerAlpha,
        name + ' has no opaque sheet background',
      ).toEqual([0, 0, 0, 0]);
  }
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 1440])
  test(`artwork: all 21 poses fit the shared visible-art slot at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await gallery(page);
    const results = await measurements(page);
    for (const { name, slot, scaleX, scaleY, visible } of results) {
      expect(slot, name).toEqual({ width: 166, height: 176 });
      expect(scaleX, name + ' preserves aspect ratio').toBeCloseTo(scaleY, 3);
      expect(visible.x, name).toBeGreaterThanOrEqual(-0.1);
      expect(visible.y, name).toBeGreaterThanOrEqual(-0.1);
      expect(visible.x + visible.width, name).toBeLessThanOrEqual(166.1);
      expect(
        visible.y + visible.height,
        name + ' sits on the shared baseline',
      ).toBeCloseTo(176, 1);
      expect(
        visible.x + visible.width / 2,
        name + ' is horizontally centered',
      ).toBeCloseTo(83, 1);
      expect(
        Math.max(visible.width / 166, visible.height / 176),
        name + ' fills one slot dimension',
      ).toBeCloseTo(1, 3);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1440)
      await page
        .locator('.artwork-fixture')
        .screenshot({ path: 'evidence/character-artwork-normalized.png' });
  });
