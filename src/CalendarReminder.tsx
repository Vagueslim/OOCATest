import {useEffect,useRef,useState} from 'react';
import {TapButton} from './TouchControls';
import {createCalendarReminder} from './calendar';
import type {CalendarContent,CalendarReminder as Reminder} from './calendar';
import {CalendarError,googleCalendarClient} from './googleCalendar';
import type {CalendarClient,CalendarCreateResult} from './googleCalendar';

export type CalendarSession={reminder:Reminder;outcome:'success'|'uncertain';result?:CalendarCreateResult};
type Props={content?:CalendarContent;client?:CalendarClient;session:CalendarSession|null;onSession:(session:CalendarSession)=>void;onBusyChange?:(busy:boolean)=>void;compact?:boolean};
const errorText:Record<string,string>={
 setup_required:'ยังไม่ได้ตั้งค่า Google Calendar สำหรับเดโมนี้ จึงยังสร้างนัดไม่ได้',
 not_ready:'ยังเชื่อมต่อ Google ไม่พร้อม กรุณารอหรือลองเชื่อมต่ออีกครั้ง',
 popup_closed:'คุณปิดหน้าต่าง Google แล้ว ยังไม่ได้สร้างนัด',
 popup_blocked:'เบราว์เซอร์เปิดหน้าต่าง Google ไม่ได้ กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง',
 access_denied:'Google ไม่อนุญาตให้สร้างนัด ยังไม่ได้สร้างนัด',
 scope_denied:'ยังไม่ได้รับสิทธิ์ปฏิทินที่จำเป็น จึงยังไม่ได้สร้างนัด',
 token_expired:'สิทธิ์เข้าถึงหมดอายุก่อนส่งนัด กรุณาเลือกบัญชีและยืนยันใหม่',
 unauthorized:'Google ปฏิเสธสิทธิ์เข้าถึง ยังไม่ได้สร้างนัด กรุณาเลือกบัญชีและยืนยันใหม่',
 rate_limited:'Google จำกัดจำนวนคำขอชั่วคราว ยังไม่ได้สร้างนัด กรุณาลองใหม่ภายหลัง',
 network_error:'เชื่อมต่อ Google ไม่สำเร็จ ยังไม่ได้ส่งนัด กรุณาลองใหม่',
 api_error:'Google ไม่รับคำขอสร้างนัด กรุณาตรวจข้อมูลแล้วลองใหม่',
 invalid_draft:'ข้อมูลวันเวลาของนัดไม่ถูกต้อง กรุณาปิดและเปิดตัวเลือกนี้ใหม่',
 uncertain:'ยังยืนยันไม่ได้ว่าสร้างนัดสำเร็จหรือไม่ กรุณาตรวจ Google Calendar ก่อนดำเนินการอีกครั้ง แม้รีโหลดหน้าแล้วก็ไม่ควรกดซ้ำทันที',
 in_flight:'กำลังดำเนินการกับ Google กรุณารอ',
};
export default function CalendarReminder({content,client=googleCalendarClient,session,onSession,onBusyChange,compact=false}:Props){
 const [open,setOpen]=useState(false);
 const [reminder,setReminder]=useState<Reminder|null>(session?.reminder??null);
 const [consent,setConsent]=useState(false);
 const [ready,setReady]=useState(false);
 const [preparing,setPreparing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 const [outcome,setOutcome]=useState<'idle'|'success'|'uncertain'>(session?.outcome??'idle');
 const [created,setCreated]=useState<CalendarCreateResult|null>(session?.result??null);
 const currentReminder=useRef<Reminder|null>(session?.reminder??null);
 const inFlight=useRef(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;onBusyChange?.(false);};},[onBusyChange]);
 async function prepare(){
  if(!client.configured)return;
  setPreparing(true);setReady(false);
  try{await client.prepare();if(mounted.current)setReady(true);}
  catch(e){if(mounted.current)setStatus(errorText[e instanceof CalendarError?e.code:'network_error']);}
  finally{if(mounted.current)setPreparing(false);}
 }
 function toggle(){
  if(inFlight.current)return;
  if(open){setOpen(false);return;}
  if(outcome==='idle'){const next=createCalendarReminder(new Date(),content);currentReminder.current=next;setReminder(next);setConsent(false);setStatus('');}
  setOpen(true);
  if(outcome==='idle'&&!ready)void prepare();
 }
 function refreshReminder(previous:Reminder|null){
  const next=createCalendarReminder(new Date(),content);
  if(previous&&(previous.start.getTime()!==next.start.getTime()||previous.end.getTime()!==next.end.getTime()||previous.timeZone!==next.timeZone||previous.title!==next.title||previous.event.description!==next.event.description)){
   currentReminder.current=next;setReminder(next);setConsent(false);setStatus('ข้อมูลนัดเปลี่ยนแล้ว โปรดตรวจและยินยอมอีกครั้ง');
   return true;
  }
  return false;
 }
 useEffect(()=>{
  if(!open||busy||outcome!=='idle')return;
  const refresh=()=>{refreshReminder(currentReminder.current);};
  refresh();
  const interval=window.setInterval(refresh,15000);
  document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);
  return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
 },[open,busy,outcome,content?.headword,content?.text]);
 async function create(){
  if(!reminder||!consent||!ready||inFlight.current||outcome!=='idle')return;
  // Compare against the visible, consented preview before starting OAuth.
  if(refreshReminder(reminder))return;
  inFlight.current=true;setBusy(true);onBusyChange?.(true);setStatus('กำลังรอให้คุณเลือกบัญชีและอนุญาตใน Google');
  try{
   // createEvent starts OAuth before its first await, preserving this explicit click.
   const result=await client.createEvent(reminder.event);
   if(mounted.current){setCreated(result);setOutcome('success');onSession({reminder,outcome:'success',result});setStatus('สร้างนัดใน Google Calendar แล้ว');}
  }catch(e){
   if(mounted.current){const code=e instanceof CalendarError?e.code:'uncertain';setStatus(errorText[code]??errorText.uncertain);if(code==='uncertain'){setOutcome('uncertain');onSession({reminder,outcome:'uncertain'});}setConsent(false);}
  }finally{inFlight.current=false;if(mounted.current)setBusy(false);onBusyChange?.(false);}
 }
 return <div className={'calendar-reminder'+(compact?' calendar-reminder-compact':'')} data-open={open}>
  <TapButton className="calendar-trigger full" aria-expanded={open} aria-controls="calendar-options" onClick={toggle} disabled={busy}>
   <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h3m-3 3h6"/></svg>
   {compact?'บอกฉันอีก 7 วัน':'เตือนฉันในอีก 7 วัน'}
  </TapButton>
  {!open&&!compact&&<p className="calendar-caption">เวลา 13:00 น. · ตรวจข้อมูลก่อนสร้างนัด</p>}
  {open&&reminder&&<section className="calendar-options" id="calendar-options" aria-label="เพิ่มนัดในปฏิทิน" aria-busy={busy}>
   <h2>ตรวจนัดก่อนส่ง</h2>
   <p className="calendar-label">ชื่อกิจกรรมที่จะส่ง</p>
   <p className="calendar-title">{reminder.title}</p>
   <p className="calendar-date"><time dateTime={reminder.start.toISOString()}>{new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:reminder.timeZone}).format(reminder.start)}</time><br/>13:00–13:15 น.</p>
   <p className="calendar-zone">ตามเวลาของเครื่อง: {reminder.timeZone}</p>
   <p className="calendar-destination">ปลายทาง: Google Calendar หลักของบัญชีที่คุณเลือก</p>
   <p className="calendar-help calendar-content-scope">ส่งเฉพาะ headword และ text บนการ์ด ไม่รวมข้อความที่พิมพ์เพิ่มหรือมุมที่เลือก</p>
   <p className="calendar-label">รายละเอียดที่จะส่ง</p>
   <p className="calendar-description">{reminder.event.description}</p>
   <p className="calendar-privacy">ชื่อกิจกรรมอาจปรากฏบนการแจ้งเตือน และคนที่มีสิทธิ์ในปฏิทินที่แชร์อาจเห็นได้ แม้นัดนี้จะตั้งเป็นส่วนตัว กรุณาตรวจข้อมูลก่อนส่ง</p>
   <p className="calendar-help">ครั้งแรก Google จะขอสิทธิ์จัดการกิจกรรมในปฏิทินที่คุณเป็นเจ้าของ แอปจะใช้สิทธิ์นั้นสร้างเฉพาะนัดที่คุณยืนยัน ไม่แนบผู้เข้าร่วม</p>
   {!client.configured&&<p className="calendar-setup" role="note">{errorText.setup_required}</p>}
   {outcome==='idle'&&<>
    <label className="calendar-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy||!client.configured}/><span>ฉันยินยอมส่งข้อมูลข้างต้นไปยัง Google Calendar</span></label>
    <div className="calendar-actions"><TapButton className="primary" onClick={create} disabled={!client.configured||!ready||!consent||busy}>{busy?'กำลังสร้างนัด…':'ตกลง สร้างนัด'}</TapButton></div>
    {preparing&&<p className="calendar-help">กำลังเตรียมการเชื่อมต่อ Google ยังไม่ได้ส่งข้อมูลนัด</p>}
    {client.configured&&!preparing&&!ready&&<TapButton className="text-button" onClick={()=>void prepare()}>ลองเชื่อมต่ออีกครั้ง</TapButton>}
   </>}
   {(status||outcome!=='idle')&&<p className="calendar-status" role="status">{status||(outcome==='success'?'สร้างนัดใน Google Calendar แล้ว ข้อมูลข้างต้นคือข้อมูลที่ส่งไว้':errorText.uncertain)}</p>}
   {outcome==='success'&&created?.htmlLink&&<a className="calendar-result" href={created.htmlLink} target="_blank" rel="noopener noreferrer">ดูนัดใน Google Calendar<span className="visually-hidden"> (แท็บใหม่)</span></a>}
   <p className="calendar-help">การแจ้งเตือนขึ้นอยู่กับการตั้งค่าปฏิทินและการอนุญาตของเครื่อง กรุณาตรวจอีกครั้งหลังสร้างนัด</p>
  </section>}
 </div>;
}
