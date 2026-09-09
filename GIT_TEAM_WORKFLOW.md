# คู่มือการใช้งาน Git Branch สำหรับการทำงานร่วมกันหลายคน
## INTEQC I/O Finder Team Collaboration Guide

เอกสารฉบับนี้จัดทำขึ้นเพื่อให้ทีมวิศวกร, โปรแกรมเมอร์, และนักศึกษาฝึกงานรุ่นต่อไป สามารถทำงานร่วมกันบน Git Repository นี้ได้อย่างราบรื่น ไม่เกิดปัญหาโค้ดทับกัน (Code Overwriting) และแก้ไขปัญหาเมื่อโค้ดชนกัน (Merge Conflicts) ได้อย่างถูกต้อง

---

## 1. หลักการทำงานพื้นฐาน (GitHub Flow)

ในโปรเจกต์นี้เราใช้โมเดล **GitHub Flow** ซึ่งเข้าใจง่ายและปลอดภัยสูงสุด:

```mermaid
gitGraph
   commit id: "v1.0 (Stable)"
   branch feature/tower4
   checkout feature/tower4
   commit id: "Add Tower 4 PDF"
   commit id: "Build mapping"
   checkout master
   commit id: "Fix mobile UI"
   checkout feature/tower4
   merge master id: "Sync master"
   checkout master
   merge feature/tower4 id: "Merge Tower 4 to Master"
   commit id: "v1.1 (Deploy)"
```

### กฎเหล็ก 3 ข้อ:
1. **`master` คือกิ่งหลักที่ต้องพร้อมใช้งานเสมอ (Production-Ready)**
   - ห้ามเขียนโค้ดและสั่ง Commit ลงบน `master` โดยตรงเมื่อทำงานร่วมกับผู้อื่น
2. **สร้างกิ่งใหม่ (Feature Branch) ทุกครั้งที่มีงานใหม่**
   - เช่น กำลังจะเพิ่ม Tower 4 หรือแก้ UI ให้แตกกิ่งใหม่จาก `master` เสมอ
3. **ทดสอบ Build ก่อนรวมกลับเข้า `master` เสมอ**
   - ต้องรัน `npm run build` ผ่าน 100% ก่อนรวมกิ่ง

---

## 2. มาตรฐานการตั้งชื่อกิ่ง (Branch Naming Convention)

ตั้งชื่อกิ่งเป็นภาษาอังกฤษตัวพิมพ์เล็ก ใช้เครื่องหมายขีดคั่น (`-`) หรือทับ (`/`):

| รูปแบบชื่อกิ่ง | ความหมาย | ตัวอย่าง |
|---|---|---|
| `feature/<name>` | เพิ่มความสามารถใหม่ / เพิ่ม Tower ใหม่ | `feature/tower4-onboarding`, `feature/dark-mode` |
| `fix/<name>` | แก้ไขจุดบกพร่อง / แก้ไขบั๊ก | `fix/mobile-table-scroll`, `fix/drawing-viewer-zoom` |
| `docs/<name>` | ปรับปรุงคู่มือและเอกสาร | `docs/user-manual`, `docs/api-readme` |
| `refactor/<name>` | ปรับปรุงโครงสร้างโค้ดโดยไม่เปลี่ยนการทำงาน | `refactor/build-script-clean` |

---

## 3. จำลองสถานการณ์จริง: นาย A และ นาย B ทำงานพร้อมกัน

### 🧑‍💻 สมมติเหตุการณ์:
- **นาย A**: กำลังทำหน้าที่ **เพิ่ม Tower 4** (`feature/tower4`)
- **นาย B**: กำลังทำหน้าที่ **แก้ปัญหาสีปุ่มในหน้า Machine** (`fix/pill-colors`)

---

### ขั้นตอนของ นาย A (คนเพิ่มฟีเจอร์):

#### สเต็ป 1: ดึงโค้ดล่าสุดจาก `master`
ก่อนจะเริ่มแตกกิ่ง ต้องแน่ใจว่าเครื่องเรามีโค้ดล่าสุดของทุกคน:
```bash
git checkout master
git pull origin master
```

