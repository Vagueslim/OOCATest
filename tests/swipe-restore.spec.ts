import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {catalog} from './catalog-test-data';

const evidence=resolve('evidence/swipe-restore-20261110');
const records=['catalog-v1:ooca-006','catalog-v1:ooca-042','catalog-v1:ooca-002'].map(id=>catalog.find(quote=>quote.id===id)!);
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const frame=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
const settled=(page:Page)=>expect.poll(()=>page.locator('.quote-swiper').evaluate((element:any)=>element.swiper.animating)).toBe(false);
async function snapshot(page:Page){
 return page.locator('.quote-swiper').evaluate((element:any)=>{
  const view=element.getBoundingClientRect(),swiper=element.swiper;
  const slides=Array.from(element.querySelectorAll('.swiper-slide')).slice(0,3).map((node:any)=>{
   const box=node.getBoundingClientRect(),style=getComputedStyle(node),matrix=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);
   return {index:Number(node.dataset.deckIndex),active:node.classList.contains('swiper-slide-active'),opacity:Number(style.opacity),transform:style.transform,duration:parseFloat(style.transitionDuration),x:box.x,y:box.y,width:box.width,height:box.height,tx:matrix.m41,ty:matrix.m42,tz:matrix.m43,scaleX:matrix.m11,scaleY:matrix.m22,rotation:Math.atan2(matrix.m12,matrix.m11)*180/Math.PI};
  });
  return {effect:swiper.params.effect,speed:swiper.params.speed,cursor:swiper.activeIndex,animating:swiper.animating,translate:swiper.translate,touchesDiff:swiper.touches.diff,isTouched:swiper.touchEventsData.isTouched,isMoved:swiper.touchEventsData.isMoved,viewport:{x:view.x,y:view.y,width:view.width,height:view.height},overflowX:getComputedStyle(element).overflowX,slides};
 });
}
function record(name:string,value:unknown){mkdirSync(evidence,{recursive:true});writeFileSync(resolve(evidence,name+'.json'),JSON.stringify(value,null,2)+'\n');}

test.use({viewport:{width:390,height:844},reducedMotion:'no-preference'});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.99999;});
 await page.route('**/src/catalog.json*',route=>route.fulfill({contentType:'text/javascript',body:'export default '+JSON.stringify(records)+';'}));
 await page.goto('/');await button(page,'เปิดอ่าน').click();await page.evaluate(()=>document.fonts.ready);await settled(page);
});

test('swipe restore: real drag and arrow animate individual stacked cards with depth',async({page})=>{
 const before=await snapshot(page);
 const heading=page.getByTestId('quote').locator('.quote-headword');
 await heading.scrollIntoViewIfNeeded();const box=(await heading.boundingBox())!;
 const start={x:box.x+box.width-18,y:box.y+box.height/2};
 await page.mouse.move(start.x,start.y);await page.mouse.down();
 await page.mouse.move(start.x-145,start.y,{steps:12});await frame(page);
 const drag=await snapshot(page);
 const phase=before.effect==='cards'?'cards':'flat-baseline';
 await page.mouse.up();await settled(page);
 const afterDrag=await snapshot(page);
 record(`${phase}-drag-debug`,{before,drag,afterDrag});
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,`${phase}-after-drag-390.png`),fullPage:true});
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[1].id);
 await button(page,'ข้อความก่อนหน้า').click();await frame(page);
 const arrow=await snapshot(page);
 await page.screenshot({path:resolve(evidence,`${phase}-arrow-back-390.png`),fullPage:true});
 await settled(page);const returned=await snapshot(page);
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[0].id);
 const result={before,drag,afterDrag,arrow,returned};record(`${phase}-motion`,result);
 // The visible next card overlaps the active card and sits behind it at rest.
 const first=before.slides[0],next=before.slides[1];
 expect.soft(next.x).toBeLessThan(first.x+first.width);
 expect.soft(next.tz<0||next.scaleX<0.999,'next card should have stack depth or scale').toBe(true);
 // A flat carousel only translates its wrapper. Card motion must change the card itself.
 expect.soft(drag.slides[0].tx,'drag should move the active card transform').toBeLessThan(first.tx-5);
 expect.soft(arrow.slides.some(slide=>slide.duration>0),'arrow navigation should animate card transforms').toBe(true);
 expect.soft(arrow.slides[0].transform).not.toBe(returned.slides[0].transform);
 expect(await page.evaluate(()=>localStorage.getItem('ooca-demo:saved-quotes:v1'))).toBeNull();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('swipe restore: reduced motion keeps the same deck navigation without transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>page.locator('.quote-swiper').evaluate((element:any)=>element.swiper.params.speed)).toBe(0);
 await button(page,'เปลี่ยนข้อความ').click();await frame(page);
 const state=await snapshot(page);record('reduced-motion',state);
 await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[1].id);
 expect(state.animating).toBe(false);expect(state.slides.every(slide=>slide.duration===0)).toBe(true);
 await button(page,'ข้อความก่อนหน้า').click();await expect(page.getByTestId('quote')).toHaveAttribute('data-quote-id',records[0].id);
 expect(await page.evaluate(()=>localStorage.getItem('ooca-demo:saved-quotes:v1'))).toBeNull();
});
