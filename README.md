# Peek a word!

Latest release checks and limitations: [journey + 106-card release verification](evidence/release-journey-106.md). Google Calendar remains unconfigured and cannot create real events.

## Latest release: journey and 106-card catalog (2026-11-08)

The local catalog now has **106 cards**, all explicitly set to numeric `status: 1` (shown); `status: 0` excludes a card from new browsing decks. Missing status remains shown for backwards compatibility; invalid status values fail closed. Hiding a card does not remove its previously saved history snapshot.

The 53 user-edited v1 records were compared against the uploaded catalog and preserved exactly, except for adding `status: 1`. Lot2 contained 55 source images: two complete duplicates were skipped and 53 new records were appended as stable IDs 054–106. Existing character mappings are unchanged; each new card has a semantic draft assignment to an existing Mooca pose, with rationale recorded.

All new Thai translations, creative text and generated readings are drafts requiring review. The 058 soul source is truncated, the 091 Japanese source is malformed (reading left null), and 103 has a source pronunciation mark requiring review. These remain status 1 for the owner to decide later. Character matches 081 and 098 are lower-confidence drafts. No language approval or publication is implied.

The final TypeScript/Vite build passed; combined Playwright regression passed 114/114 with no failures or skipped tests. Detailed status semantics, original-preservation proof, source manifest, review flags and final test result: [catalog visibility and lot2 verification](evidence/catalog-visibility/verification.md). Thai review list: [all lot2 cards](evidence/catalog-visibility/lot2-all-entries-th.txt). This snapshot is included in the owner-requested release. See the release verification note below for the latest checks and caveats.

## Button journey and Calendar API

The local flow is browse, select an optional focus, optionally write, and finish. Skipping opens the sky/Heart Hug ending with one Home action. These changes are included in this release.

The calendar action now uses an explicit review-and-confirm flow for Google Calendar API, seven local calendar days later at 13:00–13:15. It requires the user's Google authorization, previews exactly what will be sent, and only claims success after the API confirms the event. The title contains the full selected card headword and text, not the user's private writing or optional focus. Event content is not placed in a query URL. Missing Google client configuration shows a clear setup-required state; it does not simulate success.

Setup and privacy/failure behavior: [Google Calendar API setup](evidence/google-calendar-setup.md). No Google Cloud project, credentials, OAuth grants or real events were created during implementation. See `.env.example` for the public client-ID variable. The app uses browser-only, short-lived tokens and has no background scheduler or persistent token storage.

Existing explicitly saved quote history is unchanged. Calendar-day arithmetic and UTC export preserve 13:00 across DST; the preview refreshes when the local date or time zone changes.

Current verification: [button journey report](evidence/button-journey-verification.md). Screenshots and the latest test report are in evidence/. Older results below are historical.

## Tap to expand

Tap or click the front card to expand it into a full-height reading view. The back arrow or Escape collapses it to the same card and restores keyboard focus. Swiping remains browsing only; choosing and saving a quote are still separate, explicit actions. The expanded view keeps its select button visible while long content scrolls, supports reduced motion, and preserves the original source disclosure.

Verification: [card expansion checks](evidence/card-expansion-verification.md).

อัปเดต 2026-11-07: เปลี่ยนชื่อเป็น **Peek a word!** และใช้ **Swiper React 14.4.0 / EffectCards** แสดงการ์ดหน้าและการ์ดถัดไปซ้อนด้านขวา 2 ใบตามองค์ประกอบภาพแนบ ภาพที่ได้รับเป็น PNG หนึ่งเฟรม จึงใช้เป็นอ้างอิงการจัดวาง ไม่ใช่หลักฐานของ motion ใน GIF

ปัดซ้าย/ขวาหรือลองปุ่ม “เปลี่ยนข้อความ” / “ข้อความก่อนหน้า” เพื่อเลื่อนการ์ดแบบมี animation รองรับ reduced motion และยังต้องกดเลือก/เก็บแยกจากการปัด ชื่อ repo, URL และคีย์เก็บข้อมูลเดิมไม่เปลี่ยน: https://vagueslim.github.io/OOCATest/

