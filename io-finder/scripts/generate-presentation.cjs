const pptxgen = require('pptxgenjs');
const pptx = new pptxgen();

pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Phumiphat Siriwat';
pptx.title = 'INTEQC I/O Finder';

// Design Palette
const COLOR_PRIMARY = 'CC1111';    // Crimson Red
const COLOR_DARK = '1E293B';       // Charcoal Slate-800
const COLOR_MUTED = '64748B';      // Muted Slate-500
const COLOR_BG = 'F8FAFC';         // Very light grey/blue Slate-50
const COLOR_WHITE = 'FFFFFF';
const COLOR_BORDER = 'E2E8F0';     // Border Slate-200
const COLOR_ACCENT_BG = 'FFF5F5';  // Very light red
const COLOR_ACCENT_BORDER = 'FEB2B2'; // Light red border
const COLOR_GREEN_BG = 'F0FDF4';   // Green-50
const COLOR_GREEN_BORDER = 'BBF7D0'; // Green-200
const COLOR_NAVY = '0F172A';       // Navy/Slate-900

// Arial is universally installed and renders Thai text beautifully in PPTX.
const FONT_FACE = 'Arial'; 

// Utility to create a slide base with header & footer
function createBaseSlide(title, category) {
  const slide = pptx.addSlide();
  
  // Slide background
  slide.background = { fill: COLOR_BG };
  
  // Top red accent bar
  slide.addShape(pptx.ShapeType.rect, { 
    x: 0, 
    y: 0, 
    w: 13.33, 
    h: 0.1, 
    fill: { color: COLOR_PRIMARY } 
  });
  
  // Category marker (top-left)
  slide.addText(category.toUpperCase(), {
    x: 0.6,
    y: 0.25,
    w: 12.13,
    h: 0.3,
    fontSize: 10,
    fontFace: FONT_FACE,
    color: COLOR_PRIMARY,
    bold: true
  });
  
  // Main title (top-left)
  slide.addText(title, {
    x: 0.6,
    y: 0.55,
    w: 12.13,
    h: 0.6,
    fontSize: 26,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    bold: true
  });
  
  // Footer
  slide.addText("Inteqc Global — Automation Department | Phumiphat Siriwat", {
    x: 0.6,
    y: 7.1,
    w: 8.0,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT_FACE,
    color: COLOR_MUTED
  });
  
  return slide;
}

// ---------------------------------------------------------
// SLIDE 1: Cover (หน้าแรก)
// ---------------------------------------------------------
const s1 = pptx.addSlide();
s1.background = { fill: COLOR_BG };

// Left thick vertical bar (Red)
s1.addShape(pptx.ShapeType.rect, { 
  x: 0, 
  y: 0, 
  w: 0.4, 
  h: 7.5, 
  fill: { color: COLOR_PRIMARY } 
});

// App badge / label
s1.addShape(pptx.ShapeType.rect, {
  x: 1.0,
  y: 2.2,
  w: 1.5,
  h: 0.4,
  fill: { color: COLOR_PRIMARY },
  line: { color: COLOR_PRIMARY, width: 1 }
});
s1.addText("I/O FINDER", {
  x: 1.0,
  y: 2.2,
  w: 1.5,
  h: 0.4,
  fontSize: 11,
  fontFace: FONT_FACE,
  color: COLOR_WHITE,
  bold: true,
  align: 'center',
  valign: 'middle'
});

// Main title
s1.addText("INTEQC I/O Finder", {
  x: 1.0,
  y: 2.7,
  w: 11.33,
  h: 1.2,
  fontSize: 48,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  bold: true
});

// Subtitle
s1.addText("ระบบสืบค้นข้อมูล I/O และแบบแปลนตู้วงจรไฟฟ้าอัจฉริยะแบบรวมศูนย์", {
  x: 1.0,
  y: 3.9,
  w: 11.33,
  h: 0.8,
  fontSize: 20,
  fontFace: FONT_FACE,
  color: COLOR_MUTED
});

