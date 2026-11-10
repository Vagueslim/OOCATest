import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {isMain,runLiveCheck} from './live-check-runner.mjs';

const key='ooca-demo:saved-quotes:v1';
const privateDraft='PRIVATE LIVE SMOKE DRAFT';

export async function checkPages({page,result,out,url}){
 result.integrationScope='Isolated browser storage only; Google Calendar and native share are not invoked.';
 const button=name=>page.getByRole('button',{name,exact:true});
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"version":1,"entries":[]}'),key);
 const welcome=async()=>{await expect(button('เปิดอ่าน')).toBeVisible();await expect(page).toHaveTitle('Pick a word!');};
 const start=async()=>{await button('เปิดอ่าน').click();await expect(page.locator('.screen-discover')).toBeVisible();};
 const skip=async()=>{await button('วันนี้ยังไม่เลือก').click();await expect(page.getByRole('heading',{name:'วันนี้ยังไม่เลือก',exact:true})).toBeFocused();};
 const response=await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(response.status(),200);await welcome();await page.evaluate(()=>document.fonts.ready);
 assert(await page.evaluate(()=>Array.from(document.fonts).some(font=>font.family.replace(/["']/g,'')==='Prompt'&&font.status==='loaded')),'A Prompt font face actually loaded');
 const root=new URL(page.url());root.search='';root.hash='';
 const basePath=root.pathname.endsWith('/')?root.pathname:root.pathname+'/';
 const resources=await page.locator('script[src],link[rel="stylesheet"][href]').evaluateAll(nodes=>nodes.map(node=>new URL(node.src||node.href).pathname));
 assert(resources.some(path=>path.startsWith(basePath+'assets/')&&path.endsWith('.js')),'Built JavaScript loads under the site base path (use a production preview or deployed URL)');
 assert(resources.some(path=>path.startsWith(basePath+'assets/')&&path.endsWith('.css')),'Built CSS loads under the site base path');
 const favicon=await page.locator('link[rel="icon"]').getAttribute('href');
 assert.equal(new URL(favicon,root).pathname,basePath+'favicon.svg');
 assert.equal((await page.request.get(new URL(favicon,root).href)).status(),200);
 result.bundlePaths=resources;result.checks.push('Current welcome, actual Prompt face, favicon and base-path build resources load');
 assert.deepEqual((await stored()).entries,[]);

 await start();const first=await page.getByTestId('quote').getAttribute('data-quote-id');
 await button('เปลี่ยนข้อความ').click();await expect(page.getByTestId('quote')).not.toHaveAttribute('data-quote-id',first);
 await button('ข้อความก่อนหน้า').click();await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',first);
 await page.getByRole('button',{name:/^ขยายข้อความ /}).click();
 const preview=page.getByRole('dialog');await expect(preview).toBeVisible();
 await expect(preview.locator('.source-details')).toHaveJSProperty('open',false);
 await preview.locator('.source-details summary').click();await expect(preview.locator('.source-text')).toBeVisible();
 await expect(preview.locator('.quote-status')).toContainText('ร่างยังไม่ตรวจ');
 await page.screenshot({path:resolve(out,'mobile-preview.png'),fullPage:true});
 await button('กลับไปดูการ์ด').click();await expect(preview).toHaveCount(0);
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',first);
 assert.deepEqual((await stored()).entries,[]);result.checks.push('Browse forward/back and collapsed preview return to the same card without saving');

 await skip();await button('กลับไปหน้าแรก').click();await welcome();
 assert.deepEqual((await stored()).entries,[]);result.checks.push('Skipping before selection returns through no-selection to welcome without saving');
 await start();await button('เลือกข้อความนี้').click();await button('ต่อไป').click();
 await page.getByRole('textbox').fill(privateDraft);await skip();
 assert.deepEqual((await stored()).entries,[]);await button('กลับไปหน้าแรก').click();
 result.checks.push('Selecting and writing then skipping ends the private draft without saving');

 await start();const selected=await page.getByTestId('quote').getAttribute('data-quote-id');
 const rawHeadword=await page.getByTestId('quote').locator('.quote-headword').textContent();
 await button('เลือกข้อความนี้').click();await page.getByRole('radio',{name:'ตนเอง',exact:true}).check();
 await button('ต่อไป').click();await page.getByRole('textbox').fill(privateDraft);
 assert.deepEqual((await stored()).entries,[]);await button('เลือกข้อความนี้').click();
 await expect(page.locator('.screen-discover')).toBeVisible();await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',selected);
 await expect(page.locator('.saved-main-status')).toHaveText('เก็บคำไว้แล้ว');
 const saved=await stored();assert.equal(saved.version,1);assert.equal(saved.entries.length,1);
 assert.deepEqual(Object.keys(saved.entries[0]).sort(),['focus','id','localDay','quoteId','quoteText','savedAt']);
 assert.equal(saved.entries[0].quoteId,selected);assert.equal(saved.entries[0].focus,'self');
 assert.equal(saved.entries[0].quoteText.split('\n')[0],rawHeadword);assert(!JSON.stringify(saved).includes(privateDraft));
 result.checks.push('Write-save returns to the same Discover card and stores quote/focus/metadata, never the private draft');

 await button('ดูย้อนหลัง').click();await page.locator('.history-entry-details summary').click();
 await expect(page.locator('.history-saved-text')).toHaveText(saved.entries[0].quoteText);
 await expect(page.locator('.history-entry-details')).toContainText('นึกถึง: ตนเอง');
 await page.screenshot({path:resolve(out,'mobile-history.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle'});await welcome();assert.deepEqual(await stored(),saved);
 await button('ดูย้อนหลัง').click();await page.locator('.history-entry-details summary').click();
 await expect(page.locator('.history-saved-text')).toHaveText(saved.entries[0].quoteText);
 await expect(page.getByText(privateDraft,{exact:true})).toHaveCount(0);
 result.checks.push('History and focus survive reload without private writing');

 await page.reload({waitUntil:'networkidle'});await start();await button('เลือกข้อความนี้').click();await button('ต่อไป').click();
 await page.getByRole('textbox').fill(privateDraft);
 // Fault injection is confined to this disposable page, after the existing save.
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('test blocked','QuotaExceededError');};});
 await button('เลือกข้อความนี้').click();
 await expect(page.getByText('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',{exact:true})).toBeVisible();
 await expect(page.getByRole('textbox')).toHaveValue(privateDraft);await expect(page.locator('.screen-write')).toBeVisible();
 assert.deepEqual(await stored(),saved);await expect(page.getByText('เก็บคำไว้แล้ว',{exact:true})).toHaveCount(0);
 await skip();await button('กลับไปหน้าแรก').click();await welcome();
 assert.deepEqual(await stored(),saved);result.checks.push('Failed save retains draft/prior history, reports failure and permits an unsaved exit');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(new URL(page.url()).pathname,root.pathname);
 result.checks.push('No mobile horizontal overflow or route/base-path drift');
}

if(isMain(import.meta.url))await runLiveCheck('pages-smoke',checkPages);
