import {mkdir} from 'node:fs/promises';

export default async function globalSetup(){
 const evidence=new URL('../evidence/',import.meta.url);
 // Prepare screenshot/report destinations on every run, including fresh CI checkouts.
 await Promise.all([
  '',
  'figma-20261110/',
  'browser-comments-20261110/',
  'swipe-restore-20261110/',
  'share-card/',
 ].map(directory=>mkdir(new URL(directory,evidence),{recursive:true})));
}