// Student & Company Metadata
s1.addText(
  [
    { text: "ผู้จัดทำ: ", options: { bold: true, color: COLOR_DARK } },
    { text: "ภูมิภัทร ศิริวัฒน์ (Phumiphat Siriwat)\n", options: { color: COLOR_DARK } },
    { text: "หน่วยงาน: ", options: { bold: true, color: COLOR_DARK } },
    { text: "นักศึกษาฝึกงานสหกิจศึกษา แผนก Automation, บริษัท Inteqc Global", options: { color: COLOR_DARK } }
  ],
  {
    x: 1.0,
    y: 5.2,
    w: 10.0,
    h: 1.5,
    fontSize: 14,
    fontFace: FONT_FACE,
    lineSpacing: 24
  }
);


// ---------------------------------------------------------
// SLIDE 2: Context / Background (บริบท/ความเป็นมาของปัญหา)
// ---------------------------------------------------------
const s2 = createBaseSlide("บริบท & ความเป็นมาของปัญหา", "01. Context & Background");

// Left Card - Problems
s2.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 1.5,
  w: 5.8,
  h: 5.2,
  fill: { color: COLOR_ACCENT_BG },
  line: { color: COLOR_ACCENT_BORDER, width: 1 }
});

s2.addText("ปัญหาในปัจจุบัน (Current Problems)", {
  x: 0.9,
  y: 1.7,
  w: 5.2,
  h: 0.5,
  fontSize: 18,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});

s2.addText(
  [
    { text: "❌ ข้อมูลกระจัดกระจายและแยกส่วนกัน\n", options: { bold: true, color: COLOR_DARK } },
    { text: "รายการ I/O Points อยู่ในไฟล์ Excel แต่แบบแปลนการต่อสายไฟ (Wiring Diagrams) อยู่ในไฟล์ PDF ขนาดใหญ่\n\n", options: { color: COLOR_DARK } },
    { text: "❌ ไม่มีระบบสืบค้นข้อมูลส่วนกลาง\n", options: { bold: true, color: COLOR_DARK } },
    { text: "เมื่อเกิดปัญหาที่เครื่องจักร ช่างไฟฟ้าต้องเสียเวลาเปิดตาราง Excel หาตำแหน่งตู้/ที่อยู่ จากนั้นต้องไปเปิด PDF แบบแปลนวงจรไฟฟ้ายาวกว่า 1,000 หน้าและเลื่อนหาทีละหน้าด้วยตนเอง\n\n", options: { color: COLOR_DARK } },
    { text: "❌ เสียเวลาในการซ่อมบำรุงและเสี่ยงต่อการผิดพลาด\n", options: { bold: true, color: COLOR_DARK } },
    { text: "ความล่าช้าในการค้นหาทำให้ระยะเวลาเครื่องจักรหยุดทำงาน (Downtime) สูงขึ้น และอาจเกิดความสับสนในการต่อสายไฟจากสัญลักษณ์ที่คล้ายกัน", options: { color: COLOR_DARK } }
  ],
  {
    x: 0.9,
    y: 2.3,
    w: 5.2,
    h: 4.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    lineSpacing: 18
  }
);

// Right Card - Why Need This Project
s2.addShape(pptx.ShapeType.rect, {
  x: 6.9,
  y: 1.5,
  w: 5.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});

s2.addText("ความจำเป็นของโปรเจกต์ (Why Need This Project)", {
  x: 7.2,
  y: 1.7,
  w: 5.2,
  h: 0.5,
  fontSize: 18,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  bold: true
});

s2.addText(
  [
    { text: "🎯 รวมศูนย์ข้อมูล I/O และแบบแปลน (Centralization)\n", options: { bold: true, color: COLOR_DARK } },
    { text: "เชื่อมโยงที่อยู่ I/O, รหัสอุปกรณ์ใน Excel และหน้าแบบแปลน PDF ให้ทำงานสัมพันธ์กันโดยอัตโนมัติในจุดเดียว\n\n", options: { color: COLOR_DARK } },
    { text: "🎯 ค้นหาได้อย่างรวดเร็วด้วย Autocomplete\n", options: { bold: true, color: COLOR_DARK } },
    { text: "รองรับการพิมพ์ค้นหาแบบเดาคำล่วงหน้า (ทั้งรหัสตู้, รหัสเครื่องจักร หรือที่อยู่ I/O) ทำให้เข้าถึงข้อมูลได้ภายในเวลาไม่กี่วินาที\n\n", options: { color: COLOR_DARK } },
    { text: "🎯 ลด Downtime และสนับสนุนช่างหน้างาน\n", options: { bold: true, color: COLOR_DARK } },
    { text: "ช่างไฟฟ้า/วิศวกรสามารถเปิดดูข้อมูลผังวงจรไฟฟ้าที่ถูกต้องได้ทันทีขณะอยู่หน้าตู้คอนโทรล ช่วยให้แก้ปัญหาได้ตรงจุดและแม่นยำสูงสุด", options: { color: COLOR_DARK } }
  ],
  {
    x: 7.2,
    y: 2.3,
    w: 5.2,
    h: 4.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    lineSpacing: 18
  }
);


