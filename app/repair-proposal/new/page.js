'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidenav from '../../components/Sidenav';

const defaultSurveyData = [
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

const defaultItemsRequested = [
  {
    id: 1,
    name: "Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)",
    modelPart: "Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า",
    qty: 9,
    unit: "ตัว",
    purpose: "ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคารทั้ง 9 จุด (ท.0006, ท.0009, ท.0011, ท.0012, ท.0017, ต.0017, ต.0019, ท.0020, ต.0026)"
  }
];

const defaultMeterSpecs = 
`• ขนาดมิติและการติดตั้ง: ชนิดติดตั้งหน้าตู้สวิตช์บอร์ด (Panel Mount) ขนาดหน้าปัด 96 x 96 มม. เจาะช่องตู้ 92 x 92 มม. หน้าจอ LCD พร้อมไฟ Backlit และปุ่มกดหน้าเครื่อง ≥ 4 ปุ่ม สามารถติดตั้งแทนช่องเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้
• ระบบไฟฟ้าและพิกัดการวัด: รองรับระบบ 3 เฟส 4 สาย (3P4W) และ 3 เฟส 3 สาย (3P3W) ความถี่ 50/60 Hz ย่านวัดแรงดัน Phase-Phase 35–480 VAC, Phase-Neutral 20–277 VAC, Input CT 1A หรือ 5A แหล่งจ่ายไฟ Auxiliary Universal 44–277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่าทางไฟฟ้าครบถ้วน V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิกรวม (THD ทั้งแรงดันและกระแส) รายเฟสได้ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงานไฟฟ้าจริง (Active Energy - kWh) มาตรฐาน Class 0.5S ตาม IEC 62053-22 มีพอร์ตสื่อสาร RS-485 รองรับโปรโตคอล Modbus RTU สำหรับส่งข้อมูลเข้าสู่ระบบ SCADA / Energy Management เดิม
• มาตรฐานความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำและฝุ่นไม่น้อยกว่า IP54 ผ่านการรับรองมาตรฐานสากล IEC 61010-1 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน`;

function RepairProposalFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRefNo = searchParams.get('refNo') || searchParams.get('edit');

  const [activeView, setActiveView] = useState('wizard'); // 'wizard' | 'document'
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [jobTitle, setJobTitle] = useState('งานเปลี่ยน meter Main MDB ของหน่วยงาน');
  const [refNo, setRefNo] = useState('TP019-69');
  const [docDate, setDocDate] = useState('10 พฤศจิกายน 2569');
  const [priority, setPriority] = useState('high'); // 'high' | 'normal' | 'low'
  const [inspectorName, setInspectorName] = useState('นายวิศวกร ช่างสำรวจ (วิศวกรไฟฟ้า)');
  const [inspectorRole, setInspectorRole] = useState('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
  const [department, setDepartment] = useState('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า');
  const [companyName, setCompanyName] = useState('บริษัทผู้ตรวจสอบและบำรุงรักษาระบบวิศวกรรม');

  // Step 2 Survey Defect Points
  const [surveyPoints, setSurveyPoints] = useState(defaultSurveyData);

  // Step 3 Requested Items (Extensible List)
  const [itemsRequested, setItemsRequested] = useState(defaultItemsRequested);

  // Step 4 Technical Specs / Substitution Conditions (Textarea)
  const [substitutionSpecs, setSubstitutionSpecs] = useState(defaultMeterSpecs);

  // Step 5 Justification & 2 Signatories
  const [justification, setJustification] = useState(
    'เนื่องจากตู้ควบคุมไฟฟ้าหลัก (Main MDB) ประจำอาคารดังกล่าว มี Digital Meter ชำรุดเสียหาย หน้าจอดับ ข้อมูลคลาดเคลื่อน และระบบสื่อสารขัดข้อง ส่งผลกระทบโดยตรงทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้า ตรวจวัดคุณภาพไฟฟ้า และเชื่อมโยงข้อมูลเข้าสู่ระบบบริหารจัดการพลังงาน (Energy Management System / SCADA) ได้อย่างถูกต้องแม่นยำ จึงมีความจำเป็นอย่างยิ่งที่จะต้องจัดซื้ออุปกรณ์ Digital Power Meter เพื่อเปลี่ยนทดแทนอุปกรณ์เดิมที่ชำรุดทั้ง 9 จุด ให้ระบบตรวจวัดและบริหารจัดการพลังงานสามารถกลับมาทำงานได้อย่างต่อเนื่อง มีประสิทธิภาพ และปลอดภัยตามมาตรฐานวิศวกรรม'
  );

  const [approverName, setApproverName] = useState('นายธีรศักดิ์ บูรณวิวัฒน์');
  const [approverRole, setApproverRole] = useState('ผู้อำนวยการส่วนบริหารจัดการ');
  const [approvalDecision, setApprovalDecision] = useState('approved'); // 'approved' | 'rejected'

  // Canvas Signature Refs
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const [sig1Image, setSig1Image] = useState(null);
  const [sig2Image, setSig2Image] = useState(null);

  // Load existing proposal if refNo in URL
  useEffect(() => {
    if (editRefNo) {
      fetch(`/api/repair-proposals?refNo=${encodeURIComponent(editRefNo)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.refNo) {
            setRefNo(data.refNo);
            setJobTitle(data.jobTitle || '');
            setDocDate(data.docDate || data.docDateISO || '');
            setPriority(data.priority || 'high');
            if (data.inspector) {
              setInspectorName(data.inspector.name || '');
              setInspectorRole(data.inspector.role || '');
              setDepartment(data.inspector.department || '');
              setCompanyName(data.inspector.company || '');
            }
            if (data.surveyPoints) setSurveyPoints(data.surveyPoints);
            if (data.itemsRequested && data.itemsRequested.length > 0) {
              setItemsRequested(data.itemsRequested);
            } else if (data.bomName) {
              setItemsRequested([{
                id: 1,
                name: data.bomName,
                modelPart: data.bomModelPart || data.bomModel || '',
                qty: data.bomQty || 1,
                unit: data.bomUnit || 'ตัว',
                purpose: data.bomPurpose || ''
              }]);
            }
            if (data.substitutionSpecs) {
              setSubstitutionSpecs(data.substitutionSpecs);
            } else if (data.additionalSpecs) {
              setSubstitutionSpecs(data.additionalSpecs);
            }
            if (data.justification) setJustification(data.justification);
            if (data.signatures?.approver?.name) {
              setApproverName(data.signatures.approver.name);
            }
            if (data.signatures?.approver?.role) {
              setApproverRole(data.signatures.approver.role);
            }
          }
        })
        .catch(err => console.error('Failed to load proposal:', err));
    }
  }, [editRefNo]);

  // Canvas Drawing Initializer
  const setupCanvas = (canvas, id) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = "#0f2e5a";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      if (e.type === 'touchstart') e.preventDefault();
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (e.type === 'touchmove') e.preventDefault();
    };

    const stopDraw = () => {
      if (isDrawing) {
        isDrawing = false;
        const dataUrl = canvas.toDataURL();
        if (id === 1) setSig1Image(dataUrl);
        if (id === 2) setSig2Image(dataUrl);
      }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);
  };

  useEffect(() => {
    setupCanvas(canvas1Ref.current, 1);
    setupCanvas(canvas2Ref.current, 2);
    // Draw initial mock signatures
    setTimeout(() => {
      autoSign(1);
      autoSign(2);
    }, 200);
  }, [currentStep, activeView]);

  const clearSig = (id) => {
    const canvas = id === 1 ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (id === 1) setSig1Image(null);
    if (id === 2) setSig2Image(null);
  };

  const autoSign = (id) => {
    const canvas = id === 1 ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.font = "italic bold 17px 'Prompt', cursive, sans-serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const name = id === 1 ? "Witsawakan C." : "Teerasak B.";
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 3);

    ctx.beginPath();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.6;
    ctx.moveTo(canvas.width / 2 - 40, canvas.height / 2 + 10);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 18, canvas.width / 2 + 40, canvas.height / 2 + 8);
    ctx.stroke();
    ctx.restore();

    const dataUrl = canvas.toDataURL();
    if (id === 1) setSig1Image(dataUrl);
    if (id === 2) setSig2Image(dataUrl);
  };

  // Step 2 Survey Defect Points Handlers
  const handlePointChange = (index, field, val) => {
    const next = [...surveyPoints];
    next[index] = { ...next[index], [field]: val };
    setSurveyPoints(next);
  };

  const addPoint = () => {
    const nextId = surveyPoints.length + 1;
    setSurveyPoints([
      ...surveyPoints,
      {
        id: nextId,
        building: '',
        location: 'Main MDB',
        symptom: '',
        qty: 1,
        action: 'เปลี่ยนทดแทน',
        photo: null
      }
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

  // Step 3 Requested Items Handlers
  const handleItemChange = (index, field, val) => {
    const next = [...itemsRequested];
    next[index] = { ...next[index], [field]: val };
    setItemsRequested(next);
  };

  const addItemRequested = () => {
    const nextId = itemsRequested.length + 1;
    setItemsRequested([
      ...itemsRequested,
      {
        id: nextId,
        name: '',
        modelPart: '',
        qty: 1,
        unit: 'ตัว',
        purpose: ''
      }
    ]);
  };

  const removeItemRequested = (index) => {
    if (itemsRequested.length <= 1) return;
    setItemsRequested(itemsRequested.filter((_, i) => i !== index));
  };

  // Presets
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
      setSubstitutionSpecs(defaultMeterSpecs);
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

  // Create Blank Form
  const resetToBlankForm = () => {
    if (!confirm('ต้องการเริ่มสร้างใบเสนอซ่อมใหม่จากฟอร์มเปล่าใช่หรือไม่?')) return;
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${thaiYear}`;

    setJobTitle('งานจัดซื้อเปลี่ยนอุปกรณ์ไฟฟ้าชำรุดประจำอาคาร');
    setRefNo(`REP-${thaiYear}-${Math.floor(Math.random() * 900) + 100}`);
    setDocDate(dateStr);
    setPriority('high');
    setInspectorName('');
    setInspectorRole('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า');
    setCompanyName('');
    setSurveyPoints([
      { id: 1, building: '', location: 'Main MDB', symptom: '', qty: 1, action: 'เปลี่ยนทดแทน', photo: null }
    ]);
    setItemsRequested([
      { id: 1, name: '', modelPart: '', qty: 1, unit: 'ตัว', purpose: '' }
    ]);
    setSubstitutionSpecs('');
    setJustification('เนื่องจากอุปกรณ์ดังกล่าวชำรุดเสียหาย ไม่สามารถทำงานได้ตามปกติ จึงมีความจำเป็นต้องจัดซื้ออุปกรณ์เปลี่ยนทดแทนเพื่อความปลอดภัยและความต่อเนื่องในการใช้งานระบบวิศวกรรมอาคาร');
    setApproverName('นายธีรศักดิ์ บูรณวิวัฒน์');
    setApproverRole('ผู้อำนวยการส่วนบริหารจัดการ');
    setApprovalDecision('approved');
    clearSig(1);
    clearSig(2);
    setCurrentStep(0);
    setActiveView('wizard');
  };

  // Load Sample Proposal
  const loadSample = () => {
    if (!confirm('ต้องการโหลดข้อมูลตัวอย่าง TP019-69 (เปลี่ยน Digital Meter 9 ตัว) ใช่หรือไม่?')) return;
    setJobTitle('งานเปลี่ยน meter Main MDB ของหน่วยงาน');
    setRefNo('TP019-69');
    setDocDate('10 พฤศจิกายน 2569');
    setPriority('high');
    setInspectorName('นายวิศวกร ช่างสำรวจ (วิศวกรไฟฟ้า)');
    setInspectorRole('วิศวกรระบบไฟฟ้าและบำรุงรักษา');
    setDepartment('ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า');
    setCompanyName('บริษัทผู้ตรวจสอบและบำรุงรักษาระบบวิศวกรรม');
    setSurveyPoints(defaultSurveyData);
    setItemsRequested(defaultItemsRequested);
    setSubstitutionSpecs(defaultMeterSpecs);
    setJustification(
      'เนื่องจากตู้ควบคุมไฟฟ้าหลัก (Main MDB) ประจำอาคารดังกล่าว มี Digital Meter ชำรุดเสียหาย หน้าจอดับ ข้อมูลคลาดเคลื่อน และระบบสื่อสารขัดข้อง ส่งผลกระทบโดยตรงทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้า ตรวจวัดคุณภาพไฟฟ้า และเชื่อมโยงข้อมูลเข้าสู่ระบบบริหารจัดการพลังงาน (Energy Management System / SCADA) ได้อย่างถูกต้องแม่นยำ จึงมีความจำเป็นอย่างยิ่งที่จะต้องจัดซื้ออุปกรณ์ Digital Power Meter เพื่อเปลี่ยนทดแทนอุปกรณ์เดิมที่ชำรุดทั้ง 9 จุด ให้ระบบตรวจวัดและบริหารจัดการพลังงานสามารถกลับมาทำงานได้อย่างต่อเนื่อง มีประสิทธิภาพ และปลอดภัยตามมาตรฐานวิศวกรรม'
    );
    setApproverName('นายธีรศักดิ์ บูรณวิวัฒน์');
    setApproverRole('ผู้อำนวยการส่วนบริหารจัดการ');
    setApprovalDecision('approved');
    setCurrentStep(0);
    autoSign(1);
    autoSign(2);
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
        department,
        company: companyName
      },
      surveyPoints,
      itemsRequested,
      substitutionSpecs,
      justification,
      signatures: {
        surveyor: { name: inspectorName, role: inspectorRole, signed: true, image: sig1Image },
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

  const steps = [
    { title: 'ข้อมูลงาน', icon: '1' },
    { title: `จุดที่ชำรุด (${surveyPoints.length})`, icon: '2' },
    { title: `อุปกรณ์ที่ขอซื้อ (${itemsRequested.length})`, icon: '3' },
    { title: 'สเปกเบื้องต้น', icon: '4' },
    { title: 'เหตุผล & ลงนาม', icon: '5' },
    { title: 'สรุป & ส่งออก', icon: '6' }
  ];

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidenav />

      <main style={{ flex: 1, padding: '16px 20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        
        {/* Style block for pale placeholders and print media */}
        <style dangerouslySetInnerHTML={{ __html: `
          ::placeholder {
            color: #94a3b8 !important;
            opacity: 0.65 !important;
            font-style: italic;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 14mm 10mm 14mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, nav, header, button {
              display: none !important;
            }
            .a4-print-page {
              page-break-after: always !important;
              break-after: page !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .a4-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        `}} />

        {/* Top Header Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={() => router.push('/repair-proposal')}
              style={{ background: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ◀ กลับหน้ารายการ
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f2e5a', margin: 0 }}>
              {editRefNo ? `แก้ไขใบเสนอแจ้งซ่อม: ${refNo}` : 'จัดทำใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={resetToBlankForm}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
              ➕ ฟอร์มเปล่า
            </button>
            <button 
              onClick={loadSample}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#0369a1' }}>
              📋 ตัวอย่าง TP019-69
            </button>
            <button 
              onClick={handleSaveOnline}
              disabled={saving}
              style={{ background: '#0284c7', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกออนไลน์ (GitHub)'}
            </button>
          </div>
        </div>

        {/* View Switcher: Wizard vs Document View */}
        <div className="no-print" style={{ display: 'flex', background: '#e2e8f0', padding: 4, borderRadius: 8, marginBottom: 16, width: 'fit-content' }}>
          <button 
            onClick={() => setActiveView('wizard')}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeView === 'wizard' ? 'white' : 'transparent',
              color: activeView === 'wizard' ? '#0284c7' : '#64748b',
              boxShadow: activeView === 'wizard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
            📱 โหมดกรอกทีละส่วน (Wizard)
          </button>
          <button 
            onClick={() => setActiveView('document')}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeView === 'document' ? 'white' : 'transparent',
              color: activeView === 'document' ? '#0284c7' : '#64748b',
              boxShadow: activeView === 'document' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
            📄 โหมดเอกสารเต็มใบ (Full A4 View)
          </button>
        </div>

        {activeView === 'wizard' ? (
          <div>
            {/* Steps Progress Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
              {steps.map((st, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: currentStep === i ? '#0284c7' : '#ffffff',
                    color: currentStep === i ? 'white' : '#64748b',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                  <span style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    background: currentStep === i ? 'rgba(255,255,255,0.3)' : '#f1f5f9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 11 
                  }}>
                    {st.icon}
                  </span>
                  <span>{st.title}</span>
                </button>
              ))}
            </div>

            {/* STEP 1: General Info */}
            {currentStep === 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 16 }}>
                  📋 ข้อมูลงานและเอกสารอ้างอิง
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>เลขที่ใบเสนอแจ้งซ่อม (Ref. No.) *</label>
                    <input type="text" value={refNo} placeholder="เช่น TP019-69 หรือ REP-2569-001" onChange={e => setRefNo(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#b91c1c' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>วันที่จัดทำเอกสาร *</label>
                    <input type="text" value={docDate} placeholder="เช่น 10 พฤศจิกายน 2569" onChange={e => setDocDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ชื่องาน / โครงการขอเสนอซ่อม *</label>
                  <input type="text" value={jobTitle} placeholder="ระบุชื่องาน เช่น งานเปลี่ยน meter Main MDB ของหน่วยงาน" onChange={e => setJobTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ชื่อผู้แจ้งซ่อม / ผู้ตรวจสอบ</label>
                    <input type="text" value={inspectorName} placeholder="ระบุชื่อ-นามสกุล ผู้ตรวจสอบ" onChange={e => setInspectorName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ตำแหน่ง / สายงาน</label>
                    <input type="text" value={inspectorRole} placeholder="เช่น วิศวกรระบบไฟฟ้าและบำรุงรักษา" onChange={e => setInspectorRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>หน่วยงาน / อาคารที่รับผิดชอบ</label>
                    <input type="text" value={department} placeholder="เช่น ฝ่ายวิศวกรรมอาคารและระบบไฟฟ้า" onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>บริษัทผู้ตรวจสอบ</label>
                    <input type="text" value={companyName} placeholder="เช่น บริษัทผู้ตรวจสอบและบำรุงรักษาระบบวิศวกรรม" onChange={e => setCompanyName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Defect Points (User enters freely, pale placeholders) */}
            {currentStep === 1 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', margin: 0 }}>
                      📍 รายการจุดติดตั้งและอาการชำรุดที่พบ ({surveyPoints.length} จุด)
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                      ระบุชื่อจุดและพิมพ์อาการชำรุดเอง พร้อมแนบรูปถ่ายประกอบ
                    </p>
                  </div>
                  <button 
                    onClick={addPoint}
                    style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    + เพิ่มจุดสำรวจ
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {surveyPoints.map((item, idx) => (
                    <div key={item.id || idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                          จุดที่ {idx + 1} : {item.building || 'ยังไม่ระบุชื่อจุด'}
                        </span>
                        {surveyPoints.length > 1 && (
                          <button 
                            onClick={() => removePoint(idx)}
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                            ลบจุดนี้
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>รหัสอาคาร / พื้นที่สำรวจ *</label>
                          <input 
                            type="text" 
                            value={item.building || ''} 
                            placeholder="เช่น ท.0006 หรือ แผงย่อย LP-1" 
                            onChange={e => handlePointChange(idx, 'building', e.target.value)} 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>จุดติดตั้ง / ตู้ไฟฟ้า</label>
                          <input 
                            type="text" 
                            value={item.location || ''} 
                            placeholder="เช่น Main MDB, ห้องควบคุมไฟฟ้า" 
                            onChange={e => handlePointChange(idx, 'location', e.target.value)} 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} 
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>อาการชำรุด / ข้อบกพร่องที่ตรวจพบ *</label>
                        <input 
                          type="text" 
                          value={item.symptom || ''} 
                          placeholder="ระบุอาการชำรุด เช่น หน้าจอดับ ไม่แสดงผล, คอยล์ไหม้, สื่อสารขัดข้อง" 
                          onChange={e => handlePointChange(idx, 'symptom', e.target.value)} 
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} 
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                          {['Digital Meter ชำรุด / หน้าจอดับ', 'ระบบ Error / ค่าคลาดเคลื่อน', 'ระบบสื่อสารขัดข้อง', 'คอยล์ไหม้ / ไม่สั่งการ', 'ทริปบ่อย / ไม่ตัดวงจร', 'เสื่อมสภาพตามอายุ'].map((sym, sidx) => (
                            <span 
                              key={sidx}
                              onClick={() => handlePointChange(idx, 'symptom', sym)}
                              style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, padding: '2px 7px', borderRadius: 3, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Photo Attachment Section */}
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                        {item.photo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={item.photo} alt="Defect" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1' }}>✓ มีรูปถ่ายแนบแล้ว</div>
                              <button 
                                onClick={() => handlePointChange(idx, 'photo', null)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                                ลบรูปถ่าย
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0284c7', cursor: 'pointer', fontWeight: 600 }}>
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
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', margin: 0 }}>
                      📦 รายการและรุ่นของอุปกรณ์ที่ต้องการ (ขอเสนอซื้อสำหรับแก้ไขงาน)
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                      สามารถเพิ่มรายการอุปกรณ์ได้หลายรายการตามต้องการ
                    </p>
                  </div>
                  <button 
                    onClick={addItemRequested}
                    style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    + เพิ่มรายการอุปกรณ์
                  </button>
                </div>

                {/* Electrical Equipment Presets */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 6 }}>
                    ⚡ เลือกแม่แบบอุปกรณ์ไฟฟ้าสำหรับรายการที่ 1:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" onClick={() => applyEquipPreset('meter')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Digital Power Meter</button>
                    <button type="button" onClick={() => applyEquipPreset('breaker')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ACB / MCCB เบรกเกอร์</button>
                    <button type="button" onClick={() => applyEquipPreset('contactor')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Magnetic Contactor</button>
                    <button type="button" onClick={() => applyEquipPreset('inverter')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Inverter / VFD</button>
                    <button type="button" onClick={() => applyEquipPreset('capacitor')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Capacitor Bank / SPD</button>
                  </div>
                </div>

                {/* List of items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {itemsRequested.map((item, idx) => (
                    <div key={item.id || idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                          รายการที่ {idx + 1} : {item.name ? item.name.slice(0, 35) + '...' : 'ระบุชื่ออุปกรณ์'}
                        </span>
                        {itemsRequested.length > 1 && (
                          <button 
                            onClick={() => removeItemRequested(idx)}
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                            ลบรายการนี้
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          รายการอุปกรณ์ / ชิ้นส่วนอะไหล่ที่ต้องการ *
                        </label>
                        <input 
                          type="text" 
                          value={item.name || ''} 
                          placeholder="เช่น Digital Power Meter, Magnetic Contactor, เซอร์กิตเบรกเกอร์ MCCB" 
                          onChange={e => handleItemChange(idx, 'name', e.target.value)} 
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }} 
                        />
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          ยี่ห้อ / รุ่น / รหัสอะไหล่อ้างอิงที่ต้องการ (หรือเทียบเท่า) *
                        </label>
                        <input 
                          type="text" 
                          value={item.modelPart || ''} 
                          placeholder="เช่น Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า" 
                          onChange={e => handleItemChange(idx, 'modelPart', e.target.value)} 
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }} 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>จำนวนที่ขอเสนอซื้อ *</label>
                          <input 
                            type="number" 
                            value={item.qty || 1} 
                            min="1" 
                            onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)} 
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>หน่วยนับ</label>
                          <input 
                            type="text" 
                            value={item.unit || 'ตัว'} 
                            placeholder="ตัว / ชุด / เครื่อง / ชิ้น" 
                            onChange={e => handleItemChange(idx, 'unit', e.target.value)} 
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} 
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทนสำหรับแก้ไขงาน *
                        </label>
                        <textarea 
                          rows="2" 
                          value={item.purpose || ''} 
                          placeholder="ระบุตำแหน่งและหน้าที่ที่นำไปติดตั้งทดแทนของเดิม" 
                          onChange={e => handleItemChange(idx, 'purpose', e.target.value)} 
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 6, fontSize: 12, color: '#1e40af', marginTop: 14 }}>
                  <strong>💡 หมายเหตุการจัดหา:</strong> กรณีไม่มีของตรงรุ่นที่ระบุ ให้พิจารณาจัดหายี่ห้อหรือรุ่นอื่นตาม <strong>"สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้"</strong> ในขั้นตอนถัดไป
                </div>
              </div>
            )}

            {/* STEP 4: Technical Specs / Substitution Criteria (Textarea only) */}
            {currentStep === 3 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 8 }}>
                  ⚙️ สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
                </h3>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #3b82f6', padding: '10px 14px', borderRadius: 6, fontSize: 12.5, color: '#1e40af', marginBottom: 14, lineHeight: 1.5 }}>
                  <strong>📌 หลักเกณฑ์ทางวิศวกรรมในการจัดหาอุปกรณ์ทดแทน:</strong><br />
                  ในกรณีที่ฝ่ายจัดซื้อไม่สามารถจัดหาอุปกรณ์ได้ตรงตามรุ่นที่ระบุ หรือใช้ยี่ห้ออื่นทดแทน อุปกรณ์ทดแทนจะต้องมีคุณสมบัติและสเปกขั้นต่ำสอดคล้องตามเงื่อนไขที่ระบุ เพื่อให้นำมาใช้งานแทนของเดิมได้อย่างสมบูรณ์และปลอดภัย
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                    ข้อกำหนดและเงื่อนไขทางเทคนิคสำคัญที่ต้องใช้แทนได้:
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => setSubstitutionSpecs(defaultMeterSpecs)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ แม่แบบมิเตอร์</button>
                    <button type="button" onClick={() => setSubstitutionSpecs('')} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>ล้างข้อความ</button>
                  </div>
                </div>

                <textarea 
                  rows="9" 
                  value={substitutionSpecs} 
                  onChange={e => setSubstitutionSpecs(e.target.value)} 
                  placeholder="ระบุสเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ เช่น:
• ขนาดมิติและการติดตั้ง: ขนาดหน้าปัด 96x96 มม. เจาะช่อง 92x92 มม. ชนิด Panel Mount สามารถใส่แทนช่องเดิมได้พอดีโดยไม่ต้องตัดเจาะตู้
• พิกัดแรงดัน/กระแส และระบบไฟฟ้า: รองรับระบบ 3 เฟส 4 สาย (3P4W) / 3P3W พิกัด CT 1A/5A แหล่งจ่ายไฟ Aux Universal 44-277 VAC/DC
• ฟังก์ชันการทำงานและการวัดค่า: ตรวจวัดค่า V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิก THD ถึงอันดับที่ 31
• ความแม่นยำและการสื่อสาร: ค่าพลังงาน Class 0.5S (IEC 62053-22) มีพอร์ต RS-485 Modbus RTU สำหรับส่งข้อมูลเข้า SCADA/BEMS
• ความปลอดภัยและการรับประกัน: หน้าตู้กันน้ำฝุ่น IP54 ผ่าน IEC 61010-1 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.5 }} 
                />
              </div>
            )}

            {/* STEP 5: Justification & 2 Signatories */}
            {currentStep === 4 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 14 }}>
                  ✍️ เหตุผลความจำเป็นและการลงลายมือชื่อ (2 ท่าน)
                </h3>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    เหตุผลความจำเป็นในการจัดซื้อเปลี่ยนทดแทน:
                  </label>
                  <textarea rows="4" value={justification} onChange={e => setJustification(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.45 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Sign 1: Surveyor */}
                  <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 8 }}>1. ผู้ตรวจสอบ / ผู้สำรวจหน้างาน</div>
                    
                    <canvas ref={canvas1Ref} width={260} height={80} style={{ width: '100%', height: 80, background: 'white', border: '1px dashed #cbd5e1', borderRadius: 4, cursor: 'crosshair', touchAction: 'none' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6, marginBottom: 10 }}>
                      <button type="button" onClick={() => clearSig(1)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>ล้าง</button>
                      <button type="button" onClick={() => autoSign(1)} style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>เซ็นชื่อ</button>
                    </div>

                    <div style={{ textAlign: 'left', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ชื่อ-นามสกุล:</label>
                      <input type="text" value={inspectorName} onChange={e => setInspectorName(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }} />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ตำแหน่ง:</label>
                      <input type="text" value={inspectorRole} onChange={e => setInspectorRole(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }} />
                    </div>
                  </div>

                  {/* Sign 2: Approver */}
                  <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 6 }}>2. ผู้อนุมัติ / ผู้มีอำนาจสั่งการ</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8, fontSize: 12 }}>
                      <label style={{ fontWeight: 700, color: '#15803d', cursor: 'pointer' }}>
                        <input type="radio" name="apprDecision" checked={approvalDecision === 'approved'} onChange={() => setApprovalDecision('approved')} /> อนุมัติ
                      </label>
                      <label style={{ color: '#64748b', cursor: 'pointer' }}>
                        <input type="radio" name="apprDecision" checked={approvalDecision === 'rejected'} onChange={() => setApprovalDecision('rejected')} /> ไม้อนุมัติ
                      </label>
                    </div>

                    <canvas ref={canvas2Ref} width={260} height={80} style={{ width: '100%', height: 80, background: 'white', border: '1px dashed #cbd5e1', borderRadius: 4, cursor: 'crosshair', touchAction: 'none' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6, marginBottom: 10 }}>
                      <button type="button" onClick={() => clearSig(2)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>ล้าง</button>
                      <button type="button" onClick={() => autoSign(2)} style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>เซ็นชื่อ</button>
                    </div>

                    <div style={{ textAlign: 'left', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ชื่อ-นามสกุล:</label>
                      <input type="text" value={approverName} onChange={e => setApproverName(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }} />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ตำแหน่ง:</label>
                      <input type="text" value={approverRole} onChange={e => setApproverRole(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Summary & Export */}
            {currentStep === 5 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <h2 style={{ fontSize: 18, color: '#0f2e5a', margin: '0 0 6px' }}>ตรวจสอบข้อมูลและพร้อมบันทึกหรือส่งออกเอกสาร</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                  ท่านได้กรอกข้อมูลใบเสนอแจ้งซ่อมเลขที่ <strong>{refNo}</strong> ครบถ้วนเรียบร้อยแล้ว
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 600, margin: '0 auto 24px', textAlign: 'left' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>จุดติดตั้งที่พบปัญหา</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2e5a', marginTop: 2 }}>{surveyPoints.length} จุด</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>รายการอุปกรณ์ที่ขอซื้อ</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0369a1', marginTop: 2 }}>{itemsRequested.length} รายการ</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                  <button 
                    onClick={handleSaveOnline}
                    disabled={saving}
                    style={{
                      background: '#0284c7',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '12px 20px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                    {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกลงระบบออนไลน์ (GitHub)'}
                  </button>

                  <button 
                    onClick={() => setActiveView('document')}
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
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
              background: 'white',
              borderTop: '1px solid #e2e8f0',
              padding: '12px 20px',
              borderRadius: 10,
              marginTop: 18,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
              <button 
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                style={{
                  background: currentStep === 0 ? '#f1f5f9' : '#e2e8f0',
                  color: currentStep === 0 ? '#94a3b8' : '#334155',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                }}>
                ◀ ย้อนกลับ
              </button>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
                ขั้นตอนที่ {currentStep + 1} / {steps.length} : {steps[currentStep].title}
              </div>

              {currentStep < steps.length - 1 ? (
                <button 
                  onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                  style={{
                    background: '#0284c7',
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
        ) : (
          /* DOCUMENT FULL VIEW (A4 Printable Layout) */
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
              <button 
                onClick={() => window.print()}
                style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🖨️ สั่งพิมพ์ / Export PDF
              </button>
            </div>

            {/* PAGE 1: Header, Info, Survey Table, Requested Items */}
            <div className="a4-print-page" style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              {/* Official Header */}
              <div style={{ border: '2px solid #0f2e5a', borderRadius: 4, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 14, background: '#f8fafc' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2e5a' }}>ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>EQUIPMENT REPAIR & REPLACEMENT PROPOSAL FORM</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
                    ชื่องาน: {jobTitle}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div><span style={{ color: '#64748b' }}>เลขที่ใบแจ้งซ่อม:</span> <strong style={{ color: '#b91c1c' }}>{refNo}</strong></div>
                  <div><span style={{ color: '#64748b' }}>วันที่เสนอ:</span> <strong>{docDate}</strong></div>
                  <div><span style={{ color: '#64748b' }}>ระดับความเร่งด่วน:</span> <strong style={{ color: '#b45309' }}>{priority === 'high' ? 'เร่งด่วนสูง' : 'ปกติ'}</strong></div>
                </div>
              </div>

              {/* Info Grid */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14, border: '1px solid #cbd5e1' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%', background: '#f1f5f9', fontWeight: 700, color: '#0f2e5a', padding: 6, border: '1px solid #cbd5e1' }}>ผู้แจ้งซ่อม / ตรวจสอบ</td>
                    <td style={{ width: '30%', padding: 6, border: '1px solid #cbd5e1' }}>{inspectorName}</td>
                    <td style={{ width: '20%', background: '#f1f5f9', fontWeight: 700, color: '#0f2e5a', padding: 6, border: '1px solid #cbd5e1' }}>ตำแหน่ง / สายงาน</td>
                    <td style={{ width: '30%', padding: 6, border: '1px solid #cbd5e1' }}>{inspectorRole}</td>
                  </tr>
                  <tr>
                    <td style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f2e5a', padding: 6, border: '1px solid #cbd5e1' }}>หน่วยงานที่รับผิดชอบ</td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>{department}</td>
                    <td style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f2e5a', padding: 6, border: '1px solid #cbd5e1' }}>บริษัทผู้ตรวจสอบ</td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>{companyName}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 1: Survey Table */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
                1. ผลการสำรวจและตารางรายการอาคาร/จุดติดตั้งที่พบปัญหา
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 14, border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#0f2e5a', color: 'white' }}>
                    <th style={{ padding: 5, width: 40, textAlign: 'center' }}>ลำดับ</th>
                    <th style={{ padding: 5, width: 90, textAlign: 'center' }}>รหัสอาคาร</th>
                    <th style={{ padding: 5, width: 95, textAlign: 'center' }}>จุดติดตั้ง</th>
                    <th style={{ padding: 5, textAlign: 'left' }}>อาการชำรุด / ผลการสำรวจทางเทคนิค</th>
                    <th style={{ padding: 5, width: 65, textAlign: 'center' }}>จำนวน</th>
                    <th style={{ padding: 5, width: 95, textAlign: 'center' }}>ข้อเสนอแนะ</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyPoints.map((sp, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: 5, textAlign: 'center', fontWeight: 700, color: '#0369a1', border: '1px solid #cbd5e1' }}>{sp.building || '-'}</td>
                      <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{sp.location || '-'}</td>
                      <td style={{ padding: 5, border: '1px solid #cbd5e1' }}>
                        {sp.symptom || '-'}
                        {sp.photo && <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 700, marginLeft: 6 }}>📷 [มีรูปแนบ]</span>}
                      </td>
                      <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{sp.qty || 1} ตัว</td>
                      <td style={{ padding: 5, textAlign: 'center', fontWeight: 600, color: '#b91c1c', border: '1px solid #cbd5e1' }}>{sp.action || 'เปลี่ยนทดแทน'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Section 2: Items Requested Table (Extensible) */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
                2. สรุปรายการและรุ่นอุปกรณ์ที่ขอเสนอซื้อเพื่อแก้ไขงาน
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 8, border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#0f2e5a', color: 'white' }}>
                    <th style={{ padding: 5, width: 40, textAlign: 'center' }}>ลำดับ</th>
                    <th style={{ padding: 5, width: 180, textAlign: 'left' }}>รายการอุปกรณ์ / อะไหล่</th>
                    <th style={{ padding: 5, textAlign: 'left' }}>ยี่ห้อ / รุ่น / รหัสอะไหล่ที่ต้องการ (หรือเทียบเท่า)</th>
                    <th style={{ padding: 5, width: 60, textAlign: 'center' }}>จำนวน</th>
                    <th style={{ padding: 5, width: 55, textAlign: 'center' }}>หน่วย</th>
                    <th style={{ padding: 5, width: 170, textAlign: 'left' }}>วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทน</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsRequested.map((it, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: 6, fontWeight: 700, color: '#0f2e5a', border: '1px solid #cbd5e1' }}>{it.name || '-'}</td>
                      <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.modelPart || '-'}</div>
                        <div style={{ fontSize: 10.5, color: '#0369a1', marginTop: 2 }}>(ต้องมีคุณสมบัติสอดคล้องตามเงื่อนไขข้อ 3)</div>
                      </td>
                      <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: '#0f2e5a', border: '1px solid #cbd5e1' }}>{it.qty || 1}</td>
                      <td style={{ padding: 6, textAlign: 'center', border: '1px solid #cbd5e1' }}>{it.unit || 'ตัว'}</td>
                      <td style={{ padding: 6, fontSize: 11, border: '1px solid #cbd5e1' }}>{it.purpose || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Engineering Note */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '6px 10px', borderRadius: 4, fontSize: 11, color: '#92400e' }}>
                <strong>** หมายเหตุทางวิศวกรรม:</strong> รายการอุปกรณ์และรุ่นที่ระบุข้างต้นเป็นเกณฑ์อ้างอิงความต้องการทางเทคนิคสำหรับการแก้ไขงาน ทั้งนี้ ฝ่ายจัดซื้อสามารถจัดหายี่ห้อหรือรุ่นอื่นที่มีคุณสมบัติทางเทคนิคเทียบเท่าหรือดีกว่าได้ตามความเหมาะสมและความพร้อมในการจัดหา
              </div>
            </div>

            {/* PAGE 2: Specs, Justification, 2 Signatures */}
            <div className="a4-print-page" style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              {/* Section 3: Technical Specifications & Substitution Criteria */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
                3. ข้อกำหนดคุณลักษณะเฉพาะและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, padding: '10px 14px', fontSize: 11.5, marginBottom: 14, lineHeight: 1.6, whiteSpace: 'pre-line', color: '#0f172a' }}>
                {substitutionSpecs || 'ไม่มีข้อกำหนดเพิ่มเติม (จัดหาตามรุ่นที่ระบุหรือเทียบเท่า)'}
              </div>

              {/* Section 4: Justification */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
                4. เหตุผลความจำเป็นในการจัดซื้อจัดจ้างเพื่อเปลี่ยนทดแทน
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, padding: '10px 14px', fontSize: 11.5, marginBottom: 16, lineHeight: 1.55, textAlign: 'justify' }}>
                {justification}
              </div>

              {/* Section 5: Signatures (2 Signatories Only) */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
                5. ส่วนลงนามการตรวจสอบและพิจารณาอนุมัติ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Sig 1 */}
                <div style={{ border: '1.5px solid #94a3b8', borderRadius: 4, padding: '10px 14px', textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, color: '#0f2e5a', marginBottom: 4, fontSize: 12.5 }}>ผู้ตรวจสอบ / สำรวจหน้างาน</div>
                  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sig1Image ? (
                      <img src={sig1Image} alt="Signature 1" style={{ maxHeight: 48, maxWidth: '90%' }} />
                    ) : (
                      <span style={{ color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>Witsawakan C.</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: 4, fontSize: 11.5, fontWeight: 600 }}>
                    ({inspectorName || 'ผู้สำรวจหน้างาน'})
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{inspectorRole || 'วิศวกรผู้ตรวจสอบหน้างาน'}</div>
                </div>

                {/* Sig 2 */}
                <div style={{ border: '1.5px solid #94a3b8', borderRadius: 4, padding: '10px 14px', textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, color: '#0f2e5a', marginBottom: 2, fontSize: 12.5 }}>ผู้อนุมัติ / ผู้มีอำนาจสั่งการ</div>
                  <div style={{ fontSize: 11, color: approvalDecision === 'approved' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                    {approvalDecision === 'approved' ? '⦿ อนุมัติการจัดซื้อจัดจ้าง' : '⭘ ไม้อนุมัติ'}
                  </div>
                  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sig2Image ? (
                      <img src={sig2Image} alt="Signature 2" style={{ maxHeight: 48, maxWidth: '90%' }} />
                    ) : (
                      <span style={{ color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>Teerasak B.</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: 4, fontSize: 11.5, fontWeight: 600 }}>
                    ({approverName || 'ผู้อนุมัติ'})
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{approverRole || 'ผู้อำนวยการส่วนบริหารจัดการ'}</div>
                </div>
              </div>
            </div>

            {/* PAGE 3: Annex Photos */}
            <div className="a4-print-page" style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
                ภาคผนวก: ภาพถ่ายประกอบผลการตรวจสอบและสำรวจสภาพอุปกรณ์หน้างาน
              </div>
              <p style={{ fontSize: 12, color: '#334155', marginBottom: 12, lineHeight: 1.4 }}>
                หลักฐานภาพถ่ายสภาพตู้สวิตช์บอร์ด Main MDB และอุปกรณ์เดิม ณ จุดติดตั้งที่ตรวจพบความชำรุดเสียหาย:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {surveyPoints.filter(p => p.photo).map((p, idx) => (
                  <div key={idx} style={{ border: '1.5px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', background: 'white' }}>
                    <div style={{ width: '100%', height: 140, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={p.photo} alt={p.building} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '6px 8px', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '1px 5px', borderRadius: 3 }}>
                        {p.building || `จุดที่ ${idx + 1}`}
                      </span>
                      <div style={{ color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{p.symptom}</div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>ตำแหน่ง: {p.location || 'Main MDB'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>
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
