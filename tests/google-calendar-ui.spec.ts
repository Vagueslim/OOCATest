import {test,expect,type Page} from '@playwright/test';
import {shownCatalog,deckSize,deckTimeout} from './catalog-test-data';
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const panel=(p:Page)=>p.getByRole('region',{name:'เพิ่มนัดในปฏิทิน',exact:true});
const consent=(p:Page)=>p.getByRole('checkbox',{name:'ฉันยินยอมส่งข้อมูลข้างต้นไปยัง Google Calendar',exact:true});
const storage=(p:Page)=>p.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
async function mockService(page:Page,{configured=true,error='',fixture=false}:{configured?:boolean;error?:string;fixture?:boolean}={}){
 const external:string[]=[];let moduleUrl='/src/googleCalendar.ts';
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return route.continue();external.push(url.href);return route.abort();});
 await page.route('**/src/googleCalendar.ts*',route=>{moduleUrl=route.request().url();return route.fulfill({contentType:'application/javascript',body:`
 export class CalendarError extends Error {constructor(code){super('Calendar operation: '+code);this.code=code;}}
 export const calls=[];export let preparations=0;let resolvePending,rejectPending;
 export function settle(kind='success'){if(kind==='success')resolvePending({id:'mock-confirmed-id',htmlLink:'https://calendar.google.com/calendar/event?eid=mock'});else rejectPending(new CalendarError(kind));}
 export const googleCalendarClient={configured:${configured},async prepare(){preparations++;},createEvent(event){calls.push(structuredClone(event));${error?`return Promise.reject(new CalendarError(${JSON.stringify(error)}));`:'return new Promise((resolve,reject)=>{resolvePending=resolve;rejectPending=reject;});'}}};
 `});});
 if(fixture)await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`
 import React from '/node_modules/.vite/deps/react.js';const {useState}=React;import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';const {createRoot}=ReactDOM;
 import CalendarReminder from '/src/CalendarReminder.tsx';import '/src/style.css';import '/src/journey.css';
 function Fixture(){const [content,setContent]=useState({headword:'CALM',text:'EXPLICIT PREVIEW TEXT'});const [session,setSession]=useState(null);return React.createElement('main',null,React.createElement('button',{onClick:()=>setContent({headword:'RESPECT',text:'CHANGED PREVIEW TEXT'})},'Change test content'),React.createElement(CalendarReminder,{content,session,onSession:setSession}));}
 createRoot(document.getElementById('root')).render(React.createElement(Fixture));
 `}));
 return {external,async state(){return page.evaluate(async path=>{const m=await import(path);return {calls:m.calls,preparations:m.preparations};},moduleUrl);},async settle(kind='success'){await page.evaluate(async({path,kind})=>(await import(path)).settle(kind),{path:moduleUrl,kind});}};
}
async function reflectScreen(page:Page,draft=''){
 await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เปิดอ่าน').click();await button(page,'เลือกข้อความนี้').click();
 await expect(button(page,'บอกฉันอีก 7 วัน')).toHaveCount(0);
 await page.getByRole('radio',{name:'ตนเอง',exact:true}).check();
 if(draft){await button(page,'ต่อไป').click();await page.getByRole('textbox').fill(draft);await button(page,'กลับไปเลือกมุม').click();}
}
test.use({timezoneId:'Asia/Bangkok'});

test('calendar API UI: missing configuration is an honest blocker, never dummy success or external load',async({page})=>{
 const mock=await mockService(page,{configured:false});await reflectScreen(page);const before=await storage(page);
 await button(page,'บอกฉันอีก 7 วัน').click();await expect(panel(page)).toContainText('ยังไม่ได้ตั้งค่า Google Calendar');await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();await expect(consent(page)).toBeDisabled();
 await expect(panel(page).getByRole('link')).toHaveCount(0);await expect(button(page,'ดาวน์โหลดไฟล์ .ics')).toHaveCount(0);expect(await mock.state()).toEqual({calls:[],preparations:0});expect(mock.external).toEqual([]);expect(await storage(page)).toEqual(before);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel(page).scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/journey-calendar-api-mock-setup-'+width+'.png',fullPage:true});}
 await button(page,'วันนี้ยังไม่เลือก').click();await expect(page.getByRole('heading',{name:'วันนี้ยังไม่เลือก'})).toBeFocused();
});