// ---------------------------------------------------------
// SLIDE 3: Task Description (ลักษณะงานที่ได้รับมอบหมาย)
// ---------------------------------------------------------
const s3 = createBaseSlide("ลักษณะงานที่ได้รับมอบหมาย", "02. Assigned Task");

s3.addText(
  [
    { text: "เป้าหมายหลัก: ", options: { bold: true, color: COLOR_PRIMARY } },
    { text: "พัฒนาเว็บแอปพลิเคชันสำหรับสืบค้นและแสดงความสัมพันธ์ระหว่างข้อมูล Excel รายการ I/O points และเอกสาร PDF แบบแปลนวงจรไฟฟ้าแบบอัตโนมัติ เพื่อช่วยให้ช่างเทคนิคสามารถสืบค้นและเข้าถึงคู่มือการเดินสายไฟได้อย่างมีประสิทธิภาพสูงสุด", options: { color: COLOR_DARK } }
  ],
  {
    x: 0.6,
    y: 1.4,
    w: 12.13,
    h: 1.0,
    fontSize: 15,
    fontFace: FONT_FACE,
    lineSpacing: 22
  }
);

// Diagrams (3 Blocks with arrows)
// Box 1: Excel & PDF Inputs
s3.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 2.8,
  w: 3.4,
  h: 2.5,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s3.addText("1. ข้อมูลนำเข้า (Inputs)", {
  x: 0.8,
  y: 3.0,
  w: 3.0,
  h: 0.4,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  bold: true,
  align: 'center'
});
s3.addText("• ไฟล์รายการ I/O (Excel)\n• แบบแปลนตู้ควบคุม (PDF)\n• โครงสร้างตู้คอนโทรลเดิม", {
  x: 0.8,
  y: 3.5,
  w: 3.0,
  h: 1.5,
  fontSize: 13,
  fontFace: FONT_FACE,
  color: COLOR_MUTED,
  lineSpacing: 20
});

// Arrow 1
s3.addShape(pptx.ShapeType.rightArrow, {
  x: 4.3,
  y: 3.85,
  w: 0.6,
  h: 0.4,
  fill: { color: COLOR_PRIMARY },
  line: { color: COLOR_PRIMARY, width: 1 }
});

// Box 2: System Processing (Engine)
s3.addShape(pptx.ShapeType.rect, {
  x: 5.2,
  y: 2.8,
  w: 3.4,
  h: 2.5,
  fill: { color: COLOR_ACCENT_BG },
  line: { color: COLOR_ACCENT_BORDER, width: 1 }
});
s3.addText("2. การประมวลผล (Engine)", {
  x: 5.4,
  y: 3.0,
  w: 3.0,
  h: 0.4,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true,
  align: 'center'
});
s3.addText("• Script Parsing แยกข้อมูล\n• คลีนคำคลาดเคลื่อน (Normalizer)\n• จับคู่พิกัดและสร้างดัชนีสืบค้น\n• ลิงก์ที่อยู่ I/O กับหน้าแบบแปลน", {
  x: 5.4,
  y: 3.5,
  w: 3.0,
  h: 1.5,
  fontSize: 13,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  lineSpacing: 18
});

// Arrow 2
s3.addShape(pptx.ShapeType.rightArrow, {
  x: 8.9,
  y: 3.85,
  w: 0.6,
  h: 0.4,
  fill: { color: COLOR_PRIMARY },
  line: { color: COLOR_PRIMARY, width: 1 }
});

