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
    companyTitle: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)',
    companySubtitle: 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)',
    companyAddress: 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.',
    logoType: 'egat', // 'egat' | 'veri' | 'none'
    customLogoUrl: '',
    showLetterhead: true
  },
  approver: {
    name: 'นายตวงเพชร ชัยยานนท์',
    role: 'วศ.4 หบท-ธ.',
    signatureType: 'image',
    signatureUrl: '/assets/shared/signature-approver.png'
  },
  runningNumber: {
    prefix: 'REP-',
    yearType: 'buddhist', // 'buddhist' | 'christian' | 'none'
    nextNumber: 1,
    digits: 3
  },
  defaults: {
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    inspectorRole: 'วิศวกรระบบไฟฟ้าและบำรุงรักษา',
    priority: 'high'
  },
  isCustomized: false
};

// Preset sample data (TP019-69 Digital Meter)
const sampleSurveyData = [
  { id: 1, building: "ท.0006", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: null },
  { id: 2, building: "ท.0009", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: null },
  { id: 3, building: "ท.0011", location: "Main MDB", symptom: "Digital Meter ชำรุด / ระบบ Error ข้อมูลไม่ตรง", qty: 1, action: "เปลี่ยนทดแทน", photo: "/images/repair/survey_T0011.jpeg" },
  { id: 4, building: "ท.0012", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: "/images/repair/survey_T0012.jpeg" },
  { id: 5, building: "ท.0017", location: "Main MDB", symptom: "Digital Meter ชำรุด / ระบบสื่อสารขัดข้อง (ไม่ขึ้นระบบ)", qty: 1, action: "เปลี่ยนทดแทน", photo: "/images/repair/survey_T0017.jpeg" },
  { id: 6, building: "ต.0017", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: "/images/repair/survey_TO0017.jpeg" },
  { id: 7, building: "ต.0019", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: "/images/repair/survey_TO0019.jpeg" },
  { id: 8, building: "ท.0020", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: null },
  { id: 9, building: "ต.0026", location: "Main MDB", symptom: "Digital Meter ชำรุด / หน้าจอดับ ไม่แสดงผล", qty: 1, action: "เปลี่ยนทดแทน", photo: null }
];

const sampleItemsRequested = [
  {
    id: 1,
    name: "Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)",
    modelPart: "Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า",
    qty: 9,
    unit: "ตัว",
    purpose: "ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคารทั้ง 9 จุด (ท.0006, ท.0009, ท.0011, ท.0012, ท.0017, ต.0017, ต.0019, ท.0020, ต.0026)"
  }
];

