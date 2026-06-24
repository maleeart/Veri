# FPG Report — แอพบันทึกผลตรวจสอบ Fire Pump / Generator

แอพมือถือสำหรับช่าง EGAT สำนักงานไทรน้อย ใช้บันทึกผลตรวจสอบ Fire Pump (3 เครื่อง) และ
Generator (1 เครื่อง) แล้ว export ออกเป็นรายงาน Excel/PDF ที่ตรงกับฟอร์มต้นฉบับทุกเซลล์

## โครงสร้างโปรเจกต์

```
app/
  page.js                      หน้าแรก — เลือกเครื่องที่จะตรวจ
  layout.js                    root layout (global CSS, meta)
  globals.css                  design tokens (สี, ฟอนต์, spacing)
  inspect/[machineId]/page.js  ฟอร์มตรวจสอบหลัก (multi-step)
  components/                  UI components (ToggleGroup, ChecklistSection,
                                NumericField, SignaturePad, GaugeProgress ฯลฯ)
  lib/
    useDraftAutosave.js        บันทึก draft ลง localStorage อัตโนมัติ
    formSchema.js               สร้างโครงสร้างฟอร์มเปล่าจาก field-map.json
  api/
    field-map/route.js          ส่ง field-map.json ให้ฝั่งฟอร์มใช้ render checklist
    export-report/route.js      รับข้อมูลฟอร์ม -> สร้างไฟล์ Excel -> บันทึกประวัติ GitHub

src/
  data/field-map.json          *** Source of truth ของตำแหน่งเซลล์ทุกฟิลด์ ***
                                ตรวจสอบกับ template.xlsx จริงด้วย openpyxl แล้ว
  lib/
    excelExporter.js            map ข้อมูล JSON ลงเซลล์ Excel ตาม field-map.json
    githubStorage.js            บันทึก/โหลดประวัติการตรวจผ่าน GitHub Contents API

templates/
  template.xlsx                 ไฟล์ฟอร์มต้นฉบับ ใช้เป็น template สำหรับทุกการ export

public/assets/                   รูป nameplate/อุปกรณ์ของแต่ละเครื่อง (สกัดจาก template.xlsx)
                                แสดงในฟอร์มหน้า "ข้อมูลทั่วไป" เป็นรูปอ้างอิงให้ช่างดูได้
                                โดยไม่ต้องถ่ายใหม่ทุกครั้ง — รายชื่อไฟล์ของแต่ละเครื่องอยู่ใน
                                field-map.json (key: image_files)

mock-test*.js                   สคริปต์ทดสอบ exporter แบบ standalone (รัน `npm run test:export`)
```

## เริ่มต้นใช้งาน (development)

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## ทดสอบ exporter แยก (ไม่ต้องเปิดเว็บ)

```bash
npm run test:export
```

รันทดสอบทั้ง 4 เครื่อง (fire-pump-1/2/3, generator-1) แล้วสร้างไฟล์ `OUTPUT_TEST*.xlsx`
ไว้เปิดดูตรวจสอบด้วยตา (ไฟล์เหล่านี้อยู่ใน .gitignore ไม่ถูก commit)

## ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง:

```bash
cp .env.example .env.local
```

ตัวแปรที่ต้องตั้ง (สำหรับฟีเจอร์บันทึกประวัติการตรวจลง GitHub):

| ตัวแปร | คำอธิบาย |
|---|---|
| `GITHUB_TOKEN` | Personal Access Token ที่มีสิทธิ์เขียนไฟล์ใน repo นี้ |
| `GITHUB_REPO_OWNER` | เจ้าของ repo เช่น `maleeart` |
| `GITHUB_REPO_NAME` | ชื่อ repo เช่น `FPG-report` |
| `GITHUB_REPO_BRANCH` | branch ที่จะ commit ข้อมูล (default `main`) |

### วิธีสร้าง GitHub Token

1. ไปที่ https://github.com/settings/tokens?type=beta (Fine-grained token)
2. เลือก **Repository access** → Only select repositories → เลือก `FPG-report`
3. ใต้ **Permissions** → **Repository permissions** → ตั้ง **Contents** เป็น **Read and write**
4. สร้าง token แล้วคัดลอกไปใส่ใน `.env.local` (หรือ environment variables ของ Vercel ตอน deploy)

**สำคัญ:** ถ้าไม่ตั้งค่า GitHub token ไว้ แอพยังใช้งานได้ปกติทุกอย่าง (ดาวน์โหลดไฟล์ได้เสมอ)
แค่จะไม่มีการบันทึกประวัติการตรวจย้อนหลัง — ฟอร์มจะแจ้งเตือนสีเหลืองให้ทราบ ไม่ใช่ error สีแดง

## Deploy ขึ้น Vercel

1. Push โค้ดนี้ขึ้น GitHub repo `maleeart/FPG-report` (แทนที่โค้ดเดิม)
2. เชื่อม repo เข้า Vercel (import project)
3. ตั้งค่า Environment Variables ในหน้า Vercel project settings ให้ตรงกับที่ระบุข้างบน
4. Deploy

