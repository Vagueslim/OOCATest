import type {RefObject} from 'react';
import './welcome.css';

type WelcomeScreenProps={
  headingRef:RefObject<HTMLHeadingElement|null>;
  onStart:()=>void;
  onHistory:()=>void;
};

export default function WelcomeScreen({headingRef,onStart,onHistory}:WelcomeScreenProps){
  return <main className="welcome-screen">
    <header className="welcome-header">
      <p className="welcome-wordmark" aria-label="Pick a word!"><span>Pick a </span><span>word!</span></p>
      <button type="button" className="welcome-history" onClick={onHistory}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.5 8A9 9 0 1 0 21 15M20.5 8l-.7-5M20.5 8l-5-.5M12 6.5V12l3.5 2.2"/>
          <path className="history-tick" d="m20.7 11.2.2 1.1"/>
        </svg>
        <span>ดูย้อนหลัง</span>
      </button>
    </header>
    <section className="welcome-content" aria-labelledby="welcome-heading">
      <h1 id="welcome-heading" ref={headingRef} tabIndex={-1}>ค่อย ๆ อยู่กับคำหนึ่งคำ</h1>
      <figure className="welcome-envelope">
        <img src={new URL('./assets/welcome/envelope.png',import.meta.url).href} width="1286" height="1223" alt="" fetchPriority="high"/>
        <figcaption><span className="visually-hidden">ซองจดหมายสีมิ้นต์เปิดออก พร้อมต้นอ่อนบนการ์ดคำว่า </span><span className="welcome-card-word" lang="en">Strength</span></figcaption>
      </figure>
      <div className="welcome-actions">
        <button type="button" className="welcome-start" onClick={onStart}>ลองเปิดอ่าน</button>
        <p className="welcome-reassurance">เลือกได้ ข้ามได้ จบได้เมื่อพร้อม</p>
      </div>
    </section>
  </main>;
}