// Box 3: Output UI
s3.addShape(pptx.ShapeType.rect, {
  x: 9.8,
  y: 2.8,
  w: 3.4,
  h: 2.5,
  fill: { color: COLOR_GREEN_BG },
  line: { color: COLOR_GREEN_BORDER, width: 1 }
});
s3.addText("3. ผลลัพธ์เว็บแอป (Web App UI)", {
  x: 10.0,
  y: 3.0,
  w: 3.0,
  h: 0.4,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: '15803D', // Dark Green
  bold: true,
  align: 'center'
});
s3.addText("• ค้นหาทันใจแบบ Autocomplete\n• หน้าแสดงผลแบบ Split-screen\n• ข้ามไปหน้าแบบแปลนที่ถูกตู้\n• ช่างเทคนิคเปิดหาผ่านมือถือ/แท็บเล็ต", {
  x: 10.0,
  y: 3.5,
  w: 3.0,
  h: 1.5,
  fontSize: 13,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  lineSpacing: 18
});


// ---------------------------------------------------------
// SLIDE 4: Scope of Work (ขอบเขตของงาน)
// ---------------------------------------------------------
const s4 = createBaseSlide("ขอบเขตของงาน (Scope of Work)", "03. Project Scope");

// Column 1: In Scope
s4.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 1.5,
  w: 5.8,
  h: 4.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s4.addText("ขอบเขตงานที่ศึกษาและพัฒนา (In-Scope)", {
  x: 0.9,
  y: 1.7,
  w: 5.2,
  h: 0.4,
  fontSize: 17,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  bold: true
});
s4.addText(
  "• ศึกษาและวิเคราะห์ตู้ควบคุมระบบ Premixer และ Tower 3 เป็นพื้นที่นำร่อง\n" +
  "• พัฒนา JavaScript/Node.js script ในการแยกวิเคราะห์ข้อมูลตาราง Excel\n" +
  "• ออกแบบกระบวนการทำความสะอาดคำด้วยระบบ Normalization Script\n" +
  "• พัฒนา Web application สำหรับค้นหารหัสอุปกรณ์และแสดงรูปวงจรควบคู่กัน\n" +
  "• ทำการ Mapping ที่อยู่ PLC I/O เข้ากับเลขหน้าแบบแปลน PDF",
  {
    x: 0.9,
    y: 2.2,
    w: 5.2,
    h: 3.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 22
  }
);

// Column 2: Out of Scope
s4.addShape(pptx.ShapeType.rect, {
  x: 6.9,
  y: 1.5,
  w: 5.8,
  h: 4.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s4.addText("ขอบเขตงานภายนอก (Out-of-Scope)", {
  x: 7.2,
  y: 1.7,
  w: 5.2,
  h: 0.4,
  fontSize: 17,
  fontFace: FONT_FACE,
  color: COLOR_MUTED,
  bold: true
});
s4.addText(
  "• ไม่รวมการดัดแปลงแก้ไขลายเส้นวงจรในไฟล์ PDF ต้นฉบับ\n" +
  "• ไม่รวมการเขียนโปรแกรมควบคุมหรือปรับเปลี่ยนโปรแกรมบน PLC จริง\n" +
  "• ไม่รวมการดึงสถานะ Real-time Signal ของ I/O point ผ่านอินเทอร์เน็ต (เน้นข้อมูลโครงสร้างและการเดินสายไฟฮาร์ดแวร์)\n" +
  "• ข้อมูล I/O และแบบแปลนไฟฟ้าจำกัดเฉพาะชุดข้อมูลที่ได้รับมอบหมาย",
  {
    x: 7.2,
    y: 2.2,
    w: 5.2,
    h: 3.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    color: COLOR_MUTED,
    lineSpacing: 22
  }
);

// Tech Stack Bottom Bar
s4.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 5.9,
  w: 12.13,
  h: 0.9,
  fill: { color: COLOR_NAVY }
});
s4.addText(
  [
    { text: "TECHNOLOGY STACK:  ", options: { bold: true, color: COLOR_PRIMARY } },
    { text: "Node.js (XLSX, PDF-Parse) | Next.js (React 19, JavaScript) | JSON-based Database Mappings | Vanilla CSS (Premium dark/light layout, micro-animations)", options: { color: COLOR_WHITE } }
  ],
  {
    x: 0.8,
    y: 5.9,
    w: 11.73,
    h: 0.9,
    fontSize: 12,
    fontFace: FONT_FACE,
    valign: 'middle'
  }
);


