# UCS Test Report Generator (Vanilla JS, Local Backup)

แปลงจาก Claude Design mockup (`UCS Test Report.dc.html`) ให้เป็นเว็บแอปที่ deploy จริงได้
เก็บ backup เป็นไฟล์ .json ดาวน์โหลดเก็บเอง ไม่พึ่ง cloud service ใดๆ

**ใช้งานจริงได้ที่:** https://ittiponttc-kmutnb.github.io/TTC-UCS-Report/
(อัปเดตอัตโนมัติทุกครั้งที่ push ขึ้น branch `main` — รอ build ~1 นาที ถ้ายังเห็นของเก่าให้ Hard Refresh
ด้วย Ctrl+Shift+R)

## สิ่งที่ทำไว้ให้แล้ว
- Logic คำนวณ ASTM D2166 ทั้งหมด (`js/calc.js`) — พอร์ตตรงจาก mockup ไม่แก้สูตร
  ทดสอบเทียบผลกับชุดข้อมูลตัวอย่างเดิม (MH30/J-31) ผ่านการรันจริงในเบราว์เซอร์แล้ว
  ได้ค่าตรงกับที่ mockup คำนวณ (Area 23.90 cm², qu 32.16 ksc, E50 2221.5 ksc ฯลฯ)
- กราฟ Stress-Strain แบบ SVG พร้อม hover tooltip (`js/chart.js`)
- Export Word (.doc) และ Excel (.xlsx) (`js/export-word.js`, `js/export-excel.js`)
- รูป "After Test" — เลือกไฟล์เองผ่านช่องรูปในหน้ารายงาน เก็บเป็น base64 ในเครื่อง
- **ดาวน์โหลด Backup**: ปุ่มเดียว สร้างไฟล์ `.json` ที่มีข้อมูลครบทุกฟิลด์ + ผลคำนวณ + รูป (base64)
  ชื่อไฟล์รูปแบบ `UCS_No{เลขที่ใบงาน}_{Specimen from 5 ตัวแรก}_{Project Name 5 ตัวแรก}_{วันที่}.json`
- **นำเข้า Backup**: อัปโหลดไฟล์ `.json` ที่เคยดาวน์โหลดไว้ กลับเข้าโปรแกรมเพื่อดู/แก้ไขต่อได้
- **Autosave draft (localStorage)**: กันข้อมูลหายถ้าลืมกด "ดาวน์โหลด Backup" แล้วปิดแท็บ/รีเฟรช
  ไปเฉยๆ — บันทึกร่างอัตโนมัติในเบราว์เซอร์ (ไม่ใช่ backup ตัวจริง) ทุกครั้งที่แก้ไขข้อมูล
  พอเปิดหน้าใหม่แล้วเจอร่างค้างอยู่จะถามว่ากู้คืนไหม ร่างนี้จะถูกล้างทิ้งอัตโนมัติทันทีที่กด
  "ดาวน์โหลด Backup" สำเร็จ (ดูรายละเอียดใน `js/app.js` หัวข้อ "Autosave draft")
- **พิมพ์/Export PDF จบภายใน 1 หน้า A4 เสมอ**: ถ้าข้อมูล Load-Deformation เยอะจนเนื้อหาสูงเกิน
  297mm โปรแกรมจะย่อขนาด (scale) เนื้อหาทั้งหมดลงอัตโนมัติตอนสั่งพิมพ์ แทนที่จะปล่อยให้ล้นไปหน้า 2
  (ดู `applyPrintScale()` ใน `js/app.js` + `.print-frame` ใน `css/style.css`)
- บรรทัดเซ็นชื่อ (Test by / Controlled Test by / Notified by) ถูกดันไปอยู่ท้ายหน้ากระดาษเสมอ
  (ไม่ลอยติดเนื้อหาด้านบนเวลาข้อมูลน้อย)
- Default: โหมด Load-Deformation เป็น "Load (kg) โดยตรง", Proving Ring / Load cell เริ่มที่ 20 kN
- ไม่ใช้ ES modules แล้ว (เปลี่ยนเป็น plain `<script>` ธรรมดา) — เปิดได้ทั้งผ่านลิงก์ออนไลน์
  และดับเบิลคลิก `index.html` ใช้งานออฟไลน์ในเครื่องได้เลย ไม่ต้องรัน local server

