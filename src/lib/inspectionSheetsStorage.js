import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'data', 'inspection-sheets');
const TEMPLATES_FILE = path.join(BASE_DIR, 'templates.json');
const SETTINGS_FILE = path.join(BASE_DIR, 'settings.json');
const RECORDS_DIR = path.join(BASE_DIR, 'records');

// Default initial settings
export const defaultInspectionSettings = {
  header: {
    companyTitle: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)',
    companySubtitle: 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)',
    companyAddress: 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.',
    logoType: 'egat',
    customLogoUrl: '',
    showLetterhead: true,
    bannerTheme: 'white'
  },
  surveyor: {
    name: 'นายช่างเทคนิค กฟผ.',
    role: 'ช่างเทคนิค/วิศวกรระบบ',
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    signatureUrl: ''
  },
  runningNumber: {
    prefix: 'INS-',
    yearType: 'buddhist', // 'buddhist' or 'christian'
    nextNumber: 1,
    digits: 3
  },
  adminPin: '8888',
  updatedAt: new Date().toISOString()
};

// Default seed templates
export const defaultTemplates = [
  {
    id: 'tpl-mdb-monthly',
    name: 'แบบฟอร์มตรวจสอบตู้ควบคุมไฟฟ้า MDB และตู้ย่อย DB ประจำเดือน',
    code: 'FM-ENG-MDB-01',
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    frequency: 'รายเดือน',
    description: 'สำหรับตรวจสอบสภาพทั่วไป ความร้อน สภาพสายไฟ และมิเตอร์วัดของตู้สวิตช์บอร์ด MDB และ DB ย่อย',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    columns: [
      { id: 'c1', name: 'ลำดับ', type: 'text', width: 45, required: true },
      { id: 'c2', name: 'ตำแหน่ง / รหัสตู้', type: 'text', width: 130, required: true },
      { id: 'c3', name: 'รายการตรวจเช็ค', type: 'text', width: 200, required: true },
      { id: 'c4', name: 'แรงดัน / กระแส (V / A)', type: 'text', width: 110 },
      { id: 'c5', name: 'ผลการตรวจ', type: 'status', width: 95, options: ['ปกติ', 'ผิดปกติ', 'ไม่ได้ตรวจ'] },
      { id: 'c6', name: 'ภาพถ่ายประกอบ', type: 'photo', width: 105 },
      { id: 'c7', name: 'หมายเหตุ / การแก้ไข', type: 'text', width: 150 }
    ],
    defaultRows: [
      { c1: '1', c2: 'MDB อาคาร ท.102', c3: 'ตรวจสอบ Main Breaker และความแน่นของบัสบาร์', c4: '398V / 125A', c5: 'ปกติ', c6: null, c7: '-' },
      { c1: '2', c2: 'MDB อาคาร ท.102', c3: 'ตรวจสอบระบบระบายอากาศและพัดลมตู้', c4: 'ปกติ', c5: 'ปกติ', c6: null, c7: '-' },
      { c1: '3', c2: 'DB ชั้น 1-3', c3: 'ตรวจสอบความร้อนขั้วต่อสายและลูกเซอร์กิต', c4: '380V', c5: 'ปกติ', c6: null, c7: '-' },
      { c1: '4', c2: 'Capacitor Bank', c3: 'ตรวจสอบค่า Power Factor และสภาพตัวเก็บประจุ', c4: '0.98 PF', c5: 'ปกติ', c6: null, c7: '-' }
    ]
  },
  {
    id: 'tpl-booster-pump',
    name: 'แบบฟอร์มตรวจเช็คระบบสุขาภิบาลและปั๊มน้ำ (Sanitary & Booster Pump)',
    code: 'FM-ENG-PMP-02',
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    frequency: 'รายสัปดาห์',
    description: 'บันทึกการตรวจสอบแรงดันปั๊มน้ำ สภาพการทำงาน เสียงผิดปกติ และการรั่วซึม',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    columns: [
      { id: 'c1', name: 'ลำดับ', type: 'text', width: 45, required: true },
      { id: 'c2', name: 'ชื่ออุปกรณ์ / ปั๊ม', type: 'text', width: 140, required: true },
      { id: 'c3', name: 'จุดติดตั้ง / อาคาร', type: 'text', width: 120 },
      { id: 'c4', name: 'แรงดันส่ง (Bar)', type: 'number', unit: 'Bar', width: 95 },
      { id: 'c5', name: 'กระแสไฟ (A)', type: 'number', unit: 'A', width: 85 },
      { id: 'c6', name: 'สภาพการทำงาน', type: 'status', width: 95, options: ['ปกติ', 'ผิดปกติ', 'ไม่ได้ตรวจ'] },
      { id: 'c7', name: 'ภาพถ่ายประกอบ', type: 'photo', width: 105 },
      { id: 'c8', name: 'การดำเนินการ', type: 'text', width: 140 }
    ],
    defaultRows: [
      { c1: '1', c2: 'Booster Pump #1', c3: 'ห้องเครื่องชั้นใต้ดิน', c4: '3.5', c5: '12.8', c6: 'ปกติ', c7: null, c8: 'เดินเครื่องปกติ' },
      { c1: '2', c2: 'Booster Pump #2', c3: 'ห้องเครื่องชั้นใต้ดิน', c4: '3.5', c5: '12.5', c6: 'ปกติ', c7: null, c8: 'สแตนด์บาย' },
      { c1: '3', c2: 'Transfer Pump #1', c3: 'บ่อพักน้ำชั้นล่าง', c4: '2.8', c5: '9.2', c6: 'ปกติ', c7: null, c8: '-' }
    ]
  },
  {
    id: 'tpl-general-safety',
    name: 'แบบฟอร์มตรวจเช็คความปลอดภัยทั่วไปและสภาพพื้นที่ (General Safety Inspection)',
    code: 'FM-SAF-001',
    department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
    frequency: 'ตามรอบสำรวจ',
    description: 'ตรวจประเมินความปลอดภัย สภาพทางหนีไฟ ป้ายเตือน และความชำรุดเสียหายทั่วไป',
    isPreset: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    columns: [
      { id: 'c1', name: 'ลำดับ', type: 'text', width: 45, required: true },
      { id: 'c2', name: 'พื้นที่ / จุดตรวจ', type: 'text', width: 140, required: true },
      { id: 'c3', name: 'หัวข้อการตรวจสอบ', type: 'text', width: 210, required: true },
      { id: 'c4', name: 'สภาพความปลอดภัย', type: 'status', width: 110, options: ['ปลอดภัย/ปกติ', 'ต้องปรับปรุง', 'ไม่ได้ตรวจ'] },
      { id: 'c5', name: 'ภาพถ่ายสภาพหน้างาน', type: 'photo', width: 110 },
      { id: 'c6', name: 'ข้อเสนอแนะ / ผู้รับผิดชอบ', type: 'text', width: 160 }
    ],
    defaultRows: [
      { c1: '1', c2: 'โถงทางเดินชั้น 1-5', c3: 'ตรวจสอบทางหนีไฟไม่มีสิ่งกีดขวาง', c4: 'ปลอดภัย/ปกติ', c5: null, c6: '-' },
      { c1: '2', c2: 'ห้องเครื่องไฟฟ้า', c3: 'ตรวจสอบถังดับเพลิง CO2 พร้อมใช้งาน', c4: 'ปลอดภัย/ปกติ', c5: null, c6: '-' },
      { c1: '3', c2: 'บันไดหนีไฟด้านหลัง', c3: 'ไฟส่องสว่างฉุกเฉินและป้ายทางออก', c4: 'ปลอดภัย/ปกติ', c5: null, c6: '-' }
    ]
  }
];