// ---------------------------------------------------------
// SLIDE 5: Current Progress (ความคืบหน้าปัจจุบัน)
// ---------------------------------------------------------
const s5 = createBaseSlide("ความคืบหน้าปัจจุบัน (Current Progress)", "04. Current Status");

// Left side: completed tasks list
s5.addText("สิ่งที่ได้ดำเนินการแล้วเสร็จ (Completed Tasks)", {
  x: 0.6,
  y: 1.4,
  w: 5.8,
  h: 0.4,
  fontSize: 16,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});

s5.addText(
  "✔ วิเคราะห์โครงสร้างข้อมูล Excel I/O ทั้งหมดของตู้ MCC และ LCB ใน Tower 3 และ Premixer เรียบร้อยแล้ว\n" +
  "✔ พัฒนา Script `parse-excel.cjs` สกัดรหัส ตู้ ยี่ห้อ และสัญญาณ\n" +
  "✔ พัฒนาระบบล้างคำผิดพลาด (เช่น I0.0 คีย์ผิดเป็น IO.0)\n" +
  "✔ พัฒนา Script สแกน PDF แบบแปลนดึงเลขหน้าตามกรอบแบบแปลน\n" +
  "✔ พัฒนาแอปพลิเคชันเวอร์ชันแรก ค้นหาข้อมูลแบบ Autocomplete และลิงก์ไปยังตู้/หน้าแบบแปลนได้สำเร็จ",
  {
    x: 0.6,
    y: 1.9,
    w: 5.8,
    h: 4.8,
    fontSize: 13,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 22
  }
);

// Right side: beautiful Timeline table
s5.addText("แผนงานและกรอบเวลาโครงการ (Project Timeline)", {
  x: 6.8,
  y: 1.4,
  w: 5.9,
  h: 0.4,
  fontSize: 16,
  fontFace: FONT_FACE,
  color: COLOR_DARK,
  bold: true
});

const timelineData = [
  [
    { text: 'กิจกรรมงานหลัก (Key Activities)', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE } },
    { text: 'W1-2', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE, align: 'center' } },
    { text: 'W3-4', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE, align: 'center' } },
    { text: 'W5-6', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE, align: 'center' } },
    { text: 'W7-8', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE, align: 'center' } },
    { text: 'สถานะ', options: { bold: true, fill: { color: COLOR_NAVY }, color: COLOR_WHITE, align: 'center' } }
  ],
  [
    { text: 'วิเคราะห์โครงสร้าง Excel/PDF & คลีนนิ่งข้อมูล', options: { fill: { color: COLOR_WHITE } } },
    { text: '██████', options: { align: 'center', color: COLOR_PRIMARY, fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: 'เสร็จสิ้น 100%', options: { bold: true, color: '15803D', fill: { color: COLOR_WHITE }, align: 'center' } }
  ],
  [
    { text: 'พัฒนา Script Excel Parser & PDF Mapping', options: { fill: { color: 'F8FAFC' } } },
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: '██████', options: { align: 'center', color: COLOR_PRIMARY, fill: { color: 'F8FAFC' } } },
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: 'เสร็จสิ้น 100%', options: { bold: true, color: '15803D', fill: { color: 'F8FAFC' }, align: 'center' } }
  ],
  [
    { text: 'พัฒนาระบบสืบค้น (Next.js UI) & Normalization', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '██████', options: { align: 'center', color: COLOR_PRIMARY, fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: 'เสร็จสิ้น 95%', options: { bold: true, color: '15803D', fill: { color: COLOR_WHITE }, align: 'center' } }
  ],
  [
    { text: 'เก็บข้อมูล + ผนวกรวมชุดข้อมูล Tower 2 เข้าแอป', options: { fill: { color: 'F8FAFC' } } },
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: '██████', options: { align: 'center', color: '3B82F6', fill: { color: 'F8FAFC' } } }, 
    { text: '', options: { fill: { color: 'F8FAFC' } } },
    { text: 'กำลังทำ', options: { bold: true, color: '3B82F6', fill: { color: 'F8FAFC' }, align: 'center' } }
  ],
  [
    { text: 'ทดสอบการใช้งานจริง (UAT) ร่วมกับช่าง & คู่มือ', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '', options: { fill: { color: COLOR_WHITE } } },
    { text: '██████', options: { align: 'center', color: COLOR_MUTED, fill: { color: COLOR_WHITE } } },
    { text: 'ตามแผน', options: { color: COLOR_MUTED, fill: { color: COLOR_WHITE }, align: 'center' } }
  ]
];

