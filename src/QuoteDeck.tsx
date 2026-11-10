import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import { quotes } from './quotes';
import QuoteCard from './QuoteCard';
import type { PreviewRequest } from './QuotePreview';
import 'swiper/css';
import 'swiper/css/effect-cards';

export type QuoteDeckHandle = { next: () => void; previous: () => void };
type Props = {
  ids: string[];
  cursor: number;
  onBrowse: (index: number) => void;
  onExpand: (request: PreviewRequest) => void;
  ref: Ref<QuoteDeckHandle>;
};

export default function QuoteDeck({
  ids,
  cursor,
  onBrowse,
  onExpand,
  ref,
}: Props) {
  const swiper = useRef<SwiperInstance | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      next() {
        swiper.current?.slideNext();
      },
      previous() {
        swiper.current?.slidePrev();
      },
    }),
    [],
  );
  // Swiper uses window resize/orientation events. Its container ResizeObserver is disabled
  // because animated autoHeight changes otherwise re-snap the deck during the next swipe.
  // Card height follows the readable content, including an opened source disclosure.
  useEffect(() => {
    const instance = swiper.current,
      slide = instance?.slides[cursor];
    if (!instance || !slide) return;
    const card = slide.querySelector<HTMLElement>('.quote-card');
    if (!card) return;
    const updateHeight = () => {
      if (instance.destroyed) return;
      instance.el.style.setProperty('--card-height', card.offsetHeight + 'px');
      instance.updateAutoHeight();
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    updateHeight();
    return () => observer.disconnect();
  }, [cursor, ids.length]);
  return (
    <div
      className="quote-deck"
      role="region"
      aria-label="ชุดข้อความ"
      aria-roledescription="แถบเลื่อนการ์ด"
      aria-describedby="swipe-help"
    >
      <Swiper
        modules={[EffectCards]}
        effect="cards"
        grabCursor
        autoHeight
        resizeObserver={false}
        initialSlide={cursor}
        speed={reducedMotion ? 0 : 420}
        cardsEffect={{ rotate: false, perSlideOffset: 9, slideShadows: false }}
        threshold={35}
        touchAngle={34}
        longSwipesRatio={0.18}
        touchStartPreventDefault={false}
        focusableElements="input,select,option,textarea,button:not(.card-expand-control),video,label"
        noSwipingSelector="details,button:not(.card-expand-control),a,input,textarea,select"
        resistanceRatio={0}
        preventClicks
        preventClicksPropagation
        onSwiper={(instance) => {
          swiper.current = instance;
        }}
        onSlideChange={(instance) => onBrowse(instance.activeIndex)}
        className="quote-swiper"
      >
        {ids.map((id, index) => {
          const quote = quotes.find((q) => q.id === id)!;
          return (
            <SwiperSlide
              key={index + ':' + id}
              inert={index !== cursor}
              aria-hidden={index !== cursor}
              data-deck-index={index}
              className={
                index < cursor
                  ? 'is-past'
                  : index > cursor + 2
                    ? 'is-distant'
                    : ''
              }
            >
              <QuoteCard
                quote={quote}
                active={index === cursor}
                onExpand={
                  index === cursor
                    ? (source, opener) => onExpand({ quote, source, opener })
                    : undefined
                }
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
      <p
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        ข้อความที่ {cursor + 1}:{' '}
        {quotes.find((q) => q.id === ids[cursor])?.headword}
      </p>
    </div>
  );
}
