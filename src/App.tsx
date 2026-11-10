import {TapButton} from './TouchControls';
import {useEffect,useRef,useState} from 'react';
import {quotes,shuffled,snapshotText} from './quotes';
import type {Focus} from './quotes';
import {saveQuote} from './storage';
import QuoteCard from './QuoteCard';
import QuoteDeck from './QuoteDeck';
import QuotePreview from './QuotePreview';
import type {PreviewRequest} from './QuotePreview';
import type {QuoteDeckHandle} from './QuoteDeck';
import HistoryView from './HistoryView';
import WelcomeScreen from './WelcomeScreen';
import BrandHeader from './BrandHeader';
import CharacterArtwork from './CharacterArtwork';
import CalendarReminder from './CalendarReminder';
import type {CalendarSession} from './CalendarReminder';
import {characters} from './characters';
import arrowBack from './assets/figma/arrow-back.svg';

type Screen='welcome'|'discover'|'reflect'|'write'|'noSelection'|'history';
type Round={id:string;deck:string[];visited:string[];cursor:number;currentQuoteId:string;selectedQuoteId:string|null;focus:Focus;draft:string;hugShown:boolean};
const titles:Record<Screen,string>={welcome:'Pick a word!',discover:'พบข้อความ',reflect:'ข้อความที่เราเลือก',write:'เขียนถึงตัวเอง',noSelection:'วันนี้ยังไม่เลือก',history:'ข้อความที่เก็บไว้'};

