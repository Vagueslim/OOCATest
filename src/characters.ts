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
