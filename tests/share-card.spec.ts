import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const storage=(page:Page)=>page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
type ShareMode='success'|'pending'|'cancel'|'error'|'unsupported'|'missing';
async function mockShare(page:Page,mode:ShareMode='success'){
 const external:string[]=[];
 await page.route('**/*',route=>{
  const host=new URL(route.request().url()).hostname;
  if(host==='127.0.0.1'||host==='localhost')return route.continue();
  external.push(route.request().url());return route.abort();
 });
 await page.addInitScript(mode=>{
  Math.random=()=>0.99999;
  const state:any={calls:[],files:[],createdURLs:[],revokedURLs:[],resolve:null};
  (window as any).__share=state;
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=blob=>{const url=create(blob);state.createdURLs.push(url);return url;};
  URL.revokeObjectURL=url=>{state.revokedURLs.push(url);revoke(url);};
  Object.defineProperty(navigator,'canShare',{configurable:true,value:mode==='missing'?undefined:(data:ShareData)=>mode!=='unsupported'&&data.files?.length===1});
  Object.defineProperty(navigator,'share',{configurable:true,value:mode==='missing'?undefined:(data:ShareData)=>{
   state.calls.push({keys:Object.keys(data),active:navigator.userActivation.isActive,files:data.files?.map(file=>({name:file.name,type:file.type,size:file.size}))});
   state.files.push(...(data.files??[]));
   if(mode==='pending')return new Promise<void>(resolve=>{state.resolve=resolve;});
   if(mode==='cancel')return Promise.reject(new DOMException('User cancelled','AbortError'));
   if(mode==='error')return Promise.reject(new DOMException('Share blocked','NotAllowedError'));
   return Promise.resolve();
  }});
 },mode);
 return {external,state:()=>page.evaluate(()=>(window as any).__share.calls)};
}
async function reflect(page:Page){
 await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'เปิดอ่าน').click();await button(page,'เลือกข้อความนี้').click();
}
async function chooseOther(page:Page){
 await page.getByRole('radio',{name:'คนอื่น',exact:true}).check();
 await expect(page.locator('.share-card-trigger')).toBeEnabled({timeout:20000});
}

test('share card: only other focus offers sharing; PNG is public card only and sharing uses click activation',async({page})=>{
 const mock=await mockShare(page,'pending');await reflect(page);
 await expect(button(page,'แชร์การ์ด')).toHaveCount(0);
 await page.getByRole('radio',{name:'ตนเอง',exact:true}).check();await expect(button(page,'แชร์การ์ด')).toHaveCount(0);
 await page.getByRole('radio',{name:'สิ่งอื่น',exact:true}).check();await expect(button(page,'แชร์การ์ด')).toHaveCount(0);
 await chooseOther(page);expect(await mock.state()).toEqual([]);const before=await storage(page);
 await button(page,'ต่อไป').click();await page.getByRole('textbox').fill('PRIVATE MEMO 838218');await button(page,'กลับไปเลือกมุม').click();await expect(button(page,'แชร์การ์ด')).toBeEnabled({timeout:20000});
 const surface=page.locator('.share-card-surface');const quoteId=await page.getByTestId('quote').getAttribute('data-quote-id');
 const publicText=await surface.textContent();expect(publicText).not.toContain('PRIVATE MEMO');expect(publicText).not.toContain('นึกถึง:');expect(publicText).not.toContain('Google Calendar');
 await expect(surface.locator('textarea,fieldset,details,button,input')).toHaveCount(0);
 await button(page,'แชร์การ์ด').click();await expect(button(page,'แชร์การ์ด')).toBeDisabled();
 await button(page,'แชร์การ์ด').evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 const calls=await mock.state();expect(calls).toHaveLength(1);expect(calls[0].active).toBe(true);expect(calls[0].keys).toEqual(['files']);expect(calls[0].files[0].type).toBe('image/png');expect(calls[0].files[0].name).toContain(quoteId!.replace(/[^a-z0-9_-]+/gi,'-'));
 const image=await page.evaluate(async()=>{
  const file=(window as any).__share.files[0] as File;const bytes=Array.from(new Uint8Array(await file.arrayBuffer()));
  const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const colors=new Set<string>();let dark=0;for(let i=0;i<pixels.length;i+=68){colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);if(pixels[i]<120&&pixels[i+1]<160&&pixels[i+2]<170)dark++;}
  bitmap.close();return {bytes,width:canvas.width,height:canvas.height,colors:colors.size,dark};
 });
 expect(image.bytes.slice(0,8)).toEqual([137,80,78,71,13,10,26,10]);expect(image.width).toBe(780);expect(image.height).toBeGreaterThan(800);expect(image.height).toBeLessThan(6000);expect(image.colors).toBeGreaterThan(100);expect(image.dark).toBeGreaterThan(30);
 mkdirSync('evidence/share-card',{recursive:true});writeFileSync('evidence/share-card/public-card.png',Buffer.from(image.bytes));
 expect(await storage(page)).toEqual(before);expect(mock.external).toEqual([]);
 await page.evaluate(()=>(window as any).__share.resolve());await expect(page.locator('.share-card-status')).toHaveText('ส่งรูปไปยังระบบแชร์ของอุปกรณ์แล้ว');
 await button(page,'ต่อไป').click();await expect(page.getByRole('textbox')).toHaveValue('PRIVATE MEMO 838218');
 expect(await page.evaluate(()=>{const s=(window as any).__share;return s.createdURLs.every((url:string)=>s.revokedURLs.includes(url));})).toBe(true);
});