**หมายเหตุเรื่องไฟล์ PDF:** แอพนี้ export เป็น `.xlsx` เท่านั้น (ตรงฟอร์มต้นฉบับทุกเซลล์)
ไม่มีฟีเจอร์แปลง PDF อัตโนมัติในตัวแอพ เพราะ Vercel Functions มี filesystem แบบอ่านอย่างเดียว
(เขียนได้เฉพาะ `/tmp` ไม่เกิน 500 MB) และจำกัดขนาด function หลัง build ไว้ที่ 250 MB ซึ่ง
LibreOffice เต็มรูปแบบมีขนาดใหญ่กว่านี้มากและไม่ได้ติดตั้งมาให้ default — ถ้าต้องการไฟล์ PDF
ให้เปิดไฟล์ Excel ที่ดาวน์โหลดมาแล้วใช้ "Print to PDF" หรือ "Save As PDF" ในโปรแกรม Excel/Numbers
ที่ใช้งานอยู่ได้เลย (Excel เคารพ print_area ที่ตั้งไว้ในไฟล์อยู่แล้ว ไม่ต้องตั้งค่าเพิ่ม)

## field-map.json คือหัวใจของระบบ

ไฟล์นี้กำหนดตำแหน่งเซลล์ทุกจุดในไฟล์ Excel ต้นฉบับ ทั้งฝั่ง backend (`excelExporter.js`)
และฝั่ง frontend (ใช้ render checklist/ฟอร์มแบบ dynamic ผ่าน `formSchema.js`) ถ้าฟอร์ม Excel
ต้นฉบับมีการแก้ไขในอนาคต (เพิ่ม/ลบ field, ย้ายตำแหน่ง) ให้แก้ที่ไฟล์นี้ไฟล์เดียว ไม่ต้องไล่แก้
หลายจุดในโค้ด

**ก่อนแก้ field-map.json**: เปิด `templates/template.xlsx` ด้วย openpyxl ตรวจสอบตำแหน่งเซลล์จริง
ก่อนเสมอ อย่าเดาพิกัด (ดู `_notes` ใน field-map.json อธิบายกลไก checkbox/CCA cell ที่ต้องระวัง)

## หมายเหตุทางเทคนิคที่สำคัญ

1. **Checkbox ในไฟล์ต้นฉบับเป็น legacy VML form control** ไม่ใช่ cell value — exporter เขียน
   ตัวอักษร "X" ลงเซลล์ผลลัพธ์แทนการพยายามติ๊ก checkbox เดิม (ดูรายละเอียดใน excelExporter.js)
2. **ชื่อ sheet บางตัวมี trailing space** (`'FIRE PUMP#2-1 '`, `'GEN#1-2 '`) — field-map.json
   เก็บชื่อที่ถูกต้องไว้แล้ว ใช้ตรงๆ ได้เลย
3. **CCA cell และ Electrical Data cell บางเซลล์มี format ข้อความฝังอยู่** (เช่น `/   924`,
   `ว/ด/ป 06/07/68`) exporter เขียนทับทั้งสตริงตามที่ผู้ใช้กรอก ไม่พยายาม parse/ประกอบใหม่
4. **print_area ถูกกำหนดไว้ในไฟล์ต้นฉบับแล้ว** (`Y2:EF<row>` ของแต่ละชีต) — Excel/Numbers
   เคารพค่านี้เป็นมาตรฐานตอนเปิดดูหรือพิมพ์ ไม่ต้องตั้งค่าเพิ่มฝั่งแอพ exceljs คงค่านี้ไว้
   อัตโนมัติเมื่อ save ไฟล์ใหม่ (ตรวจสอบยืนยันแล้ว)
5. **ลายเซ็น** วาดจากมือถือ (canvas → PNG base64) ฝังเข้าไปแทนที่ตำแหน่งรูปลายเซ็นเดิมในไฟล์
   ต้นฉบับ ด้วย `exceljs` `addImage()` ตรงตำแหน่งที่ตรวจสอบแล้วจาก drawing XML จริง
6. **รูปอ้างอิงใน `public/assets/`** กรองเอาเฉพาะไฟล์ `.jpeg` (รูปอุปกรณ์/nameplate จริง) ออก
   จากทุกรูปที่สกัดมาจาก template.xlsx — ไฟล์ `.png` ทั้งหมดที่เจอในต้นฉบับเป็นรูปลายเซ็นเก่า
   หรือไอคอนตกแต่ง (fuel gauge dial) ไม่ใช่รูปอุปกรณ์ที่ช่างต้องการดูตอนตรวจ จึงถูกตัดออกจาก
   `image_files` ในนี้แล้ว ถ้าเพิ่มเครื่องใหม่ในอนาคต ให้ตรวจสอบรูปแต่ละไฟล์ด้วยตาก่อนใส่ลง
   `image_files` เสมอ อย่าใส่ทุกไฟล์ในโฟลเดอร์โดยไม่ดู
