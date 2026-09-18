'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SignaturePad from '../components/SignaturePad';
import ElecReport from '../components/ElecReport';
import { useCanWrite } from '../lib/useCanWrite';

// ── Default Initial Form Data ────────────────────────────────────────────────
const createDefaultHighVoltage = (idx = 1) => ({
  id: `hv_${Date.now()}_${idx}`,
  title: `ระบบแรงสูง ชุดที่ ${idx}`,
  aerialName: '',
  aerial: {
    pole: { status: 'pass', note: '', photo: null },
    poleTop: { status: 'pass', note: '', photo: null },
    guyWire: { status: 'pass', note: '', photo: null },
    stringing: { status: 'pass', note: '', photo: null },
    clearance: { status: 'pass', note: '', photo: null },
    lightning: { status: 'pass', note: '', photo: null },
    joints: { status: 'pass', note: '', photo: null },
    grounding: { status: 'pass', note: '', photo: null },
  },
  disconnectors: {
    dropFuse: { status: 'pass', note: '', photo: null },
    disconnectSwitch: { status: 'pass', note: '', photo: null },
    rmu: { status: 'pass', note: '', photo: null },
    otherText: '',
    other: { status: 'pass', note: '', photo: null },
  },
  otherText: '',
  other: { status: 'pass', note: '', photo: null },
});

const createDefaultTransformer = (idx = 1) => ({
  id: `tf_${Date.now()}_${idx}`,
  no: String(idx),
  kva: '',
  voltage: '',
  impedance: '',
  type: 'Oil',
  typeOther: '',
  installType: 'sitting',
  installTypeOther: '',
  primaryProtection: { type: '', amp: '' },
  items: {
    wiring: { status: 'pass', note: '', photo: null },
    lightningArrester: { status: 'pass', note: '', photo: null },
    dropFuse: { status: 'pass', note: '', photo: null },
    touchProtection: { status: 'pass', note: '', photo: null },
    bodyGround: { status: 'pass', note: '', photo: null },
    groundRod: { status: 'pass', note: '', photo: null, wireType: '', wireSize: '' },
    externalCondition: { status: 'pass', note: '', photo: null },
    environment: { status: 'pass', note: '', photo: null },
    otherText: '',
    other: { status: 'pass', note: '', photo: null },
  }
});

const createDefaultMainSwitchboard = (idx = 1) => ({
  id: `msb_${Date.now()}_${idx}`,
  no: String(idx),
  sourceTransformer: '1',
  locationType: 'indoor',
  locationOther: '',
  items: {
    generalCondition: { status: 'pass', note: '', photo: null },
    busbarJoints: { status: 'pass', note: '', photo: null },
    workingSpace: { status: 'pass', note: '', photo: null },
    lighting: { status: 'pass', note: '', photo: null },
    bonding: { status: 'pass', note: '', photo: null },
    livePartProtection: { status: 'pass', note: '', photo: null },
    singleLineDiagram: { status: 'pass', note: '', photo: null },
  },
  overcurrentProtection: { type: '', icKa: '', volt: '', atAmp: '', afAmp: '' },
  grounding: { status: 'pass', note: '', photo: null, wireType: '', wireSize: '' },
  temperature: 'normal',
  temperatureNote: '',
  temperaturePhoto: null,
  otherText: '',
  other: { status: 'pass', note: '', photo: null }
});

const createDefaultMainCircuit = (idx = 1) => ({
  id: `mc_${Date.now()}_${idx}`,
  title: `วงจรเมน ชุดที่ ${idx}`,
  phaseWire: { type: '', size: '' },
  neutralWire: { type: '', size: '' },
  raceway: 'conduit',
  racewayOther: '',
  items: {
    racewayCondition: { status: 'pass', note: '', photo: null },
    insulation: { status: 'pass', note: '', photo: null },
    joints: { status: 'pass', note: '', photo: null },
    inductionHeatProtection: { status: 'pass', note: '', photo: null },
  },
  temperature: 'normal',
  temperatureNote: '',
  temperaturePhoto: null,
  otherText: '',
  other: { status: 'pass', note: '', photo: null }
});

const createDefaultSubPanel = (idx = 1) => ({
  id: `sp_${Date.now()}_${idx}`,
  no: String(idx),
  location: '',
  sourceMdb: '1',
  locationType: 'indoor',
  locationOther: '',
  items: {
    generalCondition: { status: 'pass', note: '', photo: null },
    busbarJoints: { status: 'pass', note: '', photo: null },
    workingSpace: { status: 'pass', note: '', photo: null },
    lighting: { status: 'pass', note: '', photo: null },
    bonding: { status: 'pass', note: '', photo: null },
    livePartProtection: { status: 'pass', note: '', photo: null },
  },
  overcurrentProtection: { type: '', icKa: '', volt: '', atAmp: '', afAmp: '' },
  grounding: { status: 'pass', note: '', photo: null, wireType: '', wireSize: '' },
  temperature: 'normal',
  temperatureNote: '',
  temperaturePhoto: null,
  otherText: '',
  other: { status: 'pass', note: '', photo: null }
});

const createDefaultOtherEquipment = (idx = 1) => ({
  id: `eq_${Date.now()}_${idx}`,
  name: '',
  installation: { status: 'pass', note: '', photo: null },
  external: { status: 'pass', note: '', photo: null },
  otherText: '',
  other: { status: 'pass', note: '', photo: null },
});

const createInitialState = (targetYear) => {
  const today = new Date();
  const y = targetYear || today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  return {
    inspector: {
      name: '',
      age: '',
      address: '',
      moo: '',
      soi: '',
      road: '',
      subdistrict: '',
      district: '',
      province: '',
      phone: '',
      licenseLevel: 'ภาคีวิศวกร',
      licenseBranch: 'วิศวกรรมไฟฟ้า แขนงไฟฟ้ากำลัง',
      licenseNo: '',
      licenseStart: '',
      licenseEnd: '',
      certType: 'sec9', // 'sec9' | 'sec11'
      juristicName: '',
      certNo: '',
      certStart: '',
      certEnd: '',
      signature: '',
    },
    workplace: {
      name: '',
      businessType: '',
      employerName: '',
      address: '',
      moo: '',
      soi: '',
      road: '',
      subdistrict: '',
      district: '',
      province: '',
      phone: '',
      inspectionDate: dateStr,
      employerSignature: '',
    },
    general: {
      voltage: '380/220',
      phase: '3',
      wires: '4',
      meterAmp: '',
      meterVolt: '380/220',
      meterPhase: '3',
      meterWires: '4',
      meterNo: '',
      peakKw12Months: '',
      transformerCount: '1',
      transformerTotalKva: '',
      generatorCount: '',
      generatorTotalKva: '',
      responsiblePerson1: { name: '', position: '' },
      responsiblePerson2: { name: '', position: '' },
      asBuiltDrawing: 'yes',
      asBuiltReason: '',
    },
    highVoltageSystems: [createDefaultHighVoltage(1)],
    transformers: [createDefaultTransformer(1)],
    mainSwitchboards: [createDefaultMainSwitchboard(1)],
    mainCircuits: [createDefaultMainCircuit(1)],
    subPanels: [createDefaultSubPanel(1)],
    otherEquipments: [createDefaultOtherEquipment(1)],
    conclusion: {
      result: 'pass',
      repairDays: '',
      suggestions: '',
      inspectorSignature: '',
      inspectionDate: dateStr,
    },
  };
};

// ── Clone previous inspection record as clean starting template ──────────────
const cloneAsTemplate = (sourceData, targetYear) => {
  if (!sourceData) return createInitialState(targetYear);
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const newDate = `${targetYear}-${m}-${d}`;

  const cleanCheck = (item) => {
    if (!item) return { status: 'pass', note: '', photo: null };
    return {
      status: 'pass',
      note: '',
      photo: null,
      ...(item.wireType !== undefined ? { wireType: item.wireType } : {}),
      ...(item.wireSize !== undefined ? { wireSize: item.wireSize } : {}),
    };
  };

  return {
    inspector: {
      ...(sourceData.inspector || {}),
      signature: '',
    },
    workplace: {
      ...(sourceData.workplace || {}),
      inspectionDate: newDate,
      employerSignature: '',
    },
    general: {
      ...(sourceData.general || {}),
    },
    highVoltageSystems: (sourceData.highVoltageSystems || []).map((hv, idx) => ({
      ...hv,
      id: `hv_${Date.now()}_${idx + 1}`,
      aerialName: hv.aerialName || '',
      aerial: Object.fromEntries(
        Object.entries(hv.aerial || {}).map(([k, it]) => [k, cleanCheck(it)])
      ),
      disconnectors: {
        dropFuse: cleanCheck(hv.disconnectors?.dropFuse),
        disconnectSwitch: cleanCheck(hv.disconnectors?.disconnectSwitch),
        rmu: cleanCheck(hv.disconnectors?.rmu),
        otherText: hv.disconnectors?.otherText || '',
        other: cleanCheck(hv.disconnectors?.other),
      },
      otherText: hv.otherText || '',
      other: cleanCheck(hv.other),
    })),
    transformers: (sourceData.transformers || []).map((tf, idx) => ({
      ...tf,
      id: `tf_${Date.now()}_${idx + 1}`,
      items: Object.fromEntries(
        Object.entries(tf.items || {}).map(([k, it]) => [
          k,
          k === 'otherText' ? (it || '') : cleanCheck(it),
        ])
      ),
    })),
    mainSwitchboards: (sourceData.mainSwitchboards || []).map((msb, idx) => ({
      ...msb,
      id: `msb_${Date.now()}_${idx + 1}`,
      items: Object.fromEntries(
        Object.entries(msb.items || {}).map(([k, it]) => [k, cleanCheck(it)])
      ),
      grounding: cleanCheck(msb.grounding),
      temperature: 'normal',
      temperatureNote: '',
      temperaturePhoto: null,
      otherText: msb.otherText || '',
      other: cleanCheck(msb.other),
    })),
    mainCircuits: (sourceData.mainCircuits || []).map((mc, idx) => ({
      ...mc,
      id: `mc_${Date.now()}_${idx + 1}`,
      items: Object.fromEntries(
        Object.entries(mc.items || {}).map(([k, it]) => [k, cleanCheck(it)])
      ),
      temperature: 'normal',
      temperatureNote: '',
      temperaturePhoto: null,
      otherText: mc.otherText || '',
      other: cleanCheck(mc.other),
    })),
    subPanels: (sourceData.subPanels || []).map((sp, idx) => ({
      ...sp,
      id: `sp_${Date.now()}_${idx + 1}`,
      items: Object.fromEntries(
        Object.entries(sp.items || {}).map(([k, it]) => [k, cleanCheck(it)])
      ),
      grounding: cleanCheck(sp.grounding),
      temperature: 'normal',
      temperatureNote: '',
      temperaturePhoto: null,
      otherText: sp.otherText || '',
      other: cleanCheck(sp.other),
    })),
    otherEquipments: (sourceData.otherEquipments || []).map((eq, idx) => ({
      ...eq,
      id: `eq_${Date.now()}_${idx + 1}`,
      installation: cleanCheck(eq.installation),
      external: cleanCheck(eq.external),
      otherText: eq.otherText || '',
      other: cleanCheck(eq.other),
    })),
    conclusion: {
      result: 'pass',
      repairDays: '',
      suggestions: '',
      inspectorSignature: '',
      inspectionDate: newDate,
    },
  };
};

// ── Photo Upload Helper with Automatic In-Browser Compression ─────────────────
const processImageUpload = (file, onComplete) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 900;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.65);
      onComplete(compressed);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