test('share card: cancelling does not report success, download or save',async({page})=>{
 const mock=await mockShare(page,'cancel');const downloads:string[]=[];page.on('download',download=>downloads.push(download.suggestedFilename()));
 await reflect(page);await chooseOther(page);const before=await storage(page);await button(page,'แชร์การ์ด').click();
 await expect(page.locator('.share-card-status')).toHaveText('ยกเลิกการแชร์แล้ว');await expect(button(page,'แชร์การ์ด')).toBeEnabled();await expect(button(page,'ดาวน์โหลดรูป')).toHaveCount(0);
 expect(downloads).toEqual([]);expect(await storage(page)).toEqual(before);expect(await mock.state()).toHaveLength(1);expect(mock.external).toEqual([]);
});

test('share card: non-cancellation failure offers an explicit PNG download without automatic download',async({page})=>{
 const mock=await mockShare(page,'error');const downloads:string[]=[];page.on('download',download=>downloads.push(download.suggestedFilename()));
 await reflect(page);await chooseOther(page);await button(page,'แชร์การ์ด').click();await expect(button(page,'ดาวน์โหลดรูป')).toBeEnabled();
 await expect(page.locator('.share-card-status')).toContainText('เปิดเมนูแชร์ไม่ได้');expect(downloads).toEqual([]);
 const download=page.waitForEvent('download');await button(page,'ดาวน์โหลดรูป').click();expect((await download).suggestedFilename()).toMatch(/^pick-a-word-.+\.png$/);expect(await mock.state()).toHaveLength(1);expect(mock.external).toEqual([]);
});

for(const mode of ['unsupported','missing'] as const)test('share card: '+mode+' file sharing offers download and never calls native share',async({page})=>{
 const mock=await mockShare(page,mode);await reflect(page);await chooseOther(page);await expect(button(page,'ดาวน์โหลดรูป')).toBeEnabled();await expect(button(page,'แชร์การ์ด')).toHaveCount(0);const before=await storage(page);
 const download=page.waitForEvent('download');await button(page,'ดาวน์โหลดรูป').click();expect((await download).suggestedFilename()).toMatch(/\.png$/);expect(await mock.state()).toEqual([]);expect(await storage(page)).toEqual(before);expect(mock.external).toEqual([]);
});

test('share card: a quote change during preparation cannot publish the previous card',async({page})=>{
 const mock=await mockShare(page);await page.setViewportSize({width:320,height:844});
 await page.addInitScript(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=async function(){await new Promise(resolve=>setTimeout(resolve,250));return decode.call(this);};});
 await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`
 import React from '/node_modules/.vite/deps/react.js';const {useState}=React;import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';const {createRoot}=ReactDOM;
 import ShareCard from '/src/ShareCard.tsx';import {quotes} from '/src/quotes.ts';import '/src/style.css';import '/src/journey.css';import '/src/stage.css';import '/src/figma.css';
 function Fixture(){const [index,setIndex]=useState(0);return React.createElement('main',null,React.createElement('button',{onClick:()=>setIndex(1)},'Switch quote'),React.createElement(ShareCard,{quote:quotes[index]}));}
 createRoot(document.getElementById('root')).render(React.createElement(Fixture));
 `}));
 await page.goto(process.env.TEST_BASE_URL||'/');await button(page,'Switch quote').click();await expect(button(page,'แชร์การ์ด')).toBeEnabled({timeout:20000});
 const id=await page.locator('.share-card-surface .quote-card').getAttribute('data-quote-id');await button(page,'แชร์การ์ด').click();
 const calls=await mock.state();expect(calls).toHaveLength(1);expect(calls[0].files[0].name).toContain(id!.replace(/[^a-z0-9_-]+/gi,'-'));
 const width=await page.evaluate(async()=>{const bitmap=await createImageBitmap((window as any).__share.files[0]);const width=bitmap.width;bitmap.close();return width;});expect(width).toBe(780);expect(mock.external).toEqual([]);
});