#### สเต็ป 2: สร้างและสลับไปยังกิ่งใหม่
```bash
git checkout -b feature/tower4
# หรือใช้คำสั่งสมัยใหม่: git switch -c feature/tower4
```
*(ตอนนี้คุณจะอยู่ที่กิ่ง `feature/tower4` อย่างปลอดภัย สามารถแก้โค้ดได้เต็มที่)*

#### สเต็ป 3: แก้ไขไฟล์และ Commit เป็นระยะ
```bash
git status
git add data/Tower\ 4/ build-pdf-mapping.cjs
git commit -m "feat: add Tower 4 cabinet mapping and data parser"
```

#### สเต็ป 4: Push กิ่งตัวเองขึ้น GitHub (`origin`) เพื่อสำรองงาน
```bash
git push -u origin feature/tower4
```
> [!TIP]
> กิ่งย่อย (Feature branch) ให้ push ขึ้นเฉพาะ `origin` เท่านั้น ไม่ต้อง push ขึ้น `backup` เพื่อไม่ให้คลังสำรองรก

---

### ขั้นตอนของ นาย B (คนที่ทำงานเสร็จก่อน):

นาย B แก้ปุ่มสีเสร็จแล้ว และได้ทำการรวมเข้า `master` สำเร็จบน GitHub แล้ว

---

### เมื่อนาย A ต้องการรวมงานของตัวเองกลับเข้า `master`:

#### สเต็ป 1: ดึงงานของ นาย B จาก `master` เข้ามาอัปเดตในกิ่งตัวเองก่อน! (สำคัญมาก)
เพื่อป้องกันไม่ให้โค้ดของนาย A เก่ากว่าของคนอื่น:
```bash
git checkout feature/tower4
git pull origin master
```
- ถ้าไม่มีปัญหา: Git จะทำการ Auto-merge ให้เรียบร้อย
- ถ้าโค้ดชนกัน: ให้อ่านหัวข้อ **"วิธีแก้ไขเมื่อโค้ดชนกัน (Merge Conflicts)"** ด้านล่าง

#### สเต็ป 2: ทดสอบว่าแอปพลิเคชันยังคง Build ผ่าน
```bash
cd io-finder
npm run build
cd ..
```

#### สเต็ป 3: รวมกลับเข้า `master`
สามารถทำได้ 2 วิธี:
- **วิธีที่ 1 (แนะนำมากที่สุด)**: เปิดเว็บ GitHub แล้วกดสร้าง **Pull Request (PR)** จาก `feature/tower4` ไปหา `master` ให้เพื่อนช่วยดูแล้วกด Merge บนเว็บ
- **วิธีที่ 2 (ทำผ่าน Terminal บนเครื่อง)**:
  ```bash
  git checkout master
  git merge feature/tower4
  ```

#### สเต็ป 4: Push `master` ที่อัปเดตแล้วขึ้นทั้ง `origin` และ `backup`
```bash
git push origin master
git push backup master
```

#### สเต็ป 5: ลบกิ่งเก่าทิ้ง (เมื่อเสร็จงานแล้ว)
```bash
# ลบบนเครื่องตัวเอง
git branch -d feature/tower4

# ลบบน GitHub
git push origin --delete feature/tower4
```

---

## 4. วิธีแก้ไขเมื่อโค้ดชนกัน (Merge Conflicts)

เมื่อมีคน 2 คนแก้ไขไฟล์เดียวกันในบรรทัดเดียวกัน Git จะแจ้งเตือน:
```text
CONFLICT (content): Merge conflict in build-pdf-mapping.cjs
Automatic merge failed; fix conflicts and then commit the result.
```

### สัญลักษณ์ที่ Git ใส่ไว้ในไฟล์:
```javascript
<<<<<<< HEAD (โค้ดในกิ่งปัจจุบันของคุณ)
const cabinetRanges = {
  tower2_p2: [...],
  tower4: [...] // งานของคุณ
};
=======
const cabinetRanges = {
  tower2_p2: [...],
  tower3: [...] // งานของเพื่อนที่เพิ่งอัปเดตลง master
};
>>>>>>> master (โค้ดที่ดึงมาจาก master)
```

