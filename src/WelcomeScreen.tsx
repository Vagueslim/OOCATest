import type {RefObject} from 'react';
import BrandHeader from './BrandHeader';
import './welcome.css';

type WelcomeScreenProps={
  headingRef:RefObject<HTMLHeadingElement|null>;
  onStart:()=>void;
  onHistory:()=>void;
};

export default function WelcomeScreen({headingRef,onStart,onHistory}:WelcomeScreenProps){
  return <main className="welcome-screen">
    <BrandHeader welcome onHistory={onHistory}/>
    <section className="welcome-content" aria-labelledby="welcome-heading">
      <h1 id="welcome-heading" ref={headingRef} tabIndex={-1}>ค่อย ๆ อยู่กับคำหนึ่งคำ</h1>
      <figure className="welcome-envelope">
        <img src={new URL('./assets/welcome/envelope-coffee.png',import.meta.url).href} width="1286" height="1223" alt="" fetchPriority="high"/>
        <figcaption><span className="visually-hidden">ซองจดหมายสีมิ้นต์เปิดออก พร้อมถ้วยกาแฟบนการ์ดคำว่า </span><span className="welcome-card-word" lang="en">coffee</span></figcaption>
      </figure>
      <div className="welcome-actions">
        <button type="button" className="welcome-start" onClick={onStart}>เปิดอ่าน</button>
        <p className="welcome-reassurance">เลือกได้ ข้ามได้ จบได้เมื่อพร้อม</p>
      </div>
    </section>
  </main>;
}
