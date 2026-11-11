import { TapButton } from './TouchControls';
import CharacterArtwork from './CharacterArtwork';
import type { Character } from './characters';
import statusDot from './assets/figma/done-status-dot.svg';
import './done.css';

type Props = {
  character: Character;
  onChooseAnother: () => void;
  onHistory: () => void;
};

export default function DoneScreen({
  character,
  onChooseAnother,
  onHistory,
}: Props) {
  return (
    <>
      <section className="closing-card done-card" aria-label="พักตรงนี้ได้">
        <div className="done-artwork">
          <CharacterArtwork character={character} />
        </div>
        <div className="done-character-label">
          <span className="character-tag">
            <img src={statusDot} width="6" height="6" alt="" />
            {character.name}
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
