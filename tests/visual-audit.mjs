import { chromium } from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const runtime=process.env.OOCA_VISUAL_RUNTIME;
if(!runtime) throw Error('Set OOCA_VISUAL_RUNTIME to the shared visual-runtime scripts directory');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:360,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let css=await readFile('src/style.css','utf8');
for (const font of ['Prompt-Regular.ttf','Prompt-SemiBold.ttf']) {
 const bytes=await readFile(`public/fonts/${font}`);
 css=css.replace(`/fonts/${font}`,`data:font/ttf;base64,${bytes.toString('base64')}`);
}
await mkdir('evidence/snapshots',{recursive:true});
const results=[];
async function check(name,viewport='360x800'){
 await page.evaluate(()=>document.fonts.ready);
 const file=path.resolve(`evidence/snapshots/${name}.html`);
 const markup=await page.locator('main').evaluate(el=>el.outerHTML);
 await writeFile(file,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body>${markup}</body></html>`);
 const result=spawnSync(process.execPath,[path.join(runtime,'visual_lint.mjs'),'--html',file,'--output',path.resolve(`evidence/lint-${name}.json`),'--viewport',viewport],{encoding:'utf8'});
 results.push({name,exit:result.status,output:result.stdout,error:result.stderr});
}
try{
 await page.goto('http://127.0.0.1:5173');await check('welcome');
 await page.getByRole('button',{name:'เริ่ม',exact:true}).click();await check('discover');
 await page.getByRole('button',{name:'เลือกข้อความนี้',exact:true}).click();
 await page.getByRole('radio',{name:'สิ่งอื่น',exact:true}).check();await page.getByRole('textbox').fill('คำนี้ทำให้นึกถึงเพลงที่ชอบ');await check('reflect');
 await page.setViewportSize({width:1440,height:900});await check('reflect-desktop','1440x900');await page.setViewportSize({width:360,height:800});
 await page.getByRole('button',{name:'จบเมื่อพร้อม',exact:true}).first().click();await check('done');
 await page.getByRole('button',{name:'ดูข้อความที่เก็บไว้',exact:true}).click();await check('history');
 await page.getByRole('button',{name:'กลับ',exact:true}).click();await page.getByRole('button',{name:'เริ่มรอบใหม่',exact:true}).click();await page.getByRole('button',{name:'วันนี้ยังไม่เลือก',exact:true}).click();await page.getByRole('button',{name:'รับกอด',exact:true}).click();await check('no-selection');
 await writeFile('evidence/visual-audit.json',JSON.stringify({errors,results},null,2));
 console.log(JSON.stringify({errors,results:results.map(({name,exit})=>({name,exit}))},null,2));
}finally{await browser.close();}