function Arrow({direction}:{direction:'left'|'right'}) {
 return <span className={'arrow-icon arrow-'+direction}><img src={arrowBack} width="24" height="24" alt=""/></span>;
}
export default function App(){
 const deckRef=useRef<QuoteDeckHandle>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 const previousPreview=useRef<PreviewRequest|null>(null);
 const [preview,setPreview]=useState<PreviewRequest|null>(null);
 const [screen,setScreen]=useState<Screen>('welcome');
 const [round,setRound]=useState<Round|null>(null);
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
  setMessage('');setPreview(null);setCalendarSession(null);setCalendarBusy(false);setScreen('discover');
 }
 function selectQuote(id:string){
  setPreview(null);
  if(round?.selectedQuoteId!==id){
   // A different card begins a new selection; never attach an old reflection to it.
   patch({id:crypto.randomUUID(),selectedQuoteId:id,focus:null,draft:''});
   setMessage('');setCalendarSession(null);
  }
  setScreen('reflect');
 }
 function skip(){setCalendarSession(null);setCalendarBusy(false);setPreview(null);setRound(null);setMessage('');setScreen('noSelection');}
 function browse(index:number){
  if(index!==round?.cursor)setMessage('');
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
 function saveAndReturnToMain(){
  if(!round?.selectedQuoteId)return;
  const selected=quotes.find(q=>q.id===round.selectedQuoteId)!;
  try{
   saveQuote({id:round.id,quoteId:selected.id,quoteText:snapshotText(selected),focus:round.focus});
   // Only the selected quote snapshot and focus are saved; the private draft ends here.
   // Continue browsing the same deck; a later selection starts a fresh round.
   patch({id:crypto.randomUUID(),selectedQuoteId:null,focus:null,draft:'',hugShown:false});
   setPreview(null);setCalendarSession(null);setCalendarBusy(false);
   setMessage('เก็บคำไว้แล้ว');setScreen('discover');
  }catch(e){setMessage((e as Error).message);}
 }
 function history(){if(calendarBusy||screen==='history')return;setOrigin(screen);setScreen('history');}
 const quote=round?quotes.find(q=>q.id===(screen==='discover'?round.currentQuoteId:round.selectedQuoteId??round.currentQuoteId)):null;
 const multipleCards=!!round&&round.visited.length+round.deck.length>1;
 if(screen==='welcome')return <WelcomeScreen headingRef={heading} onStart={start} onHistory={history}/>;
 return <main className={'journey-screen screen-'+screen} inert={!!preview} aria-hidden={preview?true:undefined}>
  {screen!=='reflect'&&<BrandHeader onHistory={history} onBack={screen==='history'?()=>setScreen(origin):undefined} onNavigateBack={screen==='write'?()=>setScreen('reflect'):undefined} busy={calendarBusy}/>}
  <div className="page">
   <h1 ref={heading} tabIndex={-1} className="visually-hidden">{titles[screen]}</h1>
   {screen==='discover'&&!quote&&<section className="catalog-empty" aria-label="ยังไม่มีข้อความพร้อมอ่าน">
    <h2>ตอนนี้ยังไม่มีข้อความพร้อมให้อ่าน</h2>
    <p>กลับมาลองอีกครั้งภายหลังได้ ข้อความที่เคยเก็บไว้ยังอยู่ในหน้าดูย้อนหลัง</p>
    <TapButton className="primary full" onClick={()=>setScreen('welcome')}>กลับไปหน้าแรก</TapButton>
   </section>}
   {screen==='discover'&&quote&&<>
    <nav className="browse-controls" aria-label="เลือกดูข้อความ">
     <TapButton className="arrow-button" aria-label="ข้อความก่อนหน้า" title="ข้อความก่อนหน้า" disabled={!round||round.cursor===0} onClick={()=>deckRef.current?.previous()}><Arrow direction="left"/></TapButton>
     <p id="swipe-help">{multipleCards?'ปัดซ้ายขวาดูคำถัดไป - ก่อนหน้า':'มีข้อความให้เลือก 1 ข้อความ'}</p>
     <TapButton className="arrow-button" aria-label="เปลี่ยนข้อความ" title="เปลี่ยนข้อความ" disabled={!multipleCards} onClick={()=>deckRef.current?.next()}><Arrow direction="right"/></TapButton>
    </nav>
    <QuoteDeck ref={deckRef} ids={[...round!.visited,...round!.deck]} cursor={round!.cursor} onBrowse={browse} onExpand={setPreview}/>
    <p className="deck-instruction visually-hidden">แตะการ์ดเพื่อขยายอ่าน ยังไม่เลือกหรือเก็บ</p>
    <div className="actions browse-actions">
     <TapButton className="primary" onClick={()=>selectQuote(quote.id)}>เลือกข้อความนี้</TapButton>
     <TapButton className="text-button" onClick={skip}>วันนี้ยังไม่เลือก</TapButton>
    </div>
    {message&&<p className="saved-main-status" role="status">{message}</p>}
   </>}
   {screen==='reflect'&&round&&quote&&<>
    <div className="step-navigation">
     <TapButton className="back-button" disabled={calendarBusy} onClick={()=>setScreen('discover')}><Arrow direction="left"/>กลับไปเลือกคำ</TapButton>
    </div>
    <QuoteCard quote={quote}/>
    <fieldset disabled={calendarBusy}>
     <legend>นึกถึงใครหรืออะไร <span>· ข้ามได้</span></legend>
     <div className="choices">{([['self','ตนเอง'],['other','คนอื่น'],['things','สิ่งอื่น'],[null,'ไม่ระบุ']] as [Focus,string][]).map(([value,label])=><label key={label}>
      <input type="radio" name="focus" value={value??''} checked={round.focus===value} onChange={e=>{if(e.target.checked)patch({focus:value});}}/><span>{label}</span>
     </label>)}</div>
    </fieldset>
    <div className={'step-actions'+(round.focus==='self'?' has-calendar':'')}>
     {round.focus==='self'&&<CalendarReminder compact content={{headword:quote.headword,text:quote.text}} session={calendarSession} onSession={setCalendarSession} onBusyChange={setCalendarBusy}/>}
     <TapButton className="primary" disabled={calendarBusy} onClick={()=>setScreen('write')}>ต่อไป</TapButton>
    </div>
    <TapButton className="text-button reflect-exit" disabled={calendarBusy} onClick={skip}>วันนี้ยังไม่เลือก</TapButton>
   </>}
   {screen==='write'&&round&&quote&&<>
    <QuoteCard quote={quote} compact/>
    <section className="writing">
     <label htmlFor="draft">พิมพ์เพิ่ม <span>· ข้ามได้</span></label>
     <p className="hint" id="draft-prompt">พิมพ์ตามคำที่เลือก หรือเขียนด้วยคำของคุณก็ได้</p>
     <textarea id="draft" disabled={calendarBusy} maxLength={500} value={round.draft} onChange={e=>patch({draft:e.target.value})} aria-describedby="draft-prompt draft-help"/>
     <p className="hint draft-privacy" id="draft-help">ข้อความที่พิมพ์อยู่ในรอบนี้เท่านั้น · เก็บเฉพาะคำที่เลือกและมุมที่ระบุ</p>
    </section>
    <div className="writing-actions">
     <TapButton className="primary" disabled={calendarBusy} onClick={saveAndReturnToMain}>เลือกข้อความนี้</TapButton>
    </div>
    <p className="save-status" role="status" aria-live="polite">{message}</p>
    <TapButton className="text-button full skip-writing" disabled={calendarBusy} onClick={skip}>วันนี้ยังไม่เลือก</TapButton>
   </>}
   {screen==='noSelection'&&<>
    <section className="closing-card rest-card" aria-label="พักตรงนี้ได้">
     <CharacterArtwork character={characters['Heart Hug']}/>
     <span className="character-tag"><span aria-hidden="true"/>Heart Hug</span>
     <p>เหนื่อยสินะวันนี้</p>
    </section>
    <div className="actions browse-actions">
     <TapButton className="primary" onClick={()=>setScreen('welcome')}>กลับไปหน้าแรก</TapButton>
    </div>
   </>}
   {screen==='history'&&<HistoryView/>}
  </div>
  <footer>เลือกได้ ข้ามได้ จบได้เมื่อพร้อม</footer>
  {preview&&<QuotePreview {...preview} onClose={()=>setPreview(null)} onSelect={selectQuote}/>}
 </main>;
}
