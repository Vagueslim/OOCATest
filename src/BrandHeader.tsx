import {TapButton} from './TouchControls';
import historyIcon from './assets/figma/history.svg';
import arrowBack from './assets/figma/arrow-back.svg';

type Props={onHistory:()=>void;onBack?:()=>void;onNavigateBack?:()=>void;busy?:boolean;welcome?:boolean};
export default function BrandHeader({onHistory,onBack,onNavigateBack,busy=false,welcome=false}:Props){
 return <header className={`app-header ${welcome?'welcome-header':'journey-brand'} ${onBack?'has-back':''}`}>
  {onNavigateBack&&<TapButton className="header-back-icon" aria-label="กลับไปเลือกมุม" onClick={onNavigateBack} disabled={busy}><img src={arrowBack} width="24" height="24" alt=""/></TapButton>}
  {onBack?<TapButton className="header-back" onClick={onBack} disabled={busy}>กลับ</TapButton>:
   <p className={`app-wordmark ${welcome?'welcome-wordmark':'journey-wordmark'}`} aria-label="Pick a word!"><span>Pick a </span><span className="wordmark-blue">wor</span><span>d!</span></p>}
  <TapButton className="welcome-history" onClick={onHistory} disabled={busy}>
   <img src={historyIcon} width="25" height="25" alt=""/>
   <span>ดูย้อนหลัง</span>
  </TapButton>
 </header>;
}
