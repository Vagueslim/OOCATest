import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runner = new URL('./live-check-runner.mjs', import.meta.url).href;
const execute = (body: string) =>
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import {runLiveCheck} from ${JSON.stringify(runner)};\n${body}`,
    ],
    { encoding: 'utf8', timeout: 25000 },
  );
const report = async (directory: string) =>
  JSON.parse(await readFile(join(directory, 'results.json'), 'utf8'));

test('live checker: a failed assertion replaces stale success evidence and exits nonzero', async ({}, info) => {
  const out = info.outputPath('failed-check');
  await mkdir(out, { recursive: true });
  await writeFile(
    join(out, 'results.json'),
    JSON.stringify({ passed: true, error: null }),
  );
  const child =
    execute(`process.argv[2]='https://live-check.invalid/';process.argv[3]=${JSON.stringify(out)};
 await runLiveCheck('controlled-failure',async({page})=>{await page.setContent('<h1>Controlled fixture</h1>');throw new Error('deliberate assertion failure');});`);
  expect(child.error).toBeUndefined();
  expect(child.status, child.stderr).toBe(1);
  const result = await report(out);
  expect(result.passed).toBe(false);
  expect(result.error).toContain('deliberate assertion failure');
  expect(result.limitations.join(' ')).toContain('isolated browser context');
  expect(result.limitations.join(' ')).toContain('not exercised');
  expect(result.limitations.join(' ')).toContain(
    'does not prove the deployed revision',
  );
  expect(result.browserVersion).toBeTruthy();
  expect(result.nodeVersion).toBe(process.version);
  expect(Number.isFinite(Date.parse(result.startedAt))).toBe(true);
  expect(Number.isFinite(Date.parse(result.finishedAt))).toBe(true);
  expect((await readFile(join(out, 'failure.png'))).length).toBeGreaterThan(0);
});

test('live checker: consecutive checks start with isolated browser storage', async ({}, info) => {
  const first = info.outputPath('first-check'),
    second = info.outputPath('second-check');
  const child = execute(`import assert from 'node:assert/strict';
 process.argv[2]='https://live-check.invalid/';
 async function open(page){await page.route('https://live-check.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Local fixture</h1>'}));await page.goto(process.argv[2]);}
 process.argv[3]=${JSON.stringify(first)};
 await runLiveCheck('first-check',async({page,result})=>{await open(page);await page.evaluate(()=>localStorage.setItem('private','first context only'));result.checks.push('Saved test data in isolated context');});
 process.argv[3]=${JSON.stringify(second)};
 await runLiveCheck('second-check',async({page,result})=>{await open(page);assert.equal(await page.evaluate(()=>localStorage.getItem('private')),null);result.checks.push('A new check cannot read prior context data');});`);
  expect(child.error).toBeUndefined();
  expect(child.status, child.stderr).toBe(0);
  expect((await report(first)).passed).toBe(true);
  expect((await report(second)).passed).toBe(true);
});

test('live checker: invalid target writes an explicit failed report before browser launch', async ({}, info) => {
  const out = info.outputPath('invalid-target');
  const child = execute(
    `process.argv[2]='not-a-url';process.argv[3]=${JSON.stringify(out)};await runLiveCheck('invalid-target',async()=>{throw new Error('Should not navigate');});`,
  );
  expect(child.error).toBeUndefined();
  expect(child.status, child.stderr).toBe(1);
  const result = await report(out);
  expect(result.passed).toBe(false);
  expect(result.error).toContain('Invalid URL');
  expect(result.browserVersion).toBeNull();
  expect(result.limitations.join(' ')).toContain(
    'local checker/catalog checkout',
  );
});
