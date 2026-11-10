import {useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Quote} from './quotes';
import QuoteCard from './QuoteCard';
import {TapButton} from './TouchControls';
import './preview-flow.css';

export type PreviewRequest={quote:Quote;source:HTMLElement;opener:HTMLElement};
type Props=PreviewRequest&{onClose:()=>void;onSelect:(id:string)=>void};
export default function QuotePreview({quote,source,onClose,onSelect}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const title=useRef<HTMLHeadingElement>(null);
 const motion=useRef<Animation|null>(null);
 const closing=useRef(false);
 const cleanup=useRef(()=>{});
 const [phase,setPhase]=useState<'opening'|'open'|'closing'>('opening');
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const destination=()=>{
  const panel=dialog.current!,from=source.getBoundingClientRect(),to=panel.getBoundingClientRect();
  return `translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`;
 };
 useLayoutEffect(()=>{
  const panel=dialog.current!;
  const oldOverflow=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';
  panel.showModal();
  title.current?.focus({preventScroll:true});
  panel.scrollTop=0;
  source.style.visibility='hidden';
  const transform=destination();
  if(!reduced()){
   motion.current=panel.animate([{transform,borderRadius:'28px'},{transform:'none',borderRadius:getComputedStyle(panel).borderRadius}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
   motion.current.finished.then(()=>{if(!closing.current)setPhase('open');}).catch(()=>{});
  }else setPhase('open');
  const finish=()=>{
   motion.current?.cancel();
   source.style.visibility='';
   document.documentElement.style.overflow=oldOverflow;
   panel.close();
  };
  cleanup.current=finish;
  return finish;
 },[]);
 function close(){
  if(closing.current)return;
  closing.current=true;setPhase('closing');
  const panel=dialog.current!;
  // Commit an interrupted opening frame before replacing its animation.
  const current=getComputedStyle(panel).transform;
  const radius=getComputedStyle(panel).borderRadius;
  motion.current?.cancel();
  if(reduced()){finishClose();return;}
  motion.current=panel.animate([{transform:current,borderRadius:radius},{transform:destination(),borderRadius:'28px'}],{duration:320,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  motion.current.finished.then(finishClose).catch(()=>{});
 }
 function finishClose(){
  cleanup.current();
  onClose();

 }
 function select(){
  if(closing.current)return;
  closing.current=true;
  cleanup.current();
  onSelect(quote.id);
 }
 return createPortal(<dialog ref={dialog} className="quote-preview preview-flow" data-phase={phase} aria-labelledby="preview-title" onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,summary,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
 }}>
  <div className="preview-top preview-chrome"><h2 ref={title} id="preview-title" tabIndex={-1}>อ่านข้อความเต็ม</h2></div>
  <div className="preview-reading"><QuoteCard quote={quote} active={false}/></div>
  <div className="preview-bottom preview-chrome"><p className="hint">แค่อ่านก่อนได้ ยังไม่เลือกหรือเก็บ</p><TapButton className="primary full" onClick={select}>เลือกข้อความนี้</TapButton><TapButton className="preview-back" onClick={close} aria-label="กลับไปดูการ์ด"><span aria-hidden="true">←</span> กลับ</TapButton></div>
 </dialog>,document.body);
}