s5.addTable(timelineData, {
  x: 6.8,
  y: 1.9,
  w: 5.9,
  h: 4.8,
  fontSize: 10,
  fontFace: FONT_FACE,
  border: { type: 'line', color: COLOR_BORDER, width: 1 }
});


// ---------------------------------------------------------
// SLIDE 6: Challenges & Solutions (ปัญหา/อุปสรรคและการแก้ไข)
// ---------------------------------------------------------
const s6 = createBaseSlide("ปัญหา อุปสรรค และการแก้ไขด้วยตนเอง", "05. Challenges & Solutions");

// 3 Cards layout
// Card 1
s6.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 1.5,
  w: 3.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s6.addText("1. ข้อมูลไม่เป็นระเบียบ\n(Data Inconsistency)", {
  x: 0.8,
  y: 1.7,
  w: 3.4,
  h: 0.6,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});
s6.addText(
  "⚡ ปัญหา:\n" +
  "ใน Excel อุปกรณ์เดียวกันถูกคีย์ไม่ตรงกัน เช่น `V6.4_2` และ `V6.4.2` หรือใช้ขีดล่างสลับจุด ทำให้ค้นหาไม่พบบางตัว\n\n" +
  "💡 วิธีแก้ไขด้วยตนเอง:\n" +
  "พัฒนาฟังก์ชัน `normalizeCode` แปลงเครื่องหมาย `_` และ `-` ให้กลายเป็น `.` เสมอก่อนนำไปสร้างเป็นดัชนี และแปลงคำค้นหาของผู้ใช้งานให้มีฟอร์แมตแบบเดียวกัน ทำให้ค้นหาเจอทุกรูปแบบอย่างสม่ำเสมอ",
  {
    x: 0.8,
    y: 2.4,
    w: 3.4,
    h: 4.1,
    fontSize: 11.5,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 18
  }
);

