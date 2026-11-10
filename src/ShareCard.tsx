import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QuoteCard from './QuoteCard';
import { TapButton } from './TouchControls';
import type { Quote } from './quotes';
import { canShareCard, prepareCardFile } from './cardImage';
import './share-card.css';

type PreparedCard = {
  quote: Quote;
  file: File;
  url: string;
  nativeShare: boolean;
};

export default function ShareCard({ quote }: { quote: Quote }) {
  const surface = useRef<HTMLDivElement | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const statusId = useId();
  const [prepared, setPrepared] = useState<PreparedCard | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preparationError, setPreparationError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [message, setMessage] = useState('');
  const ready = prepared?.quote === quote ? prepared : null;
  const downloadOnly = !!ready && (!ready.nativeShare || fallback);

  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    let objectURL: string | undefined;
    setPrepared(null);
    setPreparationError(false);
    setFallback(false);
    setMessage('');
    setBusy(false);
    inFlight.current = false;
    const node = surface.current;
    if (node)
      void prepareCardFile(node, quote.id, controller.signal)
        .then((file) => {
          if (controller.signal.aborted || current !== generation.current)
            return;
          objectURL = URL.createObjectURL(file);
          const nativeShare = canShareCard(file);
          setPrepared({ quote, file, url: objectURL, nativeShare });
          if (!nativeShare)
            setMessage(
              'อุปกรณ์นี้แชร์ไฟล์โดยตรงไม่ได้ ดาวน์โหลดรูปเพื่อนำไปแชร์ได้',
            );
        })
        .catch(() => {
          if (controller.signal.aborted || current !== generation.current)
            return;
          setPreparationError(true);
          setMessage('เตรียมรูปไม่สำเร็จ ลองอีกครั้งได้');
        });
    return () => {
      controller.abort();
      generation.current++;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [quote, attempt]);

  function download() {
    if (!ready || inFlight.current) return;
    const link = document.createElement('a');
    link.href = ready.url;
    link.download = ready.file.name;
    link.click();
    setMessage('เริ่มดาวน์โหลดรูปการ์ดแล้ว');
  }
  function share() {
    if (!ready || inFlight.current) return;
    if (!canShareCard(ready.file)) {
      setFallback(true);
      setMessage('อุปกรณ์นี้แชร์ไฟล์โดยตรงไม่ได้ ดาวน์โหลดรูปเพื่อนำไปแชร์ได้');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    const current = generation.current;
    function finish(succeeded: boolean, error?: unknown) {
      if (current !== generation.current) return;
      inFlight.current = false;
      setBusy(false);
      if (succeeded) {
        setMessage('ส่งรูปไปยังระบบแชร์ของอุปกรณ์แล้ว');
        return;
      }
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        setMessage('ยกเลิกการแชร์แล้ว');
        return;
      }
      setFallback(true);
      setMessage('เปิดเมนูแชร์ไม่ได้ ดาวน์โหลดรูปแล้วแชร์ผ่านแอปที่ต้องการได้');
    }
    try {
      // The PNG is ready before this click. Call Web Share in the activation task.
      const request = navigator.share({ files: [ready.file] });
      void request.then(
        () => finish(true),
        (error) => finish(false, error),
      );
    } catch (error) {
      finish(false, error);
    }
  }

  const preparing = !ready && !preparationError;
  return (
    <div className="share-card-control">
      <TapButton
        className="share-card-trigger"
        disabled={preparing || busy}
        aria-busy={preparing || busy}
        aria-describedby={statusId}
        onClick={
          preparationError
            ? () => setAttempt((value) => value + 1)
            : downloadOnly
              ? download
              : share
        }
      >
        {preparationError
          ? 'ลองเตรียมรูปอีกครั้ง'
          : downloadOnly
            ? 'ดาวน์โหลดรูป'
            : 'แชร์การ์ด'}
      </TapButton>
      <p
        className="share-card-status"
        id={statusId}
        role="status"
        aria-live="polite"
      >
        {preparing
          ? 'กำลังเตรียมรูปการ์ด…'
          : busy
            ? 'กำลังเปิดเมนูแชร์…'
            : message}
      </p>
      {createPortal(
        <div className="share-card-render-host" aria-hidden="true" inert>
          <div ref={surface} className="share-card-surface journey-screen">
            <QuoteCard quote={quote} active={false} showSource={false} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
