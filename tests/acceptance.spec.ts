import {test,expect,type Page} from '@playwright/test';
import {deckSize,shownIds,deckTimeout} from './catalog-test-data';
const key='ooca-demo:saved-quotes:v1';
const btn=(p:Page,n:string)=>p.getByRole('button',{name:n,exact:true});
const entries=(p:Page)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"entries":[]}').entries,key);
async function start(p:Page){await btn(p,'ลองเปิดอ่าน').click();}
async function select(p:Page){
 await btn(p,'เลือกข้อความนี้').click();
 await expect(p.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeFocused();
 await expect(p.getByRole('radio',{name:'ไม่ระบุ',exact:true})).toBeChecked();
 await btn(p,'ต่อไป').click();
 await expect(p.getByRole('heading',{name:'เขียนถึงตัวเอง'})).toBeFocused();
}
async function save(p:Page,name='เก็บข้อความไว้'){
 const control=btn(p,name);
 if(!await control.isVisible())await p.locator('.keep-disclosure > summary').click();
 await control.click();
}
async function setFocus(p:Page,name:string,review=false){
 await btn(p,'กลับไปเลือกมุม').click();
 await expect(p.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeFocused();
 await p.getByRole('radio',{name,exact:true}).check();
 await btn(p,'ต่อไป').click();
 if(review)await p.locator('.keep-disclosure > summary').click();
}

async function finish(p:Page){await btn(p,'จบ').click();await expect(p.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeFocused();}
test.beforeEach(async({page})=>{await page.goto(process.env.TEST_BASE_URL||'/');});
test('A02 skip ends before selecting without saving',async({page})=>{await start(page);await expect(btn(page,'จบได้เลย')).toHaveCount(0);await btn(page,'วันนี้ยังไม่เลือก').click();await expect(page.getByRole('heading',{name:'วันนี้ยังไม่เลือก'})).toBeFocused();await expect(page.getByText('เหนื่อยละสินะวันนี้',{exact:true})).toBeVisible();await expect(page.getByRole('button')).toHaveCount(1);await expect(btn(page,'กลับไปหน้าแรก')).toBeVisible();expect(await entries(page)).toEqual([]);await expect(page.getByText('เก็บข้อความไว้แล้ว',{exact:true})).toHaveCount(0);});
test('A04 skip all optional actions',async({page})=>{await start(page);const q=await page.getByTestId('quote').getAttribute('data-quote-id');const content=await page.getByTestId('quote').locator('.quote-thai').innerText();await select(page);await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',q!);await expect(page.getByTestId('quote').locator('.quote-thai')).toHaveText(content);await expect(page.getByTestId('quote').locator('.quote-character')).toHaveCount(0);await finish(page);expect(await entries(page)).toEqual([]);});
test('A06 save immediately, draft stays private, reload',async({page})=>{await start(page);await select(page);await save(page);await page.getByRole('textbox').fill('PRIVATE DRAFT 8675309');await finish(page);await expect(page.getByText('เก็บข้อความไว้แล้ว',{exact:true})).toBeVisible();await btn(page,'ดูข้อความที่เก็บไว้').click();expect(await entries(page)).toHaveLength(1);expect(JSON.stringify(await entries(page))).not.toContain('PRIVATE');await expect(page.getByText('PRIVATE DRAFT 8675309')).toHaveCount(0);await page.reload();await expect(page.getByRole('heading',{name:'ค่อย ๆ อยู่กับคำหนึ่งคำ',exact:true})).toBeVisible();expect(await entries(page)).toHaveLength(1);});
test('A01 complete deck and non-repeating seam',async({page})=>{test.setTimeout(deckTimeout());await start(page);const seen=[];for(let i=0;i<deckSize;i++){seen.push(await page.getByTestId('quote').getAttribute('data-quote-id'));await btn(page,'เปลี่ยนข้อความ').click();await expect(btn(page,'เปลี่ยนข้อความ')).toBeFocused();}expect(new Set(seen).size).toBe(deckSize);expect([...seen].sort()).toEqual([...shownIds].sort());expect(await page.getByTestId('quote').getAttribute('data-quote-id')).not.toBe(seen[deckSize-1]);});
test('A03 skip closure has a Heart Hug and a single return home path',async({page})=>{await start(page);for(let i=0;i<2;i++){await btn(page,'วันนี้ยังไม่เลือก').click();await expect(page.locator('.quote-character')).toHaveAttribute('data-character-name','Heart Hug');await expect(page.getByText('เหนื่อยละสินะวันนี้',{exact:true})).toBeVisible();await expect(page.getByRole('button')).toHaveCount(1);await expect(btn(page,'รับกอด')).toHaveCount(0);await expect(btn(page,'จบได้เลย')).toHaveCount(0);await btn(page,'กลับไปหน้าแรก').click();await expect(page.getByRole('heading',{name:'ค่อย ๆ อยู่กับคำหนึ่งคำ',exact:true})).toBeFocused();expect(await entries(page)).toEqual([]);await start(page);}});
test('A05 optional input order, literal text, clearing and 500 limit',async({page})=>{await start(page);await select(page);const text='<b>คำของฉัน</b>';await page.getByRole('textbox').fill(text);await setFocus(page,'คนอื่น',true);await expect(page.getByRole('region',{name:'อ่านทวน'})).toContainText(text);await expect(page.getByRole('region',{name:'อ่านทวน'})).toContainText('คนอื่น');await setFocus(page,'ไม่ระบุ',true);await page.getByRole('textbox').fill('   ');await expect(page.getByRole('region',{name:'อ่านทวน'})).toHaveText('อ่านทวนมีเพียงคำที่คุณเลือก');await setFocus(page,'สิ่งอื่น',true);await page.getByRole('textbox').fill('เพลง');await expect(page.getByRole('region',{name:'อ่านทวน'})).toContainText('สิ่งอื่นเพลง');await page.getByRole('textbox').fill('ก'.repeat(510));expect((await page.getByRole('textbox').inputValue()).length).toBe(500);});
test('A07 idempotence, explicit update and unsaved changes',async({page})=>{await start(page);await select(page);await save(page);const first=(await entries(page))[0];await save(page);expect(await entries(page)).toHaveLength(1);await setFocus(page,'ตนเอง');expect((await entries(page))[0].focus).toBeNull();await save(page,'อัปเดตบันทึก');expect((await entries(page))[0]).toEqual({...first,focus:'self'});await setFocus(page,'คนอื่น');await finish(page);expect((await entries(page))[0].focus).toBe('self');});
test('A08 limit, end when full, delete restores capacity',async({page})=>{await start(page);for(let i=0;i<3;i++){await select(page);await save(page);await finish(page);await btn(page,'เลือกคำใหม่').click();}await select(page);await save(page);await expect(page.getByRole('status')).toHaveText('วันนี้เก็บครบ 3 ข้อความแล้ว คุณยังจบรอบนี้ได้');expect(await entries(page)).toHaveLength(3);await finish(page);await expect(page.getByText('เก็บข้อความไว้แล้ว',{exact:true})).toHaveCount(0);await btn(page,'ดูข้อความที่เก็บไว้').click();await page.locator('summary').first().click();await btn(page,'ลบข้อความ').click();await btn(page,'ยกเลิก').click();expect(await entries(page)).toHaveLength(3);await btn(page,'ลบข้อความ').click();await btn(page,'ยืนยันลบ').click();expect(await entries(page)).toHaveLength(2);await btn(page,'กลับ').click();await btn(page,'เลือกคำใหม่').click();await select(page);await save(page);expect(await entries(page)).toHaveLength(3);});
test('A09 months, empty current month, read/delete and return origins',async({page})=>{await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,entries:[{id:'old1',quoteId:'x',quoteText:'เดือนหนึ่ง',focus:'other',savedAt:'2025-01-03T10:00:00Z',localDay:'2025-01-03'},{id:'old2',quoteId:'y',quoteText:'เดือนสอง',focus:null,savedAt:'2025-02-04T10:00:00Z',localDay:'2025-02-04'}]})),key);await btn(page,'ดูย้อนหลัง').click();await expect(page.getByText('เดือนนี้ยังไม่มีข้อความที่เก็บไว้')).toBeVisible();await page.getByRole('combobox').selectOption('2025-01');await expect(page.locator('summary')).toHaveText('เดือนหนึ่ง');await page.locator('summary').click();await expect(page.getByText('นึกถึง: คนอื่น')).toBeVisible();await page.getByRole('combobox').selectOption('2025-02');await expect(page.locator('summary')).toHaveText('เดือนสอง');await page.locator('summary').click();await btn(page,'ลบข้อความ').click();await btn(page,'ยืนยันลบ').click();await btn(page,'กลับ').click();await expect(page.getByRole('heading',{name:'ค่อย ๆ อยู่กับคำหนึ่งคำ',exact:true})).toBeFocused();await start(page);await select(page);await finish(page);await btn(page,'ดูข้อความที่เก็บไว้').click();await btn(page,'กลับ').click();await expect(page.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeFocused();});
for(const failure of ['malformed','write','read','schema'])test(`A10 ${failure}: failed new save and failed update preserve data and exit`,async({page})=>{await start(page);await select(page);await save(page);const original=await page.evaluate(k=>localStorage.getItem(k),key);await setFocus(page,'คนอื่น');if(failure==='malformed'||failure==='schema')await page.evaluate(({k,f})=>localStorage.setItem(k,f==='malformed'?'{broken':JSON.stringify({version:1,entries:[{id:'bad'}]})),{k:key,f:failure});else await page.evaluate(f=>{Storage.prototype[f==='write'?'setItem':'getItem']=()=>{throw new DOMException('blocked','SecurityError');};},failure);await save(page,'อัปเดตบันทึก');await expect(page.getByRole('status')).toHaveText('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้');if(failure==='write')expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(original);await finish(page);await expect(page.getByText('เก็บข้อความไว้แล้ว',{exact:true})).toBeVisible();await btn(page,'เลือกคำใหม่').click();await select(page);await save(page);await expect(page.getByRole('status')).toHaveText('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้');await finish(page);await expect(page.getByText('เก็บข้อความไว้แล้ว',{exact:true})).toHaveCount(0);});
test('A10 failed deletion retains entry',async({page})=>{await start(page);await select(page);await save(page);await finish(page);await btn(page,'ดูข้อความที่เก็บไว้').click();await page.locator('summary').click();await btn(page,'ลบข้อความ').click();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});await btn(page,'ยืนยันลบ').click();await expect(page.getByRole('status')).toHaveText('ตอนนี้เก็บข้อความในเบราว์เซอร์นี้ไม่ได้');expect(await entries(page)).toHaveLength(1);await expect(page.locator('summary')).toHaveCount(1);});
test('A11 resets on ending and reload, persists successful saves',async({page})=>{await start(page);await select(page);await setFocus(page,'สิ่งอื่น');await page.getByRole('textbox').fill('private');await save(page);await finish(page);await btn(page,'เลือกคำใหม่').click();await select(page);await expect(page.getByRole('textbox')).toBeEmpty();await page.getByRole('textbox').fill('reload private');await page.reload();await start(page);await select(page);await expect(page.getByRole('textbox')).toBeEmpty();expect(await entries(page)).toHaveLength(1);await finish(page);await btn(page,'เลือกคำใหม่').click();await btn(page,'วันนี้ยังไม่เลือก').click();await btn(page,'กลับไปหน้าแรก').click();await start(page);await btn(page,'วันนี้ยังไม่เลือก').click();await expect(page.getByText('เหนื่อยละสินะวันนี้',{exact:true})).toBeVisible();expect(await entries(page)).toHaveLength(1);});
test('A12 keyboard, mobile and desktop evidence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.keyboard.press('Tab');await expect(btn(page,'ลองเปิดอ่าน')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'พบข้อความ'})).toBeFocused();
 await page.screenshot({path:'evidence/mobile-discover.png',fullPage:true});
 await page.getByRole('button',{name:/^ขยายข้อความ/}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:/^ขยายข้อความ/})).toBeFocused();
 await btn(page,'เลือกข้อความนี้').focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeFocused();
 await expect(page.getByTestId('quote').locator('.source-details')).toHaveAttribute('open','');
 await page.getByRole('radio',{name:'ไม่ระบุ',exact:true}).focus();await page.keyboard.press('ArrowLeft');
 await expect(page.getByRole('radio',{name:'สิ่งอื่น',exact:true})).toBeChecked();
 await page.screenshot({path:'evidence/mobile-focus.png',fullPage:true});
 await btn(page,'ต่อไป').focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'เขียนถึงตัวเอง'})).toBeFocused();
 await page.getByRole('textbox').fill('คำนี้ทำให้นึกถึงเพลงที่ชอบ');
 await expect(btn(page,'เก็บข้อความไว้')).toBeHidden();
 for(const width of [360,1440]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const buttons=await page.locator('button:visible').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=44));expect(buttons).toBe(true);
  await page.screenshot({path:`evidence/writing-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:360,height:800});await finish(page);
 await page.screenshot({path:'evidence/mobile-done.png',fullPage:true});expect(errors).toEqual([]);
});

test('journey: backtracking retains selection, focus and draft without saving',async({page})=>{
 await start(page);await btn(page,'เปลี่ยนข้อความ').click();
 const q=await page.getByTestId('quote').getAttribute('data-quote-id');
 await select(page);await page.getByRole('textbox').fill('temporary only');
 await setFocus(page,'คนอื่น');await expect(page.getByRole('textbox')).toHaveValue('temporary only');
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',q!);
 expect(await entries(page)).toEqual([]);
 await btn(page,'วันนี้ยังไม่เลือก').click();await btn(page,'กลับไปหน้าแรก').click();
 await start(page);await select(page);await expect(page.getByRole('textbox')).toBeEmpty();
 expect(await entries(page)).toEqual([]);
});

test('journey: focus can return to the same deck position and end without writing',async({page})=>{
 await start(page);await btn(page,'เปลี่ยนข้อความ').click();
 const q=await page.getByTestId('quote').getAttribute('data-quote-id');
 await btn(page,'เลือกข้อความนี้').click();
 await expect(page.getByRole('textbox')).toHaveCount(0);
 await expect(page.getByTestId('quote').locator('.source-details')).toHaveAttribute('open','');
 await btn(page,'กลับไปเลือกคำ').click();
 await expect(page.getByRole('heading',{name:'พบข้อความ'})).toBeFocused();
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',q!);
 await expect(btn(page,'ข้อความก่อนหน้า')).toBeEnabled();
 await btn(page,'เลือกข้อความนี้').click();await btn(page,'จบเมื่อพร้อม').click();
 await expect(page.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeFocused();
 expect(await entries(page)).toEqual([]);
});
