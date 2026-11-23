'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidenav from '../../components/Sidenav';

// Compress and downscale uploaded images client-side before storing
const compressImageFile = (file, maxWidth = 1400, maxHeight = 450, quality = 0.85, forceJpeg = false) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('ไฟล์ไม่ใช่รูปภาพ'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (forceJpeg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const format = forceJpeg ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Default Admin Settings
const defaultAdminSettings = {
  header: {
    bannerImageUrl: '', // Data URL หรือ URL ของรูปภาพหัวกระดาษแบบเต็ม A4
    bannerLayout: 'bleed', // 'bleed' (ชิดขอบกระดาษ A4 ทุกด้าน) | 'contained' (เต็มขอบเนื้อหาเอกสาร)
    bannerTheme: 'white', // 'white' (พื้นหลังขาวทางการ ขอบกรมท่าทอง) | 'navy' (สีกรมท่าทอง)
    logoSize: 'large', // 'normal' (60px) | 'large' (80px) | 'xlarge' (96px)
    companyTitle: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)',
    companySubtitle: 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)',
    companyAddress: 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.',
    logoType: 'egat', // 'egat' | 'veri' | 'custom' | 'none'
    customLogoUrl: '',
    showLetterhead: true
  },
  approver: {
    id: 'tuangpetch',
    name: 'นายตวงเพชร ชัยยานนท์',
    role: 'วศ.4 หบท-ธ.',
    signatureType: 'image',
    signatureUrl: '/assets/shared/signature-approver.png'
  },
  approvers: [
    {
      id: 'tuangpetch',
      name: 'นายตวงเพชร ชัยยานนท์',
      role: 'วศ.4 หบท-ธ.',
      signatureType: 'image',
      signatureUrl: '/assets/shared/signature-approver.png',
      isDefault: true
    }
  ],
  activeApproverId: 'tuangpetch',
  runningNumber: {
    prefix: 'REP-',
    yearType: 'buddhist', // 'buddhist' | 'christian' | 'none'
    nextNumber: 1,
    digits: 3
  },
  defaults: {
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    inspectorRole: 'วิศวกรระบบไฟฟ้าและบำรุงรักษา'
  },
  isCustomized: false,
  settingsVersion: 3
};

// Preset sample data (TP019-69 Digital Meter)
const sampleSurveyData = [
  { id: 1, building: "ท.0006", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: [], photo: null },
  { id: 2, building: "ท.0009", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: [], photo: null },
  { id: 3, building: "ท.0011", location: "Main MDB", symptom: "Digital Meter ชำรุด / ระบบ Error ข้อมูลไม่ตรง", qty: 1, action: "เปลี่ยนทดแทน", photos: ["/images/repair/survey_T0011.jpeg"], photo: "/images/repair/survey_T0011.jpeg" },
  { id: 4, building: "ท.0012", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: ["/images/repair/survey_T0012.jpeg"], photo: "/images/repair/survey_T0012.jpeg" },
  { id: 5, building: "ท.0017", location: "Main MDB", symptom: "Digital Meter ชำรุด / ระบบสื่อสารขัดข้อง (ไม่ขึ้นระบบ)", qty: 1, action: "เปลี่ยนทดแทน", photos: ["/images/repair/survey_T0017.jpeg"], photo: "/images/repair/survey_T0017.jpeg" },
  { id: 6, building: "ต.0017", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: ["/images/repair/survey_TO0017.jpeg"], photo: "/images/repair/survey_TO0017.jpeg" },
  { id: 7, building: "ต.0019", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: ["/images/repair/survey_TO0019.jpeg"], photo: "/images/repair/survey_TO0019.jpeg" },
  { id: 8, building: "ท.0020", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: [], photo: null },
  { id: 9, building: "ต.0026", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photos: [], photo: null }
];

const sampleItemsRequested = [
  {
    id: 1,
    name: "Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)",
    modelPart: "Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า",
    qty: 9,
    unit: "ตัว",
    purpose: "ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคารทั้ง 9 จุด (ท.0006, ท.0009, ท.0011, ท.0012, ท.0017, ต.0017, ต.0019, ท.0020, ต.0026)",
    specs: `• ขนาดมิติและการติดตั้ง: ชนิดติดตั้งหน้าตู้สวิตช์บอร์ด (Panel Mount) ขนาดหน้าปัด 96 x 96 มม. เจาะช่องตู้ 92 x 92 มม. หน้าจอ LCD พร้อมไฟ Backlit และปุ่มกดหน้าเครื่อง ≥ 4 ปุ่ม สามารถติดตั้งแทนช่องเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้
• ระบบไฟฟ้าและพิกัดการวัด: รองรับระบบ 3 เฟส 4 สาย (3P4W) และ 3 เฟส 3 สาย (3P3W) ความถี่ 50/60 Hz ย่านวัดแรงดัน Phase-Phase 35–480 VAC, Phase-Neutral 20–277 VAC, Input CT 1A หรือ 5A แหล่งจ่ายไฟ Auxiliary Universal 44–277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่าทางไฟฟ้าครบถ้วน V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิกรวม (THD ทั้งแรงดันและกระแส) รายเฟสได้ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงานไฟฟ้าจริง (Active Energy - kWh) มาตรฐาน Class 0.5S ตาม IEC 62053-22 มีพอร์ตสื่อสาร RS-485 รองรับโปรโตคอล Modbus RTU สำหรับส่งข้อมูลเข้าสู่ระบบ SCADA / Energy Management เดิม
• มาตรฐานความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำและฝุ่นไม่น้อยกว่า IP54 ผ่านการรับรองมาตรฐานสากล IEC 61010-1 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน`,
    photos: []
  }
];

const sampleMeterSpecs = 
`• ขนาดมิติและการติดตั้ง: ชนิดติดตั้งหน้าตู้สวิตช์บอร์ด (Panel Mount) ขนาดหน้าปัด 96 x 96 มม. เจาะช่องตู้ 92 x 92 มม. หน้าจอ LCD พร้อมไฟ Backlit และปุ่มกดหน้าเครื่อง ≥ 4 ปุ่ม สามารถติดตั้งแทนช่องเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้
• ระบบไฟฟ้าและพิกัดการวัด: รองรับระบบ 3 เฟส 4 สาย (3P4W) และ 3 เฟส 3 สาย (3P3W) ความถี่ 50/60 Hz ย่านวัดแรงดัน Phase-Phase 35–480 VAC, Phase-Neutral 20–277 VAC, Input CT 1A หรือ 5A แหล่งจ่ายไฟ Auxiliary Universal 44–277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่าทางไฟฟ้าครบถ้วน V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิกรวม (THD ทั้งแรงดันและกระแส) รายเฟสได้ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงานไฟฟ้าจริง (Active Energy - kWh) มาตรฐาน Class 0.5S ตาม IEC 62053-22 มีพอร์ตสื่อสาร RS-485 รองรับโปรโตคอล Modbus RTU สำหรับส่งข้อมูลเข้าสู่ระบบ SCADA / Energy Management เดิม
• มาตรฐานความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำและฝุ่นไม่น้อยกว่า IP54 ผ่านการรับรองมาตรฐานสากล IEC 61010-1 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน`;

const sampleBreakerSpecs = 
`• พิกัดกระแสและแรงดัน: Circuit Breaker ชนิด Moulded Case Circuit Breaker (MCCB) พิกัดกระแสใช้งาน In ไม่น้อยกว่า 400A ชนิด 3 โพล (3P) ทนแรงดันไม่น้อยกว่า 400/415 VAC 50 Hz
• พิกัดตัดกระแสลัดวงจร: Breaking Capacity Icu/Ics ไม่ต่ำกว่า 36 kA ที่ 400/415 VAC ตามมาตรฐาน IEC 60947-2
• ระบบทริปและกลไกป้องกัน: ชนิด Electronic Trip Unit ปรับตั้งค่า Overload (L) และ Short Circuit (I) ได้ พร้อมปุ่มทดสอบ Trip Test
• มิติและการติดตั้ง: สามารถติดตั้งบนแผ่นยึดเดิมและเข้าขั้วบัสบาร์ของตู้ Main MDB ได้พอดี โดยไม่ต้องดัดแปลงโครงสร้างตู้
• มาตรฐานและการรับประกัน: ผ่านการรับรองมาตรฐานสากล IEC 60947-2 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี`;

const sampleContactorSpecs = 
`• พิกัดและกำลังมอเตอร์: Magnetic Contactor พร้อมชุดโอเวอร์โหลดรีเลย์ รองรับกำลังมอเตอร์ไม่น้อยกว่า 22 kW / 30 HP ที่ 380-400 VAC (การใช้งานประเภท AC-3)
• แรงดันคอยล์ควบคุม: Coil Voltage 220–240 VAC 50/60 Hz
• หน้าสัมผัสช่วย (Auxiliary Contacts): มีหน้าสัมผัสช่วยในตัวไม่น้อยกว่า 2NO + 2NC
• มาตรฐานความปลอดภัย: ผลิตและทดสอบตามมาตรฐาน IEC 60947-4-1 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี`;

// Reusable Signature Drawing Pad Component with Pointer Events
function SignaturePad({ value, onChange, placeholder = 'เซ็นลายมือชื่อที่นี่' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);

  // Initialize Canvas with DPR
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual buffer size matching display size * DPR
    canvas.width = (rect.width || 300) * dpr;
    canvas.height = (rect.height || 100) * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f2e5a';
    ctx.lineWidth = 2.4;

    redrawStrokes();
  };

  const redrawStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    strokesRef.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    currentStrokeRef.current = [pos];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    currentStrokeRef.current.push(pos);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
      setHasDrawn(true);
      const canvas = canvasRef.current;
      if (canvas && onChange) {
        onChange(canvas.toDataURL('image/png'));
      }
    }
  };

  const clear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    if (onChange) onChange(null);
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    redrawStrokes();
    const canvas = canvasRef.current;
    if (strokesRef.current.length === 0) {
      setHasDrawn(false);
      if (onChange) onChange(null);
    } else if (canvas && onChange) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 320, height: 95, border: '1.5px dashed #94a3b8', borderRadius: 6, background: '#ffffff', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair', display: 'block' }}
        />
        {!hasDrawn && !value && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
            ✍️ {placeholder}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          type="button"
          onClick={clear}
          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '3px 10px', borderRadius: 4, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
          ล้าง
        </button>
        <button
          type="button"
          onClick={undo}
          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '3px 10px', borderRadius: 4, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}

function RepairProposalFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRefNo = searchParams.get('refNo') || searchParams.get('edit');
  const initialView = (searchParams.get('view') === 'document' || (searchParams.get('refNo') && !searchParams.get('edit'))) ? 'document' : 'wizard';

  const [activeView, setActiveView] = useState(initialView); // 'wizard' | 'document'
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Admin Settings State
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [skipPdfGuide, setSkipPdfGuide] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Form Fields (Blank by default!)
  const [jobTitle, setJobTitle] = useState('');
  const [refNo, setRefNo] = useState('');
  const [fmRefNo, setFmRefNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [priority, setPriority] = useState('high'); // 'high' | 'normal'
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorRole, setInspectorRole] = useState('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
  const [department, setDepartment] = useState('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า');

  // Step 2: Survey Defect Points (Blank by default!)
  const [surveyPoints, setSurveyPoints] = useState([
    { id: 1, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photos: [], photo: null }
  ]);

  // Step 3: Requested Items & Specifications (Blank by default!)
  const [itemsRequested, setItemsRequested] = useState([
    { id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '', specs: '', photos: [] }
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [expandedItemIndices, setExpandedItemIndices] = useState([0]);
  const [uploadingItemPhotoIdx, setUploadingItemPhotoIdx] = useState(null);

  // Technical Specs / Substitution Conditions (Fallback for backward compatibility)
  const [substitutionSpecs, setSubstitutionSpecs] = useState('');

  // Step 4 & Status: Justification, Approval Status & Signatures
  const [justification, setJustification] = useState('');
  const [proposalStatus, setProposalStatus] = useState('pending_approval'); // 'pending_approval' | 'approved'
  const [approvalDecision, setApprovalDecision] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [approverName, setApproverName] = useState('นายตวงเพชร ชัยยานนท์');
  const [approverRole, setApproverRole] = useState('วศ.4 หบท-ธ.');

  // Signatures
  const [sig1Image, setSig1Image] = useState(null); // Inspector
  const [sig2Image, setSig2Image] = useState(null); // Approver (stamped only when certified by Admin)
  const [approverSigMode, setApproverSigMode] = useState('image'); // 'image' | 'draw'
  const [syncingCloud, setSyncingCloud] = useState(false);

  // Compute Today Thai Date
  const getTodayThaiDate = () => {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return `${now.getDate()} ${months[now.getMonth()]} ${thaiYear}`;
  };

  // Generate Auto-running Proposal Number
  const generateAutoRefNo = async (settings = adminSettings) => {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const christYear = now.getFullYear();
    const prefix = settings?.runningNumber?.prefix || 'REP-';
    const yearType = settings?.runningNumber?.yearType || 'buddhist';
    const digits = settings?.runningNumber?.digits || 3;
    let yearPart = '';
    if (yearType === 'buddhist') yearPart = `${thaiYear}-`;
    else if (yearType === 'christian') yearPart = `${christYear}-`;

    let nextNum = settings?.runningNumber?.nextNumber || 1;

    try {
      const res = await fetch('/api/repair-proposals', { cache: 'no-store' });
      const json = await res.json();
      if (json && json.proposals && Array.isArray(json.proposals)) {
        const regex = new RegExp(`^${prefix}${yearPart}(\\d+)`);
        let maxFound = 0;
        json.proposals.forEach(p => {
          if (p.refNo) {
            const m = p.refNo.match(regex);
            if (m && m[1]) {
              const val = parseInt(m[1], 10);
              if (val > maxFound) maxFound = val;
            }
          }
        });
        if (maxFound >= nextNum) {
          nextNum = maxFound + 1;
        }
      }
    } catch (e) {
      console.warn('Could not check existing proposals:', e);
    }

    const padded = String(nextNum).padStart(digits, '0');
    return `${prefix}${yearPart}${padded}`;
  };

  // Load Admin Settings from LocalStorage / API on Mount
  useEffect(() => {
    const loadSettings = async () => {
      let loaded = defaultAdminSettings;
      let hasLocalCustom = false;

      // 1. Try LocalStorage
      try {
        const local = localStorage.getItem('repair_proposal_admin_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && (parsed.isCustomized || parsed.header?.bannerImageUrl || parsed.approver?.name)) {
            hasLocalCustom = true;
          }
          // Auto-migrate legacy client cache so outdated browsers don't stay locked into small logo or contained layout
          const isLegacy = !parsed.settingsVersion || parsed.settingsVersion < 3;
          const localHeader = parsed.header || {};
          const migratedHeader = {
            ...defaultAdminSettings.header,
            ...localHeader,
            bannerLayout: isLegacy ? 'bleed' : (localHeader.bannerLayout || 'bleed'),
            bannerTheme: isLegacy ? 'white' : (localHeader.bannerTheme || 'white'),
            logoSize: isLegacy ? 'large' : (localHeader.logoSize || 'large'),
          };
          loaded = { 
            ...defaultAdminSettings, 
            ...parsed,
            header: migratedHeader,
            approver: { ...defaultAdminSettings.approver, ...(parsed.approver || {}) },
            approvers: (Array.isArray(parsed.approvers) && parsed.approvers.length > 0) ? parsed.approvers : defaultAdminSettings.approvers,
            activeApproverId: parsed.activeApproverId || defaultAdminSettings.activeApproverId,
            runningNumber: { ...defaultAdminSettings.runningNumber, ...(parsed.runningNumber || {}) },
            defaults: { ...defaultAdminSettings.defaults, ...(parsed.defaults || {}) },
            isCustomized: Boolean(parsed.isCustomized || hasLocalCustom),
            settingsVersion: 3
          };
        }
      } catch (e) {}

      // 2. Try Server API with timestamp cache-busting
      try {
        const res = await fetch(`/api/repair-proposals/settings?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        const data = await res.json();
        if (data && data.ok && data.settings) {
          const s = data.settings;
          const isServerCustomized = s.isCustomized === true || Boolean(s.header?.bannerImageUrl || (s.approver?.name && s.approver.name !== defaultAdminSettings.approver.name));

          // Safe banner resolution: Never let empty string from server wipe out an existing local banner
          const bestBannerImageUrl = (s.header?.bannerImageUrl) || (loaded.header?.bannerImageUrl) || '';

          const isServerDefaultTitle = !s.header?.companyTitle || s.header?.companyTitle === defaultAdminSettings.header.companyTitle;
          const bestCompanyTitle = (!isServerDefaultTitle && s.header?.companyTitle) || loaded.header?.companyTitle || defaultAdminSettings.header.companyTitle;
          const bestCompanySubtitle = (!isServerDefaultTitle && s.header?.companySubtitle) || loaded.header?.companySubtitle || defaultAdminSettings.header.companySubtitle;
          const bestCompanyAddress = (!isServerDefaultTitle && s.header?.companyAddress) || loaded.header?.companyAddress || defaultAdminSettings.header.companyAddress;
          const bestLogoType = (s.header?.logoType && s.header.logoType !== 'egat') ? s.header.logoType : (loaded.header?.logoType || s.header?.logoType || 'egat');
          const bestCustomLogoUrl = s.header?.customLogoUrl || loaded.header?.customLogoUrl || '';

          // Merge: Server settings take precedence for global layout/theme/approver, local keeps custom banner/company if server didn't have it
          loaded = { 
            ...defaultAdminSettings,
            ...loaded, 
            ...s,
            header: { 
              ...defaultAdminSettings.header,
              ...(loaded.header || {}), 
              ...(s.header || {}),
              companyTitle: bestCompanyTitle,
              companySubtitle: bestCompanySubtitle,
              companyAddress: bestCompanyAddress,
              logoType: bestLogoType,
              customLogoUrl: bestCustomLogoUrl,
              bannerImageUrl: bestBannerImageUrl,
              bannerLayout: s.header?.bannerLayout || loaded.header?.bannerLayout || 'bleed',
              bannerTheme: s.header?.bannerTheme || loaded.header?.bannerTheme || 'white',
              logoSize: s.header?.logoSize || loaded.header?.logoSize || 'large',
              showLetterhead: s.header?.showLetterhead !== undefined ? s.header.showLetterhead : (loaded.header?.showLetterhead !== undefined ? loaded.header.showLetterhead : true),
            },
            approver: { ...defaultAdminSettings.approver, ...loaded.approver, ...(s.approver || {}) },
            approvers: (Array.isArray(s.approvers) && s.approvers.length > 0) ? s.approvers : (Array.isArray(loaded.approvers) && loaded.approvers.length > 0 ? loaded.approvers : defaultAdminSettings.approvers),
            activeApproverId: s.activeApproverId || loaded.activeApproverId || defaultAdminSettings.activeApproverId,
            runningNumber: { ...defaultAdminSettings.runningNumber, ...loaded.runningNumber, ...(s.runningNumber || {}) },
            defaults: { ...defaultAdminSettings.defaults, ...loaded.defaults, ...(s.defaults || {}) },
            isCustomized: isServerCustomized || hasLocalCustom || Boolean(bestBannerImageUrl),
            settingsVersion: 3
          };

          // If local has banner image or custom logo but server didn't, auto-sync back to server in background
          if ((!s.header?.bannerImageUrl && loaded.header?.bannerImageUrl) || (!s.header?.customLogoUrl && loaded.header?.customLogoUrl)) {
            fetch('/api/repair-proposals/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: '8888', settings: loaded })
            }).then(r => r.json()).then(res => {
              if (res.ok) console.log('Auto-synced settings to cloud successfully');
            }).catch(e => console.warn('Auto-sync settings failed:', e));
          }
        }
      } catch (e) {}

      setAdminSettings(loaded);

      // Re-save to local storage so any machine is upgraded immediately
      try {
        localStorage.setItem('repair_proposal_admin_settings', JSON.stringify(loaded));
      } catch (e) {}

      // If not editing, apply defaults & auto running refNo
      if (!editRefNo) {
        setDocDate(getTodayThaiDate());
        setApproverName(loaded.approver?.name || 'นายตวงเพชร ชัยยานนท์');
        setApproverRole(loaded.approver?.role || 'วศ.4 หบท-ธ.');
        setSig2Image(null); // Initial state: Approver hasn't certified yet
        setProposalStatus('pending_approval');
        setApprovalDecision('pending');
        setDepartment(loaded.defaults?.department || 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร');
        setInspectorRole(loaded.defaults?.inspectorRole || 'วิศวกรระบบไฟฟ้าและบำรุงรักษา');
        setPriority(loaded.defaults?.priority || 'high');

        // Auto running refNo
        generateAutoRefNo(loaded).then(newRef => setRefNo(newRef));
      }
    };

    loadSettings();
  }, [editRefNo]);

  // Load Existing Proposal if editRefNo present
  useEffect(() => {
    if (editRefNo) {
      fetch(`/api/repair-proposals?refNo=${encodeURIComponent(editRefNo)}&t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && data.refNo) {
            setRefNo(data.refNo);
            setFmRefNo(data.fmRefNo || '');
            setJobTitle(data.jobTitle || '');
            setDocDate(data.docDate || data.docDateISO || getTodayThaiDate());
            setPriority(data.priority || 'high');
            if (data.inspector) {
              setInspectorName(data.inspector.name || '');
              setInspectorRole(data.inspector.role || '');
              setDepartment(data.inspector.department || '');
            }
            if (data.surveyPoints && data.surveyPoints.length > 0) {
              const mapped = data.surveyPoints.map((sp, idx) => {
                const photos = Array.isArray(sp.photos) && sp.photos.length > 0
                  ? sp.photos
                  : (sp.photo ? [sp.photo] : []);
                return {
                  ...sp,
                  id: sp.id || idx + 1,
                  photos,
                  photo: photos[0] || null
                };
              });
              setSurveyPoints(mapped);
            }
            if (data.itemsRequested && data.itemsRequested.length > 0) {
              setItemsRequested(data.itemsRequested);
            }
            if (data.substitutionSpecs) setSubstitutionSpecs(data.substitutionSpecs);
            if (data.justification) setJustification(data.justification);
            const isApproved = data.status === 'approved' || data.signatures?.approver?.decision === 'approved' || (data.signatures?.approver?.signed && Boolean(data.signatures?.approver?.image));
            setProposalStatus(isApproved ? 'approved' : 'pending_approval');
            setApprovalDecision(isApproved ? 'approved' : (data.signatures?.approver?.decision || 'pending'));
            if (data.signatures?.approver?.name) setApproverName(data.signatures.approver.name);
            if (data.signatures?.approver?.role) setApproverRole(data.signatures.approver.role);
            if (isApproved && data.signatures?.approver?.image) {
              setSig2Image(data.signatures.approver.image);
            } else {
              setSig2Image(null);
            }
            if (data.signatures?.surveyor?.image) setSig1Image(data.signatures.surveyor.image);
            if (data.header) {
              setAdminSettings(prev => ({
                ...prev,
                header: {
                  ...prev.header,
                  ...data.header,
                  bannerImageUrl: data.header.bannerImageUrl || prev.header?.bannerImageUrl || '',
                  bannerLayout: data.header.bannerLayout || prev.header?.bannerLayout || 'bleed',
                  bannerTheme: data.header.bannerTheme || prev.header?.bannerTheme || 'white',
                  logoSize: data.header.logoSize || prev.header?.logoSize || 'large',
                }
              }));
            }
          }
        })
        .catch(err => console.error('Failed to load proposal:', err));
    }
  }, [editRefNo]);

  // Reset to Complete Blank Form
  const resetToBlankForm = async () => {
    if (!confirm('ต้องการล้างค่าและเริ่มสร้างฟอร์มเปล่าใหม่ใช่หรือไม่?')) return;
    setJobTitle('');
    setFmRefNo('');
    setDocDate(getTodayThaiDate());
    setPriority(adminSettings.defaults?.priority || 'high');
    setInspectorName('');
    setInspectorRole(adminSettings.defaults?.inspectorRole || 'วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment(adminSettings.defaults?.department || 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร');
    setSurveyPoints([
      { id: 1, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photos: [], photo: null }
    ]);
    setItemsRequested([
      { id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '', specs: '', photos: [] }
    ]);
    setActiveItemIndex(0);
    setExpandedItemIndices([0]);
    setSubstitutionSpecs('');
    setJustification('');
    setApproverName(adminSettings.approver?.name || 'นายตวงเพชร ชัยยานนท์');
    setApproverRole(adminSettings.approver?.role || 'วศ.4 หบท-ธ.');
    setSig1Image(null);
    setSig2Image(null);
    setProposalStatus('pending_approval');
    setApprovalDecision('pending');
    setCurrentStep(0);
    setActiveView('wizard');

    // Re-generate next running number
    const newRef = await generateAutoRefNo(adminSettings);
    setRefNo(newRef);
  };

  // Load Preset Sample Proposal (TP019-69)
  const loadSample = () => {
    if (!confirm('ต้องการโหลดข้อมูลตัวอย่าง TP019-69 (เปลี่ยน Digital Meter 9 ตัว) ใช่หรือไม่?')) return;
    setJobTitle('งานเปลี่ยน meter Main MDB ของหน่วยงาน');
    setRefNo('TP019-69');
    setFmRefNo('FM-69-0412');
    setDocDate('10 พฤศจิกายน 2569');
    setPriority('high');
    setInspectorName('นายวิศวกร ช่างสำรวจ (วิศวกรไฟฟ้า)');
    setInspectorRole('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า (หบท-ธ.)');
    setSurveyPoints(sampleSurveyData);
    setItemsRequested(sampleItemsRequested);
    setActiveItemIndex(0);
    setExpandedItemIndices([0]);
    setSubstitutionSpecs(sampleMeterSpecs);
    setJustification('');
    setApproverName('นายตวงเพชร ชัยยานนท์');
    setApproverRole('วศ.4 หบท-ธ.');
    setSig2Image('/assets/shared/signature-approver.png');
    setProposalStatus('approved');
    setApprovalDecision('approved');
    setCurrentStep(0);
  };

  // Survey Defect Points Handlers
  const handlePointChange = (index, field, val) => {
    const next = [...surveyPoints];
    next[index] = { ...next[index], [field]: val };
    setSurveyPoints(next);
  };

  const addPoint = () => {
    const nextId = surveyPoints.length + 1;
    setSurveyPoints([
      ...surveyPoints,
      { id: nextId, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photos: [], photo: null }
    ]);
  };

  const removePoint = (index) => {
    if (surveyPoints.length <= 1) return;
    setSurveyPoints(surveyPoints.filter((_, i) => i !== index));
  };

  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState(null);

  const handlePhotoUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentItem = surveyPoints[index];
    const currentPhotos = Array.isArray(currentItem.photos) 
      ? [...currentItem.photos] 
      : (currentItem.photo ? [currentItem.photo] : []);

    const availableSlots = 3 - currentPhotos.length;
    if (availableSlots <= 0) {
      alert('สามารถแนบรูปภาพได้สูงสุด 3 รูปต่อรายการ');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setUploadingPhotoIdx(index);
    try {
      const compressedList = await Promise.all(
        filesToProcess.map(file => compressImageFile(file, 1000, 1000, 0.72, true))
      );
      const nextPhotos = [...currentPhotos, ...compressedList];
      const next = [...surveyPoints];
      next[index] = {
        ...next[index],
        photos: nextPhotos,
        photo: nextPhotos[0] || null
      };
      setSurveyPoints(next);
    } catch (err) {
      console.error('Photo compression/upload error:', err);
      alert('เกิดข้อผิดพลาดในการโหลดรูปภาพ: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setUploadingPhotoIdx(null);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (pointIndex, photoIndex) => {
    const currentItem = surveyPoints[pointIndex];
    const currentPhotos = Array.isArray(currentItem.photos) 
      ? [...currentItem.photos] 
      : (currentItem.photo ? [currentItem.photo] : []);
    const nextPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    const next = [...surveyPoints];
    next[pointIndex] = {
      ...next[pointIndex],
      photos: nextPhotos,
      photo: nextPhotos[0] || null
    };
    setSurveyPoints(next);
  };

  // Requested Items Handlers
  const handleItemChange = (index, field, val) => {
    const next = [...itemsRequested];
    next[index] = { ...next[index], [field]: val };
    setItemsRequested(next);
  };

  const addItemRequested = () => {
    const nextId = itemsRequested.length + 1;
    const newIdx = itemsRequested.length;
    setItemsRequested([
      ...itemsRequested,
      { id: nextId, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '', specs: '', photos: [] }
    ]);
    setActiveItemIndex(newIdx);
    setExpandedItemIndices(prev => [...prev, newIdx]);
  };

  const removeItemRequested = (index) => {
    if (itemsRequested.length <= 1) return;
    const next = itemsRequested.filter((_, i) => i !== index);
    setItemsRequested(next);
    setExpandedItemIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    if (activeItemIndex >= next.length) {
      setActiveItemIndex(Math.max(0, next.length - 1));
    }
  };

  const toggleItemExpanded = (idx) => {
    setExpandedItemIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const expandAllItems = () => {
    setExpandedItemIndices(itemsRequested.map((_, i) => i));
  };

  const collapseAllItems = () => {
    setExpandedItemIndices([]);
  };

  const handleItemPhotoUpload = async (index, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentItem = itemsRequested[index];
    const currentPhotos = Array.isArray(currentItem.photos) 
      ? [...currentItem.photos] 
      : (currentItem.photo ? [currentItem.photo] : []);

    const availableSlots = 3 - currentPhotos.length;
    if (availableSlots <= 0) {
      alert('สามารถแนบรูปภาพอุปกรณ์ได้สูงสุด 3 รูปต่อรายการ');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setUploadingItemPhotoIdx(index);
    try {
      const compressedList = await Promise.all(
        filesToProcess.map(file => compressImageFile(file, 1000, 1000, 0.72, true))
      );
      const nextPhotos = [...currentPhotos, ...compressedList];
      const next = [...itemsRequested];
      next[index] = {
        ...next[index],
        photos: nextPhotos,
        photo: nextPhotos[0] || null
      };
      setItemsRequested(next);
    } catch (err) {
      console.error('Item photo upload error:', err);
      alert('เกิดข้อผิดพลาดในการโหลดรูปภาพ: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setUploadingItemPhotoIdx(null);
      e.target.value = '';
    }
  };

  const handleRemoveItemPhoto = (itemIndex, photoIndex) => {
    const currentItem = itemsRequested[itemIndex];
    const currentPhotos = Array.isArray(currentItem.photos) 
      ? [...currentItem.photos] 
      : (currentItem.photo ? [currentItem.photo] : []);
    const nextPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    const next = [...itemsRequested];
    next[itemIndex] = {
      ...next[itemIndex],
      photos: nextPhotos,
      photo: nextPhotos[0] || null
    };
    setItemsRequested(next);
  };

  // Equipment Presets
  const applyEquipPreset = (type, targetIdx = 0) => {
    const next = [...itemsRequested];
    const idx = (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < next.length) ? targetIdx : 0;
    if (next.length === 0) {
      next.push({ id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '', specs: '', photos: [] });
    }
    const target = next[idx];

    if (type === 'meter') {
      target.name = "Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)";
      target.modelPart = "Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า";
      target.unit = "ตัว";
      target.purpose = "ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคาร";
      target.specs = sampleMeterSpecs;
      setSubstitutionSpecs(sampleMeterSpecs);
    } else if (type === 'breaker') {
      target.name = "Moulded Case Circuit Breaker (MCCB) พิกัด 400A 3P 36kA";
      target.modelPart = "Schneider Electric Compact NSX400F (Part No. LV432676) หรือเทียบเท่า";
      target.unit = "ตัว";
      target.purpose = "เปลี่ยนทดแทนเซอร์กิตเบรกเกอร์เมนเดิมที่ชำรุด ไม่ตัดวงจร หรือเสื่อมสภาพในตู้สวิตช์บอร์ด";
      target.specs = sampleBreakerSpecs;
      setSubstitutionSpecs(sampleBreakerSpecs);
    } else if (type === 'contactor') {
      target.name = "Magnetic Contactor พร้อม Thermal Overload Relay";
      target.modelPart = "Mitsubishi Electric S-T50 (Coil 220VAC) + TH-T50 หรือเทียบเท่า";
      target.unit = "ชุด";
      target.purpose = "เปลี่ยนทดแทนแมกเนติกคอนแทกเตอร์ควบคุมมอเตอร์ปั๊มน้ำเดิมที่หน้าสัมผัสไหม้ชำรุด";
      target.specs = sampleContactorSpecs;
      setSubstitutionSpecs(sampleContactorSpecs);
    } else if (type === 'inverter') {
      target.name = "Variable Frequency Drive (VFD / Inverter) ขนาด 15 kW / 20 HP";
      target.modelPart = "ABB ACS580-01-033A-4 หรือ Schneider ATV320U15N4B หรือเทียบเท่า";
      target.unit = "เครื่อง";
      target.purpose = "เปลี่ยนทดแทนอินเวอร์เตอร์ขับเคลื่อนมอเตอร์ระบบปรับอากาศเดิมที่ชำรุด บอร์ดควบคุม Error";
      target.specs = 
`• พิกัดกำลังมอเตอร์: สำหรับขับเคลื่อนมอเตอร์เหนี่ยวนำ 3 เฟส ขนาด 15 kW (20 HP) 380-480 VAC 50 Hz
• คุณลักษณะการควบคุม: รองรับ Scalar (V/f) และ Sensorless Vector Control พร้อม Built-in EMC Filter (C2/C3)
• แผงควบคุมและการสื่อสาร: จอควบคุมแบบ Graphic Display ถอดเสียบได้ มีพอร์ต RS-485 รองรับ Modbus RTU
• มาตรฐานและการรับประกัน: ผ่านการรับรองมาตรฐานสากล CE / UL และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี`;
      setSubstitutionSpecs(target.specs);
    } else if (type === 'capacitor') {
      target.name = "Power Capacitor Bank สำหรับปรับปรุงค่า Power Factor ขนาด 50 kVAR 400V";
      target.modelPart = "Schneider Electric VarPlus Can (Part No. BLRCS500A600B40) หรือเทียบเท่า";
      target.unit = "ลูก";
      target.purpose = "เปลี่ยนทดแทนคาปาซิเตอร์เดิมที่บวม เสื่อมสภาพ และค่าความจุลดลงในตู้ Cap Bank";
      target.specs = 
`• พิกัดขนาดและแรงดัน: ขนาดความจุไม่น้อยกว่า 50 kVAR ที่แรงดันพิกัด 400/415 VAC 50 Hz ชนิด 3 เฟส
• โครงสร้างและความปลอดภัย: ตัวถังอะลูมิเนียมทรงกระบอก พร้อมระบบตัดวงจรเมื่อเกิดแรงดันเกินภายใน (Overpressure Disconnector)
• การทนกระแสเกิน: ทนกระแสต่อเนื่อง (In) ได้ไม่น้อยกว่า 1.5 เท่า และ Inrush Current สูงสุด 200 เท่า
• การสูญเสียและมาตรฐาน: ค่าการสูญเสียกำลังไฟฟ้าต่ำกว่า 0.5 W/kVAR ผลิตตามมาตรฐาน IEC 60831-1/2 และรับประกัน 1 ปี`;
      setSubstitutionSpecs(target.specs);
    }
    setItemsRequested(next);
  };

  // Online Save to GitHub
  const handleSaveOnline = async () => {
    if (!refNo.trim()) {
      alert('กรุณาระบุเลขที่ใบเสนอแจ้งซ่อม (Ref. No.)');
      return;
    }
    setSaving(true);
    const payload = {
      refNo: refNo.trim(),
      fmRefNo: (fmRefNo || '').trim(),
      jobTitle: jobTitle.trim(),
      docDate,
      docDateISO: new Date().toISOString().slice(0, 10),
      priority,
      status: proposalStatus === 'approved' ? 'approved' : 'pending_approval',
      inspector: {
        name: inspectorName,
        role: inspectorRole,
        department
      },
      header: {
        bannerImageUrl: adminSettings.header?.bannerImageUrl || '',
        bannerLayout: adminSettings.header?.bannerLayout || 'bleed',
        showLetterhead: adminSettings.header?.showLetterhead ?? true,
      },
      surveyPoints: surveyPoints.map(sp => {
        const photos = Array.isArray(sp.photos) && sp.photos.length > 0
          ? sp.photos
          : (sp.photo ? [sp.photo] : []);
        return {
          ...sp,
          photos,
          photo: photos[0] || null
        };
      }),
      itemsRequested,
      substitutionSpecs,
      justification,
      signatures: {
        surveyor: { name: inspectorName, role: inspectorRole, signed: !!sig1Image, image: sig1Image },
        approver: proposalStatus === 'approved'
          ? { name: approverName, role: approverRole, signed: true, decision: 'approved', image: sig2Image }
          : { name: approverName || '', role: approverRole || '', signed: false, decision: 'pending', image: null }
      }
    };

    try {
      const res = await fetch('/api/repair-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        alert(`บันทึกใบเสนอแจ้งซ่อม ${refNo} ลงระบบออนไลน์เรียบร้อยแล้ว!\n(สถานะ: ${proposalStatus === 'approved' ? 'อนุมัติรับรองแล้ว' : 'รอการตรวจสอบและรับรอง'})`);
        router.push('/repair-proposal');
      } else {
        alert(`บันทึกไม่สำเร็จ: ${data.error || `HTTP ${res.status} ${res.statusText}` || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Certify or Revert Proposal as Approver (Admin only)
  const handleCertifyDocument = async (targetRefNo, approverProfile, action = 'approve') => {
    const isApprove = action === 'approve';
    const profile = approverProfile || adminSettings.approver || defaultAdminSettings.approver;
    const refToUse = (targetRefNo || refNo || '').trim();

    if (!refToUse) {
      alert('ไม่พบเลขที่เอกสาร');
      return false;
    }

    // Update active component state if certifying the currently open proposal
    if (refToUse === refNo.trim()) {
      if (isApprove) {
        setProposalStatus('approved');
        setApprovalDecision('approved');
        setApproverName(profile.name);
        setApproverRole(profile.role);
        setSig2Image(profile.signatureUrl);
      } else {
        setProposalStatus('pending_approval');
        setApprovalDecision('pending');
        setSig2Image(null);
      }
    }

    try {
      let targetDoc = null;
      if (refToUse !== refNo.trim()) {
        const resLoad = await fetch(`/api/repair-proposals?refNo=${encodeURIComponent(refToUse)}`);
        const jsonLoad = await resLoad.json();
        if (jsonLoad && jsonLoad.refNo) targetDoc = jsonLoad;
      } else {
        targetDoc = {
          refNo: refNo.trim(),
          fmRefNo: (fmRefNo || '').trim(),
          jobTitle: jobTitle.trim(),
          docDate,
          docDateISO: new Date().toISOString().slice(0, 10),
          priority,
          inspector: { name: inspectorName, role: inspectorRole, department },
          header: {
            bannerImageUrl: adminSettings.header?.bannerImageUrl || '',
            bannerLayout: adminSettings.header?.bannerLayout || 'bleed',
            showLetterhead: adminSettings.header?.showLetterhead ?? true,
          },
          surveyPoints,
          itemsRequested,
          substitutionSpecs,
          justification,
          signatures: {
            surveyor: { name: inspectorName, role: inspectorRole, signed: !!sig1Image, image: sig1Image }
          }
        };
      }

      if (targetDoc) {
        const updatedPayload = {
          ...targetDoc,
          status: isApprove ? 'approved' : 'pending_approval',
          signatures: {
            ...(targetDoc.signatures || {}),
            surveyor: targetDoc.signatures?.surveyor || { name: inspectorName, role: inspectorRole, signed: !!sig1Image, image: sig1Image },
            approver: isApprove ? {
              name: profile.name,
              role: profile.role,
              signed: true,
              decision: 'approved',
              image: profile.signatureUrl,
              approvedAt: new Date().toISOString()
            } : {
              name: profile.name,
              role: profile.role,
              signed: false,
              decision: 'pending',
              image: null,
              unapprovedAt: new Date().toISOString()
            }
          }
        };

        const res = await fetch('/api/repair-proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPayload)
        });
        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.ok) {
          alert(isApprove
            ? `✅ ยืนยันการตรวจสอบและลงนามรับรองเอกสาร ${refToUse} เรียบร้อยแล้ว!\nผู้รับรอง: ${profile.name} (${profile.role})`
            : `ℹ️ ยกเลิกการรับรองเอกสาร ${refToUse} เรียบร้อยแล้ว (สถานะ: รอการตรวจสอบและรับรอง)`
          );
          return true;
        } else {
          alert(`⚠️ ไม่สามารถบันทึกการรับรองได้: ${resData?.error || 'เกิดข้อผิดพลาด'}`);
          return false;
        }
      }
    } catch (err) {
      alert(`⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
      return false;
    }
  };

  // Handle Admin PIN Check
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === '8888') {
      setIsAdminAuth(true);
      setShowPinModal(false);
      setPinError('');
      setPinInput('');
      setShowSettingsModal(true);
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  const openAdminPanel = () => {
    if (isAdminAuth) {
      setShowSettingsModal(true);
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  useEffect(() => {
    if (searchParams.get('admin') === '1') {
      openAdminPanel();
    }
  }, [searchParams]);

  // Save Admin Settings
  const handleSaveAdminSettings = async (newSettings) => {
    const customized = {
      ...newSettings,
      isCustomized: true,
      updatedAt: new Date().toISOString()
    };
    setAdminSettings(customized);

    // Safely save to LocalStorage with QuotaExceeded fallback
    try {
      localStorage.setItem('repair_proposal_admin_settings', JSON.stringify(customized));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
      try {
        const light = { ...customized, header: { ...customized.header, bannerImageUrl: '' } };
        localStorage.setItem('repair_proposal_admin_settings_light', JSON.stringify(light));
      } catch (e2) {}
    }
    
    // 1. Update approver immediately in active form
    if (customized.approver?.name) setApproverName(customized.approver.name);
    if (customized.approver?.role) setApproverRole(customized.approver.role);
    if (proposalStatus === 'approved' && customized.approver?.signatureUrl) {
      setSig2Image(customized.approver.signatureUrl);
      setApproverSigMode('image');
    }

    // 2. Update default department, inspector role, priority immediately
    if (customized.defaults?.department) setDepartment(customized.defaults.department);
    if (customized.defaults?.inspectorRole) setInspectorRole(customized.defaults.inspectorRole);
    if (customized.defaults?.priority) setPriority(customized.defaults.priority);

    // 3. Re-calculate running refNo with new prefix/next number if creating new proposal
    if (!editRefNo) {
      try {
        const newRef = await generateAutoRefNo(customized);
        if (newRef) setRefNo(newRef);
      } catch (e) {
        console.warn('Failed to regenerate refNo:', e);
      }
    }

    // 4. Save to Server Database (data/repair-proposals/settings.json + GitHub storage)
    let syncError = null;
    try {
      const res = await fetch('/api/repair-proposals/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '8888', settings: customized })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        syncError = data?.error || res.statusText || 'Sync issue';
        console.warn('Server settings sync issue:', syncError);
      }
    } catch (e) {
      syncError = e.message;
      console.warn('Settings API sync warning:', e);
    }

    if (syncError) {
      alert(`บันทึกลงเบราว์เซอร์แล้ว แต่ระบบซิงค์ขึ้น GitHub แจ้งเตือน: ${syncError}\n(กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)`);
    } else {
      alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!\n(รูปภาพหัวกระดาษและค่าเริ่มต้นทั้งหมดถูกบันทึกขึ้น GitHub เป็นค่าเริ่มต้นถาวรของระบบแล้ว ไม่ต้องตั้งค่าใหม่ทุกรอบ)');
    }
    setShowSettingsModal(false);
  };

  // Cross-Device Cloud Sync Handlers
  const handleSyncToCloud = async () => {
    try {
      setSyncingCloud(true);
      const res = await fetch('/api/repair-proposals/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '8888', settings: adminSettings })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        alert('✅ ส่งรูปภาพหัวกระดาษและการตั้งค่าขึ้น Cloud เรียบร้อยแล้ว!\n\nคอมพิวเตอร์และอุปกรณ์เครื่องอื่นจะเห็นรูปหัวกระดาษบริษัทนี้เหมือนกันทันที\n(หากเครื่องอื่นเปิดค้างไว้ เพียงกดปุ่ม "🔄 ดึงรูปบริษัทจาก Cloud" หรือกดรีเฟรชหน้าเว็บ)');
      } else {
        alert('⚠️ เกิดข้อผิดพลาดในการส่งขึ้น Cloud: ' + (data?.error || res.statusText || 'ไม่สามารถบันทึกได้'));
      }
    } catch (err) {
      alert('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handlePullFromCloud = async () => {
    try {
      setSyncingCloud(true);
      const res = await fetch(`/api/repair-proposals/settings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok && data.settings) {
        const s = data.settings;
        if (s.header?.bannerImageUrl || s.header?.customLogoUrl || (s.header?.companyTitle && s.header.companyTitle !== defaultAdminSettings.header.companyTitle)) {
          const merged = {
            ...adminSettings,
            ...s,
            header: {
              ...adminSettings.header,
              ...(s.header || {})
            },
            approver: { ...adminSettings.approver, ...(s.approver || {}) },
            runningNumber: { ...adminSettings.runningNumber, ...(s.runningNumber || {}) },
            defaults: { ...adminSettings.defaults, ...(s.defaults || {}) }
          };
          setAdminSettings(merged);
          try {
            localStorage.setItem('repair_proposal_admin_settings', JSON.stringify(merged));
          } catch (e) {}
          alert('✅ ดึงรูปภาพหัวกระดาษบริษัทจาก Cloud สำเร็จแล้ว!\nเอกสารปรับเป็นหัวกระดาษบริษัทเต็มหน้า A4 ให้เรียบร้อยแล้วครับ');
        } else {
          alert('ℹ️ ตรวจสอบบน Cloud แล้ว พบว่ายังไม่มีการบันทึกรูปหัวกระดาษบริษัทขึ้นมา\n\nคำแนะนำ:\n1. กรุณาเปิดคอมพิวเตอร์เครื่องที่แสดงรูปบริษัทอยู่\n2. ที่คอมเครื่องนั้น กดปุ่ม "☁️ ซิงค์รูปนี้ไปทุกเครื่อง"\n3. กลับมากด "🔄 ดึงรูปบริษัทจาก Cloud" ที่เครื่องนี้อีกครั้ง');
        }
      } else {
        alert('⚠️ ไม่สามารถดึงข้อมูลจาก Cloud ได้: ' + (data?.error || 'เซิร์ฟเวอร์ไม่ตอบสนอง'));
      }
    } catch (err) {
      alert('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
      setSyncingCloud(false);
    }
  };

  // Logo URL Resolver
  const currentLogoUrl = useMemo(() => {
    const type = adminSettings.header?.logoType;
    if (type === 'egat') return '/assets/shared/egat-logo.jpg';
    if (type === 'veri') return '/logo.png';
    if (type === 'custom') return adminSettings.header?.customLogoUrl || '';
    return null;
  }, [adminSettings.header]);

  const logoHeight = useMemo(() => {
    const size = adminSettings.header?.logoSize;
    if (size === 'xlarge') return 96;
    if (size === 'normal') return 60;
    return 80; // default 'large'
  }, [adminSettings.header?.logoSize]);

  const logoMaxWidth = useMemo(() => {
    const size = adminSettings.header?.logoSize;
    if (size === 'xlarge') return 180;
    if (size === 'normal') return 120;
    return 150; // default 'large'
  }, [adminSettings.header?.logoSize]);

  const hasDefectPhotos = useMemo(() => {
    return surveyPoints.some(p => Boolean((p.photos && p.photos.length > 0) || p.photo));
  }, [surveyPoints]);

  const hasAnnex = useMemo(() => {
    return hasDefectPhotos;
  }, [hasDefectPhotos]);

  const totalDocPages = useMemo(() => {
    const specsPageCount = itemsRequested?.length || 1;
    return 2 + specsPageCount + (hasDefectPhotos ? 1 : 0);
  }, [itemsRequested, hasDefectPhotos]);

  // Helper to generate sanitized PDF filename: <refNo>_<jobTitle>
  const getPdfFileName = () => {
    const cleanRef = String(refNo || 'REP-TEMP').trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ');
    const cleanTitle = String(jobTitle || '').trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ');
    if (cleanTitle) {
      return `${cleanRef}_${cleanTitle}`;
    }
    return cleanRef;
  };

  // Synchronize document.title with <refNo>_<jobTitle> so browser "Save as PDF" automatically defaults to this name
  useEffect(() => {
    const origTitle = document.title;
    const updateTitle = () => {
      if (refNo || jobTitle) {
        document.title = getPdfFileName();
      }
    };
    updateTitle();

    const onBeforePrint = () => {
      document.title = getPdfFileName();
    };
    window.addEventListener('beforeprint', onBeforePrint);

    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      document.title = origTitle;
    };
  }, [refNo, jobTitle]);

  // Direct Download PDF (Page-by-Page Vector/High-res A4 PDF generator)
  const handleDirectDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportProgress('กำลังเตรียมข้อมูลเอกสาร...');

    try {
      // 1. Ensure document container is rendered and visible in DOM
      const origView = activeView;
      if (origView !== 'document') {
        setActiveView('document');
        await new Promise(r => setTimeout(r, 220));
      }

      // 2. Wait for web fonts (Sarabun / Noto Sans Thai) to be ready
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }

      const printArea = document.getElementById('repair-proposal-print-area');
      if (!printArea) {
        throw new Error('ไม่พบข้อมูลเอกสารสำหรับสร้าง PDF');
      }

      // 3. Ensure all images in print area are fully loaded
      const imgs = Array.from(printArea.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => {
          img.onload = res;
          img.onerror = res;
        });
      }));

      const pageElements = Array.from(printArea.querySelectorAll('.a4-print-page'));
      if (pageElements.length === 0) {
        throw new Error('ไม่พบหน้าเอกสาร A4');
      }

      setExportProgress('กำลังโหลดโมดูล PDF...');
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < pageElements.length; i++) {
        setExportProgress(`กำลังสร้างหน้าที่ ${i + 1} จาก ${pageElements.length} หน้า...`);
        const pageEl = pageElements[i];

        // Temporarily reset screen decorations (shadow, rounded corners, margins)
        const origRadius = pageEl.style.borderRadius;
        const origShadow = pageEl.style.boxShadow;
        const origMargin = pageEl.style.marginBottom;
        pageEl.style.borderRadius = '0px';
        pageEl.style.boxShadow = 'none';
        pageEl.style.marginBottom = '0px';

        const bleedBanners = Array.from(pageEl.querySelectorAll('.doc-banner-bleed'));
        const origBannerRadii = bleedBanners.map(b => ({
          topLeft: b.style.borderTopLeftRadius,
          topRight: b.style.borderTopRightRadius
        }));
        bleedBanners.forEach(b => {
          b.style.borderTopLeftRadius = '0px';
          b.style.borderTopRightRadius = '0px';
        });

        let canvas;
        try {
          canvas = await html2canvas(pageEl, {
            scale: 2, // High 2x DPI for crystal clear text & images
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
        } finally {
          // Restore screen decorations
          pageEl.style.borderRadius = origRadius;
          pageEl.style.boxShadow = origShadow;
          pageEl.style.marginBottom = origMargin;
          bleedBanners.forEach((b, idx) => {
            if (origBannerRadii[idx]) {
              b.style.borderTopLeftRadius = origBannerRadii[idx].topLeft;
              b.style.borderTopRightRadius = origBannerRadii[idx].topRight;
            }
          });
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pageWidth = 210;
        const pageHeight = 297;
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        if (imgHeight > pageHeight) {
          const fitWidth = (pageHeight * canvas.width) / canvas.height;
          const xOffset = (pageWidth - fitWidth) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, 0, fitWidth, pageHeight, undefined, 'FAST');
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        }
      }

      setExportProgress('กำลังบันทึกไฟล์...');
      const targetFileName = `${getPdfFileName()}.pdf`;
      pdf.save(targetFileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ' + (err?.message || err));
    } finally {
      setIsExportingPdf(false);
      setExportProgress('');
    }
  };

  // Browser Native Print / Fallback
  const handleBrowserPrint = () => {
    const targetFileName = getPdfFileName();
    document.title = targetFileName;
    setShowExportModal(false);

    if (activeView !== 'document') {
      setActiveView('document');
    }

    setTimeout(() => {
      window.print();
    }, 180);
  };

  const handleExportPdf = handleDirectDownloadPdf;

  const steps = [
    { title: 'ข้อมูลงาน', icon: '1' },
    { title: `จุดที่ชำรุด (${surveyPoints.length})`, icon: '2' },
    { title: `อุปกรณ์ & สเปก (${itemsRequested.length})`, icon: '3' },
    { title: 'ส่วนลงนาม', icon: '4' },
    { title: 'สรุป & ส่งออก', icon: '5' }
  ];

  return (
    <div className="sn-shell" style={{ minHeight: '100vh', background: 'var(--bg-base, #0c1220)', color: 'var(--ink-primary, #eef2ff)' }}>
      <Sidenav />

      <main className="sn-shell-main" style={{ flex: 1, padding: '20px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        
        {/* Style block for placeholders, dark wizard theme, and clean white A4 print media */}
        <style dangerouslySetInnerHTML={{ __html: `
          ::placeholder {
            color: #5a6a8a !important;
            opacity: 0.8 !important;
            font-style: italic;
          }
          .wizard-dark-input {
            background: var(--bg-input, #080e1a) !important;
            border: 1px solid var(--border-strong, #2d3f5e) !important;
            color: var(--ink-primary, #eef2ff) !important;
            border-radius: 6px;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .wizard-dark-input:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
          }
          @media screen {
            .screen-hidden {
              display: none !important;
            }
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            *, *:before, *:after {
              box-shadow: none !important;
              text-shadow: none !important;
            }
            html {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              color-scheme: light !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              min-width: 100% !important;
            }
            body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              color-scheme: light !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              min-width: 100% !important;
              font-size: 10pt !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sn-shell {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto !important;
              height: auto !important;
              width: 100% !important;
              display: block !important;
            }
            .sn-shell-main {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              display: block !important;
            }
            .doc-print-wrapper {
              display: block !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              border: none !important;
              box-shadow: none !important;
            }
            .no-print,
            nav,
            header,
            button,
            .sidenav,
            .sn-shell > aside,
            .wizard-flow-view,
            #adminPinModal,
            #adminSettingsModal {
              display: none !important;
            }
            .a4-print-page {
              display: block !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              padding: 12mm 15mm 12mm 15mm !important;
              margin: 0 !important;
              width: 100% !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              min-height: 297mm !important;
              position: relative !important;
            }
            .a4-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
              min-height: auto !important;
            }
            .doc-banner-bleed {
              margin: -12mm -15mm 14px -15mm !important;
              width: calc(100% + 30mm) !important;
              border-radius: 0 !important;
            }
            .doc-banner-contained {
              width: 100% !important;
              margin: 0 0 14px 0 !important;
            }
            .doc-banner-bleed > img, .doc-banner-contained > img {
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              display: block !important;
            }
            .doc-header-banner {
              box-sizing: border-box !important;
            }
            .doc-header-banner.doc-banner-bleed {
              padding: 5mm 15mm 4mm 15mm !important;
            }
            .doc-header-banner.doc-banner-contained {
              padding: 0 0 4mm 0 !important;
            }
            .doc-header-banner .doc-header-logo {
              width: auto !important;
              display: block !important;
              object-fit: contain !important;
            }
            .doc-header-logo-normal {
              height: 18mm !important;
              max-height: 20mm !important;
              max-width: 38mm !important;
            }
            .doc-header-logo-large {
              height: 24mm !important;
              max-height: 26mm !important;
              max-width: 48mm !important;
            }
            .doc-header-logo-xlarge {
              height: 28mm !important;
              max-height: 30mm !important;
              max-width: 58mm !important;
            }
            table, th, td, div, span, strong, p {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />

        {/* Top Header Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={() => router.push('/repair-proposal')}
              style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', cursor: 'pointer' }}>
              ◀ กลับหน้ารายการ
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
              {editRefNo ? `แก้ไขใบเสนอแจ้งซ่อม: ${refNo}` : 'จัดทำใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์'}
            </h1>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {/* Cross-Device Cloud Sync Button */}
            {adminSettings.header?.bannerImageUrl ? (
              <button 
                onClick={handleSyncToCloud}
                disabled={syncingCloud}
                title="ส่งรูปหัวกระดาษบริษัทนี้ขึ้น Cloud เพื่อให้คอมทุกเครื่องเห็นตรงกัน"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)', 
                  border: '1px solid #10b981', 
                  borderRadius: 8, 
                  padding: '7px 12px', 
                  fontSize: 12.5, 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  color: '#34d399',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                <span>☁️</span> {syncingCloud ? 'กำลังส่งขึ้น Cloud...' : 'ซิงค์รูปนี้ไปทุกเครื่อง'}
              </button>
            ) : (
              <button 
                onClick={handlePullFromCloud}
                disabled={syncingCloud}
                title="ดึงรูปภาพหัวกระดาษบริษัทที่ตั้งค่าไว้จาก Cloud มาใช้กับเครื่องนี้"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(37, 99, 235, 0.25) 100%)', 
                  border: '1px solid #38bdf8', 
                  borderRadius: 8, 
                  padding: '7px 12px', 
                  fontSize: 12.5, 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  color: '#7dd3fc',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                <span>🔄</span> {syncingCloud ? 'กำลังดึงจาก Cloud...' : 'ดึงรูปบริษัทจาก Cloud'}
              </button>
            )}

            <button 
              onClick={openAdminPanel}
              style={{ background: 'rgba(245, 158, 11, 0.18)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#fbbf24' }}>
              ⚙️ ตั้งค่าระบบ (Admin)
            </button>
            <button 
              onClick={resetToBlankForm}
              style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)' }}>
              ➕ ฟอร์มเปล่า
            </button>
            <button 
              onClick={loadSample}
              style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#60a5fa' }}>
              📋 ตัวอย่าง TP019-69
            </button>
            <button 
              onClick={handleSaveOnline}
              disabled={saving}
              style={{ background: 'var(--accent, #2563eb)', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกออนไลน์ (GitHub)'}
            </button>
            <button 
              onClick={handleDirectDownloadPdf}
              disabled={isExportingPdf}
              title={`ดาวน์โหลดเป็นไฟล์ PDF ลงเครื่องทันที (${getPdfFileName()}.pdf)`}
              style={{ background: '#16a34a', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: isExportingPdf ? 'wait' : 'pointer', color: 'white', boxShadow: '0 2px 8px rgba(22,163,74,0.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>📥</span> {isExportingPdf ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด PDF (Save)'}
            </button>
          </div>
        </div>

        {/* View Switcher: Wizard vs Document View */}
        <div className="no-print" style={{ display: 'flex', background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', padding: 4, borderRadius: 10, marginBottom: 18, width: 'fit-content' }}>
          <button 
            onClick={() => setActiveView('wizard')}
            style={{
              padding: '7px 16px',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeView === 'wizard' ? 'var(--accent, #2563eb)' : 'transparent',
              color: activeView === 'wizard' ? '#ffffff' : 'var(--ink-secondary, #94a3c4)',
              transition: 'background 0.15s, color 0.15s'
            }}>
            📱 โหมดกรอกทีละส่วน (Wizard)
          </button>
          <button 
            onClick={() => setActiveView('document')}
            style={{
              padding: '7px 16px',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeView === 'document' ? 'var(--accent, #2563eb)' : 'transparent',
              color: activeView === 'document' ? '#ffffff' : 'var(--ink-secondary, #94a3c4)',
              transition: 'background 0.15s, color 0.15s'
            }}>
            📄 โหมดเอกสารเต็มใบ (Full A4 View)
          </button>
        </div>

        {/* WIZARD FLOW VIEW (Hidden on screen when activeView !== 'wizard'; never printed) */}
        <div className={`wizard-flow-view no-print ${activeView !== 'wizard' ? 'screen-hidden' : ''}`}>
          <div>
            {/* Steps Progress Pills */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
              {steps.map((st, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: currentStep === i ? '1.5px solid #3b82f6' : '1px solid var(--border-hairline, #1e2e4a)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: currentStep === i ? 'rgba(37,99,235,0.25)' : 'var(--bg-surface, #111d32)',
                    color: currentStep === i ? '#93c5fd' : 'var(--ink-secondary, #94a3c4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s'
                  }}>
                  <span style={{ 
                    width: 22, 
                    height: 22, 
                    borderRadius: '50%', 
                    background: currentStep === i ? 'var(--accent, #2563eb)' : 'var(--bg-surface-raised, #172340)', 
                    color: currentStep === i ? '#ffffff' : 'var(--ink-primary, #eef2ff)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    {st.icon}
                  </span>
                  <span>{st.title}</span>
                </button>
              ))}
            </div>

            {/* STEP 1: General Info (NO company input as requested!) */}
            {currentStep === 0 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginBottom: 16 }}>
                  📋 ข้อมูลงานและเอกสารอ้างอิง
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      เลขที่ใบเสนอแจ้งซ่อม (Ref. No. รันอัตโนมัติ) *
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        type="text" 
                        value={refNo} 
                        placeholder="เช่น REP-2569-001" 
                        onChange={e => setRefNo(e.target.value)} 
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#f87171' }} 
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const next = await generateAutoRefNo();
                          setRefNo(next);
                        }}
                        title="สร้างเลขรันอัตโนมัติใหม่"
                        style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, padding: '0 10px', fontSize: 12, fontWeight: 600, color: 'var(--ink-primary, #eef2ff)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        🔄 รันใหม่
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      หมายเลขใบแจ้งซ่อม FM (ถ้ามี)
                    </label>
                    <input 
                      type="text" 
                      value={fmRefNo} 
                      placeholder="เช่น FM-69-0125 หรือเลขงานระบบ FM" 
                      onChange={e => setFmRefNo(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, color: '#38bdf8', fontWeight: 600 }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      วันที่จัดทำเอกสาร *
                    </label>
                    <input 
                      type="text" 
                      value={docDate} 
                      placeholder="เช่น 11 พฤศจิกายน 2569" 
                      onChange={e => setDocDate(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                    ชื่องาน / โครงการขอเสนอซ่อม *
                  </label>
                  <input 
                    type="text" 
                    value={jobTitle} 
                    placeholder="พิมพ์ชื่องาน เช่น งานเปลี่ยน meter Main MDB ของหน่วยงาน หรือ งานเปลี่ยนเบรกเกอร์อาคาร" 
                    onChange={e => setJobTitle(e.target.value)} 
                    className="wizard-dark-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, fontWeight: 700 }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      ชื่อผู้แจ้งซ่อม / ผู้สำรวจและวิเคราะห์
                    </label>
                    <input 
                      type="text" 
                      value={inspectorName} 
                      placeholder="ระบุชื่อ-นามสกุล ผู้สำรวจและวิเคราะห์" 
                      onChange={e => setInspectorName(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      ตำแหน่ง / สายงาน
                    </label>
                    <input 
                      type="text" 
                      value={inspectorRole} 
                      placeholder="เช่น วิศวกรระบบไฟฟ้าและบำรุงรักษา" 
                      onChange={e => setInspectorRole(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                      หน่วยงาน / อาคารที่รับผิดชอบ
                    </label>
                    <input 
                      type="text" 
                      value={department} 
                      placeholder="เช่น ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า (หบท-ธ.)" 
                      onChange={e => setDepartment(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14, background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--ink-secondary, #94a3c4)' }}>
                  ℹ️ <strong style={{ color: 'var(--ink-primary, #eef2ff)' }}>รายละเอียดหัวกระดาษเอกสาร:</strong> ชื่อองค์กร/บริษัท ({adminSettings.header?.companyTitle}) และโลโก้จะแสดงผลอัตโนมัติบนหัวกระดาษเอกสารทางการ โดยสามารถปรับเปลี่ยนได้ที่เมนู <strong style={{ color: '#fbbf24' }}>"⚙️ ตั้งค่าระบบ (Admin)"</strong> ด้านบน
                </div>
              </div>
            )}

            {/* STEP 2: Defect Points (User enters freely, pale placeholders) */}
            {currentStep === 1 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                      📍 รายการจุดติดตั้งและอาการชำรุดที่พบ ({surveyPoints.length} จุด)
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', margin: '2px 0 0' }}>
                      ระบุชื่อจุดและพิมพ์อาการชำรุดเอง พร้อมแนบรูปถ่ายประกอบ
                    </p>
                  </div>
                  <button 
                    onClick={addPoint}
                    style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    + เพิ่มจุดสำรวจ
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {surveyPoints.map((item, idx) => (
                    <div key={item.id || idx} style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, background: 'var(--bg-surface-raised, #172340)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '2px 8px', borderRadius: 4 }}>
                          จุดที่ {idx + 1} : {item.building || 'ยังไม่ระบุชื่อจุด'}
                        </span>
                        {surveyPoints.length > 1 && (
                          <button 
                            onClick={() => removePoint(idx)}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                            ลบจุดนี้
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>รหัสอาคาร / พื้นที่สำรวจ *</label>
                          <input 
                            type="text" 
                            value={item.building || ''} 
                            placeholder="เช่น ท.0006 หรือ อาคาร 1 ชั้น 2" 
                            onChange={e => handlePointChange(idx, 'building', e.target.value)} 
                            className="wizard-dark-input"
                            style={{ width: '100%', padding: '6px 10px', fontSize: 13 }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>จุดติดตั้ง / ตู้ไฟฟ้า</label>
                          <input 
                            type="text" 
                            value={item.location || ''} 
                            placeholder="เช่น Main MDB, ห้องควบคุมไฟฟ้า" 
                            onChange={e => handlePointChange(idx, 'location', e.target.value)} 
                            className="wizard-dark-input"
                            style={{ width: '100%', padding: '6px 10px', fontSize: 13 }} 
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>อาการชำรุด / ข้อบกพร่องที่ตรวจพบ *</label>
                        <input 
                          type="text" 
                          value={item.symptom || ''} 
                          placeholder="พิมพ์ระบุอาการชำรุด เช่น หน้าจอดับ ไม่แสดงผล, คอยล์ไหม้, สื่อสารขัดข้อง" 
                          onChange={e => handlePointChange(idx, 'symptom', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: 13 }} 
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                          {['Digital Meter ชำรุด / หน้าจอดับ', 'ระบบ Error / ค่าคลาดเคลื่อน', 'ระบบสื่อสารขัดข้อง', 'คอยล์ไหม้ / ไม่สั่งการ', 'ทริปบ่อย / ไม่ตัดวงจร', 'เสื่อมสภาพตามอายุ'].map((sym, sidx) => (
                            <span 
                              key={sidx}
                              onClick={() => handlePointChange(idx, 'symptom', sym)}
                              style={{ background: 'var(--bg-input, #080e1a)', color: 'var(--ink-secondary, #94a3c4)', fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-strong, #2d3f5e)', cursor: 'pointer' }}>
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action / Recommendation */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>
                            ข้อเสนอแนะในการดำเนินการ (Action / Recommendation) *
                          </label>
                          <span style={{ fontSize: 11, color: '#38bdf8' }}>แสดงในตารางผลการสำรวจ</span>
                        </div>
                        <input 
                          type="text" 
                          value={item.action || 'เปลี่ยนทดแทน'} 
                          placeholder="เช่น เปลี่ยนทดแทน, จัดหาเพิ่มจากเดิม, ซ่อมแซม/แก้ไข" 
                          onChange={e => handlePointChange(idx, 'action', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '6px 10px', fontSize: 13, fontWeight: 700 }} 
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {[
                            { label: '🔄 เปลี่ยนทดแทน', val: 'เปลี่ยนทดแทน', bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: 'rgba(239, 68, 68, 0.4)' },
                            { label: '➕ จัดหาเพิ่มจากเดิม', val: 'จัดหาเพิ่มจากเดิม', bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
                            { label: '🔧 ซ่อมแซม / แก้ไข', val: 'ซ่อมแซม/แก้ไข', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' },
                            { label: '⚡ ปรับปรุงระบบ', val: 'ปรับปรุงระบบ', bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)' }
                          ].map((act, aidx) => (
                            <span 
                              key={aidx}
                              onClick={() => handlePointChange(idx, 'action', act.val)}
                              style={{ 
                                background: (item.action || 'เปลี่ยนทดแทน') === act.val ? act.bg : 'var(--bg-input, #080e1a)', 
                                color: (item.action || 'เปลี่ยนทดแทน') === act.val ? act.color : 'var(--ink-secondary, #94a3c4)', 
                                border: `1px solid ${(item.action || 'เปลี่ยนทดแทน') === act.val ? act.border : 'var(--border-strong, #2d3f5e)'}`,
                                fontSize: 11, 
                                fontWeight: (item.action || 'เปลี่ยนทดแทน') === act.val ? 700 : 500,
                                padding: '3px 9px', 
                                borderRadius: 4, 
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}>
                              {act.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Photo Attachment Section (Up to 3 Photos) */}
                      {(() => {
                        const itemPhotos = Array.isArray(item.photos) && item.photos.length > 0
                          ? item.photos
                          : (item.photo ? [item.photo] : []);
                        const isUploadingThis = uploadingPhotoIdx === idx;

                        return (
                          <div style={{ marginTop: 10, background: 'var(--bg-input, #080e1a)', padding: '10px 12px', borderRadius: 8, border: '1px dashed var(--border-strong, #2d3f5e)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: itemPhotos.length > 0 ? 8 : 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: itemPhotos.length > 0 ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>📷 รูปภาพหน้างาน ({itemPhotos.length}/3 รูป)</span>
                                {itemPhotos.length >= 3 && (
                                  <span style={{ fontSize: 10.5, color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                    ครบ 3 รูปแล้ว
                                  </span>
                                )}
                              </div>
                              {itemPhotos.length < 3 && (
                                <label style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 11.5,
                                  color: '#ffffff',
                                  background: 'var(--accent, #2563eb)',
                                  padding: '4px 10px',
                                  borderRadius: 5,
                                  cursor: isUploadingThis ? 'wait' : 'pointer',
                                  fontWeight: 600,
                                  opacity: isUploadingThis ? 0.6 : 1
                                }}>
                                  {isUploadingThis ? 'กำลังย่อขนาด...' : '+ แนบรูปภาพ (เลือกได้หลายรูป)'}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    disabled={isUploadingThis}
                                    onChange={(e) => handlePhotoUpload(idx, e)} 
                                    style={{ display: 'none' }} 
                                  />
                                </label>
                              )}
                            </div>

                            {itemPhotos.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {itemPhotos.map((photoSrc, pIdx) => (
                                  <div key={pIdx} style={{ position: 'relative', width: 68, height: 68, borderRadius: 6, overflow: 'hidden', border: '1.5px solid var(--border-strong, #2d3f5e)', background: '#ffffff' }}>
                                    <img src={photoSrc} alt={`Defect ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                      type="button"
                                      onClick={() => handleRemovePhoto(idx, pIdx)}
                                      title="ลบรูปนี้"
                                      style={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.9)',
                                        color: '#ffffff',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        lineHeight: 1
                                      }}>
                                      ✕
                                    </button>
                                    <div style={{ position: 'absolute', bottom: 2, left: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 9.5, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>
                                      #{pIdx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Requested Items, Specifications & Sample Photos (Accordion Focus UI) */}
            {currentStep === 2 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                {/* Header Title & Add Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📦</span> รายการอุปกรณ์, สเปก และรูปตัวอย่าง ({itemsRequested.length} รายการ)
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', margin: '3px 0 0' }}>
                      ระบุสเปกทางเทคนิคและแนบรูปตัวอย่างของแต่ละรายการ เพื่อใช้ประกอบการร่างรายละเอียดคุณลักษณะเฉพาะ (TOR)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      type="button"
                      onClick={addItemRequested}
                      style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>+</span> เพิ่มรายการอุปกรณ์
                    </button>
                  </div>
                </div>

                {/* Quick Navigation Tabs & Expand/Collapse All */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                  {/* Items Tabs Strip */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#93c5fd', marginRight: 4 }}>
                      สลับแก้ไขรายการ:
                    </span>
                    {itemsRequested.map((it, idx) => {
                      const isExpanded = expandedItemIndices.includes(idx);
                      const isActive = activeItemIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveItemIndex(idx);
                            if (!expandedItemIndices.includes(idx)) {
                              setExpandedItemIndices(prev => [...prev, idx]);
                            }
                          }}
                          style={{
                            background: isActive ? '#2563eb' : (isExpanded ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-input, #080e1a)'),
                            color: isActive ? '#ffffff' : (isExpanded ? '#93c5fd' : 'var(--ink-secondary, #94a3c4)'),
                            border: `1px solid ${isActive ? '#3b82f6' : (isExpanded ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-strong, #2d3f5e)')}`,
                            borderRadius: 5,
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: isActive ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}>
                          <span>#{idx + 1}</span>
                          <span>{it.name ? (it.name.length > 15 ? it.name.slice(0, 15) + '...' : it.name) : 'รายการใหม่'}</span>
                          {it.specs ? <span style={{ fontSize: 10, color: isActive ? '#dcfce7' : '#34d399' }}>✓</span> : null}
                          {it.photos && it.photos.length > 0 ? <span style={{ fontSize: 10 }}>📷</span> : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Expand / Collapse All Buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={expandAllItems}
                      style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      ▾ ขยายทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllItems}
                      style={{ background: 'var(--bg-input, #080e1a)', color: 'var(--ink-secondary, #94a3c4)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      ▴ ซ่อนทั้งหมด
                    </button>
                  </div>
                </div>

                {/* Quick Presets Bar applied to activeItemIndex */}
                <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#60a5fa' }}>
                    ⚡ ใส่แม่แบบด่วนให้กับรายการที่ {activeItemIndex + 1}:
                  </span>
                  <button type="button" onClick={() => applyEquipPreset('meter', activeItemIndex)} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '4px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Digital Power Meter</button>
                  <button type="button" onClick={() => applyEquipPreset('breaker', activeItemIndex)} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '4px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>ACB / MCCB เบรกเกอร์</button>
                  <button type="button" onClick={() => applyEquipPreset('contactor', activeItemIndex)} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '4px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Magnetic Contactor</button>
                  <button type="button" onClick={() => applyEquipPreset('inverter', activeItemIndex)} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '4px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Inverter / VFD</button>
                  <button type="button" onClick={() => applyEquipPreset('capacitor', activeItemIndex)} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '4px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Capacitor Bank / SPD</button>
                </div>

                {/* Accordion Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {itemsRequested.map((item, idx) => {
                    const isExpanded = expandedItemIndices.includes(idx);
                    const isActive = activeItemIndex === idx;
                    const itemPhotos = Array.isArray(item.photos) && item.photos.length > 0
                      ? item.photos
                      : (item.photo ? [item.photo] : []);
                    const isUploadingThis = uploadingItemPhotoIdx === idx;

                    return (
                      <div 
                        key={item.id || idx} 
                        style={{ 
                          border: isActive ? '1.5px solid #3b82f6' : '1px solid var(--border-hairline, #1e2e4a)', 
                          borderRadius: 8, 
                          overflow: 'hidden',
                          background: 'var(--bg-surface-raised, #172340)',
                          boxShadow: isActive ? '0 0 14px rgba(37,99,235,0.18)' : 'none'
                        }}>
                        {/* Accordion Bar Header */}
                        <div 
                          onClick={() => {
                            setActiveItemIndex(idx);
                            toggleItemExpanded(idx);
                          }}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '10px 14px', 
                            background: isActive ? 'rgba(37, 99, 235, 0.16)' : 'rgba(15, 23, 42, 0.4)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderBottom: isExpanded ? '1px solid var(--border-hairline, #1e2e4a)' : 'none'
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                            <span style={{ fontSize: 12, color: isExpanded ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#93c5fd', background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '2px 8px', borderRadius: 4 }}>
                              รายการที่ {idx + 1}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)' }}>
                              {item.name || '(ยังไม่ระบุชื่ออุปกรณ์)'}
                            </span>
                            {item.modelPart && (
                              <span style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)' }}>
                                ({item.modelPart})
                              </span>
                            )}
                            <span style={{ fontSize: 11, background: 'var(--bg-input, #080e1a)', color: '#60a5fa', border: '1px solid var(--border-strong, #2d3f5e)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              {item.qty || 1} {item.unit || 'ตัว'}
                            </span>
                            {item.specs ? (
                              <span style={{ fontSize: 10.5, background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '1px 6px', borderRadius: 4 }}>
                                ✓ มีสเปกเฉพาะ
                              </span>
                            ) : (
                              <span style={{ fontSize: 10.5, background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1px 6px', borderRadius: 4 }}>
                                ⚠️ ยังไม่ใส่สเปก
                              </span>
                            )}
                            {itemPhotos.length > 0 && (
                              <span style={{ fontSize: 10.5, background: 'rgba(96, 165, 250, 0.12)', color: '#93c5fd', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '1px 6px', borderRadius: 4 }}>
                                📷 {itemPhotos.length} รูป
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveItemIndex(idx);
                                toggleItemExpanded(idx);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>
                              {isExpanded ? 'ย่อซ่อน' : 'คลิกเพื่อแก้ไข'}
                            </button>
                            {itemsRequested.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => removeItemRequested(idx)}
                                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 11.5, cursor: 'pointer' }}>
                                ลบรายการนี้
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Accordion Content Body (Rendered when expanded) */}
                        {isExpanded && (
                          <div style={{ padding: 14 }}>
                            {/* Part 1: Equipment Details */}
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                                รายการอุปกรณ์ / ชิ้นส่วนอะไหล่ที่ต้องการ *
                              </label>
                              <input 
                                type="text" 
                                value={item.name || ''} 
                                placeholder="เช่น Digital Power Meter, Magnetic Contactor, เซอร์กิตเบรกเกอร์ MCCB" 
                                onChange={e => handleItemChange(idx, 'name', e.target.value)} 
                                className="wizard-dark-input"
                                style={{ width: '100%', padding: '7px 10px', fontSize: 13, fontWeight: 700 }} 
                              />
                            </div>

                            <div style={{ marginBottom: 12 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                                ยี่ห้อ / รุ่น / รหัสอะไหล่อ้างอิงที่ต้องการ (หรือเทียบเท่า) *
                              </label>
                              <input 
                                type="text" 
                                value={item.modelPart || ''} 
                                placeholder="เช่น Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า" 
                                onChange={e => handleItemChange(idx, 'modelPart', e.target.value)} 
                                className="wizard-dark-input"
                                style={{ width: '100%', padding: '7px 10px', fontSize: 13, fontWeight: 700 }} 
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                              <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>จำนวนที่ขอเสนอซื้อ *</label>
                                <input 
                                  type="number" 
                                  value={item.qty || 1} 
                                  min="1" 
                                  onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)} 
                                  className="wizard-dark-input"
                                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, fontWeight: 700 }} 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>หน่วยนับ</label>
                                <input 
                                  type="text" 
                                  value={item.unit || 'ตัว'} 
                                  placeholder="ตัว / ชุด / เครื่อง / ชิ้น" 
                                  onChange={e => handleItemChange(idx, 'unit', e.target.value)} 
                                  className="wizard-dark-input"
                                  style={{ width: '100%', padding: '7px 10px', fontSize: 13 }} 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>ตำแหน่งติดตั้ง / ตู้ที่ใช้งาน</label>
                                <input 
                                  type="text"
                                  value={item.purpose || ''} 
                                  placeholder="เช่น ตู้ Main MDB หรือห้องควบคุม" 
                                  onChange={e => handleItemChange(idx, 'purpose', e.target.value)} 
                                  className="wizard-dark-input"
                                  style={{ width: '100%', padding: '7px 10px', fontSize: 12.5 }} 
                                />
                              </div>
                            </div>

                            {/* Part 2: Equipment Sample Photo Attachment (Up to 3 Photos) */}
                            <div style={{ background: 'var(--bg-input, #080e1a)', padding: '10px 12px', borderRadius: 8, border: '1px dashed var(--border-strong, #2d3f5e)', marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: itemPhotos.length > 0 ? 8 : 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: itemPhotos.length > 0 ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>📷 รูปถ่ายตัวอย่างอุปกรณ์ / แคตตาล็อก / เนมเพลท (ถ้ามี - {itemPhotos.length}/3 รูป)</span>
                                  {itemPhotos.length >= 3 && (
                                    <span style={{ fontSize: 10.5, color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                                      ครบ 3 รูปแล้ว
                                    </span>
                                  )}
                                </div>

                                {itemPhotos.length < 3 && (
                                  <label style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: isUploadingThis ? 'var(--bg-surface-raised, #172340)' : 'rgba(37, 99, 235, 0.2)',
                                    color: isUploadingThis ? '#94a3c4' : '#93c5fd',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: 5,
                                    padding: '4px 10px',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: isUploadingThis ? 'wait' : 'pointer'
                                  }}>
                                    <span>{isUploadingThis ? '⏳ กำลังบีบอัด...' : '📁 + แนบรูปอุปกรณ์'}</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      multiple 
                                      disabled={isUploadingThis}
                                      onChange={(e) => handleItemPhotoUpload(idx, e)} 
                                      style={{ display: 'none' }} 
                                    />
                                  </label>
                                )}
                              </div>

                              {itemPhotos.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  {itemPhotos.map((photoSrc, pIdx) => (
                                    <div key={pIdx} style={{ position: 'relative', width: 68, height: 68, borderRadius: 6, overflow: 'hidden', border: '1.5px solid var(--border-strong, #2d3f5e)', background: '#ffffff' }}>
                                      <img src={photoSrc} alt={`Equipment ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button 
                                        type="button"
                                        onClick={() => handleRemoveItemPhoto(idx, pIdx)}
                                        title="ลบรูปนี้"
                                        style={{
                                          position: 'absolute',
                                          top: 2,
                                          right: 2,
                                          width: 18,
                                          height: 18,
                                          borderRadius: '50%',
                                          background: 'rgba(239, 68, 68, 0.9)',
                                          color: '#ffffff',
                                          border: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 11,
                                          cursor: 'pointer',
                                          lineHeight: 1
                                        }}>
                                        ✕
                                      </button>
                                      <div style={{ position: 'absolute', bottom: 2, left: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 9.5, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>
                                        #{pIdx + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Part 3: Technical Specifications & Substitution Requirements for this Item */}
                            <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>⚙️</span> สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (เฉพาะของรายการที่ {idx + 1}):
                                </label>
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button type="button" onClick={() => handleItemChange(idx, 'specs', sampleMeterSpecs)} style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ มิเตอร์</button>
                                  <button type="button" onClick={() => handleItemChange(idx, 'specs', sampleBreakerSpecs)} style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ เบรกเกอร์</button>
                                  <button type="button" onClick={() => handleItemChange(idx, 'specs', sampleContactorSpecs)} style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ แมกเนติก</button>
                                  <button type="button" onClick={() => handleItemChange(idx, 'specs', '')} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>ล้างสเปก</button>
                                </div>
                              </div>

                              <textarea 
                                rows="6" 
                                value={item.specs || ''} 
                                onChange={e => handleItemChange(idx, 'specs', e.target.value)} 
                                placeholder="พิมพ์ระบุคุณลักษณะเฉพาะและเงื่อนไขสำคัญที่ต้องใช้แทนได้สำหรับรายการนี้ เช่น:
• ขนาดมิติและการติดตั้ง: ขนาด 96x96 มม. ติดตั้งแทนช่องเดิมได้พอดี
• พิกัดไฟฟ้าและฟังก์ชัน: ระบบ 3P4W/3P3W, Input CT 1A/5A, วัดค่า V, I, kW, kWh (Class 0.5S)
• การเชื่อมต่อ: มีพอร์ต RS-485 Modbus RTU เข้ากับระบบเดิมได้
• การรับประกัน: ไม่น้อยกว่า 1 ปี นับจากวันส่งมอบ"
                                className="wizard-dark-input"
                                style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, lineHeight: 1.5 }} 
                              />
                              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 4 }}>
                                💡 สเปกของรายการนี้จะถูกนำไปแสดงในหัวข้อที่ 3 ของเอกสารเต็ม เพื่อประกอบการร่างรายละเอียดคุณลักษณะเฉพาะ (TOR)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 6, fontSize: 12, color: '#93c5fd', marginTop: 14 }}>
                  <strong style={{ color: '#ffffff' }}>💡 คำแนะนำทางวิศวกรรม:</strong> หากต้องการซ่อนรายการอื่นๆ ที่กรอกเสร็จแล้วเพื่อไม่ให้หน้าจอยาวเกินไป สามารถคลิกที่แถบหัวข้อรายการหรือปุ่ม <strong>"ย่อซ่อน"</strong> หรือเลือกดูเฉพาะรายการที่ต้องการได้จากแท็บด้านบน
                </div>
              </div>
            )}

            {/* STEP 4: Surveyor Signature (Signatory 2 moved to Admin Settings) */}
            {currentStep === 3 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginBottom: 14 }}>
                  ✍️ ส่วนลงนามผู้สำรวจและวิเคราะห์
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 14 }}>
                  {/* Sign 1: Surveyor & Analyst */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, textAlign: 'center', background: 'var(--bg-surface-raised, #172340)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', marginBottom: 8 }}>
                      1. ผู้สำรวจและวิเคราะห์
                    </div>
                    
                    <SignaturePad 
                      value={sig1Image} 
                      onChange={setSig1Image} 
                      placeholder="วาดลายเซ็นต์ผู้สำรวจและวิเคราะห์" 
                    />

                    <div style={{ textAlign: 'left', marginTop: 10, marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>ชื่อ-นามสกุล:</label>
                      <input 
                        type="text" 
                        value={inspectorName} 
                        placeholder="พิมพ์ชื่อ-นามสกุลผู้สำรวจและวิเคราะห์"
                        onChange={e => setInspectorName(e.target.value)} 
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }} 
                      />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>ตำแหน่ง:</label>
                      <input 
                        type="text" 
                        value={inspectorRole} 
                        onChange={e => setInspectorRole(e.target.value)} 
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }} 
                      />
                    </div>
                  </div>

                  {/* Section 2 Info Card: Notice about Approver moving to Admin */}
                  <div style={{ border: '1.5px dashed rgba(56, 189, 248, 0.4)', borderRadius: 8, padding: 18, background: 'rgba(56, 189, 248, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 26 }}>🛡️</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: '#38bdf8' }}>
                          2. ผู้ตรวจสอบและรับรองความถูกต้อง
                        </div>
                        <div style={{ fontSize: 11.5, color: '#93c5fd' }}>
                          ขั้นตอนลงนามรับรองย้ายไปอยู่ในเมนู <strong>Admin Settings</strong>
                        </div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', lineHeight: 1.6, margin: '0 0 12px' }}>
                      ผู้สำรวจทำหน้าที่ลงนามเฉพาะส่วนที่ 1 เท่านั้น เมื่อบันทึกเอกสารแล้ว เอกสารจะมีสถานะ <strong>"รอการตรวจสอบและรับรอง"</strong>
                    </p>

                    <div style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '10px 12px', fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 700, color: '#fef08a', marginBottom: 3 }}>
                        🔐 การดำเนินการของผู้ตรวจสอบ (Admin):
                      </div>
                      <div>• ตรวจสอบความถูกต้องและกดยืนยันลงนามรับรองผ่านเมนู Admin (PIN: 8888)</div>
                      <div>• สามารถเลือก/เปลี่ยนผู้ลงนาม, อัปโหลดรูปลายเซ็นต์ หรือวาดสดได้ในระบบ Admin</div>
                      <div>• ลายเซ็นต์และชื่อผู้รับรองจะปรากฏในเอกสารฉบับทางการหลังจากได้รับการยืนยันแล้วเท่านั้น</div>
                    </div>
                  </div>
                </div>

                {/* Optional justification: hidden/collapsed by default, not required */}
                <details style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: '10px 14px', marginTop: 14 }}>
                  <summary style={{ fontSize: 12.5, fontWeight: 700, color: '#93c5fd', cursor: 'pointer', userSelect: 'none' }}>
                    📝 ระบุเหตุผลความจำเป็นเพิ่มเติม (ไม่จำเป็นต้องใส่ — หากเว้นว่างไว้จะไม่ออกในเอกสารเพื่อไม่ให้ซ้ำซ้อนกับอาการชำรุด)
                  </summary>
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 6px' }}>
                      หากไม่ระบุ ระบบจะใช้ข้อมูลอาการชำรุดจากขั้นตอนที่ 2 เป็นหลัก และจะไม่มีหัวข้อนี้ในเอกสาร
                    </p>
                    <textarea 
                      rows="3" 
                      value={justification} 
                      placeholder="(เว้นว่างได้) พิมพ์เหตุผลเพิ่มเติมเฉพาะกรณีที่มีเงื่อนไขพิเศษ..."
                      onChange={e => setJustification(e.target.value)} 
                      className="wizard-dark-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 12.5, lineHeight: 1.45 }} 
                    />
                  </div>
                </details>
              </div>
            )}

            {/* STEP 5: Summary & Export */}
            {currentStep === 4 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <h2 style={{ fontSize: 18, color: 'var(--ink-primary, #eef2ff)', margin: '0 0 6px', fontWeight: 800 }}>ตรวจสอบข้อมูลและพร้อมบันทึกหรือส่งออกเอกสาร</h2>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 20px' }}>
                  ท่านได้กรอกข้อมูลใบเสนอแจ้งซ่อมเลขที่ <strong style={{ color: '#f87171' }}>{refNo || '(ยังไม่ระบุ)'}</strong> ครบถ้วนเรียบร้อยแล้ว
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 600, margin: '0 auto 24px', textAlign: 'left' }}>
                  <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)' }}>จุดติดตั้งที่พบปัญหา</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', marginTop: 2 }}>{surveyPoints.length} จุด</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)' }}>รายการอุปกรณ์ที่ขอซื้อ</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa', marginTop: 2 }}>{itemsRequested.length} รายการ</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                  <button 
                    onClick={handleSaveOnline}
                    disabled={saving}
                    style={{
                      background: 'var(--accent, #2563eb)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '12px 20px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                    }}>
                    {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกลงระบบออนไลน์ (GitHub)'}
                  </button>

                  <button 
                    onClick={handleDirectDownloadPdf}
                    disabled={isExportingPdf}
                    title={`ดาวน์โหลดเป็นไฟล์ PDF ลงเครื่องทันที (${getPdfFileName()}.pdf)`}
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: '11px 20px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: isExportingPdf ? 'wait' : 'pointer',
                      boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                    <span>📥</span> {isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดไฟล์ PDF ทันที (Direct Save)'}
                  </button>

                  <button 
                    onClick={() => setActiveView('document')}
                    style={{
                      background: 'var(--bg-surface-raised, #172340)',
                      color: 'var(--ink-primary, #eef2ff)',
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: '11px 20px',
                      borderRadius: 8,
                      border: '1px solid var(--border-strong, #2d3f5e)',
                      cursor: 'pointer'
                    }}>
                    📄 ดูตัวอย่างเอกสารฉบับทางการ (Full A4 View)
                  </button>
                </div>
              </div>
            )}

            {/* Sticky Step Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface, #111d32)',
              border: '1px solid var(--border-hairline, #1e2e4a)',
              padding: '12px 20px',
              borderRadius: 10,
              marginTop: 18,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <button 
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                style={{
                  background: currentStep === 0 ? 'var(--bg-surface-raised, #172340)' : 'var(--bg-surface-raised, #172340)',
                  color: currentStep === 0 ? 'var(--ink-muted, #5a6a8a)' : 'var(--ink-primary, #eef2ff)',
                  border: '1px solid var(--border-strong, #2d3f5e)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 0 ? 0.6 : 1
                }}>
                ◀ ย้อนกลับ
              </button>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                ขั้นตอนที่ {currentStep + 1} / {steps.length} : {steps[currentStep].title}
              </div>

              {currentStep < steps.length - 1 ? (
                <button 
                  onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                  style={{
                    background: 'var(--accent, #2563eb)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}>
                  ถัดไป ▶
                </button>
              ) : (
                <button 
                  onClick={handleSaveOnline}
                  disabled={saving}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}>
                  {saving ? 'กำลังบันทึก...' : '✓ บันทึกออนไลน์'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DOCUMENT FULL VIEW (A4 Printable Layout with Official Letterhead - always rendered in DOM for 100% reliable print/PDF) */}
        <div className={`doc-print-wrapper ${activeView !== 'document' ? 'screen-hidden' : ''}`} style={{ maxWidth: 880, margin: '0 auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)' }}>
                📄 มุมมองตัวอย่างพิมพ์ A4 เสมือนจริง (ปรับสไตล์ให้คมชัด สีเข้ม ไม่ซีดจางเมื่อพิมพ์หรือ Export PDF)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setActiveView('wizard')}
                  style={{ background: 'var(--bg-surface-raised, #172340)', color: 'var(--ink-primary, #eef2ff)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ กลับไปโหมดแก้ไข
                </button>
                <button 
                  onClick={handleDirectDownloadPdf}
                  disabled={isExportingPdf}
                  title={`ดาวน์โหลดเป็นไฟล์ PDF ลงเครื่องทันที (${getPdfFileName()}.pdf)`}
                  style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: isExportingPdf ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>📥</span> {isExportingPdf ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดไฟล์ PDF ทันที (Direct Save)'}
                </button>
                <button 
                  onClick={handleBrowserPrint}
                  title="เปิดหน้าต่างสั่งพิมพ์ออกเครื่องพิมพ์"
                  style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>🖨️</span> สั่งพิมพ์ (Print)
                </button>
              </div>
            </div>

            {/* Document Approval Status Notification Banner (Screen only, excluded from print) */}
            <div className="no-print" style={{ marginBottom: 16 }}>
              {proposalStatus !== 'approved' ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.12) 100%)',
                  border: '1.5px solid #f59e0b',
                  borderRadius: 10,
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>⏳</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#fbbf24' }}>
                        สถานะ: อยู่ระหว่างรอการตรวจสอบและรับรองความถูกต้อง (Pending Approval)
                      </div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>
                        เอกสารถูกสร้างโดยผู้สำรวจแล้ว ในเอกสารฉบับพิมพ์จะยังไม่แสดงลายเซ็นต์ผู้รับรองจนกว่าผู้มีอำนาจจะกดยืนยันรับรอง
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdminAuth) {
                        setShowSettingsModal(true);
                      } else {
                        setShowPinModal(true);
                      }
                    }}
                    style={{
                      background: '#f59e0b',
                      border: 'none',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: 12.5,
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                    <span>🛡️</span> ตรวจสอบและลงนามรับรอง (Admin)
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.12) 100%)',
                  border: '1.5px solid #22c55e',
                  borderRadius: 10,
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#4ade80' }}>
                        สถานะ: ได้รับการตรวจสอบและลงนามรับรองความถูกต้องเรียบร้อยแล้ว
                      </div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
                        ผู้ตรวจสอบและรับรอง: <strong style={{ color: '#ffffff' }}>{approverName}</strong> ({approverRole})
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdminAuth) {
                        setShowSettingsModal(true);
                      } else {
                        setShowPinModal(true);
                      }
                    }}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid #22c55e',
                      color: '#4ade80',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}>
                    ⚙️ จัดการผู้รับรองใน Admin
                  </button>
                </div>
              )}
            </div>

            {/* Printable Container for PDF Engine */}
            <div id="repair-proposal-print-area">

            {/* PAGE 1: Header, Letterhead, Info, Survey Table, Requested Items */}
            <div className="a4-print-page" style={{ background: '#ffffff', borderRadius: 8, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', marginBottom: 20, color: '#0f172a' }}>
              
              {/* Official Letterhead Banner (Configured in Admin Settings) */}
              {adminSettings.header?.showLetterhead && (
                adminSettings.header?.bannerImageUrl ? (
                  /* MODE A: รูปภาพหัวกระดาษแบบเต็ม A4 (Full Banner Image - No text overlay) */
                  <div 
                    className={adminSettings.header?.bannerLayout === 'contained' ? 'doc-banner-contained' : 'doc-banner-bleed'}
                    style={adminSettings.header?.bannerLayout === 'contained' ? {
                      width: '100%',
                      borderBottom: '2.5px solid #0f2e5a',
                      paddingBottom: 6,
                      marginBottom: 14
                    } : {
                      width: 'calc(100% + 64px)',
                      margin: '-32px -32px 14px -32px',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      overflow: 'hidden',
                      borderBottom: '2.5px solid #0f2e5a'
                    }}>
                    <img 
                      src={adminSettings.header.bannerImageUrl} 
                      alt="Official Letterhead Banner" 
                      style={{ width: '100%', height: 'auto', display: 'block' }} 
                    />
                  </div>
                ) : (
                  /* MODE B: หัวกระดาษทางการแบบเต็ม A4 (โลโก้คมชัดขนาดใหญ่ + ข้อความหน่วยงาน) */
                  <div 
                    className={`doc-header-banner ${adminSettings.header?.bannerLayout === 'contained' ? 'doc-banner-contained' : 'doc-banner-bleed'}`}
                    style={adminSettings.header?.bannerLayout === 'contained' ? {
                      width: '100%',
                      background: adminSettings.header?.bannerTheme === 'navy'
                        ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)'
                        : '#ffffff',
                      borderBottom: adminSettings.header?.bannerTheme === 'navy'
                        ? '3.5px solid #d97706'
                        : '3.5px solid #0f2e5a',
                      padding: adminSettings.header?.bannerTheme === 'navy' ? '12px 16px' : '0 0 12px 0',
                      borderRadius: 6,
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18
                    } : {
                      width: 'calc(100% + 64px)',
                      margin: '-32px -32px 16px -32px',
                      background: adminSettings.header?.bannerTheme === 'navy'
                        ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)'
                        : '#ffffff',
                      borderBottom: adminSettings.header?.bannerTheme === 'navy'
                        ? '3.5px solid #d97706'
                        : '3.5px solid #0f2e5a',
                      boxShadow: adminSettings.header?.bannerTheme === 'navy'
                        ? 'none'
                        : '0 3px 0 #d97706',
                      padding: '16px 32px 14px 32px',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 22
                    }}>
                    {currentLogoUrl && (
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={currentLogoUrl} 
                          alt="Logo" 
                          className={`doc-header-logo doc-header-logo-${adminSettings.header?.logoSize || 'large'}`}
                          style={{ 
                            height: logoHeight, 
                            maxWidth: logoMaxWidth, 
                            objectFit: 'contain', 
                            display: 'block',
                            background: adminSettings.header?.bannerTheme === 'navy' ? '#ffffff' : 'transparent',
                            padding: adminSettings.header?.bannerTheme === 'navy' ? 4 : 0,
                            borderRadius: adminSettings.header?.bannerTheme === 'navy' ? 6 : 0
                          }} 
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: (adminSettings.header?.logoSize === 'xlarge' ? 20 : adminSettings.header?.logoSize === 'normal' ? 17 : 18.5), 
                        fontWeight: 900, 
                        color: adminSettings.header?.bannerTheme === 'navy' ? '#ffffff' : '#0f2e5a', 
                        lineHeight: 1.25, 
                        letterSpacing: 0.2 
                      }}>
                        {adminSettings.header?.companyTitle}
                      </div>
                      <div style={{ 
                        fontSize: (adminSettings.header?.logoSize === 'xlarge' ? 14.5 : adminSettings.header?.logoSize === 'normal' ? 12.5 : 13.5), 
                        fontWeight: 700, 
                        color: adminSettings.header?.bannerTheme === 'navy' ? '#e2e8f0' : '#1e293b', 
                        marginTop: 3 
                      }}>
                        {adminSettings.header?.companySubtitle}
                      </div>
                      {adminSettings.header?.companyAddress && (
                        <div style={{ 
                          fontSize: 11.5, 
                          color: adminSettings.header?.bannerTheme === 'navy' ? '#94a3b8' : '#475569', 
                          fontWeight: 600, 
                          marginTop: 3 
                        }}>
                          {adminSettings.header?.companyAddress}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Official Form Header Box */}
              <div style={{ border: '2.5px solid #0f2e5a', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: 12, background: '#f8fafc' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f2e5a' }}>ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', letterSpacing: 0.3 }}>EQUIPMENT REPAIR & REPLACEMENT PROPOSAL FORM</div>
                  <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 800, color: '#0f2e5a' }}>
                    ชื่องาน: {jobTitle || '(ยังไม่ระบุชื่องาน)'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11.5 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0369a1', marginBottom: 3 }}>เอกสารหลัก - หน้า 1 / {totalDocPages}</div>
                  <div><strong style={{ color: '#0f172a' }}>เลขที่ใบแจ้งซ่อม:</strong> <strong style={{ color: '#b91c1c' }}>{refNo || '-'}</strong></div>
                  <div><strong style={{ color: '#0f172a' }}>วันที่เสนอ:</strong> <strong style={{ color: '#0f172a' }}>{docDate || '-'}</strong></div>
                  <div><strong style={{ color: '#0f172a' }}>ใบแจ้งซ่อม FM:</strong> <strong style={{ color: fmRefNo ? '#0369a1' : '#64748b' }}>{fmRefNo || '-'}</strong></div>
                </div>
              </div>

              {/* Info Table (No company row, since it is in letterhead!) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 12, border: '1.5px solid #475569' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%', background: '#e2e8f0', fontWeight: 800, color: '#0f2e5a', padding: '6px 10px', border: '1.5px solid #475569' }}>ผู้แจ้งซ่อม / ผู้สำรวจและวิเคราะห์</td>
                    <td style={{ width: '30%', padding: '6px 10px', border: '1.5px solid #475569', color: '#0f172a', fontWeight: 600 }}>{inspectorName || '-'}</td>
                    <td style={{ width: '20%', background: '#e2e8f0', fontWeight: 800, color: '#0f2e5a', padding: '6px 10px', border: '1.5px solid #475569' }}>ตำแหน่ง / สายงาน</td>
                    <td style={{ width: '30%', padding: '6px 10px', border: '1.5px solid #475569', color: '#0f172a', fontWeight: 600 }}>{inspectorRole || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ background: '#e2e8f0', fontWeight: 800, color: '#0f2e5a', padding: '6px 10px', border: '1.5px solid #475569' }}>หน่วยงานที่รับผิดชอบ</td>
                    <td colSpan={3} style={{ padding: '6px 10px', border: '1.5px solid #475569', color: '#0f172a', fontWeight: 600 }}>{department || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 1: Survey Table */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                1. ผลการสำรวจและตารางรายการอาคาร/จุดติดตั้งที่พบปัญหา
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 12, border: '1.5px solid #475569' }}>
                <thead>
                  <tr style={{ background: '#0f2e5a', color: '#ffffff' }}>
                    <th style={{ padding: '6px 4px', width: 35, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>ลำดับ</th>
                    <th style={{ padding: '6px 6px', width: 95, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>รหัสอาคาร</th>
                    <th style={{ padding: '6px 6px', width: 115, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>จุดติดตั้ง</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', border: '1.5px solid #0f2e5a' }}>อาการชำรุด / ผลการสำรวจทางเทคนิค</th>
                    <th style={{ padding: '6px 6px', width: 95, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>ข้อเสนอแนะ</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyPoints.map((sp, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1.5px solid #475569' }}>{idx + 1}</td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#0369a1', border: '1.5px solid #475569' }}>{sp.building || '-'}</td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 600, color: '#0f172a', border: '1.5px solid #475569' }}>{sp.location || '-'}</td>
                      <td style={{ padding: 6, border: '1.5px solid #475569', color: '#0f172a', fontWeight: 600 }}>
                        {sp.symptom || '-'}
                      </td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#b91c1c', border: '1.5px solid #475569' }}>{sp.action || 'เปลี่ยนทดแทน'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Section 2: Items Requested Table (Extensible) */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                2. สรุปรายการและรุ่นอุปกรณ์ที่ขอเสนอซื้อเพื่อแก้ไขงาน
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 10, border: '1.5px solid #475569' }}>
                <thead>
                  <tr style={{ background: '#0f2e5a', color: '#ffffff' }}>
                    <th style={{ padding: '6px 4px', width: 35, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>ลำดับ</th>
                    <th style={{ padding: '6px 8px', width: 170, textAlign: 'left', border: '1.5px solid #0f2e5a' }}>รายการอุปกรณ์ / อะไหล่</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', border: '1.5px solid #0f2e5a' }}>ยี่ห้อ / รุ่น / รหัสอะไหล่ที่ต้องการ (หรือเทียบเท่า)</th>
                    <th style={{ padding: '6px 6px', width: 55, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>จำนวน</th>
                    <th style={{ padding: '6px 6px', width: 50, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>หน่วย</th>
                    <th style={{ padding: '6px 8px', width: 160, textAlign: 'left', border: '1.5px solid #0f2e5a' }}>ตำแหน่งติดตั้ง / วัตถุประสงค์</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsRequested.map((it, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1.5px solid #475569' }}>{idx + 1}</td>
                      <td style={{ padding: 6, fontWeight: 800, color: '#0f2e5a', border: '1.5px solid #475569' }}>{it.name || '-'}</td>
                      <td style={{ padding: 6, border: '1.5px solid #475569' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.modelPart || '-'}</div>
                      </td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 800, color: '#0f172a', border: '1.5px solid #475569' }}>{it.qty || 1}</td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: '#0f172a', border: '1.5px solid #475569' }}>{it.unit || 'ตัว'}</td>
                      <td style={{ padding: 6, fontSize: 10.5, fontWeight: 600, color: '#0f172a', border: '1.5px solid #475569' }}>{it.purpose || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Engineering Note */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #d97706', borderLeft: '4.5px solid #b45309', padding: '8px 12px', borderRadius: 4, fontSize: 11, color: '#78350f', fontWeight: 600 }}>
                <strong>** หมายเหตุทางวิศวกรรม:</strong> รายการอุปกรณ์และรุ่นที่ระบุข้างต้นเป็นเกณฑ์อ้างอิงความต้องการทางเทคนิคสำหรับการแก้ไขงาน ทั้งนี้ ฝ่ายจัดซื้อสามารถจัดหายี่ห้อหรือรุ่นอื่นที่มีคุณสมบัติทางเทคนิคเทียบเท่าหรือดีกว่าได้ตามความเหมาะสมและความพร้อมในการจัดหา
              </div>
            </div>

            {/* PAGE 2: Specs, Justification, 2 Signatures */}
            <div className="a4-print-page" style={{ background: '#ffffff', borderRadius: 8, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', marginBottom: 20, color: '#0f172a' }}>
              {/* Official Page 2 Header for Attachment Document */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 12, fontSize: 11, color: '#475569', fontWeight: 700 }}>
                <span>เอกสารแนบใบเสนอแจ้งซ่อมเลขที่: <strong style={{ color: '#0f2e5a' }}>{refNo || '-'}</strong>{fmRefNo ? ` (FM: ${fmRefNo})` : ''}</span>
                <span>เอกสารหลัก - หน้า 2 / {totalDocPages}</span>
              </div>

              {/* Section 3: Technical Specifications Summary Table */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>3. สรุปข้อกำหนดคุณลักษณะเฉพาะและเงื่อนไขสำคัญในการจัดหา</span>
                <span style={{ fontSize: 10.5, color: '#0369a1', fontWeight: 700 }}>(รายละเอียดคุณลักษณะเฉพาะและรูปถ่ายประกอบฉบับเต็ม ดูเอกสารแนบท้าย)</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14, border: '1.5px solid #475569' }}>
                <thead>
                  <tr style={{ background: '#0f2e5a', color: '#ffffff' }}>
                    <th style={{ padding: '6px 4px', width: 35, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>ลำดับ</th>
                    <th style={{ padding: '6px 8px', width: 170, textAlign: 'left', border: '1.5px solid #0f2e5a' }}>รายการอุปกรณ์ / รุ่นที่ต้องการ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', border: '1.5px solid #0f2e5a' }}>สรุปสาระสำคัญคุณลักษณะเฉพาะ</th>
                    <th style={{ padding: '6px 6px', width: 115, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>เอกสารแนบท้าย</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsRequested.map((it, idx) => {
                    const itemSpecText = it.specs?.trim() || (idx === 0 ? substitutionSpecs?.trim() : '') || 'จัดหาตามรุ่นที่ระบุหรือเทียบเท่าที่มีคุณสมบัติทางเทคนิคเข้ากันได้กับระบบเดิม';
                    const hasPhotos = (Array.isArray(it.photos) && it.photos.length > 0) || it.photo;
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, border: '1.5px solid #475569' }}>3.{idx + 1}</td>
                        <td style={{ padding: '6px 8px', border: '1.5px solid #475569' }}>
                          <strong style={{ color: '#0f2e5a' }}>{it.name || `รายการที่ ${idx + 1}`}</strong>
                          {it.modelPart && <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>รุ่น: {it.modelPart}</div>}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1.5px solid #475569', color: '#1e293b', fontSize: 10.5 }}>
                          <div style={{ maxHeight: 52, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                            {itemSpecText}
                          </div>
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', border: '1.5px solid #475569' }}>
                          <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontWeight: 700, display: 'inline-block' }}>
                            แนบท้าย แผ่นที่ {idx + 1} {hasPhotos ? '📷' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Section 4: Justification (Optional - Only rendered if custom justification is provided) */}
              {justification && justification.trim() !== '' && (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                    4. เหตุผลความจำเป็นในการจัดซื้อจัดจ้างเพื่อเปลี่ยนทดแทน
                  </div>
                  <div style={{ background: '#f8fafc', border: '1.5px solid #475569', borderRadius: 4, padding: '10px 14px', fontSize: 11, marginBottom: 16, lineHeight: 1.6, textAlign: 'justify', color: '#0f172a', fontWeight: 500 }}>
                    {justification}
                  </div>
                </>
              )}

              {/* Signatures (Dynamically numbered: 4 if no justification, 5 if justification exists) */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 10 }}>
                {justification && justification.trim() !== '' ? '5.' : '4.'} ส่วนลงนามผู้สำรวจและวิเคราะห์ และผู้ตรวจสอบและรับรอง
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Sig 1: Surveyor & Analyst */}
                <div style={{ border: '2px solid #334155', borderRadius: 6, padding: '12px 14px', textAlign: 'center', minHeight: 145, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                  <div style={{ fontWeight: 800, color: '#0f2e5a', marginBottom: 4, fontSize: 12.5 }}>ผู้สำรวจและวิเคราะห์</div>
                  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sig1Image ? (
                      <img src={sig1Image} alt="Signature 1" style={{ maxHeight: 48, maxWidth: '90%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#475569', fontWeight: 700, fontSize: 12 }}>....................................................</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1.5px solid #334155', paddingTop: 6, fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
                    ({inspectorName || '....................................................'})
                  </div>
                  <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>{inspectorRole || 'วิศวกรผู้สำรวจและวิเคราะห์'}</div>
                </div>

                {/* Sig 2: Inspector & Certifier */}
                <div style={{ border: '2px solid #334155', borderRadius: 6, padding: '12px 14px', textAlign: 'center', minHeight: 145, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                  <div style={{ fontWeight: 800, color: '#0f2e5a', marginBottom: 2, fontSize: 12.5 }}>ผู้ตรวจสอบและรับรอง</div>
                  <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {proposalStatus === 'approved' ? (
                      <span style={{ fontSize: 11, color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '1px 8px', borderRadius: 4, border: '1px solid #86efac' }}>
                        ⦿ ตรวจสอบและรับรองความถูกต้อง
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#b45309', fontWeight: 800, background: '#fef3c7', padding: '1px 8px', borderRadius: 4, border: '1px solid #fde68a' }}>
                        ⏳ รอการตรวจสอบและรับรองความถูกต้อง
                      </span>
                    )}
                  </div>
                  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {proposalStatus === 'approved' && sig2Image ? (
                      <img src={sig2Image} alt="Approver Signature" style={{ maxHeight: 48, maxWidth: '90%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>....................................................</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1.5px solid #334155', paddingTop: 6, fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
                    {proposalStatus === 'approved' ? `(${approverName || 'ผู้ตรวจสอบและรับรอง'})` : '(....................................................)'}
                  </div>
                  <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>
                    {proposalStatus === 'approved' ? (approverRole || 'วศ.4 หบท-ธ.') : '(รอผู้ตรวจสอบและรับรองลงนาม)'}
                  </div>
                </div>
              </div>
            </div>

            {/* ATTACHMENT PAGES: Specification Sheet & Photos (1 page per requested item) */}
            {itemsRequested.map((it, itIdx) => {
              const itPhotos = (Array.isArray(it.photos) && it.photos.length > 0) ? it.photos : (it.photo ? [it.photo] : []);
              const pageNum = 3 + itIdx;

              return (
                <div 
                  key={it.id || itIdx} 
                  className="a4-print-page" 
                  style={{ 
                    background: '#ffffff', 
                    borderRadius: 8, 
                    padding: '28px 32px', 
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)', 
                    color: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '297mm',
                    boxSizing: 'border-box'
                  }}
                >
                  <div>
                    {/* Header Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 12, fontSize: 11, color: '#475569', fontWeight: 700 }}>
                      <span>เอกสารแนบใบเสนอแจ้งซ่อมเลขที่: <strong style={{ color: '#0f2e5a' }}>{refNo || '-'}</strong>{fmRefNo ? ` (FM: ${fmRefNo})` : ''}</span>
                      <span>หน้า {pageNum} / {totalDocPages}</span>
                    </div>

                    {/* Section Title */}
                    <div style={{ background: '#f8fafc', border: '1.5px solid #0f2e5a', borderRadius: 6, padding: '8px 14px', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a' }}>
                            เอกสารแนบท้าย 3.{itIdx + 1}: ข้อกำหนดคุณลักษณะเฉพาะและภาพถ่ายตัวอย่างอุปกรณ์
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                            โครงการ/งาน: <strong style={{ color: '#1e293b' }}>{jobTitle || '-'}</strong>
                          </div>
                        </div>
                        <span style={{ background: '#0f2e5a', color: '#ffffff', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          รายการที่ {itIdx + 1} จาก {itemsRequested.length || 1}
                        </span>
                      </div>
                    </div>

                    {/* Equipment Information Summary Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11.5 }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '22%', background: '#f1f5f9', padding: '6px 10px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                            ชื่ออุปกรณ์/พัสดุ:
                          </td>
                          <td style={{ width: '45%', padding: '6px 10px', fontWeight: 800, border: '1px solid #cbd5e1', color: '#0f172a' }}>
                            {it.name || '-'}
                          </td>
                          <td style={{ width: '15%', background: '#f1f5f9', padding: '6px 10px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                            จำนวนที่ขอซื้อ:
                          </td>
                          <td style={{ width: '18%', padding: '6px 10px', fontWeight: 800, border: '1px solid #cbd5e1', color: '#0369a1' }}>
                            {it.qty || 1} {it.unit || 'ตัว'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ background: '#f1f5f9', padding: '6px 10px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                            ยี่ห้อ / รุ่น / Part No.:
                          </td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#1e293b' }}>
                            {it.modelPart || '-'}
                          </td>
                          <td style={{ background: '#f1f5f9', padding: '6px 10px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                            จุดติดตั้ง / วัตถุประสงค์:
                          </td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', color: '#1e293b' }}>
                            {it.purpose || it.targetBuilding || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Section 1: Detailed Technical Specifications */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f2e5a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📋</span> 1. ข้อกำหนดและคุณลักษณะเฉพาะทางเทคนิค (Technical Specifications):
                      </div>
                      <div style={{ 
                        border: '1.5px solid #cbd5e1', 
                        borderRadius: 6, 
                        padding: '10px 14px', 
                        background: '#f8fafc', 
                        fontSize: 11, 
                        lineHeight: 1.6, 
                        color: '#1e293b',
                        whiteSpace: 'pre-wrap',
                        minHeight: 80
                      }}>
                        {it.specs?.trim() ? it.specs : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            (ไม่ได้ระบุข้อกำหนดคุณลักษณะเฉพาะเพิ่มเติม - ให้อิงตามมาตรฐานผู้ผลิตและรุ่นอุปกรณ์ข้างต้น)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Reference Photos, Catalog, or Nameplate */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📷</span> 2. ภาพถ่ายตัวอย่างอุปกรณ์ / แคตตาล็อก / เนมเพลท (Reference Photos / Nameplate):
                      </div>

                      {itPhotos.length > 0 ? (
                        <div style={{ 
                          border: '1.5px solid #bbf7d0', 
                          borderRadius: 6, 
                          padding: 10, 
                          background: '#f0fdf4' 
                        }}>
                          {itPhotos.length === 1 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ 
                                width: '100%', 
                                maxHeight: 310, 
                                height: 300, 
                                background: '#ffffff', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: 6, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                overflow: 'hidden',
                                padding: 6
                              }}>
                                <img 
                                  src={itPhotos[0]} 
                                  alt={it.name} 
                                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                />
                              </div>
                              <div style={{ fontSize: 10, color: '#475569', marginTop: 4, fontWeight: 700 }}>
                                รูปภาพประกอบ: {it.name} {it.modelPart ? `(รุ่น ${it.modelPart})` : ''}
                              </div>
                            </div>
                          ) : itPhotos.length === 2 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {itPhotos.map((photoSrc, phIdx) => (
                                <div key={phIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{ 
                                    width: '100%', 
                                    height: 260, 
                                    background: '#ffffff', 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: 6, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    overflow: 'hidden',
                                    padding: 6
                                  }}>
                                    <img 
                                      src={photoSrc} 
                                      alt={`${it.name}-${phIdx + 1}`} 
                                      style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                    />
                                  </div>
                                  <div style={{ fontSize: 9.5, color: '#475569', marginTop: 4, fontWeight: 700 }}>
                                    รูปที่ {phIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                              {itPhotos.map((photoSrc, phIdx) => (
                                <div key={phIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{ 
                                    width: '100%', 
                                    height: 220, 
                                    background: '#ffffff', 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: 6, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    overflow: 'hidden',
                                    padding: 6
                                  }}>
                                    <img 
                                      src={photoSrc} 
                                      alt={`${it.name}-${phIdx + 1}`} 
                                      style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                    />
                                  </div>
                                  <div style={{ fontSize: 9, color: '#475569', marginTop: 4, fontWeight: 700 }}>
                                    รูปที่ {phIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ 
                          border: '1.5px dashed #cbd5e1', 
                          borderRadius: 6, 
                          padding: '24px 16px', 
                          textAlign: 'center', 
                          background: '#f8fafc',
                          color: '#94a3b8',
                          fontSize: 11
                        }}>
                          (ไม่มีการแนบรูปถ่ายตัวอย่างอุปกรณ์สำหรับรายการนี้ - กำหนดให้เป็นไปตามรุ่นและมาตรฐานทางวิศวกรรม)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachment Sign-off Footer */}
                  <div style={{ 
                    borderTop: '1.5px solid #cbd5e1', 
                    paddingTop: 10, 
                    marginTop: 14, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: 10.5,
                    color: '#475569'
                  }}>
                    <div>
                      <div>ผู้จัดทำคุณลักษณะ: <strong>{inspectorName || '-'}</strong> ({inspectorRole || 'ช่างเทคนิค/ผู้สำรวจ'})</div>
                      <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 1 }}>วันที่ตรวจสำรวจ: {surveyDate || '-'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>ผู้ตรวจสอบรับรอง: <strong>{approverName || '-'}</strong> ({approverRole || 'วศ.4 หบท-ธ.'})</div>
                      <div style={{ fontSize: 9.5, color: proposalStatus === 'approved' ? '#166534' : '#b45309', fontWeight: 700, marginTop: 1 }}>
                        {proposalStatus === 'approved' ? '✓ ลงนามรับรองความถูกต้องแล้ว' : '(รอลงนามรับรอง)'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ANNEX: Defect Points Photos (Field Survey Photos) */}
            {hasDefectPhotos && (
              <div className="a4-print-page" style={{ background: '#ffffff', borderRadius: 8, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', color: '#0f172a' }}>
                {/* Official Header for Attachment Document */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 12, fontSize: 11, color: '#475569', fontWeight: 700 }}>
                  <span>เอกสารแนบใบเสนอแจ้งซ่อมเลขที่: <strong style={{ color: '#0f2e5a' }}>{refNo || '-'}</strong>{fmRefNo ? ` (FM: ${fmRefNo})` : ''} (ภาคผนวกภาพถ่ายสภาพหน้างาน)</span>
                  <span>หน้า {totalDocPages} / {totalDocPages}</span>
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 12 }}>
                  ภาคผนวก: ภาพถ่ายสภาพหน้างานและจุดที่ตรวจพบความชำรุดเสียหาย
                </div>

                {/* Defect Points Photos Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {surveyPoints
                    .filter(p => Boolean((p.photos && p.photos.length > 0) || p.photo))
                    .map((p, pIdx) => {
                      const pointPhotos = (Array.isArray(p.photos) && p.photos.length > 0) ? p.photos : (p.photo ? [p.photo] : []);
                      const colSpan = pointPhotos.length >= 3 ? 'span 3' : (pointPhotos.length === 2 ? 'span 2' : 'span 1');

                      return (
                        <div 
                          key={p.id || pIdx} 
                          style={{ 
                            border: '1.5px solid #475569', 
                            borderRadius: 6, 
                            overflow: 'hidden', 
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gridColumn: colSpan
                          }}>
                          {/* Card Header Info */}
                          <div style={{ padding: '6px 9px', background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, flexWrap: 'wrap', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontWeight: 800, color: '#ffffff', background: '#0284c7', padding: '1px 6px', borderRadius: 3, fontSize: 10.5 }}>
                                  {p.building || `จุดที่ ${pIdx + 1}`}
                                </span>
                                <span style={{ fontSize: 10, color: '#334155', fontWeight: 700, background: '#e2e8f0', padding: '1px 5px', borderRadius: 3 }}>
                                  {p.location || 'Main MDB'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {p.action && (
                                  <span style={{ 
                                    fontSize: 9.5, 
                                    fontWeight: 800, 
                                    padding: '1px 5px', 
                                    borderRadius: 3, 
                                    background: p.action === 'จัดหาเพิ่มจากเดิม' ? '#fef3c7' : (p.action === 'ซ่อมแซม/แก้ไข' ? '#dbeafe' : '#fee2e2'),
                                    color: p.action === 'จัดหาเพิ่มจากเดิม' ? '#92400e' : (p.action === 'ซ่อมแซม/แก้ไข' ? '#1e40af' : '#b91c1c'),
                                    border: `1px solid ${p.action === 'จัดหาเพิ่มจากเดิม' ? '#fde68a' : (p.action === 'ซ่อมแซม/แก้ไข' ? '#bfdbfe' : '#fecaca')}`
                                  }}>
                                    {p.action}
                                  </span>
                                )}
                                {pointPhotos.length > 1 && (
                                  <span style={{ fontSize: 9.5, color: '#0369a1', fontWeight: 800, background: '#e0f2fe', padding: '1px 5px', borderRadius: 3 }}>
                                    📷 {pointPhotos.length} รูป
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 10.5, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.symptom || '-'}
                            </div>
                          </div>

                          {/* Photos Container inside this single cell (White background, natural scale preserved) */}
                          <div style={{ padding: 6, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                            {pointPhotos.length === 1 ? (
                              <div style={{ width: '100%', height: 140, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img 
                                  src={pointPhotos[0]} 
                                  alt={p.building} 
                                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                />
                              </div>
                            ) : pointPhotos.length === 2 ? (
                              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {pointPhotos.map((photoSrc, phIdx) => (
                                  <div key={phIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ width: '100%', height: 135, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                      <img 
                                        src={photoSrc} 
                                        alt={`${p.building}-${phIdx + 1}`} 
                                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                      />
                                    </div>
                                    <div style={{ fontSize: 9, color: '#475569', textAlign: 'center', fontWeight: 700 }}>
                                      รูปที่ {phIdx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                {pointPhotos.map((photoSrc, phIdx) => (
                                  <div key={phIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ width: '100%', height: 130, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                      <img 
                                        src={photoSrc} 
                                        alt={`${p.building}-${phIdx + 1}`} 
                                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                                      />
                                    </div>
                                    <div style={{ fontSize: 9, color: '#475569', textAlign: 'center', fontWeight: 700 }}>
                                      รูปที่ {phIdx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            </div> {/* end repair-proposal-print-area */}

          </div>

        {/* Export / Save PDF Modal Dialog */}
        {showExportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 16, padding: '22px 24px', maxWidth: 500, width: '100%', boxShadow: '0 16px 50px rgba(0,0,0,0.6)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                    วิธีบันทึกเป็นไฟล์ PDF (Save as PDF)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: 4 }}>
                  ✕
                </button>
              </div>

              {/* Target Filename Card */}
              <div style={{ background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, color: '#93c5fd', fontWeight: 600 }}>📁 ชื่อไฟล์ที่จะได้รับอัตโนมัติ:</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#60a5fa', wordBreak: 'break-all', marginTop: 2 }}>
                  {getPdfFileName()}.pdf
                </div>
              </div>

              {/* Visual Graphic: How to turn "Print" into "Save" button */}
              <div style={{ background: '#0a101d', border: '1.5px solid #2563eb', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#93c5fd', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💡</span> ทำไมเปิดมาแล้วมีแต่คำว่า "พิมพ์ (Print)" ไม่มีปุ่ม Save?
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', marginBottom: 10, lineHeight: 1.5 }}>
                  เนื่องจากคอมพิวเตอร์ตั้งค่าเครื่องพิมพ์เริ่มต้นไว้ เพียงแค่ทำ 2 ขั้นตอนด้านล่างนี้ ปุ่มจะเปลี่ยนเป็นคำว่า <strong>"บันทึก (Save)"</strong> ทันที:
                </div>

                {/* Step 1 Graphic */}
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>1. ช่อง ปลายทาง (Destination):</span>
                  <span style={{ background: '#0284c7', color: '#ffffff', padding: '4px 10px', borderRadius: 5, fontSize: 12, fontWeight: 800 }}>
                    👉 บันทึกเป็น PDF (Save as PDF)
                  </span>
                </div>

                <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: 12, fontWeight: 700, margin: '2px 0' }}>
                  ⬇️ (ปุ่มสีน้ำเงินด้านล่างจะเปลี่ยนทันที)
                </div>

                {/* Step 2 Graphic */}
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>2. ปุ่มขวาล่างจะกลายเป็น:</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ background: '#334155', color: '#94a3b8', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>ยกเลิก</span>
                    <span style={{ background: '#2563eb', color: '#ffffff', padding: '3px 12px', borderRadius: 4, fontSize: 11.5, fontWeight: 800, boxShadow: '0 0 10px rgba(37,99,235,0.5)' }}>
                      💾 บันทึก (Save)
                    </span>
                  </div>
                </div>

                {/* Helpful Note about Microsoft Print to PDF */}
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(234, 179, 8, 0.1)', border: '1px dashed rgba(234, 179, 8, 0.4)', borderRadius: 6, fontSize: 11, color: '#fef08a', lineHeight: 1.45 }}>
                  📌 <strong>ข้อควรรู้:</strong> หากปลายทางของท่านขึ้นว่า <strong>"Microsoft Print to PDF"</strong> ท่านสามารถกดปุ่ม <strong>"พิมพ์"</strong> ได้ทันทีเช่นกัน! ระบบจะเปิดหน้าต่างเซฟไฟล์ PDF ลงเครื่องให้ (ไม่ได้ส่งกระดาษออกเครื่องพิมพ์)
                </div>
              </div>

              {/* Action Buttons: Direct Download + Print options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    handleDirectDownloadPdf();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '13px 18px',
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
                  }}>
                  <span>📥</span> ดาวน์โหลดไฟล์ PDF ลงเครื่องทันที (Direct Download)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (skipPdfGuide) {
                      try { localStorage.setItem('repair_skip_pdf_guide', '1'); } catch {}
                    }
                    handleBrowserPrint();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'var(--bg-surface-raised, #172340)',
                    color: '#93c5fd',
                    border: '1px solid var(--border-strong, #2d3f5e)',
                    borderRadius: 8,
                    padding: '9px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}>
                  <span>🖨️</span> เปิดหน้าต่างสั่งพิมพ์ (Print Dialog)
                </button>
              </div>

              {/* Skip Checkbox */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-hairline, #1e2e4a)' }}>
                <label style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={skipPdfGuide} 
                    onChange={e => setSkipPdfGuide(e.target.checked)} 
                  />
                  จำไว้และข้ามคำแนะนำนี้ในครั้งต่อไป
                </label>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ปิด
                </button>
              </div>

            </div>
          </div>
        )}

        {/* PDF Generating Loading Overlay */}
        {isExportingPdf && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 10001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#111d32', border: '1.5px solid #2563eb', borderRadius: 16, padding: '28px 36px', textAlign: 'center', maxWidth: 460, width: '100%', boxShadow: '0 16px 50px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#eef2ff', margin: '0 0 10px 0' }}>กำลังสร้างและดาวน์โหลดไฟล์ PDF ลงเครื่อง...</h3>
              <div style={{ fontSize: 13.5, color: '#93c5fd', fontWeight: 600, marginBottom: 14 }}>
                {exportProgress || 'กรุณารอสักครู่...'}
              </div>
              <div style={{ background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#60a5fa', wordBreak: 'break-all' }}>
                📁 {getPdfFileName()}.pdf
              </div>
            </div>
          </div>
        )}

        {/* PIN Verification Modal */}
        {showPinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 14, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🔒</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)</h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-secondary, #94a3c4)', margin: '4px 0 0' }}>กรุณากรอกรหัส PIN เพื่อเข้าสู่เมนูตั้งค่า</p>
              </div>

              <form onSubmit={handlePinSubmit}>
                <input 
                  type="password" 
                  autoFocus 
                  maxLength={4} 
                  value={pinInput} 
                  onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                  placeholder="••••"
                  className="wizard-dark-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 20,
                    textAlign: 'center',
                    letterSpacing: 8,
                    borderRadius: 8,
                    border: pinError ? '2px solid #ef4444' : '1.5px solid var(--border-strong, #2d3f5e)',
                    fontWeight: 700,
                    marginBottom: 10
                  }}
                />

                {pinError && (
                  <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
                    {pinError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinError('');
                      if (searchParams.get('admin') === '1') {
                        router.push('/repair-proposal');
                      }
                    }}
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', cursor: 'pointer' }}>
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ยืนยัน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Settings Modal */}
        {showSettingsModal && (
          <AdminSettingsModal 
            settings={adminSettings}
            currentProposal={{
              refNo: refNo.trim(),
              jobTitle: jobTitle.trim(),
              docDate,
              inspectorName,
              inspectorRole,
              status: proposalStatus,
              surveyPoints,
              itemsRequested,
              signatures: {
                surveyor: { name: inspectorName, role: inspectorRole, signed: !!sig1Image, image: sig1Image },
                approver: { name: approverName, role: approverRole, signed: proposalStatus === 'approved', image: sig2Image }
              }
            }}
            onCertifyCurrent={handleCertifyDocument}
            onClose={() => {
              setShowSettingsModal(false);
              if (searchParams.get('admin') === '1') {
                router.push('/repair-proposal');
              }
            }}
            onSave={handleSaveAdminSettings}
          />
        )}

      </main>
    </div>
  );
}

// Subcomponent: Admin Settings Modal Dialog
function AdminSettingsModal({ settings, currentProposal, onCertifyCurrent, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    const base = JSON.parse(JSON.stringify(settings || defaultAdminSettings));
    if (!Array.isArray(base.approvers) || base.approvers.length === 0) {
      base.approvers = [
        {
          id: 'tuangpetch',
          name: base.approver?.name || 'นายตวงเพชร ชัยยานนท์',
          role: base.approver?.role || 'วศ.4 หบท-ธ.',
          signatureType: base.approver?.signatureType || 'image',
          signatureUrl: base.approver?.signatureUrl || '/assets/shared/signature-approver.png',
          isDefault: true
        }
      ];
    }
    if (!base.activeApproverId) {
      base.activeApproverId = base.approvers[0].id;
    }
    return base;
  });

  const [activeTab, setActiveTab] = useState(currentProposal ? 'approval' : 'approver'); // 'approval' | 'approver' | 'header' | 'ref' | 'defaults'
  const [proposalsList, setProposalsList] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('all');
  const [selectedApproverId, setSelectedApproverId] = useState(form.activeApproverId || form.approvers?.[0]?.id || 'tuangpetch');

  // Approver editing & adding states
  const [editingApproverId, setEditingApproverId] = useState(null);
  const [isAddingNewApprover, setIsAddingNewApprover] = useState(false);
  const [approverDraftName, setApproverDraftName] = useState('');
  const [approverDraftRole, setApproverDraftRole] = useState('');
  const [approverDraftSig, setApproverDraftSig] = useState('');
  const [approverSigMode, setApproverSigMode] = useState('image'); // 'image' | 'draw'

  useEffect(() => {
    if (settings) {
      const base = JSON.parse(JSON.stringify(settings));
      if (!Array.isArray(base.approvers) || base.approvers.length === 0) {
        base.approvers = [
          {
            id: 'tuangpetch',
            name: base.approver?.name || 'นายตวงเพชร ชัยยานนท์',
            role: base.approver?.role || 'วศ.4 หบท-ธ.',
            signatureType: base.approver?.signatureType || 'image',
            signatureUrl: base.approver?.signatureUrl || '/assets/shared/signature-approver.png',
            isDefault: true
          }
        ];
      }
      if (!base.activeApproverId) {
        base.activeApproverId = base.approvers[0].id;
      }
      setForm(base);
      if (!selectedApproverId) {
        setSelectedApproverId(base.activeApproverId || base.approvers[0].id);
      }
    }
  }, [settings]);

  // Fetch proposals list for approval queue
  const fetchProposalsList = async () => {
    setLoadingProposals(true);
    try {
      const res = await fetch(`/api/repair-proposals?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json && json.proposals) {
        setProposalsList(json.proposals);
      }
    } catch (err) {
      console.error('Fetch proposals in modal error:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchProposalsList();
  }, []);

  // Certify proposal item from modal
  const handleCertifyProposalItem = async (targetRefNo, action = 'approve') => {
    const approverObj = form.approvers?.find(a => a.id === selectedApproverId) || form.approver || defaultAdminSettings.approver;
    if (currentProposal && currentProposal.refNo === targetRefNo && onCertifyCurrent) {
      const success = await onCertifyCurrent(targetRefNo, approverObj, action);
      if (success) {
        fetchProposalsList();
      }
      return;
    }

    try {
      const resGet = await fetch(`/api/repair-proposals?refNo=${encodeURIComponent(targetRefNo)}`);
      const targetDoc = await resGet.json();
      if (!targetDoc || !targetDoc.refNo) {
        alert('ไม่พบเอกสาร');
        return;
      }

      const isApprove = action === 'approve';
      const updated = {
        ...targetDoc,
        status: isApprove ? 'approved' : 'pending_approval',
        signatures: {
          ...(targetDoc.signatures || {}),
          approver: isApprove ? {
            name: approverObj.name,
            role: approverObj.role,
            signed: true,
            decision: 'approved',
            image: approverObj.signatureUrl,
            approvedAt: new Date().toISOString()
          } : {
            name: approverObj.name,
            role: approverObj.role,
            signed: false,
            decision: 'pending',
            image: null,
            unapprovedAt: new Date().toISOString()
          }
        }
      };

      const resPost = await fetch('/api/repair-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const dataPost = await resPost.json().catch(() => ({}));
      if (resPost.ok && dataPost.ok) {
        alert(isApprove
          ? `✅ ยืนยันการตรวจสอบและลงนามรับรอง ${targetRefNo} สำเร็จแล้ว!\nผู้รับรอง: ${approverObj.name} (${approverObj.role})`
          : `ℹ️ ยกเลิกการรับรอง ${targetRefNo} เรียบร้อยแล้ว (สถานะ: รอการตรวจสอบและรับรอง)`
        );
        fetchProposalsList();
      } else {
        alert('ไม่สามารถอัปเดตสถานะได้: ' + (dataPost?.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    }
  };

  // Approvers management handlers
  const handleSelectActiveApprover = (approverId) => {
    const target = form.approvers?.find(a => a.id === approverId);
    if (!target) return;
    setForm(prev => ({
      ...prev,
      activeApproverId: approverId,
      approver: { ...target }
    }));
    setSelectedApproverId(approverId);
  };

  const handleStartEditApprover = (approver) => {
    setEditingApproverId(approver.id);
    setIsAddingNewApprover(false);
    setApproverDraftName(approver.name || '');
    setApproverDraftRole(approver.role || '');
    setApproverDraftSig(approver.signatureUrl || '');
    setApproverSigMode('image');
  };

  const handleStartAddApprover = () => {
    setEditingApproverId(null);
    setIsAddingNewApprover(true);
    setApproverDraftName('');
    setApproverDraftRole('');
    setApproverDraftSig('/assets/shared/signature-approver.png');
    setApproverSigMode('image');
  };

  const handleSaveApproverDraft = () => {
    if (!approverDraftName.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุลผู้ตรวจสอบและรับรอง');
      return;
    }
    const sigUrl = approverDraftSig || '/assets/shared/signature-approver.png';

    if (isAddingNewApprover) {
      const newId = 'appr_' + Date.now();
      const newApprover = {
        id: newId,
        name: approverDraftName.trim(),
        role: approverDraftRole.trim() || 'ผู้ตรวจสอบและรับรอง',
        signatureType: 'image',
        signatureUrl: sigUrl,
        isDefault: false
      };
      const updatedList = [...(form.approvers || []), newApprover];
      setForm(prev => ({
        ...prev,
        approvers: updatedList,
        activeApproverId: prev.activeApproverId || newId,
        approver: prev.approver || newApprover
      }));
      setIsAddingNewApprover(false);
      setEditingApproverId(null);
    } else if (editingApproverId) {
      const updatedList = (form.approvers || []).map(a => {
        if (a.id === editingApproverId) {
          return {
            ...a,
            name: approverDraftName.trim(),
            role: approverDraftRole.trim(),
            signatureUrl: sigUrl
          };
        }
        return a;
      });
      const activeObj = updatedList.find(a => a.id === form.activeApproverId) || updatedList[0];
      setForm(prev => ({
        ...prev,
        approvers: updatedList,
        approver: activeObj
      }));
      setEditingApproverId(null);
    }
  };

  const handleDeleteApprover = (approverId) => {
    if ((form.approvers || []).length <= 1) {
      alert('ต้องมีผู้ตรวจสอบและรับรองอย่างน้อย 1 ท่านในระบบ');
      return;
    }
    if (!confirm('ยืนยันการลบผู้ลงนามท่านนี้ใช่หรือไม่?')) return;
    const remaining = (form.approvers || []).filter(a => a.id !== approverId);
    const newActive = remaining[0];
    setForm(prev => ({
      ...prev,
      approvers: remaining,
      activeApproverId: prev.activeApproverId === approverId ? newActive.id : prev.activeApproverId,
      approver: prev.activeApproverId === approverId ? newActive : prev.approver
    }));
    if (selectedApproverId === approverId) {
      setSelectedApproverId(newActive.id);
    }
  };

  const handleHeaderChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      header: { ...prev.header, [field]: val }
    }));
  };

  const handleApproverChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      approver: { ...prev.approver, [field]: val }
    }));
  };

  const handleRunningNumberChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      runningNumber: { ...prev.runningNumber, [field]: val }
    }));
  };

  const handleDefaultsChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      defaults: { ...prev.defaults, [field]: val }
    }));
  };

  const [modalSyncing, setModalSyncing] = useState(false);

  const handleModalPushToCloud = async () => {
    try {
      setModalSyncing(true);
      const res = await fetch('/api/repair-proposals/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '8888', settings: form })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        alert('✅ บันทึกและส่งรูปภาพหัวกระดาษขึ้น Cloud สำเร็จแล้ว!\nคอมพิวเตอร์และอุปกรณ์เครื่องอื่นจะเห็นหัวกระดาษนี้เหมือนกันทันที');
        onSave(form);
      } else {
        alert('⚠️ ส่งขึ้น Cloud ไม่สำเร็จ: ' + (data?.error || res.statusText || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      alert('⚠️ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setModalSyncing(false);
    }
  };

  const handleModalPullFromCloud = async () => {
    try {
      setModalSyncing(true);
      const res = await fetch(`/api/repair-proposals/settings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok && data.settings) {
        setForm(data.settings);
        alert('✅ ดึงการตั้งค่าล่าสุดจาก Cloud สำเร็จแล้ว!\nรูปภาพและหัวกระดาษพร้อมใช้งาน');
      } else {
        alert('⚠️ ไม่พบข้อมูลการตั้งค่าบน Cloud: ' + (data?.error || 'เซิร์ฟเวอร์ไม่ตอบสนอง'));
      }
    } catch (err) {
      alert('⚠️ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setModalSyncing(false);
    }
  };

  const handleExportHeaderCode = () => {
    try {
      const exportData = {
        type: 'repair_header_export',
        v: 1,
        exportedAt: new Date().toISOString(),
        header: form.header
      };
      const code = JSON.stringify(exportData);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          alert('📋 คัดลอกโค้ดหัวกระดาษเรียบร้อยแล้ว!\n\nท่านสามารถนำโค้ดนี้ส่งทาง LINE / Chat / Email เพื่อเปิดบนคอมอีกเครื่อง แล้วกดปุ่ม "📥 วางโค้ดหัวกระดาษ" เพื่อใช้งานได้ทันที');
        }).catch(() => {
          prompt('คัดลอกโค้ดหัวกระดาษด้านล่างนี้ (กด Ctrl+C):', code);
        });
      } else {
        prompt('คัดลอกโค้ดหัวกระดาษด้านล่างนี้ (กด Ctrl+C):', code);
      }
    } catch (e) {
      alert('ไม่สามารถส่งออกโค้ดได้: ' + e.message);
    }
  };

  const handleImportHeaderCode = () => {
    const raw = prompt('วางโค้ดหัวกระดาษที่คัดลอกมาจากคอมอีกเครื่องที่นี่ (กด Ctrl+V):');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed && (parsed.header || parsed.bannerImageUrl)) {
        const importedHeader = parsed.header || parsed;
        setForm(prev => ({
          ...prev,
          header: {
            ...prev.header,
            ...importedHeader
          }
        }));
        alert('✅ นำเข้าหัวกระดาษสำเร็จแล้ว!\nรูปภาพและการตั้งค่าถูกแสดงในกล่อง Live Preview แล้ว\nกรุณากดปุ่ม "💾 บันทึกการตั้งค่า" ด้านล่างเพื่อบันทึกใช้งานถาวร');
      } else {
        alert('⚠️ รูปแบบโค้ดไม่ถูกต้อง กรุณาตรวจสอบโค้ดที่คัดลอกมา');
      }
    } catch (err) {
      alert('⚠️ โค้ดไม่ถูกต้อง: ' + err.message);
    }
  };

  // Preview generated refNo
  const previewRef = useMemo(() => {
    const thaiYear = new Date().getFullYear() + 543;
    const christYear = new Date().getFullYear();
    const prefix = form.runningNumber?.prefix || 'REP-';
    const yearType = form.runningNumber?.yearType || 'buddhist';
    const digits = form.runningNumber?.digits || 3;
    const nextNum = form.runningNumber?.nextNumber || 1;
    let yearPart = '';
    if (yearType === 'buddhist') yearPart = `${thaiYear}-`;
    else if (yearType === 'christian') yearPart = `${christYear}-`;
    return `${prefix}${yearPart}${String(nextNum).padStart(digits, '0')}`;
  }, [form.runningNumber]);

  const modalLogoUrl = useMemo(() => {
    const type = form.header?.logoType;
    if (type === 'egat') return '/assets/shared/egat-logo.jpg';
    if (type === 'veri') return '/logo.png';
    if (type === 'custom') return form.header?.customLogoUrl || '';
    return null;
  }, [form.header?.logoType, form.header?.customLogoUrl]);

  const modalLogoHeight = useMemo(() => {
    const size = form.header?.logoSize;
    if (size === 'xlarge') return 68;
    if (size === 'normal') return 46;
    return 56; // default 'large'
  }, [form.header?.logoSize]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      background: 'var(--bg-base, #0c1220)',
      color: 'var(--ink-primary, #eef2ff)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Fullscreen Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-hairline, #1e2e4a)',
        background: 'var(--bg-surface-raised, #172340)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        flexShrink: 0,
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface, #111d32)',
              border: '1px solid var(--border-strong, #2d3f5e)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-primary, #eef2ff)',
              cursor: 'pointer'
            }}>
            <span>◀</span> กลับสู่หน้าใบเสนอซ่อม
          </button>

          <div style={{ height: 26, width: 1, background: 'var(--border-strong, #2d3f5e)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>⚙️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                  ศูนย์ตั้งค่าระบบผู้ดูแล (Admin Control Panel)
                </h1>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)'
                }}>
                  ใบเสนอแจ้งซ่อม
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', marginTop: 2 }}>
                ตรวจสอบรับรองเอกสารแจ้งซ่อม, จัดการรายชื่อผู้รับรอง & ลายเซ็นต์, กำหนดหัวกระดาษ A4, และการรันเลขที่ใบงาน
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              if (confirm('ต้องการคืนค่าเริ่มต้นระบบทั้งหมดใช่หรือไม่?')) {
                setForm(JSON.parse(JSON.stringify(defaultAdminSettings)));
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer'
            }}>
            คืนค่าเริ่มต้น
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-surface, #111d32)',
              border: '1px solid var(--border-strong, #2d3f5e)',
              color: 'var(--ink-secondary, #94a3c4)',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}>
            ✕ ปิดหน้าต่าง
          </button>

          <button
            type="button"
            onClick={() => onSave(form)}
            style={{
              background: 'var(--accent, #2563eb)',
              color: 'white',
              border: 'none',
              padding: '8px 22px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)'
            }}>
            <span>💾</span> บันทึกการตั้งค่า
          </button>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <nav style={{
        display: 'flex',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-hairline, #1e2e4a)',
        background: 'var(--bg-surface, #111d32)',
        overflowX: 'auto',
        gap: 6,
        flexShrink: 0
      }}>
        {[
          { id: 'approval', label: '🛡️ 1. รับรองเอกสารแจ้งซ่อม (Approval Queue)' },
          { id: 'approver', label: '✍️ 2. ผู้ตรวจสอบและรับรอง & ลายเซ็นต์ (Signatories)' },
          { id: 'header', label: '🏢 3. หัวกระดาษ & โลโก้ (Letterhead)' },
          { id: 'ref', label: '🔢 4. การรันเลขที่ใบงาน (Running RefNo)' },
          { id: 'defaults', label: '⚙️ 5. ค่าเริ่มต้นระบบ (Defaults)' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                border: 'none',
                borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                fontWeight: isActive ? 800 : 600,
                fontSize: 13,
                color: isActive ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Fullscreen Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px 40px 28px',
        maxWidth: 1380,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>

          {/* TAB 0: Document Approval Queue */}
          {activeTab === 'approval' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Approver Profile Selector */}
              <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✍️</span> เลือกลายเซ็นต์ผู้รับรองที่จะใช้ลงนาม:
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('approver')}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
                    ⚙️ จัดการ/เพิ่มผู้ลงนามอื่น
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {(form.approvers || []).map((appr) => {
                    const isSelected = selectedApproverId === appr.id;
                    return (
                      <div
                        key={appr.id}
                        onClick={() => setSelectedApproverId(appr.id)}
                        style={{
                          border: isSelected ? '2px solid #2563eb' : '1px solid var(--border-hairline, #1e2e4a)',
                          background: isSelected ? 'rgba(37, 99, 235, 0.16)' : 'var(--bg-input, #080e1a)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10
                        }}>
                        <input
                          type="radio"
                          name="selectedModalApprover"
                          checked={isSelected}
                          onChange={() => setSelectedApproverId(appr.id)}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appr.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-secondary, #94a3c4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appr.role}
                          </div>
                        </div>
                        {appr.signatureUrl && (
                          <div style={{ width: 50, height: 28, background: '#ffffff', borderRadius: 4, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                            <img src={appr.signatureUrl} alt={appr.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Proposal Quick Certify Card (if modal opened from open proposal) */}
              {currentProposal && currentProposal.refNo && (
                <div style={{
                  background: currentProposal.status === 'approved' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: currentProposal.status === 'approved' ? '1.5px solid #22c55e' : '1.5px solid #f59e0b',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18 }}>📄</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink-primary, #eef2ff)' }}>
                          เอกสารปัจจุบัน: {currentProposal.refNo}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: currentProposal.status === 'approved' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                          color: currentProposal.status === 'approved' ? '#4ade80' : '#fbbf24',
                          border: `1px solid ${currentProposal.status === 'approved' ? '#22c55e' : '#f59e0b'}`
                        }}>
                          {currentProposal.status === 'approved' ? '✅ รับรองเรียบร้อยแล้ว' : '⏳ รอการตรวจสอบและรับรอง'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 4 }}>
                        {currentProposal.jobTitle || 'ใบเสนอแจ้งซ่อม'} • วันที่: {currentProposal.docDate || '-'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', marginTop: 2 }}>
                        ผู้สำรวจ: {currentProposal.inspectorName || '-'} ({currentProposal.inspectorRole || '-'})
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {currentProposal.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleCertifyProposalItem(currentProposal.refNo, 'approve')}
                          style={{
                            background: '#16a34a',
                            border: 'none',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: 13,
                            padding: '9px 18px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                          <span>✓</span> ยืนยันลงนามรับรองเอกสารนี้ทันที
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCertifyProposalItem(currentProposal.refNo, 'reject')}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '7px 14px',
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}>
                          ↩️ ยกเลิกการรับรอง (เปลี่ยนเป็นรอตรวจสอบ)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* All Proposals Queue */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink-primary, #eef2ff)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📋</span> คิวเอกสารแจ้งซ่อมทั้งหมดในระบบ ({proposalsList.length} ฉบับ)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['all', 'pending_approval', 'approved'].map((fKey) => (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => setApprovalStatusFilter(fKey)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: approvalStatusFilter === fKey ? '#2563eb' : 'var(--bg-surface-raised, #172340)',
                          color: approvalStatusFilter === fKey ? '#ffffff' : 'var(--ink-secondary, #94a3c4)',
                          border: '1px solid var(--border-hairline, #1e2e4a)'
                        }}>
                        {fKey === 'all' ? 'ทั้งหมด' : (fKey === 'pending_approval' ? '⏳ รอรับรอง' : '✅ รับรองแล้ว')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={fetchProposalsList}
                      style={{ padding: '3px 8px', background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', color: '#94a3c4', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                      🔄
                    </button>
                  </div>
                </div>

                {loadingProposals ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink-secondary, #94a3c4)', fontSize: 13 }}>
                    ⏳ กำลังโหลดรายการเอกสาร...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
                    {proposalsList
                      .filter(p => approvalStatusFilter === 'all' || (approvalStatusFilter === 'approved' ? p.status === 'approved' : p.status !== 'approved'))
                      .map(p => {
                        const isApproved = p.status === 'approved';
                        return (
                          <div
                            key={p.refNo}
                            style={{
                              background: 'var(--bg-surface-raised, #172340)',
                              border: '1px solid var(--border-hairline, #1e2e4a)',
                              borderRadius: 8,
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 10
                            }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: 12 }}>{p.refNo}</span>
                                {p.fmRefNo && <span style={{ fontSize: 10.5, color: '#38bdf8' }}>(FM: {p.fmRefNo})</span>}
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  background: isApproved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                  color: isApproved ? '#4ade80' : '#fbbf24'
                                }}>
                                  {isApproved ? 'รับรองแล้ว' : 'รอรับรอง'}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.jobTitle || '-'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--ink-secondary, #94a3c4)', marginTop: 2 }}>
                                ผู้สำรวจ: {p.inspector?.name || '-'} • วันที่: {p.docDate || p.docDateISO || '-'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {!isApproved ? (
                                <button
                                  type="button"
                                  onClick={() => handleCertifyProposalItem(p.refNo, 'approve')}
                                  style={{
                                    background: '#16a34a',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 11.5,
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}>
                                  <span>✓</span> ลงนามรับรอง
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCertifyProposalItem(p.refNo, 'reject')}
                                  style={{
                                    background: 'none',
                                    border: '1px solid #475569',
                                    color: '#94a3b8',
                                    fontSize: 11,
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                  }}>
                                  ยกเลิกรับรอง
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Header & Letterhead */}
          {activeTab === 'header' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={form.header?.showLetterhead} 
                    onChange={e => handleHeaderChange('showLetterhead', e.target.checked)} 
                  />
                  เปิดแสดงหัวกระดาษทางการ (Official Letterhead Banner)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    handleHeaderChange('bannerLayout', 'bleed');
                    handleHeaderChange('bannerTheme', 'white');
                    handleHeaderChange('logoSize', 'large');
                    handleHeaderChange('logoType', 'egat');
                  }}
                  style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#60a5fa', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 700 }}>
                  🔄 ใช้ค่ามาตรฐาน (เต็ม A4 / โลโก้ใหญ่)
                </button>
              </div>

              {form.header?.showLetterhead && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* Live Preview Box */}
                  <div style={{ border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 8, padding: 12, background: 'var(--bg-input, #080e1a)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>👁️</span> ตัวอย่างการแสดงผลบนกระดาษ A4 (Live Preview)
                      </div>
                      <span style={{ fontSize: 10.5, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        {form.header?.bannerImageUrl ? 'โหมดรูปภาพสำเร็จรูป' : `โหมดข้อความ + โลโก้ (${form.header?.logoSize || 'large'})`}
                      </span>
                    </div>

                    {/* Preview canvas */}
                    <div style={{ background: '#ffffff', borderRadius: 6, overflow: 'hidden', padding: form.header?.bannerLayout === 'contained' ? '8px 12px' : '0', border: '1px solid #cbd5e1' }}>
                      {form.header?.bannerImageUrl ? (
                        <img 
                          src={form.header.bannerImageUrl} 
                          alt="Banner Live Preview" 
                          style={{ width: '100%', height: 'auto', display: 'block' }} 
                        />
                      ) : (
                        <div style={{
                          background: form.header?.bannerTheme === 'navy' 
                            ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)' 
                            : '#ffffff',
                          padding: '12px 18px 10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          borderBottom: form.header?.bannerTheme === 'navy' ? '3px solid #d97706' : '3px solid #0f2e5a',
                          boxShadow: form.header?.bannerTheme === 'navy' ? 'none' : '0 2px 0 #d97706'
                        }}>
                          {modalLogoUrl && (
                            <div style={{ flexShrink: 0 }}>
                              <img 
                                src={modalLogoUrl} 
                                alt="Logo Preview" 
                                style={{ 
                                  height: modalLogoHeight, 
                                  maxWidth: 120, 
                                  objectFit: 'contain', 
                                  display: 'block',
                                  background: form.header?.bannerTheme === 'navy' ? '#ffffff' : 'transparent',
                                  padding: form.header?.bannerTheme === 'navy' ? 3 : 0,
                                  borderRadius: form.header?.bannerTheme === 'navy' ? 4 : 0
                                }} 
                              />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: form.header?.logoSize === 'xlarge' ? 14 : 13, 
                              fontWeight: 900, 
                              color: form.header?.bannerTheme === 'navy' ? '#ffffff' : '#0f2e5a', 
                              lineHeight: 1.25 
                            }}>
                              {form.header?.companyTitle || 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)'}
                            </div>
                            <div style={{ 
                              fontSize: 11, 
                              fontWeight: 700, 
                              color: form.header?.bannerTheme === 'navy' ? '#e2e8f0' : '#1e293b', 
                              marginTop: 2 
                            }}>
                              {form.header?.companySubtitle || 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)'}
                            </div>
                            {form.header?.companyAddress && (
                              <div style={{ 
                                fontSize: 9.5, 
                                color: form.header?.bannerTheme === 'navy' ? '#94a3b8' : '#64748b', 
                                fontWeight: 600, 
                                marginTop: 2 
                              }}>
                                {form.header?.companyAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Layout Selector for Banner Width */}
                  <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '12px 14px' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                      📐 รูปแบบความกว้างการแสดงผลบนกระดาษ A4 (Layout Width):
                    </label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: form.header?.bannerLayout !== 'contained' ? 700 : 500, color: 'var(--ink-primary, #eef2ff)' }}>
                        <input 
                          type="radio" 
                          name="bannerLayout" 
                          checked={form.header?.bannerLayout !== 'contained'} 
                          onChange={() => handleHeaderChange('bannerLayout', 'bleed')} 
                        />
                        เต็มแผ่นกระดาษ A4 (ชิดขอบกระดาษทุกด้าน Bleed Edge-to-Edge) ⭐ แนะนำ
                      </label>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: form.header?.bannerLayout === 'contained' ? 700 : 500, color: 'var(--ink-secondary, #94a3c4)' }}>
                        <input 
                          type="radio" 
                          name="bannerLayout" 
                          checked={form.header?.bannerLayout === 'contained'} 
                          onChange={() => handleHeaderChange('bannerLayout', 'contained')} 
                        />
                        เต็มขอบเนื้อหาเอกสาร (Contained เสมอเท่าขอบตารางและกรอบฟอร์ม)
                      </label>
                    </div>
                  </div>

                  {/* Cross-Device Sync & Transfer Box */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(17, 29, 50, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📡</span> ซิงค์และถ่ายโอนรูปหัวกระดาษข้ามเครื่อง (Cross-Device Sync & Transfer)
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        แก้ปัญหาเปิดคนละเครื่องแล้วรูปไม่ขึ้น
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      ใช้เมื่อต้องการให้คอมพิวเตอร์เครื่องอื่นเห็นรูปหัวกระดาษบริษัทเหมือนกัน โดยไม่ต้องอัปโหลดซ้ำทีละเครื่อง:
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleModalPushToCloud}
                        disabled={modalSyncing}
                        style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span>📤</span> {modalSyncing ? 'กำลังบันทึก...' : 'ส่งหัวกระดาษเครื่องนี้ขึ้น Cloud'}
                      </button>
                      <button
                        type="button"
                        onClick={handleModalPullFromCloud}
                        disabled={modalSyncing}
                        style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#7dd3fc', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span>📥</span> {modalSyncing ? 'กำลังดึง...' : 'ดึงหัวกระดาษจาก Cloud'}
                      </button>
                      <button
                        type="button"
                        onClick={handleExportHeaderCode}
                        style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span>📋</span> คัดลอกโค้ดหัวกระดาษ (Export)
                      </button>
                      <button
                        type="button"
                        onClick={handleImportHeaderCode}
                        style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#c084fc', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span>📥</span> วางโค้ดหัวกระดาษ (Import)
                      </button>
                    </div>
                  </div>

                  {/* Section A: Full-width A4 Banner Image */}
                  <div style={{ border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 8, padding: 14, background: 'var(--bg-surface-raised, #172340)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🖼️</span> อัปโหลดรูปภาพหัวกระดาษสำเร็จรูปเต็มแผ่น A4 (Full Banner Image)
                      </div>
                      {form.header?.bannerImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleHeaderChange('bannerImageUrl', '')}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                          ✕ นำรูปออก (กลับไปใช้โลโก้+ข้อความ)
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      เมื่ออัปโหลดรูปภาพหัวกระดาษสำเร็จรูป ระบบจะแสดงภาพเต็มความกว้าง A4 ในเอกสารทันที และ <strong style={{ color: 'var(--ink-primary, #eef2ff)' }}>ไม่แสดงข้อความชื่อองค์กร/ที่อยู่ซ้ำซ้อน</strong> (เหมาะสำหรับหน่วยงานที่มีภาพหัวกระดาษสำเร็จรูป)
                    </p>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label style={{ background: 'var(--accent, #2563eb)', color: 'white', padding: '7px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        📁 {form.header?.bannerImageUrl ? 'เปลี่ยนรูปหัวกระดาษใหม่' : 'อัปโหลดรูปหัวกระดาษแบบเต็ม A4'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const f = e.target.files[0];
                            if (!f) return;
                            try {
                              const compressed = await compressImageFile(f, 1400, 420, 0.82, true);
                              handleHeaderChange('bannerImageUrl', compressed);
                            } catch (err) {
                              alert('ไม่สามารถโหลดรูปภาพได้: ' + err.message);
                            }
                          }} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                      {form.header?.bannerImageUrl && (
                        <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 600 }}>
                          ✓ มีรูปภาพหัวกระดาษสำเร็จรูปพร้อมใช้งาน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section B: Text & Logo Header */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, background: form.header?.bannerImageUrl ? 'rgba(15, 23, 42, 0.4)' : 'var(--bg-surface-raised, #172340)', opacity: form.header?.bannerImageUrl ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)' }}>
                        🏢 ตั้งค่าหัวกระดาษทางการและโลโก้ (เมื่อไม่ใช้ภาพหัวกระดาษสำเร็จรูป)
                      </div>
                      {form.header?.bannerImageUrl && (
                        <span style={{ fontSize: 11, background: 'var(--bg-input, #080e1a)', color: 'var(--ink-secondary, #94a3c4)', border: '1px solid var(--border-strong, #2d3f5e)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                          ซ่อนในเอกสารอัตโนมัติ (เนื่องจากใช้รูปภาพหัวกระดาษแล้ว)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 3 }}>
                          ชื่อองค์กร / บริษัทหลัก:
                        </label>
                        <input 
                          type="text" 
                          value={form.header?.companyTitle} 
                          onChange={e => handleHeaderChange('companyTitle', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13 }} 
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 3 }}>
                          หน่วยงานย่อย / ฝ่าย / แผนก:
                        </label>
                        <input 
                          type="text" 
                          value={form.header?.companySubtitle} 
                          onChange={e => handleHeaderChange('companySubtitle', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13 }} 
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 3 }}>
                          ข้อมูลติดต่อ / ที่อยู่:
                        </label>
                        <input 
                          type="text" 
                          value={form.header?.companyAddress} 
                          onChange={e => handleHeaderChange('companyAddress', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13 }} 
                        />
                      </div>

                      {/* Logo Size Selector */}
                      <div style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, padding: '10px 12px' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                          🔍 ขนาดความใหญ่ของโลโก้ (Logo Size):
                        </label>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'var(--ink-secondary, #94a3c4)' }}>
                            <input 
                              type="radio" 
                              name="logoSize" 
                              checked={form.header?.logoSize === 'normal'} 
                              onChange={() => handleHeaderChange('logoSize', 'normal')} 
                            />
                            ปกติ (60px)
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 700, color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="logoSize" 
                              checked={!form.header?.logoSize || form.header?.logoSize === 'large'} 
                              onChange={() => handleHeaderChange('logoSize', 'large')} 
                            />
                            ใหญ่เต็มตา (80px) ⭐ แนะนำ
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 700, color: '#38bdf8' }}>
                            <input 
                              type="radio" 
                              name="logoSize" 
                              checked={form.header?.logoSize === 'xlarge'} 
                              onChange={() => handleHeaderChange('logoSize', 'xlarge')} 
                            />
                            ใหญ่พิเศษ (96px)
                          </label>
                        </div>
                      </div>

                      {/* Header Theme Selector */}
                      <div style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, padding: '10px 12px' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                          🎨 ธีมสีหัวกระดาษ (Header Theme):
                        </label>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: (!form.header?.bannerTheme || form.header?.bannerTheme === 'white') ? 700 : 500, color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="bannerTheme" 
                              checked={!form.header?.bannerTheme || form.header?.bannerTheme === 'white'} 
                              onChange={() => handleHeaderChange('bannerTheme', 'white')} 
                            />
                            สีขาวทางการ (White & Navy/Gold Line) ⭐ แนะนำ
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: form.header?.bannerTheme === 'navy' ? 700 : 500, color: '#60a5fa' }}>
                            <input 
                              type="radio" 
                              name="bannerTheme" 
                              checked={form.header?.bannerTheme === 'navy'} 
                              onChange={() => handleHeaderChange('bannerTheme', 'navy')} 
                            />
                            สีกรมท่าพรีเมียม (Navy Gradient)
                          </label>
                        </div>
                      </div>

                      {/* Logo Source Selector */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                          เลือกรูปภาพโลโก้:
                        </label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="logoType" 
                              checked={!form.header?.logoType || form.header?.logoType === 'egat'} 
                              onChange={() => handleHeaderChange('logoType', 'egat')} 
                            />
                            โลโก้ กฟผ. (EGAT)
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="logoType" 
                              checked={form.header?.logoType === 'veri'} 
                              onChange={() => handleHeaderChange('logoType', 'veri')} 
                            />
                            โลโก้ Veri
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="logoType" 
                              checked={form.header?.logoType === 'custom'} 
                              onChange={() => handleHeaderChange('logoType', 'custom')} 
                            />
                            อัปโหลดโลโก้เอง (Custom Logo)
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ink-secondary, #94a3c4)' }}>
                            <input 
                              type="radio" 
                              name="logoType" 
                              checked={form.header?.logoType === 'none'} 
                              onChange={() => handleHeaderChange('logoType', 'none')} 
                            />
                            ไม่แสดงโลโก้
                          </label>
                        </div>

                        {form.header?.logoType === 'custom' && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-primary, #eef2ff)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              📁 เลือกไฟล์โลโก้
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const f = e.target.files[0];
                                  if (!f) return;
                                  try {
                                    const compressed = await compressImageFile(f, 600, 400, 0.85, true);
                                    handleHeaderChange('customLogoUrl', compressed);
                                  } catch (err) {
                                    alert('ไม่สามารถโหลดรูปโลโก้ได้: ' + err.message);
                                  }
                                }} 
                                style={{ display: 'none' }} 
                              />
                            </label>
                            {form.header?.customLogoUrl && (
                              <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 600 }}>✓ โหลดโลโก้เรียบร้อย</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 2: Approver & Signatories Management */}
          {activeTab === 'approver' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)' }}>
                    รายชื่อผู้ตรวจสอบและรับรองที่ลงทะเบียนไว้ในระบบ
                  </h4>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)' }}>
                    สามารถสลับผู้รับรองหลัก, แก้ไขชื่อ/ตำแหน่ง/รูปลายเซ็นต์ หรือเพิ่มผู้ลงนามท่านใหม่
                  </div>
                </div>
                {!isAddingNewApprover && !editingApproverId && (
                  <button
                    type="button"
                    onClick={handleStartAddApprover}
                    style={{
                      background: 'var(--accent, #2563eb)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                    <span>➕</span> เพิ่มผู้ลงนามท่านใหม่
                  </button>
                )}
              </div>

              {/* Add or Edit Form Drawer */}
              {(isAddingNewApprover || editingApproverId) && (
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1.5px solid #3b82f6', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#93c5fd' }}>
                      {isAddingNewApprover ? '➕ เพิ่มข้อมูลผู้ตรวจสอบและรับรองท่านใหม่' : '✏️ แก้ไขข้อมูลและลายเซ็นต์ผู้รับรอง'}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsAddingNewApprover(false); setEditingApproverId(null); }}
                      style={{ background: 'none', border: 'none', color: '#94a3c4', cursor: 'pointer', fontSize: 16 }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                        ชื่อ-นามสกุล: *
                      </label>
                      <input
                        type="text"
                        value={approverDraftName}
                        placeholder="เช่น นายตวงเพชร ชัยยานนท์ หรือ ชื่อ-สกุลผู้รับรอง"
                        onChange={e => setApproverDraftName(e.target.value)}
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                        ตำแหน่ง: *
                      </label>
                      <input
                        type="text"
                        value={approverDraftRole}
                        placeholder="เช่น วศ.4 หบท-ธ. หรือ หัวหน้าแผนก"
                        onChange={e => setApproverDraftRole(e.target.value)}
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                        ลายเซ็นต์ผู้รับรอง:
                      </label>

                      {approverSigMode === 'draw' ? (
                        <div style={{ background: 'var(--bg-input, #080e1a)', padding: 12, borderRadius: 8, border: '1px solid var(--border-strong, #2d3f5e)', textAlign: 'center' }}>
                          <SignaturePad
                            value={approverDraftSig}
                            onChange={setApproverDraftSig}
                            placeholder="วาดลายเซ็นต์สดบนหน้าจอ"
                          />
                          <button
                            type="button"
                            onClick={() => setApproverSigMode('image')}
                            style={{ marginTop: 6, background: 'none', border: 'none', color: '#60a5fa', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                            สลับไปใช้รูปภาพ / อัปโหลด
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, textAlign: 'center', minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            {approverDraftSig ? (
                              <img src={approverDraftSig} alt="Draft Signature" style={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain' }} />
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>ยังไม่มีรูปลายเซ็นต์</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <label style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-primary, #eef2ff)', padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                              📁 อัปโหลดรูปภาพ
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const f = e.target.files[0];
                                  if (!f) return;
                                  try {
                                    const compressed = await compressImageFile(f, 600, 200, 0.9);
                                    setApproverDraftSig(compressed);
                                  } catch (err) {
                                    alert('ไม่สามารถโหลดรูปภาพได้: ' + err.message);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setApproverSigMode('draw')}
                              style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: '#60a5fa', padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                              ✍️ วาดเซ็นต์สด
                            </button>
                            <button
                              type="button"
                              onClick={() => setApproverDraftSig('/assets/shared/signature-approver.png')}
                              style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                              🔄 ใช้ลายเซ็นต์ตวงเพชร
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10, borderTop: '1px solid var(--border-hairline, #1e2e4a)', paddingTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => { setIsAddingNewApprover(false); setEditingApproverId(null); }}
                        style={{ padding: '6px 14px', background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-secondary, #94a3c4)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveApproverDraft}
                        style={{ padding: '6px 18px', background: '#16a34a', border: 'none', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        💾 บันทึกผู้ลงนาม
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Approvers Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(form.approvers || []).map((appr) => {
                  const isActive = (form.activeApproverId || form.approvers[0].id) === appr.id;
                  return (
                    <div
                      key={appr.id}
                      style={{
                        background: 'var(--bg-surface-raised, #172340)',
                        border: isActive ? '2px solid #2563eb' : '1px solid var(--border-hairline, #1e2e4a)',
                        borderRadius: 10,
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 14
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 85, height: 46, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {appr.signatureUrl ? (
                            <img src={appr.signatureUrl} alt={appr.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>ไม่มีลายเซ็นต์</span>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink-primary, #eef2ff)' }}>
                              {appr.name}
                            </span>
                            {isActive && (
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 7px', borderRadius: 10 }}>
                                ⭐ ผู้รับรองหลัก (Active)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', marginTop: 2 }}>
                            ตำแหน่ง: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{appr.role}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleSelectActiveApprover(appr.id)}
                            style={{
                              background: 'rgba(37, 99, 235, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              color: '#60a5fa',
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}>
                            🎯 ตั้งเป็นผู้รับรองหลัก
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEditApprover(appr)}
                          style={{
                            background: 'var(--bg-surface, #111d32)',
                            border: '1px solid var(--border-strong, #2d3f5e)',
                            color: 'var(--ink-primary, #eef2ff)',
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}>
                          ✏️ แก้ไข
                        </button>
                        {(form.approvers || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteApprover(appr.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '5px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              cursor: 'pointer'
                            }}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Running Number Rules */}
          {activeTab === 'ref' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  คำนำหน้า (Prefix):
                </label>
                <input 
                  type="text" 
                  value={form.runningNumber?.prefix} 
                  placeholder="เช่น REP-" 
                  onChange={e => handleRunningNumberChange('prefix', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  รูปแบบปี:
                </label>
                <select 
                  value={form.runningNumber?.yearType} 
                  onChange={e => handleRunningNumberChange('yearType', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}>
                  <option value="buddhist">ปี พ.ศ. 4 หลัก (เช่น 2569)</option>
                  <option value="christian">ปี ค.ศ. 4 หลัก (เช่น 2026)</option>
                  <option value="none">ไม่ใส่ปี</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                    ลำดับถัดไป (Next Number):
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={form.runningNumber?.nextNumber} 
                    onChange={e => handleRunningNumberChange('nextNumber', parseInt(e.target.value, 10) || 1)} 
                    className="wizard-dark-input"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                    จำนวนหลักตัวเลข (Padding Digits):
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="6" 
                    value={form.runningNumber?.digits} 
                    onChange={e => handleRunningNumberChange('digits', parseInt(e.target.value, 10) || 3)} 
                    className="wizard-dark-input"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: '12px 16px', marginTop: 6 }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)' }}>ตัวอย่างเลขที่จะถูกรันในฟอร์มถัดไป:</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171', marginTop: 2 }}>{previewRef}</div>
              </div>
            </div>
          )}

          {/* TAB 4: Other Defaults */}
          {activeTab === 'defaults' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  หน่วยงานที่รับผิดชอบเริ่มต้น:
                </label>
                <input 
                  type="text" 
                  value={form.defaults?.department} 
                  onChange={e => handleDefaultsChange('department', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  ตำแหน่งผู้สำรวจและวิเคราะห์เริ่มต้น:
                </label>
                <input 
                  type="text" 
                  value={form.defaults?.inspectorRole} 
                  onChange={e => handleDefaultsChange('inspectorRole', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>
            </div>
          )}

        </div>

      {/* Fullscreen Sticky Bottom Footer */}
      <footer style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderTop: '1px solid var(--border-hairline, #1e2e4a)',
        background: 'var(--bg-surface-raised, #172340)',
        flexShrink: 0,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              if (confirm('ต้องการคืนค่าเริ่มต้นระบบทั้งหมดใช่หรือไม่?')) {
                setForm(JSON.parse(JSON.stringify(defaultAdminSettings)));
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}>
            คืนค่าเริ่มต้นระบบ
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)' }}>
            💡 ข้อมูลการตั้งค่าและรูปภาพจะถูกบันทึกขึ้น Cloud และเบราว์เซอร์อัตโนมัติ
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-surface, #111d32)',
              border: '1px solid var(--border-strong, #2d3f5e)',
              color: 'var(--ink-secondary, #94a3c4)',
              padding: '8px 18px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}>
            ยกเลิก / ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            style={{
              background: 'var(--accent, #2563eb)',
              color: 'white',
              border: 'none',
              padding: '8px 24px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
            }}>
            <span>💾</span> บันทึกการตั้งค่าทั้งหมด
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function RepairProposalFormPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดหน้าฟอร์ม...</div>}>
      <RepairProposalFormInner />
    </Suspense>
  );
}
