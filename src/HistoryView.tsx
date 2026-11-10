import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { TapButton, TapSummary } from './TouchControls';
import QuoteCard from './QuoteCard';
import { deleteQuote, localDay, readEntries, STORAGE_ERROR } from './storage';
import type { SavedQuote } from './storage';
import { focusLabel, quotes, snapshotText } from './quotes';
import arrowBack from './assets/figma/arrow-back.svg';
import 'swiper/css';
import './history-figma.css';

function SavedCard({ entry, active }: { entry: SavedQuote; active: boolean }) {
  const current = quotes.find((quote) => quote.id === entry.quoteId);
  // Saved wording is the source of truth, even when the catalog changes later.
  if (current && snapshotText(current) === entry.quoteText)
    return <QuoteCard quote={current} compact active={active} />;
  return (
    <article
      className="quote-card compact-card history-snapshot"
      aria-label="ข้อความที่เก็บไว้"
    >
      <p>{entry.quoteText}</p>
    </article>
  );
}

export default function HistoryView() {
  const [initial] = useState(() => {
    try {
      return { entries: readEntries(), error: '' };
    } catch {
      return { entries: [] as SavedQuote[], error: STORAGE_ERROR };
    }
  });
  const [entries, setEntries] = useState(initial.entries);
  const [message, setMessage] = useState(initial.error);
  const [month, setMonth] = useState(localDay().slice(0, 7));
  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const swiper = useRef<SwiperInstance | null>(null);
  const monthSelect = useRef<HTMLSelectElement | null>(null);
  const carousel = useRef<HTMLElement | null>(null);
  const restoreDeleteFocus = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const months = [
    ...new Set([
      month,
      localDay().slice(0, 7),
      ...entries.map((entry) => entry.localDay.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse();
  const visible = entries
    .filter((entry) => entry.localDay.startsWith(month))
    .sort(
      (a, b) =>
        b.localDay.localeCompare(a.localDay) ||
        b.savedAt.localeCompare(a.savedAt),
    );
  const activeIndex = Math.min(cursor, Math.max(0, visible.length - 1));
  const activeEntry = visible[activeIndex];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (
      swiper.current &&
      !swiper.current.destroyed &&
      swiper.current.activeIndex !== activeIndex
    )
      swiper.current.slideTo(activeIndex, 0);
  }, [activeIndex, visible.length, month]);
  useEffect(() => {
    if (!restoreDeleteFocus.current) return;
    restoreDeleteFocus.current = false;
    (carousel.current ?? monthSelect.current)?.focus({ preventScroll: true });
  }, [entries]);

  function remove(id: string) {
    try {
      const remaining = deleteQuote(id);
      restoreDeleteFocus.current = true;
      setEntries(remaining);
      setCursor(Math.min(activeIndex, Math.max(0, visible.length - 2)));
      setPending(null);
      setMessage('ลบข้อความแล้ว');
    } catch {
      setMessage(STORAGE_ERROR);
    }
  }
  function changeMonth(value: string) {
    setMonth(value);
    setCursor(0);
    setPending(null);
    if (!initial.error) setMessage('');
  }

  return (
    <section className="history-view" aria-label="ข้อความที่เก็บไว้">
      <label
        className="month-label history-month-label"
        htmlFor="history-month"
      >
        เลือกเดือน
        <select
          ref={monthSelect}
          id="history-month"
          value={month}
          onChange={(event) => changeMonth(event.target.value)}
        >
          {months.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p className="history-message" role="status">
          {message}
        </p>
      )}
      {!visible.length && !initial.error && (
        <div className="empty history-empty">
          เดือนนี้ยังไม่มีข้อความที่เก็บไว้
        </div>
      )}
      {!!visible.length && (
        <>
          <section
            ref={carousel}
            className="history-carousel"
            role="region"
            aria-label="ข้อความที่เก็บไว้ในเดือนนี้"
            aria-roledescription="แถบเลื่อนการ์ด"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  'button,summary,details,input,select,textarea',
                )
              )
                return;
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                swiper.current?.slidePrev();
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                swiper.current?.slideNext();
              } else if (event.key === 'Home') {
                event.preventDefault();
                swiper.current?.slideTo(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                swiper.current?.slideTo(visible.length - 1);
              }
            }}
          >
            <nav
              className="history-browse-controls"
              aria-label="เลือกดูข้อความที่เก็บไว้"
            >
              <TapButton
                className="history-arrow"
                disabled={activeIndex === 0}
                aria-label="ข้อความที่เก็บไว้ก่อนหน้า"
                onClick={() => swiper.current?.slidePrev()}
              >
                <img src={arrowBack} width="24" height="24" alt="" />
              </TapButton>
              <p id="history-swipe-help">ปัดซ้ายขวาดูคำถัดไป - ก่อนหน้า</p>
              <TapButton
                className="history-arrow"
                disabled={activeIndex === visible.length - 1}
                aria-label="ข้อความที่เก็บไว้ถัดไป"
                onClick={() => swiper.current?.slideNext()}
              >
                <span className="history-arrow-next">
                  <img src={arrowBack} width="24" height="24" alt="" />
                </span>
              </TapButton>
            </nav>
            <Swiper
              key={month}
              className="history-swiper"
              slidesPerView={1}
              spaceBetween={18}
              autoHeight
              resizeObserver={false}
              speed={reducedMotion ? 0 : 280}
              threshold={25}
              touchAngle={34}
              resistanceRatio={0}
              touchStartPreventDefault={false}
              onSwiper={(instance) => {
                swiper.current = instance;
              }}
              onSlideChange={(instance) => {
                setCursor(instance.activeIndex);
                setPending(null);
              }}
              aria-describedby="history-swipe-help"
            >
              {visible.map((entry, index) => (
                <SwiperSlide
                  key={entry.id}
                  inert={index !== activeIndex}
                  aria-hidden={index !== activeIndex}
                  role="group"
                  aria-roledescription="การ์ด"
                  aria-label={`${index + 1} จาก ${visible.length}`}
                >
                  <SavedCard entry={entry} active={index === activeIndex} />
                </SwiperSlide>
              ))}
            </Swiper>
            <p
              className="visually-hidden"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              ข้อความที่ {activeIndex + 1} จาก {visible.length}
            </p>
          </section>
          {activeEntry && (
            <details key={activeEntry.id} className="history-entry-details">
              <TapSummary>รายละเอียดข้อความที่เก็บไว้</TapSummary>
              <p>
                เก็บเมื่อ{' '}
                <time dateTime={activeEntry.localDay}>
                  {activeEntry.localDay}
                </time>
              </p>
              {activeEntry.focus && (
                <p>นึกถึง: {focusLabel(activeEntry.focus)}</p>
              )}
              <p className="history-saved-text">{activeEntry.quoteText}</p>
              {pending === activeEntry.id ? (
                <div className="confirmation">
                  <p>ลบข้อความนี้หรือไม่?</p>
                  <TapButton onClick={() => remove(activeEntry.id)}>
                    ยืนยันลบ
                  </TapButton>
                  <TapButton onClick={() => setPending(null)}>ยกเลิก</TapButton>
                </div>
              ) : (
                <TapButton onClick={() => setPending(activeEntry.id)}>
                  ลบข้อความ
                </TapButton>
              )}
            </details>
          )}
        </>
      )}
    </section>
  );
}
