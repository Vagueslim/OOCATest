import {test,expect,type Page} from '@playwright/test';
import {catalog,deckSize,shownIds,shownCatalog,deckTimeout} from './catalog-test-data';
import {characterByQuote} from '../src/characters';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const active=(page:Page)=>page.getByTestId('quote');
const key='ooca-demo:saved-quotes:v1';
async function browseTo(page:Page,id:string){
 for(let i=0;i<deckSize;i++){
  if(await active(page).getAttribute('data-quote-id')===id)return;
  await button(page,'เปลี่ยนข้อความ').click();
 }
 throw new Error(`Card not found: ${id}`);
}
async function noOverflow(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
test.beforeEach(async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{Math.random=()=>0.99999;});
 await page.goto(process.env.TEST_BASE_URL||'/');await page.evaluate(()=>document.fonts.ready);
 await button(page,'เปิดอ่าน').click();
});
test('Mooca: CALM uses exact Relaxing asset, keeps original tags and matches expanded view',async({page})=>{
 await browseTo(page,'catalog-v1:ooca-002');
 const q=catalog.find((q:any)=>q.id==='catalog-v1:ooca-002');
 await expect(active(page).locator('.character-tag')).toHaveText('Relaxing');
 await expect(active(page).locator('.quote-reading')).toHaveText('/ คาล์ม /');
 await expect(active(page).locator('.quote-thai')).toHaveText(q.text);
 await expect(active(page).locator('.quote-tags li')).toHaveText(q.tags);
 const artwork=active(page).getByRole('img',{name:'Mooca Relaxing'}),img=artwork.locator('img');
 await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(278);
 await expect(img).toHaveAttribute('aria-hidden','true');
 const geometry=await img.evaluate(el=>({naturalHeight:(el as HTMLImageElement).naturalHeight,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
 expect(geometry.naturalHeight).toBe(278);expect(geometry.width/geometry.height).toBeCloseTo(1,3);
 const slot=await artwork.boundingBox();expect(slot!.width).toBe(166);expect(slot!.height).toBe(176);
 await expect(active(page).locator('.quote-headword')).toHaveText(q.headword);
 const text=await active(page).locator('.quote-thai').boundingBox();
 const picture=await artwork.boundingBox();expect(text!.y+text!.height).toBeLessThanOrEqual(picture!.y+1);
 const card=await active(page).boundingBox();expect(picture!.x).toBeGreaterThanOrEqual(card!.x);expect(picture!.x+picture!.width).toBeLessThanOrEqual(card!.x+card!.width);
 await noOverflow(page);await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:'evidence/mooca-calm-browse-390.png',fullPage:true});
 const src=await img.getAttribute('src');
 await page.getByRole('button',{name:'ขยายข้อความ CALM',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.locator('.character-tag')).toHaveText('Relaxing');
 await expect(dialog.getByRole('img',{name:'Mooca Relaxing'}).locator('img')).toHaveAttribute('src',src!);
 await expect(dialog.locator('.quote-thai')).toHaveText(q.text);
 await expect(dialog.locator('.quote-tags li')).toHaveText(q.tags);
 await button(page,'เลือกข้อความนี้').scrollIntoViewIfNeeded();
 await expect(button(page,'เลือกข้อความนี้')).toBeInViewport();
 await page.screenshot({path:'evidence/mooca-calm-expanded-390.png'});
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBeNull();
 await button(page,'กลับไปดูการ์ด').click();
 await expect(active(page)).toHaveAttribute('data-quote-id',q.id);
 for(const width of [320,360,390,1440]){
  await page.setViewportSize({width,height:844});await noOverflow(page);
  const size=await artwork.boundingBox();expect(size!.width).toBe(166);expect(size!.height).toBe(176);
 }
});
test('Mooca: long sentence remains complete with its matched character in browse and expanded views',async({page})=>{
 test.setTimeout(deckTimeout());
 await browseTo(page,'catalog-v1:ooca-041');
 const q=catalog.find((q:any)=>q.id==='catalog-v1:ooca-041');
 await expect(active(page).locator('.quote-headword')).toHaveText(q.headword);
 await expect(active(page).locator('.quote-thai')).toHaveText(q.text);
 await expect(active(page).locator('.quote-tags li')).toHaveText(q.tags);
 await expect(active(page).locator('.character-tag')).toHaveText('Bookworm');
 await expect(active(page).getByRole('img',{name:'Mooca Bookworm'})).toBeVisible();
 await noOverflow(page);await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:'evidence/mooca-long-sentence-browse-390.png',fullPage:true});
 await page.getByRole('button',{name:/^ขยายข้อความ/}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.locator('.quote-headword')).toHaveText(q.headword);
 await expect(dialog.locator('.character-tag')).toHaveText('Bookworm');
 await expect(dialog.getByRole('img',{name:'Mooca Bookworm'})).toBeVisible();
 await expect(dialog.locator('.quote-thai')).toHaveText(q.text);
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await button(page,'เลือกข้อความนี้').scrollIntoViewIfNeeded();
 await expect(button(page,'เลือกข้อความนี้')).toBeInViewport();
 await page.screenshot({path:'evidence/mooca-long-sentence-expanded-390.png'});
 await dialog.locator('.quote-thai').scrollIntoViewIfNeeded();
 await expect(dialog.locator('.quote-thai')).toBeInViewport();
 await page.screenshot({path:'evidence/mooca-long-sentence-expanded-lower-390.png'});
 await button(page,'กลับไปดูการ์ด').click();
 await expect(active(page)).toHaveAttribute('data-quote-id',q.id);
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBeNull();
});


