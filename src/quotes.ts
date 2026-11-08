import catalog from './catalog.json';
import {characterByQuote} from './characters';
import type {Character} from './characters';
export type Focus = 'self' | 'other' | 'things' | null;
export type QuoteStatus = 0 | 1;
export type Quote = {id:string;status?:QuoteStatus;type:string;headword:string;language:string;reading:string|null;readingKind:string;partOfSpeech:string|null;original:string;translation:string;text:string;tags:string[];character?:Character};
// Legacy records without status remain visible. Unexpected values fail closed.
export const normalizeQuoteStatus=(status:unknown):QuoteStatus=>status===undefined||status===1?1:0;
export const isQuoteVisible=(quote:{status?:unknown})=>normalizeQuoteStatus(quote.status)===1;
// Keep every record for stable ID lookup; only new decks use the visible subset.
export const quotes:Quote[]=catalog.map(quote=>({...quote,status:normalizeQuoteStatus(quote.status),character:characterByQuote[quote.id]}));
export const visibleQuotes:Quote[]=quotes.filter(isQuoteVisible);
export const snapshotText=(q:Quote)=>[q.headword,[q.reading?`/ ${q.reading} /`:null,q.partOfSpeech].filter(Boolean).join(' '),'ข้อความไทยเรียบเรียง · ร่างยังไม่ตรวจ',q.text].filter(Boolean).join('\n');
export const focusLabel = (focus: Focus) => ({self:'ตนเอง', other:'คนอื่น', things:'สิ่งอื่น'}[focus ?? 'self']);
export function shuffled(previous?: string) {
 const deck = visibleQuotes.map(q=>q.id);
 for(let i=deck.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];}
 if(deck.length>1&&deck[0]===previous) [deck[0],deck[1]]=[deck[1],deck[0]];
 return deck;
}
