import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const catalog=JSON.parse(readFileSync(new URL('../src/catalog.json',import.meta.url),'utf8'));
type Pronunciation={reading:string|null;readingKind:string};
type PronunciationUpdate={id:string;before:Pronunciation;after:Pronunciation};
const pronunciation: {baseline:{commit:string;recordCount:number;ids:string[];canonicalSha256:string};updates:PronunciationUpdate[]}=
 JSON.parse(readFileSync(new URL('./fixtures/pronunciation-updates.json',import.meta.url),'utf8'));
const approvedPronunciation=new Map(pronunciation.updates.map(update=>[update.id,update]));
function restorePronunciation(record:{id:string}&Record<string,unknown>){
 const update=approvedPronunciation.get(record.id);
 return update?{...record,...update.before}:record;
}
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>[key,canonical(item)]));
 return value;
}
const key='ooca-demo:saved-quotes:v1';
const base=process.env.TEST_BASE_URL||'/';
async function fixture(page:Page,getRecords:()=>unknown[]){
 await page.route('**/src/catalog.json*',route=>route.fulfill({
  status:200,contentType:'text/javascript',body:'export default '+JSON.stringify(getRecords())+';'
 }));
}
async function quoteModule(page:Page){
 return page.evaluate(async()=>{
  const path='/src/quotes.ts';const m=await import(/* @vite-ignore */ path);
  return {ids:m.quotes.map((q:{id:string})=>q.id),visible:m.visibleQuotes.map((q:{id:string})=>q.id),
   decks:Array.from({length:100},()=>m.shuffled(m.visibleQuotes[0]?.id)),
   normalized:[undefined,1,0,null,'0','1',false,true,-1,2].map(m.normalizeQuoteStatus)};
 });
}
async function saveCurrent(page:Page){
 await page.locator('.browse-actions .primary').click();
 await page.locator('.step-actions .primary').click();
 await page.locator('.writing-actions .primary').click();
 return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
}
test('catalog visibility: explicit binary status and original user edits remain unchanged by ID',()=>{
 expect(catalog.length).toBeGreaterThanOrEqual(53);
 expect(new Set(catalog.map((q:{id:string})=>q.id)).size).toBe(catalog.length);
 expect(catalog.every((q:{status:unknown})=>q.status===0||q.status===1)).toBe(true);
 const before=JSON.parse(readFileSync(new URL('../evidence/catalog-visibility/user-catalog-before-status.json',import.meta.url),'utf8'));
 for(const old of before){
  const current=catalog.find((q:{id:string})=>q.id===old.id);
  expect(current).toBeTruthy();
  // Preserve the historical snapshot while allowing only the reviewed pronunciation updates.
  const {status,...content}=restorePronunciation(current);
  expect(content).toEqual(old);
 }
});

test('catalog pronunciation: exactly 37 reviewed updates preserve all 107 records and other fields',()=>{
 expect(pronunciation.baseline.commit).toBe('7db818fce71bb2c220697bbd71edab0ad4f699bc');
 expect(pronunciation.baseline.recordCount).toBe(107);
 expect(catalog.map((record:{id:string})=>record.id)).toEqual(pronunciation.baseline.ids);
 expect(catalog).toHaveLength(pronunciation.baseline.recordCount);
 expect(pronunciation.updates).toHaveLength(37);
 expect(approvedPronunciation.size).toBe(37);
 for(const update of pronunciation.updates){
  expect(Object.keys(update.before).sort()).toEqual(['reading','readingKind']);
  expect(Object.keys(update.after).sort()).toEqual(['reading','readingKind']);
  expect(update.after).not.toEqual(update.before);
  const record=catalog.find((item:{id:string})=>item.id===update.id);
  expect(record,update.id).toBeTruthy();
  expect({reading:record.reading,readingKind:record.readingKind},update.id).toEqual(update.after);
 }
 // This independent base hash also covers all non-reading fields and the 70 untouched readings.
 const restored=catalog.map(restorePronunciation);
 const hash=createHash('sha256').update(JSON.stringify(canonical(restored)),'utf8').digest('hex');
 expect(hash).toBe(pronunciation.baseline.canonicalSha256);
});

