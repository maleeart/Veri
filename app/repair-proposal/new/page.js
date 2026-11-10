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

  // Step 3 Requested Item (Combined model and part no)
  const [bomName, setBomName] = useState('Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)');
  const [bomModelPart, setBomModelPart] = useState('Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า');
  const [bomQty, setBomQty] = useState(9);
  const [bomUnit, setBomUnit] = useState('ตัว');
  const [bomPurpose, setBomPurpose] = useState('ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคารทั้ง 9 จุด (ท.0006, ท.0009, ท.0011, ท.0012, ท.0017, ต.0017, ต.0019, ท.0020, ต.0026)');

  // Step 4 Substitution Criteria & Additional Specs
  const [additionalSpecs, setAdditionalSpecs] = useState(
    '• รับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน\n' +
    '• มีคู่มือการติดตั้งและการตั้งค่าพารามิเตอร์ระบบสื่อสาร Modbus\n' +
    '• สามารถตั้งค่าอัตราทดหม้อแปลงกระแส (CT Ratio) และแรงดัน (PT Ratio) หน้าเครื่องได้โดยตรง'
  );

  // Step 5 Justification & Signatures
  const [justification, setJustification] = useState(
    'เนื่องจากตู้ควบคุมไฟฟ้าหลัก (Main MDB) ประจำอาคารดังกล่าว มี Digital Meter ชำรุดเสียหาย หน้าจอดับ ข้อมูลคลาดเคลื่อน และระบบสื่อสารขัดข้อง ส่งผลกระทบโดยตรงทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้า ตรวจวัดคุณภาพไฟฟ้า และเชื่อมโยงข้อมูลเข้าสู่ระบบบริหารจัดการพลังงาน (Energy Management System / SCADA) ได้อย่างถูกต้องแม่นยำ จึงมีความจำเป็นอย่างยิ่งที่จะต้องจัดซื้ออุปกรณ์ Digital Power Meter เพื่อเปลี่ยนทดแทนอุปกรณ์เดิมที่ชำรุดทั้ง 9 จุด ให้ระบบตรวจวัดและบริหารจัดการพลังงานสามารถกลับมาทำงานได้อย่างต่อเนื่อง มีประสิทธิภาพ และปลอดภัยตามมาตรฐานวิศวกรรม'
  );

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
            if (data.itemsRequested?.[0]) {
              setBomName(data.itemsRequested[0].name || '');
              setBomModelPart(data.itemsRequested[0].modelPart || '');
              setBomQty(data.itemsRequested[0].qty || data.surveyPoints?.length || 1);
              setBomUnit(data.itemsRequested[0].unit || 'ตัว');
              setBomPurpose(data.itemsRequested[0].purpose || '');
            }
            if (data.additionalSpecs) setAdditionalSpecs(data.additionalSpecs);
            if (data.justification) setJustification(data.justification);
          }
        })
        .catch(err => console.error('Failed to load proposal:', err));
    }
  }, [editRefNo]);

  // Sync survey points count to bomQty
  const updateSurveyPoints = (newPoints) => {
    setSurveyPoints(newPoints);
    setBomQty(newPoints.length);
  };

  const handlePointChange = (index, field, val) => {
    const next = [...surveyPoints];
    next[index] = { ...next[index], [field]: val };
    setSurveyPoints(next);
  };

  const addPoint = () => {
    const nextId = surveyPoints.length + 1;
    updateSurveyPoints([
      ...surveyPoints,
      {
        id: nextId,
        building: `ท.00${nextId < 10 ? '0' + nextId : nextId}`,
        location: 'Main MDB',
        symptom: 'อุปกรณ์ชำรุด / หน้าจอดับ ไม่แสดงผล',
        qty: 1,
        action: 'เปลี่ยนทดแทน',
        photo: null
      }
    ]);
  };

  const removePoint = (index) => {
    if (surveyPoints.length <= 1) return;
    const next = surveyPoints.filter((_, i) => i !== index);
    updateSurveyPoints(next);
  };

  // Electrical Equipment Presets
  const applyEquipPreset = (type) => {
    if (type === 'meter') {
      setBomName("Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)");
      setBomModelPart("Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า");
      setBomUnit("ตัว");
      setBomPurpose("ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคาร");
      setAdditionalSpecs(
        "• ขนาดหน้าปัด 96x96 มม. เจาะช่อง 92x92 มม. (Panel Mount)\n" +
        "• รองรับระบบ 3P4W / 3P3W, Input CT 1A/5A, Aux Supply 44-277 VAC/DC\n" +
        "• วัดค่าพลังงาน Class 0.5S พร้อมพอร์ต RS-485 Modbus RTU สำหรับส่งค่าเข้าระบบ BEMS / SCADA\n" +
        "• รับประกันคุณภาพไม่น้อยกว่า 1 ปี"
      );
    } else if (type === 'breaker') {
      setBomName("Moulded Case Circuit Breaker (MCCB) พิกัด 400A 3P 36kA");
      setBomModelPart("Schneider Electric Compact NSX400F (Part No. LV432676) หรือเทียบเท่า");
      setBomUnit("ตัว");
      setBomPurpose("เปลี่ยนทดแทนเซอร์กิตเบรกเกอร์เมนเดิมที่ชำรุด ไม่ตัดวงจร หรือเสื่อมสภาพในตู้สวิตช์บอร์ด");
      setAdditionalSpecs(
        "• พิกัดกระแสใช้งาน In ไม่น้อยกว่า 400A ชนิด 3 โพล (3P)\n" +
        "• พิกัดตัดกระแสลัดวงจร Icu/Ics ไม่ต่ำกว่า 36 kA ที่ 400/415 VAC\n" +
        "• ชุดทริปแบบอิเล็กทรอนิกส์ (Micrologic 2.3) หรือเทียบเท่า สามารถปรับตั้งค่า L, I ได้\n" +
        "• ขนาดมิติตัวเครื่องต้องใส่ในช่องติดตั้งเดิมของตู้สวิตช์บอร์ดได้โดยไม่ต้องดัดแปลงบัสบาร์หลัก"
      );
    } else if (type === 'contactor') {
      setBomName("Magnetic Contactor พร้อม Thermal Overload Relay");
      setBomModelPart("Mitsubishi Electric S-T50 (Coil 220VAC) + TH-T50 หรือเทียบเท่า");
      setBomUnit("ชุด");
      setBomPurpose("เปลี่ยนทดแทนแมกเนติกคอนแทกเตอร์ควบคุมมอเตอร์ปั๊มน้ำเดิมที่หน้าสัมผัสไหม้ชำรุด");
      setAdditionalSpecs(
        "• พิกัดกำลังมอเตอร์รองรับไม่น้อยกว่า 22 kW / 30 HP ที่ 380-400 VAC (AC-3)\n" +
        "• แรงดันคอยล์ควบคุม (Coil Voltage) 220 VAC 50 Hz\n" +
        "• มีหน้าสัมผัสช่วย (Auxiliary Contacts) 2NO + 2NC เป็นอย่างน้อย\n" +
        "• โอเวอร์โหลดรีเลย์ปรับตั้งย่านกระแสให้เหมาะสมกับพิกัดกระแสมอเตอร์เดิม"
      );
    } else if (type === 'inverter') {
      setBomName("Variable Frequency Drive (VFD / Inverter) ขนาด 15 kW / 20 HP");
      setBomModelPart("ABB ACS580-01-033A-4 หรือ Schneider ATV320U15N4B หรือเทียบเท่า");
      setBomUnit("เครื่อง");
      setBomPurpose("เปลี่ยนทดแทนอินเวอร์เตอร์ขับเคลื่อนมอเตอร์ระบบปรับอากาศเดิมที่ชำรุด บอร์ดควบคุม Error");
      setAdditionalSpecs(
        "• พิกัดกำลังขับไม่น้อยกว่า 15 kW (3 เฟส 380-480 VAC)\n" +
        "• มีหน้าจอควบคุมแบบกราฟิกภาษาไทย/อังกฤษ (Control Panel)\n" +
        "• มีพอร์ตสื่อสาร RS-485 Modbus RTU และฟังก์ชัน Safe Torque Off (STO)\n" +
        "• มี Built-in EMC Filter ตามมาตรฐาน EN 61800-3"
      );
    } else if (type === 'capacitor') {
      setBomName("Power Capacitor Bank สำหรับปรับปรุงค่า Power Factor ขนาด 50 kVAR 400V");
      setBomModelPart("Schneider Electric VarPlus Can (Part No. BLRCS500A600B40) หรือเทียบเท่า");
      setBomUnit("ลูก");
      setBomPurpose("เปลี่ยนทดแทนคาปาซิเตอร์เดิมที่บวม เสื่อมสภาพ และค่าความจุลดลงในตู้ Cap Bank");
      setAdditionalSpecs(
        "• ขนาดกำลังไฟฟ้ารีแอกทีฟไม่น้อยกว่า 50 kVAR ที่แรงดัน 400 VAC 50 Hz 3 เฟส\n" +
        "• ชนิด Dry Type บรรจุสารไม่ติดไฟ พร้อมกลไกระเบิดตัดวงจรป้องกันแรงดันเกินภายใน\n" +
        "• ทนกระแสต่อเนื่อง (Inrush Current) ได้ไม่น้อยกว่า 200 เท่าของพิกัดกระแสปกติ"
      );
    } else {
      setBomName("");
      setBomModelPart("");
      setBomUnit("ชุด");
      setBomPurpose("");
      setAdditionalSpecs("");
    }
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
    setBomName('');
    setBomModelPart('');
    setBomQty(1);
    setBomUnit('ตัว');
    setBomPurpose('');
    setAdditionalSpecs('');
    setJustification('เนื่องจากอุปกรณ์ดังกล่าวชำรุดเสียหาย ไม่สามารถทำงานได้ตามปกติ จึงมีความจำเป็นต้องจัดซื้ออุปกรณ์เปลี่ยนทดแทนเพื่อความปลอดภัยและความต่อเนื่องในการใช้งานระบบวิศวกรรมอาคาร');
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
    setBomName('Digital Power Meter (เครื่องวัดค่าไฟฟ้าดิจิทัลชนิดมัลติฟังก์ชันติดหน้าตู้ 96x96 มม.)');
    setBomModelPart('Schneider Electric EasyLogic PM2230 (Part No. METSEPM2230) หรือเทียบเท่า');
    setBomQty(9);
    setBomUnit('ตัว');
    setBomPurpose('ติดตั้งเปลี่ยนทดแทน Digital Meter เดิมที่ชำรุดในตู้ Main MDB ของอาคารทั้ง 9 จุด (ท.0006, ท.0009, ท.0011, ท.0012, ท.0017, ต.0017, ต.0019, ท.0020, ต.0026)');
    setAdditionalSpecs(
      '• รับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี นับจากวันส่งมอบงาน\n' +
      '• มีคู่มือการติดตั้งและการตั้งค่าพารามิเตอร์ระบบสื่อสาร Modbus\n' +
      '• สามารถตั้งค่าอัตราทดหม้อแปลงกระแส (CT Ratio) และแรงดัน (PT Ratio) หน้าเครื่องได้โดยตรง'
    );
    setJustification(
      'เนื่องจากตู้ควบคุมไฟฟ้าหลัก (Main MDB) ประจำอาคารดังกล่าว มี Digital Meter ชำรุดเสียหาย หน้าจอดับ ข้อมูลคลาดเคลื่อน และระบบสื่อสารขัดข้อง ส่งผลกระทบโดยตรงทำให้ไม่สามารถอ่านค่าปริมาณการใช้ไฟฟ้า ตรวจวัดคุณภาพไฟฟ้า และเชื่อมโยงข้อมูลเข้าสู่ระบบบริหารจัดการพลังงาน (Energy Management System / SCADA) ได้อย่างถูกต้องแม่นยำ จึงมีความจำเป็นอย่างยิ่งที่จะต้องจัดซื้ออุปกรณ์ Digital Power Meter เพื่อเปลี่ยนทดแทนอุปกรณ์เดิมที่ชำรุดทั้ง 9 จุด ให้ระบบตรวจวัดและบริหารจัดการพลังงานสามารถกลับมาทำงานได้อย่างต่อเนื่อง มีประสิทธิภาพ และปลอดภัยตามมาตรฐานวิศวกรรม'
    );
    setCurrentStep(0);
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
      status: 'pending_approval',
      inspector: {
        name: inspectorName,
        role: inspectorRole,
        department,
        company: companyName
      },
      surveyPoints,
      itemsRequested: [
        {
          id: 1,
          name: bomName,
          modelPart: bomModelPart,
          qty: bomQty,
          unit: bomUnit,
          purpose: bomPurpose
        }
      ],
      substitutionCriteria: [
        { category: "1. ขนาดและการติดตั้ง (Dimensions & Mounting)", requirement: "ขนาดหน้าปัด 96 x 96 มม. เจาะช่องตู้ 92 x 92 มม. ชนิด Panel Mount สามารถติดตั้งแทนช่องเจาะเดิมได้โดยไม่ต้องดัดแปลงโครงสร้างตู้" },
        { category: "2. ระบบไฟฟ้าและพิกัดการวัด (Electrical System)", requirement: "รองรับระบบ 3P4W และ 3P3W ความถี่ 50/60 Hz ย่านวัดแรงดัน Phase-Phase 35–480 VAC, Phase-Neutral 20–277 VAC, Input CT 1A หรือ 5A" },
        { category: "3. ฟังก์ชันและการวัดค่า (Measurement & THD)", requirement: "ตรวจวัดค่าทางไฟฟ้าครบถ้วน: V, I, kW, kVAR, kVA, PF, Hz, Demand และวัดค่าฮาร์มอนิกรวม (THD ทั้งแรงดันและกระแส) รายเฟสได้ถึงอันดับที่ 31" },
        { category: "4. ระดับความแม่นยำ (Measurement Accuracy)", requirement: "ค่าพลังงานไฟฟ้าจริง (kWh) ได้มาตรฐานความแม่นยำไม่ต่ำกว่า Class 0.5S ตามมาตรฐานสากล IEC 62053-22" },
        { category: "5. การสื่อสารและการเชื่อมต่อ (Communication)", requirement: "มีพอร์ตสื่อสาร RS-485 อย่างน้อย 1 พอร์ต รองรับ Modbus RTU สำหรับเชื่อมต่อส่งข้อมูลเข้าสู่ระบบ SCADA / Energy Management เดิมได้ทันที" },
        { category: "6. ความปลอดภัยและการรับประกัน (Safety & Warranty)", requirement: "Universal AC/DC Auxiliary Supply 44-277 VAC/DC, หน้าตู้กันน้ำฝุ่น IP54, ได้มาตรฐาน IEC 61010-1 และรับประกันคุณภาพไม่น้อยกว่า 1 ปี" }
      ],
      additionalSpecs,
      justification,
      signatures: {
        surveyor: { name: inspectorName, signed: true },
        manager: { name: "นายสมศักดิ์ มั่นคง", signed: true, decision: "recommend_procurement" },
        approver: { name: "นายธีรศักดิ์ บูรณวิวัฒน์", signed: true, decision: "approved" }
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
    { title: 'อุปกรณ์ที่ขอซื้อ', icon: '3' },
    { title: 'สเปก/เงื่อนไขทดแทน', icon: '4' },
    { title: 'เหตุผล & เซ็นชื่อ', icon: '5' },
    { title: 'สรุป & ส่งออก', icon: '6' }
  ];

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      <Sidenav />

      <main style={{ flex: 1, padding: '16px 20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
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
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
              ➕ ฟอร์มเปล่า
            </button>
            <button 
              onClick={loadSample}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#0369a1' }}>
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
        <div style={{ display: 'flex', background: '#e2e8f0', padding: 4, borderRadius: 8, marginBottom: 18, width: 'fit-content' }}>
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
                    <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#b91c1c' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>วันที่เสนอ *</label>
                    <input type="text" value={docDate} onChange={e => setDocDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ชื่องาน / โครงการขอเสนอซ่อม *</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ชื่อผู้ตรวจสอบ / ผู้แจ้งซ่อม</label>
                    <input type="text" value={inspectorName} onChange={e => setInspectorName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>ตำแหน่ง / สายงาน</label>
                    <input type="text" value={inspectorRole} onChange={e => setInspectorRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>หน่วยงาน / อาคารที่รับผิดชอบ</label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>บริษัทผู้ตรวจสอบ</label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Defect Points */}
            {currentStep === 1 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', margin: 0 }}>
                    📍 รายการจุดติดตั้งและอาการชำรุดที่พบ ({surveyPoints.length} จุด)
                  </h3>
                  <button 
                    onClick={addPoint}
                    style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    + เพิ่มจุดสำรวจ
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {surveyPoints.map((item, idx) => (
                    <div key={item.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0369a1' }}>
                          จุดที่ {idx + 1} : {item.building || 'ระบุอาคาร'}
                        </span>
                        {surveyPoints.length > 1 && (
                          <button 
                            onClick={() => removePoint(idx)}
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                            ลบ
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>รหัสอาคาร / พื้นที่ *</label>
                          <input type="text" value={item.building} onChange={e => handlePointChange(idx, 'building', e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>จุดติดตั้ง</label>
                          <input type="text" value={item.location} onChange={e => handlePointChange(idx, 'location', e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>อาการชำรุด / ข้อบกพร่อง *</label>
                        <input type="text" value={item.symptom} onChange={e => handlePointChange(idx, 'symptom', e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                          {['อุปกรณ์ชำรุด / หน้าจอดับ ไม่แสดงผล', 'ระบบ Error / ค่าข้อมูลคลาดเคลื่อน', 'ระบบสื่อสารขัดข้อง / สัญญาณหลุด', 'คอยล์ไหม้ / ไม่สั่งการ', 'ทริปบ่อย / ไม่ตัดวงจร', 'เสื่อมสภาพตามอายุ'].map((sym, sidx) => (
                            <span 
                              key={sidx}
                              onClick={() => handlePointChange(idx, 'symptom', sym)}
                              style={{ background: '#e2e8f0', color: '#475569', fontSize: 11, padding: '2px 6px', borderRadius: 3, cursor: 'pointer' }}>
                              {sym.split('/')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Requested Items (Combined Model & Part) */}
            {currentStep === 2 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 12 }}>
                  📦 รายการและรุ่นของอุปกรณ์ที่ต้องการ (ขอเสนอซื้อสำหรับแก้ไขงาน)
                </h3>

                {/* Electrical Equipment Presets */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: 6 }}>
                    ⚡ เลือกประเภทอุปกรณ์ไฟฟ้าตัวอย่าง (คลิกเพื่อโหลดสเปกแม่แบบ):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" onClick={() => applyEquipPreset('meter')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Digital Power Meter</button>
                    <button type="button" onClick={() => applyEquipPreset('breaker')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ACB / MCCB เบรกเกอร์</button>
                    <button type="button" onClick={() => applyEquipPreset('contactor')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Magnetic Contactor</button>
                    <button type="button" onClick={() => applyEquipPreset('inverter')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Inverter / VFD</button>
                    <button type="button" onClick={() => applyEquipPreset('capacitor')} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Capacitor Bank / SPD</button>
                    <button type="button" onClick={() => applyEquipPreset('custom')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ล้างฟอร์มเปล่า</button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    รายการอุปกรณ์ / ชิ้นส่วนอะไหล่ที่ต้องการ *
                  </label>
                  <input type="text" value={bomName} onChange={e => setBomName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }} />
                </div>

                {/* Combined Model and Part No */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    ยี่ห้อ / รุ่น / รหัสอะไหล่อ้างอิงที่ต้องการ (หรือเทียบเท่า) *
                  </label>
                  <input type="text" value={bomModelPart} onChange={e => setBomModelPart(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }} />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    * ระบุยี่ห้อ รุ่น และรหัสอะไหล่เดิมที่ต้องการ หรือระบุยี่ห้ออื่นที่สามารถนำมาใช้งานทดแทนได้
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>จำนวนที่ขอเสนอซื้อ *</label>
                    <input type="number" value={bomQty} min="1" onChange={e => setBomQty(parseInt(e.target.value, 10) || 1)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>หน่วยนับ</label>
                    <input type="text" value={bomUnit} onChange={e => setBomUnit(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทนสำหรับแก้ไขงาน *
                  </label>
                  <textarea rows="2" value={bomPurpose} onChange={e => setBomPurpose(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', padding: '10px 14px', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                  <strong>** หมายเหตุทางวิศวกรรม:</strong> รายการอุปกรณ์และรุ่นที่ระบุข้างต้นเป็นเกณฑ์อ้างอิงความต้องการทางวิศวกรรมสำหรับการแก้ไขงาน ทั้งนี้ ฝ่ายจัดซื้อสามารถจัดหายี่ห้อหรือรุ่นอื่นที่มีคุณสมบัติทางเทคนิคเทียบเท่าหรือดีกว่าได้ตามความเหมาะสมและความพร้อมในการจัดหา
                </div>
              </div>
            )}

            {/* STEP 4: Substitution Criteria */}
            {currentStep === 3 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 12 }}>
                  ⚙️ สเปกเบื้องต้นและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
                </h3>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #3b82f6', padding: '12px 14px', borderRadius: 6, fontSize: 12.5, color: '#1e40af', marginBottom: 16, lineHeight: 1.5 }}>
                  <strong>📌 หลักเกณฑ์ทางวิศวกรรมในการจัดหาอุปกรณ์ทดแทน:</strong><br />
                  ในกรณีที่ฝ่ายจัดซื้อไม่สามารถจัดหาอุปกรณ์ได้ตรงตามรุ่นที่ระบุ หรือใช้ยี่ห้ออื่นทดแทน อุปกรณ์ทดแทนนั้น <strong>จะต้องมีคุณสมบัติและสเปกขั้นต่ำสอดคล้องตามเงื่อนไขทั้ง 6 ข้อด้านล่างนี้เป็นอย่างน้อย</strong> เพื่อให้สามารถนำมาติดตั้งใช้งานแทนของเดิมได้อย่างสมบูรณ์ ปลอดภัย และไม่ส่งผลกระทบต่อระบบเดิม
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    ข้อกำหนดและเงื่อนไขสำคัญเฉพาะงานเพิ่มเติม:
                  </label>
                  <textarea rows="4" value={additionalSpecs} onChange={e => setAdditionalSpecs(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.45 }} placeholder="ระบุเงื่อนไขการรับประกัน, การเชื่อมต่อ, หรือเอกสารรับรองที่จำเป็น..." />
                </div>

                {/* 6 Essential Criteria Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>1. ขนาดและการติดตั้ง (Dimensions)</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      ต้องใส่แทนช่องเดิมได้พอดี เช่น ขนาดหน้าปัด 96x96 มม. เจาะช่อง 92x92 มม. ชนิด Panel Mount โดยไม่ต้องตัดเจาะบานตู้สวิตช์บอร์ด
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>2. ระบบไฟฟ้าและพิกัด (Electrical)</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      รองรับระบบไฟฟ้า 3 เฟส 4 สาย (3P4W) / 3P3W ความถี่ 50 Hz ทนแรงดันไม่น้อยกว่า 480 VAC พิกัด CT 1A/5A แหล่งจ่าย Aux Universal 44-277 VAC/DC
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>3. ฟังก์ชันการวัดค่า (Core Functions)</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      ตรวจวัดค่า V, I, kW, kVAR, kVA, PF, Hz, Demand และค่าฮาร์มอนิก THD (แรงดัน/กระแส) รายเฟสได้ถึงอันดับที่ 31 ไม่น้อยกว่าของเดิม
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>4. ความแม่นยำ (Accuracy)</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      ค่าพลังงานไฟฟ้าจริง (Active Energy - kWh) ต้องได้มาตรฐานความแม่นยำไม่ต่ำกว่า Class 0.5S ตามมาตรฐานสากล IEC 62053-22
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>5. การสื่อสาร (Compatibility)</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      มีพอร์ต RS-485 Modbus RTU สำหรับเชื่อมโยงส่งข้อมูลเข้าสู่ระบบ BEMS / SCADA เดิมของอาคารได้โดยไม่ต้องปรับแก้ระบบแม่ข่าย
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 4 }}>6. ความปลอดภัยและการรับประกัน</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      หน้าตู้กันน้ำฝุ่น IP54 ผ่านการรับรองมาตรฐานสากล IEC 61010-1 และรับประกันคุณภาพสินค้าไม่น้อยกว่า 1 ปี
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Justification & Signatures */}
            {currentStep === 4 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f2e5a', marginBottom: 14 }}>
                  ✍️ เหตุผลความจำเป็นและการลงลายมือชื่อ
                </h3>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    เหตุผลความจำเป็นในการจัดซื้อเปลี่ยนทดแทน:
                  </label>
                  <textarea rows="4" value={justification} onChange={e => setJustification(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.45 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 8 }}>1. ผู้ตรวจสอบ / ผู้สำรวจหน้างาน</div>
                    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                      Witsawakan C. (ลงนามดิจิทัล)
                    </div>
                    <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 6, fontSize: 12, color: '#475569' }}>
                      ({inspectorName || 'ผู้สำรวจหน้างาน'})
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 8 }}>2. ผู้จัดการแผนก / ผู้ขอจัดซื้อ</div>
                    <div style={{ fontSize: 11.5, color: '#166534', fontWeight: 600, marginBottom: 4 }}>☑ เห็นควรดำเนินการจัดซื้อ</div>
                    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                      Somsak M. (ลงนามดิจิทัล)
                    </div>
                    <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 6, fontSize: 12, color: '#475569' }}>
                      (นายสมศักดิ์ มั่นคง) - ผู้จัดการฝ่ายวิศวกรรม
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2e5a', marginBottom: 8 }}>3. ผู้อนุมัติ / ผู้มีอำนาจสั่งการ</div>
                    <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, marginBottom: 4 }}>⦿ อนุมัติจัดซื้อ</div>
                    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                      Teerasak B. (ลงนามดิจิทัล)
                    </div>
                    <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 6, fontSize: 12, color: '#475569' }}>
                      (นายธีรศักดิ์ บูรณวิวัฒน์) - ผู้อำนวยการส่วน
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
                    <div style={{ fontSize: 12, color: '#64748b' }}>อุปกรณ์/อะไหล่ที่เสนอซื้อ</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0369a1', marginTop: 2 }}>{bomQty} {bomUnit}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{bomName.slice(0, 30)}...</div>
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
          <div style={{ background: 'white', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
              <button 
                onClick={() => window.print()}
                style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🖨️ สั่งพิมพ์ / Export PDF
              </button>
            </div>

            {/* Official Header */}
            <div style={{ border: '2px solid #0f2e5a', borderRadius: 4, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 14, background: '#f8fafc' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2e5a' }}>ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>EQUIPMENT REPAIR & REPLACEMENT PROPOSAL FORM</div>
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
                  <td style={{ width: '20%', background: '#f1f5f9', fontWeight: 700, padding: 6, border: '1px solid #cbd5e1' }}>ผู้แจ้งซ่อม / ตรวจสอบ</td>
                  <td style={{ width: '30%', padding: 6, border: '1px solid #cbd5e1' }}>{inspectorName}</td>
                  <td style={{ width: '20%', background: '#f1f5f9', fontWeight: 700, padding: 6, border: '1px solid #cbd5e1' }}>ตำแหน่ง / สายงาน</td>
                  <td style={{ width: '30%', padding: 6, border: '1px solid #cbd5e1' }}>{inspectorRole}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f1f5f9', fontWeight: 700, padding: 6, border: '1px solid #cbd5e1' }}>หน่วยงานที่รับผิดชอบ</td>
                  <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>{department}</td>
                  <td style={{ background: '#f1f5f9', fontWeight: 700, padding: 6, border: '1px solid #cbd5e1' }}>บริษัทผู้ตรวจสอบ</td>
                  <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>{companyName}</td>
                </tr>
              </tbody>
            </table>

            {/* Section 1: Survey Table */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
              1. ผลการสำรวจและตารางรายการอาคาร/จุดติดตั้งที่พบปัญหา
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 14, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#0f2e5a', color: 'white' }}>
                  <th style={{ padding: 5, width: 40, textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ padding: 5, width: 80, textAlign: 'center' }}>รหัสอาคาร</th>
                  <th style={{ padding: 5, width: 90, textAlign: 'center' }}>จุดติดตั้ง</th>
                  <th style={{ padding: 5, textAlign: 'left' }}>อาการชำรุด / ผลการสำรวจทางเทคนิค</th>
                  <th style={{ padding: 5, width: 60, textAlign: 'center' }}>จำนวน</th>
                  <th style={{ padding: 5, width: 90, textAlign: 'center' }}>ข้อเสนอแนะ</th>
                </tr>
              </thead>
              <tbody>
                {surveyPoints.map((sp, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                    <td style={{ padding: 5, textAlign: 'center', fontWeight: 700, color: '#0369a1', border: '1px solid #cbd5e1' }}>{sp.building}</td>
                    <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{sp.location}</td>
                    <td style={{ padding: 5, border: '1px solid #cbd5e1' }}>{sp.symptom}</td>
                    <td style={{ padding: 5, textAlign: 'center', border: '1px solid #cbd5e1' }}>{sp.qty} ตัว</td>
                    <td style={{ padding: 5, textAlign: 'center', fontWeight: 600, color: '#b91c1c', border: '1px solid #cbd5e1' }}>{sp.action || 'เปลี่ยนทดแทน'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Section 2: Items Requested Table (Combined Brand/Model/Part) */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
              2. สรุปรายการและรุ่นอุปกรณ์ที่ขอเสนอซื้อเพื่อแก้ไขงาน
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 8, border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#0f2e5a', color: 'white' }}>
                  <th style={{ padding: 5, width: 40, textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ padding: 5, width: 180, textAlign: 'left' }}>รายการอุปกรณ์ / อะไหล่</th>
                  <th style={{ padding: 5, textAlign: 'left' }}>ยี่ห้อ / รุ่น / รหัสอะไหล่ที่ต้องการ (หรือเทียบเท่า)</th>
                  <th style={{ padding: 5, width: 60, textAlign: 'center' }}>จำนวน</th>
                  <th style={{ padding: 5, width: 50, textAlign: 'center' }}>หน่วย</th>
                  <th style={{ padding: 5, width: 170, textAlign: 'left' }}>วัตถุประสงค์ / ตำแหน่งติดตั้งทดแทน</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, border: '1px solid #cbd5e1' }}>1</td>
                  <td style={{ padding: 6, fontWeight: 700, color: '#0f2e5a', border: '1px solid #cbd5e1' }}>{bomName}</td>
                  <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{bomModelPart}</div>
                    <div style={{ fontSize: 10.5, color: '#0369a1', marginTop: 2 }}>(ต้องมีคุณสมบัติสอดคล้องตามเงื่อนไขในข้อ 3)</div>
                  </td>
                  <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: '#0f2e5a', border: '1px solid #cbd5e1' }}>{bomQty}</td>
                  <td style={{ padding: 6, textAlign: 'center', border: '1px solid #cbd5e1' }}>{bomUnit}</td>
                  <td style={{ padding: 6, fontSize: 11, border: '1px solid #cbd5e1' }}>{bomPurpose}</td>
                </tr>
              </tbody>
            </table>

            {/* Engineering Note */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', padding: '6px 10px', borderRadius: 4, fontSize: 11, color: '#92400e', marginBottom: 14 }}>
              <strong>** หมายเหตุทางวิศวกรรม:</strong> รายการอุปกรณ์และรุ่นที่ระบุข้างต้นเป็นเกณฑ์อ้างอิงความต้องการทางเทคนิคสำหรับการแก้ไขงาน ทั้งนี้ ฝ่ายจัดซื้อสามารถจัดหายี่ห้อหรือรุ่นอื่นที่มีคุณสมบัติทางเทคนิคเทียบเท่าหรือดีกว่าได้ตามความเหมาะสมและความพร้อมในการจัดหา
            </div>

            {/* Section 3: Substitution Criteria */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
              3. ข้อกำหนดคุณลักษณะเฉพาะและเงื่อนไขสำคัญที่ต้องใช้แทนได้ (กรณีใช้ยี่ห้อ/รุ่นอื่นทดแทน)
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 12px', fontSize: 11.5, marginBottom: 10, lineHeight: 1.45 }}>
              <strong>เงื่อนไขและข้อกำหนดทางเทคนิคสำคัญ:</strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: 4, color: '#334155' }}>{additionalSpecs}</div>
            </div>

            {/* Section 4: Justification */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 6 }}>
              4. เหตุผลความจำเป็นในการจัดซื้อจัดจ้างเพื่อเปลี่ยนทดแทน
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 12px', fontSize: 11.5, marginBottom: 14, lineHeight: 1.45, textAlign: 'justify' }}>
              {justification}
            </div>

            {/* Section 5: Signatures */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f2e5a', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 4, marginBottom: 8 }}>
              5. ส่วนลงนามการตรวจสอบและพิจารณาอนุมัติ
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: '#0f2e5a', marginBottom: 6 }}>ผู้ตรวจสอบ / สำรวจหน้างาน</div>
                <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                  Witsawakan C.
                </div>
                <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 4 }}>({inspectorName || 'ผู้สำรวจหน้างาน'})</div>
              </div>
              <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: '#0f2e5a', marginBottom: 2 }}>ผู้จัดการแผนก / ผู้ขอจัดซื้อ</div>
                <div style={{ fontSize: 10, color: '#166534', fontWeight: 600 }}>☑ เห็นควรดำเนินการจัดซื้อ</div>
                <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                  Somsak M.
                </div>
                <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 4 }}>(นายสมศักดิ์ มั่นคง)</div>
              </div>
              <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: '#0f2e5a', marginBottom: 2 }}>ผู้อนุมัติ / ผู้มีอำนาจสั่งการ</div>
                <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>⦿ อนุมัติจัดซื้อ</div>
                <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontStyle: 'italic', fontWeight: 700 }}>
                  Teerasak B.
                </div>
                <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 4 }}>(นายธีรศักดิ์ บูรณวิวัฒน์)</div>
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
