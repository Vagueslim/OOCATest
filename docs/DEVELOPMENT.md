# คู่มือพัฒนา Pick a word!

เริ่มจาก [README](../README.md) สำหรับภาพรวมและการเปิดเดโม คู่มือนี้อธิบายว่าควรแก้ไฟล์ไหน ตรวจอะไร และรักษาข้อมูลส่วนใดไว้ ใช้ Node.js 24 ตาม CI และรันคำสั่งจากราก repo

## แผนที่ไฟล์สำหรับแก้งาน

| งาน                             | ไฟล์หลักและขอบเขต                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ลำดับหน้าจอและข้อมูลรอบปัจจุบัน | `src/App.tsx`: Welcome → Discover → Reflect → Write → Done; Skip และ History                                           |
| หน้าแรก / หัวแอป                | `src/WelcomeScreen.tsx`, `src/BrandHeader.tsx`, `src/welcome.css`                                                      |
| หน้าบันทึกสำเร็จ Done           | `src/DoneScreen.tsx`, `src/done.css`: ข้อความยืนยัน ภาพ Quiet Moment ปุ่มกลับสำรับ/ประวัติ และข้อความท้ายหน้า          |
| ปัดการ์ด / ปุ่มก่อนหน้า–ถัดไป   | `src/QuoteDeck.tsx`: Swiper EffectCards และการรักษา timeline; `src/TouchControls.tsx`: touch activation                |
| การ์ด / อ่านเต็ม                | `src/QuoteCard.tsx`, `src/QuotePreview.tsx`, `src/preview-flow.css`: disclosure, modal, focus และการเลื่อน             |
| เนื้อหาและสำรับ                 | `src/catalog.json`, `src/quotes.ts`: visibility, shuffle และข้อความ snapshot                                           |
| บันทึก / ประวัติ                | `src/storage.ts`, `src/HistoryView.tsx`, `src/history-figma.css`                                                       |
| ภาพ Mooca                       | `src/characters.ts`: registry/การจับคู่คำ; `src/characterBounds.ts`: alpha bounds; `src/CharacterArtwork.tsx`: จัดกรอบ |
| แชร์ PNG                        | `src/ShareCard.tsx`, `src/cardImage.ts`, `src/share-card.css`                                                          |
| Google Calendar                 | `src/calendar.ts`: วันเวลา/เนื้อหา; `src/CalendarReminder.tsx`: preview/consent; `src/googleCalendar.ts`: OAuth/API    |
| รูปแบบหลัก                      | `src/main.tsx` โหลด `style.css` → `journey.css` → `stage.css` → `figma.css`; ยังมี CSS ที่ component import เอง        |
| favicon / fonts / base path     | `public/favicon.svg`, `public/fonts/`, `index.html`, `vite.config.ts`                                                  |

การปัดที่ใช้งานจริงอยู่ใน `QuoteDeck.tsx`; `SwipeCard.tsx` เป็นไฟล์เดิมที่ไม่มีผู้เรียกใน source ปัจจุบัน ตรวจ computed style ก่อนแก้ CSS เพราะหลายไฟล์มี selector ทับกัน อย่าสลับลำดับ import เพื่อแก้จุดเดียวโดยไม่ตรวจหน้าอื่น

## สัญญาข้อมูลและความเป็นส่วนตัว

