# คู่มือการพัฒนาและส่งต่อระบบสำหรับนักพัฒนา (Developer Handover Guide)
## INTEQC I/O & Electrical Schematic Finder

เอกสารฉบับนี้เป็นคู่มือทางเทคนิคสำหรับการพัฒนา, ดูแลรักษา, และส่งต่องานระบบ **INTEQC I/O Finder** ให้แก่วิศวกร, โปรแกรมเมอร์, แผนก IT, หรือนักศึกษาฝึกงานรุ่นต่อไป เพื่อให้สามารถต่อยอดระบบและเพิ่ม Tower / ตู้ควบคุมใหม่ได้อย่างมีประสิทธิภาพ

---

## 1. ข้อมูลภาพรวมของระบบ (System Overview)

- **ชื่อโปรเจกต์**: INTEQC I/O & Electrical Schematic Finder
- **วัตถุประสงค์**: ระบบค้นหาตำแหน่ง PLC I/O และเปิดแบบแปลนไฟฟ้า (Single Line, วงจรกำลัง, Soft Starter, VFD, และวงจรควบคุม) สำหรับโรงงานผลิตอาหารสัตว์ INTEQC แบบ Real-time ผ่านสมาร์ตโฟน แท็บเล็ต และคอมพิวเตอร์
- **สถิติข้อมูลปัจจุบัน**:
  - ครอบคลุม 4 พื้นที่: Premixer, Tower 2 (Phase 1), Tower 2 (Phase 2), Tower 3
  - จุด PLC I/O ในระบบ: **8,091 จุด**
  - เครื่องจักรที่มีการเชื่อมโยงแปลนไฟฟ้า: **2,432 เครื่อง**
  - ลิงก์หน้าแบบแปลนไฟฟ้าตรงสู่เครื่องจักร: **5,076 จุด**
  - แผ่นภาพแปลนไฟฟ้าความละเอียดสูงบนระบบ: **7,437 แผ่น**
  - อัตราข้อผิดพลาดไฟล์ภาพขาดหาย (404 Error): **0 จุด (100% Verified)**

---

## 2. เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี | รายละเอียด |
|---|---|---|
| **Frontend Framework** | Next.js 16 (Turbopack, App Router) | สถาปัตยกรรม Server & Client Components ประสิทธิภาพสูง |
| **UI Library & Engine** | React 19.2 + Tailwind CSS v4 | Responsive รองรับทั้ง Mobile, Tablet, และ Desktop |
| **Data Processing** | Node.js (CommonJS `.cjs` Scripts) | แปลงไฟล์ Excel (`xlsx`), ผ่าหน้า PDF (`pdf-parse`, `pdf-lib`) |
| **Image Rendering** | Poppler / PDF-to-PNG Pipeline | เรนเดอร์หน้าแบบแปลน CAD เป็นไฟล์ภาพ PNG คมชัดสูง |
| **Deployment Options** | Vercel / Docker / Windows Batch | รองรับทั้ง Cloud Public และ On-premise Local Network |

---

## 3. โครงสร้างไดเรกทอรี (Directory Structure)

```text
inteqc-io-finder/
├── .agents/skills/               # คลังทักษะ SOP สำหรับ AI Agent (รวมถึงคู่มือ Onboarding)
├── data/                         # ข้อมูลดิบต้นฉบับแบ่งตาม Tower
│   ├── Tower 1/                  # PDF แปลน และ Excel Tags
│   ├── Tower 2/Phase 1/
│   ├── Tower 2/Phase 2/
│   └── Tower 3/
├── io-finder/                    # Next.js Application Core
│   ├── public/
│   │   ├── data/                 # ไฟล์ JSON ฐานข้อมูลระบบ (io-data, pdf-page-map, search-index)
│   │   └── drawings/             # คลังภาพแปลน PNG แยกตาม Tower และตู้ควบคุม
│   ├── src/app/                  # หน้าเว็บ Next.js App Router
│   │   ├── page.js               # หน้าหลัก (Plant Explorer & Tower Selection)
│   │   ├── search/page.js        # หน้าผลลัพธ์การค้นหา
│   │   └── machine/[locationId]/[cabinet]/[equipmentCode]/page.js  # หน้ารายละเอียดเครื่องจักร & Drawing Viewer
│   ├── Dockerfile                # Docker Image สำหรับ IT Deploy
│   ├── docker-compose.yml        # Docker Compose config
│   ├── next.config.mjs           # Next.js Config (ตั้งค่า output: standalone)
│   └── package.json
├── scripts/                      # สคริปต์ Data Pipeline และ Audit
│   ├── parse-excel.cjs           # ดึงข้อมูลจาก PLCTags.xlsx เข้าสู่ระบบ
│   ├── build-pdf-mapping.cjs     # สแกนและผูกหน้าแปลนวงจรไฟฟ้าเข้ากับเครื่องจักร
│   ├── build-images.cjs          # ผ่าเรนเดอร์หน้า PDF ออกมาเป็น PNG
│   └── system-audit.cjs          # สคริปต์ตรวจสุขภาพระบบและเช็คไฟล์ 404
├── GIT_TEAM_WORKFLOW.md          # คู่มือการใช้ Git Branch ฉบับจับมือทำ
├── HANDOVER_DEVELOPER_GUIDE.md   # คู่มือนักพัฒนาฉบับนี้
├── USER_MANUAL.md                # คู่มือการใช้งานสำหรับช่างไฟฟ้าและผู้ใช้ทั่วไป
├── COOP_INTERNSHIP_REPORT_SUMMARY.md # สรุปผลงานสำหรับเล่มรายงานสหกิจและสไลด์
├── start-local.bat               # สคริปต์คลิกเดียวสำหรับรัน Local Server ในโรงงาน
└── README.md                     # เอกสารแนะนำโปรเจกต์
```

