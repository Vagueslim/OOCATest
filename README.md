# Pick a word!

React demo สำหรับเลือกคำ อ่าน ทบทวน และเก็บคำพร้อมมุมที่เลือกไว้ดูย้อนหลัง มี 107 การ์ดและตัวละคร Mooca 21 ท่า

## รันและตรวจงาน

ใช้ Node.js 24 ตาม CI แล้วรันจากโฟลเดอร์ repo:

```sh
npm ci
npm run dev
```

```sh
npm run build
npx playwright install chromium
npx playwright test --config=playwright.config.ts
```

บน Linux ที่ยังไม่มี browser dependencies ใช้ `npx playwright install --with-deps chromium` ชุดทดสอบใช้ Vite dev server พอร์ต 5181 ตาม config ปกติ เพราะบางเคสจำลองข้อมูลผ่าน `/src/*` อย่าชี้ชุดทดสอบทั้งหมดไปยัง production preview หรือเว็บจริง

## ตรวจ build หรือเว็บที่เผยแพร่แล้ว

สคริปต์ F04 ใช้กับ production build โดยตรง ไม่ใช้ module fixtures และไม่อยู่ในชุด `.spec.ts` ข้างต้น เริ่ม preview หลัง `npm run build` ด้วย `npm run preview -- --port 5193 --strictPort` แล้วเปิดอีก terminal รัน:

```sh
node tests/pages-smoke.mjs http://127.0.0.1:5193/OOCATest/
node tests/catalog-live.mjs http://127.0.0.1:5193/OOCATest/
node tests/contrast.mjs http://127.0.0.1:5193/OOCATest/
```

ทุกคำสั่งต้องระบุ URL เมื่อตรวจเว็บจริง เปลี่ยน URL เป็น `https://vagueslim.github.io/OOCATest/` และเลือกโฟลเดอร์รายงานแยกได้ด้วย argument ถัดไป เช่น `node tests/pages-smoke.mjs https://vagueslim.github.io/OOCATest/ evidence/live-verification/production-pages`

- `pages-smoke`: หน้าแรก/ไฟล์ build, เปลี่ยนการ์ด, อ่านเต็ม, ข้าม, บันทึกกลับสำรับ, ประวัติหลัง reload และกรณีเขียน storage ไม่สำเร็จ
- `catalog-live`: เทียบการ์ดที่แสดงทั้งหมดกับ `src/catalog.json` ใน checkout นี้ รวมคำอ่าน ป้ายร่างในรายละเอียดต้นฉบับ และประวัติเดิม โดยเทียบตัวพิมพ์ของ headword และข้อความที่บันทึกแบบตรงตัว; เฉพาะข้อความไทยที่แสดงบนการ์ดจะยุบช่องว่าง ASCII ซ้ำตาม UI ปัจจุบัน
- `contrast`: วัดข้อความปุ่มหลักใน 4 หน้าที่ 360/1440px ทั้ง default/focus/hover และข้อความตัวเลือกมุมที่เลือก รวม 26 ค่าสีและ 8 จุด keyboard focus ไม่ใช่การตรวจ WCAG ทั้งระบบ; Welcome ที่มี gradient, disabled controls และสีเส้น focus อยู่นอกขอบเขต หากค่าสีในขอบเขตวัดไม่ได้ จะบันทึก `not-assessed` และจบด้วย exit code 1

ค่าเริ่มต้นของรายงานคือ `evidence/live-verification/<ชื่อสคริปต์>/results.json` พร้อมภาพประกอบ เมื่อไม่ผ่านจะเขียน `passed:false`, ข้อผิดพลาด และภาพหน้าจอถ้าถ่ายได้ แล้วจบด้วย exit code 1 รายงานมีเวลา/browser/Node และ `sourceCheckoutCommit`/`sourceHasChanges` ของเครื่องที่รัน ซึ่งไม่ใช่หลักฐานว่าเว็บปลายทาง deploy จาก commit นั้น

แต่ละคำสั่งเปิด browser context ใหม่ ข้อมูลทดสอบและการจำลอง storage failure อยู่เฉพาะ context นั้น ไม่ใช้ประวัติใน browser ของผู้ใช้ และไม่เรียก Google Calendar หรือ native share จริง ชุด `.spec.ts` มี regression เพิ่มสำหรับการแยก storage และการเขียนรายงานเมื่อ checker ล้มเหลว

