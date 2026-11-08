import {test,expect,type Page} from '@playwright/test';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function capture(page:Page,name:string){
 await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`evidence/journey-${name}.png`,fullPage:true});
}
test('journey: deterministic five-screen evidence and narrow/wide layouts',async({page})=>{
 test.setTimeout(60000);
 await page.addInitScript(()=>{Math.random=()=>0.99999;});
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [390,320,1440]){
  await page.setViewportSize({width,height:844});await page.goto(process.env.TEST_BASE_URL||'/');
  await button(page,'ลองเปิดอ่าน').click();await capture(page,`discover-${width}`);
  await button(page,'เลือกข้อความนี้').click();await capture(page,`focus-${width}`);
  await page.getByRole('radio',{name:'ตนเอง',exact:true}).check();
  await button(page,'ต่อไป').click();await page.getByRole('textbox').fill('วันนี้ค่อย ๆ ให้เวลากับตัวเอง');
  await capture(page,`writing-${width}`);
  await button(page,'จบ').click();await capture(page,`done-${width}`);
  await button(page,'เลือกคำใหม่').click();await button(page,'วันนี้ยังไม่เลือก').click();
  await expect(page.getByRole('button')).toHaveCount(1);
  await expect(button(page,'กลับไปหน้าแรก')).toBeInViewport();
  await capture(page,`skip-${width}`);
  await button(page,'กลับไปหน้าแรก').click();
  await expect(page.getByRole('heading',{name:'ค่อย ๆ อยู่กับคำหนึ่งคำ',exact:true})).toBeFocused();
 }
});
