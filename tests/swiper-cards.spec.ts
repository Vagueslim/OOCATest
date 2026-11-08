import {test,expect,type Page} from '@playwright/test';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const active=(page:Page)=>page.getByTestId('quote');
const id=(page:Page)=>active(page).getAttribute('data-quote-id');
const settled=(page:Page)=>expect.poll(()=>page.locator('.quote-swiper').evaluate((el:any)=>el.swiper.animating)).toBe(false);
test.beforeEach(async({page})=>{
 await page.goto(process.env.TEST_BASE_URL||'/');
 await expect(page).toHaveTitle('Peek a word!');
 await expect(page.getByRole('heading',{name:'ค่อย ๆ อยู่กับคำหนึ่งคำ',exact:true})).toBeVisible();
 await button(page,'ลองเปิดอ่าน').click();
});

test('cards: desktop mouse drag, button animation, active accessibility and source expansion',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 const first=await id(page);
 await expect(page.locator('.swiper-cards')).toBeVisible();
 await expect(page.locator('.swiper-slide:not([inert])')).toHaveCount(1);
 await button(page,'เปลี่ยนข้อความ').click();const second=await id(page);expect(second).not.toBe(first);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 expect(await page.locator('.swiper-slide-active').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeGreaterThan(0);
 await settled(page);
 await button(page,'ข้อความก่อนหน้า').click();await settled(page);expect(await id(page)).toBe(first);
 const heading=active(page).locator('.quote-headword');await heading.scrollIntoViewIfNeeded();const box=(await heading.boundingBox())!;
 await page.mouse.move(box.x+box.width-15,box.y+box.height/2);
 await page.mouse.down();await page.mouse.move(box.x+15,box.y+box.height/2,{steps:12});await page.mouse.up();await settled(page);
 expect(await id(page)).toBe(second);
 const before=(await page.locator('.quote-swiper').boundingBox())!.height;
 await active(page).locator('summary').click();
 await expect(active(page).locator('details')).toHaveAttribute('open','');
 await expect.poll(async()=>(await page.locator('.quote-swiper').boundingBox())!.height).toBeGreaterThan(before);
 await active(page).locator('summary').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'evidence/swiper-cards-desktop.png',fullPage:true});
});

test('cards: narrow and large phones keep the front card and two previews within the page',async({page})=>{
 for(const width of [320,360,390]){
  await page.setViewportSize({width,height:844});
  await settled(page);
  const geometry=await page.locator('.swiper-slide').evaluateAll(els=>{
   const front=els.find(e=>e.classList.contains('swiper-slide-active'))!;
   const next=front.nextElementSibling!,second=next.nextElementSibling!;
   return [front,next,second].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,height:r.height};});
  });
  expect(geometry[1].right).toBeGreaterThan(geometry[0].right);
  expect(geometry[2].right).toBeGreaterThan(geometry[1].right);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'evidence/swiper-cards-'+width+'.png',fullPage:true});
 }
});

test('cards: selection during movement uses the visible current card, and a new round resets browsing',async({page})=>{
 const first=await id(page);await button(page,'เปลี่ยนข้อความ').click();
 const selected=await id(page);expect(selected).not.toBe(first);
 await button(page,'เลือกข้อความนี้').click();expect(await id(page)).toBe(selected);
 await expect(page.locator('.quote-swiper')).toHaveCount(0);
 await button(page,'จบเมื่อพร้อม').first().click();await button(page,'เลือกคำใหม่').click();
 await expect(button(page,'ข้อความก่อนหน้า')).toBeDisabled();
 await expect(page.locator('.swiper-slide-active')).toHaveAttribute('data-deck-index','0');
 expect(await page.evaluate(()=>localStorage.getItem('ooca-demo:saved-quotes:v1'))).toBeNull();
});

test('cards: reduced motion keeps browsing without animated transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>page.locator('.quote-swiper').evaluate((el:any)=>el.swiper.params.speed)).toBe(0);
 const first=await id(page);await button(page,'เปลี่ยนข้อความ').click();
 expect(await id(page)).not.toBe(first);
 expect(await page.locator('.swiper-slide-active').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
 await button(page,'ข้อความก่อนหน้า').click();expect(await id(page)).toBe(first);
});