test('calendar API UI: explicit consent, one pending request, busy guards, verified success and retained session',async({page})=>{
 const mock=await mockService(page);await page.clock.setFixedTime(new Date('2026-11-08T16:59:59Z'));await reflectScreen(page,'PRIVATE DRAFT NOT AUTOMATICALLY SHARED');const before=await storage(page);
 await button(page,'บอกฉันอีก 7 วัน').focus();await page.keyboard.press('Enter');await expect(panel(page)).toContainText('Google Calendar หลักของบัญชีที่คุณเลือก');await expect(panel(page)).toContainText('ชื่อกิจกรรมอาจปรากฏบนการแจ้งเตือน');await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();expect((await mock.state()).calls).toEqual([]);
 const title=await panel(page).locator('.calendar-title').innerText();
 // CSS may capitalize the first displayed letter; exported content keeps the catalog string.
 const headword=await page.getByTestId('quote').locator('.quote-headword').textContent();const cardText=await page.getByTestId('quote').locator('.quote-thai').textContent();expect(title).toBe(headword+' · '+cardText);
 await consent(page).focus();await page.keyboard.press('Space');await expect(button(page,'ตกลง สร้างนัด')).toBeEnabled();
 await button(page,'ตกลง สร้างนัด').click();await expect(panel(page)).toHaveAttribute('aria-busy','true');await expect(button(page,'กำลังสร้างนัด…')).toBeDisabled();
 for(const label of ['กลับไปเลือกคำ','ต่อไป','วันนี้ยังไม่เลือก','บอกฉันอีก 7 วัน'])await expect(button(page,label)).toBeDisabled();
 for(const label of ['ตนเอง','คนอื่น','สิ่งอื่น','ไม่ระบุ'])await expect(page.getByRole('radio',{name:label,exact:true})).toBeDisabled();
 await expect(consent(page)).toBeDisabled();
 await button(page,'กำลังสร้างนัด…').evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 const pending=await mock.state();expect(pending.calls).toHaveLength(1);expect(pending.calls[0].summary).toBe(title);expect(JSON.stringify(pending.calls[0])).not.toContain('PRIVATE DRAFT NOT AUTOMATICALLY SHARED');expect(pending.calls[0]).not.toHaveProperty('focus');expect(pending.calls[0]).not.toHaveProperty('draft');expect(pending.calls[0].start).toEqual({dateTime:'2026-11-15T06:00:00.000Z',timeZone:'Asia/Bangkok'});expect(pending.calls[0].end.dateTime).toBe('2026-11-15T06:15:00.000Z');
 await expect(panel(page).getByText('สร้างนัดใน Google Calendar แล้ว',{exact:true})).toHaveCount(0);await mock.settle();await expect(panel(page).getByRole('status')).toHaveText('สร้างนัดใน Google Calendar แล้ว');await expect(panel(page).getByRole('link',{name:/^ดูนัดใน Google Calendar/})).toHaveAttribute('href','https://calendar.google.com/calendar/event?eid=mock');await expect(button(page,'ตกลง สร้างนัด')).toHaveCount(0);
 expect(await storage(page)).toEqual(before);expect(mock.external).toEqual([]);
 await button(page,'ต่อไป').click();await expect(page.getByRole('textbox')).toHaveValue('PRIVATE DRAFT NOT AUTOMATICALLY SHARED');await expect(button(page,'บอกฉันอีก 7 วัน')).toHaveCount(0);
 await button(page,'กลับไปเลือกมุม').click();await button(page,'บอกฉันอีก 7 วัน').click();await expect(panel(page).locator('.calendar-title')).toHaveText(title);await expect(panel(page).getByRole('status')).toContainText('สร้างนัดใน Google Calendar แล้ว');await expect(button(page,'ตกลง สร้างนัด')).toHaveCount(0);expect((await mock.state()).calls).toHaveLength(1);
 await button(page,'วันนี้ยังไม่เลือก').click();await expect(page.getByRole('heading',{name:'วันนี้ยังไม่เลือก'})).toBeFocused();expect(await storage(page)).toEqual(before);
});
for(const code of ['popup_closed','scope_denied','token_expired','api_error','uncertain'])test('calendar API UI: '+code+' is not success and requires appropriate next action',async({page})=>{
 const mock=await mockService(page,{error:code});await reflectScreen(page,'PRIVATE RETAINED');const before=await storage(page);await button(page,'บอกฉันอีก 7 วัน').click();await consent(page).check();await button(page,'ตกลง สร้างนัด').click();
 await expect(panel(page).getByRole('status')).toBeVisible();await expect(panel(page).getByRole('status')).not.toContainText('สร้างนัดใน Google Calendar แล้ว');await expect(button(page,'ต่อไป')).toBeEnabled();expect((await mock.state()).calls).toHaveLength(1);expect(await storage(page)).toEqual(before);expect(mock.external).toEqual([]);
 if(code==='uncertain'){await expect(panel(page).getByRole('status')).toContainText('กรุณาตรวจ Google Calendar');await expect(button(page,'ตกลง สร้างนัด')).toHaveCount(0);}
 else{await expect(consent(page)).not.toBeChecked();await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();}
 await button(page,'ต่อไป').click();await expect(page.getByRole('textbox')).toHaveValue('PRIVATE RETAINED');
 if(code==='uncertain'){await button(page,'กลับไปเลือกมุม').click();await button(page,'บอกฉันอีก 7 วัน').click();await expect(panel(page).getByRole('status')).toContainText('กรุณาตรวจ Google Calendar');await expect(button(page,'ตกลง สร้างนัด')).toHaveCount(0);}
});