## ⚠️ สิ่งที่ต้องตรวจสอบเอง ก่อนใช้งานจริง
1. **ยังไม่เคยเทียบผลลัพธ์กับข้อมูลทดสอบจริงของอาจารย์เอง** ที่ผ่านมาทดสอบด้วยชุดตัวอย่าง
   MH30/J-31 ที่ hardcode อยู่ใน mockup เดิมตลอด (ตรงกันทุกตัวเลข) แต่ยังไม่เคยรันเทียบกับชุดข้อมูล
   จริงที่อาจารย์ใช้งานเอง แนะนำให้ลองสัก 1-2 ชุดก่อนใช้งานเต็มรูปแบบ
2. **quSource radio button** — mockup ต้นฉบับมีตัวเลือก "จากกราฟ / จาก raw data" แต่ในโค้ดจริง
   (`recompute()` ใน `app.js`) เรียก `computeResults` ด้วย `quSource: 'raw'` ตายตัวเสมอ ไม่ได้อ่านค่าจาก
   radio ใดๆ (ตัวเลือกนี้ไม่ได้อยู่ใน UI ปัจจุบันด้วย เป็นค่าที่ตั้งไว้ใน state เท่านั้น) — ถ้าอยากให้
   เลือกได้จริง แจ้งได้เลยครับ
3. **ยังไม่เคยเห็นผลพิมพ์จริงจากเครื่องพิมพ์/Save PDF จริง** ฟีเจอร์ shrink-to-fit-1-page ตรวจสอบ
   ด้วยการคำนวณ/จำลองในเบราว์เซอร์แล้วว่าตัวเลขถูกต้อง แต่แนะนำให้ลองพิมพ์จริงสักชุดที่มีแถวข้อมูลเยอะๆ
   (20+ แถว) เพื่อความชัวร์ก่อนใช้งานกับผู้ทดสอบจริง

## ⚠️ ข้อควรระวังเรื่อง Backup แบบ local (สำคัญ)
มี autosave draft กันเหตุฉุกเฉินแล้ว (ดูด้านบน) แต่ยังไม่ใช่ของแทน backup ตัวจริง — draft อยู่แค่ใน
เบราว์เซอร์เครื่องเดิมเท่านั้น (ถ้าล้าง cache/เปลี่ยนเครื่อง/เปลี่ยนเบราว์เซอร์ draft จะหายไปด้วย)
ต้องจัดการเองตามนี้:
- **ควรกดปุ่ม "ดาวน์โหลด Backup" ทุกครั้งที่ทำรายการเสร็จ** เพื่อให้ได้ไฟล์ .json เก็บถาวรจริงๆ
- ไฟล์ backup เป็นไฟล์ในเครื่อง แนะนำตั้งชื่อโฟลเดอร์ให้ชัดเจน (เช่น แยกตามโครงการ/เดือน)
  และกันสำรองซ้ำอีกชั้น (Google Drive sync, external HDD) เพราะถ้าไฟล์หาย/เครื่องพัง = backup หายจริง
- โปรแกรมนี้**ไม่มีหน้ารายการดูประวัติทั้งหมดในตัว** ต้องเปิดไฟล์ `.json` ทีละไฟล์ผ่านปุ่ม "นำเข้า Backup"
  ถ้าในอนาคตต้องการดูภาพรวมหลายตัวอย่างพร้อมกัน (list, ค้นหา, เปรียบเทียบ qu ข้ามตัวอย่าง)
  จะต้องเพิ่มระบบฐานข้อมูล (เช่น Supabase) กลับเข้ามา — แจ้งได้ถ้าต้องการให้ช่วยทำในอนาคต

## รันทดสอบบนเครื่อง (local dev)

ไฟล์นี้เป็น plain `<script>` ธรรมดา (ไม่ใช้ ES modules แล้ว) **ดับเบิลคลิกเปิด `index.html`
ตรงๆ ได้เลย** ไม่ต้องรัน local server ก็ได้

ถ้าอยากรันผ่าน local server แทน (เช่น ทดสอบ path ให้เหมือน production เป๊ะๆ) ก็ยังทำได้ตามปกติ:

```bash
cd ucs_app
python3 -m http.server 8000
# หรือถ้ามี Node: npx serve .
```

แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:8000`

## Deploy จริง

Static hosting ธรรมดาพอ ไม่ต้องมี backend เลย (backup ทำงานฝั่ง browser ล้วนๆ) ตอนนี้ deploy อยู่ที่
**GitHub Pages** แล้ว (https://ittiponttc-kmutnb.github.io/TTC-UCS-Report/):

```bash
cd ucs_app
git add -A
git commit -m "อธิบายว่าแก้อะไร"
git push origin main
```

แล้วรอ GitHub Pages build ใหม่อัตโนมัติ (~1 นาที) ที่ repo Settings > Pages ตั้งไว้เป็น
branch `main` โฟลเดอร์ `/ (root)` แล้ว ไม่ต้องตั้งค่าเพิ่ม

**หรือ Netlify** — ลาก-วางโฟลเดอร์ `ucs_app` ทั้งโฟลเดอร์เข้าไปที่ https://app.netlify.com/drop ได้เลย
(ถ้าใช้ทางนี้ เช็คด้วยว่า Site settings > Visitor access ไม่ได้เปิด Password protection ไว้ ไม่งั้น
จะเจอหน้า gate ของ Netlify เองแทนหน้าโปรแกรม)

## โครงสร้างไฟล์

```
ucs_app/
├── index.html              โครงหน้าเว็บทั้งหมด (input panel + report page)
├── css/style.css           สไตล์ทั้งหมด (ล้อ design จาก mockup)
├── js/
│   ├── calc.js              สูตรคำนวณ ASTM D2166 (pure function, ทดสอบแยกได้)
│   ├── chart.js              วาดกราฟ Stress-Strain (SVG) + hover
│   ├── export-word.js        export .doc
│   ├── export-excel.js       export/import .xlsx (ใช้ SheetJS)
│   └── app.js                ผูกทุกอย่างเข้าด้วยกัน (state, event, render, backup, autosave, print)
└── assets/kmutnb-logo.png  โลโก้ (ใช้ทั้งในหน้าเว็บและ export Word)
```

โหลดเข้าหน้าเว็บตามลำดับ `calc.js` -> `chart.js` -> `export-word.js` -> `export-excel.js` -> `app.js`
(plain script ธรรมดา ไม่ใช่ ES modules — ถ้าเพิ่มไฟล์ใหม่ที่ไฟล์อื่นต้องเรียกใช้ ต้องใส่ `<script>`
ไว้ **ก่อน** ไฟล์ที่เรียกใช้ใน `index.html`)

## รูปแบบไฟล์ Backup (.json)

ชื่อไฟล์: `UCS_No{เลขที่ใบงาน}_{Specimen from 5 ตัวแรก}_{Project Name 5 ตัวแรก}_{วันที่ YYYY-MM-DD}.json`

```json
{
  "schema": "ucs-test-backup",
  "version": 1,
  "savedAt": "2026-07-29T09:00:00.000Z",
  "state": { "proj": {...}, "sample": {...}, "...": "...", "photoDataUrl": "data:image/png;base64,..." },
  "results": { "qu": 32.16, "su": 16.08, "ef": 1.68, "e50": 2221.5, "ei": 0, "r2": 0.9846 }
}
```
ไฟล์นี้เปิดอ่านด้วย text editor ธรรมดาได้ (ยกเว้นส่วนรูปที่เป็น base64 ยาวๆ)
เผื่อต้องเขียนสคริปต์แยกดึงข้อมูลย้อนหลังไปทำสรุปรวมทีหลัง

## ถ้าต้องแก้ไขต่อ

- **เพิ่ม/แก้ field ในฟอร์ม**: เพิ่ม `<input data-path="กลุ่ม.ชื่อฟิลด์">` ใน `index.html`
  แล้วเพิ่ม field เดียวกันใน `state` object ต้นไฟล์ `app.js` — ระบบ bind อัตโนมัติ ไม่ต้องเขียน event listener เพิ่ม
  (จำไว้ว่าต้องเพิ่มใน `buildBackupObject()` ด้วยถ้าอยากให้ field นั้นถูกรวมไปใน backup)
- **แก้สูตรคำนวณ**: แก้ที่ `calc.js` ไฟล์เดียว ไม่กระทบ UI
- **เปลี่ยนดีไซน์**: แก้ `css/style.css`
- **แก้พฤติกรรมพิมพ์ 1 หน้า A4**: แก้ที่ `applyPrintScale()` ใน `app.js` กับ `.print-frame` ใน `style.css`
