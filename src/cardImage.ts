import {getFontEmbedCSS,toBlob} from 'html-to-image';

function checkActive(signal:AbortSignal){
 if(signal.aborted)throw new DOMException('Card preparation cancelled','AbortError');
}
async function waitForImages(node:HTMLElement){
 const images=Array.from(node.querySelectorAll('img'));
 const backgrounds=new Set<string>();
 for(const element of [node,...node.querySelectorAll<HTMLElement>('*')]){
  const background=getComputedStyle(element).backgroundImage;
  for(const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g))backgrounds.add(match[1]);
 }
 for(const source of backgrounds){const image=new Image();image.src=source;images.push(image);}
 await Promise.all(images.map(async image=>{
  await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Card artwork is unavailable');
 }));
}

/** Only the dedicated public card surface is captured; no application state is read. */
export async function prepareCardFile(node:HTMLElement,quoteId:string,signal:AbortSignal):Promise<File>{
 await document.fonts.ready;
 await waitForImages(node);
 checkActive(signal);
 // Resolve the current surface's font rules each time. A detached stale surface
 // must not seed an empty cache for the next card; the library caches resources.
 const embeddedFonts=await getFontEmbedCSS(node);
 checkActive(signal);
 const blob=await toBlob(node,{pixelRatio:2,backgroundColor:'#F7FCFB',fontEmbedCSS:embeddedFonts});
 checkActive(signal);
 if(!blob||!blob.size||blob.type!=='image/png')throw new Error('Card image could not be prepared');
 const safeId=quoteId.replace(/[^a-z0-9_-]+/gi,'-').slice(0,80)||'card';
 return new File([blob],'pick-a-word-'+safeId+'.png',{type:'image/png'});
}

export function canShareCard(file:File):boolean{
 try{return typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]});}
 catch{return false;}
}
