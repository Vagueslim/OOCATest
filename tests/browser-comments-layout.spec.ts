import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const evidence=resolve('evidence/browser-comments-20261110');
test.use({reducedMotion:'reduce'});

for(const viewport of [{width:665,height:604},{width:390,height:844},{width:1440,height:900},{width:390,height:604},{width:320,height:604},{width:360,height:604}]){
 test(`browser comment: welcome envelope is centered at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect.poll(()=>page.locator('.welcome-envelope>img').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const geometry=await page.evaluate(()=>{
   const content=document.querySelector<HTMLElement>('.welcome-content')!;
   const figure=document.querySelector<HTMLElement>('.welcome-envelope')!;
   const image=document.querySelector<HTMLImageElement>('.welcome-envelope>img')!;
   const rect=(element:HTMLElement)=>{const box=element.getBoundingClientRect();return {x:box.x,y:box.y,width:box.width,height:box.height,centerX:box.x+box.width/2};};
   const style=getComputedStyle(figure),contentStyle=getComputedStyle(content);
   const imageBox=rect(image),contentBox=rect(content);
   return {
    viewport:{width:innerWidth,height:innerHeight,centerX:innerWidth/2},
    content:{...contentBox,maxWidth:contentStyle.maxWidth,paddingLeft:contentStyle.paddingLeft,paddingRight:contentStyle.paddingRight},
    figure:{...rect(figure),maxWidth:style.maxWidth,marginLeft:style.marginLeft,marginRight:style.marginRight},
    image:{...imageBox,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight},
    centerDeltaToViewport:imageBox.centerX-innerWidth/2,
    centerDeltaToContent:imageBox.centerX-contentBox.centerX,
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
   };
  });
  const aligned=Math.abs(geometry.centerDeltaToViewport)<=1&&Math.abs(geometry.centerDeltaToContent)<=1;
  const stem=`centering-${viewport.width}x${viewport.height}-${aligned?'aligned':'offcenter'}`;
  mkdirSync(evidence,{recursive:true});
  writeFileSync(resolve(evidence,`${stem}.json`),JSON.stringify(geometry,null,2)+'\n');
  await page.screenshot({path:resolve(evidence,`${stem}.png`),fullPage:true});
  expect(geometry.horizontalOverflow).toBe(false);
  expect(geometry.image.width/geometry.image.height).toBeCloseTo(geometry.image.naturalWidth/geometry.image.naturalHeight,2);
  expect(Math.abs(geometry.centerDeltaToContent),'envelope center vs content center').toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.centerDeltaToViewport),'envelope center vs viewport center').toBeLessThanOrEqual(1);
 });
}