// Card 2
s6.addShape(pptx.ShapeType.rect, {
  x: 4.76,
  y: 1.5,
  w: 3.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s6.addText("2. ตัวอักษรสะกดผิดเพี้ยน\n(Character Confusion)", {
  x: 4.96,
  y: 1.7,
  w: 3.4,
  h: 0.6,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});
s6.addText(
  "⚡ ปัญหา:\n" +
  "ที่อยู่ PLC มักถูกสะกดคลาดเคลื่อนบ่อย เช่น คีย์ที่อยู่ `I0.0` (ไอ-ศูนย์.ศูนย์) เป็น `IO.0` (ไอ-โอ.ศูนย์) ทำให้ระบบจับคู่สายไฟไม่ได้\n\n" +
  "💡 วิธีแก้ไขด้วยตนเอง:\n" +
  "เขียนตัวกรอง `normalizeAddress` สกัดกั้นปัญหาด้วยการแปลงตัวอักษร 'O/o' ให้เป็นเลข '0' ทุกจุดใน Address ของ I/O points ก่อนจัดเก็บและขณะพิมพ์คำค้นหา ส่งผลให้ข้อผิดพลาดจากการคีย์ของมนุษย์ได้รับการแก้ไขโดยระบบทันที",
  {
    x: 4.96,
    y: 2.4,
    w: 3.4,
    h: 4.1,
    fontSize: 11.5,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 18
  }
);

// Card 3
s6.addShape(pptx.ShapeType.rect, {
  x: 8.92,
  y: 1.5,
  w: 3.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s6.addText("3. PDF 1000 หน้าไม่มีสารบัญ\n(Index-less Large PDF)", {
  x: 9.12,
  y: 1.7,
  w: 3.4,
  h: 0.6,
  fontSize: 15,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});
s6.addText(
  "⚡ ปัญหา:\n" +
  "แบบแปลน PDF มีขนาดยาวและไม่มีดัชนีนำทาง เลขหน้าจริงใน PDF viewer ไม่ตรงกับเลขแบบแปลนภายในตู้ของกรอบกระดาษ\n\n" +
  "💡 วิธีแก้ไขด้วยตนเอง:\n" +
  "เขียน Node script `build-pdf-mapping.cjs` ใช้ library `pdf-parse` แสกนสกัดคำว่า '页数' ร่วมกับกรอบพิกัดหน้า ดึงเลขหน้าจริงในตัวแบบแปลน และแกะหาตำแหน่งคำว่า I/O Address เพื่อนำมาแมปเข้า JSON database ดิจิทัลโดยอัตโนมัติ ทำให้ลิงก์พิกัดได้แม่นยำสูง",
  {
    x: 9.12,
    y: 2.4,
    w: 3.4,
    h: 4.1,
    fontSize: 11.5,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 18
  }
);


// ---------------------------------------------------------
// SLIDE 7: Questions for Discussion (ประเด็นหารือและข้อปรึกษา)
// ---------------------------------------------------------
const s7 = createBaseSlide("ประเด็นเพื่อการหารือและปรึกษา", "06. Discussion & Consult");

// Card Left - Technical
s7.addShape(pptx.ShapeType.rect, {
  x: 0.6,
  y: 1.5,
  w: 5.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s7.addText("ประเด็นทางเทคนิค (Technical Consultation)", {
  x: 0.9,
  y: 1.7,
  w: 5.2,
  h: 0.5,
  fontSize: 18,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});
s7.addText(
  "❓ หัวข้อ: ประสิทธิภาพการเปิดไฟล์แบบแปลน PDF บนเบราว์เซอร์\n\n" +
  "• รายละเอียด: ไฟล์ PDF ของแบบแปลนควบคุมมีขนาดค่อนข้างใหญ่ การโหลดไฟล์เต็มบนอุปกรณ์พกพาของช่างอาจทำให้ระบบค้างหรือเรนเดอร์ช้า\n\n" +
  "• ทางเลือก/ข้อคิดเห็นเพิ่มเติม:\n" +
  "  1. วิธีการข้ามหน้า PDF (Direct Page Jumping) โดยใช้ PDF Viewer component\n" +
  "  2. วิธีการที่กำลังทดลองใน `build-images.cjs` คือการแปลงหน้าแบบแปลนแยกไฟล์รูปภาพ (.png) ล่วงหน้าและดึงมาเฉพาะรูปที่ตรงกับตู้ ซึ่งมีความเร็วสูงมากแต่ใช้พื้นที่จัดเก็บมากขึ้น\n" +
  "  👉 ขอคำแนะนำหรือนโยบายโครงสร้างพื้นฐานสำหรับระบบนี้ในระยะยาว",
  {
    x: 0.9,
    y: 2.3,
    w: 5.2,
    h: 4.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 20
  }
);

// Card Right - Process / Time
s7.addShape(pptx.ShapeType.rect, {
  x: 6.9,
  y: 1.5,
  w: 5.8,
  h: 5.2,
  fill: { color: COLOR_WHITE },
  line: { color: COLOR_BORDER, width: 1 }
});
s7.addText("ประเด็นเชิงกระบวนการ (Process & Scope)", {
  x: 7.2,
  y: 1.7,
  w: 5.2,
  h: 0.5,
  fontSize: 18,
  fontFace: FONT_FACE,
  color: COLOR_PRIMARY,
  bold: true
});
s7.addText(
  "❓ หัวข้อ: ขอบเขตงาน Tower 2 และการจัดแผนเวลา UAT\n\n" +
  "• รายละเอียด: ในการผนวกระบบค้นหาของ Tower 2 เพิ่มเติม ต้องมีการประสานงานของข้อมูล I/O และแบบแปลนที่เป็นเวอร์ชันอัปเดตล่าสุด\n\n" +
  "• ข้อคิดเห็นเพิ่มเติม:\n" +
  "  1. เวลาที่เหลืออีก 4 สัปดาห์ เพียงพอต่อการสร้างข้อมูลและ Mapping หรือไม่?\n" +
  "  2. ควรวางแผนการเข้าไปทดสอบความถูกต้องร่วมกับช่างเทคนิคหน้างานช่วง UAT อย่างไร เพื่อหลีกเลี่ยงผลกระทบต่อรอบเวลาการผลิตปกติของโรงงาน?",
  {
    x: 7.2,
    y: 2.3,
    w: 5.2,
    h: 4.2,
    fontSize: 13,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    lineSpacing: 20
  }
);


// ---------------------------------------------------------
// SLIDE 8: Next Steps (แผนงานในขั้นถัดไป)
// ---------------------------------------------------------
const s8 = createBaseSlide("แผนงานในระยะถัดไป (Next Steps)", "07. Next Steps & Timeline");

// 5 Step Blocks
const steps = [
  { num: "01", title: "ประสานงานข้อมูล Tower 2", desc: "รับตาราง Excel รายการ I/O และแบบแปลนไฟฟ้า PDF ล่าสุดของ Tower 2 จากทีม Automation" },
  { num: "02", title: "ล้างและประมวลผลข้อมูล", desc: "นำเข้าสู่ระบบ Script Parser และทำ Normalization ล้างสัญลักษณ์สับสนของชุดข้อมูลใหม่" },
  { num: "03", title: "ปรับปรุงหน้าเว็บ Split View", desc: "พัฒนาการเรนเดอร์ภาพแบบแปลนให้คมชัดยิ่งขึ้นและปรับความสมูทในการเปลี่ยนหน้าจอแสดงผล" },
  { num: "04", title: "ทำการทดสอบระบบ UAT", desc: "นำเว็บแอปพลิเคชันไปทดสอบใช้งานจริงร่วมกับช่างเทคนิคเพื่อตรวจเช็คความถูกต้องในการเดินสายไฟ" },
  { num: "05", title: "จัดทำคู่มือและส่งมอบงาน", desc: "ทำเอกสารแนะนำการใช้งาน (User Manual) และจัดอบรมสั้นๆ เพื่อเตรียมพร้อมเปิดใช้งานระบบอย่างถาวร" }
];

steps.forEach((step, idx) => {
  const yPos = 1.6 + (idx * 1.05);
  
  // Step Number Badge
  s8.addShape(pptx.ShapeType.rect, {
    x: 0.6,
    y: yPos,
    w: 1.0,
    h: 0.9,
    fill: { color: COLOR_PRIMARY },
    line: { color: COLOR_PRIMARY, width: 1 }
  });
  s8.addText(step.num, {
    x: 0.6,
    y: yPos,
    w: 1.0,
    h: 0.9,
    fontSize: 22,
    fontFace: FONT_FACE,
    color: COLOR_WHITE,
    bold: true,
    align: 'center',
    valign: 'middle'
  });
  
  // Step Detail Card
  s8.addShape(pptx.ShapeType.rect, {
    x: 1.7,
    y: yPos,
    w: 11.0,
    h: 0.9,
    fill: { color: COLOR_WHITE },
    line: { color: COLOR_BORDER, width: 1 }
  });
  
  // Step Title
  s8.addText(step.title, {
    x: 1.9,
    y: yPos + 0.1,
    w: 10.6,
    h: 0.3,
    fontSize: 14,
    fontFace: FONT_FACE,
    color: COLOR_DARK,
    bold: true
  });
  
  // Step Description
  s8.addText(step.desc, {
    x: 1.9,
    y: yPos + 0.4,
    w: 10.6,
    h: 0.4,
    fontSize: 11,
    fontFace: FONT_FACE,
    color: COLOR_MUTED
  });
});

// Output
pptx.writeFile({ fileName: '../inteqc_io_finder_presentation.pptx' })
  .then(name => console.log(`Presentation generated successfully: ${name}`))
  .catch(err => console.error('Error generating presentation:', err));
