'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SignaturePad from '../components/SignaturePad';
import ElecReport from '../components/ElecReport';
import Sidenav from '../components/Sidenav';
import { useCanWrite } from '../lib/useCanWrite';
import { BUILDING_OPTIONS } from '../../src/lib/buildingList';

const getBuildingLabel = (val) => {
  if (!val) return '';
  const found = BUILDING_OPTIONS.find(b => b.value === val);
  return found ? found.label : val;
};

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
    mainSwitchboards: [createDefaultMainSwitchboard(1, '1')],
    mainCircuits: [],
    subPanels: [],
    otherEquipments: [],
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
// ── Normalize form data for compatibility across old flat & new nested structures ──
const normalizeFormData = (loaded, targetYear) => {
  if (!loaded) return createInitialState(targetYear);
  const base = createInitialState(targetYear);

  const tfs = (loaded.transformers && loaded.transformers.length > 0 ? loaded.transformers : base.transformers).map((tf, tIdx) => {
    const defTf = createDefaultTransformer(tIdx + 1);
    return {
      ...defTf,
      ...tf,
      no: tf.no || String(tIdx + 1),
      primaryProtection: {
        ...defTf.primaryProtection,
        ...(tf.primaryProtection || {}),
      },
      items: {
        ...defTf.items,
        ...(tf.items || {}),
      },
    };
  });
  const legacyCircuits = Array.isArray(loaded.mainCircuits) && loaded.mainCircuits.length > 0 ? loaded.mainCircuits : null;
  const legacyPanels = Array.isArray(loaded.subPanels) && loaded.subPanels.length > 0 ? loaded.subPanels : null;
  const legacyEquips = Array.isArray(loaded.otherEquipments) && loaded.otherEquipments.length > 0 ? loaded.otherEquipments : null;

  const msbs = (loaded.mainSwitchboards && loaded.mainSwitchboards.length > 0 ? loaded.mainSwitchboards : base.mainSwitchboards).map((msb, mIdx) => {
    const mNo = msb.no || String(mIdx + 1);

    let circuits = Array.isArray(msb.mainCircuits) && msb.mainCircuits.length > 0 ? msb.mainCircuits : null;
    if (!circuits && legacyCircuits) {
      circuits = legacyCircuits;
    }
    if (!circuits || circuits.length === 0) circuits = [createDefaultMainCircuit(1)];

    let panels = Array.isArray(msb.subPanels) && msb.subPanels.length > 0 ? msb.subPanels : null;
    if (!panels && legacyPanels) {
      const matched = legacyPanels.filter(p => !p.sourceMdb || String(p.sourceMdb) === String(mNo));
      panels = matched.length > 0 ? matched : (mIdx === 0 ? legacyPanels : [createDefaultSubPanel(1)]);
    }
    if (!panels || panels.length === 0) panels = [createDefaultSubPanel(1)];

    let equips = Array.isArray(msb.otherEquipments) && msb.otherEquipments.length > 0 ? msb.otherEquipments : null;
    if (!equips && legacyEquips && mIdx === 0) equips = legacyEquips;
    if (!equips || equips.length === 0) equips = [createDefaultOtherEquipment(1)];

    return {
      ...createDefaultMainSwitchboard(mIdx + 1, tfs[0]?.no || '1'),
      ...msb,
      no: mNo,
      sourceTransformer: String(msb.sourceTransformer || tfs[0]?.no || '1'),
      building: msb.building || '',
      mainCircuits: circuits,
      subPanels: panels,
      otherEquipments: equips,
    };
  });

  return {
    ...base,
    ...loaded,
    inspector: { ...base.inspector, ...(loaded.inspector || {}) },
    workplace: { ...base.workplace, ...(loaded.workplace || {}) },
    general: { ...base.general, ...(loaded.general || {}) },
    highVoltageSystems: loaded.highVoltageSystems && loaded.highVoltageSystems.length > 0 ? loaded.highVoltageSystems : base.highVoltageSystems,
    transformers: tfs,
    mainSwitchboards: msbs,
    conclusion: { ...base.conclusion, ...(loaded.conclusion || {}) },
  };
};

