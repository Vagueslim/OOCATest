import catalog from './catalog.json';
export type Focus = 'self' | 'other' | 'things' | null;
export type Quote = {id:string;type:string;headword:string;language:string;reading:string|null;readingKind:string;partOfSpeech:string|null;original:string;translation:string;text:string;tags:string[]};
export const quotes:Quote[]=catalog;
export const snapshotText=(q:Quote)=>[q.headword,[q.reading?`/ ${q.reading} /`:null,q.partOfSpeech].filter(Boolean).join(' '),'ข้อความไทยเรียบเรียง · ร่างยังไม่ตรวจ',q.text].filter(Boolean).join('\n');
export const focusLabel = (focus: Focus) => ({self:'ตนเอง', other:'คนอื่น', things:'สิ่งอื่น'}[focus ?? 'self']);
export function shuffled(previous?: string) {
 const deck = quotes.map(q=>q.id);
 for(let i=deck.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];}
 if(deck[0]===previous) [deck[0],deck[1]]=[deck[1],deck[0]];
 return deck;
}