test('calendar API UI: midnight confirmation refreshes the reviewed date before requesting renewed consent',async({page})=>{
 const mock=await mockService(page,{fixture:true});
 const beforeMidnight=new Date('2026-11-10T16:59:55Z');
 await page.clock.install({time:beforeMidnight});await page.clock.pauseAt(beforeMidnight);
 await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เตือนฉันในอีก 7 วัน').click();
 await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-17T06:00:00.000Z');
 await consent(page).check();await expect(button(page,'ตกลง สร้างนัด')).toBeEnabled();
 // Six seconds crosses local midnight, before the existing 15-second refresh.
 await page.clock.runFor(6000);await expect(consent(page)).toBeChecked();
 await button(page,'ตกลง สร้างนัด').click();
 expect((await mock.state()).calls).toEqual([]);
 await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-18T06:00:00.000Z');
 await expect(panel(page).getByRole('status')).toHaveText('ข้อมูลนัดเปลี่ยนแล้ว โปรดตรวจและยินยอมอีกครั้ง');
 await expect(consent(page)).not.toBeChecked();await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();
 await consent(page).check();await button(page,'ตกลง สร้างนัด').click();
 const {calls}=await mock.state();expect(calls).toHaveLength(1);
 expect(calls[0].start).toEqual({dateTime:'2026-11-18T06:00:00.000Z',timeZone:'Asia/Bangkok'});
 expect(calls[0].end).toEqual({dateTime:'2026-11-18T06:15:00.000Z',timeZone:'Asia/Bangkok'});
 await mock.settle();await expect(panel(page).getByRole('status')).toHaveText('สร้างนัดใน Google Calendar แล้ว');
 expect(mock.external).toEqual([]);
});

test.describe('calendar confirmation after a timezone change',()=>{
 test.use({timezoneId:undefined});
 test('calendar API UI: timezone confirmation refreshes the reviewed zone before requesting renewed consent',async({page,context})=>{
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Bangkok'});
  const mock=await mockService(page,{fixture:true});
  const frozenTime=new Date('2026-11-10T00:00:00Z');
  await page.clock.install({time:frozenTime});await page.clock.pauseAt(frozenTime);
  await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เตือนฉันในอีก 7 วัน').click();
  await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-17T06:00:00.000Z');
  await consent(page).check();await expect(button(page,'ตกลง สร้างนัด')).toBeEnabled();
  // Change browser timezone without the focus/visibility events that normally refresh.
  await cdp.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Tokyo'});
  await expect(panel(page).locator('.calendar-zone')).toContainText('Asia/Bangkok');
  await button(page,'ตกลง สร้างนัด').click();
  expect((await mock.state()).calls).toEqual([]);
  await expect(panel(page).locator('.calendar-zone')).toContainText('Asia/Tokyo');
  await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-17T04:00:00.000Z');
  await expect(consent(page)).not.toBeChecked();await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();
  await consent(page).check();await button(page,'ตกลง สร้างนัด').click();
  const {calls}=await mock.state();expect(calls).toHaveLength(1);
  expect(calls[0].start).toEqual({dateTime:'2026-11-17T04:00:00.000Z',timeZone:'Asia/Tokyo'});
  expect(calls[0].end).toEqual({dateTime:'2026-11-17T04:15:00.000Z',timeZone:'Asia/Tokyo'});
  await mock.settle();expect(mock.external).toEqual([]);await cdp.detach();
 });
});

