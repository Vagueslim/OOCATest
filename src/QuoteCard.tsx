import {useRef} from 'react';
import {TapButton,TapSummary} from './TouchControls';
import type {Quote} from './quotes';
export default function QuoteCard({quote:q,active=true,expanded=false,onExpand}:{quote:Quote;active?:boolean;expanded?:boolean;onExpand?:(source:HTMLElement,opener:HTMLElement)=>void}) {
 const tapStart=useRef({x:0,y:0});
 const dragged=useRef(false);
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
 return <article className={`quote-card ${q.type==='sentence'?'sentence-card':''}`} data-testid={active?"quote":undefined} data-quote-id={q.id}>
  <div className="quote-card-content">{content}{onExpand&&<TapButton className="card-expand-control" aria-label={`ขยายข้อความ ${q.headword}`} aria-haspopup="dialog" onPointerDownCapture={event=>{tapStart.current={x:event.clientX,y:event.clientY};dragged.current=false;}} onPointerMoveCapture={event=>{if(event.buttons&&Math.hypot(event.clientX-tapStart.current.x,event.clientY-tapStart.current.y)>12)dragged.current=true;}} onPointerCancelCapture={()=>{dragged.current=true;}} onKeyDownCapture={()=>{dragged.current=false;}} onClick={event=>{if(!dragged.current)onExpand(event.currentTarget.closest('.quote-card') as HTMLElement,event.currentTarget);}}/>}</div>
  <details className="source-details" open={expanded||undefined}><TapSummary>ต้นฉบับและคำแปลร่าง</TapSummary><p className="source-text">{q.original}</p><p>คำแปลไทย (ร่าง): {q.translation}</p></details>
 </article>;
}