for(const kind of ['playful-tilt','back-view','native-svg','long-text'])test('share card image evidence: '+kind+' renders complete artwork and text at 2x',async({page})=>{
 const mock=await mockShare(page);await page.setViewportSize({width:390,height:844});
 await page.route('**/src/main.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`
 import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';const {createRoot}=ReactDOM;
 import ShareCard from '/src/ShareCard.tsx';import {quotes} from '/src/quotes.ts';import '/src/style.css';import '/src/journey.css';import '/src/stage.css';import '/src/figma.css';
 const kind=${JSON.stringify(kind)};
 const pose=kind==='playful-tilt'?'Playful Tilt':kind==='back-view'?'Back View':kind==='native-svg'?'Quiet Moment':null;
 const quote=pose?quotes.find(q=>q.character?.name===pose):quotes.reduce((a,b)=>a.headword.length+a.text.length>b.headword.length+b.text.length?a:b);
 createRoot(document.getElementById('root')).render(React.createElement('main',null,React.createElement(ShareCard,{quote})));
 `}));
 await page.goto(process.env.TEST_BASE_URL||'/');await expect(button(page,'แชร์การ์ด')).toBeEnabled({timeout:20000});
 const surface=page.locator('.share-card-surface');
 const bounds=await surface.evaluate(node=>{
  const box=node.getBoundingClientRect(),art=node.querySelector('.quote-character')!.getBoundingClientRect();
  return {width:node.clientWidth,height:node.clientHeight,art:{x:(art.left-box.left)*2,y:(art.top-box.top)*2,width:art.width*2,height:art.height*2},quoteId:node.querySelector('.quote-card')!.getAttribute('data-quote-id')};
 });
 expect(bounds.art.width).toBeGreaterThan(200);expect(bounds.art.height).toBeGreaterThan(200);
 expect(await surface.evaluate(node=>[...node.querySelectorAll('.quote-headword,.quote-thai,.quote-reading')].every(element=>element.scrollWidth<=element.clientWidth+1))).toBe(true);
 await button(page,'แชร์การ์ด').click();
 const image=await page.evaluate(async art=>{
  const file=(window as any).__share.files[0] as File;const bytes=Array.from(new Uint8Array(await file.arrayBuffer()));const bitmap=await createImageBitmap(file);
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0);
  const pixels=context.getImageData(Math.round(art.x),Math.round(art.y),Math.round(art.width),Math.round(art.height)).data;let colored=0;
  for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[i+1])>35||Math.abs(pixels[i+1]-pixels[i+2])>35)colored++;
  bitmap.close();return {bytes,width:canvas.width,height:canvas.height,colored};
 },bounds.art);
 expect(image.width).toBe(bounds.width*2);expect(image.height).toBe(bounds.height*2);expect(image.colored).toBeGreaterThan(100);
 mkdirSync('evidence/share-card',{recursive:true});writeFileSync('evidence/share-card/'+kind+'.png',Buffer.from(image.bytes));
 writeFileSync('evidence/share-card/'+kind+'.json',JSON.stringify({quoteId:bounds.quoteId,width:image.width,height:image.height,artworkColoredPixels:image.colored,nativeShareMocked:true,externalRequests:mock.external},null,2));
 expect(mock.external).toEqual([]);
});

test.describe('mobile touch activation',()=>{
 test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 test('share card: a real tap hands one PNG to native sharing within transient activation',async({page})=>{
  const mock=await mockShare(page,'pending');await reflect(page);await chooseOther(page);
  await button(page,'แชร์การ์ด').tap();
  // Cover TapButton's compatibility-click suppression window after pointerup.
  await page.waitForTimeout(550);
  const calls=await mock.state();expect(calls).toHaveLength(1);expect(calls[0].active).toBe(true);expect(calls[0].files[0].type).toBe('image/png');
  const header=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as any).__share.files[0].slice(0,8).arrayBuffer())));
  expect(header).toEqual([137,80,78,71,13,10,26,10]);expect(mock.external).toEqual([]);
  await page.evaluate(()=>(window as any).__share.resolve());
 });
});