// Ensure storage directories exist
function ensureDirs() {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
  if (!fs.existsSync(RECORDS_DIR)) fs.mkdirSync(RECORDS_DIR, { recursive: true });
}

// Load Settings
export async function loadInspectionSettings() {
  ensureDirs();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return {
        ...defaultInspectionSettings,
        ...data,
        header: { ...defaultInspectionSettings.header, ...(data.header || {}) },
        surveyor: { ...defaultInspectionSettings.surveyor, ...(data.surveyor || {}) },
        runningNumber: { ...defaultInspectionSettings.runningNumber, ...(data.runningNumber || {}) }
      };
    }
  } catch (err) {
    console.warn('loadInspectionSettings error:', err.message);
  }
  return { ...defaultInspectionSettings };
}

// Save Settings
export async function saveInspectionSettings(settings) {
  ensureDirs();
  const current = await loadInspectionSettings();
  const updated = {
    ...current,
    ...settings,
    header: { ...current.header, ...(settings.header || {}) },
    surveyor: { ...current.surveyor, ...(settings.surveyor || {}) },
    runningNumber: { ...current.runningNumber, ...(settings.runningNumber || {}) },
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// Load Templates
export async function loadInspectionTemplates() {
  ensureDirs();
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('loadInspectionTemplates error:', err.message);
  }
  // Initialize with default templates
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(defaultTemplates, null, 2), 'utf-8');
  return defaultTemplates;
}

// Save or Update Template
export async function saveInspectionTemplate(template) {
  ensureDirs();
  const templates = await loadInspectionTemplates();
  const now = new Date().toISOString();

  let updatedTemplate;
  const existingIdx = templates.findIndex(t => t.id === template.id);

  if (existingIdx >= 0) {
    updatedTemplate = {
      ...templates[existingIdx],
      ...template,
      updatedAt: now
    };
    templates[existingIdx] = updatedTemplate;
  } else {
    const id = template.id || `tpl-${Date.now()}`;
    updatedTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now
    };
    templates.unshift(updatedTemplate);
  }

  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf-8');
  return updatedTemplate;
}