test.describe('catalog visibility runtime fixtures',()=>{
 test.skip(!!process.env.TEST_BASE_URL&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(process.env.TEST_BASE_URL),'Vite module fixtures run locally, without changing production or source files.');
 test('0 is excluded, absent defaults to shown, invalid status fails closed, all IDs remain available',async({page})=>{
  const records=catalog.slice(0,7).map((q:object,i:number)=>({...q,status:[1,0,undefined,'1',null,false,-1][i]}));
  await fixture(page,()=>records);await page.goto(base);
  const result=await quoteModule(page),shown=[records[0].id,records[2].id];
  expect(result.ids).toEqual(records.map((q:{id:string})=>q.id));
  expect(result.visible).toEqual(shown);
  expect(result.normalized).toEqual([1,1,0,0,0,0,0,0,0,0]);
  for(const deck of result.decks){expect([...deck].sort()).toEqual([...shown].sort());expect(deck[0]).not.toBe(shown[0]);}
 });
 test('hidden cards never enter the rendered deck, including replenished rounds',async({page})=>{
  const records=catalog.slice(0,4).map((q:object,i:number)=>({...q,status:i<2?1:0}));
  await fixture(page,()=>records);await page.goto(base);await page.locator('.welcome-start').click();
  const shown=records.slice(0,2).map((q:{id:string})=>q.id);
  for(let i=0;i<10;i++){
   const active=page.getByTestId('quote');const id=await active.getAttribute('data-quote-id');
   expect(shown).toContain(id);
   for(const hidden of records.slice(2))await expect(page.locator('[data-quote-id="'+hidden.id+'"]')).toHaveCount(0);
   await page.locator('.browse-controls button').last().click();
   await expect(active).not.toHaveAttribute('data-quote-id',id!);
  }
 });
 test('all hidden is a recoverable empty state and shuffling stays empty',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const records=catalog.slice(0,3).map((q:object)=>({...q,status:0}));
  await fixture(page,()=>records);await page.goto(base);
  const result=await quoteModule(page);expect(result.visible).toEqual([]);expect(result.decks.every((d:unknown[])=>d.length===0)).toBe(true);
  await page.locator('.welcome-start').click();await expect(page.locator('.catalog-empty')).toBeVisible();
  await expect(page.getByTestId('quote')).toHaveCount(0);
  await page.locator('.catalog-empty button').click();await expect(page.locator('.welcome-start')).toBeVisible();
  expect(errors).toEqual([]);
 });
 test('one shown card never creates undefined IDs and disables navigation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const records=catalog.slice(0,3).map((q:object,i:number)=>({...q,status:i===0?1:0}));
  await fixture(page,()=>records);await page.goto(base);
  const result=await quoteModule(page);for(const deck of result.decks)expect(deck).toEqual([records[0].id]);
  await page.locator('.welcome-start').click();
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[0].id);
  await expect(page.locator('.browse-controls button').first()).toBeDisabled();
  await expect(page.locator('.browse-controls button').last()).toBeDisabled();
  await expect(page.locator('.quote-deck .swiper-slide')).toHaveCount(1);
  expect(errors).toEqual([]);
 });
 test('saved snapshots survive hiding their source, reload, later saves and deletion',async({page})=>{
  let records=catalog.slice(0,2).map((q:object,i:number)=>({...q,status:i===0?1:0}));
  await fixture(page,()=>records);await page.goto(base);await page.locator('.welcome-start').click();
  const saved=await saveCurrent(page),original=saved.entries[0];
  expect(original.quoteId).toBe(records[0].id);expect(original.quoteText).toContain(records[0].text);
  records=records.map((q:{status:number},i:number)=>({...q,status:i===0?0:1}));
  await page.reload();await page.locator('.welcome-history').click();
  await page.locator('.history-entry-details summary').click();
  await expect(page.locator('.history-saved-text')).toHaveText(original.quoteText);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key)).toEqual(saved);
  await page.reload();await page.locator('.welcome-start').click();
  await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[1].id);
  const later=await saveCurrent(page);expect(later.version).toBe(1);
  expect(later.entries[0]).toEqual(original);expect(later.entries[1].quoteId).toBe(records[1].id);
  await page.reload();await page.locator('.welcome-history').click();
  const details=page.locator('.history-entry-details');
  await details.locator('summary').click();
  if(await page.locator('.history-saved-text').innerText()!==original.quoteText){
   await page.getByRole('button',{name:'ข้อความที่เก็บไว้ถัดไป',exact:true}).click();
   await details.locator('summary').click();
  }
  await expect(page.locator('.history-saved-text')).toHaveText(original.quoteText);
  const hiddenHistory=details;
  await hiddenHistory.getByRole('button',{name:'ลบข้อความ',exact:true}).click();
  await hiddenHistory.locator('.confirmation button').first().click();
  const remaining=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  expect(remaining.entries).toEqual([later.entries[1]]);
 });
});