### ขั้นตอนการแก้:
1. **เปิดไฟล์ที่มีปัญหาใน VS Code**:
   - VS Code จะมีปุ่มลัดให้กดด้านบนข้อความ:
     - `Accept Current Change` (เก็บโค้ดเรา)
     - `Accept Incoming Change` (เก็บโค้ดเพื่อน)
     - `Accept Both Changes` (เก็บทั้ง 2 อย่าง - **มักใช้กรณีเพิ่มข้อมูล**)
2. **ตรวจสอบให้แน่ใจว่าลบเครื่องหมาย `<<<<<<<`, `=======`, `>>>>>>>` ออกทั้งหมด**
3. **กรณีเกิด Conflict ในไฟล์ `io-data.json` หรือ `search-index.json`**:
   - ไม่จำเป็นต้องนั่งแก้มือใน JSON!
   - เพียงแค่แก้สคริปต์ `build-pdf-mapping.cjs` ให้ถูกต้อง แล้วสั่งรันสร้าง JSON ใหม่:
     ```bash
     node build-pdf-mapping.cjs
     ```
4. **บันทึกไฟล์และ Commit การแก้ Conflict**:
   ```bash
   git add build-pdf-mapping.cjs
   git commit -m "fix: resolve merge conflict between tower4 and master"
   ```

---

## 5. การตั้งค่า Push เข้าทั้ง `origin` และ `backup` ด้วยคำสั่งเดียว (Pro Tip)

คุณสามารถตั้งค่าให้คำสั่ง `git push origin master` คำสั่งเดียว ดันข้อมูลขึ้นทั้ง GitHub คลังหลักและคลังสำรองพร้อมกันอัตโนมัติ โดยพิมพ์คำสั่งนี้เพียงครั้งเดียว:

```bash
git remote set-url --add --push origin git@github.com:PhumiP203/inteqc-io-finder.git
git remote set-url --add --push origin git@github.com:PhumiP203/inteqc-io-finder-backup.git
```

เมื่อตั้งค่าแล้ว เวลาสั่ง:
```bash
git push origin master
```
Git จะดันขึ้นทั้งสองที่ทันที ป้องกันการลืมสำรองข้อมูลเข้า `backup`!

---

## 6. Git Cheatsheet สรุป 15 คำสั่งที่ใช้บ่อยที่สุด

| คำสั่ง | หน้าที่การทำงาน |
|---|---|
| `git status` | ตรวจสอบสถานะว่ามีไฟล์ไหนถูกแก้หรือยังไม่ได้ commit |
| `git branch -a` | ดูรายชื่อ branch ทั้งหมด (ทั้งในเครื่องและบน GitHub) |
| `git checkout -b <ชื่อ>` | สร้าง branch ใหม่และสลับไปที่ branch นั้นทันที |
| `git switch <ชื่อ>` | สลับไปยัง branch ที่มีอยู่แล้ว |
| `git pull origin master` | ดึงโค้ดล่าสุดจาก master บน GitHub เข้ามาอัปเดต |
| `git add .` | นำไฟล์ที่แก้ไขทั้งหมดเข้าสู่ Staging Area เตรียม commit |
| `git commit -m "ข้อความ"` | บันทึกประวัติการแก้ไข พร้อมระบุคำอธิบายงาน |
| `git push -u origin <ชื่อ>` | ส่งกิ่งใหม่ขึ้น GitHub ครั้งแรก |
| `git push origin <ชื่อ>` | ส่ง commit ใหม่ขึ้น GitHub ในกิ่งที่เชื่อมโยงไว้แล้ว |
| `git merge <ชื่อกิ่ง>` | รวมโค้ดจากกิ่งที่ระบุเข้ามายังกิ่งปัจจุบัน |
| `git branch -d <ชื่อกิ่ง>` | ลบ branch ในเครื่องหลังจากทำงานเสร็จแล้ว |
| `git stash` | เก็บงานที่ยังทำไม่เสร็จไว้ชั่วคราว เพื่อสลับไปทำกิ่งอื่น |
| `git stash pop` | นำงานที่เก็บไว้ด้วย stash กลับคืนมาทำต่อ |
| `git diff` | ดูความแตกต่างของโค้ดที่แก้ไปเทียบกับเวอร์ชันเดิม |
| `git log --oneline -n 5` | ดูประวัติ commit 5 รายการล่าสุดแบบย่อ |
