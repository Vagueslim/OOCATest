import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Quote} from '../src/quotes';
const catalog:Quote[]=JSON.parse(readFileSync(new URL('../src/catalog.json',import.meta.url),'utf8'));
const key='ooca-demo:saved-quotes:v1';
test('catalog: 53 cards, missing readings, Japanese, mobile overflow and evidence',async({page})=>{
 // 53 actual card transitions plus opening every source disclosure exceed the default 30-second budget.
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||'/');await page.getByRole('button',{name:'เริ่ม',exact:true}).click();
 const seen=new Set<string>();
 for(let i=0;i<53;i++){
  const card=page.getByTestId('quote');const id=await card.getAttribute('data-quote-id');seen.add(id!);
  const q=catalog.find(q=>q.id===id)!;
  await expect(card.locator('.quote-headword')).toHaveText(q.headword);
  await expect(card.locator('.quote-thai')).toHaveText(q.text);
  await expect(card.locator('.quote-status')).toContainText('ร่างยังไม่ตรวจ');
  if(!q.reading&&!q.partOfSpeech)await expect(card.locator('.quote-reading')).toHaveCount(0);
  if(q.type==='sentence')expect(q.partOfSpeech).toBeNull();
  await card.locator('summary').click();await expect(card.locator('.source-text')).toHaveText(q.original);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await card.locator('summary').click();
  if(id==='catalog-v1:ooca-042'||id==='catalog-v1:ooca-001')await page.screenshot({path:`evidence/${id.endsWith('042')?'mobile-word':'mobile-sentence'}.png`,fullPage:true});
  await page.getByRole('button',{name:'เปลี่ยนข้อความ',exact:true}).click();
 }
 expect(seen.size).toBe(53);expect(errors).toEqual([]);
});
test('legacy snapshots survive catalog save, reload, focus update and deletion',async({page})=>{
 await page.goto(process.env.TEST_BASE_URL||'/');
 const old={id:'legacy',quoteId:'self-rest',quoteText:'วันนี้ขอพักก่อน',focus:null,savedAt:'2025-01-01T00:00:00Z',localDay:'2025-01-01'};
 await page.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify({version:1,entries:[old]})),{key,old});
 await page.getByRole('button',{name:'เริ่ม',exact:true}).click();await page.getByRole('button',{name:'เลือกข้อความนี้',exact:true}).click();
 const title=await page.locator('.quote-headword').innerText();
 await page.getByRole('button',{name:'เก็บข้อความไว้',exact:true}).click();
 await page.getByRole('radio',{name:'คนอื่น',exact:true}).check();await page.getByRole('button',{name:'อัปเดตบันทึก',exact:true}).click();
 await page.reload();const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
 expect(data.version).toBe(1);expect(data.entries[0]).toEqual(old);expect(data.entries[1].quoteText).toContain(title);expect(data.entries[1].quoteText).toContain('ร่างยังไม่ตรวจ');expect(data.entries[1].focus).toBe('other');
 await page.getByRole('button',{name:'ดูข้อความที่เก็บไว้',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'ลบข้อความ',exact:true}).click();await page.getByRole('button',{name:'ยืนยันลบ',exact:true}).click();
 await page.getByRole('combobox').selectOption('2025-01');await expect(page.locator('summary')).toHaveText(old.quoteText);
 expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).entries,key))).toEqual([old]);
});

