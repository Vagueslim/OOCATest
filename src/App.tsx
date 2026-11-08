import {TapButton,TapSummary} from './TouchControls';
import {useEffect,useRef,useState} from 'react';
import {quotes,shuffled,focusLabel,snapshotText} from './quotes';
import type {Focus} from './quotes';
import {saveQuote} from './storage';
import type {SavedQuote} from './storage';
import QuoteCard from './QuoteCard';
import QuoteDeck from './QuoteDeck';
import QuotePreview from './QuotePreview';
import type {PreviewRequest} from './QuotePreview';
import type {QuoteDeckHandle} from './QuoteDeck';
import HistoryView from './HistoryView';
import WelcomeScreen from './WelcomeScreen';
import CharacterArtwork from './CharacterArtwork';
import CalendarReminder from './CalendarReminder';
import type {CalendarSession} from './CalendarReminder';
import {characters} from './characters';
import type {Character} from './characters';

type Screen='welcome'|'discover'|'reflect'|'write'|'noSelection'|'done'|'history';
type Round={id:string;deck:string[];visited:string[];cursor:number;currentQuoteId:string;selectedQuoteId:string|null;focus:Focus;draft:string;hugShown:boolean};
const titles:Record<Screen,string>={welcome:'Peek a word!',discover:'พบข้อความ',reflect:'ข้อความที่เราเลือก',write:'เขียนถึงตัวเอง',noSelection:'วันนี้ยังไม่เลือก',done:'จบรอบนี้แล้ว',history:'ข้อความที่เก็บไว้'};

