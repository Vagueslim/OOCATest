# Pick a Word

เว็บเดโมภาษาไทยสำหรับ **เลือกคำ → อ่าน → ทบทวน → เก็บไว้ดูย้อนหลัง** ผู้ใช้ปัดเลือกการ์ด เลือกมุมที่นึกถึง และเขียนข้อความส่วนตัวได้ โดยประวัติเก็บเฉพาะคำกับมุมที่เลือก ข้อความที่พิมพ์อยู่ในรอบนั้นเท่านั้น

โปรเจกต์นี้ใช้สาธิตและทดสอบประสบการณ์ UX/UI ของแนวคิด OOCA ไม่ใช่บริการรักษาหรือระบบเวชระเบียน ปัจจุบันมี 107 การ์ดและตัวละคร Mooca 21 ท่า

**[เปิดเดโม](https://vagueslim.github.io/OOCATest/)** · [คู่มือนักพัฒนา](docs/DEVELOPMENT.md) · [ขั้นตอน Git / PR / ย้อนงาน](docs/GIT_WORKFLOW.md)

## ลองใช้งานอะไรได้บ้าง

1. กด **เปิดอ่าน** จากหน้าแรก แล้วปัดซ้าย/ขวาหรือใช้ปุ่มเปลี่ยนการ์ด การปัดยังไม่บันทึกคำ
2. แตะการ์ดเพื่ออ่านเต็ม รายละเอียดต้นฉบับเริ่มแบบย่อ ปุ่มเลือกและกลับอยู่ท้ายเนื้อหา
3. กด **เลือกข้อความนี้** เลือกมุมที่นึกถึง แล้วไปหน้าเขียน ข้ามมุมหรือเว้นข้อความได้
4. กด **เลือกข้อความนี้** ในหน้าเขียนเพื่อเก็บคำและมุม ระบบกลับไปการ์ดเดิมในสำรับเดิม
5. เปิด **ดูย้อนหลัง** เพื่อกรองเดือน อ่าน snapshot ที่เก็บไว้ หรือลบรายการ

เมื่อเลือก **คนอื่น** จะมีปุ่ม **แชร์การ์ด** สำหรับส่ง PNG ผ่านเมนูแชร์ของระบบ หาก browser ไม่รองรับจะมีทางดาวน์โหลด การยกเลิกเมนูแชร์ไม่ดาวน์โหลดเอง ส่วน Calendar เป็นความสามารถเสริมที่ต้องตั้งค่าก่อนใช้

## เริ่มรันบนเครื่อง

ต้องมี Git และ **Node.js 24 พร้อม npm** ตามเวอร์ชันที่ CI ใช้ คำสั่งด้านล่างใช้ได้ใน PowerShell และ shell ทั่วไป

หากยังไม่มี repo:

```sh
git clone https://github.com/Vagueslim/OOCATest.git
cd OOCATest
```

หากมี clone อยู่แล้ว ให้เปิด terminal ในโฟลเดอร์ที่มี `package.json` ได้เลย ไม่ต้อง clone ซ้ำ จากนั้นรัน:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

เปิด **http://127.0.0.1:5173/** และหยุด server ด้วย `Ctrl+C` เมื่อแก้ไฟล์ใน `src/` Vite จะอัปเดตหน้าให้ ไม่ต้องตั้ง `.env` เพื่อทดลองเลือกคำ บันทึก หรือดูย้อนหลัง

ถ้าพอร์ต 5173 ถูกใช้ ให้ปิด server เก่าหรือเปลี่ยน `--port` แล้วเปิด URL ตาม terminal ประวัติถูกแยกตาม origin รวมถึงพอร์ตด้วย

บน Windows ถ้า `npm ci` แจ้ง `EPERM` ที่ `esbuild.exe` ให้หยุด dev/preview server ของ repo นี้ก่อน แล้วรันติดตั้งใหม่ เพราะ process อาจล็อกไฟล์อยู่

## คำสั่งที่ใช้ประจำ

| คำสั่ง                                        | ใช้เมื่อ                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm ci`                                      | ติดตั้ง dependencies ตาม `package-lock.json` หลัง clone หรือ lockfile เปลี่ยน |
| `npm run dev`                                 | พัฒนาด้วย Vite และดู URL ที่ terminal แจ้ง                                    |
| `npm run format`                              | จัดรูปแบบ source, JSON, tests, config และเอกสารที่อยู่ในขอบเขต                |
| `npm run format:check`                        | ตรวจรูปแบบโดยไม่แก้ไฟล์ ใช้ก่อน commit และใน CI                               |
| `npm run build`                               | ตรวจ TypeScript ของแอปและสร้าง production build ใน `dist/`                    |
| `npm test`                                    | รัน Playwright ทุกไฟล์ `.spec.ts` ด้วย config ปกติ                            |
| `npm run preview -- --port 5193 --strictPort` | เปิด build ล่าสุดที่ **http://127.0.0.1:5193/OOCATest/**                      |

`preview` ต้องรันหลัง `build` และใช้ path `/OOCATest/` ตามการเผยแพร่บน GitHub Pages ต่างจาก dev ที่ใช้ `/`

## ตรวจงานก่อนส่ง

ครั้งแรกให้ติดตั้ง browser สำหรับทดสอบ:

```sh
npx playwright install chromium
```

บน Linux ที่ยังไม่มี dependencies ของ browser ใช้ `npx playwright install --with-deps chromium` แทน จากนั้นรัน:

```sh
npm run format:check
npm run build
npm test
```

Playwright เปิด Vite dev server พอร์ต **5181** ให้อัตโนมัติ บางเคสใช้ fixtures ผ่าน `/src/*` จึงต้องใช้ dev server ของ checkout ที่ตรวจ อย่าชี้ชุดทดสอบทั้งหมดไปยัง preview หรือเว็บจริง

รายงานอยู่ที่ `evidence/report/index.html` และ `evidence/test-results.json`; trace ของเคสที่ไม่ผ่านอยู่ใน `test-results/` เปิดรายงานด้วย `npx playwright show-report evidence/report` ไม่ commit รายงานชั่วคราวเหล่านี้

เมื่อต้องตรวจ production build หรือเว็บที่เผยแพร่แล้ว ให้ใช้สคริปต์ F04 แยกต่างหาก ตัวอย่างตรวจเดโม:

```sh
node tests/pages-smoke.mjs https://vagueslim.github.io/OOCATest/
node tests/catalog-live.mjs https://vagueslim.github.io/OOCATest/
node tests/contrast.mjs https://vagueslim.github.io/OOCATest/
```

ดู [ขอบเขตการตรวจ รายงาน และข้อจำกัด](docs/DEVELOPMENT.md) ก่อนแปลผล โดยเฉพาะ Calendar และ native share ที่ automated tests ใช้ mocks

## จะแก้ส่วนไหน เริ่มอ่านไฟล์อะไร

แอปใช้ **React + TypeScript + Vite**, Swiper สำหรับสำรับ และ html-to-image สำหรับสร้าง PNG ไม่มี backend ของโปรเจกต์ ประวัติเก็บใน browser

| งานที่ต้องการแก้                      | จุดเริ่มต้น                                                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ลำดับหน้า เลือกคำ เขียน และกลับสำรับ  | [`src/App.tsx`](src/App.tsx)                                                                                                                         |
| หน้าแรก / หัวแอป                      | [`src/WelcomeScreen.tsx`](src/WelcomeScreen.tsx), [`src/BrandHeader.tsx`](src/BrandHeader.tsx)                                                       |
| การปัดและสำรับการ์ด                   | [`src/QuoteDeck.tsx`](src/QuoteDeck.tsx)                                                                                                             |
| หน้าการ์ด / หน้าอ่านเต็ม              | [`src/QuoteCard.tsx`](src/QuoteCard.tsx), [`src/QuotePreview.tsx`](src/QuotePreview.tsx)                                                             |
| เนื้อหา คำอ่าน สถานะแสดงผล และการสุ่ม | [`src/catalog.json`](src/catalog.json), [`src/quotes.ts`](src/quotes.ts)                                                                             |
| การบันทึก โควตา และประวัติ            | [`src/storage.ts`](src/storage.ts), [`src/HistoryView.tsx`](src/HistoryView.tsx)                                                                     |
| ภาพและขนาดตัวละคร                     | [`src/characters.ts`](src/characters.ts), [`src/CharacterArtwork.tsx`](src/CharacterArtwork.tsx), [`src/characterBounds.ts`](src/characterBounds.ts) |
| สร้างภาพและแชร์                       | [`src/ShareCard.tsx`](src/ShareCard.tsx), [`src/cardImage.ts`](src/cardImage.ts)                                                                     |
| Calendar และ OAuth                    | [`src/calendar.ts`](src/calendar.ts), [`src/CalendarReminder.tsx`](src/CalendarReminder.tsx), [`src/googleCalendar.ts`](src/googleCalendar.ts)       |
| สีและ layout                          | เริ่มที่ [`src/main.tsx`](src/main.tsx) เพื่อดูลำดับโหลด CSS แล้วตรวจ CSS ของ component ที่เกี่ยวข้อง                                                |
| favicon และฟอนต์                      | [`public/`](public/), [`index.html`](index.html)                                                                                                     |
| พฤติกรรมที่ต้องรักษา                  | [`tests/`](tests/) และ [คู่มือนักพัฒนา](docs/DEVELOPMENT.md)                                                                                         |

ตัวอย่าง: หากแก้ข้อความบนการ์ด ให้หา stable ID ใน `src/catalog.json` แก้เฉพาะ field ที่ตั้งใจ ตรวจหน้าอ่านและประวัติ แล้วรันชุดตรวจ อย่าเปลี่ยน ID หรือ fixture ย้อนหลังเพียงเพื่อทำให้ test ผ่าน หากแก้รูปแบบ ให้รัน `npm run format` แทนการจัดบรรทัดด้วยมือ

## ข้อมูลที่เก็บ และสิ่งที่ยังไม่พร้อมรับรอง

- ประวัติใช้ localStorage key `ooca-demo:saved-quotes:v1` เก็บ `id`, `quoteId`, `quoteText`, `focus`, `savedAt`, `localDay` จำกัด 3 รายการต่อวันตามเวลาท้องถิ่น ไม่มีการ sync ข้ามอุปกรณ์หรือระหว่าง localhost กับ Pages
- ข้อความที่พิมพ์เป็น state ชั่วคราว ไม่ลงประวัติ ไม่อยู่ใน PNG หรือ Calendar เมื่อบันทึกล้มเหลวต้องเก็บ draft ไว้ให้ผู้ใช้ลองใหม่
- ประวัติแสดง snapshot ณ วันที่เก็บ การแก้ catalog ภายหลังไม่เขียนทับข้อความในประวัติเดิม
- คำแปล ข้อความไทยเรียบเรียง และคำอ่านยังมีสถานะ **ร่าง** การปรับคำอ่าน 37 รายการไม่ได้หมายถึงอนุมัติภาษา ดู [รายการก่อน–หลัง](docs/reviews/pronunciation-updates.md)
- Google Calendar ต้องตั้ง public OAuth client ID ใน `VITE_GOOGLE_CLIENT_ID` ตาม [`.env.example`](.env.example) และอนุญาต origin ให้ตรง ผู้ใช้ต้องตรวจ preview และยืนยันก่อนสร้างนัด ไม่เก็บ access token ถาวร ดูขั้นตอนใน [คู่มือนักพัฒนา](docs/DEVELOPMENT.md)
- ผล automated tests ของ Calendar และ native share ใช้ mocks ยังไม่รับรองบัญชี Google จริงหรือเมนูแชร์ของอุปกรณ์จริง การตรวจสีบางจุดยังไม่ใช่การรับรอง WCAG ทั้งระบบ

## ส่งงานและเผยแพร่

ใช้ **หนึ่งงาน → หนึ่ง branch `codex/...` → commit ที่ตรวจได้ → PR → ตรวจและ merge** ตาม [Git workflow](docs/GIT_WORKFLOW.md) เปิด Draft PR ตั้งแต่ commit แรก และรอ `validate` บน commit ล่าสุดผ่านก่อนส่งรีวิว

CI ใช้ Node 24 รัน format check, build และ Playwright ทั้งชุด เก็บรายงานเมื่อไม่ผ่านเป็น Actions artifacts 14 วัน เมื่ออนุมัติให้เลือก **Create a merge commit** เพื่อรักษา commit ย่อย

Pages deploy เมื่อ merge เข้า `main` แล้วมีการเปลี่ยนไฟล์แอป/build ตาม path filter ใน [workflow](.github/workflows/pages.yml) หรือสั่ง `workflow_dispatch` งานที่แก้เฉพาะ docs/tests จึงไม่ deploy อัตโนมัติ หลัง deploy ให้ตรวจเว็บจริงด้วยสคริปต์ F04 และลอง flow หลักอีกครั้ง

## พัฒนาต่อได้อย่างไร

รายการนี้เป็นงานถัดไปที่เสนอ ยังไม่ใช่ความสามารถที่ทำเสร็จแล้ว:

1. ให้ผู้รับผิดชอบเนื้อหาตรวจภาษาและคำอ่าน พร้อมบันทึกขอบเขตการอนุมัติก่อนนำป้ายร่างออก
2. ทดสอบ native share บนอุปกรณ์จริงและ Google Calendar กับบัญชีทดสอบที่ตั้งค่าแล้ว บันทึกอุปกรณ์/browser/ผลจริงแยกจาก mocks
3. ตรวจ accessibility เพิ่มเรื่อง keyboard, screen reader และสีของสถานะที่ยังอยู่นอกสคริปต์ contrast
4. หากจะเพิ่ม lint rules หรือปรับโครงสร้าง component ให้เปิดงานแยกพร้อมเกณฑ์ตรวจ ขณะนี้ Prettier ตรวจรูปแบบ ส่วน build ตรวจ TypeScript ของ `src/`; ยังไม่มี ESLint และยังไม่ได้ type-check tests แยก

เริ่มจากเลือกหนึ่งงานข้างต้น ระบุพฤติกรรมที่ต้องได้และวิธีพิสูจน์ แล้วเปิด branch ใหม่จาก `origin/main` ล่าสุด

## เอกสารและผู้ดูแล

- ผู้ดูแล repository: [Vagueslim](https://github.com/Vagueslim) แจ้งปัญหาพร้อมขั้นตอนทำซ้ำและ browser ที่ [Issues](https://github.com/Vagueslim/OOCATest/issues)
- [คู่มือนักพัฒนา](docs/DEVELOPMENT.md): กติกาเขียนไฟล์ จุดแก้โค้ด สัญญาข้อมูล การตั้งค่า และการตรวจละเอียด
- [Git workflow](docs/GIT_WORKFLOW.md): branch, PR, merge, deploy และ revert
- [ผลตรวจพร้อมภาพรอบ 2026-11-10](docs/reviews/pick-a-word-2026-11-10.md), [README ก่อนปรับ catalog](README-before-catalog.md) และ [fixture เดิม 53 รายการ](evidence/catalog-visibility/user-catalog-before-status.json) เป็นหลักฐานย้อนหลัง ไม่ใช่ผลตรวจของ commit ล่าสุด
- โครงสร้างคู่มือนี้ยึดหัวข้อเริ่มต้นตาม [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