- `catalog.json` มี 107 รายการ ณ การส่งต่องานนี้ รักษา ID เดิม: `status: 1` แสดง, `0` ซ่อน, ไม่ระบุยังแสดงเพื่อรองรับข้อมูลเดิม และค่าผิดรูปแบบถูกซ่อน เก็บ record ไว้สำหรับ lookup ประวัติแม้ซ่อนจากสำรับใหม่
- คำแปล ข้อความไทยเรียบเรียง และคำอ่านยังเป็นร่าง รายละเอียดต้นฉบับเริ่มย่อ คงป้ายร่างไว้ การเปลี่ยนคำอ่าน 37 รายการอ้าง [fixture ก่อน–หลัง](../tests/fixtures/pronunciation-updates.json) และ [รายการตรวจ](reviews/pronunciation-updates.md); อย่าแก้ fixture ประวัติเพียงเพื่อให้ test ผ่าน
- เก็บ raw headword ตาม catalog เช่น `family`; ตัวพิมพ์ที่ CSS แสดงไม่ใช่ข้อมูลใหม่ ใช้ `textContent` เมื่อตรวจ snapshot แบบตรงตัว
- `storage.ts` ใช้ key `ooca-demo:saved-quotes:v1`, wrapper `{version: 1, entries: [...]}` และ entry มีเพียง `id`, `quoteId`, `quoteText`, `focus`, `savedAt`, `localDay` จำกัด 9 รายการต่อวันตามเวลาท้องถิ่น โดย `DAILY_SAVE_LIMIT` เป็นค่าเดียวที่ใช้ทั้งตรวจโควตาและสร้างข้อความแจ้งเต็ม การเพิ่มเพดานไม่ล้างหรือย้ายประวัติเดิม
- หน้า Write เก็บเฉพาะ snapshot ของคำและมุม เมื่อสำเร็จให้ล้าง draft แล้วเปิด Done พร้อม Quiet Moment และข้อความ “คิดถึงเค้าแล้ว / คิดถึงเราด้วย” ข้อความที่พิมพ์อยู่ใน React state เท่านั้น ไม่บันทึกหรือแสดงบน Done; save ล้มเหลวหรือเต็มโควตาต้องคงหน้า Write, draft และประวัติเดิม พร้อมข้อความผิดพลาด
- จาก Done ปุ่ม “เลือกคำใหม่” กลับ Discover โดยรักษาสำรับ การ์ดปัจจุบัน และ cursor เดิม ไม่เรียกเริ่มรอบเพื่อสับสำรับใหม่ ปุ่ม “ดูข้อความที่เก็บไว้” เปิด History และ Back กลับ Done โดยไม่บันทึกซ้ำ
- History ใช้ snapshot ที่เคยบันทึกจริง แม้ catalog เปลี่ยนภายหลัง ลบต้องยืนยัน และเดือนที่เลือกกับรายการต้องตรงกันแม้ลบจนเดือนนั้นว่าง
- ประวัติอยู่เฉพาะ browser/origin ไม่มีการ sync ระหว่าง localhost, port อื่น และ GitHub Pages การล้างข้อมูลเว็บไซต์ทำให้ประวัติใน origin นั้นหาย
- PNG ใช้เฉพาะ public card ไม่รวม draft, focus หรือประวัติ เตรียมไฟล์ก่อนคลิกแชร์ และไม่ดาวน์โหลดเองเมื่อผู้ใช้ยกเลิก native share
- Calendar ส่งเฉพาะ headword/text สาธารณะและรายละเอียดนัดที่แสดง หลังตรวจและยินยอม ไม่มี draft/focus และไม่เก็บ access token ถาวร วันนัดต้องตรวจใหม่ ณ เวลายืนยันด้วย
- Mooca ทั้ง 21 ท่าจัดตามส่วนที่ไม่โปร่งใสในกรอบร่วม 166 × 176 CSS pixels รักษาสัดส่วนและฐานเดียวกัน เมื่อเปลี่ยน asset ให้ตรวจ bounds และหลักฐานแหล่งที่มาใน `src/assets/mooca/README.md` และ `src/assets/figma-artwork/` ด้วย

## การจัดรูปแบบโค้ด

ใช้ Prettier เวอร์ชันที่ล็อกใน `package-lock.json` ผ่านคำสั่งของ repo:

```sh
npm run format
npm run format:check
```

`.prettierrc.json` ใช้ย่อหน้า 2 spaces, single quotes, semicolons, trailing commas, LF และคงการตัดบรรทัด prose; JSON ใช้ parser `json-stringify` ส่วน `.editorconfig` กำหนด UTF-8, LF และ newline ท้ายไฟล์ โดยไม่ตัด trailing whitespace ใน Markdown

JSON ใช้ double quotes ตามไวยากรณ์ ไม่มี comments หรือ trailing comma และไม่เปลี่ยนช่องว่างภายใน string เพื่อจัดรูปแบบ ส่วน `.gitattributes` กำหนดให้ Git checkout ไฟล์ข้อความเป็น LF ทั้ง Windows และ Linux เพื่อให้ CI ใช้กติกาเดียวกัน

สำหรับโค้ดใหม่ ใช้ PascalCase สำหรับ React component/type และ camelCase สำหรับ function/variable ตั้งชื่อตามหน้าที่ แยก logic ที่เกี่ยวกับข้อมูลออกจาก JSX เมื่อช่วยให้ตรวจเงื่อนไขได้ง่าย และตรวจข้อมูลจาก storage/API ที่ขอบเขตรับเข้า รักษา error path และความเป็นส่วนตัวด้วย tests ที่ตรวจพฤติกรรม เอกสารนี้ไม่ได้รับรองว่าโค้ดเดิมผ่าน lint ทุกกฎ; repo ยังไม่มี ESLint