const sampleMeterSpecs = 
`• ขนาดมิติและการติดตั้ง: ชนิดติดตั้งหน้าตู้สวิตช์บอร์ด (Panel Mount) ขนาดหน้าปัด 96 x 96 มม. เจาะช่องตู้ 92 x 92 มม. หน้าจอ LCD พร้อมไฟ Backlit และปุ่มกดหน้าเครื่อง ≥ 4 ปุ่ม สามารถติดตั้งแทนช่องเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้
• ระบบไฟฟ้าและพิกัดการวัด: รองรับระบบ 3 เฟส 4 สาย (3P4W) และ 3 เฟส 3 สาย (3P3W) ความถี่ 50/60 Hz ย่านวัดแรงดัน Phase-Phase 35–480 VAC, Phase-Neutral 20–277 VAC, Input CT 1A หรือ 5A แหล่งจ่ายไฟ Auxiliary Universal 44–277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่าทางไฟฟ้าครบถ้วน V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิกรวม (THD ทั้งแรงดันและกระแส) รายเฟสได้ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงานไฟฟ้าจริง (Active Energy - kWh) มาตรฐาน Class 0.5S ตาม IEC 62053-22 มีพอร์ตสื่อสาร RS-485 รองรับโปรโตคอล Modbus RTU สำหรับส่งข้อมูลเข้าสู่ระบบ SCADA / Energy Management เดิม
• มาตรฐานความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำและฝุ่นไม่น้อยกว่า IP54 ผ่านการรับรองมาตรฐานสากล IEC 61010-1 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน`;

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

  const [activeView, setActiveView] = useState('wizard'); // 'wizard' | 'document'
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Admin Settings State
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Form Fields (Blank by default!)
  const [jobTitle, setJobTitle] = useState('');
  const [refNo, setRefNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [priority, setPriority] = useState('high'); // 'high' | 'normal'
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorRole, setInspectorRole] = useState('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
  const [department, setDepartment] = useState('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า');

  // Step 2: Survey Defect Points (Blank by default!)
  const [surveyPoints, setSurveyPoints] = useState([
    { id: 1, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photo: null }
  ]);

  // Step 3: Requested Items (Blank by default!)
  const [itemsRequested, setItemsRequested] = useState([
    { id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '' }
  ]);

  // Step 4: Technical Specs / Substitution Conditions (Blank by default!)
  const [substitutionSpecs, setSubstitutionSpecs] = useState('');

  // Step 5: Justification & 2 Signatories (Approver default: นายตวงเพชร ชัยยานนท์)
  const [justification, setJustification] = useState('');
  const [approverName, setApproverName] = useState('นายตวงเพชร ชัยยานนท์');
  const [approverRole, setApproverRole] = useState('วศ.4 หบท-ธ.');
  const [approvalDecision, setApprovalDecision] = useState('approved'); // 'approved' | 'rejected'

  // Signatures
  const [sig1Image, setSig1Image] = useState(null); // Inspector
  const [sig2Image, setSig2Image] = useState('/assets/shared/signature-approver.png'); // Approver Tuangpetch
  const [approverSigMode, setApproverSigMode] = useState('image'); // 'image' | 'draw'

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
          loaded = { 
            ...defaultAdminSettings, 
            ...parsed,
            header: { ...defaultAdminSettings.header, ...(parsed.header || {}) },
            approver: { ...defaultAdminSettings.approver, ...(parsed.approver || {}) },
            runningNumber: { ...defaultAdminSettings.runningNumber, ...(parsed.runningNumber || {}) },
            defaults: { ...defaultAdminSettings.defaults, ...(parsed.defaults || {}) },
            isCustomized: Boolean(parsed.isCustomized || hasLocalCustom)
          };
        }
      } catch (e) {}

      // 2. Try Server API
      try {
        const res = await fetch('/api/repair-proposals/settings', { cache: 'no-store' });
        const data = await res.json();
        if (data && data.ok && data.settings) {
          const s = data.settings;
          const isServerCustomized = s.isCustomized === true || Boolean(s.header?.bannerImageUrl || (s.approver?.name && s.approver.name !== defaultAdminSettings.approver.name));

          if (isServerCustomized || !hasLocalCustom) {
            loaded = { 
              ...loaded, 
              ...s,
              header: { 
                ...loaded.header, 
                ...(s.header || {}),
                bannerImageUrl: s.header?.bannerImageUrl !== undefined
                  ? (isServerCustomized ? s.header.bannerImageUrl : (loaded.header?.bannerImageUrl || ''))
                  : (loaded.header?.bannerImageUrl || '')
              },
              approver: { ...loaded.approver, ...(s.approver || {}) },
              runningNumber: { ...loaded.runningNumber, ...(s.runningNumber || {}) },
              defaults: { ...loaded.defaults, ...(s.defaults || {}) },
              isCustomized: isServerCustomized || hasLocalCustom
            };
          }
        }
      } catch (e) {}

      setAdminSettings(loaded);

      // Re-save to local storage if customized
      try {
        if (loaded.isCustomized) {
          localStorage.setItem('repair_proposal_admin_settings', JSON.stringify(loaded));
        }
      } catch (e) {}

      // If not editing, apply defaults & auto running refNo
      if (!editRefNo) {
        setDocDate(getTodayThaiDate());
        setApproverName(loaded.approver?.name || 'นายตวงเพชร ชัยยานนท์');
        setApproverRole(loaded.approver?.role || 'วศ.4 หบท-ธ.');
        setSig2Image(loaded.approver?.signatureUrl || '/assets/shared/signature-approver.png');
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
      fetch(`/api/repair-proposals?refNo=${encodeURIComponent(editRefNo)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.refNo) {
            setRefNo(data.refNo);
            setJobTitle(data.jobTitle || '');
            setDocDate(data.docDate || data.docDateISO || getTodayThaiDate());
            setPriority(data.priority || 'high');
            if (data.inspector) {
              setInspectorName(data.inspector.name || '');
              setInspectorRole(data.inspector.role || '');
              setDepartment(data.inspector.department || '');
            }
            if (data.surveyPoints && data.surveyPoints.length > 0) {
              setSurveyPoints(data.surveyPoints);
            }
            if (data.itemsRequested && data.itemsRequested.length > 0) {
              setItemsRequested(data.itemsRequested);
            }
            if (data.substitutionSpecs) setSubstitutionSpecs(data.substitutionSpecs);
            if (data.justification) setJustification(data.justification);
            if (data.signatures?.approver?.name) setApproverName(data.signatures.approver.name);
            if (data.signatures?.approver?.role) setApproverRole(data.signatures.approver.role);
            if (data.signatures?.approver?.image) setSig2Image(data.signatures.approver.image);
            if (data.signatures?.surveyor?.image) setSig1Image(data.signatures.surveyor.image);
          }
        })
        .catch(err => console.error('Failed to load proposal:', err));
    }
  }, [editRefNo]);

  // Reset to Complete Blank Form
  const resetToBlankForm = async () => {
    if (!confirm('ต้องการล้างค่าและเริ่มสร้างฟอร์มเปล่าใหม่ใช่หรือไม่?')) return;
    setJobTitle('');
    setDocDate(getTodayThaiDate());
    setPriority(adminSettings.defaults?.priority || 'high');
    setInspectorName('');
    setInspectorRole(adminSettings.defaults?.inspectorRole || 'วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment(adminSettings.defaults?.department || 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร');
    setSurveyPoints([
      { id: 1, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photo: null }
    ]);
    setItemsRequested([
      { id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '' }
    ]);
    setSubstitutionSpecs('');
    setJustification('');
    setApproverName(adminSettings.approver?.name || 'นายตวงเพชร ชัยยานนท์');
    setApproverRole(adminSettings.approver?.role || 'วศ.4 หบท-ธ.');
    setSig1Image(null);
    setSig2Image(adminSettings.approver?.signatureUrl || '/assets/shared/signature-approver.png');
    setApprovalDecision('approved');
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
    setDocDate('10 พฤศจิกายน 2569');
    setPriority('high');
    setInspectorName('นายวิศวกร ช่างสำรวจ (วิศวกรไฟฟ้า)');
    setInspectorRole('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า (หบท-ธ.)');
    setSurveyPoints(sampleSurveyData);
    setItemsRequested(sampleItemsRequested);
    setSubstitutionSpecs(sampleMeterSpecs);
    setJustification(
      'เนื่องจากตู้ควบคุมไฟฟ้าหลัก (Main MDB) ประจำอาคารดังกล่าว มี Digital Meter ชำรุดเสียหาย หน้าจอดับ ข้อมูลคลาดเคลื่อน และระบบสื่อสารขัดข้อง ส่งผลกระทบโดยตรงทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้า ตรวจวัดคุณภาพไฟฟ้า และเชื่อมโยงข้อมูลเข้าสู่ระบบบริหารจัดการพลังงาน (Energy Management System / SCADA) ได้อย่างถูกต้องแม่นยำ จึงมีความจำเป็นอย่างยิ่งที่จะต้องจัดซื้ออุปกรณ์ Digital Power Meter เพื่อเปลี่ยนทดแทนอุปกรณ์เดิมที่ชำรุดทั้ง 9 จุด ให้ระบบตรวจวัดและบริหารจัดการพลังงานสามารถกลับมาทำงานได้อย่างต่อเนื่อง มีประสิทธิภาพ และปลอดภัยตามมาตรฐานวิศวกรรม'
    );
    setApproverName('นายตวงเพชร ชัยยานนท์');
    setApproverRole('วศ.4 หบท-ธ.');
    setSig2Image('/assets/shared/signature-approver.png');
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
      { id: nextId, building: '', location: '', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photo: null }
    ]);
  };

  const removePoint = (index) => {
    if (surveyPoints.length <= 1) return;
    setSurveyPoints(surveyPoints.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      handlePointChange(index, 'photo', uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Requested Items Handlers
  const handleItemChange = (index, field, val) => {
    const next = [...itemsRequested];
    next[index] = { ...next[index], [field]: val };
    setItemsRequested(next);
  };

  const addItemRequested = () => {
    const nextId = itemsRequested.length + 1;
    setItemsRequested([
      ...itemsRequested,
      { id: nextId, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '' }
    ]);
  };

  const removeItemRequested = (index) => {
    if (itemsRequested.length <= 1) return;
    setItemsRequested(itemsRequested.filter((_, i) => i !== index));
  };

  // Equipment Presets
  const applyEquipPreset = (type) => {
    const next = [...itemsRequested];
    if (next.length === 0) {
      next.push({ id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '' });
    }
    const target = next[0];

    if (type === 'meter') {
      target.name = "Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)";
      target.modelPart = "Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า";
      target.unit = "ตัว";
      target.purpose = "ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคาร";
      setSubstitutionSpecs(sampleMeterSpecs);
    } else if (type === 'breaker') {
      target.name = "Moulded Case Circuit Breaker (MCCB) พิกัด 400A 3P 36kA";
      target.modelPart = "Schneider Electric Compact NSX400F (Part No. LV432676) หรือเทียบเท่า";
      target.unit = "ตัว";
      target.purpose = "เปลี่ยนทดแทนเซอร์กิตเบรกเกอร์เมนเดิมที่ชำรุด ไม่ตัดวงจร หรือเสื่อมสภาพในตู้สวิตช์บอร์ด";
      setSubstitutionSpecs(
        "• พิกัดกระแสใช้งาน In ไม่น้อยกว่า 400A ชนิด 3 โพล (3P) ทนแรงดันไม่น้อยกว่า 400/415 VAC\n" +
        "• พิกัดตัดกระแสลัดวงจร Icu/Ics ไม่ต่ำกว่า 36 kA ที่ 400/415 VAC ตามมาตรฐาน IEC 60947-2\n" +
        "• ชุดทริปแบบอิเล็กทรอนิกส์ (Electronic Trip Unit) สามารถปรับตั้งค่า Overload (L) และ Short Circuit (I) ได้\n" +
        "• มิติตัวเครื่องและจุดต่อขั้วสาย สามารถใส่แทนช่องเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้\n" +
        "• ผ่านมาตรฐานสากล IEC 60947-2 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี"
      );
    } else if (type === 'contactor') {
      target.name = "Magnetic Contactor พร้อม Thermal Overload Relay";
      target.modelPart = "Mitsubishi Electric S-T50 (Coil 220VAC) + TH-T50 หรือเทียบเท่า";
      target.unit = "ชุด";
      target.purpose = "เปลี่ยนทดแทนแมกเนติกคอนแทกเตอร์ควบคุมมอเตอร์ปั๊มน้ำเดิมที่หน้าสัมผัสไหม้ชำรุด";
      setSubstitutionSpecs(
        "• พิกัดกำลังมอเตอร์รองรับไม่น้อยกว่า 22 kW / 30 HP ที่ 380-400 VAC (การใช้งานประเภท AC-3)\n" +
        "• แรงดันคอยล์ควบคุม (Coil Voltage) 220 VAC 50 Hz\n" +
        "• มีหน้าสัมผัสช่วย (Auxiliary Contacts) 2NO + 2NC เป็นอย่างน้อย\n" +
        "• โอเวอร์โหลดรีเลย์ปรับตั้งย่านกระแสให้เหมาะสมกับพิกัดกระแสมอเตอร์เดิม\n" +
        "• ผ่านมาตรฐาน IEC 60947-4-1 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี"
      );
    } else if (type === 'inverter') {
      target.name = "Variable Frequency Drive (VFD / Inverter) ขนาด 15 kW / 20 HP";
      target.modelPart = "ABB ACS580-01-033A-4 หรือ Schneider ATV320U15N4B หรือเทียบเท่า";
      target.unit = "เครื่อง";
      target.purpose = "เปลี่ยนทดแทนอินเวอร์เตอร์ขับเคลื่อนมอเตอร์ระบบปรับอากาศเดิมที่ชำรุด บอร์ดควบคุม Error";
    } else if (type === 'capacitor') {
      target.name = "Power Capacitor Bank สำหรับปรับปรุงค่า Power Factor ขนาด 50 kVAR 400V";
      target.modelPart = "Schneider Electric VarPlus Can (Part No. BLRCS500A600B40) หรือเทียบเท่า";
      target.unit = "ลูก";
      target.purpose = "เปลี่ยนทดแทนคาปาซิเตอร์เดิมที่บวม เสื่อมสภาพ และค่าความจุลดลงในตู้ Cap Bank";
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
      jobTitle: jobTitle.trim(),
      docDate,
      docDateISO: new Date().toISOString().slice(0, 10),
      priority,
      status: approvalDecision === 'approved' ? 'approved' : 'pending_approval',
      inspector: {
        name: inspectorName,
        role: inspectorRole,
        department
      },
      surveyPoints,
      itemsRequested,
      substitutionSpecs,
      justification,
      signatures: {
        surveyor: { name: inspectorName, role: inspectorRole, signed: !!sig1Image, image: sig1Image },
        approver: { name: approverName, role: approverRole, signed: true, decision: approvalDecision, image: sig2Image }
      }
    };

    try {
      const res = await fetch('/api/repair-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(`บันทึกใบเสนอแจ้งซ่อม ${refNo} ลงระบบออนไลน์เรียบร้อยแล้ว!`);
        router.push('/repair-proposal');
      } else {
        alert(`บันทึกไม่สำเร็จ: ${data.error || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    } finally {
      setSaving(false);
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
    
    // 1. Update approver & signature immediately in active form
    if (customized.approver?.name) setApproverName(customized.approver.name);
    if (customized.approver?.role) setApproverRole(customized.approver.role);
    if (customized.approver?.signatureUrl) {
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
    try {
      const res = await fetch('/api/repair-proposals/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '8888', settings: customized })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.warn('Server settings sync issue:', data.error);
      }
    } catch (e) {
      console.warn('Settings API sync warning:', e);
    }

    alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!\n(รูปภาพหัวกระดาษและค่าเริ่มต้นทั้งหมดถูกบันทึกเป็นค่าเริ่มต้นหลักของระบบแล้ว)');
    setShowSettingsModal(false);
  };

  // Logo URL Resolver
  const currentLogoUrl = useMemo(() => {
    const type = adminSettings.header?.logoType;
    if (type === 'egat') return '/assets/shared/egat-logo.jpg';
    if (type === 'veri') return '/logo.png';
    if (type === 'custom') return adminSettings.header?.customLogoUrl || '';
    return null;
  }, [adminSettings.header]);

  const hasAnnex = useMemo(() => surveyPoints.some(p => Boolean(p.photo)), [surveyPoints]);

  const steps = [
    { title: 'ข้อมูลงาน', icon: '1' },
    { title: `จุดที่ชำรุด (${surveyPoints.length})`, icon: '2' },
    { title: `อุปกรณ์ที่ขอซื้อ (${itemsRequested.length})`, icon: '3' },
    { title: 'สเปกเบื้องต้น', icon: '4' },
    { title: 'เหตุผล & ลงนาม', icon: '5' },
    { title: 'สรุป & ส่งออก', icon: '6' }
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
            .doc-banner-bleed img, .doc-banner-contained img {
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              display: block !important;
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
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
                      ชื่อผู้แจ้งซ่อม / ผู้ตรวจสอบ
                    </label>
                    <input 
                      type="text" 
                      value={inspectorName} 
                      placeholder="ระบุชื่อ-นามสกุล ผู้ตรวจสอบ / สำรวจ" 
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

                      {/* Photo Attachment Section */}
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-input, #080e1a)', padding: '8px 10px', borderRadius: 6, border: '1px dashed var(--border-strong, #2d3f5e)' }}>
                        {item.photo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={item.photo} alt="Defect" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-strong, #2d3f5e)' }} />
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#60a5fa' }}>✓ มีรูปถ่ายแนบแล้ว</div>
                              <button 
                                onClick={() => handlePointChange(idx, 'photo', null)}
                                style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                                ลบรูปถ่าย
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>
                            📷 แนบรูปภาพหน้างาน
                            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(idx, e)} style={{ display: 'none' }} />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Requested Items (Extensible List) */}
            {currentStep === 2 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                      📦 รายการและรุ่นของอุปกรณ์ที่ต้องการ (ขอเสนอซื้อสำหรับแก้ไขงาน)
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', margin: '2px 0 0' }}>
                      สามารถเพิ่มรายการอุปกรณ์ได้หลายรายการตามต้องการ
                    </p>
                  </div>
                  <button 
                    onClick={addItemRequested}
                    style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    + เพิ่มรายการอุปกรณ์
                  </button>
                </div>

                {/* Electrical Equipment Presets */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                    ⚡ เลือกแม่แบบอุปกรณ์ไฟฟ้าสำหรับรายการที่ 1:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" onClick={() => applyEquipPreset('meter')} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Digital Power Meter</button>
                    <button type="button" onClick={() => applyEquipPreset('breaker')} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ACB / MCCB เบรกเกอร์</button>
                    <button type="button" onClick={() => applyEquipPreset('contactor')} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Magnetic Contactor</button>
                    <button type="button" onClick={() => applyEquipPreset('inverter')} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Inverter / VFD</button>
                    <button type="button" onClick={() => applyEquipPreset('capacitor')} style={{ background: 'var(--bg-input, #080e1a)', color: '#93c5fd', border: '1px solid var(--border-strong, #2d3f5e)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Capacitor Bank / SPD</button>
                  </div>
                </div>

                {/* List of items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {itemsRequested.map((item, idx) => (
                    <div key={item.id || idx} style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, background: 'var(--bg-surface-raised, #172340)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '2px 8px', borderRadius: 4 }}>
                          รายการที่ {idx + 1} : {item.name ? item.name.slice(0, 35) + '...' : 'ระบุชื่ออุปกรณ์'}
                        </span>
                        {itemsRequested.length > 1 && (
                          <button 
                            onClick={() => removeItemRequested(idx)}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                            ลบรายการนี้
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: 10 }}>
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

                      <div style={{ marginBottom: 10 }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
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
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                          วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทนสำหรับแก้ไขงาน *
                        </label>
                        <textarea 
                          rows="2" 
                          value={item.purpose || ''} 
                          placeholder="ระบุตำแหน่งและหน้าที่ที่นำไปติดตั้งทดแทนของเดิม เช่น ติดตั้งในตู้ Main MDB อาคาร" 
                          onChange={e => handleItemChange(idx, 'purpose', e.target.value)} 
                          className="wizard-dark-input"
                          style={{ width: '100%', padding: '7px 10px', fontSize: 12.5 }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 6, fontSize: 12, color: '#93c5fd', marginTop: 14 }}>
                  <strong style={{ color: '#ffffff' }}>💡 หมายเหตุการจัดหา:</strong> กรณีไม่มีของตรงรุ่นที่ระบุ ให้พิจารณาจัดหายี่ห้อหรือรุ่นอื่นตาม <strong>"สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้"</strong> ในขั้นตอนถัดไป
                </div>
              </div>
            )}

            {/* STEP 4: Technical Specs / Substitution Criteria (Textarea only) */}
            {currentStep === 3 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginBottom: 8 }}>
                  ⚙️ สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
                </h3>

                <div style={{ background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 6, fontSize: 12.5, color: '#93c5fd', marginBottom: 14, lineHeight: 1.5 }}>
                  <strong style={{ color: '#ffffff' }}>📌 หลักเกณฑ์ทางวิศวกรรมในการจัดหาอุปกรณ์ทดแทน:</strong><br />
                  ในกรณีที่ฝ่ายจัดซื้อไม่สามารถจัดหาอุปกรณ์ได้ตรงตามรุ่นที่ระบุ หรือใช้ยี่ห้ออื่นทดแทน อุปกรณ์ทดแทนจะต้องมีคุณสมบัติและสเปกขั้นต่ำสอดคล้องตามเงื่อนไขที่ระบุ เพื่อให้นำมาใช้งานแทนของเดิมได้อย่างสมบูรณ์และปลอดภัย
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>
                    ข้อกำหนดและเงื่อนไขทางเทคนิคสำคัญที่ต้องใช้แทนได้:
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => setSubstitutionSpecs(sampleMeterSpecs)} style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-primary, #eef2ff)', padding: '4px 10px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>+ แม่แบบมิเตอร์</button>
                    <button type="button" onClick={() => setSubstitutionSpecs('')} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '4px 10px', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>ล้างข้อความ</button>
                  </div>
                </div>

                <textarea 
                  rows="9" 
                  value={substitutionSpecs} 
                  onChange={e => setSubstitutionSpecs(e.target.value)} 
                  placeholder="พิมพ์ระบุสเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ เช่น:
• ขนาดมิติและการติดตั้ง: ขนาดหน้าปัด 96x96 มม. เจาะช่อง 92x92 มม. ชนิด Panel Mount สามารถใส่แทนช่องเดิมได้พอดีโดยไม่ต้องตัดเจาะตู้
• พิกัดแรงดัน/กระแส และระบบไฟฟ้า: รองรับระบบ 3 เฟส 4 สาย (3P4W) / 3P3W พิกัด CT 1A/5A แหล่งจ่ายไฟ Aux Universal 44-277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่า V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิก THD ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงาน Class 0.5S (IEC 62053-22) มีพอร์ต RS-485 Modbus RTU สำหรับส่งข้อมูลเข้า SCADA/BEMS
• ความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำฝุ่น IP54 ผ่าน IEC 61010-1 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี"
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, lineHeight: 1.5 }} 
                />
              </div>
            )}

            {/* STEP 5: Justification & 2 Signatories */}
            {currentStep === 4 && (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginBottom: 14 }}>
                  ✍️ เหตุผลความจำเป็นและการลงลายมือชื่อ (2 ท่าน)
                </h3>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                    เหตุผลความจำเป็นในการจัดซื้อเปลี่ยนทดแทน:
                  </label>
                  <textarea 
                    rows="4" 
                    value={justification} 
                    placeholder="พิมพ์เหตุผลความจำเป็น เช่น เนื่องจากอุปกรณ์เดิมชำรุดเสียหาย หน้าจอดับ ส่งผลทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้าได้ จึงจำเป็นต้องจัดซื้ออุปกรณ์เพื่อเปลี่ยนทดแทน..."
                    onChange={e => setJustification(e.target.value)} 
                    className="wizard-dark-input"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 13, lineHeight: 1.45 }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Sign 1: Surveyor / Inspector */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, textAlign: 'center', background: 'var(--bg-surface-raised, #172340)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', marginBottom: 8 }}>
                      1. ผู้ตรวจสอบ / ผู้สำรวจหน้างาน
                    </div>
                    
                    <SignaturePad 
                      value={sig1Image} 
                      onChange={setSig1Image} 
                      placeholder="วาดลายเซ็นต์ผู้ตรวจสอบ" 
                    />

                    <div style={{ textAlign: 'left', marginTop: 10, marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>ชื่อ-นามสกุล:</label>
                      <input 
                        type="text" 
                        value={inspectorName} 
                        placeholder="พิมพ์ชื่อ-นามสกุลผู้ตรวจสอบ"
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

                  {/* Sign 2: Approver (Default: นายตวงเพชร ชัยยานนท์) */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, textAlign: 'center', background: 'var(--bg-surface-raised, #172340)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', marginBottom: 6 }}>
                      2. ผู้อนุมัติ / ผู้มีอำนาจสั่งการ
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 8, fontSize: 12 }}>
                      <label style={{ fontWeight: 700, color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="radio" name="apprDecision" checked={approvalDecision === 'approved'} onChange={() => setApprovalDecision('approved')} /> อนุมัติ
                      </label>
                      <label style={{ color: 'var(--ink-secondary, #94a3c4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="radio" name="apprDecision" checked={approvalDecision === 'rejected'} onChange={() => setApprovalDecision('rejected')} /> ไม้อนุมัติ
                      </label>
                    </div>

                    {approverSigMode === 'image' ? (
                      <div style={{ border: '1px dashed var(--border-strong, #2d3f5e)', borderRadius: 6, padding: '8px 10px', background: '#ffffff', minHeight: 95, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {sig2Image ? (
                          <div>
                            <img src={sig2Image} alt="Approver Signature" style={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain' }} />
                            <div style={{ fontSize: 10.5, color: '#15803d', fontWeight: 700, marginTop: 4 }}>
                              ✓ รูปลายเซ็นต์ทางการของ {approverName}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>ยังไม่มีลายเซ็นต์ผู้อนุมัติ</div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setSig2Image(adminSettings.approver?.signatureUrl || '/assets/shared/signature-approver.png')}
                            style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            ใช้ลายเซ็นต์ตวงเพชร
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproverSigMode('draw')}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            วาดเซ็นต์สด
                          </button>
                          <label style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            อัปโหลดรูป
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files[0];
                                if (!f) return;
                                try {
                                  const compressed = await compressImageFile(f, 600, 200, 0.9);
                                  setSig2Image(compressed);
                                } catch (err) {
                                  alert('ไม่สามารถโหลดรูปภาพได้: ' + err.message);
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <SignaturePad 
                          value={sig2Image} 
                          onChange={setSig2Image} 
                          placeholder="วาดลายเซ็นต์ผู้อนุมัติ" 
                        />
                        <button
                          type="button"
                          onClick={() => setApproverSigMode('image')}
                          style={{ marginTop: 6, background: 'none', border: 'none', color: '#60a5fa', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>
                          สลับไปใช้รูปลายเซ็นต์เดิม
                        </button>
                      </div>
                    )}

                    <div style={{ textAlign: 'left', marginTop: 10, marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>ชื่อ-นามสกุล ผู้อนุมัติ:</label>
                      <input 
                        type="text" 
                        value={approverName} 
                        onChange={e => setApproverName(e.target.value)} 
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }} 
                      />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)' }}>ตำแหน่ง:</label>
                      <input 
                        type="text" 
                        value={approverRole} 
                        onChange={e => setApproverRole(e.target.value)} 
                        className="wizard-dark-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: 12.5 }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Summary & Export */}
            {currentStep === 5 && (
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
                    onClick={() => {
                      setActiveView('document');
                      setTimeout(() => window.print(), 100);
                    }}
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: '11px 20px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22,163,74,0.35)'
                    }}>
                    🖨️ สั่งพิมพ์ / ส่งออก PDF (A4 สำหรับแนบ)
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setActiveView('wizard')}
                  style={{ background: 'var(--bg-surface-raised, #172340)', color: 'var(--ink-primary, #eef2ff)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ กลับไปโหมดแก้ไข
                </button>
                <button 
                  onClick={() => window.print()}
                  style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
                  🖨️ สั่งพิมพ์ / Export PDF
                </button>
              </div>
            </div>

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
                  /* MODE B: ข้อความชื่อองค์กร + โลโก้ (ไว้ใช้ตอนที่ไม่มีรูปหัวกระดาษเท่านั้น) */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '2.5px solid #0f2e5a', paddingBottom: 12, marginBottom: 14 }}>
                    {currentLogoUrl && (
                      <img 
                        src={currentLogoUrl} 
                        alt="Logo" 
                        style={{ maxHeight: 60, maxWidth: 90, objectFit: 'contain' }} 
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#0f2e5a', lineHeight: 1.25 }}>
                        {adminSettings.header?.companyTitle}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                        {adminSettings.header?.companySubtitle}
                      </div>
                      {adminSettings.header?.companyAddress && (
                        <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, marginTop: 2 }}>
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
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0369a1', marginBottom: 3 }}>เอกสารแนบ - หน้า 1 / {hasAnnex ? 3 : 2}</div>
                  <div><strong style={{ color: '#0f172a' }}>เลขที่ใบแจ้งซ่อม:</strong> <strong style={{ color: '#b91c1c' }}>{refNo || '-'}</strong></div>
                  <div><strong style={{ color: '#0f172a' }}>วันที่เสนอ:</strong> <strong style={{ color: '#0f172a' }}>{docDate || '-'}</strong></div>
                  <div><strong style={{ color: '#0f172a' }}>ระดับความเร่งด่วน:</strong> <strong style={{ color: priority === 'high' ? '#b91c1c' : '#047857' }}>{priority === 'high' ? 'เร่งด่วนสูง' : 'ปกติ'}</strong></div>
                </div>
              </div>

              {/* Info Table (No company row, since it is in letterhead!) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 12, border: '1.5px solid #475569' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%', background: '#e2e8f0', fontWeight: 800, color: '#0f2e5a', padding: '6px 10px', border: '1.5px solid #475569' }}>ผู้แจ้งซ่อม / ตรวจสอบ</td>
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
                    <th style={{ padding: '6px 6px', width: 85, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>รหัสอาคาร</th>
                    <th style={{ padding: '6px 6px', width: 90, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>จุดติดตั้ง</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', border: '1.5px solid #0f2e5a' }}>อาการชำรุด / ผลการสำรวจทางเทคนิค</th>
                    <th style={{ padding: '6px 6px', width: 60, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>จำนวน</th>
                    <th style={{ padding: '6px 6px', width: 90, textAlign: 'center', border: '1.5px solid #0f2e5a' }}>ข้อเสนอแนะ</th>
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
                        {sp.photo && <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 700, marginLeft: 6 }}>📷 [มีรูปแนบ]</span>}
                      </td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: '#0f172a', border: '1.5px solid #475569' }}>{sp.qty || 1} ตัว</td>
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
                    <th style={{ padding: '6px 8px', width: 160, textAlign: 'left', border: '1.5px solid #0f2e5a' }}>วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทน</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsRequested.map((it, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1.5px solid #475569' }}>{idx + 1}</td>
                      <td style={{ padding: 6, fontWeight: 800, color: '#0f2e5a', border: '1.5px solid #475569' }}>{it.name || '-'}</td>
                      <td style={{ padding: 6, border: '1.5px solid #475569' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.modelPart || '-'}</div>
                        <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700, marginTop: 1 }}>(คุณสมบัติตามเงื่อนไขข้อ 3)</div>
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
                <span>เอกสารแนบใบเสนอแจ้งซ่อมเลขที่: <strong style={{ color: '#0f2e5a' }}>{refNo || '-'}</strong></span>
                <span>หน้า 2 / {hasAnnex ? 3 : 2}</span>
              </div>

              {/* Section 3: Technical Specifications & Substitution Criteria */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                3. ข้อกำหนดคุณลักษณะเฉพาะและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
              </div>
              <div style={{ background: '#f8fafc', border: '1.5px solid #475569', borderRadius: 4, padding: '10px 14px', fontSize: 11, marginBottom: 14, lineHeight: 1.6, whiteSpace: 'pre-line', color: '#0f172a', fontWeight: 500 }}>
                {substitutionSpecs || 'ไม่มีข้อกำหนดเพิ่มเติม (จัดหาตามรุ่นที่ระบุหรือเทียบเท่า)'}
              </div>

              {/* Section 4: Justification */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                4. เหตุผลความจำเป็นในการจัดซื้อจัดจ้างเพื่อเปลี่ยนทดแทน
              </div>
              <div style={{ background: '#f8fafc', border: '1.5px solid #475569', borderRadius: 4, padding: '10px 14px', fontSize: 11, marginBottom: 18, lineHeight: 1.6, textAlign: 'justify', color: '#0f172a', fontWeight: 500 }}>
                {justification || '(ยังไม่ระบุเหตุผลความจำเป็น)'}
              </div>

              {/* Section 5: Signatures (2 Signatories Only: Inspector & Tuangpetch) */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 10 }}>
                5. ส่วนลงนามการตรวจสอบและพิจารณาอนุมัติ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Sig 1: Inspector */}
                <div style={{ border: '2px solid #334155', borderRadius: 6, padding: '12px 14px', textAlign: 'center', minHeight: 145, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                  <div style={{ fontWeight: 800, color: '#0f2e5a', marginBottom: 4, fontSize: 12.5 }}>ผู้ตรวจสอบ / สำรวจหน้างาน</div>
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
                  <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>{inspectorRole || 'วิศวกรผู้ตรวจสอบหน้างาน'}</div>
                </div>

                {/* Sig 2: Approver (Tuangpetch) */}
                <div style={{ border: '2px solid #334155', borderRadius: 6, padding: '12px 14px', textAlign: 'center', minHeight: 145, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                  <div style={{ fontWeight: 800, color: '#0f2e5a', marginBottom: 2, fontSize: 12.5 }}>ผู้อนุมัติ / ผู้มีอำนาจสั่งการ</div>
                  <div style={{ fontSize: 11, color: approvalDecision === 'approved' ? '#15803d' : '#b91c1c', fontWeight: 800 }}>
                    {approvalDecision === 'approved' ? '⦿ อนุมัติการจัดซื้อจัดจ้าง' : '⭘ ไม้อนุมัติ'}
                  </div>
                  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sig2Image ? (
                      <img src={sig2Image} alt="Approver Signature" style={{ maxHeight: 48, maxWidth: '90%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#475569', fontWeight: 700, fontSize: 12 }}>....................................................</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1.5px solid #334155', paddingTop: 6, fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
                    ({approverName || 'ผู้อนุมัติ'})
                  </div>
                  <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>{approverRole || 'วศ.4 หบท-ธ.'}</div>
                </div>
              </div>
            </div>

            {/* PAGE 3: Annex Photos (Only if photos exist) */}
            {hasAnnex && (
              <div className="a4-print-page" style={{ background: '#ffffff', borderRadius: 8, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', color: '#0f172a' }}>
                {/* Official Page 3 Header for Attachment Document */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 12, fontSize: 11, color: '#475569', fontWeight: 700 }}>
                  <span>เอกสารแนบใบเสนอแจ้งซ่อมเลขที่: <strong style={{ color: '#0f2e5a' }}>{refNo || '-'}</strong> (ภาคผนวกภาพถ่ายสภาพหน้างาน)</span>
                  <span>หน้า 3 / 3</span>
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 4, marginBottom: 8 }}>
                  ภาคผนวก: ภาพถ่ายประกอบผลการตรวจสอบและสำรวจสภาพอุปกรณ์หน้างาน
                </div>
                <p style={{ fontSize: 11.5, color: '#0f172a', fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
                  หลักฐานภาพถ่ายสภาพตู้สวิตช์บอร์ด Main MDB และอุปกรณ์เดิม ณ จุดติดตั้งที่ตรวจพบความชำรุดเสียหาย:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {surveyPoints.filter(p => p.photo).map((p, idx) => (
                    <div key={idx} style={{ border: '1.5px solid #475569', borderRadius: 6, overflow: 'hidden', background: '#ffffff' }}>
                      <div style={{ width: '100%', height: 140, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={p.photo} alt={p.building} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '8px 10px', fontSize: 11 }}>
                        <span style={{ fontWeight: 800, color: '#ffffff', background: '#0284c7', padding: '2px 7px', borderRadius: 4, fontSize: 10.5 }}>
                          {p.building || `จุดที่ ${idx + 1}`}
                        </span>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 4 }}>{p.symptom}</div>
                        <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, marginTop: 2 }}>ตำแหน่ง: {p.location || 'Main MDB'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

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
                    onClick={() => { setShowPinModal(false); setPinError(''); }}
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
            onClose={() => setShowSettingsModal(false)}
            onSave={handleSaveAdminSettings}
          />
        )}

      </main>
    </div>
  );
}

// Subcomponent: Admin Settings Modal Dialog
function AdminSettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(settings)));
  const [activeTab, setActiveTab] = useState('header'); // 'header' | 'approver' | 'ref' | 'defaults'

  useEffect(() => {
    if (settings) {
      setForm(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 14, maxWidth: 660, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 50px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-hairline, #1e2e4a)', background: 'var(--bg-surface-raised, #172340)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>ตั้งค่าระบบแอดมิน (Admin Settings)</h2>
              <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)' }}>ปรับแต่งหัวกระดาษ, ลายเซ็นต์ผู้อนุมัติ, และการรันเลขที่ใบเสนอซ่อม</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-secondary, #94a3c4)' }}>✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-hairline, #1e2e4a)', background: 'var(--bg-surface, #111d32)', overflowX: 'auto' }}>
          {[
            { id: 'header', label: '🏢 หัวกระดาษ & โลโก้' },
            { id: 'approver', label: '✍️ ผู้อนุมัติ & ลายเซ็นต์' },
            { id: 'ref', label: '🔢 การรันเลขที่ใบงาน' },
            { id: 'defaults', label: '⚙️ ค่าเริ่มต้นอื่นๆ' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '11px 12px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
                background: 'transparent',
                fontWeight: 700,
                fontSize: 12.5,
                color: activeTab === tab.id ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          
          {/* TAB 1: Header & Letterhead */}
          {activeTab === 'header' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.header?.showLetterhead} 
                  onChange={e => handleHeaderChange('showLetterhead', e.target.checked)} 
                />
                เปิดแสดงหัวกระดาษทางการ (Official Letterhead Banner)
              </label>

              {form.header?.showLetterhead && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* Section A: Full-width A4 Banner Image */}
                  <div style={{ border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 8, padding: 14, background: 'var(--bg-surface-raised, #172340)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🖼️</span> รูปภาพหัวกระดาษแบบเต็ม A4 (Full Banner Image)
                      </div>
                      {form.header?.bannerImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleHeaderChange('bannerImageUrl', '')}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                          ✕ นำรูปออก (กลับไปใช้ข้อความ)
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      เมื่ออัปโหลดรูปภาพหัวกระดาษแบบเต็ม ระบบจะแสดงภาพเต็มความกว้าง A4 ในเอกสารทันที และ <strong style={{ color: 'var(--ink-primary, #eef2ff)' }}>ไม่แสดงข้อความชื่อองค์กร/ที่อยู่ซ้ำซ้อน</strong> (เหมาะสำหรับหน่วยงานที่มีภาพหัวกระดาษสำเร็จรูป)
                    </p>

                    {form.header?.bannerImageUrl ? (
                      <div style={{ border: '1px dashed var(--border-strong, #2d3f5e)', borderRadius: 6, padding: 10, background: 'var(--bg-input, #080e1a)', textAlign: 'center', marginBottom: 12 }}>
                        <div style={{ maxHeight: 150, overflow: 'hidden', borderRadius: 4, background: '#ffffff' }}>
                          <img 
                            src={form.header.bannerImageUrl} 
                            alt="Banner Preview" 
                            style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }} 
                          />
                        </div>
                        <div style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 700, marginTop: 6 }}>
                          ✓ รูปภาพหัวกระดาษแบบเต็ม A4 พร้อมใช้งาน (จะถูกใช้เป็นค่าเริ่มต้นทันทีเมื่อบันทึก)
                        </div>
                      </div>
                    ) : (
                      <div style={{ border: '1px dashed var(--border-strong, #2d3f5e)', borderRadius: 6, padding: 16, background: 'var(--bg-input, #080e1a)', textAlign: 'center', marginBottom: 12, color: 'var(--ink-muted, #5a6a8a)', fontSize: 12 }}>
                        ยังไม่มีการอัปโหลดรูปหัวกระดาษแบบเต็ม (ระบบจะใช้ข้อความด้านล่างแทน)
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
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
                        <span style={{ fontSize: 11.5, color: '#60a5fa', fontWeight: 600 }}>
                          ✓ อัปเดตรูปเรียบร้อย
                        </span>
                      )}
                    </div>

                    {/* Layout Selector for Banner Width */}
                    {form.header?.bannerImageUrl && (
                      <div style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, padding: '10px 12px' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                          📐 รูปแบบความกว้างการแสดงผลบนกระดาษ A4:
                        </label>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: form.header?.bannerLayout !== 'contained' ? 700 : 500, color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="bannerLayout" 
                              checked={form.header?.bannerLayout !== 'contained'} 
                              onChange={() => handleHeaderChange('bannerLayout', 'bleed')} 
                            />
                            เต็มแผ่นกระดาษ A4 (ชิดขอบกระดาษทุกด้าน) ⭐ แนะนำ
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: form.header?.bannerLayout === 'contained' ? 700 : 500, color: 'var(--ink-secondary, #94a3c4)' }}>
                            <input 
                              type="radio" 
                              name="bannerLayout" 
                              checked={form.header?.bannerLayout === 'contained'} 
                              onChange={() => handleHeaderChange('bannerLayout', 'contained')} 
                            />
                            เต็มขอบเนื้อหาเอกสาร (เสมอเท่าขอบตารางและกรอบฟอร์ม)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section B: Text Header Fallback */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 14, background: form.header?.bannerImageUrl ? 'rgba(15, 23, 42, 0.4)' : 'var(--bg-surface-raised, #172340)', opacity: form.header?.bannerImageUrl ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-primary, #eef2ff)' }}>
                        📝 ข้อมูลข้อความหัวกระดาษ (ไว้ใช้ตอนที่ไม่มีรูปหัวกระดาษเท่านั้น)
                      </div>
                      {form.header?.bannerImageUrl && (
                        <span style={{ fontSize: 11, background: 'var(--bg-input, #080e1a)', color: 'var(--ink-secondary, #94a3c4)', border: '1px solid var(--border-strong, #2d3f5e)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                          ซ่อนในเอกสารอัตโนมัติ (เนื่องจากใช้รูปภาพหัวกระดาษแล้ว)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                          โลโก้ประกอบข้อความ (ขนาดเล็ก):
                        </label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="logoType" 
                              checked={form.header?.logoType === 'egat'} 
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
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 2: Approver & Signature */}
          {activeTab === 'approver' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  ชื่อ-นามสกุล ผู้อนุมัติเริ่มต้น:
                </label>
                <input 
                  type="text" 
                  value={form.approver?.name} 
                  onChange={e => handleApproverChange('name', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  ตำแหน่งผู้อนุมัติ:
                </label>
                <input 
                  type="text" 
                  value={form.approver?.role} 
                  onChange={e => handleApproverChange('role', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 6 }}>
                  รูปลายเซ็นต์ผู้อนุมัติ:
                </label>
                <div style={{ border: '1px dashed var(--border-strong, #2d3f5e)', borderRadius: 6, padding: 12, textAlign: 'center', background: '#ffffff', marginBottom: 8 }}>
                  {form.approver?.signatureUrl ? (
                    <div>
                      <img 
                        src={form.approver.signatureUrl} 
                        alt="Approver Signature" 
                        style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} 
                      />
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 4 }}>
                        ✓ รูปลายเซ็นต์ปัจจุบัน
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>ยังไม่มีรูปลายเซ็นต์</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleApproverChange('signatureUrl', '/assets/shared/signature-approver.png')}
                    style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: '#60a5fa', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ใช้ลายเซ็นต์ตวงเพชร (Firepump)
                  </button>
                  <label style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-primary, #eef2ff)', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    อัปโหลดรูปภาพใหม่
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        try {
                          const compressed = await compressImageFile(f, 600, 200, 0.9);
                          handleApproverChange('signatureUrl', compressed);
                        } catch (err) {
                          alert('ไม่สามารถโหลดรูปภาพได้: ' + err.message);
                        }
                      }} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
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
                  ตำแหน่งผู้ตรวจสอบเริ่มต้น:
                </label>
                <input 
                  type="text" 
                  value={form.defaults?.inspectorRole} 
                  onChange={e => handleDefaultsChange('inspectorRole', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                  ระดับความเร่งด่วนเริ่มต้น:
                </label>
                <select 
                  value={form.defaults?.priority} 
                  onChange={e => handleDefaultsChange('priority', e.target.value)} 
                  className="wizard-dark-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}>
                  <option value="high">เร่งด่วนสูง (High)</option>
                  <option value="normal">ปกติ (Normal)</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-hairline, #1e2e4a)', background: 'var(--bg-surface-raised, #172340)' }}>
          <button
            type="button"
            onClick={() => {
              if (confirm('ต้องการคืนค่าเริ่มต้นระบบทั้งหมดใช่หรือไม่?')) {
                setForm(JSON.parse(JSON.stringify(defaultAdminSettings)));
              }
            }}
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            คืนค่าเริ่มต้นระบบ
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', color: 'var(--ink-primary, #eef2ff)', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '7px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              💾 บันทึกการตั้งค่า
            </button>
          </div>
        </div>

      </div>
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