ผลตรวจ release นี้: [Swiper cards verification](evidence/swiper-cards-verification.md)

## ประวัติงานก่อนหน้า

อัปเดต 2026-11-06 ตามตัวอย่าง Winner: หัวคำสีเขียว เส้นคั่น คำอ่าน/ชนิดคำสีเทา และข้อความไทยสีน้ำเงิน ผู้ใช้อนุญาตให้นำเวอร์ชันนี้ขึ้น GitHub Pages แล้ว: https://vagueslim.github.io/OOCATest/ **deploy และตรวจ live สำเร็จแล้ว** ดู [ผลตรวจเว็บจริง](evidence/catalog-live-verification.md)

## ปัดเปลี่ยนคำ

ปัดซ้ายบนการ์ดเพื่อดูคำถัดไป ปัดขวาเพื่อดูคำก่อนหน้า ปัดย้อนที่คำแรกไม่มีผล ปุ่ม “ข้อความก่อนหน้า” จะปิดใช้งานจนกว่าจะมีคำก่อนหน้า ปุ่ม “เปลี่ยนข้อความ” ยังใช้เดินหน้าได้ด้วยคีย์บอร์ด การย้อนแล้วเดินหน้าใช้ลำดับที่เคยดูเดิม ไม่สุ่มใหม่หรือเลือก/บันทึกคำอัตโนมัติ เมื่อหมดสำรับจึงสุ่มรอบถัดไปและไม่ซ้ำคำที่รอยต่อ

รับเฉพาะ gesture แนวนอนอย่างน้อย 60px และมากกว่าแนวตั้ง 1.5 เท่า ยกเลิก gesture ที่เริ่มเลื่อนแนวตั้งหรือถูก browser cancel รองรับ native vertical scrolling และ pinch zoom ไม่รับการปัดจาก controls หรือส่วนรายละเอียดต้นฉบับ ไม่มีการแก้ storage schema

Build ผ่าน; Playwright **24/24 ผ่าน** รวม A01–A12, swipe ซ้าย/ขวา, ขอบคำแรก/รอยต่อสำรับ, การย้อนและเดินหน้า, vertical touch scroll, short drag, แตะรายละเอียดและปุ่ม, ไม่เก็บข้อมูลจากการปัด และประวัติ v1 เดิม Visual lint ผ่านทั้ง 7 snapshots ผล swipe เป็น Chromium touch emulation ไม่ใช่มือถือจริง

## รัน

```powershell
npm install
npm run dev
npm run build
npm test
```

ถ้าตัวเปิด webServer ของ Playwright ค้าง ให้เปิด `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort` ในเทอร์มินัลหนึ่ง แล้วรัน `npm test` อีกเทอร์มินัล ผลตรวจด้านล่างใช้ Vite ที่เปิดโดยตรงนี้

## เนื้อหาและโครงสร้าง

`src/catalog.json` แปลงจาก `../quote-catalog-draft/ooca-quote-draft.json` รวม 53 รายการ: word-definition 46 และ sentence 7 เก็บ variant แยกตามรหัส ไม่สร้างคำอ่านหรือชนิดคำที่ต้นทางไม่มี คำอ่านญี่ปุ่นใช้โรมาจิร่างที่มีใน catalog ไม่แสร้งว่าเป็นคำอ่านไทยหรือเสียงที่ยืนยันแล้ว ยังไม่มีเสียงเล่น

การ์ดหลักใช้ `thai_creative_draft` ตามตัวอย่าง Winner พร้อมป้าย “ข้อความไทยเรียบเรียง · ร่างยังไม่ตรวจ” เปิด “ต้นฉบับและคำแปลร่าง” เพื่ออ่านต้นฉบับและ `thai_translation.text` ที่พยายามรักษาความหมาย ทั้งสองอย่างยังเป็นร่าง ไม่มีรายการใดได้รับสถานะอนุมัติจากการเปลี่ยนโค้ดครั้งนี้ Tags แยกจากประเภทและไม่เลือกมุมตนเอง/คนอื่น/สิ่งอื่นแทนผู้ใช้