// ── Create blank form keeping only inspector & general from previous year ──────────
const createBlankWithGeneralOnly = (sourceData, targetYear) => {
  const fresh = createInitialState(targetYear);
  if (!sourceData) return fresh;
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${targetYear}-${m}-${d}`;

  return {
    ...fresh,
    inspector: {
      ...fresh.inspector,
      name: sourceData.inspector?.name || '',
      age: sourceData.inspector?.age || '',
      address: sourceData.inspector?.address || '',
      moo: sourceData.inspector?.moo || '',
      soi: sourceData.inspector?.soi || '',
      road: sourceData.inspector?.road || '',
      subdistrict: sourceData.inspector?.subdistrict || '',
      district: sourceData.inspector?.district || '',
      province: sourceData.inspector?.province || '',
      phone: sourceData.inspector?.phone || '',
      licenseLevel: sourceData.inspector?.licenseLevel || 'ภาคีวิศวกร',
      licenseBranch: sourceData.inspector?.licenseBranch || 'วิศวกรรมไฟฟ้า แขนงไฟฟ้ากำลัง',
      licenseNo: sourceData.inspector?.licenseNo || '',
      licenseStart: sourceData.inspector?.licenseStart || '',
      licenseEnd: sourceData.inspector?.licenseEnd || '',
      certType: sourceData.inspector?.certType || 'sec9',
      juristicName: sourceData.inspector?.juristicName || '',
      certNo: sourceData.inspector?.certNo || '',
      certStart: sourceData.inspector?.certStart || '',
      certEnd: sourceData.inspector?.certEnd || '',
      signature: sourceData.inspector?.signature || '',
    },
    workplace: {
      ...fresh.workplace,
      name: sourceData.workplace?.name || '',
      businessType: sourceData.workplace?.businessType || '',
      employerName: sourceData.workplace?.employerName || '',
      address: sourceData.workplace?.address || '',
      moo: sourceData.workplace?.moo || '',
      soi: sourceData.workplace?.soi || '',
      road: sourceData.workplace?.road || '',
      subdistrict: sourceData.workplace?.subdistrict || '',
      district: sourceData.workplace?.district || '',
      province: sourceData.workplace?.province || '',
      phone: sourceData.workplace?.phone || '',
      inspectionDate: dateStr,
      employerSignature: sourceData.workplace?.employerSignature || '',
    },
    general: {
      ...fresh.general,
      voltage: sourceData.general?.voltage || '380/220',
      phase: sourceData.general?.phase || '3',
      wires: sourceData.general?.wires || '4',
      meterAmp: sourceData.general?.meterAmp || '',
      meterVolt: sourceData.general?.meterVolt || '380/220',
      meterPhase: sourceData.general?.meterPhase || '3',
      meterWires: sourceData.general?.meterWires || '4',
      meterNo: sourceData.general?.meterNo || '',
      peakKw12Months: '',
      transformerCount: sourceData.general?.transformerCount || '1',
      transformerTotalKva: sourceData.general?.transformerTotalKva || '',
      generatorCount: sourceData.general?.generatorCount || '',
      generatorTotalKva: sourceData.general?.generatorTotalKva || '',
      responsiblePerson1: { ...(sourceData.general?.responsiblePerson1 || { name: '', position: '' }) },
      responsiblePerson2: { ...(sourceData.general?.responsiblePerson2 || { name: '', position: '' }) },
      asBuiltDrawing: sourceData.general?.asBuiltDrawing || 'yes',
      asBuiltReason: sourceData.general?.asBuiltReason || '',
    },
    conclusion: {
      ...fresh.conclusion,
      inspectionDate: dateStr,
      inspectorSignature: sourceData.conclusion?.inspectorSignature || sourceData.inspector?.signature || '',
    },
  };
};

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

  const normalized = normalizeFormData(sourceData, targetYear);

  return {
    inspector: {
      ...(normalized.inspector || {}),
      signature: '',
    },
    workplace: {
      ...(normalized.workplace || {}),
      inspectionDate: newDate,
      employerSignature: '',
    },
    general: {
      ...(normalized.general || {}),
    },
    highVoltageSystems: (normalized.highVoltageSystems || []).map((hv, idx) => ({
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
    transformers: (normalized.transformers || []).map((tf, idx) => ({
      ...tf,
      id: `tf_${Date.now()}_${idx + 1}`,
      items: Object.fromEntries(
        Object.entries(tf.items || {}).map(([k, it]) => [
          k,
          k === 'otherText' ? (it || '') : cleanCheck(it),
        ])
      ),
    })),
    mainSwitchboards: (normalized.mainSwitchboards || []).map((msb, idx) => ({
      ...msb,
      id: `msb_${Date.now()}_${idx + 1}`,
      name: msb.name || '',
      sourceTransformer: msb.sourceTransformer || '1',
      building: msb.building || '',
      customBuilding: msb.customBuilding || '',
      locationType: msb.locationType || 'indoor',
      locationOther: msb.locationOther || '',
      items: Object.fromEntries(
        Object.entries(msb.items || {}).map(([k, it]) => [k, cleanCheck(it)])
      ),
      overcurrentProtection: { ...(msb.overcurrentProtection || {}) },
      grounding: cleanCheck(msb.grounding),
      temperature: 'normal',
      temperatureNote: '',
      temperaturePhoto: null,
      otherText: msb.otherText || '',
      other: cleanCheck(msb.other),
      mainCircuits: (msb.mainCircuits || []).map((mc, cIdx) => ({
        ...mc,
        id: `mc_${Date.now()}_${cIdx + 1}`,
        title: mc.title || `วงจรเมน ชุดที่ ${cIdx + 1}`,
        source: mc.source || '',
        phaseWire: { ...(mc.phaseWire || {}) },
        neutralWire: { ...(mc.neutralWire || {}) },
        raceway: mc.raceway || 'conduit',
        racewayOther: mc.racewayOther || '',
        items: Object.fromEntries(
          Object.entries(mc.items || {}).map(([k, it]) => [k, cleanCheck(it)])
        ),
        mainSwitchFuse: { ...(mc.mainSwitchFuse || {}) },
        circuitBreaker: { ...(mc.circuitBreaker || {}) },
        overcurrentProtection: { ...(mc.overcurrentProtection || {}) },
        temperature: 'normal',
        temperatureNote: '',
        temperaturePhoto: null,
        otherText: mc.otherText || '',
        other: cleanCheck(mc.other),
      })),
      subPanels: (msb.subPanels || []).map((sp, sIdx) => ({
        ...sp,
        id: `sp_${Date.now()}_${sIdx + 1}`,
        no: sp.no || String(sIdx + 1),
        subCircuitOf: sp.subCircuitOf || '',
        source: sp.source || '',
        sourceMdb: sp.sourceMdb || msb.no || '1',
        items: Object.fromEntries(
          Object.entries(sp.items || {}).map(([k, it]) => [k, cleanCheck(it)])
        ),
        conductors: { ...(sp.conductors || {}) },
        raceway: { ...(sp.raceway || {}) },
        circuitBreaker: { ...(sp.circuitBreaker || {}) },
        fuseSwitch: { ...(sp.fuseSwitch || {}) },
        overcurrentProtection: { ...(sp.overcurrentProtection || {}) },
        receptacles: { ...(sp.receptacles || {}) },
        enclosureGrounding: { ...(sp.enclosureGrounding || {}) },
        grounding: cleanCheck(sp.grounding),
        temperature: 'normal',
        temperatureNote: '',
        temperaturePhoto: null,
        otherText: sp.otherText || '',
        other: cleanCheck(sp.other),
      })),
      otherEquipments: (msb.otherEquipments || []).map((eq, eIdx) => ({
        ...eq,
        id: `eq_${Date.now()}_${eIdx + 1}`,
        name: eq.name || '',
        installation: cleanCheck(eq.installation),
        external: cleanCheck(eq.external),
        otherText: eq.otherText || '',
        other: cleanCheck(eq.other),
      })),
    })),
    mainCircuits: [],
    subPanels: [],
    otherEquipments: [],
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
  const safeItem = item || { status: 'pass', note: '', photo: null };

  const handleStatusChange = (val) => {
    onChange({ ...safeItem, status: val });
  };

  const handleNoteChange = (val) => {
    onChange({ ...safeItem, note: val });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageUpload(file, (base64) => {
      onChange({ ...safeItem, photo: base64 });
    });
    e.target.value = '';
  };

  const removePhoto = () => {
    onChange({ ...safeItem, photo: null });
  };

  return (
    <div className="check-row">
      <div className="check-row__main">
        <span className="check-row__title">{title}</span>
        <div className="check-row__options">
          <label className={`status-pill ${safeItem.status === 'pass' ? 'status-pill--pass' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={safeItem.status === 'pass'}
              onChange={() => handleStatusChange('pass')}
            />
            <span>✓ ใช้ได้</span>
          </label>
          <label className={`status-pill ${safeItem.status === 'improve' ? 'status-pill--improve' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={safeItem.status === 'improve'}
              onChange={() => handleStatusChange('improve')}
            />
            <span>△ ควรปรับปรุง</span>
          </label>
          <label className={`status-pill ${safeItem.status === 'fix' ? 'status-pill--fix' : ''}`}>
            <input
              type="radio"
              name={`status_${title}`}
              checked={safeItem.status === 'fix'}
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
          value={safeItem.note || ''}
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
          {!safeItem.photo ? (
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
              <img src={safeItem.photo} alt="หลักฐาน" className="photo-thumb" />
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

// ── Item Switcher Component (Dropdown Selector & Navigation for Multi-Item Sections) ──
function ItemSwitcher({
  label,
  items = [],
  currentIndex = 0,
  onSelect,
  onAdd,
  addLabel = '+ เพิ่มชุดใหม่',
  onDelete,
  deleteLabel = 'ลบชุดนี้',
  canDelete = false,
  badgeText,
  renderOptionLabel,
}) {
  const total = items.length;
  const safeIdx = Math.min(Math.max(0, currentIndex), Math.max(0, total - 1));

  return (
    <div className="item-switcher-box">
      <div className="item-switcher-top">
        <div className="item-switcher-label-wrap">
          <span className="item-switcher-tag">📌 {label}</span>
          {badgeText && <span className="item-switcher-badge">{badgeText}</span>}
        </div>
        <div className="item-switcher-actions-top">
          {canDelete && onDelete && (
            <button
              type="button"
              className="btn-switcher-del"
              onClick={() => onDelete(safeIdx)}
              title="ลบรายการที่กำลังดูอยู่นี้"
            >
              🗑 {deleteLabel}
            </button>
          )}
          {onAdd && (
            <button
              type="button"
              className="btn-switcher-add"
              onClick={onAdd}
            >
              {addLabel}
            </button>
          )}
        </div>
      </div>

      <div className="item-switcher-bar">
        <button
          type="button"
          className="btn-switcher-nav"
          disabled={safeIdx <= 0}
          onClick={() => onSelect(safeIdx - 1)}
          title="ก่อนหน้า"
        >
          ‹ ก่อนหน้า
        </button>

        <div className="item-switcher-select-wrap">
          <select
            className="item-switcher-select"
            value={safeIdx}
            onChange={(e) => onSelect(Number(e.target.value))}
          >
            {items.map((it, idx) => (
              <option key={it.id || idx} value={idx}>
                {renderOptionLabel ? renderOptionLabel(it, idx) : `ชุดที่ ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-switcher-nav"
          disabled={safeIdx >= total - 1}
          onClick={() => onSelect(safeIdx + 1)}
          title="ถัดไป"
        >
          ถัดไป ›
        </button>
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
  const [isMobile, setIsMobile] = useState(false);
  const [catTab, setCatTab] = useState('hv'); // 'hv' | 'transformer' | 'mdb'
  const [fileSuffix, setFileSuffix] = useState('');

  // Active indices for Master-Detail Dropdown View (Single item at a time)
  const [activeHvIdx, setActiveHvIdx] = useState(0);
  const [activeTfIdx, setActiveTfIdx] = useState(0);
  const [selectedTfForMdb, setSelectedTfForMdb] = useState('1');
  const [activeMsbIdx, setActiveMsbIdx] = useState(0);
  const [activeCircuitIdx, setActiveCircuitIdx] = useState(0);
  const [activeSubPanelIdx, setActiveSubPanelIdx] = useState(0);
  const [activeEquipIdx, setActiveEquipIdx] = useState(0);

  const DRAFT_KEY = 'draft:elec:annual';
  const [step, setStep] = useState(1); // 1: ผู้ตรวจ&สถานประกอบการ, 2: ข้อมูลทั่วไป, 3: ตรวจสอบอุปกรณ์, 4: สรุปผล

  // Detect mobile device / viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
            const dateStr = res.records.formData.workplace?.inspectionDate || res.date || '';
            const yr = parseInt(dateStr.slice(0, 4)) || new Date().getFullYear();
            setData(normalizeFormData(res.records.formData, yr));
            if (res.records.editReason) setEditReason(res.records.editReason);
            if (yr && !isNaN(yr)) setSelectedYear(yr);
          }
        })
        .catch(() => {});
      return;
    }

    try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const raw = JSON.parse(savedDraft);
        const parsed = normalizeFormData(raw);
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
    setStep(isMobile ? 3 : 1);
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
        setData(normalizeFormData(res.records.formData, modalData.year));
        if (res.records.editReason) setEditReason(res.records.editReason);
        setIsEditMode(true);
        setEditFilename(rec.filename);
        setSelectedYear(modalData.year);
        setPrefilledFrom('');
        setFileSuffix('');
        setPageStep(1);
        setStep(isMobile ? 3 : 1);
        router.replace(`/electrical-annual?filename=${encodeURIComponent(rec.filename)}&edit=1`);
      }
    } catch (e) {
      setValidationError('ไม่สามารถโหลดข้อมูลเดิมได้: ' + e.message);
    }
    setDuplicateModalRecord(null);
  };

    const handleCreateFreshForDuplicateYear = async (modalData) => {
    const rec = modalData.record;
    const existingForYear = allElecRecords.filter((r) => r.date?.startsWith(String(modalData.year)));
    const revNum = existingForYear.length + 1;
    const suffix = `ฉบับที่-${revNum}`;
    setFileSuffix(suffix);

    const url = rec._path
      ? `/api/inspections?path=${encodeURIComponent(rec._path)}`
      : `/api/inspections?filename=${encodeURIComponent(rec.filename)}`;

    let fresh = createInitialState(modalData.year);
    try {
      const res = await fetch(url).then((r) => r.json());
      if (res?.records?.formData) {
        // ยกข้อมูลผู้ตรวจ & ข้อมูลทั่วไปมาแบบเดิม ส่วนอุปกรณ์เป็นฟอร์มเปล่า
        fresh = createBlankWithGeneralOnly(res.records.formData, modalData.year);
      }
    } catch {}

    setData(fresh);
    setIsEditMode(false);
    setEditFilename(null);
    setSelectedYear(modalData.year);
    setPrefilledFrom(`ดึงข้อมูลทั่วไปปี พ.ศ. ${modalData.year + 543} (${suffix})`);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDuplicateModalRecord(null);
    setPageStep(1);
    setStep(isMobile ? 3 : 1);
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
        setStep(isMobile ? 3 : 1);
        router.replace('/electrical-annual');
      }
    } catch (e) {
      setValidationError('ไม่สามารถโหลดข้อมูลเทมเพลตได้: ' + e.message);
      applyYearDirectly(offerData.targetYear);
      setPageStep(1);
      setStep(isMobile ? 3 : 1);
    }
    setTemplateModalOffer(null);
    setDuplicateModalRecord(null);
  };

  const handleDeclineTemplate = async (offerData) => {
    const prior = offerData.priorRecord;
    const url = prior._path
      ? `/api/inspections?path=${encodeURIComponent(prior._path)}`
      : `/api/inspections?filename=${encodeURIComponent(prior.filename)}`;
    let fresh = createInitialState(offerData.targetYear);
    try {
      const res = await fetch(url).then((r) => r.json());
      if (res?.records?.formData) {
        // ผู้ตรวจ & ข้อมูลทั่วไป ยังคงยกมาใช้แบบเดิม ส่วนเมนูอื่นเป็นฟอร์มเปล่า
        fresh = createBlankWithGeneralOnly(res.records.formData, offerData.targetYear);
      }
    } catch {}

    setData(fresh);
    setSelectedYear(offerData.targetYear);
    setIsEditMode(false);
    setEditFilename(null);
    setPrefilledFrom(`ดึงข้อมูลผู้ตรวจ & ข้อมูลทั่วไปจากปี พ.ศ. ${offerData.priorYear + 543}`);
    setPageStep(1);
    setStep(isMobile ? 3 : 1);
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
    setData((d) => {
      const nextArr = [...d.highVoltageSystems, createDefaultHighVoltage(d.highVoltageSystems.length + 1)];
      setActiveHvIdx(nextArr.length - 1);
      return {
        ...d,
        highVoltageSystems: nextArr,
      };
    });
  };

  const removeHighVoltage = (idx) => {
    if (data.highVoltageSystems.length <= 1) return;
    setData((d) => ({
      ...d,
      highVoltageSystems: d.highVoltageSystems.filter((_, i) => i !== idx),
    }));
    setActiveHvIdx((prev) => Math.max(0, idx <= prev ? prev - 1 : prev));
  };

  const addTransformer = () => {
    setData((d) => {
      const nextTfs = [...d.transformers, createDefaultTransformer(d.transformers.length + 1)];
      setActiveTfIdx(nextTfs.length - 1);
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
    setActiveTfIdx((prev) => Math.max(0, idx <= prev ? prev - 1 : prev));
  };

  const addMainSwitchboard = () => {
    setData((d) => {
      const nextIdx = d.mainSwitchboards.length + 1;
      const defaultTf = d.transformers[0]?.no || '1';
      const nextArr = [
        ...d.mainSwitchboards,
        createDefaultMainSwitchboard(nextIdx, defaultTf),
      ];
      setActiveMsbIdx(nextArr.length - 1);
      setActiveCircuitIdx(0);
      setActiveSubPanelIdx(0);
      setActiveEquipIdx(0);
      return {
        ...d,
        mainSwitchboards: nextArr,
      };
    });
  };

  const addMainSwitchboardForTransformer = (tfNo) => {
    const targetTf = String(tfNo || selectedTfForMdb || data.transformers[0]?.no || '1');
    setData((d) => {
      const nextIdx = d.mainSwitchboards.length + 1;
      const newMsb = createDefaultMainSwitchboard(nextIdx, targetTf);
      newMsb.sourceTransformer = targetTf;
      const nextArr = [...d.mainSwitchboards, newMsb];
      setActiveMsbIdx(nextArr.length - 1);
      setActiveCircuitIdx(0);
      setActiveSubPanelIdx(0);
      setActiveEquipIdx(0);
      return {
        ...d,
        mainSwitchboards: nextArr,
      };
    });
    setSelectedTfForMdb(targetTf);
  };

  const removeMainSwitchboard = (idx) => {
    if (data.mainSwitchboards.length <= 1) return;
    setData((d) => ({
      ...d,
      mainSwitchboards: d.mainSwitchboards.filter((_, i) => i !== idx),
    }));
    setActiveMsbIdx((prev) => Math.max(0, idx <= prev ? prev - 1 : prev));
    setActiveCircuitIdx(0);
    setActiveSubPanelIdx(0);
    setActiveEquipIdx(0);
  };

  const updateMainSwitchboard = (idx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, mainSwitchboards: arr };
    });
  };

  const updateMdbCheckItem = (mIdx, subKey, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      arr[mIdx] = {
        ...arr[mIdx],
        items: { ...arr[mIdx].items, [subKey]: val },
      };
      return { ...d, mainSwitchboards: arr };
    });
  };

  const updateMdbOvercurrent = (mIdx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      arr[mIdx] = {
        ...arr[mIdx],
        overcurrentProtection: { ...arr[mIdx].overcurrentProtection, [field]: val },
      };
      return { ...d, mainSwitchboards: arr };
    });
  };

  const updateMdbGrounding = (mIdx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      if (field) {
        arr[mIdx] = {
          ...arr[mIdx],
          grounding: { ...arr[mIdx].grounding, [field]: val },
        };
      } else {
        arr[mIdx] = {
          ...arr[mIdx],
          grounding: { ...arr[mIdx].grounding, ...val },
        };
      }
      return { ...d, mainSwitchboards: arr };
    });
  };

    const addMainCircuitToMdb = (mIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const nextNo = (msb.mainCircuits || []).length + 1;
      const nextCircuits = [...(msb.mainCircuits || []), createDefaultMainCircuit(nextNo)];
      arr[mIdx] = {
        ...msb,
        mainCircuits: nextCircuits,
      };
      setActiveCircuitIdx(nextCircuits.length - 1);
      return { ...d, mainSwitchboards: arr };
    });
  };

  const removeMainCircuitFromMdb = (mIdx, cIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      if ((msb.mainCircuits || []).length <= 1) return d;
      arr[mIdx] = {
        ...msb,
        mainCircuits: msb.mainCircuits.filter((_, i) => i !== cIdx),
      };
      return { ...d, mainSwitchboards: arr };
    });
    setActiveCircuitIdx((prev) => Math.max(0, cIdx <= prev ? prev - 1 : prev));
  };

  const updateMainCircuitInMdb = (mIdx, cIdx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const circuits = [...(msb.mainCircuits || [])];
      circuits[cIdx] = { ...circuits[cIdx], [field]: val };
      arr[mIdx] = { ...msb, mainCircuits: circuits };
      return { ...d, mainSwitchboards: arr };
    });
  };

  const addSubPanelToMdb = (mIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const nextNo = (msb.subPanels || []).length + 1;
      const nextPanels = [...(msb.subPanels || []), { ...createDefaultSubPanel(nextNo), sourceMdb: msb.no || '1' }];
      arr[mIdx] = {
        ...msb,
        subPanels: nextPanels,
      };
      setActiveSubPanelIdx(nextPanels.length - 1);
      return { ...d, mainSwitchboards: arr };
    });
  };

  const removeSubPanelFromMdb = (mIdx, sIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      if ((msb.subPanels || []).length <= 1) return d;
      arr[mIdx] = {
        ...msb,
        subPanels: msb.subPanels.filter((_, i) => i !== sIdx),
      };
      return { ...d, mainSwitchboards: arr };
    });
    setActiveSubPanelIdx((prev) => Math.max(0, sIdx <= prev ? prev - 1 : prev));
  };

  const updateSubPanelInMdb = (mIdx, sIdx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const panels = [...(msb.subPanels || [])];
      panels[sIdx] = { ...panels[sIdx], [field]: val };
      arr[mIdx] = { ...msb, subPanels: panels };
      return { ...d, mainSwitchboards: arr };
    });
  };

  const addOtherEquipmentToMdb = (mIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const nextNo = (msb.otherEquipments || []).length + 1;
      const nextEquips = [...(msb.otherEquipments || []), createDefaultOtherEquipment(nextNo)];
      arr[mIdx] = {
        ...msb,
        otherEquipments: nextEquips,
      };
      setActiveEquipIdx(nextEquips.length - 1);
      return { ...d, mainSwitchboards: arr };
    });
  };

  const removeOtherEquipmentFromMdb = (mIdx, eIdx) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      if ((msb.otherEquipments || []).length <= 1) return d;
      arr[mIdx] = {
        ...msb,
        otherEquipments: msb.otherEquipments.filter((_, i) => i !== eIdx),
      };
      return { ...d, mainSwitchboards: arr };
    });
    setActiveEquipIdx((prev) => Math.max(0, eIdx <= prev ? prev - 1 : prev));
  };

  const updateOtherEquipmentInMdb = (mIdx, eIdx, field, val) => {
    setData((d) => {
      const arr = [...d.mainSwitchboards];
      const msb = arr[mIdx];
      const equips = [...(msb.otherEquipments || [])];
      equips[eIdx] = { ...equips[eIdx], [field]: val };
      arr[mIdx] = { ...msb, otherEquipments: equips };
      return { ...d, mainSwitchboards: arr };
    });
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
      let buildingName = (data.workplace.name || 'บริภัณฑ์ไฟฟ้า').replace(/[/\\]/g, '-');
      if (!isEditMode && fileSuffix) {
        buildingName = `${buildingName}_${fileSuffix}`;
      }

      // Flatten arrays for backwards compatibility
      const flattenedCircuits = (data.mainSwitchboards || []).flatMap(m => m.mainCircuits || []);
      const flattenedPanels = (data.mainSwitchboards || []).flatMap(m => m.subPanels || []);
      const flattenedEquipments = (data.mainSwitchboards || []).flatMap(m => m.otherEquipments || []);

      const payload = {
        date: inspectionDate,
        type: 'elec',
        building: buildingName,
        floor: '',
        records: {
          formData: {
            ...data,
            mainCircuits: flattenedCircuits,
            subPanels: flattenedPanels,
            otherEquipments: flattenedEquipments,
          },
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
    { num: 1, icon: '🏢', title: 'ผู้ตรวจ & สถานประกอบการ' },
    { num: 2, icon: '📋', title: 'ข้อมูลทั่วไป' },
    { num: 3, icon: '⚡', title: 'รายการตรวจอุปกรณ์' },
    { num: 4, icon: '✓', title: 'สรุปผล & บันทึก' },
  ];

  return (
    <div className="sn-shell">
      <Sidenav />
      <div className="sn-shell-main">
        <div className="elec-page">
      {/* ── Modal: Duplicate Year Detected (Firepump bubble style) ── */}
      {duplicateModalRecord && (
        <div className="elec-modal-overlay" onClick={handleCancelDuplicateModal}>
          <div className="elec-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="elec-modal-icon-wrap elec-modal-icon-wrap--amber">
              <span>📁</span>
            </div>
            <h2 className="elec-modal-title">
              พบรายงานปี พ.ศ. {duplicateModalRecord.year + 543} ({duplicateModalRecord.year})
            </h2>
            <p className="elec-modal-msg">
              มีบันทึกการตรวจสอบของปีนี้อยู่ในระบบแล้ว กรุณาเลือกรูปแบบที่ต้องการดำเนินการ
            </p>
            <div className="elec-modal-badge">
              <span>🏢 {duplicateModalRecord.record.building || duplicateModalRecord.record.label || 'บริภัณฑ์ไฟฟ้าประจำปี'}</span>
              <span>·</span>
              <span>บันทึกเมื่อ {duplicateModalRecord.record.date}</span>
            </div>

            <div className="elec-modal-actions">
              <button
                type="button"
                className="elec-modal-card-btn elec-modal-card-btn--primary"
                onClick={() => handleUseExisting(duplicateModalRecord)}
              >
                <span className="elec-modal-card-icon">✏️</span>
                <div className="elec-modal-card-text">
                  <span className="elec-modal-card-title">เข้าไปแก้ไขข้อมูลเดิม</span>
                  <span className="elec-modal-card-sub">
                    เปิดไฟล์รายงานเดิม ({duplicateModalRecord.record.date}) เพื่อปรับปรุงหรือแก้ไข
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="elec-modal-card-btn elec-modal-card-btn--secondary"
                onClick={() => handleCreateFreshForDuplicateYear(duplicateModalRecord)}
              >
                <span className="elec-modal-card-icon">➕</span>
                <div className="elec-modal-card-text">
                  <span className="elec-modal-card-title">สร้างใหม่สำหรับปีนี้</span>
                  <span className="elec-modal-card-sub">
                    เริ่มกรอกแบบฟอร์มเปล่าใหม่ทั้งหมดสำหรับปีนี้ (ไม่ใช้ข้อมูลเดิม)
                  </span>
                </div>
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
                    className="elec-modal-card-btn elec-modal-card-btn--template"
                    onClick={() => handleApplyTemplate({
                      targetYear: duplicateModalRecord.year,
                      priorRecord: prior,
                      priorYear: priorYr,
                    })}
                  >
                    <span className="elec-modal-card-icon">📋</span>
                    <div className="elec-modal-card-text">
                      <span className="elec-modal-card-title">ใช้ข้อมูลปีก่อน ({priorYr + 543}) เป็นแม่แบบ</span>
                      <span className="elec-modal-card-sub">
                        คัดลอกหม้อแปลง ตู้สวิตช์ วงจรเมน แผงย่อย และรีเซ็ตผลตรวจใหม่
                      </span>
                    </div>
                  </button>
                );
              })()}

              <button
                type="button"
                className="elec-modal-btn--cancel"
                onClick={handleCancelDuplicateModal}
              >
                ✕ ยกเลิก / เลือกปีอื่น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Offer Previous Year as Template (Firepump bubble style) ── */}
      {templateModalOffer && (
        <div className="elec-modal-overlay" onClick={handleCancelTemplateModal}>
          <div className="elec-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="elec-modal-icon-wrap elec-modal-icon-wrap--blue">
              <span>📋</span>
            </div>
            <h2 className="elec-modal-title">
              พบข้อมูลรายงานปี พ.ศ. {templateModalOffer.priorYear + 543}
            </h2>
            <p className="elec-modal-msg">
              ต้องการดึงข้อมูลอุปกรณ์เดิมมาเป็นแม่แบบเริ่มต้นสำหรับปี พ.ศ. {templateModalOffer.targetYear + 543} หรือไม่?
            </p>
            <div className="elec-modal-badge">
              คัดลอกหม้อแปลง ตู้สวิตช์ วงจรเมน และแผงย่อย · รีเซ็ตผลตรวจและรูปภาพใหม่
            </div>

            <div className="elec-modal-actions">
              <button
                type="button"
                className="elec-modal-card-btn elec-modal-card-btn--template"
                onClick={() => handleApplyTemplate(templateModalOffer)}
              >
                <span className="elec-modal-card-icon">📋</span>
                <div className="elec-modal-card-text">
                  <span className="elec-modal-card-title">ใช้ข้อมูลเดิมเป็นแม่แบบเริ่มต้น</span>
                  <span className="elec-modal-card-sub">
                    ดึงสเปกและรายการอุปกรณ์เดิมมาใช้ ช่วยประหยัดเวลาไม่ต้องกรอกใหม่
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="elec-modal-card-btn elec-modal-card-btn--secondary"
                onClick={() => handleDeclineTemplate(templateModalOffer)}
              >
                <span className="elec-modal-card-icon">✨</span>
                <div className="elec-modal-card-text">
                  <span className="elec-modal-card-title">เริ่มจากแบบฟอร์มเปล่าใหม่</span>
                  <span className="elec-modal-card-sub">
                    ไม่ใช้แม่แบบ เริ่มกรอกข้อมูลอุปกรณ์และผลตรวจใหม่ทั้งหมด
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="elec-modal-btn--cancel"
                onClick={handleCancelTemplateModal}
              >
                ✕ ยกเลิก / เลือกปีอื่น
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
        /* ── Screen 0: เลือกปีประจำเล่มรายงาน (ธีม Bubble Balloon Cards) ── */
        <div className="year-select-container">
          <header className="elec-hdr">
            <div className="elec-hdr__left">
              <button type="button" className="btn-back" onClick={() => router.push('/')}>‹ หน้าหลัก</button>
              <div>
                <h1 className="elec-hdr__title">⚡ บริภัณฑ์ไฟฟ้าประจำปี</h1>
                <p className="elec-hdr__sub">เลือกปี พ.ศ. ประจำเล่มรายงาน</p>
              </div>
            </div>
          </header>

          <div className="year-intro-card">
            <div className="yic-badge-icon">📅</div>
            <div className="yic-content">
              <h2 className="yic-title">เลือกปีประจำเล่มรายงาน</h2>
              <p className="yic-sub">แตะเลือกปี พ.ศ. ด้านล่างเพื่อเข้าสู่แบบฟอร์มตรวจสอบความปลอดภัยระบบไฟฟ้า</p>
            </div>
          </div>

          {/* ══ Grid of Large Tactile Year Bubble Cards (สัมผัสเดียวเริ่มทันที) ══ */}
          <div className="year-bubble-grid">
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((yr) => {
              const bYear = yr + 543;
              const match = allElecRecords.find((r) => r.date?.startsWith(String(yr)));
              return (
                <button
                  key={yr}
                  type="button"
                  className={`year-bubble-card ${match ? 'year-bubble-card--has-data' : 'year-bubble-card--new'}`}
                  onClick={() => {
                    setSelectedYear(yr);
                    handleProceedFromYearSelect(yr);
                  }}
                >
                  <div className="ybc-num-wrap">
                    <span className="ybc-num">{bYear}</span>
                    <span className="ybc-sub">พ.ศ. ({yr})</span>
                  </div>
                  <div className="ybc-status-wrap">
                    {match ? (
                      <span className="ybc-pill ybc-pill--amber">
                        📝 มีข้อมูลแล้ว ({match.date})
                      </span>
                    ) : (
                      <span className="ybc-pill ybc-pill--blue">
                        ✨ สร้างเล่มใหม่
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dropdown for older historical years */}
          <div className="year-older-pill-box">
            <span className="yob-icon">🔍</span>
            <label className="yob-label" htmlFor="elec-older-years">หรือเลือกปีอื่นๆ ย้อนหลัง:</label>
            <select
              id="elec-older-years"
              className="year-older-select"
              value={selectedYear}
              onChange={(e) => {
                const yr = parseInt(e.target.value);
                if (!isNaN(yr)) {
                  setSelectedYear(yr);
                  handleProceedFromYearSelect(yr);
                }
              }}
            >
              <option value="">-- แตะเลือกปีอื่นๆ (พ.ศ. / ค.ศ.) --</option>
              {availableYears.map((yr) => {
                const bYear = yr + 543;
                const hasRec = allElecRecords.some((r) => r.date?.startsWith(String(yr)));
                return (
                  <option key={yr} value={yr}>
                    พ.ศ. {bYear} ({yr}) {hasRec ? '✓ มีข้อมูลในระบบ' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* List of Existing Reports in System */}
          {allElecRecords.length > 0 && (
            <div className="existing-reports-card">
              <h3 className="erc-title">📋 รายการเล่มรายงานที่มีในระบบ ({allElecRecords.length} ฉบับ)</h3>
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

      {/* ── Year Selector & Status Bubble Capsule Bar ── */}
      <div className="elec-year-bar">
        <div className="elec-year-bar__left">
          <button
            type="button"
            className="year-badge-bubble"
            onClick={() => setPageStep(0)}
            title="แตะเพื่อเลือกปีใหม่"
          >
            <span className="year-badge-icon">📅</span>
            <span className="year-badge-text">เล่มประจำปี พ.ศ. {selectedYear + 543}</span>
            <span className="year-badge-change">เปลี่ยนปี ▾</span>
          </button>
        </div>

        <div className="elec-year-bar__right">
          {isEditMode ? (
            <span className="year-mode-pill year-mode-pill--edit">
              ✏️ กำลังแก้ไขรายงานปี พ.ศ. {selectedYear + 543}
            </span>
          ) : (
            <span className="year-mode-pill year-mode-pill--new">
              ✨ เล่มใหม่ปี พ.ศ. {selectedYear + 543}
            </span>
          )}
          {prefilledFrom && (
            <span className="year-mode-pill year-mode-pill--tmpl">
              📋 เทมเพลตจาก: {prefilledFrom}
            </span>
          )}
        </div>
      </div>

      {/* Step Navigation Bar — Horizontal Bubble Capsule Pills */}
      <nav className="step-nav-capsules">
        {steps.map((s) => (
          <button
            key={s.num}
            type="button"
            className={`step-bubble-btn ${step === s.num ? 'step-bubble-btn--active' : ''} ${step > s.num ? 'step-bubble-btn--done' : ''}`}
            onClick={() => setStep(s.num)}
          >
            <span className="step-bubble-icon">{step > s.num ? '✓' : s.icon}</span>
            <span className="step-bubble-title">{s.title}</span>
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
      {step === 3 && (() => {
        const curHv = Math.min(activeHvIdx, Math.max(0, (data.highVoltageSystems?.length || 1) - 1));
        const curTf = Math.min(activeTfIdx, Math.max(0, (data.transformers?.length || 1) - 1));
        const curMsb = Math.min(activeMsbIdx, Math.max(0, (data.mainSwitchboards?.length || 1) - 1));

        return (
        <section className="form-section">
          {/* ══ Category Sub-Tabs Navigation (3 หมวดหลัก - ไม่มีตัวเลขนำหน้า) ══ */}
          <div className="cat-subnav-box">
            <div className="cat-subnav-pills">
              <button
                type="button"
                className={`cat-tab-btn ${catTab === 'hv' ? 'cat-tab-btn--active' : ''}`}
                onClick={() => setCatTab('hv')}
              >
                <span className="cat-tab-icon">⚡</span>
                <span className="cat-tab-title">ระบบแรงสูง</span>
                <span className="cat-tab-badge">{data.highVoltageSystems.length}</span>
              </button>

              <button
                type="button"
                className={`cat-tab-btn ${catTab === 'transformer' ? 'cat-tab-btn--active' : ''}`}
                onClick={() => setCatTab('transformer')}
              >
                <span className="cat-tab-icon">🔌</span>
                <span className="cat-tab-title">หม้อแปลงไฟฟ้า</span>
                <span className="cat-tab-badge">{data.transformers.length}</span>
              </button>

              <button
                type="button"
                className={`cat-tab-btn ${catTab === 'mdb' ? 'cat-tab-btn--active' : ''}`}
                onClick={() => setCatTab('mdb')}
              >
                <span className="cat-tab-icon">🏢</span>
                <span className="cat-tab-title">ตู้เมนสวิตช์ & อาคาร</span>
                <span className="cat-tab-badge">{data.mainSwitchboards.length}</span>
              </button>
            </div>
          </div>

          {/* ════ หมวดที่ ๑: ระบบแรงสูง ════ */}
          {catTab === 'hv' && (
            <div className="section-block">
              <div className="section-block__hdr">
                <div>
                  <h2 className="section-block__title">ระบบแรงสูง (High Voltage System)</h2>
                  <p className="section-block__sub">สายอากาศ และ เครื่องปลดวงจรต้นทาง</p>
                </div>
                <button type="button" className="btn-add-item" onClick={addHighVoltage}>
                  + เพิ่มระบบแรงสูง
                </button>
              </div>

              {/* Master-Detail Item Switcher */}
              <ItemSwitcher
                label="เลือกระบบแรงสูงที่ต้องการดู / กรอกข้อมูล"
                items={data.highVoltageSystems}
                currentIndex={curHv}
                onSelect={setActiveHvIdx}
                onAdd={addHighVoltage}
                addLabel="+ เพิ่มระบบแรงสูง"
                onDelete={removeHighVoltage}
                deleteLabel="ลบระบบแรงสูงชุดนี้"
                canDelete={data.highVoltageSystems.length > 1}
                badgeText={`ชุดที่ ${curHv + 1} จาก ${data.highVoltageSystems.length}`}
                renderOptionLabel={(item, i) => `ระบบแรงสูง ชุดที่ ${i + 1}${item.aerialName ? ' : ' + item.aerialName : ''}`}
              />

              {(() => {
                const hv = data.highVoltageSystems[curHv] || data.highVoltageSystems[0];
                const idx = curHv;
                if (!hv) return null;
                return (
                  <div key={hv.id || idx} className="card-box card-box--nested">
                    <div className="card-box__sub-hdr">
                      <span className="card-box__item-num">ระบบแรงสูง ชุดที่ {idx + 1}</span>
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
                );
              })()}

              {/* Bottom Add Button */}
              <div className="section-bottom-add-bar">
                <button type="button" className="btn-add-item-bottom" onClick={addHighVoltage}>
                  + เพิ่มระบบแรงสูงชุดใหม่
                </button>
              </div>

              <div className="cat-bottom-nav">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                  ‹ ย้อนกลับ: ข้อมูลทั่วไป
                </button>
                <button type="button" className="btn-primary" onClick={() => setCatTab('transformer')}>
                  ถัดไป: หม้อแปลงไฟฟ้า ›
                </button>
              </div>
            </div>
          )}

          {/* ════ หมวดที่ ๒: หม้อแปลงไฟฟ้า ════ */}
          {catTab === 'transformer' && (
            <div className="section-block">
              <div className="section-block__hdr">
                <div>
                  <h2 className="section-block__title">หม้อแปลงไฟฟ้า (Transformer)</h2>
                  <p className="section-block__sub">รายละเอียดและสภาพหม้อแปลงไฟฟ้า</p>
                </div>
                <button type="button" className="btn-add-item" onClick={addTransformer}>
                  + เพิ่มหม้อแปลง
                </button>
              </div>

              {/* Master-Detail Item Switcher */}
              <ItemSwitcher
                label="เลือกหม้อแปลงไฟฟ้าที่ต้องการดู / กรอกข้อมูล"
                items={data.transformers}
                currentIndex={curTf}
                onSelect={setActiveTfIdx}
                onAdd={addTransformer}
                addLabel="+ เพิ่มหม้อแปลง"
                onDelete={removeTransformer}
                deleteLabel="ลบหม้อแปลงลูกนี้"
                canDelete={data.transformers.length > 1}
                badgeText={`ลูกที่ ${curTf + 1} จาก ${data.transformers.length}`}
                renderOptionLabel={(tf, i) => `หม้อแปลงลูกที่ ${tf.no || i + 1}${tf.kva ? ' (' + tf.kva + ' kVA)' : ''}${tf.installType ? ' - ' + (tf.installType === 'sitting' ? 'นั่งร้าน' : tf.installType === 'hanging' ? 'แขวน' : tf.installType === 'yard' ? 'ลาน' : tf.installType === 'room' ? 'ในห้อง' : tf.installType) : ''}`}
              />

              {(() => {
                const tf = data.transformers[curTf] || data.transformers[0];
                const idx = curTf;
                if (!tf) return null;
                return (
                  <div key={tf.id || idx} className="card-box card-box--nested">
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

                    {/* ๒.๒.๓ เครื่องป้องกันกระแสเกินด้านไฟเข้า */}
                    <div className="subgroup-card" style={{ marginTop: 14 }}>
                      <h4 className="group-sub-title" style={{ margin: '0 0 10px' }}>๒.๒.๓ เครื่องป้องกันกระแสเกินด้านไฟเข้า</h4>
                      <div className="field-grid field-grid--2">
                        <div className="field">
                          <label>แบบเครื่องป้องกัน (เช่น ดรอปฟิวส์, โหลดเบรกสวิตช์)</label>
                          <input
                            type="text"
                            placeholder="ระบุแบบเครื่องป้องกัน..."
                            value={tf.primaryProtection?.type || ''}
                            onChange={(e) => {
                              const arr = [...data.transformers];
                              arr[idx] = { ...arr[idx], primaryProtection: { ...(arr[idx].primaryProtection || {}), type: e.target.value } };
                              setData(d => ({ ...d, transformers: arr }));
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>พิกัดกระแส (A)</label>
                          <input
                            type="text"
                            placeholder="เช่น 100, 200..."
                            value={tf.primaryProtection?.amp || ''}
                            onChange={(e) => {
                              const arr = [...data.transformers];
                              arr[idx] = { ...arr[idx], primaryProtection: { ...(arr[idx].primaryProtection || {}), amp: e.target.value } };
                              setData(d => ({ ...d, transformers: arr }));
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <h4 className="group-sub-title" style={{ marginTop: 16 }}>รายการตรวจสอบหม้อแปลงไฟฟ้า (ข้อ ๒.๒.๔ - ๒.๒.๑๒)</h4>
                    <ChecklistRow
                      title="๒.๒.๔ การต่อสายแรงต่ำและแรงสูงที่หม้อแปลง"
                      item={tf.items?.wiring}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), wiring: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <ChecklistRow
                      title="๒.๒.๕ การติดตั้งล่อฟ้าแรงสูง (Lightning Arrester)"
                      item={tf.items?.lightningArrester}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), lightningArrester: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <ChecklistRow
                      title="๒.๒.๖ การติดตั้งดรอปฟิวส์คัตเอาท์"
                      item={tf.items?.dropFuse}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), dropFuse: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <ChecklistRow
                      title="๒.๒.๗ การป้องกันการสัมผัสส่วนที่มีไฟฟ้า"
                      item={tf.items?.touchProtection}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), touchProtection: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <ChecklistRow
                      title="๒.๒.๘ สายดินกับตัวถังหม้อแปลงและล่อฟ้าแรงสูง"
                      item={tf.items?.bodyGround}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), bodyGround: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />

                    {/* ๒.๒.๙ สายดินของหม้อแปลง */}
                    <div className="subgroup-card" style={{ marginTop: 8, marginBottom: 8 }}>
                      <ChecklistRow
                        title="๒.๒.๙ สายดินของหม้อแปลง (สภาพหลักดินและจุดต่อ)"
                        item={tf.items?.groundRod}
                        onChange={(it) => {
                          const arr = [...data.transformers];
                          const prevGr = arr[idx]?.items?.groundRod || {};
                          arr[idx] = {
                            ...arr[idx],
                            items: {
                              ...(arr[idx].items || {}),
                              groundRod: { ...prevGr, ...it },
                            },
                          };
                          setData(d => ({ ...d, transformers: arr }));
                        }}
                      />
                      <div className="field-grid field-grid--2" style={{ marginTop: 8 }}>
                        <div className="field">
                          <label>สายต่อหลักดิน ชนิด</label>
                          <input
                            type="text"
                            placeholder="เช่น THW, ทองแดงเปลือย..."
                            value={tf.items?.groundRod?.wireType || ''}
                            onChange={(e) => {
                              const arr = [...data.transformers];
                              const prevGr = arr[idx]?.items?.groundRod || { status: 'pass', note: '', photo: null };
                              arr[idx] = {
                                ...arr[idx],
                                items: {
                                  ...(arr[idx].items || {}),
                                  groundRod: { ...prevGr, wireType: e.target.value },
                                },
                              };
                              setData(d => ({ ...d, transformers: arr }));
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>ขนาด (mm²)</label>
                          <input
                            type="text"
                            placeholder="เช่น 35, 50..."
                            value={tf.items?.groundRod?.wireSize || ''}
                            onChange={(e) => {
                              const arr = [...data.transformers];
                              const prevGr = arr[idx]?.items?.groundRod || { status: 'pass', note: '', photo: null };
                              arr[idx] = {
                                ...arr[idx],
                                items: {
                                  ...(arr[idx].items || {}),
                                  groundRod: { ...prevGr, wireSize: e.target.value },
                                },
                              };
                              setData(d => ({ ...d, transformers: arr }));
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <ChecklistRow
                      title="๒.๒.๑๐ สภาพภายนอกหม้อแปลง (สารดูดความชื้น, บุชชิ่ง, รั่วซึม, อุณหภูมิ)"
                      item={tf.items?.externalCondition}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), externalCondition: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                    <ChecklistRow
                      title="๒.๒.๑๑ สภาพแวดล้อมหม้อแปลง (การระบายอากาศ, ความชื้น, รั้วกั้น, สภาพทั่วไป)"
                      item={tf.items?.environment}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), environment: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />

                    <h4 className="group-sub-title" style={{ marginTop: 16 }}>๒.๒.๑๒ อื่นๆ</h4>
                    <div className="field" style={{ marginTop: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="๒.๒.๑๒ อื่นๆ (ระบุ)..."
                        value={tf.items?.otherText || ''}
                        onChange={(e) => {
                          const arr = [...data.transformers];
                          arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), otherText: e.target.value } };
                          setData(d => ({ ...d, transformers: arr }));
                        }}
                      />
                    </div>
                    <ChecklistRow
                      title="- สภาพรายการอื่นๆ"
                      item={tf.items?.other}
                      onChange={(it) => {
                        const arr = [...data.transformers];
                        arr[idx] = { ...arr[idx], items: { ...(arr[idx].items || {}), other: it } };
                        setData(d => ({ ...d, transformers: arr }));
                      }}
                    />
                  </div>
                );
              })()}

              {/* Bottom Add Button */}
              <div className="section-bottom-add-bar">
                <button type="button" className="btn-add-item-bottom" onClick={addTransformer}>
                  + เพิ่มหม้อแปลงลูกใหม่
                </button>
              </div>

              <div className="cat-bottom-nav">
                <button type="button" className="btn-secondary" onClick={() => setCatTab('hv')}>
                  ‹ ก่อนหน้า: ระบบแรงสูง
                </button>
                <button type="button" className="btn-primary" onClick={() => setCatTab('mdb')}>
                  ถัดไป: ตู้เมนสวิตช์ & อาคาร ›
                </button>
              </div>
            </div>
          )}

          {/* ════ หมวดที่ ๓: ตู้เมนสวิตช์และบริภัณฑ์ย่อยตามอาคาร ════ */}
          {catTab === 'mdb' && (
            <div className="section-block">
              <div className="section-block__hdr">
                <div>
                  <h2 className="section-block__title">ตู้เมนสวิตช์และบริภัณฑ์ย่อยตามอาคาร</h2>
                  <p className="section-block__sub">
                    ชุดตารางครบวงจรตั้งแต่ตู้เมนสวิตช์ วงจรเมน แผงย่อย และบริภัณฑ์ไฟฟ้า โดยเชื่อมโยงกับหม้อแปลงและระบุอาคาร
                  </p>
                </div>
                <button type="button" className="btn-add-item" onClick={addMainSwitchboard}>
                  + เพิ่มตู้เมนสวิตช์ / ชุดอาคาร
                </button>
              </div>

              {(() => {
                const mdbsForCurrentTf = data.mainSwitchboards
                  .map((m, idx) => ({ ...m, originalIdx: idx }))
                  .filter(m => String(m.sourceTransformer || '1') === String(selectedTfForMdb));

                const currentMsbInTf = mdbsForCurrentTf.find(m => m.originalIdx === curMsb) || mdbsForCurrentTf[0];
                const effectiveMsbIdx = currentMsbInTf ? currentMsbInTf.originalIdx : 0;
                const currentFilteredIdx = currentMsbInTf
                  ? mdbsForCurrentTf.findIndex(m => m.originalIdx === effectiveMsbIdx)
                  : 0;

                return (
                  <>
                    {/* Cascading 2-Step Dropdown Selector: เลือกหม้อแปลงก่อน -> แล้วเลือกตู้เมนสวิตช์ & อาคาร */}
                    <div className="mdb-cascading-panel">
                      <div className="mcs-banner-title">
                        <span className="mcs-main-icon">🏢</span>
                        <div>
                          <h3 className="mcs-title">เลือกหม้อแปลง และ ตู้เมนสวิตช์ / อาคาร</h3>
                          <p className="mcs-sub">เลือกหม้อแปลงที่จ่ายไฟก่อน แล้วเลือกตู้เมนสวิตช์ประจำอาคารที่ต้องการตรวจ</p>
                        </div>
                      </div>

                      <div className="mcs-steps-container">
                        {/* ขั้นตอนที่ ๑: เลือกหม้อแปลงไฟฟ้า */}
                        <div className="mcs-step-box">
                          <div className="mcs-step-hdr">
                            <span className="mcs-step-badge">ขั้นตอนที่ ๑</span>
                            <span className="mcs-step-label">⚡ เลือกหม้อแปลงไฟฟ้า</span>
                          </div>
                          <div className="mcs-select-row">
                            <div className="mcs-select-wrapper">
                              <select
                                className="mcs-select"
                                value={selectedTfForMdb}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedTfForMdb(val);
                                  const matching = data.mainSwitchboards
                                    .map((m, idx) => ({ ...m, originalIdx: idx }))
                                    .filter(m => String(m.sourceTransformer || '1') === String(val));
                                  if (matching.length > 0) {
                                    setActiveMsbIdx(matching[0].originalIdx);
                                    setActiveCircuitIdx(0);
                                    setActiveSubPanelIdx(0);
                                    setActiveEquipIdx(0);
                                  }
                                }}
                              >
                                {data.transformers.map((tf, tIdx) => {
                                  const tNo = tf.no || `${tIdx + 1}`;
                                  const count = data.mainSwitchboards.filter(m => String(m.sourceTransformer || '1') === String(tNo)).length;
                                  return (
                                    <option key={tf.id || tIdx} value={tNo}>
                                      หม้อแปลงลูกที่ {tNo}{tf.kva ? ` (${tf.kva} kVA)` : ''} — [มี {count} ตู้เมน/อาคาร]
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="mcs-btn-action"
                              onClick={addTransformer}
                              title="เพิ่มหม้อแปลงลูกใหม่"
                            >
                              + เพิ่มหม้อแปลง
                            </button>
                          </div>
                        </div>

                        {/* ขั้นตอนที่ ๒: เลือกตู้เมนสวิตช์ & อาคาร */}
                        <div className="mcs-step-box">
                          <div className="mcs-step-hdr">
                            <span className="mcs-step-badge mcs-step-badge--step2">ขั้นตอนที่ ๒</span>
                            <span className="mcs-step-label">🏢 เลือกตู้เมนสวิตช์ & อาคาร</span>
                            {mdbsForCurrentTf.length > 0 && (
                              <span className="mcs-count-badge">
                                {currentFilteredIdx + 1} จาก {mdbsForCurrentTf.length} ตู้
                              </span>
                            )}
                          </div>

                          {mdbsForCurrentTf.length > 0 ? (
                            <div className="mcs-select-row">
                              <button
                                type="button"
                                className="mcs-btn-nav"
                                disabled={currentFilteredIdx <= 0}
                                onClick={() => {
                                  const prevM = mdbsForCurrentTf[currentFilteredIdx - 1];
                                  if (prevM) {
                                    setActiveMsbIdx(prevM.originalIdx);
                                    setActiveCircuitIdx(0);
                                    setActiveSubPanelIdx(0);
                                    setActiveEquipIdx(0);
                                  }
                                }}
                                title="ก่อนหน้า"
                              >
                                ‹ ก่อนหน้า
                              </button>

                              <div className="mcs-select-wrapper">
                                <select
                                  className="mcs-select"
                                  value={effectiveMsbIdx}
                                  onChange={(e) => {
                                    const newIdx = Number(e.target.value);
                                    setActiveMsbIdx(newIdx);
                                    setActiveCircuitIdx(0);
                                    setActiveSubPanelIdx(0);
                                    setActiveEquipIdx(0);
                                  }}
                                >
                                  {mdbsForCurrentTf.map((m, fIdx) => {
                                    const bldLabel = getBuildingLabel(m.building) || m.building || 'ยังไม่ระบุอาคาร';
                                    return (
                                      <option key={m.id || m.originalIdx} value={m.originalIdx}>
                                        ตู้เมนสวิตช์ที่ {m.no || fIdx + 1} — อาคาร: {bldLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <button
                                type="button"
                                className="mcs-btn-nav"
                                disabled={currentFilteredIdx >= mdbsForCurrentTf.length - 1}
                                onClick={() => {
                                  const nextM = mdbsForCurrentTf[currentFilteredIdx + 1];
                                  if (nextM) {
                                    setActiveMsbIdx(nextM.originalIdx);
                                    setActiveCircuitIdx(0);
                                    setActiveSubPanelIdx(0);
                                    setActiveEquipIdx(0);
                                  }
                                }}
                                title="ถัดไป"
                              >
                                ถัดไป ›
                              </button>

                              <button
                                type="button"
                                className="mcs-btn-action"
                                onClick={() => addMainSwitchboardForTransformer(selectedTfForMdb)}
                                title={`เพิ่มตู้เมนสวิตช์/อาคาร สำหรับหม้อแปลงลูกที่ ${selectedTfForMdb}`}
                              >
                                + เพิ่มตู้เมน/อาคาร
                              </button>

                              {data.mainSwitchboards.length > 1 && (
                                <button
                                  type="button"
                                  className="mcs-btn-del"
                                  onClick={() => removeMainSwitchboard(effectiveMsbIdx)}
                                  title="ลบชุดตู้เมนสวิตช์นี้"
                                >
                                  🗑 ลบตู้นี้
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mcs-empty-balloon">
                              <span className="mcs-empty-icon">⚠️</span>
                              <div className="mcs-empty-text">
                                <span>หม้อแปลงลูกที่ {selectedTfForMdb} ยังไม่มีตู้เมนสวิตช์ / อาคาร</span>
                                <small>กดปุ่มด้านขวาเพื่อเพิ่มตู้เมนสวิตช์และเลือกว่าอยู่อาคารใด</small>
                              </div>
                              <button
                                type="button"
                                className="mcs-btn-create-first"
                                onClick={() => addMainSwitchboardForTransformer(selectedTfForMdb)}
                              >
                                + เพิ่มตู้เมนสวิตช์สำหรับหม้อแปลงลูกที่ {selectedTfForMdb}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {mdbsForCurrentTf.length > 0 && (() => {
                      const msb = data.mainSwitchboards[effectiveMsbIdx];
                      const mIdx = effectiveMsbIdx;
                      if (!msb) return null;

                const circuits = msb.mainCircuits || [];
                const safeCIdx = Math.min(activeCircuitIdx, Math.max(0, circuits.length - 1));
                const currentCircuit = circuits[safeCIdx];

                const panels = msb.subPanels || [];
                const safeSIdx = Math.min(activeSubPanelIdx, Math.max(0, panels.length - 1));
                const currentPanel = panels[safeSIdx];

                const equips = msb.otherEquipments || [];
                const safeEIdx = Math.min(activeEquipIdx, Math.max(0, equips.length - 1));
                const currentEquip = equips[safeEIdx];

                return (
                  <div key={msb.id || mIdx} className="card-box card-box--nested mdb-unified-card">
                    {/* MDB Header Banner */}
                    <div className="card-box__sub-hdr mdb-sub-hdr">
                      <div className="mdb-tag-group">
                        <span className="card-box__item-num">ตู้เมนสวิตช์ที่ {msb.no || mIdx + 1}</span>
                        {msb.building && (
                          <span className="mdb-badge-bld">🏢 {msb.building}</span>
                        )}
                        <span className="mdb-badge-tf">⚡ รับจากหม้อแปลงลูกที่ {msb.sourceTransformer || '1'}</span>
                      </div>
                      {data.mainSwitchboards.length > 1 && (
                        <button type="button" className="btn-del-item" onClick={() => removeMainSwitchboard(mIdx)}>
                          🗑 ลบชุดตู้นี้
                        </button>
                      )}
                    </div>

                    {/* Banner: หม้อแปลงที่จ่ายไฟ และ อาคาร */}
                    <div className="mdb-banner-grid">
                      <div className="field">
                        <label className="field-label-highlight">
                          ⚡ รับไฟจากหม้อแปลงลูกที่ <span className="req">*</span>
                        </label>
                        <select
                          className="select-highlight"
                          value={msb.sourceTransformer || (data.transformers[0]?.no || '1')}
                          onChange={(e) => updateMainSwitchboard(mIdx, 'sourceTransformer', e.target.value)}
                        >
                          {data.transformers.map((tf, tIdx) => {
                            const val = tf.no || `${tIdx + 1}`;
                            const label = tf.kva ? `หม้อแปลงลูกที่ ${val} (${tf.kva} kVA)` : `หม้อแปลงลูกที่ ${val}`;
                            return <option key={tf.id || tIdx} value={val}>{label}</option>;
                          })}
                          {msb.sourceTransformer && !data.transformers.some((tf, tIdx) => (tf.no || `${tIdx + 1}`) === String(msb.sourceTransformer)) && (
                            <option value={msb.sourceTransformer}>หม้อแปลงลูกที่ {msb.sourceTransformer}</option>
                          )}
                        </select>
                      </div>

                      <div className="field">
                        <label className="field-label-highlight">
                          🏢 ประจำอยู่อาคาร (เลือกจากลิสอาคาร) <span className="req">*</span>
                        </label>
                        <select
                          className="select-highlight"
                          value={msb.building || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateMainSwitchboard(mIdx, 'building', val);
                          }}
                        >
                          <option value="">-- กรุณาเลือกอาคาร --</option>
                          {BUILDING_OPTIONS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                          ))}
                          <option value="__other__">🏢 อื่นๆ (พิมพ์ระบุชื่อเอง)</option>
                        </select>
                        {(msb.building === '__other__' || (msb.building && !BUILDING_OPTIONS.some(b => b.value === msb.building))) && (
                          <input
                            type="text"
                            placeholder="พิมพ์ระบุชื่ออาคาร..."
                            style={{ marginTop: 8 }}
                            value={msb.customBuilding || (msb.building === '__other__' ? '' : msb.building)}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateMainSwitchboard(mIdx, 'customBuilding', val);
                              updateMainSwitchboard(mIdx, 'building', val);
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* ── ตาราง ๒.๓ ตู้เมนสวิตช์ MDB ── */}
                    <div className="subgroup-card">
                      <h3 className="subgroup-title">
                        ตู้เมนสวิตช์ (Main Switchboard - MDB)
                      </h3>
                      <div className="field-grid field-grid--2">
                        <div className="field">
                          <label>ตู้เมนสวิตช์ที่</label>
                          <input
                            type="text"
                            value={msb.no}
                            onChange={(e) => updateMainSwitchboard(mIdx, 'no', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>ลักษณะการติดตั้ง</label>
                          <select
                            value={msb.locationType}
                            onChange={(e) => updateMainSwitchboard(mIdx, 'locationType', e.target.value)}
                          >
                            <option value="indoor">ภายในอาคาร</option>
                            <option value="outdoor">ภายนอกอาคาร</option>
                            <option value="other">อื่นๆ</option>
                          </select>
                        </div>
                      </div>

                      <h4 className="group-sub-title" style={{ marginTop: 14 }}>๒.๓.๑ รายการตรวจสอบสภาพตู้</h4>
                      <ChecklistRow title="- สภาพทั่วไป" item={msb.items.generalCondition} onChange={(it) => updateMdbCheckItem(mIdx, 'generalCondition', it)} />
                      <ChecklistRow title="- จุดต่อสายและจุดต่อบัสบาร์" item={msb.items.busbarJoints} onChange={(it) => updateMdbCheckItem(mIdx, 'busbarJoints', it)} />
                      <ChecklistRow title="- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งตู้เมนสวิตช์" item={msb.items.workingSpace} onChange={(it) => updateMdbCheckItem(mIdx, 'workingSpace', it)} />
                      <ChecklistRow title="- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน" item={msb.items.lighting} onChange={(it) => updateMdbCheckItem(mIdx, 'lighting', it)} />
                      <ChecklistRow title="- การต่อฝาก (Bonding)" item={msb.items.bonding} onChange={(it) => updateMdbCheckItem(mIdx, 'bonding', it)} />
                      <ChecklistRow title="- การป้องกันส่วนสัมผัสที่มีไฟฟ้า" item={msb.items.livePartProtection} onChange={(it) => updateMdbCheckItem(mIdx, 'livePartProtection', it)} />
                      <ChecklistRow title="- ป้ายชื่อและแผนภาพเส้นเดี่ยว (Single Line Diagram) ของเมนสวิตช์" item={msb.items.singleLineDiagram} onChange={(it) => updateMdbCheckItem(mIdx, 'singleLineDiagram', it)} />

                      <h4 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๒ เครื่องป้องกันกระแสเกิน</h4>
                      <div className="field-grid field-grid--3">
                        <div className="field">
                          <label>ชนิด</label>
                          <input
                            type="text"
                            placeholder="เช่น ACB, MCCB..."
                            value={msb.overcurrentProtection?.type || ''}
                            onChange={(e) => updateMdbOvercurrent(mIdx, 'type', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>IC (kA)</label>
                          <input
                            type="text"
                            value={msb.overcurrentProtection?.icKa || ''}
                            onChange={(e) => updateMdbOvercurrent(mIdx, 'icKa', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>แรงดัน (V)</label>
                          <input
                            type="text"
                            value={msb.overcurrentProtection?.volt || ''}
                            onChange={(e) => updateMdbOvercurrent(mIdx, 'volt', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>พิกัดกระแส AT (A)</label>
                          <input
                            type="text"
                            value={msb.overcurrentProtection?.atAmp || ''}
                            onChange={(e) => updateMdbOvercurrent(mIdx, 'atAmp', e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>AF (A)</label>
                          <input
                            type="text"
                            value={msb.overcurrentProtection?.afAmp || ''}
                            onChange={(e) => updateMdbOvercurrent(mIdx, 'afAmp', e.target.value)}
                          />
                        </div>
                      </div>

                      <h4 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๓ สายดินของแผงสวิตช์</h4>
                      <div className="field-row" style={{ margin: '8px 0' }}>
                        <input
                          type="text"
                          placeholder="ชนิดสายต่อหลักดิน..."
                          value={msb.grounding?.wireType || ''}
                          onChange={(e) => updateMdbGrounding(mIdx, 'wireType', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="ขนาด (mm²)..."
                          value={msb.grounding?.wireSize || ''}
                          onChange={(e) => updateMdbGrounding(mIdx, 'wireSize', e.target.value)}
                        />
                      </div>
                      <ChecklistRow title="- สภาพหลักดิน จุดต่อ และสายดิน" item={msb.grounding} onChange={(it) => updateMdbGrounding(mIdx, null, it)} />

                      <div className="field" style={{ marginTop: 12 }}>
                        <label style={{ fontWeight: 700 }}>๒.๓.๔ อุณหภูมิของอุปกรณ์</label>
                        <div className="radio-group-box">
                          <label className="radio-opt">
                            <input
                              type="radio"
                              name={`temp_msb_${mIdx}`}
                              checked={msb.temperature === 'normal'}
                              onChange={() => updateMainSwitchboard(mIdx, 'temperature', 'normal')}
                            />
                            <span>✓ ปกติ</span>
                          </label>
                          <label className="radio-opt">
                            <input
                              type="radio"
                              name={`temp_msb_${mIdx}`}
                              checked={msb.temperature === 'abnormal'}
                              onChange={() => updateMainSwitchboard(mIdx, 'temperature', 'abnormal')}
                            />
                            <span>✕ ผิดปกติ</span>
                          </label>
                        </div>
                      </div>

                      <h4 className="group-sub-title" style={{ marginTop: 16 }}>๒.๓.๕ อื่นๆ</h4>
                      <div className="field" style={{ marginBottom: 8 }}>
                        <input
                          type="text"
                          placeholder="๒.๓.๕ อื่นๆ (ระบุ)..."
                          value={msb.otherText || ''}
                          onChange={(e) => updateMainSwitchboard(mIdx, 'otherText', e.target.value)}
                        />
                      </div>
                      <ChecklistRow title="- รายการตู้เมนสวิตช์อื่นๆ" item={msb.other} onChange={(it) => updateMainSwitchboard(mIdx, 'other', it)} />
                    </div>

                    {/* ── ตาราง ๒.๔.๑ วงจรเมน (Main Circuit) ของตู้นี้ ── */}
                    <div className="subgroup-card">
                      <div className="subgroup-hdr-flex">
                        <div>
                          <h3 className="subgroup-title">วงจรเมน (Main Circuit)</h3>
                          <p className="subgroup-desc">สายเข้าเมนสวิตช์และรางเดินสายของตู้เมนฯ ที่ {msb.no || mIdx + 1}</p>
                        </div>
                        <button type="button" className="btn-add-mini" onClick={() => addMainCircuitToMdb(mIdx)}>
                          + เพิ่มวงจรเมน
                        </button>
                      </div>

                      {circuits.length > 0 && (
                        <ItemSwitcher
                          label="เลือกวงจรเมนของตู้นี้"
                          items={circuits}
                          currentIndex={safeCIdx}
                          onSelect={setActiveCircuitIdx}
                          onAdd={() => addMainCircuitToMdb(mIdx)}
                          addLabel="+ เพิ่มวงจรเมน"
                          onDelete={(cIdx) => removeMainCircuitFromMdb(mIdx, cIdx)}
                          deleteLabel="ลบวงจรเมนชุดนี้"
                          canDelete={circuits.length > 1}
                          badgeText={`วงจรที่ ${safeCIdx + 1} จาก ${circuits.length}`}
                          renderOptionLabel={(mc, i) => `วงจรเมน ชุดที่ ${i + 1}${mc.phaseWire?.type ? ' (' + mc.phaseWire.type + ' ' + (mc.phaseWire.size || '') + ')' : ''}`}
                        />
                      )}

                      {currentCircuit && (
                        <div key={currentCircuit.id || safeCIdx} className="nested-item-box">
                          <div className="nested-item-hdr">
                            <span className="nested-item-badge">วงจรเมน ชุดที่ {safeCIdx + 1}</span>
                            {circuits.length > 1 && (
                              <button type="button" className="btn-del-mini" onClick={() => removeMainCircuitFromMdb(mIdx, safeCIdx)}>
                                🗑 ลบชุดนี้
                              </button>
                            )}
                          </div>

                          <h5 className="group-sub-title">๒.๔.๑.๑ สายเข้าเมนสวิตช์</h5>
                          <div className="field-grid field-grid--2">
                            <div className="field">
                              <label>สายเฟส (ชนิด / ขนาด mm²)</label>
                              <div className="field-row">
                                <input
                                  type="text"
                                  placeholder="ชนิดสาย เช่น NYY..."
                                  value={currentCircuit.phaseWire?.type || ''}
                                  onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'phaseWire', { ...currentCircuit.phaseWire, type: e.target.value })}
                                />
                                <input
                                  type="text"
                                  placeholder="ขนาด mm²..."
                                  value={currentCircuit.phaseWire?.size || ''}
                                  onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'phaseWire', { ...currentCircuit.phaseWire, size: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="field">
                              <label>สายนิวทรัล (ชนิด / ขนาด mm²)</label>
                              <div className="field-row">
                                <input
                                  type="text"
                                  placeholder="ชนิดสาย..."
                                  value={currentCircuit.neutralWire?.type || ''}
                                  onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'neutralWire', { ...currentCircuit.neutralWire, type: e.target.value })}
                                />
                                <input
                                  type="text"
                                  placeholder="ขนาด mm²..."
                                  value={currentCircuit.neutralWire?.size || ''}
                                  onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'neutralWire', { ...currentCircuit.neutralWire, size: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="field" style={{ marginTop: 8 }}>
                            <label>วิธีเดินสาย (เดินใน)</label>
                            <select
                              value={currentCircuit.raceway}
                              onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'raceway', e.target.value)}
                            >
                              <option value="conduit">ท่อร้อยสาย (Conduit)</option>
                              <option value="wireway">รางเดินสาย (Wire Way)</option>
                              <option value="cabletray">รางเคเบิล (Cable Tray)</option>
                              <option value="rack">ลูกถ้วยราวยึดสาย (Rack)</option>
                              <option value="other">อื่นๆ</option>
                            </select>
                          </div>

                          <h5 className="group-sub-title" style={{ marginTop: 14 }}>รายการตรวจสอบ</h5>
                          <ChecklistRow title="๒.๔.๑.๒ รางเดินสายและรางเคเบิล" item={currentCircuit.items.racewayCondition} onChange={(it) => updateMainCircuitInMdb(mIdx, safeCIdx, 'items', { ...currentCircuit.items, racewayCondition: it })} />
                          <ChecklistRow title="๒.๔.๑.๓ สภาพฉนวนสายไฟ" item={currentCircuit.items.insulation} onChange={(it) => updateMainCircuitInMdb(mIdx, safeCIdx, 'items', { ...currentCircuit.items, insulation: it })} />
                          <ChecklistRow title="๒.๔.๑.๔ สภาพจุดต่อของสาย" item={currentCircuit.items.joints} onChange={(it) => updateMainCircuitInMdb(mIdx, safeCIdx, 'items', { ...currentCircuit.items, joints: it })} />
                          <ChecklistRow title="๒.๔.๑.๕ การป้องกันความร้อนจากการเหนี่ยวนำ" item={currentCircuit.items.inductionHeatProtection} onChange={(it) => updateMainCircuitInMdb(mIdx, safeCIdx, 'items', { ...currentCircuit.items, inductionHeatProtection: it })} />

                          <div className="field" style={{ marginTop: 12 }}>
                            <label style={{ fontWeight: 700 }}>๒.๔.๑.๖ อุณหภูมิของอุปกรณ์</label>
                            <div className="radio-group-box">
                              <label className="radio-opt">
                                <input
                                  type="radio"
                                  name={`temp_mc_${mIdx}_${safeCIdx}`}
                                  checked={currentCircuit.temperature === 'normal'}
                                  onChange={() => updateMainCircuitInMdb(mIdx, safeCIdx, 'temperature', 'normal')}
                                />
                                <span>✓ ปกติ</span>
                              </label>
                              <label className="radio-opt">
                                <input
                                  type="radio"
                                  name={`temp_mc_${mIdx}_${safeCIdx}`}
                                  checked={currentCircuit.temperature === 'abnormal'}
                                  onChange={() => updateMainCircuitInMdb(mIdx, safeCIdx, 'temperature', 'abnormal')}
                                />
                                <span>✕ ผิดปกติ</span>
                              </label>
                            </div>
                          </div>

                          <h5 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๑.๗ อื่นๆ</h5>
                          <div className="field" style={{ marginBottom: 8 }}>
                            <input
                              type="text"
                              placeholder="๒.๔.๑.๗ อื่นๆ (ระบุ)..."
                              value={currentCircuit.otherText || ''}
                              onChange={(e) => updateMainCircuitInMdb(mIdx, safeCIdx, 'otherText', e.target.value)}
                            />
                          </div>
                          <ChecklistRow title="- รายการวงจรเมนอื่นๆ" item={currentCircuit.other} onChange={(it) => updateMainCircuitInMdb(mIdx, safeCIdx, 'other', it)} />
                        </div>
                      )}

                      {/* Bottom Add Circuit Button */}
                      <div className="subgroup-bottom-add-bar">
                        <button type="button" className="btn-add-mini-bottom" onClick={() => addMainCircuitToMdb(mIdx)}>
                          + เพิ่มวงจรเมนชุดใหม่
                        </button>
                      </div>
                    </div>

                    {/* ── ตาราง ๒.๔.๒ แผงย่อย (Sub Panel / DB) ของตู้นี้ ── */}
                    <div className="subgroup-card">
                      <div className="subgroup-hdr-flex">
                        <div>
                          <h3 className="subgroup-title">แผงย่อย (Distribution Board - DB)</h3>
                          <p className="subgroup-desc">แผงวงจรย่อยที่ต่อแยกจากตู้เมนสวิตช์ที่ {msb.no || mIdx + 1}</p>
                        </div>
                        <button type="button" className="btn-add-mini" onClick={() => addSubPanelToMdb(mIdx)}>
                          + เพิ่มแผงย่อย (DB)
                        </button>
                      </div>

                      {panels.length > 0 && (
                        <ItemSwitcher
                          label="เลือกแผงย่อย (DB) ของตู้นี้"
                          items={panels}
                          currentIndex={safeSIdx}
                          onSelect={setActiveSubPanelIdx}
                          onAdd={() => addSubPanelToMdb(mIdx)}
                          addLabel="+ เพิ่มแผงย่อย (DB)"
                          onDelete={(sIdx) => removeSubPanelFromMdb(mIdx, sIdx)}
                          deleteLabel="ลบแผงย่อยนี้"
                          canDelete={panels.length > 1}
                          badgeText={`แผงที่ ${safeSIdx + 1} จาก ${panels.length}`}
                          renderOptionLabel={(sp, i) => `แผงย่อยที่ ${sp.no || i + 1}${sp.location ? ' - ' + sp.location : ''}`}
                        />
                      )}

                      {currentPanel && (
                        <div key={currentPanel.id || safeSIdx} className="nested-item-box">
                          <div className="nested-item-hdr">
                            <span className="nested-item-badge">แผงย่อยที่ {currentPanel.no || safeSIdx + 1}</span>
                            {panels.length > 1 && (
                              <button type="button" className="btn-del-mini" onClick={() => removeSubPanelFromMdb(mIdx, safeSIdx)}>
                                🗑 ลบแผงนี้
                              </button>
                            )}
                          </div>

                          <div className="field-grid field-grid--3">
                            <div className="field">
                              <label>แผงย่อยที่</label>
                              <input
                                type="text"
                                placeholder="เช่น DB-1, LP-2..."
                                value={currentPanel.no}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'no', e.target.value)}
                              />
                            </div>
                            <div className="field">
                              <label>ตำแหน่ง / พื้นที่ติดตั้ง</label>
                              <input
                                type="text"
                                placeholder="เช่น ชั้น 2 โซน A..."
                                value={currentPanel.location}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'location', e.target.value)}
                              />
                            </div>
                            <div className="field">
                              <label>การติดตั้ง</label>
                              <select
                                value={currentPanel.locationType}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'locationType', e.target.value)}
                              >
                                <option value="indoor">ภายในอาคาร</option>
                                <option value="outdoor">ภายนอกอาคาร</option>
                                <option value="other">อื่นๆ</option>
                              </select>
                            </div>
                          </div>

                          <h5 className="group-sub-title" style={{ marginTop: 14 }}>๒.๔.๒.๑ รายการตรวจสอบสภาพแผงย่อย</h5>
                          <ChecklistRow title="- สภาพทั่วไป" item={currentPanel.items.generalCondition} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, generalCondition: it })} />
                          <ChecklistRow title="- จุดต่อสาย และจุดต่อบัสบาร์" item={currentPanel.items.busbarJoints} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, busbarJoints: it })} />
                          <ChecklistRow title="- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งแผงย่อย" item={currentPanel.items.workingSpace} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, workingSpace: it })} />
                          <ChecklistRow title="- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน" item={currentPanel.items.lighting} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, lighting: it })} />
                          <ChecklistRow title="- การต่อฝาก" item={currentPanel.items.bonding} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, bonding: it })} />
                          <ChecklistRow title="- การป้องกันส่วนสัมผัสที่มีไฟฟ้า" item={currentPanel.items.livePartProtection} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'items', { ...currentPanel.items, livePartProtection: it })} />

                          <h5 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๒ เครื่องป้องกันกระแสเกินของแผงย่อย</h5>
                          <div className="field-grid field-grid--3">
                            <div className="field">
                              <label>ชนิด</label>
                              <input
                                type="text"
                                value={currentPanel.overcurrentProtection?.type || ''}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'overcurrentProtection', { ...currentPanel.overcurrentProtection, type: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <label>IC (kA)</label>
                              <input
                                type="text"
                                value={currentPanel.overcurrentProtection?.icKa || ''}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'overcurrentProtection', { ...currentPanel.overcurrentProtection, icKa: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <label>แรงดัน (V)</label>
                              <input
                                type="text"
                                value={currentPanel.overcurrentProtection?.volt || ''}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'overcurrentProtection', { ...currentPanel.overcurrentProtection, volt: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <label>พิกัดกระแส AT (A)</label>
                              <input
                                type="text"
                                value={currentPanel.overcurrentProtection?.atAmp || ''}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'overcurrentProtection', { ...currentPanel.overcurrentProtection, atAmp: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <label>AF (A)</label>
                              <input
                                type="text"
                                value={currentPanel.overcurrentProtection?.afAmp || ''}
                                onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'overcurrentProtection', { ...currentPanel.overcurrentProtection, afAmp: e.target.value })}
                              />
                            </div>
                          </div>

                          <h5 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๓ สายดินของแผงย่อย</h5>
                          <div className="field-row" style={{ margin: '8px 0' }}>
                            <input
                              type="text"
                              placeholder="ชนิดสายดิน..."
                              value={currentPanel.grounding?.wireType || ''}
                              onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'grounding', { ...currentPanel.grounding, wireType: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="ขนาด (mm²)..."
                              value={currentPanel.grounding?.wireSize || ''}
                              onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'grounding', { ...currentPanel.grounding, wireSize: e.target.value })}
                            />
                          </div>
                          <ChecklistRow title="- สภาพสายดินและจุดต่อ" item={currentPanel.grounding} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'grounding', { ...currentPanel.grounding, ...it })} />

                          <div className="field" style={{ marginTop: 12 }}>
                            <label style={{ fontWeight: 700 }}>๒.๔.๒.๔ อุณหภูมิของอุปกรณ์</label>
                            <div className="radio-group-box">
                              <label className="radio-opt">
                                <input
                                  type="radio"
                                  name={`temp_sp_${mIdx}_${safeSIdx}`}
                                  checked={currentPanel.temperature === 'normal'}
                                  onChange={() => updateSubPanelInMdb(mIdx, safeSIdx, 'temperature', 'normal')}
                                />
                                <span>✓ ปกติ</span>
                              </label>
                              <label className="radio-opt">
                                <input
                                  type="radio"
                                  name={`temp_sp_${mIdx}_${safeSIdx}`}
                                  checked={currentPanel.temperature === 'abnormal'}
                                  onChange={() => updateSubPanelInMdb(mIdx, safeSIdx, 'temperature', 'abnormal')}
                                />
                                <span>✕ ผิดปกติ</span>
                              </label>
                            </div>
                          </div>

                          <h5 className="group-sub-title" style={{ marginTop: 16 }}>๒.๔.๒.๕ อื่นๆ</h5>
                          <div className="field" style={{ marginBottom: 8 }}>
                            <input
                              type="text"
                              placeholder="๒.๔.๒.๕ อื่นๆ (ระบุ)..."
                              value={currentPanel.otherText || ''}
                              onChange={(e) => updateSubPanelInMdb(mIdx, safeSIdx, 'otherText', e.target.value)}
                            />
                          </div>
                          <ChecklistRow title="- รายการแผงย่อยอื่นๆ" item={currentPanel.other} onChange={(it) => updateSubPanelInMdb(mIdx, safeSIdx, 'other', it)} />
                        </div>
                      )}

                      {/* Bottom Add SubPanel Button */}
                      <div className="subgroup-bottom-add-bar">
                        <button type="button" className="btn-add-mini-bottom" onClick={() => addSubPanelToMdb(mIdx)}>
                          + เพิ่มแผงย่อยชุดใหม่
                        </button>
                      </div>
                    </div>

                    {/* ── ตาราง ๒.๕ บริภัณฑ์ไฟฟ้าอื่นๆ ในอาคารนี้ ── */}
                    <div className="subgroup-card">
                      <div className="subgroup-hdr-flex">
                        <div>
                          <h3 className="subgroup-title">บริภัณฑ์ไฟฟ้าอื่นๆ</h3>
                          <p className="subgroup-desc">เช่น มอเตอร์, ตู้เย็น/เครื่องทำน้ำดื่ม, เครื่องเชื่อม ภายใต้อาคารนี้</p>
                        </div>
                        <button type="button" className="btn-add-mini" onClick={() => addOtherEquipmentToMdb(mIdx)}>
                          + เพิ่มบริภัณฑ์ไฟฟ้า
                        </button>
                      </div>

                      {equips.length > 0 && (
                        <ItemSwitcher
                          label="เลือกบริภัณฑ์ไฟฟ้าในอาคารนี้"
                          items={equips}
                          currentIndex={safeEIdx}
                          onSelect={setActiveEquipIdx}
                          onAdd={() => addOtherEquipmentToMdb(mIdx)}
                          addLabel="+ เพิ่มบริภัณฑ์ไฟฟ้า"
                          onDelete={(eIdx) => removeOtherEquipmentFromMdb(mIdx, eIdx)}
                          deleteLabel="ลบบริภัณฑ์นี้"
                          canDelete={equips.length > 1}
                          badgeText={`รายการที่ ${safeEIdx + 1} จาก ${equips.length}`}
                          renderOptionLabel={(eq, i) => `บริภัณฑ์ที่ ${i + 1}${eq.name ? ' : ' + eq.name : ''}`}
                        />
                      )}

                      {currentEquip && (
                        <div key={currentEquip.id || safeEIdx} className="nested-item-box">
                          <div className="nested-item-hdr">
                            <span className="nested-item-badge">บริภัณฑ์ที่ {safeEIdx + 1}</span>
                            {equips.length > 1 && (
                              <button type="button" className="btn-del-mini" onClick={() => removeOtherEquipmentFromMdb(mIdx, safeEIdx)}>
                                🗑 ลบรายการนี้
                              </button>
                            )}
                          </div>

                          <div className="field">
                            <label>ชื่อบริภัณฑ์ไฟฟ้า</label>
                            <input
                              type="text"
                              placeholder="เช่น มอเตอร์ปั๊มน้ำ, ตู้เย็น, แอร์, เครื่องเชื่อม..."
                              value={currentEquip.name || ''}
                              onChange={(e) => updateOtherEquipmentInMdb(mIdx, safeEIdx, 'name', e.target.value)}
                            />
                          </div>

                          <ChecklistRow title="๒.๕.๑ การติดตั้ง" item={currentEquip.installation} onChange={(it) => updateOtherEquipmentInMdb(mIdx, safeEIdx, 'installation', it)} />
                          <ChecklistRow title="๒.๕.๒ สภาพภายนอก" item={currentEquip.external} onChange={(it) => updateOtherEquipmentInMdb(mIdx, safeEIdx, 'external', it)} />

                          <h5 className="group-sub-title" style={{ marginTop: 16 }}>๒.๕.๓ อื่นๆ</h5>
                          <div className="field" style={{ marginTop: 8 }}>
                            <input
                              type="text"
                              placeholder="๒.๕.๓ อื่นๆ (ระบุ)..."
                              value={currentEquip.otherText || ''}
                              onChange={(e) => updateOtherEquipmentInMdb(mIdx, safeEIdx, 'otherText', e.target.value)}
                            />
                          </div>
                          <ChecklistRow title="- สภาพรายการอื่นๆ" item={currentEquip.other} onChange={(it) => updateOtherEquipmentInMdb(mIdx, safeEIdx, 'other', it)} />
                        </div>
                      )}

                      {/* Bottom Add Equipment Button */}
                      <div className="subgroup-bottom-add-bar">
                        <button type="button" className="btn-add-mini-bottom" onClick={() => addOtherEquipmentToMdb(mIdx)}>
                          + เพิ่มบริภัณฑ์ไฟฟ้าชุดใหม่
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

                    {/* Bottom Add MDB Button */}
                    <div className="section-bottom-add-bar">
                      <button
                        type="button"
                        className="btn-add-item-bottom"
                        onClick={() => addMainSwitchboardForTransformer(selectedTfForMdb)}
                      >
                        + เพิ่มตู้เมนสวิตช์ / อาคาร สำหรับหม้อแปลงลูกที่ {selectedTfForMdb}
                      </button>
                    </div>
                  </>
                );
              })()}

              <div className="cat-bottom-nav">
                <button type="button" className="btn-secondary" onClick={() => setCatTab('transformer')}>
                  ‹ ก่อนหน้า: หม้อแปลงไฟฟ้า
                </button>
                <button type="button" className="btn-primary" onClick={() => setStep(4)}>
                  ถัดไป: สรุปผล & บันทึก ›
                </button>
              </div>
            </div>
          )}
        </section>
        );
      })()}
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
        /* ── Step navigation — Bubble Capsule Pill Bar ── */
        .step-nav-capsules {
          display: flex;
          gap: 8px;
          margin-bottom: 22px;
          background: rgba(17, 29, 50, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          border-radius: 9999px;
          padding: 6px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
          overflow-x: auto;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .step-nav-capsules::-webkit-scrollbar {
          display: none;
        }
        .step-bubble-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--bg-surface-raised, #172340);
          border: 1.5px solid var(--border-hairline, #1e2e4a);
          border-radius: 9999px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          flex-shrink: 0;
          color: var(--ink-secondary, #94a3c4);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .step-bubble-btn:hover:not(.step-bubble-btn--active) {
          background: rgba(30, 58, 138, 0.35);
          border-color: rgba(59, 130, 246, 0.45);
          color: #ffffff;
        }
        .step-bubble-btn--active {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%) !important;
          border-color: #93c5fd !important;
          color: #ffffff !important;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.55), inset 0 1px 1px rgba(255,255,255,0.4) !important;
          transform: scale(1.02);
        }
        .step-bubble-btn--done:not(.step-bubble-btn--active) {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          color: #4ade80;
        }
        .step-bubble-icon {
          font-size: 15px;
          line-height: 1;
          flex-shrink: 0;
        }
        .step-bubble-title {
          font-size: 13px;
          font-weight: 700;
          color: inherit;
          white-space: nowrap;
        }
        .step-bubble-btn--active .step-bubble-title {
          color: #ffffff;
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
        /* ── Status Pills (✓ ใช้ได้, △ ควรปรับปรุง, ✕ ต้องแก้ไข — 3D Bubble Capsules) ── */
        .status-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 9999px;
          border: 1.5px solid rgba(148, 163, 196, 0.22);
          background: rgba(23, 35, 64, 0.7);
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-secondary);
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .status-pill:hover:not(.status-pill--pass):not(.status-pill--improve):not(.status-pill--fix) {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(37, 99, 235, 0.12);
          color: #ffffff;
        }
        .status-pill input {
          display: none;
        }
        .status-pill--pass {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
          color: #ffffff !important;
          border: 1.5px solid #6ee7b7 !important;
          box-shadow: 0 3px 12px rgba(16, 185, 129, 0.45) !important;
          transform: scale(1.02);
        }
        .status-pill--improve {
          background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%) !important;
          color: #ffffff !important;
          border: 1.5px solid #fde68a !important;
          box-shadow: 0 3px 12px rgba(245, 158, 11, 0.45) !important;
          transform: scale(1.02);
        }
        .status-pill--fix {
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
          color: #ffffff !important;
          border: 1.5px solid #fca5a5 !important;
          box-shadow: 0 3px 12px rgba(239, 68, 68, 0.45) !important;
          transform: scale(1.02);
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
          .step-nav-capsules {
            border-radius: 9999px;
            padding: 4px;
            gap: 6px;
          }
          .step-bubble-btn {
            flex: 0 0 auto;
            padding: 8px 14px;
          }
          .step-bubble-title {
            font-size: 12px;
          }
          .check-row__main {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .check-row__title {
            font-size: 13px;
            line-height: 1.4;
            word-break: break-word;
          }
          .check-row__options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
            width: 100%;
          }
          .status-pill {
            justify-content: center;
            text-align: center;
            padding: 8px 2px;
            font-size: 11px;
            white-space: nowrap;
            letter-spacing: -0.3px;
            border-radius: 9999px;
          }
          .status-pill span {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .elec-year-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .cat-subnav-box {
            border-radius: 9999px;
            padding: 4px;
          }
          .cat-subnav-pills {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            flex-wrap: nowrap;
            scrollbar-width: none;
          }
          .cat-subnav-pills::-webkit-scrollbar {
            display: none;
          }
          .cat-tab-btn {
            flex: 0 0 auto;
            padding: 8px 14px;
            border-radius: 9999px;
          }
          .cat-tab-title {
            font-size: 12.5px;
            white-space: nowrap;
          }
          .cat-tab-badge {
            font-size: 10px;
            padding: 1px 6px;
          }
          .year-bubble-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .year-bubble-card {
            padding: 16px 10px;
            gap: 8px;
          }
          .ybc-num {
            font-size: 26px;
          }
          .item-switcher-top {
            flex-direction: column;
            align-items: stretch;
          }
          .item-switcher-actions-top {
            justify-content: space-between;
          }
          .item-switcher-select {
            font-size: 12.5px;
            padding: 8px 12px;
          }
          .btn-switcher-nav {
            padding: 8px 10px;
            font-size: 12px;
          }
          .btn-add-item-bottom {
            font-size: 13px;
            padding: 12px 16px;
            border-radius: 9999px;
          }
          .mcs-step-row, .mcs-select-row {
            flex-direction: column;
            align-items: stretch;
          }
          .mcs-select-wrapper {
            min-width: 0;
            width: 100%;
          }
          .mcs-btn-action, .mcs-btn-del {
            width: 100%;
            text-align: center;
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

        /* ── Screen 0: Year Selection Card (Navy / Royal Blue Modern Theme) ── */
        .year-select-container {
          max-width: 580px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 60px;
        }
        /* ── Year Selection — 3D Bubble Balloon Cards ── */
        .year-intro-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(17, 29, 50, 0.85) 100%);
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          margin-bottom: 8px;
        }
        .yic-badge-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: rgba(37, 99, 235, 0.2);
          border: 1.5px solid rgba(96, 165, 250, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }
        .yic-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px;
        }
        .yic-sub {
          font-size: 13px;
          color: var(--ink-secondary, #94a3c4);
          margin: 0;
          line-height: 1.4;
        }
        .year-bubble-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }
        .year-bubble-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px 16px;
          border-radius: 22px;
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          background: linear-gradient(135deg, rgba(23, 35, 64, 0.95) 0%, rgba(17, 29, 50, 0.95) 100%);
          cursor: pointer;
          font-family: inherit;
          text-align: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.08);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-tap-highlight-color: transparent;
        }
        .year-bubble-card:hover {
          transform: translateY(-3px);
          border-color: #60a5fa;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(23, 35, 64, 0.95) 100%);
          box-shadow: 0 14px 36px rgba(37, 99, 235, 0.4);
        }
        .year-bubble-card:active {
          transform: scale(0.97);
        }
        .year-bubble-card--has-data {
          border-color: rgba(245, 158, 11, 0.45);
        }
        .year-bubble-card--has-data:hover {
          border-color: #fbbf24;
          box-shadow: 0 14px 36px rgba(245, 158, 11, 0.35);
        }
        .ybc-num-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ybc-num {
          font-size: 34px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .ybc-sub {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }
        .ybc-status-wrap {
          width: 100%;
        }
        .ybc-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          width: 100%;
          box-sizing: border-box;
        }
        .ybc-pill--amber {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.5);
          color: #fbbf24;
        }
        .ybc-pill--blue {
          background: rgba(37, 99, 235, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: #93c5fd;
        }
        .year-older-pill-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-surface-raised, #172340);
          border: 1.5px solid var(--border-hairline, #1e2e4a);
          border-radius: 9999px;
          padding: 10px 18px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .yob-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        .yob-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink-secondary, #94a3c4);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .year-older-select {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          color: var(--ink-primary, #eef2ff);
          font-size: 13.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          outline: none;
        }
        .year-badge-bubble {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.18);
          border: 1.5px solid rgba(59, 130, 246, 0.45);
          color: #93c5fd;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .year-badge-bubble:hover {
          background: rgba(37, 99, 235, 0.28);
          border-color: #60a5fa;
          color: #ffffff;
        }
        .year-badge-icon {
          font-size: 16px;
        }
        .year-badge-text {
          font-weight: 800;
        }
        .year-badge-change {
          font-size: 11px;
          opacity: 0.8;
          text-decoration: underline;
        }

        /* ── Existing reports card on pageStep 0 ── */
        .existing-reports-card {
          background: linear-gradient(180deg, rgba(23, 35, 64, 0.85) 0%, rgba(17, 29, 50, 0.9) 100%);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .erc-title {
          font-size: 14px;
          font-weight: 700;
          color: #93c5fd;
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
          background: rgba(17, 29, 50, 0.85);
          border: 1px solid rgba(148, 163, 196, 0.18);
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
          color: #ffffff;
        }
        .erc-date {
          font-size: 12px;
          color: var(--ink-secondary, #94a3c4);
        }
        .erc-bld {
          font-size: 11px;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          padding: 2px 7px;
          border-radius: 6px;
          color: #93c5fd;
          font-weight: 600;
        }
        .erc-item-btn {
          background: rgba(37, 99, 235, 0.15);
          border: 1.5px solid rgba(59, 130, 246, 0.4);
          color: #93c5fd;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .erc-item-btn:hover {
          background: #2563eb;
          border-color: #3b82f6;
          color: #ffffff;
        }

        /* ── Modern Master-Detail Item Switcher (Bubble Balloon Panel) ── */
        .item-switcher-box {
          background: linear-gradient(180deg, rgba(23, 35, 64, 0.95) 0%, rgba(17, 29, 50, 0.98) 100%);
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          border-radius: 20px;
          padding: 14px 16px;
          margin-bottom: 18px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .item-switcher-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .item-switcher-label-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .item-switcher-tag {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
        }
        .item-switcher-badge {
          background: rgba(37, 99, 235, 0.25);
          border: 1px solid rgba(96, 165, 250, 0.45);
          color: #93c5fd;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }
        .item-switcher-actions-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-switcher-del {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-switcher-del:hover {
          background: #ef4444;
          color: #ffffff;
        }
        .btn-switcher-add {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          border: 1px solid #93c5fd;
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
          transition: all 0.15s ease;
        }
        .btn-switcher-add:hover {
          background: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
        }
        .item-switcher-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-switcher-nav {
          background: rgba(17, 29, 50, 0.9);
          border: 1.5px solid rgba(148, 163, 196, 0.25);
          color: #eef2ff;
          padding: 9px 14px;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .btn-switcher-nav:hover:not(:disabled) {
          border-color: #60a5fa;
          background: rgba(37, 99, 235, 0.2);
          color: #93c5fd;
        }
        .btn-switcher-nav:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .item-switcher-select-wrap {
          flex: 1;
          min-width: 0;
        }
        .item-switcher-select {
          width: 100%;
          background: var(--bg-input, #080e1a);
          border: 1.5px solid rgba(59, 130, 246, 0.45);
          border-radius: 9999px;
          color: #ffffff;
          padding: 9px 16px;
          font-size: 13.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s ease;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .item-switcher-select:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
        }

        /* ── Cascading 2-Step Dropdown Selector for MDB & Transformers ── */
        .mdb-cascading-panel {
          background: linear-gradient(180deg, rgba(23, 35, 64, 0.96) 0%, rgba(17, 29, 50, 0.98) 100%);
          border: 1.5px solid rgba(59, 130, 246, 0.38);
          border-radius: 22px;
          padding: 16px 18px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mcs-banner-title {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px dashed rgba(59, 130, 246, 0.25);
        }
        .mcs-main-icon {
          font-size: 26px;
          line-height: 1;
        }
        .mcs-title {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 2px;
        }
        .mcs-sub {
          font-size: 12px;
          color: var(--ink-secondary, #94a3c4);
          margin: 0;
        }
        .mcs-steps-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mcs-step-box {
          background: rgba(11, 20, 38, 0.7);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 16px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mcs-step-hdr {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mcs-step-badge {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 9999px;
          border: 1px solid rgba(147, 197, 253, 0.5);
        }
        .mcs-step-badge--step2 {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border-color: rgba(199, 210, 254, 0.5);
        }
        .mcs-step-label {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
        }
        .mcs-count-badge {
          margin-left: auto;
          font-size: 11.5px;
          color: #93c5fd;
          background: rgba(37, 99, 235, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 700;
        }
        .mcs-select-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mcs-select-wrapper {
          flex: 1;
          min-width: 200px;
        }
        .mcs-select {
          width: 100%;
          background: var(--bg-input, #080e1a);
          border: 1.5px solid rgba(59, 130, 246, 0.45);
          border-radius: 9999px;
          color: #ffffff;
          padding: 9px 16px;
          font-size: 13.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
        }
        .mcs-select:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
        }
        .mcs-btn-action {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: #ffffff;
          border: 1px solid #93c5fd;
          padding: 8px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
          transition: all 0.15s ease;
        }
        .mcs-btn-action:hover {
          background: #3b82f6;
          transform: translateY(-1px);
        }
        .mcs-btn-nav {
          background: rgba(17, 29, 50, 0.9);
          border: 1.5px solid rgba(148, 163, 196, 0.25);
          color: #eef2ff;
          padding: 8px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .mcs-btn-nav:hover:not(:disabled) {
          border-color: #60a5fa;
          background: rgba(37, 99, 235, 0.2);
          color: #93c5fd;
        }
        .mcs-btn-nav:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .mcs-btn-del {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          padding: 8px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .mcs-btn-del:hover {
          background: #ef4444;
          color: #ffffff;
        }
        .mcs-empty-balloon {
          background: rgba(245, 158, 11, 0.08);
          border: 1.5px dashed rgba(245, 158, 11, 0.4);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .mcs-empty-icon {
          font-size: 22px;
          flex-shrink: 0;
        }
        .mcs-empty-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 13px;
          font-weight: 700;
          color: #fde68a;
          flex: 1;
          min-width: 200px;
        }
        .mcs-empty-text small {
          font-size: 11.5px;
          font-weight: 500;
          color: #cbd5e1;
        }
        .mcs-btn-create-first {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          color: #ffffff;
          border: 1px solid #93c5fd;
          padding: 9px 16px;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .mcs-btn-create-first:hover {
          background: #3b82f6;
          transform: translateY(-1px);
        }

        /* ── Bottom Add Buttons (Bubble Balloon Pill Style) ── */
        .section-bottom-add-bar {
          margin: 20px 0 16px;
          display: flex;
          justify-content: center;
        }
        .btn-add-item-bottom {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          color: #ffffff;
          border: 1.5px solid #93c5fd;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          max-width: 440px;
        }
        .btn-add-item-bottom:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(37, 99, 235, 0.6);
        }
        .subgroup-bottom-add-bar {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }
        .btn-add-mini-bottom {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          background: rgba(37, 99, 235, 0.18);
          border: 1.5px solid rgba(59, 130, 246, 0.45);
          color: #93c5fd;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add-mini-bottom:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #93c5fd;
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
          padding: 28px 24px 22px;
          width: 100%;
          max-width: 410px;
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
        .elec-modal-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 2px;
        }
        .elec-modal-icon-wrap--amber {
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .elec-modal-icon-wrap--blue {
          background: rgba(59, 130, 246, 0.14);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .elec-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--ink-primary, #eef2ff);
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.35;
        }
        .elec-modal-msg {
          font-size: 13.5px;
          color: var(--ink-secondary, #94a3c4);
          margin: 0;
          line-height: 1.5;
        }
        .elec-modal-badge {
          background: var(--bg-input, #080e1a);
          border: 1px solid var(--border-hairline, #1e2e4a);
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 12px;
          color: var(--ink-muted, #7c8ba1);
          font-weight: 500;
          margin: 0 0 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .elec-modal-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }
        .elec-modal-card-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 16px;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: all 0.18s ease;
          box-sizing: border-box;
        }
        .elec-modal-card-btn--primary {
          border: 1.5px solid #3b82f6;
          background: rgba(59, 130, 246, 0.09);
        }
        .elec-modal-card-btn--primary:hover {
          background: rgba(59, 130, 246, 0.18);
          border-color: #60a5fa;
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(59, 130, 246, 0.28);
        }
        .elec-modal-card-btn--primary .elec-modal-card-title {
          color: #60a5fa;
        }
        .elec-modal-card-btn--secondary {
          border: 1.5px solid var(--border-strong, #2d3f5e);
          background: var(--bg-surface, #111d32);
        }
        .elec-modal-card-btn--secondary:hover {
          background: var(--border-hairline, #1e2e4a);
          border-color: #475569;
          transform: translateY(-1px);
        }
        .elec-modal-card-btn--secondary .elec-modal-card-title {
          color: var(--ink-primary, #eef2ff);
        }
        .elec-modal-card-btn--template {
          border: 1.5px solid #6366f1;
          background: rgba(99, 102, 241, 0.09);
        }
        .elec-modal-card-btn--template:hover {
          background: rgba(99, 102, 241, 0.18);
          border-color: #818cf8;
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(99, 102, 241, 0.28);
        }
        .elec-modal-card-btn--template .elec-modal-card-title {
          color: #a5b4fc;
        }
        .elec-modal-card-icon {
          font-size: 26px;
          flex-shrink: 0;
          line-height: 1;
        }
        .elec-modal-card-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .elec-modal-card-title {
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.3;
        }
        .elec-modal-card-sub {
          font-size: 12px;
          color: var(--ink-secondary, #94a3c4);
          line-height: 1.4;
        }
        .elec-modal-btn--cancel {
          background: transparent;
          border: none;
          color: var(--ink-muted, #64748b);
          font-size: 13px;
          font-weight: 600;
          padding: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s;
          margin-top: 2px;
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
      
                /* ── Subcategory Tabs Bar (3 หมวดหลัก — Bubble Balloon Capsules) ── */
        .cat-subnav-box {
          margin-bottom: 20px;
          background: rgba(17, 29, 50, 0.95);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          border-radius: 9999px;
          padding: 6px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .cat-subnav-pills {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .cat-subnav-pills::-webkit-scrollbar {
          display: none;
        }
        .cat-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 9999px;
          border: 1.5px solid var(--border-hairline, #1e2e4a);
          background: var(--bg-surface-raised, #172340);
          color: var(--ink-secondary, #94a3c4);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .cat-tab-btn:hover:not(.cat-tab-btn--active) {
          background: rgba(30, 58, 138, 0.35);
          color: #ffffff;
          border-color: rgba(59, 130, 246, 0.5);
        }
        .cat-tab-btn--active {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%) !important;
          border-color: #93c5fd !important;
          color: #ffffff !important;
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.55), inset 0 1px 1px rgba(255,255,255,0.4) !important;
          transform: scale(1.02);
        }
        .cat-tab-icon {
          font-size: 18px;
          flex-shrink: 0;
          line-height: 1;
        }
        .cat-tab-title {
          font-size: 13.5px;
          font-weight: 700;
          white-space: nowrap;
        }
        .cat-tab-badge {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.15);
          color: #dbeafe;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 800;
          white-space: nowrap;
          line-height: 1.2;
        }
        .cat-tab-btn--active .cat-tab-badge {
          background: rgba(255, 255, 255, 0.28);
          color: #ffffff;
        }

        /* ── MDB Unified Building Card ── */
        .mdb-unified-card {
          border-left: 4px solid var(--accent, #2563eb) !important;
          margin-bottom: 24px;
        }
        .mdb-sub-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-hairline);
          margin-bottom: 14px;
        }
        .mdb-tag-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mdb-badge-bld {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #a5b4fc;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .mdb-badge-tf {
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fcd34d;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .mdb-banner-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 14px;
          background: var(--bg-surface-raised, #172340);
          border: 1.5px solid var(--border-strong, #2d3f5e);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 18px;
        }
        .field-label-highlight {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--ink-primary);
          display: block;
          margin-bottom: 6px;
        }
        .select-highlight {
          width: 100%;
          background: var(--bg-input, #080e1a);
          border: 1.5px solid var(--accent, #2563eb);
          color: var(--ink-primary, #eef2ff);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          outline: none;
        }

        /* ── Subgroup Box within MDB (ตาราง 2.3, 2.4.1, 2.4.2, 2.5) ── */
        .subgroup-card {
          background: var(--bg-surface, #111d32);
          border: 1px solid var(--border-hairline, #1e2e4a);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .subgroup-hdr-flex {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-hairline);
        }
        .subgroup-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--ink-primary, #eef2ff);
          margin: 0;
        }
        .subgroup-desc {
          font-size: 12px;
          color: var(--ink-muted, #7c8ba1);
          margin: 3px 0 0;
        }
        .btn-add-mini {
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid var(--accent, #2563eb);
          color: #93c5fd;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add-mini:hover {
          background: var(--accent);
          color: #ffffff;
        }
        .btn-del-mini {
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ── Nested items inside subgroups (แต่ละวงจรเมน, แผงย่อย, บริภัณฑ์) ── */
        .nested-item-box {
          background: var(--bg-surface-raised, #172340);
          border: 1px solid var(--border-strong, #2d3f5e);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .nested-item-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-hairline);
        }
        .nested-item-badge {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--ink-primary);
        }

        /* ── Category bottom nav buttons ── */
        .cat-bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-hairline);
        }

        /* ── Mobile enhancements ── */
        @media (max-width: 768px) {
          .mdb-banner-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 12px;
          }
          .field-grid--3 {
            grid-template-columns: 1fr;
          }
          .cat-bottom-nav {
            flex-direction: column-reverse;
          }
          .cat-bottom-nav button {
            width: 100%;
            justify-content: center;
          }
        }

      `}</style>
        </div>
      </div>
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
