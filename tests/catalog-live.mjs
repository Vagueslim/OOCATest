import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { isMain, runLiveCheck } from './live-check-runner.mjs';

const key = 'ooca-demo:saved-quotes:v1';
const draftLabel = 'ข้อความไทยเรียบเรียง · ร่างยังไม่ตรวจ';

// The stored snapshot contract is independent of the application formatter.
function expectedSnapshot(quote) {
  const lines = [quote.headword];
  const pronunciation = [];
  if (quote.reading) pronunciation.push(`/ ${quote.reading} /`);
  if (quote.partOfSpeech) pronunciation.push(quote.partOfSpeech);
  if (pronunciation.length) lines.push(pronunciation.join(' '));
  lines.push(draftLabel, quote.text);
  return lines.join('\n');
}

export async function checkCatalogLive({ page, result, out, url }) {
  result.integrationScope =
    'Local catalog compared with the target URL in isolated browser storage; Google Calendar and native share are not invoked. Only the actual visible-card count is exercised.';
  const raw = await readFile(
    new URL('../src/catalog.json', import.meta.url),
    'utf8',
  );
  const catalog = JSON.parse(raw);
  // Absent status remains visible; zero and malformed values fail closed.
  const shown = catalog.filter(
    (quote) => quote.status === undefined || quote.status === 1,
  );
  const byId = new Map(shown.map((quote) => [quote.id, quote]));
  assert.equal(
    new Set(catalog.map((quote) => quote.id)).size,
    catalog.length,
    'Catalog IDs must remain unique',
  );
  result.catalog = {
    total: catalog.length,
    visible: shown.length,
    sha256: createHash('sha256').update(raw).digest('hex'),
    seenIds: [],
    displayWhitespaceNormalizedIds: shown
      .filter((quote) => / {2,}/.test(quote.text))
      .map((quote) => quote.id),
  };
  const checks = result.checks;
  const button = (name) => page.getByRole('button', { name, exact: true });
  const active = () => page.locator('.quote-swiper [data-testid="quote"]');
  const read = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)).entries, key);
  const start = async () => {
    await button('เปิดอ่าน').click();
    await expect(page.locator('.screen-discover')).toBeVisible();
  };
  const skip = async () => {
    await button('วันนี้ยังไม่เลือก').click();
    await expect(
      page.getByRole('heading', { name: 'วันนี้ยังไม่เลือก', exact: true }),
    ).toBeVisible();
    await expect(button('กลับไปหน้าแรก')).toBeVisible();
  };
  const home = async () => {
    await button('กลับไปหน้าแรก').click();
    await expect(button('เปิดอ่าน')).toBeVisible();
  };
  const next = async () => {
    const previous = await active().getAttribute('data-quote-id');
    await button('เปลี่ยนข้อความ').click();
    await expect(active()).not.toHaveAttribute('data-quote-id', previous);
  };
  // Use a repeatable deck in this isolated context without changing catalog data.
  await page.addInitScript(() => {
    Math.random = () => 0.99999;
  });
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'Live page must return HTTP 200');
  await page.evaluate(() => document.fonts.ready);
  assert(
    await page.evaluate(() => document.fonts.check('16px Prompt')),
    'Prompt must load',
  );
  const legacy = {
    id: 'legacy-live-check',
    quoteId: 'self-rest',
    quoteText: 'วันนี้ขอพักก่อน',
    focus: null,
    savedAt: '2025-01-01T00:00:00Z',
    localDay: '2025-01-01',
  };
  // These records belong only to the runner's fresh browser context.
  await page.evaluate(
    ({ key, legacy }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, entries: [legacy] }),
      ),
    { key, legacy },
  );
  await start();

  if (shown.length === 0) {
    await expect(page.locator('.catalog-empty')).toBeVisible();
    await expect(active()).toHaveCount(0);
    await home();
    await button('ดูย้อนหลัง').click();
    await page.getByRole('combobox').selectOption('2025-01');
    assert.equal(
      await page.locator('.history-snapshot').textContent(),
      legacy.quoteText,
    );
    assert.deepEqual(await read(), [legacy]);
    checks.push(
      'No visible catalog cards: recoverable empty state preserves legacy history',
    );
    return;
  }

  const seen = [];
  const screenshotTypes = new Set();
  for (let index = 0; index < shown.length; index++) {
    const card = active();
    const id = await card.getAttribute('data-quote-id');
    const quote = byId.get(id);
    assert(
      quote,
      `Visible live catalog ID ${id} must exist and be shown in the local catalog`,
    );
    assert(
      !seen.includes(id),
      `First deck must not repeat ${id} before covering every visible card`,
    );
    // innerText reflects CSS capitalization; persisted/source text must keep original casing.
    assert.equal(
      await card.locator('.quote-headword').textContent(),
      quote.headword,
      `${id}: raw headword`,
    );
    // The current card display collapses repeated ASCII spaces; saved snapshots below remain exact.
    assert.equal(
      await card.locator('.quote-thai').textContent(),
      quote.text.replace(/ {2,}/g, ' '),
      `${id}: Thai card text (display spacing)`,
    );
    const reading = [
      quote.reading ? `/ ${quote.reading} /` : null,
      quote.partOfSpeech,
    ]
      .filter(Boolean)
      .join(' ');
    if (reading)
      assert.equal(
        await card.locator('.quote-reading').textContent(),
        reading,
        `${id}: reading and part of speech`,
      );
    else await expect(card.locator('.quote-reading')).toHaveCount(0);
    await card
      .getByRole('button', {
        name: `ขยายข้อความ ${quote.headword}`,
        exact: true,
      })
      .click();
    const preview = page.getByRole('dialog');
    const source = preview.locator('.source-details');
    assert.equal(
      await source.getAttribute('open'),
      null,
      `${id}: source disclosure starts collapsed`,
    );
    await source.locator('summary').click();
    await expect(source.locator('.source-text')).toBeVisible();
    assert.equal(
      await source.locator('.source-text').textContent(),
      quote.original,
      `${id}: original source text`,
    );
    assert.equal(
      await source.locator('.quote-status').textContent(),
      draftLabel,
      `${id}: draft label`,
    );
    assert.equal(
      await source.locator(':scope > p').nth(1).textContent(),
      `คำแปลไทย (ร่าง): ${quote.translation}`,
      `${id}: draft translation`,
    );
    if (quote.reading)
      assert.equal(
        await source.locator('.reading-status').textContent(),
        `${quote.readingKind} · ยังต้องตรวจเสียงอ่าน`,
        `${id}: draft reading label`,
      );
    else await expect(source.locator('.reading-status')).toHaveCount(0);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${id}: mobile document must not overflow`,
    );
    await button('กลับไปดูการ์ด').click();
    await expect(preview).toHaveCount(0);
    if (!screenshotTypes.has(quote.type)) {
      await page.screenshot({
        path: join(
          out,
          quote.type === 'sentence' ? 'mobile-sentence.png' : 'mobile-word.png',
        ),
        fullPage: true,
      });
      screenshotTypes.add(quote.type);
    }
    seen.push(id);
    result.catalog.seenIds = [...seen];
    if (index < shown.length - 1) await next();
  }
  assert.deepEqual([...seen].sort(), shown.map((quote) => quote.id).sort());
  assert.deepEqual(
    await read(),
    [legacy],
    'Reading, expansion and navigation must not save selections',
  );
  checks.push(
    `${shown.length} visible catalog cards match exact IDs/raw headwords/readings/source/draft labels; Thai display text matches catalog with repeated ASCII spaces collapsed`,
  );
  checks.push(
    'Every source disclosure starts collapsed; mobile layout and Prompt font verified',
  );
  if (shown.length > 1) {
    const last = seen.at(-1);
    await next();
    const seam = await active().getAttribute('data-quote-id');
    assert(
      byId.has(seam),
      'Replenished deck must contain a visible catalog ID',
    );
    assert.notEqual(seam, last, 'Deck seam must not repeat the last card');
    await button('ข้อความก่อนหน้า').click();
    await expect(active()).toHaveAttribute('data-quote-id', last);
    await next();
    assert.equal(
      await active().getAttribute('data-quote-id'),
      seam,
      'Backtracking must preserve the existing timeline',
    );
    checks.push(
      'Complete first deck, nonrepeating seam and previous/next timeline preserved',
    );
  } else {
    await expect(button('ข้อความก่อนหน้า')).toBeDisabled();
    await expect(button('เปลี่ยนข้อความ')).toBeDisabled();
    checks.push(
      'Single visible card has disabled navigation and no undefined IDs',
    );
  }

  await skip();
  assert.deepEqual(await read(), [legacy]);
  await home();
  await start();
  await button('เลือกข้อความนี้').click();
  await button('ต่อไป').click();
  await expect(page.getByRole('textbox')).toBeEmpty();
  await skip();
  assert.deepEqual(await read(), [legacy]);
  await page.screenshot({
    path: join(out, 'mobile-no-selection.png'),
    fullPage: true,
  });
  await home();
  checks.push(
    'Skip before selection and after optional reflection/writing preserve existing history',
  );

  await start();
  // Exercise the lowercase family regression when available; any visible card is valid otherwise.
  const selected =
    shown.find((quote) => quote.headword === 'family') ?? shown[0];
  for (
    let index = 0;
    index < shown.length &&
    (await active().getAttribute('data-quote-id')) !== selected.id;
    index++
  )
    await next();
  await expect(active()).toHaveAttribute('data-quote-id', selected.id);
  await button('เลือกข้อความนี้').click();
  await page.getByRole('radio', { name: 'คนอื่น', exact: true }).check();
  await page.screenshot({
    path: join(out, 'mobile-reflect.png'),
    fullPage: true,
  });
  await button('ต่อไป').click();
  const privateDraft = 'PRIVATE LIVE CHECK — NEVER PERSIST';
  await page.getByRole('textbox').fill(privateDraft);
  await button('เลือกข้อความนี้').click();
  await expect(page.locator('.screen-discover')).toBeVisible();
  await expect(page.locator('.saved-main-status')).toHaveText('เก็บคำไว้แล้ว');
  const saved = await read();
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[0], legacy);
  assert.equal(saved[1].quoteId, selected.id);
  assert.equal(saved[1].quoteText, expectedSnapshot(selected));
  assert.equal(saved[1].focus, 'other');
  assert.deepEqual(
    Object.keys(saved[1]).sort(),
    ['focus', 'id', 'localDay', 'quoteId', 'quoteText', 'savedAt'].sort(),
  );
  assert(
    !JSON.stringify(saved).includes(privateDraft),
    'Private writing must never enter stored entries',
  );
  result.savedSnapshot = {
    quoteId: selected.id,
    headword: selected.headword,
    focus: saved[1].focus,
  };
  // Saving ends the selection and clears its draft; the deck remains available.
  await button('เลือกข้อความนี้').click();
  await button('ต่อไป').click();
  await expect(page.getByRole('textbox')).toBeEmpty();
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await read(), saved);
  checks.push(
    'Write→save returns to Discover; exact raw-case snapshot + focus saved, private draft excluded and cleared; reload preserves legacy/new entries',
  );

  await button('ดูย้อนหลัง').click();
  const month = page.getByRole('combobox');
  await month.selectOption('2025-01');
  assert.equal(
    await page.locator('.history-snapshot').textContent(),
    legacy.quoteText,
  );
  await page.locator('.history-entry-details>summary').click();
  assert.equal(
    await page.locator('.history-saved-text').textContent(),
    legacy.quoteText,
  );
  await month.selectOption(saved[1].localDay.slice(0, 7));
  await page.locator('.history-entry-details>summary').click();
  assert.equal(
    await page.locator('.history-saved-text').textContent(),
    expectedSnapshot(selected),
  );
  await button('ลบข้อความ').click();
  assert.deepEqual(
    await read(),
    saved,
    'Delete prompt alone must not mutate history',
  );
  await button('ยกเลิก').click();
  assert.deepEqual(await read(), saved);
  await button('ลบข้อความ').click();
  await button('ยืนยันลบ').click();
  assert.deepEqual(await read(), [legacy]);
  await expect(page.locator('.history-empty')).toBeVisible();
  await month.selectOption('2025-01');
  assert.equal(
    await page.locator('.history-snapshot').textContent(),
    legacy.quoteText,
  );
  checks.push(
    'Legacy snapshot stays exact through reload/month filtering; deletion requires confirmation and preserves the legacy entry',
  );

  await button('กลับ').click();
  await start();
  await button('เลือกข้อความนี้').click();
  await button('ต่อไป').click();
  const failedDraft = 'PRIVATE FAILED SAVE — KEEP UNTIL EXIT';
  await page.getByRole('textbox').fill(failedDraft);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('live check blocked write', 'QuotaExceededError');
    };
  });
  await button('เลือกข้อความนี้').click();
  await expect(page.locator('.save-status')).toHaveText(
    'ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',
  );
  await expect(page.getByRole('textbox')).toHaveValue(failedDraft);
  assert.deepEqual(await read(), [legacy]);
  await expect(page.locator('.saved-main-status')).toHaveCount(0);
  await skip();
  assert.deepEqual(await read(), [legacy]);
  await home();
  await start();
  await button('เลือกข้อความนี้').click();
  await button('ต่อไป').click();
  await expect(page.getByRole('textbox')).toBeEmpty();
  assert.deepEqual(await read(), [legacy]);
  checks.push(
    'Blocked storage write keeps private draft and prior history, reports failure without false success, permits unsaved exit and clears the abandoned draft',
  );
}

if (isMain(import.meta.url))
  await runLiveCheck('catalog-live', checkCatalogLive);
