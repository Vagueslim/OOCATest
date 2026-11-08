import {test,expect,type Page,type CDPSession} from '@playwright/test';
test.setTimeout(90000);
test.use({hasTouch:true,isMobile:true,viewport:{width:360,height:800}});
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const sessions=new WeakMap<Page,CDPSession>();
const id=(p:Page)=>p.getByTestId('quote').getAttribute('data-quote-id');
async function swipe(p:Page,dx:number,dy=0,selector='.quote-headword'){
 const target=selector==='[data-testid="select-control"]'?p.locator(selector):p.getByTestId('quote').locator(selector);await target.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));const b=(await target.boundingBox())!;
 const x=dx<0?b.x+b.width-15:b.x+15,y=Math.max(180,Math.min((p.viewportSize()?.height||800)-180,b.y+b.height/2));
 const beforeScroll=await p.evaluate(()=>scrollY);
 let c=sessions.get(p);if(!c){c=await p.context().newCDPSession(p);sessions.set(p,c);}
 // Reproduce a moving release: no dwell or compensating tap.
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=6;i++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});await p.waitForTimeout(20);}
 await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
 if(dy<0)await expect.poll(()=>p.evaluate(()=>scrollY)).toBeGreaterThan(beforeScroll);

}
test.beforeEach(async({page})=>{await page.goto(process.env.TEST_BASE_URL||'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await button(page,'ลองเปิดอ่าน').click();});
test('swipe: left next, right previous, first boundary, replay and no save',async({page})=>{
 const first=await id(page);await expect(button(page,'ข้อความก่อนหน้า')).toBeDisabled();await swipe(page,140);expect(await id(page)).toBe(first);
 await swipe(page,-140);const second=await id(page);expect(second).not.toBe(first);await expect(button(page,'ข้อความก่อนหน้า')).toBeEnabled();
 await swipe(page,140);expect(await id(page)).toBe(first);await swipe(page,-140);expect(await id(page)).toBe(second);
 await button(page,'ข้อความก่อนหน้า').focus();await page.keyboard.press('Enter');expect(await id(page)).toBe(first);
 await button(page,'เปลี่ยนข้อความ').focus();await page.keyboard.press('Enter');expect(await id(page)).toBe(second);
 expect(await page.evaluate(()=>localStorage.getItem('ooca-demo:saved-quotes:v1'))).toBeNull();
 await page.screenshot({path:'evidence/swipe-mobile.png',fullPage:true});
 await button(page,'เลือกข้อความนี้').click();expect(await id(page)).toBe(second);await button(page,'จบเมื่อพร้อม').first().click();await expect(page.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeVisible();
});
test('swipe: vertical scroll, short drag and details touch never browse',async({page})=>{
 for(let i=0;i<53&&await id(page)!=='catalog-v1:ooca-042';i++)await button(page,'เปลี่ยนข้อความ').click();const first=await id(page);await swipe(page,-25);expect(await id(page)).toBe(first);
 await swipe(page,0,-150);expect(await id(page)).toBe(first);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
 await swipe(page,-140,0,'.source-details summary');expect(await id(page)).toBe(first);

});
test('touch: native details and select button do not browse',async({page})=>{
 const first=await id(page);
 const wasOpen=await page.getByTestId('quote').locator('.source-details').evaluate(el=>(el as HTMLDetailsElement).open);await page.getByTestId('quote').locator('.source-details summary').tap();await expect.poll(()=>page.getByTestId('quote').locator('.source-details').evaluate(el=>(el as HTMLDetailsElement).open)).toBe(!wasOpen);expect(await id(page)).toBe(first);
 await button(page,'เลือกข้อความนี้').tap();await expect(page.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeVisible();expect(await id(page)).toBe(first);
});
test('swipe: deck seam and previous/next reuse visited cards',async({page})=>{
 const seen=[await id(page)];for(let i=1;i<53;i++){await button(page,'เปลี่ยนข้อความ').click();seen.push(await id(page));}
 expect(new Set(seen).size).toBe(53);await swipe(page,-140);const next=await id(page);expect(next).not.toBe(seen[52]);
 await swipe(page,140);expect(await id(page)).toBe(seen[52]);await swipe(page,140);expect(await id(page)).toBe(seen[51]);
 await button(page,'เปลี่ยนข้อความ').click();expect(await id(page)).toBe(seen[52]);await swipe(page,-140);expect(await id(page)).toBe(next);
});

test('regression: repeated swipes, vertical scroll, details drag, tap and select in one session',async({page})=>{
 for(let i=0;i<53&&await id(page)!=='catalog-v1:ooca-042';i++)await button(page,'เปลี่ยนข้อความ').click();
 const first=await id(page);
 for(let round=0;round<3;round++){
  await swipe(page,-140);expect(await id(page)).not.toBe(first);await swipe(page,140);expect(await id(page)).toBe(first);
  await swipe(page,-25);expect(await id(page)).toBe(first);
  await swipe(page,0,-150);expect(await id(page)).toBe(first);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await swipe(page,-140,0,'.source-details summary');expect(await id(page)).toBe(first);
  const details=page.getByTestId('quote').locator('.source-details');const before=await details.evaluate(el=>(el as HTMLDetailsElement).open);
  await details.locator('summary').tap();await expect.poll(()=>details.evaluate(el=>(el as HTMLDetailsElement).open)).toBe(!before);
  await details.locator('summary').tap();await expect.poll(()=>details.evaluate(el=>(el as HTMLDetailsElement).open)).toBe(before);
 }
 expect(await page.evaluate(()=>localStorage.getItem('ooca-demo:saved-quotes:v1'))).toBeNull();
 await button(page,'เลือกข้อความนี้').tap();expect(await id(page)).toBe(first);await expect(page.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeVisible();
 await button(page,'จบเมื่อพร้อม').first().tap();await expect(page.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeVisible();
});

test('touch activation: no duplicate toggle, no activation from button drag, keyboard still works',async({page})=>{
 const first=await id(page),details=page.getByTestId('quote').locator('.source-details');
 await details.locator('summary').tap();await page.waitForTimeout(600);await expect(details).toHaveAttribute('open','');
 await details.locator('summary').focus();await page.keyboard.press('Enter');await expect(details).not.toHaveAttribute('open','');
 const select=button(page,'เลือกข้อความนี้');await select.evaluate(el=>el.setAttribute('data-testid','select-control'));
 await swipe(page,-90,0,'[data-testid="select-control"]');await expect(page.getByRole('heading',{name:'พบข้อความ'})).toBeVisible();expect(await id(page)).toBe(first);
 await select.tap();await expect(page.getByRole('heading',{name:'ข้อความที่เราเลือก'})).toBeVisible();
 await button(page,'จบเมื่อพร้อม').first().tap();await expect(page.getByRole('heading',{name:'จบรอบนี้แล้ว'})).toBeVisible();
});
