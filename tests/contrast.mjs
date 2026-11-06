import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:360,height:800}});
const pairs=[];
async function measure(label,selector){
 const colors=await page.locator(selector).first().evaluate(el=>{const s=getComputedStyle(el);return{foreground:s.color,background:s.backgroundColor};});
 const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 const a=lum(colors.foreground),b=lum(colors.background);const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 pairs.push({label,...colors,ratio:Number(ratio.toFixed(2)),AA_normal_text:ratio>=4.5});
}
try{
 await page.goto('http://127.0.0.1:5173');await page.evaluate(()=>document.fonts.ready);
 await measure('primary default','.primary');await page.locator('.primary').hover();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.primary')).backgroundColor==='rgb(0, 178, 163)');await measure('primary hover','.primary');
 await page.getByRole('button',{name:'เริ่ม',exact:true}).click();await measure('finish action','.finish');await page.getByRole('button',{name:'เลือกข้อความนี้',exact:true}).click();await measure('selected radio','.choices input:checked+span');
 await writeFile('evidence/contrast.json',JSON.stringify({pairs,fontLoaded:await page.evaluate(()=>document.fonts.check('16px Prompt'))},null,2));
 console.log(JSON.stringify(pairs,null,2));if(pairs.some(p=>!p.AA_normal_text))process.exitCode=1;
}finally{await browser.close();}