ความกำกวมที่ยังต้องให้เจ้าของเนื้อหาตรวจ: การเรียบเรียงเชิงสร้างสรรค์อาจเปลี่ยนความหมาย; คำแปลและคำอ่านทั้งหมดไม่ผ่านการรับรองภาษา ข้อความต้นฉบับบางรายการมีหมายเหตุถอดไม่มั่นใจ รวมถึง Impossible; ให้ใช้ review queue ใน catalog ต้นทางก่อนเผยแพร่ การ์ดหลักแสดงร่างอย่างเปิดเผยและดูต้นฉบับเพิ่มเติมได้

## การรักษาบันทึกเดิม / migration

ไม่จำเป็นต้องเปลี่ยน schema: คง key `ooca-demo:saved-quotes:v1`, version 1 และฟิลด์เดิมทั้งหมด ไม่เขียนข้อมูลเมื่อเปิดแอป ไม่ล้างหรือเขียนทับบันทึกเก่า และไม่จับคู่ ID เก่ากับ catalog ใหม่

ID ใหม่ใช้ `catalog-v1:ooca-XXX` เพื่อไม่ชนกับชุดเดิม บันทึกใหม่เก็บ snapshot หัวคำ คำอ่าน/ชนิดคำ ข้อความไทยเรียบเรียงและป้ายร่างลงใน `quoteText` ประวัติอ่าน snapshot ที่เก็บจริงโดยไม่ดึงข้อความเวอร์ชันใหม่มาแทนรายการเก่า การอัปเดตเปลี่ยนเฉพาะมุมตามพฤติกรรมเดิม ข้อความพิมพ์เองยังอยู่เฉพาะในรอบ

ทดสอบด้วยข้อมูล v1 จำลอง: เพิ่ม catalog ใหม่ → อัปเดตมุม → รีโหลด → ลบรายการใหม่ บันทึกเก่ายังคงทุกฟิลด์เดิม ไม่ได้เปิดหรือแก้ localStorage จริงของผู้ใช้ ข้อมูลแต่ละ origin ยังแยกกันตามพฤติกรรมเบราว์เซอร์; localhost ไม่ดึงบันทึกจาก GitHub Pages

## ผลตรวจ

Build: **ผ่าน** (`tsc -b && vite build`, Vite 7.3.7)
Playwright: **24 ผ่าน / 0 ไม่ผ่าน** (Chromium; ดูรายงานผลล่าสุด)
Visual lint: **ผ่าน 7 snapshots** ไม่มี findings หลังเพิ่ม line-height หัวคำ; ไม่พบ runtime errors

| เกณฑ์ | ผล | สิ่งที่ตรวจ |
|---|---|---|
| A01 | ผ่านตามคำขอล่าสุด | ครบ 53 ก่อนซ้ำ รอยต่อไม่ซ้ำติดกัน; จำนวน 15 ในสเปกเดิมถูกแทนด้วย 53 ตามคำขอนี้ |
| A02 | ผ่าน | จบก่อนเลือก ไม่มีบันทึก |
| A03 | ผ่าน | ไม่เลือก → จบ และรับกอด → จบ |
| A04 | ผ่าน | เลือกแล้วข้ามมุม/พิมพ์/เก็บทั้งหมดและจบ |
| A05 | ผ่าน | ลำดับมุม/พิมพ์ ล้างข้อมูล ข้อความธรรมดา จำกัด 500 |
| A06 | ผ่าน | เก็บทันที รีโหลดได้ ไม่เก็บข้อความพิมพ์เอง |
| A07 | ผ่าน | เก็บซ้ำไม่เพิ่ม อัปเดตมุมอย่างชัดเจน |
| A08 | ผ่าน | วันละ 3 รายการ ลบคืนพื้นที่ จบเมื่อเต็มได้ |
| A09 | ผ่าน | สลับเดือน อ่าน ลบ กลับต้นทาง |
| A10 | ผ่าน | อ่าน/เขียนไม่ได้ JSON/schema เสีย เก็บ/อัปเดต/ลบล้มเหลว ยังจบได้ ไม่มีข้อความสำเร็จเท็จ |
| A11 | ผ่าน | จบหรือรีโหลดล้างเฉพาะข้อมูลรอบ บันทึกสำเร็จยังอยู่ |
| A12 | ผ่านใน Chromium | คีย์บอร์ด โฟกัส ปุ่ม ≥44px จอ 360/1440px ไม่ล้น |

