import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const isMain = (moduleUrl) =>
  !!process.argv[1] &&
  moduleUrl === pathToFileURL(resolve(process.argv[1])).href;

// Fresh contexts never share a person's browser/profile. The commit below identifies
// the local checker/catalog; it is not evidence of the deployed site's revision.
export async function runLiveCheck(name, check) {
  const url = process.argv[2],
    out = resolve(process.argv[3] || `evidence/live-verification/${name}`);
  const result = {
    name,
    url,
    startedAt: new Date().toISOString(),
    sourceCheckoutCommit: null,
    sourceHasChanges: null,
    nodeVersion: process.version,
    browserVersion: null,
    viewport: { width: 360, height: 800 },
    checks: [],
    runtimeErrors: [],
    failedRequests: [],
    assets: [],
    passed: false,
  };
  result.limitations = [
    'Checks use an isolated browser context, never the user browser or its saved history.',
    'Google Calendar OAuth/event creation and native share are not exercised by these checks.',
    'sourceCheckoutCommit identifies the local checker/catalog checkout; it does not prove the deployed revision.',
    'Only the recorded checks are covered; this is not a complete product or accessibility audit.',
  ];
  let browser, page;
  await mkdir(out, { recursive: true });
  try {
    try {
      const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
      result.sourceCheckoutCommit = execFileSync(
        'git',
        ['rev-parse', 'HEAD'],
        options,
      ).trim();
      result.sourceHasChanges = !!execFileSync(
        'git',
        ['status', '--porcelain'],
        options,
      ).trim();
    } catch {}
    assert(url, `Usage: node tests/${name}.mjs <site-url> [output-directory]`);
    assert(
      ['http:', 'https:'].includes(new URL(url).protocol),
      'Use an HTTP(S) site URL',
    );
    browser = await chromium.launch();
    result.browserVersion = browser.version();
    const context = await browser.newContext({
      viewport: result.viewport,
      reducedMotion: 'reduce',
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror', (error) => result.runtimeErrors.push(error.message));
    page.on('requestfailed', (request) =>
      result.failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText,
      }),
    );
    page.on('response', (response) => {
      if (/\.(?:js|css|png|svg|ttf|woff2?)(?:\?|$)/.test(response.url()))
        result.assets.push({ url: response.url(), status: response.status() });
    });
    await check({ page, context, browser, result, out, url });
    assert.deepEqual(result.runtimeErrors, [], 'No browser runtime errors');
    assert.deepEqual(result.failedRequests, [], 'No failed network requests');
    assert(
      result.assets.every((asset) => [200, 304].includes(asset.status)),
      'Static resources return successful responses',
    );
    result.passed = true;
  } catch (error) {
    result.error = error.stack || String(error);
    process.exitCode = 1;
    if (page)
      await page
        .screenshot({
          path: resolve(out, 'failure.png'),
          fullPage: true,
          timeout: 5000,
        })
        .catch(() => {});
  } finally {
    if (browser)
      await browser.close().catch((error) => {
        result.passed = false;
        result.closeError = String(error);
        process.exitCode = 1;
      });
    result.finishedAt = new Date().toISOString();
    await writeFile(
      resolve(out, 'results.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(
      JSON.stringify(
        {
          name,
          passed: result.passed,
          checks: result.checks.length,
          report: resolve(out, 'results.json'),
          error: result.error,
        },
        null,
        2,
      ),
    );
  }
  return result;
}