## พฤติกรรมปัจจุบัน

- ปัดซ้าย/ขวาหรือใช้ปุ่มเพื่อเปลี่ยนการ์ด โดยยังไม่เลือกหรือบันทึกอัตโนมัติ รองรับ reduced motion
- แตะการ์ดเพื่ออ่านเต็ม รายละเอียดต้นฉบับเริ่มย่อ ปุ่มเลือกและกลับอยู่ท้ายเนื้อหาและเลื่อนตามหน้า
- เลือกมุมและพิมพ์เพิ่มได้ เมื่อกด “เลือกข้อความนี้” ในหน้าเขียน ระบบเก็บเฉพาะคำและมุม แล้วกลับหน้าเลือกคำในสำรับเดิม ข้อความที่พิมพ์ไม่ถูกบันทึก
- ดูย้อนหลังจากหัวหน้าแอป กรองเดือน เลื่อนดู และลบรายการได้ ประวัติเดิมใช้ข้อความ snapshot ที่เก็บไว้จริง
- เมื่อเลือก “คนอื่น” แสดงปุ่มแชร์การ์ด เตรียม PNG ของการ์ดสาธารณะก่อนคลิก เปิด native share เมื่อรองรับ หากไม่รองรับหรือแชร์ล้มเหลวมีปุ่มดาวน์โหลด การยกเลิกแชร์ไม่ดาวน์โหลดเอง
- ตัวละครทั้งหมดจัดลงกรอบร่วม 166 × 176 CSS pixels ตามขอบเขตส่วนที่ไม่โปร่งใส รักษาสัดส่วนและจัดฐานตรงกัน

## ข้อมูลและความเป็นส่วนตัว

คำแปล ข้อความไทยเรียบเรียง และคำอ่านยังเป็น **ร่าง** ป้ายสถานะอยู่ในรายละเอียดต้นฉบับ การปรับคำอ่าน 37 รายการไม่ได้อนุมัติภาษา เปลี่ยน ID ข้อความ หรือสถานะแสดงผล ดู [fixture ก่อน–หลัง](tests/fixtures/pronunciation-updates.json) และ [รายการอ่านง่าย](docs/reviews/pronunciation-updates.md)

ประวัติอยู่ใน localStorage ของ browser/origin นั้น ใช้ key `ooca-demo:saved-quotes:v1` และ schema เดิม ไม่มีการย้ายข้อมูลระหว่าง localhost กับ GitHub Pages การแชร์ไม่รวมข้อความที่พิมพ์ มุมที่เลือก หรือประวัติส่วนตัว

Google Calendar ต้องกำหนด public OAuth client ID ใน `VITE_GOOGLE_CLIENT_ID` ตาม `.env.example` และอนุญาต origin ใน Google Cloud ผู้ใช้ตรวจข้อมูลและยืนยันก่อนสร้าง event ตัวเดโมไม่จำลองความสำเร็จเมื่อยังไม่ได้ตั้งค่า และไม่เก็บ access token ถาวร การทดสอบอัตโนมัติของ Calendar และ native share ใช้ mocks จึงยังไม่ใช่ผลทดสอบบัญชีจริงหรือเมนูแชร์ของอุปกรณ์จริง

## การพัฒนาและเผยแพร่

ใช้หนึ่งงานต่อหนึ่ง branch/PR และ commit เมื่อได้การเปลี่ยนที่ครบและตรวจสอบได้ ดู [ขั้นตอน Git และการย้อนงาน](docs/GIT_WORKFLOW.md) และ [ผลตรวจรอบนี้พร้อมภาพก่อน–หลัง](docs/reviews/pick-a-word-2026-11-10.md)

PR ต้องผ่าน `validate` (Node 24, build และ Playwright ทุก `.spec.ts`) ก่อน merge เลือก **Create a merge commit** เพื่อรักษา commit ย่อยทั้งหมด เมื่อ merge เข้า `main` แล้ว workflow Pages เดิมจะ deploy อัตโนมัติ

ประวัติก่อนการปรับรอบนี้อยู่ใน Git ส่วน [fixture 53 รายการเดิม](evidence/catalog-visibility/user-catalog-before-status.json) ยังคงไว้สำหรับตรวจความต่อเนื่องของข้อมูล
