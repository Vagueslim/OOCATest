import { TapButton } from './TouchControls';
import quietMoment from './assets/mooca/quiet-moment.png';
import statusDot from './assets/figma/done-status-dot.svg';
import './done.css';

type Props = {
  onChooseAnother: () => void;
  onHistory: () => void;
};

export default function DoneScreen({ onChooseAnother, onHistory }: Props) {
  return (
    <>
      <section className="closing-card done-card" aria-label="พักตรงนี้ได้">
        <div className="done-artwork">
          <img
            src={quietMoment}
            width="180"
            height="180"
            alt="Mooca Quiet Moment"
            draggable={false}
          />
        </div>
        <div className="done-character-label">
          <span className="character-tag">
            <img src={statusDot} width="6" height="6" alt="" />
            Quiet Moment
          </span>
        </div>
        <p>
          คิดถึงเค้าแล้ว
          <br />
          คิดถึงเราด้วย
        </p>
      </section>
      <div className="actions done-actions">
        <TapButton className="primary" onClick={onChooseAnother}>
          เลือกคำใหม่
        </TapButton>
        <TapButton className="text-button" onClick={onHistory}>
          ดูข้อความที่เก็บไว้
        </TapButton>
      </div>
    </>
  );
}