test('calendar API UI: injected content and midnight changes reset consent before any write',async({page})=>{
 const mock=await mockService(page,{fixture:true});await page.clock.install({time:new Date('2026-11-08T16:59:55Z')});await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เตือนฉันในอีก 7 วัน').click();await expect(panel(page).locator('.calendar-title')).toHaveText('CALM · EXPLICIT PREVIEW TEXT');await consent(page).check();
 await button(page,'Change test content').click();await expect(panel(page).locator('.calendar-title')).toHaveText('RESPECT · CHANGED PREVIEW TEXT');await expect(consent(page)).not.toBeChecked();await expect(button(page,'ตกลง สร้างนัด')).toBeDisabled();await consent(page).check();
 await page.clock.runFor(15001);await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-16T06:00:00.000Z');await expect(consent(page)).not.toBeChecked();
 await consent(page).check();await page.clock.setSystemTime(new Date('2026-11-10T00:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-17T06:00:00.000Z');await expect(consent(page)).not.toBeChecked();
 await consent(page).check();await page.clock.setSystemTime(new Date('2026-11-11T00:00:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(panel(page).locator('time')).toHaveAttribute('datetime','2026-11-18T06:00:00.000Z');await expect(consent(page)).not.toBeChecked();expect((await mock.state()).calls).toEqual([]);
 await consent(page).check();await button(page,'ตกลง สร้างนัด').click();expect((await mock.state()).calls[0].summary).toBe('RESPECT · CHANGED PREVIEW TEXT');await mock.settle();expect(mock.external).toEqual([]);
});

test('calendar API UI: configured review is readable at mobile and desktop widths',async({page})=>{
 const mock=await mockService(page);await page.clock.setFixedTime(new Date('2026-11-08T16:59:59Z'));await reflectScreen(page);await button(page,'บอกฉันอีก 7 วัน').click();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(panel(page)).toContainText('13:00–13:15');await expect(panel(page)).toContainText('Asia/Bangkok');await panel(page).scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/journey-calendar-api-mock-review-'+width+'.png',fullPage:true});}
 expect((await mock.state()).calls).toEqual([]);expect(mock.external).toEqual([]);
});

test('calendar API UI: longest full card title wraps at 320px without draft or focus',async({page})=>{
 test.setTimeout(deckTimeout());
 const longest=shownCatalog.reduce((a:any,b:any)=>(a.headword.length+a.text.length>b.headword.length+b.text.length?a:b));
 const mock=await mockService(page);await page.setViewportSize({width:320,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(()=>{Math.random=()=>0.99999;});
 await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เปิดอ่าน').click();
 for(let i=0;i<deckSize&&await page.getByTestId('quote').getAttribute('data-quote-id')!==longest.id;i++)await button(page,'เปลี่ยนข้อความ').click();
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',longest.id);await button(page,'เลือกข้อความนี้').click();await page.getByRole('radio',{name:'ตนเอง',exact:true}).check();await button(page,'ต่อไป').click();await page.getByRole('textbox').fill('DO-NOT-EXPORT-LONG-CASE');await button(page,'กลับไปเลือกมุม').click();await button(page,'บอกฉันอีก 7 วัน').click();
 const title=panel(page).locator('.calendar-title');await expect(title).toHaveText(longest.headword+' · '+longest.text);
 const fit=await title.evaluate(el=>({fit:el.scrollHeight<=el.clientHeight&&el.scrollWidth<=el.clientWidth,ellipsis:getComputedStyle(el).textOverflow}));expect(fit.fit).toBe(true);expect(fit.ellipsis).not.toBe('ellipsis');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel(page).scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/journey-calendar-api-mock-longest-320.png',fullPage:true});
 await consent(page).check();await button(page,'ตกลง สร้างนัด').click();const calls=(await mock.state()).calls;expect(calls[0].summary).toBe(longest.headword+' · '+longest.text);expect(JSON.stringify(calls)).not.toContain('DO-NOT-EXPORT-LONG-CASE');expect(calls[0]).not.toHaveProperty('focus');await mock.settle();expect(mock.external).toEqual([]);
});
