export type Focus = 'self' | 'other' | 'things' | null;
export type Quote = { id: string; text: string; category: Exclude<Focus, null> };
export const quotes: Quote[] = [
 {id:'self-rest-is-care',category:'self',text:'การพักก็เป็นการดูแลตัวเอง'},
 {id:'self-tired',category:'self',text:'วันนี้ฉันเหนื่อย'},
 {id:'self-mistake',category:'self',text:'พลาดบ้างก็ได้'},
 {id:'self-rest',category:'self',text:'วันนี้ขอพักก่อน'},
 {id:'self-small-joy',category:'self',text:'เรื่องเล็ก ๆ ก็ทำให้ฉันยิ้มได้'},
 {id:'self-hope',category:'self',text:'ฉันยังมีเรื่องให้หวัง'},
 {id:'other-stay',category:'other',text:'อยู่เป็นเพื่อนหน่อยได้ไหม'},
 {id:'other-be-myself',category:'other',text:'กับเธอ ฉันเป็นตัวเองได้'},
 {id:'other-care',category:'other',text:'ขอบคุณที่ใส่ใจฉัน'},
 {id:'other-family',category:'other',text:'เรารักกัน ถึงจะกวนใจกันบ้าง'},
 {id:'other-courage',category:'other',text:'ฉันชื่นชมความกล้าของเธอ'},
 {id:'things-moon',category:'things',text:'พระจันทร์สวยจัง'},
 {id:'things-music',category:'things',text:'เพลงนี้มีความหมายกับฉัน'},
 {id:'things-rain',category:'things',text:'วันฝนตกกับชาสักแก้ว'},
 {id:'things-faith',category:'things',text:'ฉันวางใจในสิ่งที่เชื่อ'},
];
export const focusLabel = (focus: Focus) => ({self:'ตนเอง', other:'คนอื่น', things:'สิ่งอื่น'}[focus ?? 'self']);
export function shuffled(previous?: string) {
 const deck = quotes.map(q=>q.id);
 for(let i=deck.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];}
 if(deck[0]===previous) [deck[0],deck[1]]=[deck[1],deck[0]];
 return deck;
}