// ── Status Choice Row Component ───────────────────────────────────────────────
function ChecklistRow({ title, item, onChange }) {
  const fileInputRef = useRef(null);

  const handleStatusChange = (val) => {
    onChange({ ...item, status: val });
  };

  const handleNoteChange = (val) => {
    onChange({ ...item, note: val });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageUpload(file, (base64) => {
      onChange({ ...item, photo: base64 });
    });
    e.target.value = '';
  };

  const removePhoto = () => {
    onChange({ ...item, photo: null });
  };

  return (
    <div className="check-row">
      <div className="check-row__main">
        <span className="check-row__title">{title}</span>
        <div className="check-row__options">
          <label className={`status-pill ${item.status === 'pass' ? 'status-pill--pass' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={item.status === 'pass'}
              onChange={() => handleStatusChange('pass')}
            />
            <span>✓ ใช้ได้</span>
          </label>
          <label className={`status-pill ${item.status === 'improve' ? 'status-pill--improve' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={item.status === 'improve'}
              onChange={() => handleStatusChange('improve')}
            />
            <span>△ ควรปรับปรุง</span>
          </label>
          <label className={`status-pill ${item.status === 'fix' ? 'status-pill--fix' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={item.status === 'fix'}
              onChange={() => handleStatusChange('fix')}
            />
            <span>✕ ต้องแก้ไข</span>
          </label>
        </div>
      </div>

      <div className="check-row__sub">
        <input
          type="text"
          className="check-row__note"
          placeholder="คำแนะนำ / ความเห็นเพิ่มเติม (ถ้ามี)..."
          value={item.note || ''}
          onChange={(e) => handleNoteChange(e.target.value)}
        />
        <div className="check-row__photo-actions">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {!item.photo ? (
            <button
              type="button"
              className="btn-attach-photo"
              onClick={() => fileInputRef.current?.click()}
              title="แนบรูปถ่ายประกอบ"
            >
              📷 แนบรูป
            </button>
          ) : (
            <div className="photo-thumb-wrap">
              <img src={item.photo} alt="หลักฐาน" className="photo-thumb" />
              <button
                type="button"
                className="btn-remove-photo"
                onClick={removePhoto}
                title="ลบรูป"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Inner ───────────────────────────────────────────────────────────
function ElectricalAnnualInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const canWrite = useCanWrite();

  const urlIsEdit = searchParams.get('edit') === '1';
  const urlFilename = searchParams.get('filename');

  const [isEditMode, setIsEditMode] = useState(urlIsEdit);
  const [editFilename, setEditFilename] = useState(urlFilename);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [prefilledFrom, setPrefilledFrom] = useState('');
  const [allElecRecords, setAllElecRecords] = useState([]);
  const [duplicateModalRecord, setDuplicateModalRecord] = useState(null);
  const [templateModalOffer, setTemplateModalOffer] = useState(null);
  const [pageStep, setPageStep] = useState(() => (urlIsEdit || urlFilename ? 1 : 0));

  const DRAFT_KEY = 'draft:elec:annual';
  const [step, setStep] = useState(1); // 1: ผู้ตรวจ&สถานประกอบการ, 2: ข้อมูลทั่วไป, 3: ตรวจสอบอุปกรณ์, 4: สรุปผล
  const [data, setData] = useState(() => createInitialState(new Date().getFullYear()));
  const [editReason, setEditReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Sync URL query params with state
  useEffect(() => {
    setIsEditMode(urlIsEdit);
    setEditFilename(urlFilename);
    if (urlIsEdit || urlFilename) {
      setPageStep(1);
    }
  }, [urlIsEdit, urlFilename]);

  // Load all existing elec inspection dates
  useEffect(() => {
    let active = true;
    fetch('/api/inspections')
      .then((r) => (r.ok ? r.json() : { dates: [] }))
      .then((res) => {
        if (!active) return;
        const elec = (res.dates || []).filter((d) => d.type === 'elec');
        setAllElecRecords(elec);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Load existing file or draft
  useEffect(() => {
    if (isEditMode && editFilename) {
      fetch(`/api/inspections?filename=${encodeURIComponent(editFilename)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res?.records?.formData) {
            setData(res.records.formData);
            if (res.records.editReason) setEditReason(res.records.editReason);
            const dateStr = res.records.formData.workplace?.inspectionDate || res.date || '';
            const yr = parseInt(dateStr.slice(0, 4));
            if (yr && !isNaN(yr)) setSelectedYear(yr);
          }
        })
        .catch(() => {});
      return;
    }

    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setData(parsed);
        setHasDraft(true);
        const dateStr = parsed.workplace?.inspectionDate || '';
        const yr = parseInt(dateStr.slice(0, 4));
        if (yr && !isNaN(yr)) setSelectedYear(yr);
      }
    } catch {}
  }, [isEditMode, editFilename]);

  // Autosave draft
  useEffect(() => {
    if (isEditMode) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {}
  }, [data, isEditMode]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setData(createInitialState(selectedYear));
      setHasDraft(false);
      setPrefilledFrom('');
    } catch {}
  };

  // Available years list
  const currentYear = new Date().getFullYear();
  const baseYears = [currentYear + 2, currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const recordYears = allElecRecords.map((r) => parseInt(r.date?.slice(0, 4))).filter(Boolean);
  const availableYears = Array.from(new Set([...baseYears, ...recordYears, selectedYear])).sort((a, b) => b - a);

  // Year check & proceed logic (used by both Screen 0 proceed button and form year select)
  const handleProceedFromYearSelect = (targetYear) => {
    // 1. Duplicate check: does targetYear have an existing saved report?
    const match = allElecRecords.find((r) => r.date?.startsWith(String(targetYear)));
    if (match) {
      setDuplicateModalRecord({ year: targetYear, record: match });
      return;
    }

    // 2. Next/New year check: does any previous record exist?
    const priorRecords = allElecRecords
      .map((r) => ({ ...r, year: parseInt(r.date?.slice(0, 4)) }))
      .filter((r) => !isNaN(r.year) && r.year < targetYear)
      .sort((a, b) => b.year - a.year);

    const latestPrior = priorRecords[0] || (allElecRecords.length > 0 ? allElecRecords[0] : null);
    if (latestPrior) {
      const priorYr = parseInt(latestPrior.date?.slice(0, 4)) || latestPrior.year;
      setTemplateModalOffer({ targetYear, priorRecord: latestPrior, priorYear: priorYr });
      return;
    }

    // 3. No existing records anywhere -> apply directly and enter form
    applyYearDirectly(targetYear);
    setPageStep(1);
  };

  const handleYearChange = (newYear) => {
    if (newYear === selectedYear) return;
    handleProceedFromYearSelect(newYear);
  };

  const applyYearDirectly = (year) => {
    setSelectedYear(year);
    setIsEditMode(false);
    setEditFilename(null);
    setPrefilledFrom('');
    setData((prev) => {
      const today = new Date();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const newDate = `${year}-${m}-${d}`;
      return {
        ...prev,
        workplace: { ...prev.workplace, inspectionDate: newDate },
        conclusion: { ...prev.conclusion, inspectionDate: newDate },
      };
    });
    router.replace('/electrical-annual');
  };

  // Duplicate Modal Handlers
  const handleUseExisting = async (modalData) => {
    const rec = modalData.record;
    const url = rec._path
      ? `/api/inspections?path=${encodeURIComponent(rec._path)}`
      : `/api/inspections?filename=${encodeURIComponent(rec.filename)}`;
    try {
      const res = await fetch(url).then((r) => r.json());
      if (res?.records?.formData) {
        setData(res.records.formData);
        if (res.records.editReason) setEditReason(res.records.editReason);
        setIsEditMode(true);
        setEditFilename(rec.filename);
        setSelectedYear(modalData.year);
        setPrefilledFrom('');
        setPageStep(1);
        router.replace(`/electrical-annual?filename=${encodeURIComponent(rec.filename)}&edit=1`);
      }
    } catch (e) {
      setValidationError('ไม่สามารถโหลดข้อมูลเดิมได้: ' + e.message);
    }
    setDuplicateModalRecord(null);
  };

  const handleCreateFreshForDuplicateYear = (modalData) => {
    const fresh = createInitialState(modalData.year);
    setData(fresh);
    setIsEditMode(false);
    setEditFilename(null);
    setSelectedYear(modalData.year);
    setPrefilledFrom('');
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDuplicateModalRecord(null);
    setPageStep(1);
    router.replace('/electrical-annual');
  };

  const handleCancelDuplicateModal = () => {
    setDuplicateModalRecord(null);
  };

  // Template Offer Modal Handlers
  const handleApplyTemplate = async (offerData) => {
    const prior = offerData.priorRecord;
    const url = prior._path
      ? `/api/inspections?path=${encodeURIComponent(prior._path)}`
      : `/api/inspections?filename=${encodeURIComponent(prior.filename)}`;
    try {
      const res = await fetch(url).then((r) => r.json());
      if (res?.records?.formData) {
        const cloned = cloneAsTemplate(res.records.formData, offerData.targetYear);
        setData(cloned);
        setSelectedYear(offerData.targetYear);
        setIsEditMode(false);
        setEditFilename(null);
        setPrefilledFrom(`พ.ศ. ${offerData.priorYear + 543} (${offerData.priorYear})`);
        setPageStep(1);
        router.replace('/electrical-annual');
      }
    } catch (e) {
      setValidationError('ไม่สามารถโหลดข้อมูลเทมเพลตได้: ' + e.message);
      applyYearDirectly(offerData.targetYear);
      setPageStep(1);
    }
    setTemplateModalOffer(null);
    setDuplicateModalRecord(null);
  };

  const handleDeclineTemplate = (offerData) => {
    applyYearDirectly(offerData.targetYear);
    setPageStep(1);
    setTemplateModalOffer(null);
  };

  const handleCancelTemplateModal = () => {
    setTemplateModalOffer(null);
  };

  // Updaters for nested state
  const updateInspector = (field, val) => {
    setData((d) => ({ ...d, inspector: { ...d.inspector, [field]: val } }));
  };

  const updateWorkplace = (field, val) => {
    setData((d) => ({ ...d, workplace: { ...d.workplace, [field]: val } }));
  };

  const updateGeneral = (field, val) => {
    setData((d) => ({ ...d, general: { ...d.general, [field]: val } }));
  };

  const updateConclusion = (field, val) => {
    setData((d) => ({ ...d, conclusion: { ...d.conclusion, [field]: val } }));
  };

  // Dynamic Repeaters Actions
  const addHighVoltage = () => {
    setData((d) => ({
      ...d,
      highVoltageSystems: [...d.highVoltageSystems, createDefaultHighVoltage(d.highVoltageSystems.length + 1)],
    }));
  };

  const removeHighVoltage = (idx) => {
    if (data.highVoltageSystems.length <= 1) return;
    setData((d) => ({
      ...d,
      highVoltageSystems: d.highVoltageSystems.filter((_, i) => i !== idx),
    }));
  };

  const addTransformer = () => {
    setData((d) => {
      const nextTfs = [...d.transformers, createDefaultTransformer(d.transformers.length + 1)];
      return {
        ...d,
        transformers: nextTfs,
        general: {
          ...d.general,
          transformerCount: String(nextTfs.length),
        },
      };
    });
  };

  const removeTransformer = (idx) => {
    if (data.transformers.length <= 1) return;
    setData((d) => {
      const nextTfs = d.transformers.filter((_, i) => i !== idx);
      return {
        ...d,
        transformers: nextTfs,
        general: {
          ...d.general,
          transformerCount: String(nextTfs.length),
        },
      };
    });
  };

  const addMainSwitchboard = () => {
    setData((d) => {
      const nextIdx = d.mainSwitchboards.length + 1;
      const defaultTf = d.transformers[0]?.no || '1';
      return {
        ...d,
        mainSwitchboards: [
          ...d.mainSwitchboards,
          { ...createDefaultMainSwitchboard(nextIdx), sourceTransformer: defaultTf },
        ],
      };
    });
  };

  const removeMainSwitchboard = (idx) => {
    if (data.mainSwitchboards.length <= 1) return;
    setData((d) => ({
      ...d,
      mainSwitchboards: d.mainSwitchboards.filter((_, i) => i !== idx),
    }));
  };

  const addMainCircuit = () => {
    setData((d) => ({
      ...d,
      mainCircuits: [...d.mainCircuits, createDefaultMainCircuit(d.mainCircuits.length + 1)],
    }));
  };

  const removeMainCircuit = (idx) => {
    if (data.mainCircuits.length <= 1) return;
    setData((d) => ({
      ...d,
      mainCircuits: d.mainCircuits.filter((_, i) => i !== idx),
    }));
  };

  const addSubPanel = () => {
    setData((d) => {
      const nextIdx = d.subPanels.length + 1;
      const defaultMdb = d.mainSwitchboards[0]?.no || '1';
      return {
        ...d,
        subPanels: [
          ...d.subPanels,
          { ...createDefaultSubPanel(nextIdx), sourceMdb: defaultMdb },
        ],
      };
    });
  };

  const removeSubPanel = (idx) => {
    if (data.subPanels.length <= 1) return;
    setData((d) => ({
      ...d,
      subPanels: d.subPanels.filter((_, i) => i !== idx),
    }));
  };

  const addOtherEquipment = () => {
    setData((d) => ({
      ...d,
      otherEquipments: [...d.otherEquipments, createDefaultOtherEquipment(d.otherEquipments.length + 1)],
    }));
  };

  const removeOtherEquipment = (idx) => {
    if (data.otherEquipments.length <= 1) return;
    setData((d) => ({
      ...d,
      otherEquipments: d.otherEquipments.filter((_, i) => i !== idx),
    }));
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!canWrite) {
      setValidationError('บัญชีผู้เยี่ยมชมไม่สามารถบันทึกข้อมูลได้');
      return;
    }
    if (!data.workplace.name?.trim()) {
      setValidationError('กรุณาระบุชื่อสถานประกอบกิจการในขั้นตอนที่ 1');
      setStep(1);
      return;
    }
    if (!data.inspector.name?.trim()) {
      setValidationError('กรุณาระบุชื่อวิศวกรผู้ตรวจสอบในขั้นตอนที่ 1');
      setStep(1);
      return;
    }
    if (isEditMode && !editReason?.trim()) {
      setValidationError('กรุณาระบุเหตุผลในการแก้ไขข้อมูล');
      return;
    }

    setValidationError('');
    setSubmitting(true);

    try {
      const inspectionDate = data.workplace.inspectionDate || new Date().toISOString().slice(0, 10);
      const buildingName = data.workplace.name.replace(/[\/\\]/g, '-');

      const payload = {
        date: inspectionDate,
        type: 'elec',
        building: buildingName,
        floor: '',
        records: {
          formData: data,
          editReason: isEditMode ? editReason.trim() : undefined,
        },
        ...(isEditMode && editFilename ? { originalFilename: editFilename } : {}),
      };

      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      const resJson = await res.json().catch(() => ({}));
      const savedPath = resJson.path || '';
      const savedStem = savedPath ? savedPath.split('/').pop().replace(/\.json$/, '') : `elec_${inspectionDate}`;

      localStorage.removeItem(DRAFT_KEY);
      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/report/${encodeURIComponent(savedStem)}${savedPath ? `?path=${encodeURIComponent(savedPath)}` : ''}`);
      }, 1200);
    } catch (e) {
      setValidationError(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'ผู้ตรวจ & สถานประกอบการ', sub: 'หน้า 2' },
    { num: 2, title: 'ข้อมูลทั่วไป', sub: 'หน้า 3' },
    { num: 3, title: 'รายการตรวจอุปกรณ์', sub: 'หน้า 3 - 8' },
    { num: 4, title: 'สรุปผล & บันทึก', sub: 'หน้า 9' },
  ];

  return (
    <div className="elec-page">
      {/* ── Modal: Duplicate Year Detected (Firepump bubble style) ── */}
      {duplicateModalRecord && (
        <div className="elec-modal-overlay" onClick={handleCancelDuplicateModal}>
          <div className="elec-modal-box" onClick={(e) => e.stopPropagation()}>
            <span className="elec-modal-icon">📅</span>
            <h2 className="elec-modal-title">พบข้อมูลรายงานประจำปี พ.ศ. {duplicateModalRecord.year + 543}</h2>
            <p className="elec-modal-msg">
              มีบันทึกการตรวจสอบของปีนี้อยู่ในระบบแล้ว กรุณาเลือกรูปแบบที่ต้องการดำเนินการ
            </p>
            <div className="elec-modal-badge">
              {duplicateModalRecord.record.building || duplicateModalRecord.record.label || 'บริภัณฑ์ไฟฟ้าประจำปี'} · บันทึกเมื่อ {duplicateModalRecord.record.date}
            </div>
            <div className="elec-modal-actions">
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--primary"
                onClick={() => handleUseExisting(duplicateModalRecord)}
              >
                ✏️ ใช้ข้อมูลเดิม (เข้าไปแก้ไข)
              </button>
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--secondary"
                onClick={() => handleCreateFreshForDuplicateYear(duplicateModalRecord)}
              >
                ➕ สร้างใหม่สำหรับปีนี้ (เริ่มใหม่ทั้งหมด)
              </button>
              {(() => {
                const prior = allElecRecords
                  .map((r) => ({ ...r, year: parseInt(r.date?.slice(0, 4)) }))
                  .filter((r) => !isNaN(r.year) && r.year < duplicateModalRecord.year)
                  .sort((a, b) => b.year - a.year)[0];
                if (!prior) return null;
                const priorYr = parseInt(prior.date?.slice(0, 4)) || prior.year;
                return (
                  <button
                    type="button"
                    className="elec-modal-btn elec-modal-btn--template"
                    onClick={() => handleApplyTemplate({
                      targetYear: duplicateModalRecord.year,
                      priorRecord: prior,
                      priorYear: priorYr,
                    })}
                  >
                    📋 ใช้ข้อมูลปีก่อน ({priorYr + 543}) เป็นแม่แบบ
                  </button>
                );
              })()}
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--cancel"
                onClick={handleCancelDuplicateModal}
              >
                ยกเลิก / เลือกปีอื่น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Offer Previous Year as Template (Firepump bubble style) ── */}
      {templateModalOffer && (
        <div className="elec-modal-overlay" onClick={handleCancelTemplateModal}>
          <div className="elec-modal-box" onClick={(e) => e.stopPropagation()}>
            <span className="elec-modal-icon">📋</span>
            <h2 className="elec-modal-title">พบข้อมูลรายงานปี พ.ศ. {templateModalOffer.priorYear + 543}</h2>
            <p className="elec-modal-msg">
              ต้องการดึงข้อมูลอุปกรณ์และสเปกเดิมมาเป็นแม่แบบเริ่มต้นสำหรับปี พ.ศ. {templateModalOffer.targetYear + 543} หรือไม่?
            </p>
            <div className="elec-modal-badge">
              (คัดลอกหม้อแปลง ตู้สวิตช์ วงจรเมน และแผงย่อย · รีเซ็ตผลตรวจและรูปภาพใหม่)
            </div>
            <div className="elec-modal-actions">
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--primary"
                onClick={() => handleApplyTemplate(templateModalOffer)}
              >
                📋 ใช้ข้อมูลเดิมเป็นแม่แบบเริ่มต้น
              </button>
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--secondary"
                onClick={() => handleDeclineTemplate(templateModalOffer)}
              >
                ✨ เริ่มใหม่ (ไม่ใช้แม่แบบ)
              </button>
              <button
                type="button"
                className="elec-modal-btn elec-modal-btn--cancel"
                onClick={handleCancelTemplateModal}
              >
                ยกเลิก / เลือกปีอื่น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Report Preview Modal ── */}
      {showPreviewModal && (
        <div className="preview-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-hdr">
              <div>
                <span style={{ fontWeight: 800, fontSize: 16 }}>📄 ตัวอย่างรายงาน ESPSIB001</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', marginLeft: 8 }}>ตัวอย่างเอกสารฉบับเต็ม</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-modal-print" onClick={() => window.print()}>
                  🖨 พิมพ์ / ออก PDF
                </button>
                <button type="button" className="btn-modal-close" onClick={() => setShowPreviewModal(false)}>
                  ✕ ปิด
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              <ElecReport data={{ records: { formData: data }, date: data.workplace.inspectionDate }} />
            </div>
          </div>
        </div>
      )}

      {pageStep === 0 ? (
        /* ── Screen 0: เลือกปีประจำเล่มรายงาน ── */
        <div className="year-select-container">
          <header className="elec-hdr">
            <div className="elec-hdr__left">
              <button type="button" className="btn-back" onClick={() => router.push('/')}>‹ หน้าหลัก</button>
              <div>
                <h1 className="elec-hdr__title">⚡ ตรวจสอบบริภัณฑ์ไฟฟ้าประจำปี</h1>
                <p className="elec-hdr__sub">แบบฟอร์ม ESPSIB001 · กรมสวัสดิการและคุ้มครองแรงงาน</p>
              </div>
            </div>
          </header>

          <div className="year-picker-card">
            <div className="ypc-header">
              <span className="ypc-icon">⚡📅</span>
              <h2 className="ypc-title">เลือกปีประจำเล่มรายงาน</h2>
              <p className="ypc-sub">เลือกปี พ.ศ. ที่ต้องการจัดทำเอกสารตรวจสอบความปลอดภัยระบบไฟฟ้า</p>
            </div>

            <div className="ypc-body">
              <div className="field">
                <label style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-primary)', display: 'block', marginBottom: 8 }}>
                  ประจำปี พ.ศ. (ปี ค.ศ.)
                </label>
                <select
                  className="ypc-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {availableYears.map((yr) => {
                    const bYear = yr + 543;
                    const hasRec = allElecRecords.some((r) => r.date?.startsWith(String(yr)));
                    return (
                      <option key={yr} value={yr}>
                        พ.ศ. {bYear} ({yr}){hasRec ? ' · [มีข้อมูลแล้ว 📝]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Dynamic Status Preview Box */}
              {(() => {
                const match = allElecRecords.find((r) => r.date?.startsWith(String(selectedYear)));
                const prior = allElecRecords
                  .map((r) => ({ ...r, year: parseInt(r.date?.slice(0, 4)) }))
                  .filter((r) => !isNaN(r.year) && r.year < selectedYear)
                  .sort((a, b) => b.year - a.year)[0];

                if (match) {
                  return (
                    <div className="ypc-status ypc-status--has-data">
                      <div className="ypc-status-tag ypc-status-tag--amber">📌 มีบันทึกในระบบแล้ว</div>
                      <div className="ypc-status-txt">
                        มีรายงานปี พ.ศ. {selectedYear + 543} อยู่แล้ว ({match.date})
                        <br />
                        เมื่อกดดำเนินการต่อ คุณสามารถเลือก <strong>เข้าไปแก้ไขข้อมูลเดิม</strong> หรือ <strong>สร้างใหม่</strong> หรือ <strong>ใช้ข้อมูลปีก่อนเป็นแม่แบบ</strong>
                      </div>
                    </div>
                  );
                }
                if (prior) {
                  const priorYr = parseInt(prior.date?.slice(0, 4)) || prior.year;
                  return (
                    <div className="ypc-status ypc-status--has-prior">
                      <div className="ypc-status-tag ypc-status-tag--blue">💡 พบข้อมูลปีก่อนหน้า</div>
                      <div className="ypc-status-txt">
                        มีข้อมูลอุปกรณ์ปี พ.ศ. {priorYr + 543} สามารถดึงมาเป็นแม่แบบเริ่มต้นได้
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="ypc-status ypc-status--fresh">
                    <div className="ypc-status-tag ypc-status-tag--green">✨ รายงานฉบับใหม่</div>
                    <div className="ypc-status-txt">
                      ยังไม่มีรายงานของปีนี้ จะเป็นการสร้างแบบฟอร์มเปล่าใหม่
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                className="ypc-btn-proceed"
                onClick={() => handleProceedFromYearSelect(selectedYear)}
              >
                ดำเนินการต่อ ›
              </button>
            </div>
          </div>

          {/* List of Existing Reports in System */}
          {allElecRecords.length > 0 && (
            <div className="existing-reports-card">
              <h3 className="erc-title">📋 รายการรายงานที่มีอยู่ในระบบ ({allElecRecords.length} ฉบับ)</h3>
              <div className="erc-list">
                {allElecRecords.map((rec, i) => {
                  const yr = parseInt(rec.date?.slice(0, 4)) || 0;
                  return (
                    <div key={i} className="erc-item">
                      <div className="erc-item-info">
                        <span className="erc-year">พ.ศ. {yr + 543}</span>
                        <span className="erc-date">ตรวจเมื่อ: {rec.date}</span>
                        {rec.building && <span className="erc-bld">{rec.building}</span>}
                      </div>
                      <button
                        type="button"
                        className="erc-item-btn"
                        onClick={() => handleUseExisting({ year: yr, record: rec })}
                      >
                        ✏️ เปิดแก้ไข
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Header */}
          <header className="elec-hdr">
            <div className="elec-hdr__left">
              <button
                type="button"
                className="btn-back"
                onClick={() => {
                  if (!urlIsEdit) {
                    setPageStep(0);
                  } else {
                    router.push('/');
                  }
                }}
              >
                ‹ {!urlIsEdit ? 'เปลี่ยนปี' : 'หน้าหลัก'}
              </button>
              <div>
                <h1 className="elec-hdr__title">⚡ ตรวจสอบบริภัณฑ์ไฟฟ้าประจำปี</h1>
                <p className="elec-hdr__sub">แบบฟอร์ม ESPSIB001 · กรมสวัสดิการและคุ้มครองแรงงาน</p>
              </div>
            </div>
            <div className="elec-hdr__right">
              {hasDraft && !isEditMode && (
                <button className="btn-draft-clear" onClick={clearDraft} title="ล้างข้อมูลร่าง">
                  🗑 ล้างร่าง
                </button>
              )}
              <button
                type="button"
                className="btn-preview-link"
                onClick={() => setShowPreviewModal(true)}
                title="ดูตัวอย่างรายงานฉบับเต็ม"
              >
                📄 ดูตัวอย่างรายงาน
              </button>
            </div>
          </header>

      {/* ── Year Selector & Report Status Bar ── */}
      <div className="elec-year-bar">
        <div className="elec-year-bar__left">
          <label className="year-label" htmlFor="elec-year-select">
            <span className="year-icon">📅</span>
            <span className="year-text">เล่มรายงานประจำปี:</span>
          </label>
          <div className="year-select-wrap">
            <select
              id="elec-year-select"
              className="elec-year-select"
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
            >
              {availableYears.map((yr) => {
                const bYear = yr + 543;
                const hasRec = allElecRecords.some((r) => r.date?.startsWith(String(yr)));
                return (
                  <option key={yr} value={yr}>
                    พ.ศ. {bYear} ({yr}){hasRec ? ' ✓ มีข้อมูลในระบบ' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="elec-year-bar__right">
          {isEditMode ? (
            <span className="year-mode-pill year-mode-pill--edit">
              ✏️ กำลังแก้ไขรายงานปี พ.ศ. {selectedYear + 543}
            </span>
          ) : (
            <span className="year-mode-pill year-mode-pill--new">
              ✨ รายงานฉบับใหม่ปี พ.ศ. {selectedYear + 543}
            </span>
          )}
          {prefilledFrom && (
            <span className="year-mode-pill year-mode-pill--tmpl">
              📋 เทมเพลตจาก: {prefilledFrom}
            </span>
          )}
        </div>
      </div>

      {/* Step Navigation Bar */}
      <nav className="step-nav">
        {steps.map((s) => (
          <button
            key={s.num}
            className={`step-nav__item ${step === s.num ? 'step-nav__item--active' : ''} ${step > s.num ? 'step-nav__item--done' : ''}`}
            onClick={() => setStep(s.num)}
          >
            <span className="step-nav__badge">{step > s.num ? '✓' : s.num}</span>
            <div className="step-nav__label">
              <span className="step-nav__name">{s.title}</span>
              <span className="step-nav__sub">{s.sub}</span>
            </div>
          </button>
        ))}
      </nav>

      {validationError && (
        <div className="alert alert--err">
          <span>⚠ {validationError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="alert alert--success">
          <span>✓ บันทึกข้อมูลเรียบร้อยแล้ว กำลังกลับหน้าหลัก...</span>
        </div>
      )}

      {/* ── STEP 1: ข้อมูลผู้ตรวจสอบ & สถานประกอบการ (หน้า 2) ── */}
      {step === 1 && (
        <section className="form-section">
          <div className="card-box">
            <h2 className="card-box__title">👨‍💼 1. ข้อมูลวิศวกรผู้ตรวจสอบ</h2>
            <div className="field-grid">
              <div className="field">
                <label>ชื่อ - สกุล วิศวกรผู้ตรวจสอบ <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="นาย / นาง / นางสาว ..."
                  value={data.inspector.name}
                  onChange={(e) => updateInspector('name', e.target.value)}
                />
              </div>
              <div className="field field--sm">
                <label>อายุ (ปี)</label>
                <input
                  type="number"
                  placeholder="เช่น 35"
                  value={data.inspector.age}
                  onChange={(e) => updateInspector('age', e.target.value)}
                />
              </div>
              <div className="field">
                <label>เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={data.inspector.phone}
                  onChange={(e) => updateInspector('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="field-grid field-grid--3">
              <div className="field">
                <label>ที่อยู่เลขที่</label>
                <input type="text" value={data.inspector.address} onChange={(e) => updateInspector('address', e.target.value)} />
              </div>
              <div className="field">
                <label>หมู่ที่</label>
                <input type="text" value={data.inspector.moo} onChange={(e) => updateInspector('moo', e.target.value)} />
              </div>
              <div className="field">
                <label>ตรอก/ซอย</label>
                <input type="text" value={data.inspector.soi} onChange={(e) => updateInspector('soi', e.target.value)} />
              </div>
              <div className="field">
                <label>ถนน</label>
                <input type="text" value={data.inspector.road} onChange={(e) => updateInspector('road', e.target.value)} />
              </div>
              <div className="field">
                <label>แขวง/ตำบล</label>
                <input type="text" value={data.inspector.subdistrict} onChange={(e) => updateInspector('subdistrict', e.target.value)} />
              </div>
              <div className="field">
                <label>เขต/อำเภอ</label>
                <input type="text" value={data.inspector.district} onChange={(e) => updateInspector('district', e.target.value)} />
              </div>
              <div className="field">
                <label>จังหวัด</label>
                <input type="text" value={data.inspector.province} onChange={(e) => updateInspector('province', e.target.value)} />
              </div>
            </div>

            <hr className="divider" />

            <h3 className="sub-title">ใบอนุญาตประกอบวิชาชีพวิศวกรรมควบคุม</h3>
            <div className="field-grid field-grid--3">
              <div className="field">
                <label>ระดับใบอนุญาต</label>
                <select value={data.inspector.licenseLevel} onChange={(e) => updateInspector('licenseLevel', e.target.value)}>
                  <option value="ภาคีวิศวกร">ภาคีวิศวกร</option>
                  <option value="สามัญวิศวกร">สามัญวิศวกร</option>
                  <option value="วุฒิวิศวกร">วุฒิวิศวกร</option>
                  <option value="ภาคีวิศวกรพิเศษ">ภาคีวิศวกรพิเศษ</option>
                </select>
              </div>
              <div className="field">
                <label>สาขาวิศวกรรม / แขนง</label>
                <input type="text" value={data.inspector.licenseBranch} onChange={(e) => updateInspector('licenseBranch', e.target.value)} />
              </div>
              <div className="field">
                <label>เลขทะเบียน</label>
                <input type="text" placeholder="เช่น ภฟก. XXXXX" value={data.inspector.licenseNo} onChange={(e) => updateInspector('licenseNo', e.target.value)} />
              </div>
              <div className="field">
                <label>ตั้งแต่วันที่</label>
                <input type="date" value={data.inspector.licenseStart} onChange={(e) => updateInspector('licenseStart', e.target.value)} />
              </div>
              <div className="field">
                <label>ถึงวันที่</label>
                <input type="date" value={data.inspector.licenseEnd} onChange={(e) => updateInspector('licenseEnd', e.target.value)} />
              </div>
            </div>

            <div className="radio-group-box">
              <label className="radio-opt">
                <input
                  type="radio"
                  name="certType"
                  checked={data.inspector.certType === 'sec9'}
                  onChange={() => updateInspector('certType', 'sec9')}
                />
                <span>ได้ขึ้นทะเบียนตามมาตรา ๙</span>
              </label>
              <label className="radio-opt">
                <input
                  type="radio"
                  name="certType"
                  checked={data.inspector.certType === 'sec11'}
                  onChange={() => updateInspector('certType', 'sec11')}
                />
                <span>ได้รับใบอนุญาตตามมาตรา ๑๑ (ในนามนิติบุคคล)</span>
              </label>
            </div>

            {data.inspector.certType === 'sec11' && (
              <div className="field">
                <label>ในนามนิติบุคคล</label>
                <input
                  type="text"
                  placeholder="ระบุชื่อบริษัท / นิติบุคคล..."
                  value={data.inspector.juristicName}
                  onChange={(e) => updateInspector('juristicName', e.target.value)}
                />
              </div>
            )}

            <div className="field-grid field-grid--3">
              <div className="field">
                <label>ทะเบียนหรือใบอนุญาตเลขที่</label>
                <input type="text" value={data.inspector.certNo} onChange={(e) => updateInspector('certNo', e.target.value)} />
              </div>
              <div className="field">
                <label>ตั้งแต่วันที่</label>
                <input type="date" value={data.inspector.certStart} onChange={(e) => updateInspector('certStart', e.target.value)} />
              </div>
              <div className="field">
                <label>ถึงวันที่</label>
                <input type="date" value={data.inspector.certEnd} onChange={(e) => updateInspector('certEnd', e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <SignaturePad
                label="ลายเซ็นวิศวกรผู้ตรวจสอบ"
                value={data.inspector.signature}
                onChange={(sig) => updateInspector('signature', sig)}
              />
            </div>
          </div>

          <div className="card-box" style={{ marginTop: 20 }}>
            <h2 className="card-box__title">🏢 2. ข้อมูลสถานประกอบกิจการ</h2>
            <div className="field-grid">
              <div className="field">
                <label>ชื่อสถานประกอบกิจการ <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น บริษัท ตัวอย่าง จำกัด / อาคาร..."
                  value={data.workplace.name}
                  onChange={(e) => updateWorkplace('name', e.target.value)}
                />
              </div>
              <div className="field">
                <label>ประกอบกิจการ</label>
                <input
                  type="text"
                  placeholder="เช่น อาคารสำนักงาน, โรงงานผลิต..."
                  value={data.workplace.businessType}
                  onChange={(e) => updateWorkplace('businessType', e.target.value)}
                />
              </div>
              <div className="field">
                <label>ชื่อนายจ้าง / ผู้กระทำแทน</label>
                <input
                  type="text"
                  value={data.workplace.employerName}
                  onChange={(e) => updateWorkplace('employerName', e.target.value)}
                />
              </div>
            </div>

            <div className="field-grid field-grid--3">
              <div className="field">
                <label>ตั้งอยู่เลขที่</label>
                <input type="text" value={data.workplace.address} onChange={(e) => updateWorkplace('address', e.target.value)} />
              </div>
              <div className="field">
                <label>หมู่ที่</label>
                <input type="text" value={data.workplace.moo} onChange={(e) => updateWorkplace('moo', e.target.value)} />
              </div>
              <div className="field">
                <label>ตรอก/ซอย</label>
                <input type="text" value={data.workplace.soi} onChange={(e) => updateWorkplace('soi', e.target.value)} />
              </div>
              <div className="field">
                <label>ถนน</label>
                <input type="text" value={data.workplace.road} onChange={(e) => updateWorkplace('road', e.target.value)} />
              </div>
              <div className="field">
                <label>แขวง/ตำบล</label>
                <input type="text" value={data.workplace.subdistrict} onChange={(e) => updateWorkplace('subdistrict', e.target.value)} />
              </div>
              <div className="field">
                <label>เขต/อำเภอ</label>
                <input type="text" value={data.workplace.district} onChange={(e) => updateWorkplace('district', e.target.value)} />
              </div>
              <div className="field">
                <label>จังหวัด</label>
                <input type="text" value={data.workplace.province} onChange={(e) => updateWorkplace('province', e.target.value)} />
              </div>
              <div className="field">
                <label>โทรศัพท์</label>
                <input type="tel" value={data.workplace.phone} onChange={(e) => updateWorkplace('phone', e.target.value)} />
              </div>
              <div className="field">
                <label>วันที่ทำการตรวจสอบ</label>
                <input type="date" value={data.workplace.inspectionDate} onChange={(e) => updateWorkplace('inspectionDate', e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <SignaturePad
                label="ลายเซ็นนายจ้าง / ผู้กระทำแทน"
                value={data.workplace.employerSignature}
                onChange={(sig) => updateWorkplace('employerSignature', sig)}
              />
            </div>
          </div>

          <div className="step-actions">
            <button className="btn-primary" onClick={() => setStep(2)}>
              ถัดไป: ข้อมูลทั่วไป ›
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 2: ข้อมูลทั่วไปของระบบไฟฟ้า (หน้า 3 ส่วนที่ 1) ── */}
      {step === 2 && (
        <section className="form-section">
          <div className="card-box">
            <h2 className="card-box__title">๑. ข้อมูลทั่วไปของระบบไฟฟ้า</h2>
            
            <div className="field-group">
              <label className="group-label">ระบบไฟฟ้าที่ใช้ในสถานประกอบกิจการ</label>
              <div className="field-grid field-grid--3">
                <div className="field">
                  <label>แรงดัน (โวลต์ / V)</label>
                  <input type="text" value={data.general.voltage} onChange={(e) => updateGeneral('voltage', e.target.value)} />
                </div>
                <div className="field">
                  <label>เฟส (Phase)</label>
                  <input type="text" value={data.general.phase} onChange={(e) => updateGeneral('phase', e.target.value)} />
                </div>
                <div className="field">
                  <label>สาย (Wires)</label>
                  <input type="text" value={data.general.wires} onChange={(e) => updateGeneral('wires', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="group-label">ขนาดเครื่องวัดหน่วยไฟฟ้า (Meter)</label>
              <div className="field-grid field-grid--3">
                <div className="field">
                  <label>ขนาดกระแส (แอมแปร์ / A)</label>
                  <input type="text" value={data.general.meterAmp} onChange={(e) => updateGeneral('meterAmp', e.target.value)} />
                </div>
                <div className="field">
                  <label>แรงดัน (โวลต์ / V)</label>
                  <input type="text" value={data.general.meterVolt} onChange={(e) => updateGeneral('meterVolt', e.target.value)} />
                </div>
                <div className="field">
                  <label>เฟส (Phase)</label>
                  <input type="text" value={data.general.meterPhase} onChange={(e) => updateGeneral('meterPhase', e.target.value)} />
                </div>
                <div className="field">
                  <label>สาย (Wires)</label>
                  <input type="text" value={data.general.meterWires} onChange={(e) => updateGeneral('meterWires', e.target.value)} />
                </div>
                <div className="field field--span2">
                  <label>หมายเลขเครื่องวัด (Meter No.)</label>
                  <input type="text" value={data.general.meterNo} onChange={(e) => updateGeneral('meterNo', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="field-grid field-grid--2">
              <div className="field">
                <label>ปริมาณการใช้พลังไฟฟ้าสูงสุดในรอบ ๑๒ เดือนที่ผ่านมา (กิโลวัตต์ / kW)</label>
                <input type="text" value={data.general.peakKw12Months} onChange={(e) => updateGeneral('peakKw12Months', e.target.value)} />
              </div>
            </div>

            <div className="field-grid field-grid--2">
              <div className="field-group-inline">
                <label className="group-label">หม้อแปลงกำลัง</label>
                <div className="field-row">
                  <input
                    type="number"
                    placeholder="จำนวนเครื่อง"
                    value={data.general.transformerCount}
                    onChange={(e) => updateGeneral('transformerCount', e.target.value)}
                  />
                  <span>เครื่อง</span>
                  <input
                    type="text"
                    placeholder="รวม kVA"
                    value={data.general.transformerTotalKva}
                    onChange={(e) => updateGeneral('transformerTotalKva', e.target.value)}
                  />
                  <span>เควีเอ</span>
                </div>
              </div>

              <div className="field-group-inline">
                <label className="group-label">เครื่องกำเนิดไฟฟ้า / สำรอง (Generator)</label>
                <div className="field-row">
                  <input
                    type="number"
                    placeholder="จำนวนเครื่อง"
                    value={data.general.generatorCount}
                    onChange={(e) => updateGeneral('generatorCount', e.target.value)}
                  />
                  <span>เครื่อง</span>
                  <input
                    type="text"
                    placeholder="รวม kVA"
                    value={data.general.generatorTotalKva}
                    onChange={(e) => updateGeneral('generatorTotalKva', e.target.value)}
                  />
                  <span>เควีเอ</span>
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="group-label">ผู้รับผิดชอบระบบไฟฟ้า</label>
              <div className="field-grid field-grid--2">
                <div className="field">
                  <label>๑. ชื่อ - สกุล</label>
                  <input
                    type="text"
                    value={data.general.responsiblePerson1.name}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        general: { ...d.general, responsiblePerson1: { ...d.general.responsiblePerson1, name: e.target.value } },
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>ตำแหน่ง</label>
                  <input
                    type="text"
                    value={data.general.responsiblePerson1.position}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        general: { ...d.general, responsiblePerson1: { ...d.general.responsiblePerson1, position: e.target.value } },
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>๒. ชื่อ - สกุล</label>
                  <input
                    type="text"
                    value={data.general.responsiblePerson2.name}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        general: { ...d.general, responsiblePerson2: { ...d.general.responsiblePerson2, name: e.target.value } },
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>ตำแหน่ง</label>
                  <input
                    type="text"
                    value={data.general.responsiblePerson2.position}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        general: { ...d.general, responsiblePerson2: { ...d.general.responsiblePerson2, position: e.target.value } },
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="group-label">แบบการติดตั้งระบบไฟฟ้าจริง (As-built Drawing)</label>
              <div className="radio-group-box">
                <label className="radio-opt">
                  <input
                    type="radio"
                    name="asBuiltDrawing"
                    checked={data.general.asBuiltDrawing === 'yes'}
                    onChange={() => updateGeneral('asBuiltDrawing', 'yes')}
                  />
                  <span>มี</span>
                </label>
                <label className="radio-opt">
                  <input
                    type="radio"
                    name="asBuiltDrawing"
                    checked={data.general.asBuiltDrawing === 'no'}
                    onChange={() => updateGeneral('asBuiltDrawing', 'no')}
                  />
                  <span>ไม่มี</span>
                </label>
              </div>
              {data.general.asBuiltDrawing === 'no' && (
                <div className="field" style={{ marginTop: 8 }}>
                  <label>ระบุเหตุผลที่ไม่มีแบบ As-built</label>
                  <input
                    type="text"
                    placeholder="เช่น อยู่ระหว่างปรับปรุงแบบ..."
                    value={data.general.asBuiltReason}
                    onChange={(e) => updateGeneral('asBuiltReason', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>‹ ย้อนกลับ</button>
            <button className="btn-primary" onClick={() => setStep(3)}>ถัดไป: ตรวจสอบอุปกรณ์ ›</button>
          </div>
        </section>
      )}

      {/* ── STEP 3: รายการตรวจสอบอุปกรณ์ (หน้า 3 - 8 ส่วนที่ 2) ── */}
      {step === 3 && (
        <section className="form-section">
          {/* ══ 2.1 ระบบแรงสูง ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๑ ระบบแรงสูง</h2>
                <p className="section-block__sub">สายอากาศ และ เครื่องปลดวงจรต้นทาง</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addHighVoltage}>
                + เพิ่มระบบแรงสูง
              </button>
            </div>

            {data.highVoltageSystems.map((hv, idx) => (
              <div key={hv.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">ชุดที่ {idx + 1}</span>
                  {data.highVoltageSystems.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeHighVoltage(idx)}>
                      🗑 ลบชุดนี้
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px', flexWrap: 'wrap' }}>
                  <h3 className="group-sub-title" style={{ margin: 0 }}>๒.๑.๑ สายอากาศ :</h3>
                  <input
                    type="text"
                    placeholder="ระบุชื่อสายอากาศ / วงจร / ช่วงเสา..."
                    style={{ flex: 1, minWidth: 200, padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--ink-primary)', fontSize: 13 }}
                    value={hv.aerialName || ''}
                    onChange={(e) => {
                      const arr = [...data.highVoltageSystems];
                      arr[idx].aerialName = e.target.value;
                      setData(d => ({ ...d, highVoltageSystems: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพเสา" item={hv.aerial.pole} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.pole = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- การประกอบอุปกรณ์หัวเสา" item={hv.aerial.poleTop} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.poleTop = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- สายยึดโยง (Guy Wire)" item={hv.aerial.guyWire} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.guyWire = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- การพาดสาย (สภาพสาย ระยะหย่อนยาน)" item={hv.aerial.stringing} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.stringing = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- ระยะห่างของสายกับอาคาร สิ่งก่อสร้าง หรือต้นไม้" item={hv.aerial.clearance} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.clearance = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- การติดตั้งล่อฟ้าและสภาพ" item={hv.aerial.lightning} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.lightning = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- สภาพของจุดต่อสาย" item={hv.aerial.joints} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.joints = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- การต่อลงดินและสภาพ" item={hv.aerial.grounding} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].aerial.grounding = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๑.๒ การติดตั้งเครื่องปลดวงจรต้นทาง (ส่วนของผู้ใช้ไฟ)</h3>
                <ChecklistRow title="- ดรอปฟิวส์คัตเอาท์" item={hv.disconnectors.dropFuse} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].disconnectors.dropFuse = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- สวิตช์ตัดตอน (Disconnecting Switch)" item={hv.disconnectors.disconnectSwitch} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].disconnectors.disconnectSwitch = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <ChecklistRow title="- RMU" item={hv.disconnectors.rmu} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].disconnectors.rmu = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
                <div className="field" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="อื่นๆ (ระบุอุปกรณ์เพิ่มเติม)..."
                    value={hv.disconnectors.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.highVoltageSystems]; arr[idx].disconnectors.otherText = e.target.value; setData(d => ({ ...d, highVoltageSystems: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพอุปกรณ์ปลดวงจรอื่นๆ" item={hv.disconnectors.other} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].disconnectors.other = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๑.๓ อื่นๆ</h3>
                <div className="field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="ระบุรายการอื่นๆ ในระบบแรงสูง..."
                    value={hv.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.highVoltageSystems]; arr[idx].otherText = e.target.value; setData(d => ({ ...d, highVoltageSystems: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- รายการแรงสูงอื่นๆ" item={hv.other} onChange={(it) => {
                  const arr = [...data.highVoltageSystems]; arr[idx].other = it; setData(d => ({ ...d, highVoltageSystems: arr }));
                }} />
              </div>
            ))}
          </div>

          {/* ══ 2.2 หม้อแปลงไฟฟ้า ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๒ หม้อแปลงไฟฟ้า (Transformer)</h2>
                <p className="section-block__sub">รายละเอียดและสภาพหม้อแปลงไฟฟ้า</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addTransformer}>
                + เพิ่มหม้อแปลง
              </button>
            </div>

            {data.transformers.map((tf, idx) => (
              <div key={tf.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">หม้อแปลงลูกที่ {tf.no || idx + 1}</span>
                  {data.transformers.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeTransformer(idx)}>
                      🗑 ลบหม้อแปลงลูกนี้
                    </button>
                  )}
                </div>

                <div className="field-grid field-grid--3">
                  <div className="field">
                    <label>หม้อแปลงลูกที่</label>
                    <input
                      type="text"
                      value={tf.no}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].no = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>ขนาด (kVA)</label>
                    <input
                      type="text"
                      value={tf.kva}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].kva = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>แรงดัน (V)</label>
                    <input
                      type="text"
                      value={tf.voltage}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].voltage = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>% Impedance Voltage</label>
                    <input
                      type="text"
                      value={tf.impedance}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].impedance = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>ชนิดหม้อแปลง</label>
                    <select
                      value={tf.type}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].type = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    >
                      <option value="Oil">Oil (น้ำมัน)</option>
                      <option value="Dry">Dry Type (แห้ง)</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>ลักษณะการติดตั้ง</label>
                    <select
                      value={tf.installType}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].installType = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    >
                      <option value="sitting">นั่งร้าน</option>
                      <option value="hanging">แบบแขวน</option>
                      <option value="yard">ลานหม้อแปลง</option>
                      <option value="room">ในห้องหม้อแปลง</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                <div className="field-grid field-grid--2" style={{ marginTop: 8 }}>
                  <div className="field">
                    <label>เครื่องป้องกันกระแสเกินด้านไฟเข้า (แบบ)</label>
                    <input
                      type="text"
                      placeholder="เช่น ดรอปฟิวส์, เซอร์กิตเบรกเกอร์..."
                      value={tf.primaryProtection.type}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].primaryProtection.type = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>พิกัดกระแส (A)</label>
                    <input
                      type="text"
                      placeholder="เช่น 100 A"
                      value={tf.primaryProtection.amp}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].primaryProtection.amp = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>รายการตรวจสอบสภาพหม้อแปลง</h3>
                <ChecklistRow title="๒.๒.๔ การต่อสายแรงต่ำและแรงสูงที่หม้อแปลง" item={tf.items.wiring} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.wiring = it; setData(d => ({ ...d, transformers: arr }));
                }} />
                <ChecklistRow title="๒.๒.๕ การติดตั้งล่อฟ้าแรงสูง (Lightning Arrester)" item={tf.items.lightningArrester} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.lightningArrester = it; setData(d => ({ ...d, transformers: arr }));
                }} />
                <ChecklistRow title="๒.๒.๖ การติดตั้งดรอปฟิวส์คัตเอาท์" item={tf.items.dropFuse} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.dropFuse = it; setData(d => ({ ...d, transformers: arr }));
                }} />
                <ChecklistRow title="๒.๒.๗ การป้องกันการสัมผัสส่วนที่มีไฟฟ้า" item={tf.items.touchProtection} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.touchProtection = it; setData(d => ({ ...d, transformers: arr }));
                }} />
                <ChecklistRow title="๒.๒.๘ สายดินกับตัวถังหม้อแปลงและล่อฟ้าแรงสูง" item={tf.items.bodyGround} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.bodyGround = it; setData(d => ({ ...d, transformers: arr }));
                }} />

                <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 10, margin: '8px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>๒.๒.๙ สายดินของหม้อแปลง</span>
                  <div className="field-row" style={{ margin: '8px 0' }}>
                    <input
                      type="text"
                      placeholder="ชนิดสายต่อหลักดิน..."
                      value={tf.items.groundRod.wireType || ''}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].items.groundRod.wireType = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="ขนาด (mm²)..."
                      value={tf.items.groundRod.wireSize || ''}
                      onChange={(e) => {
                        const arr = [...data.transformers]; arr[idx].items.groundRod.wireSize = e.target.value; setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                  <ChecklistRow title="- สภาพหลักดิน จุดต่อ และสายดิน" item={tf.items.groundRod} onChange={(it) => {
                    const arr = [...data.transformers];
                    arr[idx].items.groundRod = { ...arr[idx].items.groundRod, ...it };
                    setData(d => ({ ...d, transformers: arr }));
                  }} />
                </div>

                <ChecklistRow title="๒.๒.๑๐ สภาพภายนอกหม้อแปลง (สารดูดความชื้น, บุชชิ่ง, รั่วซึม, อุณหภูมิ)" item={tf.items.externalCondition} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.externalCondition = it; setData(d => ({ ...d, transformers: arr }));
                }} />
                <ChecklistRow title="๒.๒.๑๑ สภาพแวดล้อมหม้อแปลง (การระบายอากาศ, ความชื้น, รั้วกั้น, สภาพทั่วไป)" item={tf.items.environment} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.environment = it; setData(d => ({ ...d, transformers: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๒.๑๒ อื่นๆ</h3>
                <div className="field" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="๒.๒.๑๒ อื่นๆ (ระบุ)..."
                    value={tf.items.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.transformers]; arr[idx].items.otherText = e.target.value; setData(d => ({ ...d, transformers: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพรายการอื่นๆ" item={tf.items.other} onChange={(it) => {
                  const arr = [...data.transformers]; arr[idx].items.other = it; setData(d => ({ ...d, transformers: arr }));
                }} />
              </div>
            ))}
          </div>

          {/* ══ 2.3 ตู้เมนสวิตช์ MDB ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๓ ตู้เมนสวิตช์ (Main Switchboard - MDB)</h2>
                <p className="section-block__sub">การติดตั้ง, เครื่องป้องกัน, บัสบาร์ และสายดิน</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addMainSwitchboard}>
                + เพิ่มตู้เมนสวิตช์
              </button>
            </div>

            {data.mainSwitchboards.map((msb, idx) => (
              <div key={msb.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">ตู้เมนสวิตช์ที่ {msb.no || idx + 1}</span>
                  {data.mainSwitchboards.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeMainSwitchboard(idx)}>
                      🗑 ลบตู้นี้
                    </button>
                  )}
                </div>

                <div className="field-grid field-grid--3">
                  <div className="field">
                    <label>ตู้เมนสวิตช์ที่</label>
                    <input
                      type="text"
                      value={msb.no}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].no = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>รับจากหม้อแปลงที่</label>
                    <select
                      value={msb.sourceTransformer || (data.transformers[0]?.no || '1')}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards];
                        arr[idx].sourceTransformer = e.target.value;
                        setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    >
                      {data.transformers.map((tf, tIdx) => {
                        const val = tf.no || `${tIdx + 1}`;
                        const label = tf.kva ? `หม้อแปลงลูกที่ ${val} (${tf.kva} kVA)` : `หม้อแปลงลูกที่ ${val}`;
                        return (
                          <option key={tf.id || tIdx} value={val}>
                            {label}
                          </option>
                        );
                      })}
                      {msb.sourceTransformer && !data.transformers.some((tf, tIdx) => (tf.no || `${tIdx + 1}`) === String(msb.sourceTransformer)) && (
                        <option value={msb.sourceTransformer}>
                          หม้อแปลงลูกที่ {msb.sourceTransformer}
                        </option>
                      )}
                    </select>
                  </div>
                  <div className="field">
                    <label>ลักษณะการติดตั้ง</label>
                    <select
                      value={msb.locationType}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].locationType = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    >
                      <option value="indoor">ภายในอาคาร</option>
                      <option value="outdoor">ภายนอกอาคาร</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 14 }}>๒.๓.๑ รายการตรวจสอบสภาพตู้</h3>
                <ChecklistRow title="- สภาพทั่วไป" item={msb.items.generalCondition} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.generalCondition = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- จุดต่อสายและจุดต่อบัสบาร์" item={msb.items.busbarJoints} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.busbarJoints = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งตู้เมนสวิตช์" item={msb.items.workingSpace} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.workingSpace = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน" item={msb.items.lighting} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.lighting = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- การต่อฝาก (Bonding)" item={msb.items.bonding} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.bonding = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- การป้องกันส่วนสัมผัสที่มีไฟฟ้า" item={msb.items.livePartProtection} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.livePartProtection = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
                <ChecklistRow title="- ป้ายชื่อและแผนภาพเส้นเดี่ยว (Single Line Diagram) ของเมนสวิตช์" item={msb.items.singleLineDiagram} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].items.singleLineDiagram = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๒ เครื่องป้องกันกระแสเกิน</h3>
                <div className="field-grid field-grid--3">
                  <div className="field">
                    <label>ชนิด</label>
                    <input
                      type="text"
                      placeholder="เช่น ACB, MCCB..."
                      value={msb.overcurrentProtection.type}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].overcurrentProtection.type = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>IC (kA)</label>
                    <input
                      type="text"
                      value={msb.overcurrentProtection.icKa}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].overcurrentProtection.icKa = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>แรงดัน (V)</label>
                    <input
                      type="text"
                      value={msb.overcurrentProtection.volt}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].overcurrentProtection.volt = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>พิกัดกระแส AT (A)</label>
                    <input
                      type="text"
                      value={msb.overcurrentProtection.atAmp}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].overcurrentProtection.atAmp = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>AF (A)</label>
                    <input
                      type="text"
                      value={msb.overcurrentProtection.afAmp}
                      onChange={(e) => {
                        const arr = [...data.mainSwitchboards]; arr[idx].overcurrentProtection.afAmp = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                      }}
                    />
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๓ สายดินของแผงสวิตช์</h3>
                <div className="field-row" style={{ margin: '8px 0' }}>
                  <input
                    type="text"
                    placeholder="ชนิดสายต่อหลักดิน..."
                    value={msb.grounding.wireType || ''}
                    onChange={(e) => {
                      const arr = [...data.mainSwitchboards]; arr[idx].grounding.wireType = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                    }}
                  />
                  <input
                    type="text"
                    placeholder="ขนาด (mm²)..."
                    value={msb.grounding.wireSize || ''}
                    onChange={(e) => {
                      const arr = [...data.mainSwitchboards]; arr[idx].grounding.wireSize = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพหลักดิน จุดต่อ และสายดิน" item={msb.grounding} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].grounding = { ...arr[idx].grounding, ...it }; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />

                <div className="field" style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700 }}>๒.๓.๔ อุณหภูมิของอุปกรณ์</label>
                  <div className="radio-group-box">
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_msb_${idx}`}
                        checked={msb.temperature === 'normal'}
                        onChange={() => {
                          const arr = [...data.mainSwitchboards]; arr[idx].temperature = 'normal'; setData(d => ({ ...d, mainSwitchboards: arr }));
                        }}
                      />
                      <span>✓ ปกติ</span>
                    </label>
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_msb_${idx}`}
                        checked={msb.temperature === 'abnormal'}
                        onChange={() => {
                          const arr = [...data.mainSwitchboards]; arr[idx].temperature = 'abnormal'; setData(d => ({ ...d, mainSwitchboards: arr }));
                        }}
                      />
                      <span>✕ ผิดปกติ</span>
                    </label>
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๕ อื่นๆ</h3>
                <div className="field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="๒.๓.๕ อื่นๆ (ระบุ)..."
                    value={msb.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.mainSwitchboards]; arr[idx].otherText = e.target.value; setData(d => ({ ...d, mainSwitchboards: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- รายการตู้เมนสวิตช์อื่นๆ" item={msb.other} onChange={(it) => {
                  const arr = [...data.mainSwitchboards]; arr[idx].other = it; setData(d => ({ ...d, mainSwitchboards: arr }));
                }} />
              </div>
            ))}
          </div>

          {/* ══ 2.4.1 วงจรเมน (Main Circuit) ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๔.๑ วงจรเมน (Main Circuit)</h2>
                <p className="section-block__sub">สายเข้าเมนสวิตช์, รางเดินสาย, ฉนวน</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addMainCircuit}>
                + เพิ่มวงจรเมน
              </button>
            </div>

            {data.mainCircuits.map((mc, idx) => (
              <div key={mc.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">วงจรเมน ชุดที่ {idx + 1}</span>
                  {data.mainCircuits.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeMainCircuit(idx)}>
                      🗑 ลบวงจรนี้
                    </button>
                  )}
                </div>

                <h3 className="group-sub-title">๒.๔.๑.๑ สายเข้าเมนสวิตช์</h3>
                <div className="field-grid field-grid--2">
                  <div className="field">
                    <label>สายเฟส (ชนิด / ขนาด mm²)</label>
                    <div className="field-row">
                      <input
                        type="text"
                        placeholder="ชนิดสาย เช่น NYY..."
                        value={mc.phaseWire.type}
                        onChange={(e) => {
                          const arr = [...data.mainCircuits]; arr[idx].phaseWire.type = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                      <input
                        type="text"
                        placeholder="ขนาด mm²..."
                        value={mc.phaseWire.size}
                        onChange={(e) => {
                          const arr = [...data.mainCircuits]; arr[idx].phaseWire.size = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>สายนิวทรัล (ชนิด / ขนาด mm²)</label>
                    <div className="field-row">
                      <input
                        type="text"
                        placeholder="ชนิดสาย..."
                        value={mc.neutralWire.type}
                        onChange={(e) => {
                          const arr = [...data.mainCircuits]; arr[idx].neutralWire.type = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                      <input
                        type="text"
                        placeholder="ขนาด mm²..."
                        value={mc.neutralWire.size}
                        onChange={(e) => {
                          const arr = [...data.mainCircuits]; arr[idx].neutralWire.size = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginTop: 8 }}>
                  <label>วิธีเดินสาย (เดินใน)</label>
                  <select
                    value={mc.raceway}
                    onChange={(e) => {
                      const arr = [...data.mainCircuits]; arr[idx].raceway = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                    }}
                  >
                    <option value="conduit">ท่อร้อยสาย (Conduit)</option>
                    <option value="wireway">รางเดินสาย (Wire Way)</option>
                    <option value="cabletray">รางเคเบิล (Cable Tray)</option>
                    <option value="rack">ลูกถ้วยราวยึดสาย (Rack)</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 14 }}>รายการตรวจสอบ</h3>
                <ChecklistRow title="๒.๔.๑.๒ รางเดินสายและรางเคเบิล (การติดตั้ง, ความต่อเนื่องทางไฟฟ้า, การต่อฝาก)" item={mc.items.racewayCondition} onChange={(it) => {
                  const arr = [...data.mainCircuits]; arr[idx].items.racewayCondition = it; setData(d => ({ ...d, mainCircuits: arr }));
                }} />
                <ChecklistRow title="๒.๔.๑.๓ สภาพฉนวนสายไฟ" item={mc.items.insulation} onChange={(it) => {
                  const arr = [...data.mainCircuits]; arr[idx].items.insulation = it; setData(d => ({ ...d, mainCircuits: arr }));
                }} />
                <ChecklistRow title="๒.๔.๑.๔ สภาพจุดต่อของสาย" item={mc.items.joints} onChange={(it) => {
                  const arr = [...data.mainCircuits]; arr[idx].items.joints = it; setData(d => ({ ...d, mainCircuits: arr }));
                }} />
                <ChecklistRow title="๒.๔.๑.๕ การป้องกันความร้อนจากการเหนี่ยวนำ" item={mc.items.inductionHeatProtection} onChange={(it) => {
                  const arr = [...data.mainCircuits]; arr[idx].items.inductionHeatProtection = it; setData(d => ({ ...d, mainCircuits: arr }));
                }} />

                <div className="field" style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700 }}>๒.๔.๑.๖ อุณหภูมิของอุปกรณ์</label>
                  <div className="radio-group-box">
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_mc_${idx}`}
                        checked={mc.temperature === 'normal'}
                        onChange={() => {
                          const arr = [...data.mainCircuits]; arr[idx].temperature = 'normal'; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                      <span>✓ ปกติ</span>
                    </label>
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_mc_${idx}`}
                        checked={mc.temperature === 'abnormal'}
                        onChange={() => {
                          const arr = [...data.mainCircuits]; arr[idx].temperature = 'abnormal'; setData(d => ({ ...d, mainCircuits: arr }));
                        }}
                      />
                      <span>✕ ผิดปกติ</span>
                    </label>
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๑.๗ อื่นๆ</h3>
                <div className="field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="๒.๔.๑.๗ อื่นๆ (ระบุ)..."
                    value={mc.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.mainCircuits]; arr[idx].otherText = e.target.value; setData(d => ({ ...d, mainCircuits: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- รายการวงจรเมนอื่นๆ" item={mc.other} onChange={(it) => {
                  const arr = [...data.mainCircuits]; arr[idx].other = it; setData(d => ({ ...d, mainCircuits: arr }));
                }} />
              </div>
            ))}
          </div>

          {/* ══ 2.4.2 แผงย่อย (Sub Panel / DB) ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๔.๒ แผงย่อย (Distribution Board - DB)</h2>
                <p className="section-block__sub">แผงวงจรย่อยที่ต่อแยกจากตู้เมนสวิตช์</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addSubPanel}>
                + เพิ่มแผงย่อย
              </button>
            </div>

            {data.subPanels.map((sp, idx) => (
              <div key={sp.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">แผงย่อยที่ {sp.no || idx + 1}</span>
                  {data.subPanels.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeSubPanel(idx)}>
                      🗑 ลบแผงย่อยนี้
                    </button>
                  )}
                </div>

                <div className="field-grid field-grid--3">
                  <div className="field">
                    <label>แผงย่อยที่</label>
                    <input
                      type="text"
                      placeholder="เช่น DB-1, LP-2..."
                      value={sp.no}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].no = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>ตำแหน่ง / พื้นที่ติดตั้ง</label>
                    <input
                      type="text"
                      placeholder="เช่น ชั้น 2 โซน A..."
                      value={sp.location}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].location = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>รับจากตู้เมนสวิตช์ที่</label>
                    <select
                      value={sp.sourceMdb || (data.mainSwitchboards[0]?.no || '1')}
                      onChange={(e) => {
                        const arr = [...data.subPanels];
                        arr[idx].sourceMdb = e.target.value;
                        setData(d => ({ ...d, subPanels: arr }));
                      }}
                    >
                      {data.mainSwitchboards.map((msb, mIdx) => {
                        const val = msb.no || `${mIdx + 1}`;
                        return (
                          <option key={msb.id || mIdx} value={val}>
                            ตู้เมนสวิตช์ที่ {val}
                          </option>
                        );
                      })}
                      {sp.sourceMdb && !data.mainSwitchboards.some((msb, mIdx) => (msb.no || `${mIdx + 1}`) === String(sp.sourceMdb)) && (
                        <option value={sp.sourceMdb}>
                          ตู้เมนสวิตช์ที่ {sp.sourceMdb}
                        </option>
                      )}
                    </select>
                  </div>
                  <div className="field">
                    <label>การติดตั้ง</label>
                    <select
                      value={sp.locationType}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].locationType = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    >
                      <option value="indoor">ภายในอาคาร</option>
                      <option value="outdoor">ภายนอกอาคาร</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 14 }}>๒.๔.๒.๑ รายการตรวจสอบสภาพแผงย่อย</h3>
                <ChecklistRow title="- สภาพทั่วไป" item={sp.items.generalCondition} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.generalCondition = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
                <ChecklistRow title="- จุดต่อสาย และจุดต่อบัสบาร์" item={sp.items.busbarJoints} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.busbarJoints = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
                <ChecklistRow title="- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งแผงย่อย" item={sp.items.workingSpace} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.workingSpace = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
                <ChecklistRow title="- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน" item={sp.items.lighting} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.lighting = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
                <ChecklistRow title="- การต่อฝาก" item={sp.items.bonding} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.bonding = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
                <ChecklistRow title="- การป้องกันส่วนสัมผัสที่มีไฟฟ้า" item={sp.items.livePartProtection} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].items.livePartProtection = it; setData(d => ({ ...d, subPanels: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๒ เครื่องป้องกันกระแสเกินของแผงย่อย</h3>
                <div className="field-grid field-grid--3">
                  <div className="field">
                    <label>ชนิด</label>
                    <input
                      type="text"
                      value={sp.overcurrentProtection.type}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].overcurrentProtection.type = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>IC (kA)</label>
                    <input
                      type="text"
                      value={sp.overcurrentProtection.icKa}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].overcurrentProtection.icKa = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>แรงดัน (V)</label>
                    <input
                      type="text"
                      value={sp.overcurrentProtection.volt}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].overcurrentProtection.volt = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>พิกัดกระแส AT (A)</label>
                    <input
                      type="text"
                      value={sp.overcurrentProtection.atAmp}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].overcurrentProtection.atAmp = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>AF (A)</label>
                    <input
                      type="text"
                      value={sp.overcurrentProtection.afAmp}
                      onChange={(e) => {
                        const arr = [...data.subPanels]; arr[idx].overcurrentProtection.afAmp = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                      }}
                    />
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๓ สายดินของแผงย่อย</h3>
                <div className="field-row" style={{ margin: '8px 0' }}>
                  <input
                    type="text"
                    placeholder="ชนิดสายดิน..."
                    value={sp.grounding.wireType || ''}
                    onChange={(e) => {
                      const arr = [...data.subPanels]; arr[idx].grounding.wireType = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                    }}
                  />
                  <input
                    type="text"
                    placeholder="ขนาด (mm²)..."
                    value={sp.grounding.wireSize || ''}
                    onChange={(e) => {
                      const arr = [...data.subPanels]; arr[idx].grounding.wireSize = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพสายดินและจุดต่อ" item={sp.grounding} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].grounding = { ...arr[idx].grounding, ...it }; setData(d => ({ ...d, subPanels: arr }));
                }} />

                <div className="field" style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700 }}>๒.๔.๒.๔ อุณหภูมิของอุปกรณ์</label>
                  <div className="radio-group-box">
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_sp_${idx}`}
                        checked={sp.temperature === 'normal'}
                        onChange={() => {
                          const arr = [...data.subPanels]; arr[idx].temperature = 'normal'; setData(d => ({ ...d, subPanels: arr }));
                        }}
                      />
                      <span>✓ ปกติ</span>
                    </label>
                    <label className="radio-opt">
                      <input
                        type="radio"
                        name={`temp_sp_${idx}`}
                        checked={sp.temperature === 'abnormal'}
                        onChange={() => {
                          const arr = [...data.subPanels]; arr[idx].temperature = 'abnormal'; setData(d => ({ ...d, subPanels: arr }));
                        }}
                      />
                      <span>✕ ผิดปกติ</span>
                    </label>
                  </div>
                </div>

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๕ อื่นๆ</h3>
                <div className="field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="๒.๔.๒.๕ อื่นๆ (ระบุ)..."
                    value={sp.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.subPanels]; arr[idx].otherText = e.target.value; setData(d => ({ ...d, subPanels: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- รายการแผงย่อยอื่นๆ" item={sp.other} onChange={(it) => {
                  const arr = [...data.subPanels]; arr[idx].other = it; setData(d => ({ ...d, subPanels: arr }));
                }} />
              </div>
            ))}
          </div>

          {/* ══ 2.5 บริภัณฑ์ไฟฟ้า ══ */}
          <div className="section-block">
            <div className="section-block__hdr">
              <div>
                <h2 className="section-block__title">๒.๕ บริภัณฑ์ไฟฟ้าอื่นๆ</h2>
                <p className="section-block__sub">เช่น มอเตอร์ไฟฟ้า, เครื่องทำน้ำดื่ม, เครื่องทำความร้อน, เครื่องเชื่อม ฯลฯ</p>
              </div>
              <button type="button" className="btn-add-item" onClick={addOtherEquipment}>
                + เพิ่มบริภัณฑ์ไฟฟ้า
              </button>
            </div>

            {data.otherEquipments.map((eq, idx) => (
              <div key={eq.id} className="card-box card-box--nested">
                <div className="card-box__sub-hdr">
                  <span className="card-box__item-num">บริภัณฑ์ที่ {idx + 1}</span>
                  {data.otherEquipments.length > 1 && (
                    <button type="button" className="btn-del-item" onClick={() => removeOtherEquipment(idx)}>
                      🗑 ลบรายการนี้
                    </button>
                  )}
                </div>

                <div className="field">
                  <label>ชื่อบริภัณฑ์ไฟฟ้า</label>
                  <input
                    type="text"
                    placeholder="เช่น มอเตอร์ปั๊มน้ำ, ตู้เย็น, เครื่องเชื่อม..."
                    value={eq.name}
                    onChange={(e) => {
                      const arr = [...data.otherEquipments]; arr[idx].name = e.target.value; setData(d => ({ ...d, otherEquipments: arr }));
                    }}
                  />
                </div>

                <ChecklistRow title="๒.๕.๑ การติดตั้ง" item={eq.installation} onChange={(it) => {
                  const arr = [...data.otherEquipments]; arr[idx].installation = it; setData(d => ({ ...d, otherEquipments: arr }));
                }} />
                <ChecklistRow title="๒.๕.๒ สภาพภายนอก" item={eq.external} onChange={(it) => {
                  const arr = [...data.otherEquipments]; arr[idx].external = it; setData(d => ({ ...d, otherEquipments: arr }));
                }} />

                <h3 className="group-sub-title" style={{ marginTop: 16 }}>๒.๕.๓ อื่นๆ</h3>
                <div className="field" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="๒.๕.๓ อื่นๆ (ระบุ)..."
                    value={eq.otherText || ''}
                    onChange={(e) => {
                      const arr = [...data.otherEquipments]; arr[idx].otherText = e.target.value; setData(d => ({ ...d, otherEquipments: arr }));
                    }}
                  />
                </div>
                <ChecklistRow title="- สภาพรายการอื่นๆ" item={eq.other} onChange={(it) => {
                  const arr = [...data.otherEquipments]; arr[idx].other = it; setData(d => ({ ...d, otherEquipments: arr }));
                }} />
              </div>
            ))}
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(2)}>‹ ย้อนกลับ</button>
            <button className="btn-primary" onClick={() => setStep(4)}>ถัดไป: สรุปผล & บันทึก ›</button>
          </div>
        </section>
      )}

      {/* ── STEP 4: สรุปผลการตรวจสอบ & บันทึก (หน้า 9 ส่วนที่ 3) ── */}
      {step === 4 && (
        <section className="form-section">
          <div className="card-box">
            <h2 className="card-box__title">๓. สรุปผลการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า</h2>

            <div className="conclusion-opts">
              <label className={`conc-pill ${data.conclusion.result === 'pass' ? 'conc-pill--active' : ''}`}>
                <input
                  type="radio"
                  name="conclusionResult"
                  checked={data.conclusion.result === 'pass'}
                  onChange={() => updateConclusion('result', 'pass')}
                />
                <div>
                  <div className="conc-pill__title">✓ ใช้งานได้</div>
                  <div className="conc-pill__sub">
                    ทั้งนี้ระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต้องมีการบำรุงรักษาอย่างถูกวิธีและตามหลักวิชาการทางด้านวิศวกรรมศาสตร์
                  </div>
                </div>
              </label>

              <label className={`conc-pill ${data.conclusion.result === 'repair' ? 'conc-pill--active conc-pill--warn' : ''}`}>
                <input
                  type="radio"
                  name="conclusionResult"
                  checked={data.conclusion.result === 'repair'}
                  onChange={() => updateConclusion('result', 'repair')}
                />
                <div style={{ width: '100%' }}>
                  <div className="conc-pill__title">△ ใช้งานได้ แต่ต้องแก้ไข</div>
                  <div className="conc-pill__sub">
                    ต้องแก้ไขตามรายงานการตรวจสอบภายในระยะเวลาที่กำหนด
                  </div>
                  {data.conclusion.result === 'repair' && (
                    <div className="field-row" style={{ marginTop: 8 }}>
                      <span>ต้องแก้ไขภายใน</span>
                      <input
                        type="number"
                        style={{ width: 80, textAlign: 'center' }}
                        value={data.conclusion.repairDays}
                        onChange={(e) => updateConclusion('repairDays', e.target.value)}
                      />
                      <span>วัน</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>ความเห็นและข้อเสนอแนะเพิ่มเติม</label>
              <textarea
                rows={4}
                placeholder="ระบุข้อเสนอแนะ การปรับปรุง หรือข้อแนะนำเพิ่มเติมของวิศวกรผู้ตรวจสอบ..."
                value={data.conclusion.suggestions}
                onChange={(e) => updateConclusion('suggestions', e.target.value)}
              />
            </div>

            <div className="field-grid field-grid--2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>วันที่ลงนามสรุปผล</label>
                <input
                  type="date"
                  value={data.conclusion.inspectionDate}
                  onChange={(e) => updateConclusion('inspectionDate', e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <SignaturePad
                label="ลายเซ็นวิศวกรผู้ตรวจสอบ (ยืนยันสรุปผล)"
                value={data.conclusion.inspectorSignature || data.inspector.signature}
                onChange={(sig) => updateConclusion('inspectorSignature', sig)}
              />
            </div>

            {isEditMode && (
              <div className="edit-reason-box" style={{ marginTop: 20 }}>
                <label style={{ fontWeight: 800, color: 'var(--status-warn)' }}>
                  เหตุผลในการแก้ไขข้อมูล <span className="req">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ปรับปรุงรายละเอียดหม้อแปลง / อัปเดตผลการตรวจ..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(3)}>‹ ย้อนกลับไปตรวจอุปกรณ์</button>
            <button
              type="button"
              className="btn-preview-action"
              onClick={() => setShowPreviewModal(true)}
            >
              👁 ดูตัวอย่างรายงาน (Preview)
            </button>
            <button
              className="btn-submit"
              disabled={submitting || !canWrite}
              onClick={handleSubmit}
            >
              {submitting ? '⏳ กำลังบันทึกข้อมูล...' : '✓ บันทึกผลการตรวจสอบ'}
            </button>
          </div>
        </section>
      )}
        </>
      )}

      {/* ── Page Styles ── */}
      <style jsx global>{`
        .elec-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 16px 80px;
          font-family: inherit;
        }
        .elec-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border-hairline);
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .elec-hdr__left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .elec-hdr__title {
          font-size: 18px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0;
          line-height: 1.2;
        }
        .elec-hdr__sub {
          font-size: 12px;
          color: var(--ink-muted);
          margin: 2px 0 0;
        }
        .elec-hdr__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-back {
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--ink-primary);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-draft-clear {
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: var(--status-fail);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-preview-link {
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--accent-strong);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        /* Step navigation */
        .step-nav {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-bottom: 24px;
        }
        .step-nav__item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .step-nav__item--active {
          background: rgba(37,99,235,0.12);
          border-color: var(--accent-strong);
        }
        .step-nav__badge {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--bg-surface-raised);
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .step-nav__item--active .step-nav__badge {
          background: var(--accent);
          color: #fff;
        }
        .step-nav__item--done .step-nav__badge {
          background: var(--status-pass-bg);
          color: var(--status-pass);
          border: 1px solid var(--status-pass);
        }
        .step-nav__label {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .step-nav__name {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .step-nav__sub {
          font-size: 10px;
          color: var(--ink-muted);
        }
        /* Card box */
        .card-box {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .card-box--nested {
          margin-top: 14px;
          background: rgba(255,255,255,0.015);
          border-color: var(--border-strong);
        }
        .card-box__title {
          font-size: 16px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0 0 16px;
        }
        .card-box__sub-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          margin-bottom: 12px;
          border-bottom: 1px dashed var(--border-hairline);
        }
        .card-box__item-num {
          font-size: 13px;
          font-weight: 800;
          color: var(--accent-strong);
        }
        .sub-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-secondary);
          margin: 16px 0 10px;
        }
        .group-sub-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--accent-strong);
          margin: 14px 0 8px;
        }
        .divider {
          border: none;
          height: 1px;
          background: var(--border-hairline);
          margin: 18px 0;
        }
        /* Fields & Grid */
        .field-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .field-grid--2 {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        .field-grid--3 {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field--sm {
          max-width: 120px;
        }
        .field--span2 {
          grid-column: span 2;
        }
        .field label {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-secondary);
        }
        .field input, .field select, .field textarea {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          outline: none;
          border-color: var(--accent-strong);
        }
        .field-group {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid var(--border-hairline);
        }
        .group-label {
          font-size: 13px;
          font-weight: 800;
          color: var(--ink-primary);
          display: block;
          margin-bottom: 8px;
        }
        .field-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .field-row input {
          flex: 1;
          min-width: 100px;
        }
        .field-row span {
          font-size: 12px;
          color: var(--ink-muted);
        }
        .req {
          color: var(--status-fail);
        }
        .radio-group-box {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin: 8px 0;
        }
        .radio-opt {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-primary);
          cursor: pointer;
        }
        /* Section block in Step 3 */
        .section-block {
          margin-bottom: 24px;
        }
        .section-block__hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .section-block__title {
          font-size: 16px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0;
        }
        .section-block__sub {
          font-size: 12px;
          color: var(--ink-muted);
          margin: 2px 0 0;
        }
        .btn-add-item {
          padding: 7px 14px;
          border-radius: 8px;
          background: rgba(37,99,235,0.12);
          border: 1px solid var(--accent);
          color: var(--accent-strong);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-del-item {
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: var(--status-fail);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        /* Checklist row */
        .check-row {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .check-row__main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .check-row__title {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-primary);
          flex: 1;
          min-width: 180px;
        }
        .check-row__options {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          border-radius: 8px;
          border: 1px solid var(--border-hairline);
          background: var(--bg-surface-raised);
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-muted);
          cursor: pointer;
          transition: all 0.12s;
        }
        .status-pill input {
          display: none;
        }
        .status-pill--pass {
          background: var(--status-pass-bg);
          color: var(--status-pass);
          border-color: var(--status-pass);
        }
        .status-pill--improve {
          background: rgba(217,119,6,0.15);
          color: var(--status-warn);
          border-color: var(--status-warn);
        }
        .status-pill--fix {
          background: var(--status-fail-bg);
          color: var(--status-fail);
          border-color: var(--status-fail);
        }
        .check-row__sub {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .check-row__note {
          flex: 1;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 12px;
        }
        .btn-attach-photo {
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--ink-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .photo-thumb-wrap {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 6px;
          overflow: hidden;
          border: 1.5px solid var(--accent);
          flex-shrink: 0;
        }
        .photo-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .btn-remove-photo {
          position: absolute;
          top: 0;
          right: 0;
          width: 16px;
          height: 16px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          border: none;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        /* Step 4 conclusion */
        .conclusion-opts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 14px;
        }
        .conc-pill {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-surface-raised);
          cursor: pointer;
          transition: all 0.15s;
        }
        .conc-pill input {
          margin-top: 3px;
        }
        .conc-pill--active {
          border-color: var(--status-pass);
          background: rgba(16,185,129,0.08);
        }
        .conc-pill--warn {
          border-color: var(--status-warn);
          background: rgba(217,119,6,0.08);
        }
        .conc-pill__title {
          font-size: 14px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .conc-pill__sub {
          font-size: 12px;
          color: var(--ink-secondary);
          margin-top: 2px;
          line-height: 1.4;
        }
        .edit-reason-box {
          background: rgba(217,119,6,0.08);
          border: 1.5px dashed var(--status-warn);
          padding: 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        /* Actions */
        .step-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }
        .btn-primary {
          padding: 11px 22px;
          border-radius: 12px;
          background: var(--accent);
          color: #fff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }
        .btn-secondary {
          padding: 11px 18px;
          border-radius: 12px;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--ink-secondary);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-submit {
          padding: 12px 28px;
          border-radius: 12px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #fff;
          border: none;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(22,163,74,0.3);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .alert {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .alert--err {
          background: var(--status-fail-bg);
          color: var(--status-fail);
          border: 1px solid var(--status-fail);
        }
        .alert--success {
          background: var(--status-pass-bg);
          color: var(--status-pass);
          border: 1px solid var(--status-pass);
        }
        .btn-preview-action {
          padding: 11px 18px;
          border-radius: 12px;
          background: rgba(37,99,235,0.1);
          border: 1.5px solid var(--accent);
          color: var(--accent-strong);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .preview-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .preview-modal-box {
          background: #cbd5e1;
          width: 100%;
          max-width: 960px;
          height: 90vh;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        .preview-modal-hdr {
          background: #fff;
          padding: 14px 20px;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #0f172a;
        }
        .btn-modal-print {
          padding: 7px 14px;
          border-radius: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-modal-close {
          padding: 7px 12px;
          border-radius: 8px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .preview-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        @media (max-width: 768px) {
          .step-nav {
            grid-template-columns: repeat(2, 1fr);
          }
          .check-row__main {
            flex-direction: column;
            align-items: flex-start;
          }
          .check-row__options {
            width: 100%;
            justify-content: space-between;
          }
          .elec-year-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* ── Year Selector Bar ── */
        .elec-year-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .elec-year-bar__left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .year-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink-primary);
        }
        .year-select-wrap {
          position: relative;
        }
        .elec-year-select {
          appearance: none;
          background: var(--bg-surface-raised);
          color: var(--ink-primary);
          border: 1.5px solid var(--accent-strong);
          border-radius: 8px;
          padding: 6px 30px 6px 12px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23e11d48' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        .elec-year-select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.2);
        }
        .elec-year-bar__right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .year-mode-pill {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .year-mode-pill--edit {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .year-mode-pill--new {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .year-mode-pill--tmpl {
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }

        /* ── Screen 0: Year Selection Card ── */
        .year-select-container {
          max-width: 580px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 60px;
        }
        .year-picker-card {
          background: var(--bg-surface, #111d32);
          border: 1px solid var(--border-hairline, #1e2e4a);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
        }
        .ypc-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .ypc-icon {
          font-size: 40px;
          display: block;
          margin-bottom: 8px;
        }
        .ypc-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink-primary, #eef2ff);
          margin: 0 0 6px;
        }
        .ypc-sub {
          font-size: 13.5px;
          color: var(--ink-secondary, #94a3c4);
          margin: 0;
          line-height: 1.45;
        }
        .ypc-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ypc-select {
          width: 100%;
          background: var(--bg-input, #080e1a);
          border: 1px solid var(--border-strong, #2d3f5e);
          border-radius: 12px;
          color: var(--ink-primary, #eef2ff);
          padding: 13px 14px;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s;
        }
        .ypc-select:focus {
          border-color: var(--accent, #2563eb);
        }
        .ypc-status {
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          line-height: 1.45;
        }
        .ypc-status--has-data {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .ypc-status--has-prior {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .ypc-status--fresh {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .ypc-status-tag {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          border-radius: 6px;
          padding: 2px 8px;
          width: fit-content;
        }
        .ypc-status-tag--amber {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        .ypc-status-tag--blue {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }
        .ypc-status-tag--green {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }
        .ypc-status-txt {
          color: var(--ink-secondary, #94a3c4);
        }
        .ypc-btn-proceed {
          background: var(--accent, #2563eb);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 4px;
        }
        .ypc-btn-proceed:hover {
          background: var(--accent-strong, #3b82f6);
          transform: translateY(-1px);
        }

        /* ── Existing reports card on pageStep 0 ── */
        .existing-reports-card {
          background: var(--bg-surface, #111d32);
          border: 1px solid var(--border-hairline, #1e2e4a);
          border-radius: 20px;
          padding: 20px;
        }
        .erc-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-primary, #eef2ff);
          margin: 0 0 12px;
        }
        .erc-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .erc-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--bg-surface-raised, #172340);
          border: 1px solid var(--border-hairline, #1e2e4a);
        }
        .erc-item-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .erc-year {
          font-weight: 700;
          font-size: 14px;
          color: var(--ink-primary, #eef2ff);
        }
        .erc-date {
          font-size: 12px;
          color: var(--ink-muted, #5a6a8a);
        }
        .erc-bld {
          font-size: 11px;
          background: var(--bg-input, #080e1a);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--ink-secondary, #94a3c4);
        }
        .erc-item-btn {
          background: var(--bg-input, #080e1a);
          border: 1px solid var(--border-strong, #2d3f5e);
          color: var(--ink-primary, #eef2ff);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .erc-item-btn:hover {
          background: var(--accent, #2563eb);
          border-color: var(--accent, #2563eb);
          color: #ffffff;
        }

        /* ── Modern Centered Modal (Firepump Bubble Style) ── */
        .elec-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 14, 26, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: elecFadeIn 0.2s ease;
        }
        @keyframes elecFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .elec-modal-box {
          background: var(--bg-surface-raised, #172340);
          border: 1px solid var(--border-strong, #2d3f5e);
          border-radius: 24px;
          padding: 30px 24px;
          width: 100%;
          max-width: 390px;
          text-align: center;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: elecZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes elecZoomIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .elec-modal-icon {
          font-size: 48px;
          line-height: 1;
          margin-bottom: 2px;
        }
        .elec-modal-title {
          font-size: 19px;
          font-weight: 800;
          color: var(--ink-primary, #eef2ff);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .elec-modal-msg {
          font-size: 14px;
          color: var(--ink-secondary, #94a3c4);
          margin: 0;
          line-height: 1.5;
        }
        .elec-modal-badge {
          background: var(--bg-input, #080e1a);
          border: 1px solid var(--border-hairline, #1e2e4a);
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 12.5px;
          color: var(--ink-muted, #5a6a8a);
          font-weight: 500;
          margin: 2px 0 6px;
        }
        .elec-modal-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }
        .elec-modal-btn {
          width: 100%;
          padding: 13px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-strong, #2d3f5e);
          font-size: 14.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .elec-modal-btn--primary {
          background: var(--accent, #2563eb);
          color: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }
        .elec-modal-btn--primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .elec-modal-btn--secondary {
          background: var(--bg-surface, #111d32);
          color: var(--ink-primary, #eef2ff);
          border-color: var(--border-strong, #2d3f5e);
        }
        .elec-modal-btn--secondary:hover {
          background: var(--border-hairline, #1e2e4a);
          color: #ffffff;
        }
        .elec-modal-btn--template {
          background: #1e1b4b;
          color: #c7d2fe;
          border-color: #3730a3;
        }
        .elec-modal-btn--template:hover {
          background: #2e1065;
          color: #e0e7ff;
        }
        .elec-modal-btn--cancel {
          background: transparent;
          border: none;
          color: var(--ink-muted, #5a6a8a);
          font-size: 13.5px;
          font-weight: 600;
          padding: 8px;
          cursor: pointer;
        }
        .elec-modal-btn--cancel:hover {
          color: var(--ink-primary, #eef2ff);
        }

        /* ── Media Print ── */
        @media print {
          .elec-hdr,
          .elec-year-bar,
          .step-nav,
          .elec-card,
          .step-actions,
          .btn-row,
          .preview-modal-hdr,
          .alert,
          .elec-modal-overlay,
          .year-select-container,
          .overlay {
            display: none !important;
          }
          .elec-page {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .preview-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            display: block !important;
          }
          .preview-modal-box {
            max-height: none !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          .preview-modal-body {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ElectricalAnnualPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดแบบฟอร์ม...</div>}>
      <ElectricalAnnualInner />
    </Suspense>
  );
}