เพิ่มการตรวจครบ 53 การ์ด: หัวคำ ข้อความไทย ต้นฉบับตรง catalog, ไม่มีชนิดคำเท็จใน sentence, ซ่อนบรรทัดที่ไม่มีข้อมูล และไม่มี horizontal overflow เมื่อเปิดรายละเอียดบนจอ 360px เพิ่ม regression สำหรับบันทึกเก่าด้วย

หลักฐาน: `evidence/test-results.json`, `evidence/report/index.html`, `evidence/visual-audit.json`, `evidence/lint-*.json` ชุดผลตรวจเก่าที่อาจมีในโฟลเดอร์นี้ให้ถือเป็นประวัติ ไม่ใช่ผลเวอร์ชัน catalog นี้

## ภาพหน้าจอที่ตรวจด้วยสายตา

- [การ์ดคำ Winner บนมือถือ](evidence/mobile-word.png)
- [การ์ดประโยคญี่ปุ่นบนมือถือ](evidence/mobile-sentence.png)
- [หน้าพบข้อความ](evidence/mobile-discover.png)
- [หน้าอ่านทวน](evidence/mobile-reflect.png)
- [หน้าจบ](evidence/mobile-done.png)
- [เดสก์ท็อป](evidence/reflect-1440.png)

ภาพเป็น Chromium viewport จำลอง ไม่ใช่โทรศัพท์จริง ยังไม่ได้ตรวจ Safari/iOS, Android, screen reader, เสียงอ่าน หรือ usability กับผู้ใช้จริง ประโยคยาวทำให้หน้ามือถือเลื่อนแนวตั้งได้ ทางจบหน้าอ่านทวนอยู่ทั้งก่อนและหลังเนื้อหา

ใช้ Prompt และ assets เดิม ไม่เพิ่มฟอนต์หรือ asset ภายนอก ปรับเขียวเป็น #007F75 และน้ำเงินข้อความ #1763B6 บนพื้นขาวเพื่อให้อ่านได้ชัด รายละเอียดรุ่นก่อน/ที่มาฟอนต์เดิมอยู่ใน `README-before-catalog.md` ซึ่งเป็นข้อมูลประวัติ

ภาพ swipe: [มือถือ](evidence/swipe-mobile.png)

แก้ touch sequence ในแอป: `TouchControls.tsx` เปิดรายละเอียดและกดปุ่มจาก stationary touch pointerup เมื่อ browser ไม่ส่ง click หลัง gesture พร้อมกัน compatibility click ซ้ำ ลากเกิน 12px, pointercancel, หลายนิ้ว และปล่อยนอก control ไม่ activate คีย์บอร์ด/เมาส์ยังใช้ click ปกติ ดู [ผลวินิจฉัยและ regression](evidence/touch-sequence-diagnosis.md)

ผลตรวจ live รุ่น swipe และข้อจำกัดที่ยังไม่ยืนยัน: [รายงาน swipe](evidence/swipe-verification.md)

รีเช็คหลัง deploy รุ่นแก้ tap controls แล้ว: live 18/18 ผ่าน รวม fast sequence 9 รอบและโฟลว์ประวัติ/ทางจบ ดู [ผลตรวจล่าสุด](evidence/touch-sequence-diagnosis.md#final-post-deployment-verification) ยังเป็น Chromium emulation ไม่ใช่มือถือจริง
