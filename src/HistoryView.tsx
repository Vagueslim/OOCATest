import {TapButton} from './TouchControls';
import { useState } from 'react';
import { deleteQuote, localDay, readEntries, STORAGE_ERROR } from './storage';
import type {SavedQuote} from './storage';
import {focusLabel} from './quotes';
export default function HistoryView({back}:{back:()=>void}) {
 const [initial]=useState(()=>{try{return {entries:readEntries(),error:''};}catch{return {entries:[] as SavedQuote[],error:STORAGE_ERROR};}});
 const [entries,setEntries]=useState(initial.entries);const [message,setMessage]=useState(initial.error);
 const [month,setMonth]=useState(localDay().slice(0,7)); const [pending,setPending]=useState<string|null>(null);
 const months=[...new Set([localDay().slice(0,7),...entries.map(e=>e.localDay.slice(0,7))])].sort().reverse();
 const visible=entries.filter(e=>e.localDay.startsWith(month)).sort((a,b)=>b.localDay.localeCompare(a.localDay)||b.savedAt.localeCompare(a.savedAt));
 function remove(id:string) {try{setEntries(deleteQuote(id));setPending(null);setMessage('ลบข้อความแล้ว');}catch{setMessage(STORAGE_ERROR);}}
 return <><TapButton className="text-button" onClick={back}>กลับ</TapButton><label className="month-label">เลือกเดือน<select value={month} onChange={e=>{setMonth(e.target.value);setPending(null);}}>{months.map(m=><option key={m}>{m}</option>)}</select></label><p role="status">{message}</p>{!visible.length&&!initial.error&&<div className="empty">เดือนนี้ยังไม่มีข้อความที่เก็บไว้</div>}{[...new Set(visible.map(e=>e.localDay))].map(day=><section key={day} className="history-day"><h2>{day}</h2>{visible.filter(e=>e.localDay===day).map(e=><details key={e.id}><summary>{e.quoteText}</summary><p>{e.quoteText}</p>{e.focus&&<p>นึกถึง: {focusLabel(e.focus)}</p>}{pending===e.id?<div className="confirmation"><p>ลบข้อความนี้หรือไม่?</p><TapButton onClick={()=>remove(e.id)}>ยืนยันลบ</TapButton><TapButton onClick={()=>setPending(null)}>ยกเลิก</TapButton></div>:<TapButton onClick={()=>setPending(e.id)}>ลบข้อความ</TapButton>}</details>)}</section>)}</>;
}
