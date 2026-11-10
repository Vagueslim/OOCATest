import {test,expect} from '@playwright/test';
import {catalog,deckSize,shownIds,deckTimeout} from './catalog-test-data';
const key='ooca-demo:saved-quotes:v1';
test('catalog: all shown cards, missing readings, Japanese, mobile overflow and evidence',async({page})=>{
 // Size the budget for every visible card plus its source disclosure.
 test.setTimeout(deckTimeout(90000,1500));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(process.env.TEST_BASE_URL||'/');await page.getByRole('button',{name:'เปิดอ่าน',exact:true}).click();
 const seen=new Set<string>();
 for(let i=0;i<deckSize;i++){
  const card=page.getByTestId('quote');const id=await card.getAttribute('data-quote-id');seen.add(id!);
  const q=catalog.find(q=>q.id===id)!;
  await expect(card.locator('.quote-headword')).toHaveText(q.headword);
  await expect(card.locator('.quote-thai')).toHaveText(q.text);
  if(!q.reading&&!q.partOfSpeech)await expect(card.locator('.quote-reading')).toHaveCount(0);
  if(q.type==='sentence')expect(q.partOfSpeech).toBeNull();
  await page.getByRole('button',{name:/^ขยายข้อความ/}).click();
  const preview=page.getByRole('dialog');
  await preview.locator('.source-details summary').click();
  await expect(preview.locator('.source-text')).toBeVisible();
  await expect(preview.locator('.quote-status')).toContainText('ร่างยังไม่ตรวจ');
  await expect(preview.locator('.source-text')).toHaveText(q.original);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'กลับไปดูการ์ด',exact:true}).click();
  if(id==='catalog-v1:ooca-042'||id==='catalog-v1:ooca-001')await page.screenshot({path:`evidence/${id.endsWith('042')?'mobile-word':'mobile-sentence'}.png`,fullPage:true});
  await page.getByRole('button',{name:'เปลี่ยนข้อความ',exact:true}).click();
 }
 expect(seen.size).toBe(deckSize);expect([...seen].sort()).toEqual([...shownIds].sort());expect(errors).toEqual([]);
});
test('legacy snapshots survive a catalog save with chosen focus, reload and deletion',async({page})=>{
 await page.goto(process.env.TEST_BASE_URL||'/');
 const old={id:'legacy',quoteId:'self-rest',quoteText:'วันนี้ขอพักก่อน',focus:null,savedAt:'2025-01-01T00:00:00Z',localDay:'2025-01-01'};
 await page.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify({version:1,entries:[old]})),{key,old});
 await page.getByRole('button',{name:'เปิดอ่าน',exact:true}).click();await page.getByRole('button',{name:'เลือกข้อความนี้',exact:true}).click();
 const title=await page.locator('.quote-headword').innerText();
 await page.getByRole('button',{name:'ต่อไป',exact:true}).click();
 await page.getByRole('button',{name:'กลับไปเลือกมุม',exact:true}).click();
 await page.getByRole('radio',{name:'คนอื่น',exact:true}).check();
 await page.getByRole('button',{name:'ต่อไป',exact:true}).click();
 await page.getByRole('button',{name:'เลือกข้อความนี้',exact:true}).click();
 await page.reload();const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
 expect(data.version).toBe(1);expect(data.entries[0]).toEqual(old);expect(data.entries[1].quoteText).toContain(title);expect(data.entries[1].quoteText).toContain('ร่างยังไม่ตรวจ');expect(data.entries[1].focus).toBe('other');
 await page.getByRole('button',{name:'ดูย้อนหลัง',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'ลบข้อความ',exact:true}).click();await page.getByRole('button',{name:'ยืนยันลบ',exact:true}).click();
 await page.getByRole('combobox').selectOption('2025-01');await expect(page.locator('.history-snapshot')).toHaveText(old.quoteText);
 expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).entries,key))).toEqual([old]);
});