`.prettierignore` กัน dependencies/build/reports, `package-lock.json`, `evidence/`, `docs/reviews/`, `README-before-catalog.md`, SVG และ local env ออกจาก formatter เพื่อรักษา generated files, historical evidence และ asset bytes การ format ไม่ได้แทน type-check หรือ behavior tests แยก commit จัดรูปแบบออกจากการเปลี่ยนพฤติกรรมเมื่อทำได้ และตรวจ `git diff` ก่อน stage

## ตรวจงานระหว่างพัฒนา

```sh
npm ci
npm run format:check
npm run build
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

Linux ที่ยังไม่มี browser dependencies ใช้ `npx playwright install --with-deps chromium` ชุด `.spec.ts` ใช้ Vite dev server `http://127.0.0.1:5181/` ตาม config ปกติ บางเคสจำลองข้อมูลผ่าน `/src/*` จึงห้ามชี้ทั้งชุดไปยัง production preview หรือเว็บจริง หากตั้ง `TEST_BASE_URL` จะไม่เปิด server ให้อัตโนมัติ; ใช้เฉพาะ dev server ของ checkout ที่กำลังตรวจ และอย่าให้ server เก่าค้างบน 5181

ระหว่างแก้ เลือก tests ตามผลกระทบ แล้วรันทั้งชุดก่อนส่ง PR:

| ส่วนที่แก้                                 | ตัวอย่าง tests                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog / snapshot / visibility            | `catalog.spec.ts`, `catalog-visibility.spec.ts`, `acceptance.spec.ts`                                                                  |
| Flow / Done / preview / swipe / responsive | `figma-flow.spec.ts`, `done-flow.spec.ts`, `preview-flow.spec.ts`, `swipe.spec.ts`, `swiper-cards.spec.ts`, `responsive-stage.spec.ts` |
| Artwork                                    | `character-artwork.spec.ts`, `mooca-card.spec.ts`                                                                                      |
| Share / Calendar                           | `share-card.spec.ts`, `calendar.spec.ts`, `google-calendar-service.spec.ts`, `google-calendar-ui.spec.ts`                              |
| Contrast / live-check runner               | `button-contrast.spec.ts`, `live-check-runner.spec.ts`                                                                                 |

ตัวอย่างรันเฉพาะจุด: `npx playwright test tests/preview-flow.spec.ts` ผลชุดหลักอยู่ใน `evidence/test-results.json`, `evidence/report/` และ trace ใน test results เมื่อ fail; `npx playwright show-report evidence/report` ใช้เปิดรายงาน HTML

## ตรวจ production build และเว็บจริงด้วยสคริปต์ F04

สคริปต์เหล่านี้ใช้ DOM ของแอปจริง ไม่ใช้ Vite module fixtures และไม่ได้รันรวมกับ `.spec.ts` เริ่ม preview หลัง build:

```sh
npm run build
npm run preview -- --port 5193 --strictPort
```

เปิดอีก terminal แล้วรัน:

```sh
node tests/pages-smoke.mjs http://127.0.0.1:5193/OOCATest/
node tests/catalog-live.mjs http://127.0.0.1:5193/OOCATest/
node tests/contrast.mjs http://127.0.0.1:5193/OOCATest/
```

ทุกคำสั่งต้องระบุ URL เมื่อตรวจเว็บจริงใช้ `https://vagueslim.github.io/OOCATest/` และแยก output ได้ด้วย argument ถัดไป เช่น:

```sh
node tests/pages-smoke.mjs https://vagueslim.github.io/OOCATest/ evidence/live-verification/production-pages
```

- `pages-smoke`: หน้าแรก/font/favicon/base-path assets, ก่อนหน้า–ถัดไป, อ่านเต็มที่เริ่มย่อ, ข้าม, Write-save → Done → กลับการ์ดเดิม, Done → History → กลับ Done, ประวัติหลัง reload, draft privacy และ storage failure
- `catalog-live`: เทียบการ์ดที่แสดงครบกับ catalog ใน checkout นี้ ตรวจ ID/raw headword/คำอ่าน/ต้นฉบับ/ป้ายร่าง, สำรับและ timeline, Write-save → Done, กลับสำรับเดิม, snapshot+focus, legacy history/month/delete/failure; เฉพาะข้อความไทยบนการ์ดยุบช่องว่าง ASCII ซ้ำตาม UI ส่วน snapshot ตรวจตรงตัว
- `contrast`: วัด CTA ใน Discover/Preview/Reflect/Write/Done ที่ 360 และ 1440px ทั้ง default/focus/hover พร้อมข้อความมุมที่เลือกและข้อความท้ายหน้า Done (`.done-reassurance`) รวม 34 ค่าสีและ 10 keyboard-focus checks ใช้เกณฑ์ข้อความ 4.5:1; Welcome gradient, disabled controls, focus-ring contrast และข้อความอื่นอยู่นอกขอบเขต ไม่ใช่การตรวจ WCAG ทั้งระบบ

