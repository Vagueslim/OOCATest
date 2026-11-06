import {useRef} from 'react';
import type {ButtonHTMLAttributes,HTMLAttributes,PointerEvent,MouseEvent,KeyboardEvent} from 'react';
// Some touch sequences deliver pointerup but omit the compatibility click.
// Activate a stationary touch once, preserving native mouse/keyboard activation.
function useTouchActivation<T extends HTMLElement>(){
 const start=useRef<{id:number;x:number;y:number;dragged:boolean}|null>(null);
 const ignoreNativeUntil=useRef(0);
 return {
  onPointerDown(e:PointerEvent<T>){
   if(e.pointerType!=='touch'){ignoreNativeUntil.current=0;start.current=null;return;}
   if(!e.isPrimary){start.current=null;return;}
   start.current={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};
  },
  onPointerMove(e:PointerEvent<T>){const s=start.current;if(s&&s.id===e.pointerId&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>12)s.dragged=true;},
  onPointerCancel(){start.current=null;ignoreNativeUntil.current=Date.now()+500;},
  onPointerUp(e:PointerEvent<T>){
   const s=start.current;start.current=null;
   if(!s||s.id!==e.pointerId)return;
   ignoreNativeUntil.current=Date.now()+500;
   if(s.dragged||Math.hypot(e.clientX-s.x,e.clientY-s.y)>12)return;
   const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)return;
   e.preventDefault();ignoreNativeUntil.current=Date.now()+500;
   e.currentTarget.focus({preventScroll:true});e.currentTarget.click();
  },
  onClickCapture(e:MouseEvent<T>){if(e.nativeEvent.isTrusted&&Date.now()<ignoreNativeUntil.current){e.preventDefault();e.stopPropagation();}},
  onKeyDown(_e:KeyboardEvent<T>){ignoreNativeUntil.current=0;}
 };
}
export function TapButton(props:ButtonHTMLAttributes<HTMLButtonElement>){const touch=useTouchActivation<HTMLButtonElement>();return <button {...props} {...touch}/>;}
export function TapSummary(props:HTMLAttributes<HTMLElement>){const touch=useTouchActivation<HTMLElement>();return <summary {...props} {...touch}/>;}