---

## 4. เริ่มต้นการพัฒนาบนเครื่อง Local (Quick Start)

### ความต้องการของระบบ:
- Node.js เวอร์ชัน 18 หรือ 20 (ดาวน์โหลดได้จาก [nodejs.org](https://nodejs.org))
- Git

### ขั้นตอนการรัน:
1. **Clone Repository**:
   ```bash
   git clone git@github.com:PhumiP203/inteqc-io-finder.git
   cd inteqc-io-finder/io-finder
   ```
2. **ติดตั้ง Dependencies**:
   ```bash
   npm install
   ```
3. **รัน Development Server**:
   ```bash
   npm run dev
   ```
   เปิดเบราว์เซอร์ที่ `http://localhost:3000`
4. **ทดสอบ Build สำหรับ Production**:
   ```bash
   npm run build
   ```

---

## 5. ขั้นตอนมาตรฐานการเพิ่ม Tower / ตู้ควบคุมใหม่ (New Tower Onboarding SOP)

หากในอนาคตมีแบบแปลนของ **Tower 4** หรือมีตู้ควบคุมใหม่เพิ่มเข้ามา ให้ปฏิบัติตามลำดับขั้นตอนนี้:

### ขั้นตอนที่ 1: จัดเตรียมไฟล์ดิบ
1. นำไฟล์ PDF แบบแปลนวางไว้ที่ `data/<ชื่อ Tower>/泰国inteqc Cabinet drawing.pdf`
2. นำไฟล์ Excel รายการ PLC Tags วางไว้ที่ `data/<ชื่อ Tower>/PLCTags.xlsx`

### ขั้นตอนที่ 2: ดึงข้อมูล I/O จาก Excel
รันสคริปต์เพื่อประมวลผลแท็ก I/O:
```bash
node scripts/parse-excel.cjs
```
- สคริปต์จะอ่าน Address, Tag Name, Description และสร้างรหัสเครื่องจักรลงใน `io-finder/public/data/io-data.json`

### ขั้นตอนที่ 3: กำหนดขอบเขตหน้าของแต่ละตู้ในแบบแปลน
1. เปิดหน้าสารบัญ (目录) ในไฟล์ PDF ดูว่าตู้ไหนอยู่หน้าอะไรถึงหน้าอะไร
2. เปิดไฟล์ `scripts/build-pdf-mapping.cjs` และเพิ่มช่วงหน้าของตู้ลงใน `cabinetRanges`:
   ```javascript
   tower4: [
     { cabinet: 'MCC1', start: 1, end: 20 },
     { cabinet: 'MCC2', start: 21, end: 50 },
     // ...
   ]
   ```

### ขั้นตอนที่ 4: รันสแกนและจัดหมวดหมู่วงจรไฟฟ้า
```bash
node scripts/build-pdf-mapping.cjs
```
- ระบบจะอ่านข้อความใน Title Block และจัดหมวดหมู่วงจร 6 ประเภทเป็นภาษาอังกฤษอัตโนมัติ:
  - `Power & Metering` (วงจรกำลังและมิเตอร์)
  - `Soft Starter Circuit` (วงจรสตาร์ทเตอร์)
  - `VFD Drive Circuit` (วงจรอินเวอร์เตอร์)
  - `PLC Control Circuit` (วงจรควบคุม)
  - `Safety & Interlock` (วงจรความปลอดภัย)
  - `Valve & Actuator` (วงจรโซลินอยด์วาล์ว)

### ขั้นตอนที่ 5: ผ่าและเรนเดอร์ภาพแปลนเป็นไฟล์ PNG
```bash
node scripts/build-images.cjs
```
- ภาพจะถูกบันทึกลงใน `io-finder/public/drawings/<locationId>/cabinets/images/<Cabinet>_page_<PageNumber>.png`

### ขั้นตอนที่ 6: ตรวจสุขภาพระบบด้วย System Audit
```bash
node scripts/system-audit.cjs
```
**เกณฑ์การผ่าน (Must Pass)**:
- Missing files (404): ต้องเป็น **0**
- Chinese characters in UI: ต้องเป็น **0**
- Junk equipment keys: ต้องเป็น **0**

---

## 6. แนวทางการ Deploy ขึ้นใช้งานจริง (Deployment Guide)

### วิธีที่ 1: Deploy บน Vercel (Public Cloud) - แนะนำสำหรับผู้ใช้งานภายนอก/มือถือ
1. เข้าเว็บ [vercel.com](https://vercel.com) และล็อกอินด้วยบัญชี GitHub
2. กด **Add New Project** $\rightarrow$ เลือก Repository `inteqc-io-finder`
3. ในส่วนการตั้งค่า **Project Settings**:
   - **Root Directory**: ให้พิมพ์หรือเลือกโฟลเดอร์ `io-finder` (สำคัญมาก!)
   - **Framework Preset**: Next.js (ระบบจะเลือกให้อัตโนมัติ)
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
4. กด **Deploy**
5. เมื่อเสร็จสิ้น Vercel จะสร้าง URL สาธารณะ เช่น `https://inteqc-io-finder.vercel.app` ซึ่งสามารถแชร์ให้ทุกคนเปิดผ่านมือถือได้ทันที

### วิธีที่ 2: รันผ่าน Local Plant Server (คอมพิวเตอร์ในแผนกไฟฟ้า/ซ่อมบำรุง)
1. ในโฟลเดอร์หลัก ดับเบิลคลิกไฟล์ **`start-local.bat`**
2. สคริปต์จะตรวจสอบความพร้อม ติดตั้ง dependencies และตรวจจับ IP Address ของคอมพิวเตอร์ให้อัตโนมัติ
3. หน้าต่างคอนโซลจะแสดง URL สำหรับเปิดดู:
   - เครื่องตัวเอง: `http://localhost:3000`
   - มือถือ/แท็บเล็ตบน Wi-Fi โรงงาน: `http://<IP-เครื่องแม่>:3000`
4. ช่างไฟฟ้าสามารถเชื่อมต่อ Wi-Fi เดียวกันและใช้งานได้ทันทีแม้ไม่มีอินเทอร์เน็ตภายนอก

### วิธีที่ 3: Deploy ด้วย Docker (สำหรับฝ่าย IT ของโรงงาน)
สำหรับทีม IT ที่มี Server กลาง (Linux หรือ Windows Server):
```bash
cd io-finder
docker compose up -d --build
```
- แอปพลิเคชันจะรันบนพอร์ต `3000` พร้อมระบบ `restart: unless-stopped`

---

## 7. ข้อควรระวังและเทคนิคทางเทคนิค (Gotchas & Best Practices)

1. **กฎภาษาอังกฤษในหน้า UI**:
   - หน้าตาโปรแกรมต้องแสดงผลเป็นภาษาอังกฤษเท่านั้น ห้ามให้ข้อความภาษาจีนจากแบบแปลน CAD หลุดรอดไปยัง UI ที่ผู้ใช้เห็น
2. **React 19 CSS Shorthand Conflict**:
   - ใน React 19 ห้ามเขียนสไตล์ผสมระหว่าง `border` (shorthand) กับ `borderColor` ในอ็อบเจกต์เดียวกัน เพราะจะเกิด Warning ในคอนโซล ให้ใช้:
     ```javascript
     borderWidth: '1px',
     borderStyle: 'solid',
     borderColor: color,
     ```
3. **ไฟล์ชั่วคราวของโปรแกรม Word (`~*.tmp`, `~$*`)**:
   - เมื่อเปิดไฟล์ Word ในโฟลเดอร์โปรเจกต์ บน Windows จะสร้างไฟล์ Lock ขึ้นมาเสมอ ไฟล์ `.gitignore` ถูกตั้งค่าให้ละเว้นไฟล์เหล่านี้ไว้แล้ว อย่าเผลอปลดล็อก
4. **กฎความปลอดภัยของ Git**:
   - ศึกษาวิธีการทำงานร่วมกันใน [GIT_TEAM_WORKFLOW.md](./GIT_TEAM_WORKFLOW.md)
   - เมื่อทำงานเสร็จและต้องการ push ให้ซิงค์ทั้ง `origin master` และ `backup master` เสมอ
