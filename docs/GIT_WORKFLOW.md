# Git workflow สำหรับ Pick a Word

## ที่มาของ repo รอบ Figma (ประวัติ PR #1)

เริ่มจาก `origin/main` ที่ `7db818fce71bb2c220697bbd71edab0ad4f699bc` ใช้ branch `codex/pick-a-word-figma-update` ใน worktree แยก เนื่องจาก checkout เดิมมีงานค้าง ไม่ต้อง clone repo ใหม่ งานถูกย้ายเฉพาะส่วนต่างจาก `outputs/react-demo` และเก็บ `.gitignore` ของ repo จริงไว้

หลังจบรอบนี้ พัฒนาใน checkout/worktree ของ repo จริงโดยตรง ลดการย้ายไฟล์ระหว่าง demo กับ release

## หนึ่งงาน → หนึ่ง branch → หลาย commit → หนึ่ง PR

1. ตรวจ `git status`, remote และงานค้าง จากนั้น `git fetch origin` ห้ามเขียนทับงานที่ยังไม่ commit
2. ถ้า checkout สะอาด ใช้ `git switch -c codex/<task> origin/main` หากต้องเก็บงานค้างหรือทำงานพร้อมกัน ใช้ worktree แยกจาก `origin/main`
3. แบ่ง commit ตามพฤติกรรมที่ตรวจได้ แต่ละ commit ต้อง build ได้และมี tests ของการเปลี่ยนนั้น ใช้ชื่อเช่น `feat(ui): ...`, `fix(artwork): ...`, `docs: ...`
4. ตรวจ diff แล้ว stage เฉพาะไฟล์ของงานนั้น ไม่รวม credentials, dependencies, build outputs หรือรายงานชั่วคราว ใช้ `npm ci` จาก lockfile
5. Push branch แล้วเปิด Draft PR ตั้งแต่ commit แรก เพิ่ม commit ต่อใน PR เดิม อธิบายปัญหา ผลหลังแก้ ภาพเปรียบเทียบ วิธีตรวจ และข้อจำกัด
6. รัน `npm run format:check`, build และ Playwright ทั้งชุดด้วย config ปกติ รอ CI บน commit ล่าสุดผ่าน ก่อนเปลี่ยน PR เป็น Ready for review
7. ผู้ตรวจอ่าน diff และลองเดโม จากนั้นเลือก **Create a merge commit** เพื่อเก็บทั้ง commit ย่อยและจุดรวมงานเข้า main

อย่า squash รอบนี้ เพราะต้องการรักษาลำดับ commit ทั้งหมด ไม่ต้องสร้าง branch develop เพิ่มสำหรับงานเดี่ยวนี้ และไม่ควรสร้าง commit ย้อนหลังให้ดูเหมือนลำดับการทำงานที่ไม่ได้เกิดขึ้น

## กฎ main และ CI

ตั้ง branch protection ให้ต้องผ่าน PR และ check `validate` จาก GitHub Actions, branch ต้องทันฐานล่าสุด, resolve conversations ก่อน merge, ป้องกัน force push/ลบ main และใช้กฎกับผู้ดูแลด้วย ไม่บังคับ reviewer อีกคน (`required_approving_review_count: 0`) เพื่อให้เจ้าของ repo ตรวจและ merge งานของตนเองได้ ไม่บังคับ linear history เพราะต้องการ merge commit

Workflow `.github/workflows/pr.yml` ใช้ Node 24, npm ci, format check, build, ติดตั้ง Playwright Chromium พร้อม dependencies และรัน config ปกติ เก็บรายงาน/trace/ภาพเมื่อเกิด failure เป็น Actions artifact 14 วัน ดูคำสั่งและกติกาเขียนไฟล์ใน [คู่มือนักพัฒนา](DEVELOPMENT.md)

`.gitignore` ป้องกัน node_modules, dist, credentials และผลทดสอบชั่วคราว ภาพที่คัดเลือกสำหรับรีวิวอยู่ใน `docs/reviews/assets/` ส่วน fixture ประวัติเดิมใน `evidence/catalog-visibility/` ยัง tracked

## หลัง merge

1. ตรวจว่า merge แตะ path ที่กระตุ้น Pages หรือไม่: `src/**`, `public/**`, `index.html`, `package*.json`, `tsconfig.json`, `vite.config.ts` และ `.github/workflows/pages.yml` ตาม workflow ปัจจุบัน งาน docs/tests-only ไม่ deploy อัตโนมัติ หากมี deploy ให้รอ workflow บน merge commit สำเร็จ แล้วตรวจเว็บจริง: เปิดอ่าน ปัดไป/กลับ บันทึกคำ ดูย้อนหลัง และ favicon; สั่ง `workflow_dispatch` ได้เมื่อต้องเผยแพร่ build ใหม่โดยไม่มี path เปลี่ยน
2. ทดสอบ native share บนอุปกรณ์/browser ที่รองรับ และ Calendar ด้วยบัญชีทดสอบที่ตั้งค่าแล้ว หากจะรับรอง integration จริง ผล mocks ใน CI ใช้แทนขั้นนี้ไม่ได้
3. หากมีปัญหาร้ายแรง เปิด revert PR จาก main ล่าสุด โดยใช้ `git revert -m 1 <merge-commit-sha>` สำหรับ merge commit รอบนี้ ตรวจ diff/build/tests และ merge revert PR ตามกระบวนการเดียวกัน ห้าม reset หรือ force push main
4. เมื่อเว็บจริงผ่านและไม่มีงานค้าง จึงลบ remote feature branch และเก็บ/นำ worktree ออกตามเครื่องมือที่สร้างมัน ตรวจ path และ git status ก่อนทุกครั้ง

## เอกสารอ้างอิง

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Git worktree](https://git-scm.com/docs/git-worktree)
- [GitHub pull request merges](https://docs.github.com/en/pull-requests/reference/pull-request-merges)
