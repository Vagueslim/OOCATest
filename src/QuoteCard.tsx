import {TapSummary} from './TouchControls';
import type {Quote} from './quotes';
import SwipeCard from './SwipeCard';
export default function QuoteCard({quote:q,browse}:{quote:Quote;browse?:{onNext:()=>void;onPrevious:()=>void}}) {
 const content=<>
  <span className="quote-type">{q.type==='sentence'?'ประโยค / ข้อความ':'คำ / นิยาม'}</span>
  <h2 className="quote-headword" lang={q.language}>{q.headword}</h2>
  <span className="card-line" aria-hidden="true"/>
  {(q.reading||q.partOfSpeech)&&<p className="quote-reading">{q.reading&&<span title={q.readingKind}>/ {q.reading} /</span>}{q.reading&&q.partOfSpeech?' ':null}{q.partOfSpeech&&<span lang="en">{q.partOfSpeech}</span>}</p>}
  <p className="quote-thai" lang="th">{q.text}</p>
  <p className="quote-status">ข้อความไทยเรียบเรียง · ร่างยังไม่ตรวจ</p>
  {q.reading&&<p className="reading-status">{q.readingKind} · ยังต้องตรวจเสียงอ่าน</p>}
  <ul className="quote-tags" aria-label="แท็กเนื้อหาร่าง">{q.tags.map(tag=><li key={tag}>{tag}</li>)}</ul>
 </>;
 return <article className={`quote-card ${q.type==='sentence'?'sentence-card':''}`} data-testid="quote" data-quote-id={q.id}>
  {browse?<SwipeCard {...browse}>{content}</SwipeCard>:content}
  <details className="source-details"><TapSummary>ต้นฉบับและคำแปลร่าง</TapSummary><p className="source-text">{q.original}</p><p>คำแปลไทย (ร่าง): {q.translation}</p></details>
 </article>;
}