test('Mooca: every catalog card has one matched pose, preserved content tags and contained artwork',async({page})=>{
 test.setTimeout(deckTimeout(90000,1500));
 const seen=new Set<string>(),captured=new Set<string>();
 for(let i=0;i<deckSize;i++){
  const card=active(page),id=await card.getAttribute('data-quote-id');
  const q=catalog.find((q:any)=>q.id===id),character=characterByQuote[id!];
  expect(character).toBeTruthy();seen.add(id!);
  await expect(card.locator('.character-tag')).toHaveText(character.name);
  await expect(card.locator('.quote-character')).toHaveCount(1);
  await expect(card.getByRole('img',{name:`Mooca ${character.name}`})).toBeVisible();
  await expect(card.locator('.quote-headword')).toHaveText(q.headword);
  await expect(card.locator('.quote-thai')).toHaveText(q.text);
  await expect(card.locator('.quote-tags li')).toHaveText(q.tags);
  const image=card.locator('.quote-character'),bounds=(await image.boundingBox())!,outer=(await card.boundingBox())!;
  expect(bounds.width).toBe(166);expect(bounds.height).toBe(176);
  await expect(image).toHaveAttribute('data-source-kind',character.sourceKind);
  const asset=image.locator('img');await expect(asset).toHaveAttribute('aria-hidden','true');
  const intrinsic=await asset.evaluate(el=>({width:(el as HTMLImageElement).naturalWidth,height:(el as HTMLImageElement).naturalHeight}));
  expect(intrinsic).toEqual({width:character.width,height:character.height});
  const rendered=await asset.boundingBox();expect(rendered!.width/rendered!.height).toBeCloseTo(character.width/character.height,3);
  expect(bounds.x).toBeGreaterThanOrEqual(outer.x);expect(bounds.x+bounds.width).toBeLessThanOrEqual(outer.x+outer.width);
  await noOverflow(page);
  if(!captured.has(character.name)){
   await image.screenshot({path:`evidence/character-${character.name.toLowerCase().replaceAll(' ','-')}.png`});captured.add(character.name);
  }
  const src=await asset.getAttribute('src');
  await page.getByRole('button',{name:/^ขยายข้อความ/}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('.character-tag')).toHaveText(character.name);
  await expect(dialog.locator('.quote-character')).toHaveAttribute('data-character-name',character.name);
  await expect(dialog.locator('.quote-character img')).toHaveAttribute('src',src!);
  await expect(dialog.locator('.quote-thai')).toHaveText(q.text);
  await expect(dialog.locator('.quote-tags li')).toHaveText(q.tags);
  await button(page,'กลับไปดูการ์ด').click();
  await expect(active(page)).toHaveAttribute('data-quote-id',id!);
  await button(page,'เปลี่ยนข้อความ').click();
 }
 expect(seen.size).toBe(deckSize);expect([...seen].sort()).toEqual([...shownIds].sort());expect([...captured].sort()).toEqual([...new Set(shownCatalog.map(q=>characterByQuote[q.id].name))].sort());
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBeNull();
});
