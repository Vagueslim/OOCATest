export type Character = {
 name:string;
 image:string;
 width:number;
 height:number;
 sourceNode?:string;
 sourceKind:'supplied-reference'|'supplied-character-sheet';
 tile?:{x:number;y:number;sheetWidth:number;sheetHeight:number};
};

const sheet=new URL('./assets/mooca/character-sheet.png',import.meta.url).href;
const names=[
 'Friendly Stand','Cloud Rider','Relaxing',
 'Moon Dreamer','Glowing Heart','Safe Bubble',
 'Bookworm','Rainy Day','Shy Smile',
 'Heart Hug','Back View','Playful Tilt',
 'Bench Break','Curious','Quiet Moment',
 'Mirror Peek','Balloon Explorer','Sunny Friend',
 'Friendly Doctor','Caring Listener','Cozy Reader'
] as const;
export type CharacterName=typeof names[number];
const rows=[235,436,650,864,1078,1292,1520];
const columns=[45,216,387];
// Render original, unmodified sheet pixels as a sprite. Each entire artwork tile
// is retained, including the supplied pale background. Nothing is redrawn.
export const characters=Object.fromEntries(names.map((name,index)=>[name,{
 name,image:sheet,width:158,height:158,sourceKind:'supplied-character-sheet',
 tile:{x:columns[index%3],y:rows[Math.floor(index/3)],sheetWidth:609,sheetHeight:2048}
}])) as Record<CharacterName,Character>;
// The user's SVG includes a higher-resolution, separately embedded Relaxing PNG.
characters.Relaxing={
 name:'Relaxing',image:new URL('./assets/mooca/relaxing.png',import.meta.url).href,
 width:364,height:225,sourceKind:'supplied-reference',
 sourceNode:'https://www.figma.com/design/3PGPbkxDkElsmp7WXKn5nx/?node-id=2012-2840'
};
const assignments:CharacterName[]=[
 'Shy Smile','Relaxing','Heart Hug','Curious','Bench Break','Quiet Moment',
 'Balloon Explorer','Moon Dreamer','Bookworm','Caring Listener','Cloud Rider',
 'Mirror Peek','Balloon Explorer','Glowing Heart','Cozy Reader','Friendly Stand',
 'Safe Bubble','Balloon Explorer','Curious','Bookworm','Moon Dreamer','Heart Hug',
 'Glowing Heart','Friendly Doctor','Bookworm','Cozy Reader','Heart Hug','Glowing Heart',
 'Quiet Moment','Safe Bubble','Balloon Explorer','Mirror Peek','Caring Listener',
 'Back View','Shy Smile','Glowing Heart','Quiet Moment','Quiet Moment','Rainy Day',
 'Glowing Heart','Bookworm','Sunny Friend','Playful Tilt','Friendly Stand','Back View',
 'Sunny Friend','Back View','Cloud Rider','Balloon Explorer','Playful Tilt','Curious',
 'Heart Hug','Quiet Moment'
];
export const characterByQuote:Record<string,Character>=Object.fromEntries(
 assignments.map((name,index)=>[`catalog-v1:ooca-${String(index+1).padStart(3,'0')}`,characters[name]])
);

// Lot2 semantic pose assignments are drafts; see the per-card rationale in
// evidence/catalog-visibility/lot2-mooca-mappings.json. Original 001-053 mappings stay unchanged.
const lot2Assignments:Record<string,CharacterName>={
  "catalog-v1:ooca-054": "Safe Bubble",
  "catalog-v1:ooca-055": "Heart Hug",
  "catalog-v1:ooca-056": "Moon Dreamer",
  "catalog-v1:ooca-057": "Caring Listener",
  "catalog-v1:ooca-058": "Glowing Heart",
  "catalog-v1:ooca-059": "Back View",
  "catalog-v1:ooca-060": "Sunny Friend",
  "catalog-v1:ooca-061": "Bookworm",
  "catalog-v1:ooca-062": "Curious",
  "catalog-v1:ooca-063": "Mirror Peek",
  "catalog-v1:ooca-064": "Heart Hug",
  "catalog-v1:ooca-065": "Bookworm",
  "catalog-v1:ooca-066": "Heart Hug",
  "catalog-v1:ooca-067": "Quiet Moment",
  "catalog-v1:ooca-068": "Playful Tilt",
  "catalog-v1:ooca-069": "Quiet Moment",
  "catalog-v1:ooca-070": "Mirror Peek",
  "catalog-v1:ooca-071": "Balloon Explorer",
  "catalog-v1:ooca-072": "Mirror Peek",
  "catalog-v1:ooca-073": "Rainy Day",
  "catalog-v1:ooca-074": "Curious",
  "catalog-v1:ooca-075": "Sunny Friend",
  "catalog-v1:ooca-076": "Rainy Day",
  "catalog-v1:ooca-077": "Balloon Explorer",
  "catalog-v1:ooca-078": "Playful Tilt",
  "catalog-v1:ooca-079": "Rainy Day",
  "catalog-v1:ooca-080": "Back View",
  "catalog-v1:ooca-081": "Friendly Stand",
  "catalog-v1:ooca-082": "Rainy Day",
  "catalog-v1:ooca-083": "Bookworm",
  "catalog-v1:ooca-084": "Heart Hug",
  "catalog-v1:ooca-085": "Bench Break",
  "catalog-v1:ooca-086": "Balloon Explorer",
  "catalog-v1:ooca-087": "Playful Tilt",
  "catalog-v1:ooca-088": "Sunny Friend",
  "catalog-v1:ooca-089": "Bookworm",
  "catalog-v1:ooca-090": "Rainy Day",
  "catalog-v1:ooca-091": "Back View",
  "catalog-v1:ooca-092": "Curious",
  "catalog-v1:ooca-093": "Mirror Peek",
  "catalog-v1:ooca-094": "Curious",
  "catalog-v1:ooca-095": "Back View",
  "catalog-v1:ooca-096": "Playful Tilt",
  "catalog-v1:ooca-097": "Back View",
  "catalog-v1:ooca-098": "Curious",
  "catalog-v1:ooca-099": "Quiet Moment",
  "catalog-v1:ooca-100": "Caring Listener",
  "catalog-v1:ooca-101": "Quiet Moment",
  "catalog-v1:ooca-102": "Back View",
  "catalog-v1:ooca-103": "Friendly Stand",
  "catalog-v1:ooca-104": "Moon Dreamer",
  "catalog-v1:ooca-105": "Quiet Moment",
  "catalog-v1:ooca-106": "Relaxing"
};
for(const [id,name] of Object.entries(lot2Assignments))characterByQuote[id]=characters[name];
