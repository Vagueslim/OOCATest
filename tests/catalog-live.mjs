import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]||'https://vagueslim.github.io/OOCATest/';
const catalog=JSON.parse(await readFile('src/catalog.json','utf8'));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:360,height:800}});
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push(r.url()));
const button=n=>page.getByRole('button',{name:n,exact:true});const key='ooca-demo:saved-quotes:v1';
const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).entries,key);
const done=async()=>{await button('จบเมื่อพร้อม').first().click();await page.getByRole('heading',{name:'จบรอบนี้แล้ว'}).waitFor();};
const checks=[];await mkdir('evidence/catalog-live',{recursive:true});
try{
 const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.evaluate(()=>document.fonts.ready);
 const legacy={id:'legacy',quoteId:'self-rest',quoteText:'วันนี้ขอพักก่อน',focus:null,savedAt:'2025-01-01T00:00:00Z',localDay:'2025-01-01'};
 await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify({version:1,entries:[legacy]})),{key,legacy});
 await button('เริ่ม').click();const seen=new Set();
 for(let i=0;i<53;i++){
  const card=page.getByTestId('quote');const id=await card.getAttribute('data-quote-id');const q=catalog.find(q=>q.id===id);assert(q,'Live catalog ID exists');seen.add(id);
  assert.equal(await card.locator('.quote-headword').innerText(),q.headword);assert.equal(await card.locator('.quote-thai').innerText(),q.text);assert((await card.innerText()).includes('ร่างยังไม่ตรวจ'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(id==='catalog-v1:ooca-042'||id==='catalog-v1:ooca-001')await page.screenshot({path:`evidence/catalog-live/${id.endsWith('042')?'mobile-word':'mobile-sentence'}.png`,fullPage:true});
  await button('เปลี่ยนข้อความ').click();
 }
 assert.equal(seen.size,53);checks.push('53 live catalog cards match local data, draft labels, word and Japanese sentence, mobile width');
 await button('จบได้เลย').click();assert.deepEqual(await read(),[legacy]);checks.push('End before selection preserves old entry');
 await button('เริ่มรอบใหม่').click();await button('เลือกข้อความนี้').click();await page.screenshot({path:'evidence/catalog-live/mobile-reflect.png',fullPage:true});await done();assert.deepEqual(await read(),[legacy]);checks.push('Select, skip all optional actions, end');
 await button('เริ่มรอบใหม่').click();await button('วันนี้ยังไม่เลือก').click();await button('รับกอด').click();await button('จบได้เลย').click();checks.push('No selection, hug, end');
 await button('เริ่มรอบใหม่').click();await button('เลือกข้อความนี้').click();await button('เก็บข้อความไว้').click();await page.getByRole('radio',{name:'คนอื่น',exact:true}).check();await button('อัปเดตบันทึก').click();await page.getByRole('textbox').fill('PRIVATE LIVE TEST');await done();
 let data=await read();assert.equal(data.length,2);assert.deepEqual(data[0],legacy);assert.equal(data[1].focus,'other');assert(data[1].quoteText.includes('ร่างยังไม่ตรวจ'));assert(!JSON.stringify(data).includes('PRIVATE LIVE TEST'));
 await page.reload({waitUntil:'networkidle'});assert.deepEqual(await read(),data);await button('ดูข้อความที่เก็บไว้').click();await page.locator('summary').click();await button('ลบข้อความ').click();await button('ยืนยันลบ').click();await page.getByRole('combobox').selectOption('2025-01');assert.equal(await page.locator('summary').innerText(),legacy.quoteText);assert.deepEqual(await read(),[legacy]);checks.push('Old v1 snapshot + new save/update, private draft excluded, reload, history and delete preserve legacy');
 await button('กลับ').click();await button('เริ่ม').click();await button('เลือกข้อความนี้').click();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('test blocked','QuotaExceededError');};});await button('เก็บข้อความไว้').click();await page.getByText('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้',{exact:true}).waitFor();await done();assert.equal(await page.getByText('เก็บข้อความไว้แล้ว',{exact:true}).count(),0);assert.deepEqual(await read(),[legacy]);await page.screenshot({path:'evidence/catalog-live/mobile-done.png',fullPage:true});checks.push('Failed save permits end, no false saved message, old entry unchanged');
 assert.equal(errors.length,0);assert.equal(requests.length,0);assert(await page.evaluate(()=>document.fonts.check('16px Prompt')));checks.push('Prompt loaded; no runtime or failed network requests');
 const result={url,checkedAt:new Date().toISOString(),passed:true,viewport:'360x800 Chromium',checks,errors,requests};await writeFile('evidence/catalog-live/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
