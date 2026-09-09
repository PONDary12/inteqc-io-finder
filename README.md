# INTEQC I/O & Electrical Schematic Finder

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Turbopack](https://img.shields.io/badge/Bundler-Turbopack-6366f1?style=for-the-badge)](https://turbo.build/pack)
[![Quality Audit](https://img.shields.io/badge/Audit-0x404_Verified-success?style=for-the-badge)](./scripts/system-audit.cjs)

> **Intelligent Feed Mill Electrical Schematic & PLC I/O Retrieval System**  
> Developed for **INTEQC Feed Co., Ltd.** — Electrical & Automation Engineering Department.

ระบบสืบค้นตำแหน่งสายไฟ PLC I/O และเปิดแบบแปลนวงจรไฟฟ้าโรงงาน (Single Line, วงจรกำลัง 3 เฟส, Soft Starter, VFD Inverter, วงจรควบคุม 24V และโซลินอยด์วาล์ว) แบบ Real-time ผ่านสมาร์ตโฟน แท็บเล็ต และคอมพิวเตอร์ ช่วยลดระยะเวลาในการค้นหาแบบแปลนหน้าตู้คอนโทรลจาก 15–20 นาที เหลือ **ต่ำกว่า 3 วินาที**

---

## 📚 ชุดเอกสารและคู่มือการใช้งาน (Documentation Package)

เพื่อความสะดวกในการใช้งานและการส่งมอบงาน โปรเจกต์นี้มีเอกสารแยกตามกลุ่มผู้ใช้งานครบถ้วน:

| เอกสาร | กลุ่มเป้าหมาย | รายละเอียด |
|---|---|---|
| 📖 [**USER_MANUAL.md**](./USER_MANUAL.md) | ช่างไฟฟ้า / ช่างซ่อมบำรุง / พี่เลี้ยง | คู่มือการใช้งาน, การค้นหา, วิธีอ่านปุ่มสี Schematic Pills, และไอเดียทำสติกเกอร์ QR Code ติดหน้าตู้คอนโทรล |
| 🛠️ [**HANDOVER_DEVELOPER_GUIDE.md**](./HANDOVER_DEVELOPER_GUIDE.md) | โปรแกรมเมอร์ / วิศวกร / เด็กฝึกงานรุ่นถัดไป | สถาปัตยกรรมระบบ, โครงสร้างโค้ด, สคริปต์ Data Pipeline, และ SOP การเพิ่ม Tower ใหม่ |
| 🔀 [**GIT_TEAM_WORKFLOW.md**](./GIT_TEAM_WORKFLOW.md) | สมาชิกในทีมทุกคน | คู่มือการใช้ Git Branch ฉบับจับมือทำ (GitHub Flow, จำลองสถานการณ์นาย A & B, วิธีแก้โค้ดชนกัน) |
| 🎓 [**COOP_INTERNSHIP_REPORT_SUMMARY.md**](./COOP_INTERNSHIP_REPORT_SUMMARY.md) | นักศึกษา / อาจารย์นิเทศก์ / ผู้ประเมิน | บทคัดย่อไทย-อังกฤษ, สถิติวัดผล, ที่มาและความสำคัญ พร้อมคัดลอกลงเล่มรายงานและสไลด์นำเสนอ |
| 📋 [**INTEQC Onboarding SOP Skill**](./.agents/skills/inteqc_drawing_page_mapping/SKILL.md) | AI Agent / Automation Tools | มาตรฐานการสกัด Title Block, การจัดหมวดหมู่วงจร 6 ประเภท, และ Pre-flight Audit |

---

## ⚡ สถิติข้อมูลในระบบ (System Metrics)

- **พื้นที่การผลิตที่ครอบคลุม**: 4 โซน (Premixer, Tower 2 Phase 1, Tower 2 Phase 2, Tower 3)
- **จุด PLC I/O ที่ลงทะเบียน**: **8,091 จุด**
- **เครื่องจักรที่เชื่อมโยงแปลนตรง**: **2,432 เครื่อง**
- **ลิงก์หน้าแบบแปลนไฟฟ้าตรงสู่เครื่อง**: **5,076 จุด**
- **ภาพแบบแปลนดิจิทัลความละเอียดสูง**: **7,437 แผ่น**
- **ข้อผิดพลาดไฟล์ภาพขาดหาย (404 Error)**: **0 แผ่น (100% Verified)**

---

## 🚀 วิธีการรันระบบ (Quick Start)

### 1. รันแบบคลิกเดียวบน Windows ในโรงงาน (One-Click Local Server)
ดับเบิลคลิกไฟล์ **`start-local.bat`** ในโฟลเดอร์นี้:
- ระบบจะตรวจสอบ Node.js, ติดตั้ง library (ครั้งแรก), และตรวจหา IP ของเครื่องให้อัตโนมัติ
- ช่างไฟฟ้าบนวง Wi-Fi เดียวกันสามารถเปิดดูผ่านมือถือได้ทันทีที่ `http://<IP-เครื่องแม่>:3000`

### 2. รันด้วย Docker (สำหรับฝ่าย IT ของโรงงาน)
```bash
cd io-finder
docker compose up -d --build
```
ระบบจะรันบนพอร์ต `3000` พร้อมระบบรีสตาร์ทอัตโนมัติเมื่อเครื่องเปิดใหม่

### 3. รันสำหรับการพัฒนา (Development Mode)
```bash
cd io-finder
npm install
npm run dev
```
เปิดเบราว์เซอร์ที่ `http://localhost:3000`

---

## 🎨 คุณสมบัติเด่นของระบบ (Key Features)

- **Smart Search**: ค้นหาได้ทั้งรหัสเครื่องจักร (`G0104_3`, `2_53`), ชื่อตู้คอนโทรล (`MCC14`, `RCB7`), หรือ PLC Address (`I0.0`, `Q12.4`)
- **Dual Schematic Mapping**: เชื่อมโยงแผ่นแปลนวงจรกำลัง 3 เฟส 380V (Soft Starter, VFD, Metering) ควบคู่กับแผ่น PLC 24V I/O ไว้ในหน้าเดียว
- **Interactive Schematic Pills**: ปุ่มทางลัดแยก 6 สีตามประเภทวงจรไฟฟ้า แตะปุ๊บ สลับหน้าแปลนปั๊บ
- **High-Resolution Drawing Viewer**: ซูมและเลื่อนดูเบอร์สายไฟหน้างานได้อย่างคมชัด รองรับการเปิดเต็มหน้าจอ (Fullscreen)
- **Zero Broken Links**: ผ่านการตรวจสอบด้วยระบบ Automated Audit รับประกันไม่มีภาพเสีย 100%

---

## 👥 ผู้จัดทำและสถานประกอบการ (Credits)

- **สถานประกอบการ**: บริษัท อินเทคค์ ฟีด จำกัด (INTEQC Feed Co., Ltd.)
- **หน่วยงาน**: แผนกวิศวกรรมและซ่อมบำรุงไฟฟ้า (Electrical & Automation Engineering)
- **สิทธิ์การใช้งาน**: สำหรับใช้งานภายในบริษัท อินเทคค์ ฟีด จำกัด เท่านั้น
