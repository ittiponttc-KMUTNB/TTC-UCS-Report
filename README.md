# UCS Test Report Generator (Vanilla JS, Local Backup)

แปลงจาก Claude Design mockup (`UCS Test Report.dc.html`) ให้เป็นเว็บแอปที่ deploy จริงได้
เก็บ backup เป็นไฟล์ .json ดาวน์โหลดเก็บเอง ไม่พึ่ง cloud service ใดๆ

## สิ่งที่ทำไว้ให้แล้ว
- Logic คำนวณ ASTM D2166-66 ทั้งหมด (`js/calc.js`) — พอร์ตตรงจาก mockup ไม่แก้สูตร
  ทดสอบเทียบผลกับชุดข้อมูลตัวอย่างเดิม (MH30/J-31) แล้วได้ค่าตรงกับที่ mockup คำนวณ
  (Area 23.903 cm², qu 32.16 ksc, E50 2221.5 ksc ฯลฯ)
- กราฟ Stress-Strain แบบ SVG พร้อม hover tooltip (`js/chart.js`)
- Export Word (.doc) และ Excel (.xlsx) (`js/export-word.js`, `js/export-excel.js`)
- รูป "After Test" — เลือกไฟล์เองผ่านช่องรูปในหน้ารายงาน เก็บเป็น base64 ในเครื่อง
- **ดาวน์โหลด Backup**: ปุ่มเดียว สร้างไฟล์ `.json` ที่มีข้อมูลครบทุกฟิลด์ + ผลคำนวณ + รูป (base64)
  ให้ดาวน์โหลดเก็บเองในโฟลเดอร์ที่ต้องการ
- **นำเข้า Backup**: อัปโหลดไฟล์ `.json` ที่เคยดาวน์โหลดไว้ กลับเข้าโปรแกรมเพื่อดู/แก้ไขต่อได้

## ⚠️ สิ่งที่ต้องตรวจสอบเอง ก่อนใช้งานจริง
1. **เทียบผลลัพธ์กับ mockup เดิมอีกครั้งด้วยชุดข้อมูลจริงของอาจารย์** ผมทดสอบด้วยชุดข้อมูลตัวอย่าง
   ที่ hardcode อยู่ใน mockup แล้วได้ค่าตรงกัน แต่ยังไม่ได้ผ่านการรันเทียบ browser จริงแบบ pixel-by-pixel
   (สภาพแวดล้อมนี้รันเบราว์เซอร์ไม่ได้) — ก่อนใช้งานจริง แนะนำให้เทียบตัวเลข qu, su, ef, E50
   กับ mockup เดิมอีกรอบด้วยชุดข้อมูลจริง 1-2 ชุด
2. **quSource radio button** — mockup ต้นฉบับมีปุ่มเลือก "จากกราฟ / จาก raw data" แต่ในโค้ดจริง
   (`renderVals()`) เรียก `computeResults` ด้วย `quSource: 'raw'` ตายตัวเสมอ ไม่ได้อ่านค่าจาก radio
   ผมพอร์ตพฤติกรรมนี้ไว้เหมือนเดิม (ดูคอมเมนต์ใน `calc.js`) — ถ้าอยากให้ปุ่มนี้ใช้งานได้จริง แจ้งได้เลยครับ
   (หมายเหตุ: radio button นี้ไม่ได้อยู่ใน UI ปัจจุบันแล้ว เพราะ mockup เดิมก็ไม่ได้แสดงปุ่มนี้ในฟอร์มอินพุต
   เป็นค่าที่ตั้งไว้ใน state เท่านั้น)

## ⚠️ ข้อควรระวังเรื่อง Backup แบบ local (สำคัญ)
เพราะไม่มี cloud/database คอยกันข้อมูลหายแล้ว อาจารย์ต้องจัดการเองตามนี้:
- **ต้องกดปุ่ม "ดาวน์โหลด Backup" เองทุกครั้งที่ทำรายการเสร็จ** โปรแกรมไม่ได้บันทึกอัตโนมัติ
  ถ้าปิดแท็บ/รีเฟรชหน้าโดยไม่กดดาวน์โหลดก่อน **ข้อมูลที่กรอกไว้จะหายทันที**
- ไฟล์ backup เป็นไฟล์ในเครื่อง แนะนำตั้งชื่อโฟลเดอร์ให้ชัดเจน (เช่น แยกตามโครงการ/เดือน)
  และกันสำรองซ้ำอีกชั้น (Google Drive sync, external HDD) เพราะถ้าไฟล์หาย/เครื่องพัง = backup หายจริง
- โปรแกรมนี้**ไม่มีหน้ารายการดูประวัติทั้งหมดในตัว** ต้องเปิดไฟล์ `.json` ทีละไฟล์ผ่านปุ่ม "นำเข้า Backup"
  ถ้าในอนาคตต้องการดูภาพรวมหลายตัวอย่างพร้อมกัน (list, ค้นหา, เปรียบเทียบ qu ข้ามตัวอย่าง)
  จะต้องเพิ่มระบบฐานข้อมูล (เช่น Supabase) กลับเข้ามา — แจ้งได้ถ้าต้องการให้ช่วยทำในอนาคต

## รันทดสอบบนเครื่อง (local dev)

ไฟล์นี้ใช้ ES modules (`<script type="module">`) ซึ่ง**เปิดตรงจาก double-click ไฟล์ (file://)
ไม่ได้** ในเบราว์เซอร์ส่วนใหญ่ ต้องรันผ่าน local server เล็กๆ:

```bash
cd ucs_app
python3 -m http.server 8000
# หรือถ้ามี Node: npx serve .
```

แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:8000`

## Deploy จริง

Static hosting ธรรมดาพอ ไม่ต้องมี backend เลย (backup ทำงานฝั่ง browser ล้วนๆ):

**GitHub Pages**
```bash
cd ucs_app
git init
git add .
git commit -m "UCS report app"
git remote add origin <ลิงก์ repo ของอาจารย์>
git push -u origin main
```
แล้วไปที่ repo Settings > Pages > Source เลือก branch `main` โฟลเดอร์ `/ (root)`

**หรือ Netlify** — ลาก-วางโฟลเดอร์ `ucs_app` ทั้งโฟลเดอร์เข้าไปที่ https://app.netlify.com/drop ได้เลย เร็วสุด

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
│   └── app.js                ผูกทุกอย่างเข้าด้วยกัน (state, event, render, backup)
└── assets/kmutnb-logo.png  โลโก้ (ใช้ทั้งในหน้าเว็บและ export Word)
```

## รูปแบบไฟล์ Backup (.json)

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