// Delete Template
export async function deleteInspectionTemplate(templateId) {
  ensureDirs();
  const templates = await loadInspectionTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return { ok: true, id: templateId };
}

// Generate Auto Running Record Number
export async function generateInspectionRecordNo(settings) {
  const currentSettings = settings || (await loadInspectionSettings());
  const run = currentSettings.runningNumber || defaultInspectionSettings.runningNumber;
  const prefix = run.prefix || 'INS-';
  const now = new Date();
  const year = run.yearType === 'buddhist' ? (now.getFullYear() + 543) : now.getFullYear();
  const digits = run.digits || 3;

  // Scan existing records to find highest number for this year
  const records = await listInspectionRecords();
  let maxNum = run.nextNumber || 1;

  records.forEach(r => {
    if (r.recordNo && r.recordNo.startsWith(`${prefix}${year}-`)) {
      const part = r.recordNo.replace(`${prefix}${year}-`, '');
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= maxNum) {
        maxNum = num + 1;
      }
    }
  });

  return `${prefix}${year}-${String(maxNum).padStart(digits, '0')}`;
}

// List Inspection Records
export async function listInspectionRecords() {
  ensureDirs();
  const records = [];

  try {
    const yms = fs.readdirSync(RECORDS_DIR);
    for (const ym of yms) {
      const ymPath = path.join(RECORDS_DIR, ym);
      if (fs.existsSync(ymPath) && fs.statSync(ymPath).isDirectory()) {
        const files = fs.readdirSync(ymPath);
        for (const f of files) {
          if (f.endsWith('.json')) {
            try {
              const content = JSON.parse(fs.readFileSync(path.join(ymPath, f), 'utf-8'));
              records.push(content);
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('listInspectionRecords error:', err.message);
  }

  // Sort newest first
  return records.sort((a, b) => {
    const da = a.createdAt || a.inspectionDate || '';
    const db = b.createdAt || b.inspectionDate || '';
    return db.localeCompare(da);
  });
}

// Load Single Record by RecordNo or ID
export async function loadInspectionRecord(idOrRecordNo) {
  const records = await listInspectionRecords();
  return records.find(r => r.id === idOrRecordNo || r.recordNo === idOrRecordNo) || null;
}

// Save or Update Inspection Record
export async function saveInspectionRecord(record) {
  ensureDirs();
  const now = new Date();
  const dateStr = record.inspectionDate || now.toISOString().slice(0, 10);
  const ym = dateStr.slice(0, 7); // e.g. "2026-06"
  const ymDir = path.join(RECORDS_DIR, ym);

  if (!fs.existsSync(ymDir)) fs.mkdirSync(ymDir, { recursive: true });

  const settings = await loadInspectionSettings();
  let recordNo = record.recordNo;

  if (!recordNo) {
    recordNo = await generateInspectionRecordNo(settings);
  }

  const id = record.id || `rec-${Date.now()}`;
  const safeRecordNo = String(recordNo).replace(/[/\\:*?"<>|]/g, '-');
  const filePath = path.join(ymDir, `${safeRecordNo}.json`);

  const fullRecord = {
    ...record,
    id,
    recordNo,
    updatedAt: now.toISOString(),
    createdAt: record.createdAt || now.toISOString()
  };

  fs.writeFileSync(filePath, JSON.stringify(fullRecord, null, 2), 'utf-8');

  // Increment running nextNumber in settings
  try {
    const match = recordNo.match(/-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= (settings.runningNumber?.nextNumber || 1)) {
        await saveInspectionSettings({
          ...settings,
          runningNumber: {
            ...settings.runningNumber,
            nextNumber: num + 1
          }
        });
      }
    }
  } catch {}

  return fullRecord;
}

// Delete Inspection Record
export async function deleteInspectionRecord(idOrRecordNo) {
  ensureDirs();
  const safe = String(idOrRecordNo).replace(/[/\\:*?"<>|]/g, '-');
  let deleted = false;

  try {
    const yms = fs.readdirSync(RECORDS_DIR);
    for (const ym of yms) {
      const ymPath = path.join(RECORDS_DIR, ym);
      if (fs.existsSync(ymPath) && fs.statSync(ymPath).isDirectory()) {
        const files = fs.readdirSync(ymPath);
        for (const f of files) {
          if (f === `${safe}.json` || f.includes(safe)) {
            try {
              fs.unlinkSync(path.join(ymPath, f));
              deleted = true;
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('deleteInspectionRecord error:', err.message);
  }

  return { ok: deleted, id: idOrRecordNo };
}