ค่าเริ่มต้นคือ `evidence/live-verification/<ชื่อสคริปต์>/results.json` พร้อมภาพประกอบ ใช้โฟลเดอร์ใหม่เมื่อต้องเก็บแต่ละรอบ เพราะชื่อผลลัพธ์เดิมจะถูกเขียนทับ รายงานมีเวลา, Node/browser, checks, runtime errors, failed requests, asset HTTP status, ข้อจำกัด และ `sourceCheckoutCommit`/`sourceHasChanges` ของเครื่องที่รัน; **ไม่ได้ยืนยันว่า URL ปลายทาง deploy จาก commit นั้น**

เมื่อ fail จะเขียน `passed: false`, error และภาพหากถ่ายได้ พร้อม exit code 1; contrast ที่วัดไม่ได้เป็น `not-assessed` และไม่ผ่านเช่นกัน แต่ละคำสั่งใช้ browser context ใหม่ ไม่มีประวัติผู้ใช้ และไม่เรียก Calendar OAuth/event หรือ native share จริง ผลเหล่านี้ไม่รับรอง Safari/iOS หรือ integration กับบัญชี/อุปกรณ์จริง

## ตั้ง Google Calendar เฉพาะเครื่องพัฒนา

Core flow ใช้งานได้โดยไม่ตั้ง Calendar เมื่อยังไม่มี client ID แอปต้องแสดงว่ายังสร้างนัดไม่ได้ ไม่จำลองความสำเร็จ

1. เตรียม Google Cloud project ที่เปิด Calendar API และตั้ง OAuth consent/test audience ให้บัญชีทดสอบเข้าได้ สร้าง OAuth client ชนิด Web application ตาม [Calendar setup](https://developers.google.com/workspace/calendar/api/quickstart/js) และ [Google Identity Services setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)
2. เพิ่ม Authorized JavaScript origins ให้ตรง host/port ที่เปิดจริง เช่น `http://127.0.0.1:5173` โดยไม่มี path หากใช้ localhost ให้เพิ่ม `http://localhost` และ `http://localhost:5173` ตามคู่มือ Google; อย่าสลับ origin ระหว่างลองโดยไม่ตั้งค่า
3. เมื่อยังไม่มี `.env.local` ให้คัดลอก `.env.example` เป็น `.env.local` แล้วใส่เฉพาะ `VITE_GOOGLE_CLIENT_ID=<public-web-client-id>` ไม่เขียนทับ env เดิมหรือใส่ client secret/access token/refresh token โค้ดนี้ใช้ OAuth client ID ไม่ต้องเพิ่ม API key ตามตัวอย่าง quickstart
4. เริ่มหรือ restart `npm run dev -- --port 5173 --strictPort` หลังแก้ env; Vite อ่านค่าเมื่อเริ่ม dev/build ตั้ง `.env.local` ในเครื่องไม่ได้ตั้งค่า GitHub Pages build ให้ด้วย
5. เลือกคำ → “ตนเอง” → “บอกฉันอีก 7 วัน” ตรวจวันที่ 13:00–13:15 ตาม timezone ของเครื่องและข้อมูลสาธารณะที่จะส่ง แล้วจึงยินยอม/ยืนยันด้วยบัญชีทดสอบ การกดยืนยันที่ตั้งค่าแล้วจะสร้าง event จริง

Client ขอ scope `calendar.events.owned` และใช้ปฏิทินหลักของบัญชีที่เลือก ตรวจผลใน Calendar รวมถึงสิทธิ์แจ้งเตือนของอุปกรณ์ ก่อนรับรอง integration จริง ชุดทดสอบอัตโนมัติใช้ mocks และไม่ใช่หลักฐานว่า OAuth/เมนูแชร์ทำงานบนบัญชีหรืออุปกรณ์ใดแล้ว

## ก่อนส่งต่อหรือเปิด PR

ตรวจ diff และสถานะ Git, รักษา fixtures/asset provenance, ระบุ tests ที่รันจริงพร้อมข้อจำกัด และไม่ commit dependencies/build/env/รายงานชั่วคราว อ่าน [Git workflow](GIT_WORKFLOW.md) สำหรับ branch, merge commit และ revert ส่วน `docs/reviews/` และ `README-before-catalog.md` เป็นประวัติรอบก่อน ไม่ใช่ผลตรวจล่าสุด