function Arrow({direction}:{direction:'left'|'right'}) {
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={direction==='left'?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}/></svg>;
}
export default function App(){
 const deckRef=useRef<QuoteDeckHandle>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 const previousPreview=useRef<PreviewRequest|null>(null);
 const [preview,setPreview]=useState<PreviewRequest|null>(null);
 const [screen,setScreen]=useState<Screen>('welcome');
 const [round,setRound]=useState<Round|null>(null);
 const [saved,setSaved]=useState<SavedQuote|null>(null);
 const [doneSaved,setDoneSaved]=useState(false);
 const [closingCharacter,setClosingCharacter]=useState<Character>(characters['Quiet Moment']);
 const [message,setMessage]=useState('');
 const [calendarBusy,setCalendarBusy]=useState(false);
 const [calendarSession,setCalendarSession]=useState<CalendarSession|null>(null);
 const [origin,setOrigin]=useState<Screen>('welcome');


 useEffect(()=>{
  if(!preview&&previousPreview.current&&screen==='discover')
   document.querySelector<HTMLElement>('.swiper-slide-active .card-expand-control')?.focus({preventScroll:true});
  previousPreview.current=preview;
 },[preview,screen]);
 useEffect(()=>{
  heading.current?.focus();
  window.scrollTo(0,0);
  const frame=requestAnimationFrame(()=>{if(document.activeElement===document.body)heading.current?.focus({preventScroll:true});});
  return()=>cancelAnimationFrame(frame);
 },[screen]);

 function patch(changes:Partial<Round>){setRound(r=>r?{...r,...changes}:r);}
 function start(){
  const [first,...deck]=shuffled();
  setRound(first?{id:crypto.randomUUID(),deck,visited:[first],cursor:0,currentQuoteId:first,selectedQuoteId:null,focus:null,draft:'',hugShown:false}:null);
  setSaved(null);setDoneSaved(false);setMessage('');setPreview(null);setCalendarSession(null);setCalendarBusy(false);setScreen('discover');
 }
 function selectQuote(id:string){
  setPreview(null);
  if(round?.selectedQuoteId!==id){
   // A different card begins a new selection; never attach an old reflection to it.
   patch({id:crypto.randomUUID(),selectedQuoteId:id,focus:null,draft:''});
   setSaved(null);setMessage('');setCalendarSession(null);
  }
  setScreen('reflect');
 }
 function end(){
  const selected=quotes.find(q=>q.id===round?.selectedQuoteId);
  setClosingCharacter(selected?.character??characters['Quiet Moment']);
  setCalendarSession(null);setCalendarBusy(false);setDoneSaved(!!saved);setRound(null);setSaved(null);setMessage('');setPreview(null);setScreen('done');
 }
 function skip(){setCalendarSession(null);setCalendarBusy(false);setPreview(null);setRound(null);setSaved(null);setMessage('');setScreen('noSelection');}
 function browse(index:number){
  setRound(r=>{
   if(!r)return r;
   const timeline=[...r.visited,...r.deck];
   if(index<0||index>=timeline.length)return r;
   const visitedCount=Math.max(r.visited.length,index+1);
   const visited=timeline.slice(0,visitedCount);
   let deck=timeline.slice(visitedCount);
   if(deck.length<2)deck=[...deck,...shuffled(timeline[timeline.length-1])];
   return {...r,visited,deck,cursor:index,currentQuoteId:timeline[index]};
  });
 }
 function save(){
  if(!round?.selectedQuoteId)return;
  const selected=quotes.find(q=>q.id===round.selectedQuoteId)!;
  try{
   const entry=saveQuote({id:round.id,quoteId:selected.id,quoteText:snapshotText(selected),focus:round.focus});
   setSaved(entry);setMessage('เก็บข้อความไว้แล้ว');
  }catch(e){setMessage((e as Error).message);}
 }
 function history(){setOrigin(screen);setScreen('history');}
 const quote=round?quotes.find(q=>q.id===(screen==='discover'?round.currentQuoteId:round.selectedQuoteId??round.currentQuoteId)):null;
 const multipleCards=!!round&&round.visited.length+round.deck.length>1;
 const quietHeading=screen==='discover'||screen==='done'||screen==='noSelection';
 if(screen==='welcome')return <WelcomeScreen headingRef={heading} onStart={start} onHistory={history}/>;
 return <main className={'journey-screen screen-'+screen} inert={!!preview} aria-hidden={preview?true:undefined}>
  <header className="brand journey-brand">
   <span className="journey-mark" aria-hidden="true">a</span>
   <span className="journey-wordmark">Pick a word!</span>
   <span className="brand-dot" aria-hidden="true"/>
  </header>
  <div className="page">
   <h1 ref={heading} tabIndex={-1} className={quietHeading?'visually-hidden':undefined}>{titles[screen]}</h1>
   {screen==='discover'&&!quote&&<section className="catalog-empty" aria-label="ยังไม่มีข้อความพร้อมอ่าน">
    <h2>ตอนนี้ยังไม่มีข้อความพร้อมให้อ่าน</h2>
    <p>กลับมาลองอีกครั้งภายหลังได้ ข้อความที่เคยเก็บไว้ยังอยู่ในหน้าดูย้อนหลัง</p>
    <TapButton className="primary full" onClick={()=>setScreen('welcome')}>กลับไปหน้าแรก</TapButton>
   </section>}
   {screen==='discover'&&quote&&<>
    <nav className="browse-controls" aria-label="เลือกดูข้อความ">
     <TapButton className="arrow-button" aria-label="ข้อความก่อนหน้า" title="ข้อความก่อนหน้า" disabled={!round||round.cursor===0} onClick={()=>deckRef.current?.previous()}><Arrow direction="left"/></TapButton>
     <p id="swipe-help">{multipleCards?<>ปัดซ้ายดูคำถัดไป<br/><span>ปัดขวาดูคำก่อนหน้า</span></>:<>มีข้อความให้เลือก 1 ข้อความ</>}</p>
     <TapButton className="arrow-button" aria-label="เปลี่ยนข้อความ" title="เปลี่ยนข้อความ" disabled={!multipleCards} onClick={()=>deckRef.current?.next()}><Arrow direction="right"/></TapButton>
    </nav>
    <QuoteDeck ref={deckRef} ids={[...round!.visited,...round!.deck]} cursor={round!.cursor} onBrowse={browse} onExpand={setPreview}/>
    <p className="deck-instruction">แตะการ์ดเพื่อขยายอ่าน ยังไม่เลือกหรือเก็บ</p>
    <div className="actions browse-actions">
     <TapButton className="primary" onClick={()=>selectQuote(quote.id)}>เลือกข้อความนี้</TapButton>
     <TapButton className="text-button" onClick={skip}>วันนี้ยังไม่เลือก</TapButton>
    </div>
   </>}
   {screen==='reflect'&&round&&quote&&<>
    <div className="step-navigation">
     <TapButton className="back-button" onClick={()=>setScreen('discover')}><Arrow direction="left"/>กลับไปเลือกคำ</TapButton>
     <span className="step-count" aria-label="ขั้นตอน 1 จาก 2">1 / 2</span>
    </div>
    <QuoteCard quote={quote} expanded/>
    <fieldset>
     <legend>นึกถึงใครหรืออะไร <span>· ข้ามได้</span></legend>
     <div className="choices">{([['self','ตนเอง'],['other','คนอื่น'],['things','สิ่งอื่น'],[null,'ไม่ระบุ']] as [Focus,string][]).map(([value,label])=><label key={label}>
      <input type="radio" name="focus" value={value??''} checked={round.focus===value} onChange={e=>{if(e.target.checked)patch({focus:value});}}/><span>{label}</span>
     </label>)}</div>
     <p className="hint">สิ่งอื่น เช่น สัตว์ เพลง ธรรมชาติ หรือสิ่งที่ผูกพัน</p>
    </fieldset>
    <div className="step-actions">
     <TapButton className="primary full" onClick={()=>setScreen('write')}>ต่อไป</TapButton>
     <TapButton className="text-button full" onClick={end}>จบเมื่อพร้อม</TapButton>
    </div>
   </>}
   {screen==='write'&&round&&quote&&<>
    <div className="step-navigation">
     <TapButton className="back-button" disabled={calendarBusy} onClick={()=>setScreen('reflect')}><Arrow direction="left"/>กลับไปเลือกมุม</TapButton>
     <span className="step-count" aria-label="ขั้นตอน 2 จาก 2">2 / 2</span>
    </div>
    <QuoteCard quote={quote} compact/>
    {round.focus&&<p className="focus-note">นึกถึง: {focusLabel(round.focus)}</p>}
    <section className="writing">
     <label htmlFor="draft">พิมพ์เพิ่ม <span>· ข้ามได้</span></label>
     <p className="hint" id="draft-prompt">พิมพ์ตามคำที่เลือก หรือเขียนด้วยคำของคุณก็ได้</p>
     <textarea id="draft" disabled={calendarBusy} maxLength={500} value={round.draft} onChange={e=>patch({draft:e.target.value})} aria-describedby="draft-prompt draft-help"/>
     <p className="hint" id="draft-help">อยู่ในรอบนี้เท่านั้น · คำที่พิมพ์จะหายเมื่อจบรอบ</p>
    </section>
    <CalendarReminder content={{headword:quote.headword,text:quote.text}} session={calendarSession} onSession={setCalendarSession} onBusyChange={setCalendarBusy}/>
    <p className="journey-reassurance">เลือกได้ ข้ามได้ จบได้เมื่อพร้อม</p>
    <div className="writing-actions">
     <TapButton className="primary finish-primary full" disabled={calendarBusy} onClick={end}>จบ</TapButton>
    </div>
    <TapButton className="text-button full skip-writing" disabled={calendarBusy} onClick={skip}>วันนี้ยังไม่เลือก</TapButton>
    <details className="keep-disclosure">
     <TapSummary>เก็บคำนี้ไว้อ่านย้อนหลัง</TapSummary>
     <section className="review" aria-label="อ่านทวน">
      <h2>อ่านทวน</h2>
      {round.focus&&<p>นึกถึง: {focusLabel(round.focus)}</p>}
      {round.draft.trim()&&<p className="draft-preview">{round.draft}</p>}
      {!round.focus&&!round.draft.trim()&&<p className="subtle">มีเพียงคำที่คุณเลือก</p>}
     </section>
     <section className="save-section">
      <p className="hint">เก็บเฉพาะคำที่เลือกและมุมที่ระบุในเบราว์เซอร์นี้ ไม่เก็บข้อความที่พิมพ์</p>
      <TapButton onClick={save}>{saved&&saved.focus!==round.focus?'อัปเดตบันทึก':'เก็บข้อความไว้'}</TapButton>
      <p role="status">{message}</p>
     </section>
    </details>
   </>}
   {screen==='noSelection'&&<>
    <section className="closing-card rest-card" aria-label="พักตรงนี้ได้">
     <CharacterArtwork character={characters['Heart Hug']}/>
     <span className="character-tag"><span aria-hidden="true"/>Heart Hug</span>
     <p>เหนื่อยละสินะวันนี้</p>
    </section>
    <div className="actions browse-actions">
     <TapButton className="primary" onClick={()=>setScreen('welcome')}>กลับไปหน้าแรก</TapButton>
    </div>
   </>}
   {screen==='done'&&<>
    <section className="closing-card" aria-label="พักตรงนี้ได้">
     <CharacterArtwork character={closingCharacter}/>
     <span className="character-tag"><span aria-hidden="true"/>{closingCharacter.name}</span>
     <p>คิดถึงเค้าแล้ว<br/>คิดถึงเราด้วย</p>
    </section>
    {doneSaved&&<p className="saved-note">เก็บข้อความไว้แล้ว</p>}
    <div className="actions browse-actions">
     <TapButton className="primary" onClick={start}>เลือกคำใหม่</TapButton>
     <TapButton className="text-button" onClick={history}>ดูข้อความที่เก็บไว้</TapButton>
    </div>
   </>}
   {screen==='history'&&<HistoryView back={()=>setScreen(origin)}/>}
  </div>
  <footer>เลือกได้ ข้ามได้ จบได้เมื่อพร้อม</footer>
  {preview&&<QuotePreview {...preview} onClose={()=>setPreview(null)} onSelect={selectQuote}/>}
 </main>;
}
