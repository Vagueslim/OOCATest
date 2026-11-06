import {useRef} from 'react';
import type {PointerEvent,ReactNode} from 'react';
type Gesture={id:number;x:number;y:number;vertical:boolean};
export default function SwipeCard({children,onNext,onPrevious}:{children:ReactNode;onNext:()=>void;onPrevious:()=>void}){
 const gesture=useRef<Gesture|null>(null);
 const suppressClickUntil=useRef(0);
 function down(e:PointerEvent<HTMLDivElement>){
  suppressClickUntil.current=0;
  if(!e.isPrimary){gesture.current=null;return;}
  if(e.button!==0||(e.target as Element).closest('button,a,input,textarea,select,details'))return;
  gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,vertical:false};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;
  const dx=Math.abs(e.clientX-g.x),dy=Math.abs(e.clientY-g.y);
  if(dy>12&&dy>dx)g.vertical=true;
 }
 function up(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;gesture.current=null;if(!g||g.id!==e.pointerId)return;
  const dx=e.clientX-g.x,dy=Math.abs(e.clientY-g.y);
  if(!g.vertical&&Math.abs(dx)>=60&&Math.abs(dx)>dy*1.5){
   suppressClickUntil.current=Date.now()+500;e.preventDefault();
   if(dx<0)onNext();else onPrevious();
  }
 }
 return <div className="swipe-surface" aria-describedby="swipe-help" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;}} onLostPointerCapture={()=>{gesture.current=null;}} onClickCapture={e=>{if(Date.now()<suppressClickUntil.current){e.preventDefault();e.stopPropagation();}}}>{children}</div>;
}
