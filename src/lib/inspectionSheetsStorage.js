import fs from 'fs';
import path from 'path';
import os from 'os';

// In-memory fallbacks for serverless environments
let memoryTemplates = null;
let memorySettings = null;
const memoryRecordsMap = new Map();
const memoryDeletedRecordKeys = new Set();

// Default initial settings
export const defaultInspectionSettings = {
  header: {
    companyTitle: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)',
    companySubtitle: 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)',
    companyAddress: 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.',
    logoType: 'egat',
    customLogoUrl: '',
    showLetterhead: true,
    bannerTheme: 'white',
    bannerLayout: 'bleed', // 'bleed' | 'contained'
    bannerImageUrl: '',
    logoSize: 'large' // 'normal' | 'large' | 'xlarge'
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
    code: 'INS-MDB-',
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
    code: 'INS-PMP-',
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
    code: 'INS-SAF-',
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

/**
 * Determine a safe, writable base directory.
 * If running in a read-only serverless environment (like Vercel /var/task),
 * fall back gracefully to /tmp/veri-data/inspection-sheets.
 */
function getStorageDir() {
  const localDir = path.join(process.cwd(), 'data', 'inspection-sheets');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    // Read-only filesystem detected (e.g. Vercel Lambda /var/task)
    const tmpDir = path.join(os.tmpdir(), 'veri-data', 'inspection-sheets');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
}

function getRecordsDir() {
  const base = getStorageDir();
  const dir = path.join(base, 'records');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
  return dir;
}

// GitHub Storage Integration (Optional)
async function getGitHubHelpers() {
  try {
    const gh = await import('./githubStorage.js');
    return {
      loadJsonFile: gh.loadJsonFile,
      saveJsonFile: gh.saveJsonFile,
      ghReq: gh.ghReq,
      cfg: gh.cfg,
      saveFileViaGitTrees: gh.saveFileViaGitTrees,
      deleteFilesViaGitTrees: gh.deleteFilesViaGitTrees
    };
  } catch {
    return { loadJsonFile: null, saveJsonFile: null, ghReq: null, cfg: null, saveFileViaGitTrees: null, deleteFilesViaGitTrees: null };
  }
}

// ==========================================
// SETTINGS
// ==========================================

export async function loadInspectionSettings() {
  // 1. Try memory
  if (memorySettings) return memorySettings;

  // 2. Try disk / tmp
  const baseDir = getStorageDir();
  const settingsFile = path.join(baseDir, 'settings.json');
  try {
    if (fs.existsSync(settingsFile)) {
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      const merged = {
        ...defaultInspectionSettings,
        ...data,
        header: { ...defaultInspectionSettings.header, ...(data.header || {}) },
        surveyor: { ...defaultInspectionSettings.surveyor, ...(data.surveyor || {}) },
        runningNumber: { ...defaultInspectionSettings.runningNumber, ...(data.runningNumber || {}) }
      };
      memorySettings = merged;
      return merged;
    }
  } catch (err) {
    console.warn('loadInspectionSettings disk warning:', err.message);
  }

  // 3. Try GitHub
  try {
    const { loadJsonFile } = await getGitHubHelpers();
    if (loadJsonFile) {
      const ghData = await loadJsonFile('data/inspection-sheets/settings.json');
      if (ghData) {
        const merged = {
          ...defaultInspectionSettings,
          ...ghData,
          header: { ...defaultInspectionSettings.header, ...(ghData.header || {}) },
          surveyor: { ...defaultInspectionSettings.surveyor, ...(ghData.surveyor || {}) },
          runningNumber: { ...defaultInspectionSettings.runningNumber, ...(ghData.runningNumber || {}) }
        };
        memorySettings = merged;
        try {
          fs.writeFileSync(settingsFile, JSON.stringify(merged, null, 2), 'utf-8');
        } catch {}
        return merged;
      }
    }
  } catch {}

  memorySettings = { ...defaultInspectionSettings };
  return memorySettings;
}

export async function saveInspectionSettings(settings) {
  const current = await loadInspectionSettings();
  const updated = {
    ...current,
    ...settings,
    header: { ...current.header, ...(settings.header || {}) },
    surveyor: { ...current.surveyor, ...(settings.surveyor || {}) },
    runningNumber: { ...current.runningNumber, ...(settings.runningNumber || {}) },
    updatedAt: new Date().toISOString()
  };

  memorySettings = updated;

  // Save to disk / tmp
  try {
    const baseDir = getStorageDir();
    const settingsFile = path.join(baseDir, 'settings.json');
    fs.writeFileSync(settingsFile, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('saveInspectionSettings disk warning:', err.message);
  }

  // Save to GitHub
  try {
    const { saveJsonFile } = await getGitHubHelpers();
    if (saveJsonFile) {
      await saveJsonFile('data/inspection-sheets/settings.json', updated, 'Update inspection sheets settings');
    }
  } catch (err) {
    console.warn('saveInspectionSettings GitHub warning:', err.message);
  }

  return updated;
}

// ==========================================
// TEMPLATES
// ==========================================

export async function loadInspectionTemplates() {
  // 1. Try memory
  if (Array.isArray(memoryTemplates)) {
    return memoryTemplates;
  }

  // 2. Try disk / tmp
  const baseDir = getStorageDir();
  const templatesFile = path.join(baseDir, 'templates.json');
  try {
    if (fs.existsSync(templatesFile)) {
      const data = JSON.parse(fs.readFileSync(templatesFile, 'utf-8'));
      if (Array.isArray(data)) {
        memoryTemplates = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('loadInspectionTemplates disk warning:', err.message);
  }

  // 3. Try GitHub
  try {
    const { loadJsonFile } = await getGitHubHelpers();
    if (loadJsonFile) {
      const ghData = await loadJsonFile('data/inspection-sheets/templates.json');
      if (Array.isArray(ghData)) {
        memoryTemplates = ghData;
        try {
          fs.writeFileSync(templatesFile, JSON.stringify(ghData, null, 2), 'utf-8');
        } catch {}
        return ghData;
      }
    }
  } catch {}

  // 4. Fallback to default presets and persist only if file never existed
  memoryTemplates = [...defaultTemplates];
  try {
    fs.writeFileSync(templatesFile, JSON.stringify(defaultTemplates, null, 2), 'utf-8');
  } catch {}

  try {
    const { saveJsonFile } = await getGitHubHelpers();
    if (saveJsonFile) {
      saveJsonFile('data/inspection-sheets/templates.json', defaultTemplates, 'Seed default inspection templates').catch(() => {});
    }
  } catch {}

  return defaultTemplates;
}

export async function saveInspectionTemplate(template) {
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

  memoryTemplates = templates;

  // Save to disk / tmp
  try {
    const baseDir = getStorageDir();
    const templatesFile = path.join(baseDir, 'templates.json');
    fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2), 'utf-8');
  } catch (err) {
    console.warn('saveInspectionTemplate disk warning:', err.message);
  }

  // Save to GitHub
  try {
    const { saveJsonFile } = await getGitHubHelpers();
    if (saveJsonFile) {
      await saveJsonFile('data/inspection-sheets/templates.json', templates, `บันทึกแบบฟอร์มตรวจเช็ค [${updatedTemplate.name}]`);
    }
  } catch (err) {
    console.warn('saveInspectionTemplate GitHub warning:', err.message);
  }

  return updatedTemplate;
}

export async function deleteInspectionTemplate(templateId) {
  const templates = await loadInspectionTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  memoryTemplates = filtered;

  try {
    const baseDir = getStorageDir();
    const templatesFile = path.join(baseDir, 'templates.json');
    fs.writeFileSync(templatesFile, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (err) {
    console.warn('deleteInspectionTemplate disk warning:', err.message);
  }

  try {
    const { saveJsonFile } = await getGitHubHelpers();
    if (saveJsonFile) {
      await saveJsonFile('data/inspection-sheets/templates.json', filtered, `ลบแบบฟอร์มตรวจเช็ค [${templateId}]`);
    }
  } catch (err) {
    console.warn('deleteInspectionTemplate GitHub warning:', err.message);
  }

  return { ok: true, id: templateId };
}

// ==========================================
// RECORDS
// ==========================================

export async function generateInspectionRecordNo(settings, customPrefix = null) {
  const currentSettings = settings || (await loadInspectionSettings());
  const run = currentSettings.runningNumber || defaultInspectionSettings.runningNumber;
  let rawPrefix = (customPrefix && customPrefix.trim()) ? customPrefix.trim() : (run.prefix || 'INS-');

  // Strip trailing numbers/dashes to get the clean prefix
  let prefix = rawPrefix;
  if (/-\d+$/.test(prefix)) {
    prefix = prefix.replace(/-\d+$/, '-');
  }
  if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
    prefix = `${prefix}-`;
  }

  const now = new Date();
  const year = run.yearType === 'buddhist' ? (now.getFullYear() + 543) : now.getFullYear();
  const digits = run.digits || 3;

  let fullPrefix = prefix;
  if (!fullPrefix.includes(String(year))) {
    fullPrefix = `${prefix}${year}-`;
  }

  const records = await listInspectionRecords();
  let maxNum = run.nextNumber || 1;

  records.forEach(r => {
    if (r.recordNo) {
      if (r.recordNo.startsWith(fullPrefix)) {
        const part = r.recordNo.slice(fullPrefix.length);
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= maxNum) {
          maxNum = num + 1;
        }
      } else if (r.recordNo.startsWith(prefix)) {
        const part = r.recordNo.slice(prefix.length);
        const match = part.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= maxNum) {
            maxNum = num + 1;
          }
        }
      }
    }
  });

  return `${fullPrefix}${String(maxNum).padStart(digits, '0')}`;
}

export async function listInspectionRecords() {
  const recordsMap = new Map();

  // 1. Load from memory map
  memoryRecordsMap.forEach((rec) => {
    if (rec && (rec.recordNo || rec.id)) {
      recordsMap.set(rec.recordNo || rec.id, rec);
    }
  });

  // 2. Scan disk / tmp
  try {
    const recordsDir = getRecordsDir();
    if (fs.existsSync(recordsDir)) {
      const yms = fs.readdirSync(recordsDir);
      for (const ym of yms) {
        const ymPath = path.join(recordsDir, ym);
        if (fs.existsSync(ymPath) && fs.statSync(ymPath).isDirectory()) {
          const files = fs.readdirSync(ymPath);
          for (const f of files) {
            if (f.endsWith('.json')) {
              try {
                const content = JSON.parse(fs.readFileSync(path.join(ymPath, f), 'utf-8'));
                if (content && (content.recordNo || content.id)) {
                  const key = content.recordNo || content.id;
                  recordsMap.set(key, content);
                  memoryRecordsMap.set(key, content);
                }
              } catch {}
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('listInspectionRecords disk warning:', err.message);
  }

  // 3. Scan GitHub data branch if configured
  try {
    const { ghReq, cfg, loadJsonFile } = await getGitHubHelpers();
    if (ghReq && cfg && loadJsonFile) {
      const { owner, repo, branch } = cfg();
      const refRes = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      if (refRes.status === 200) {
        const { object: { sha: treeSha } } = await refRes.json();
        const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
        if (treeRes.ok) {
          const { tree } = await treeRes.json();
          const items = tree.filter(item =>
            item.type === 'blob' &&
            item.path.startsWith('data/inspection-sheets/records/') &&
            item.path.endsWith('.json')
          );
          for (const item of items) {
            try {
              const data = await loadJsonFile(item.path);
              if (data && (data.recordNo || data.id)) {
                const key = data.recordNo || data.id;
                if (!recordsMap.has(key)) {
                  recordsMap.set(key, data);
                  memoryRecordsMap.set(key, data);
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch (ghErr) {
    console.warn('listInspectionRecords GitHub scan warning:', ghErr.message);
  }

  const list = Array.from(recordsMap.values()).filter(r => 
    !memoryDeletedRecordKeys.has(r.id) && 
    !memoryDeletedRecordKeys.has(r.recordNo) &&
    !memoryDeletedRecordKeys.has(String(r.recordNo || '').replace(/[/\\:*?"<>|]/g, '-'))
  );
  return list.sort((a, b) => {
    const da = a.createdAt || a.inspectionDate || '';
    const db = b.createdAt || b.inspectionDate || '';
    return db.localeCompare(da);
  });
}

export async function loadInspectionRecord(idOrRecordNo) {
  const records = await listInspectionRecords();
  return records.find(r => r.id === idOrRecordNo || r.recordNo === idOrRecordNo) || null;
}

export async function saveInspectionRecord(record) {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);

  const settings = await loadInspectionSettings();
  let recordNo = record.recordNo;

  if (!recordNo) {
    recordNo = await generateInspectionRecordNo(settings);
  }

  const id = record.id || `rec-${Date.now()}`;
  const safeRecordNo = String(recordNo).replace(/[/\\:*?"<>|]/g, '-');

  const fullRecord = {
    ...record,
    id,
    recordNo,
    updatedAt: now.toISOString(),
    createdAt: record.createdAt || now.toISOString()
  };

  // Update memory
  memoryDeletedRecordKeys.delete(recordNo);
  memoryDeletedRecordKeys.delete(id);
  memoryDeletedRecordKeys.delete(safeRecordNo);
  memoryRecordsMap.set(recordNo, fullRecord);
  memoryRecordsMap.set(id, fullRecord);

  // Write to disk / tmp
  try {
    const recordsDir = getRecordsDir();
    const ymDir = path.join(recordsDir, ym);
    if (!fs.existsSync(ymDir)) fs.mkdirSync(ymDir, { recursive: true });
    const filePath = path.join(ymDir, `${safeRecordNo}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fullRecord, null, 2), 'utf-8');
  } catch (err) {
    console.warn('saveInspectionRecord disk warning:', err.message);
  }

  // Write to GitHub
  try {
    const { cfg, saveJsonFile, saveFileViaGitTrees } = await getGitHubHelpers();
    if (saveJsonFile) {
      const relPath = `data/inspection-sheets/records/${ym}/${safeRecordNo}.json`;
      const commitMsg = `บันทึกผลการตรวจเช็ค [${recordNo}] ${fullRecord.location || ''}`;
      const jsonStr = JSON.stringify(fullRecord, null, 2);
      const byteLen = Buffer.byteLength(jsonStr, 'utf-8');

      if (byteLen < 950000) {
        try {
          await saveJsonFile(relPath, fullRecord, commitMsg);
        } catch (eContents) {
          if (saveFileViaGitTrees && cfg) {
            const { owner, repo, branch } = cfg();
            await saveFileViaGitTrees(owner, repo, branch, relPath, fullRecord, commitMsg);
          }
        }
      } else if (saveFileViaGitTrees && cfg) {
        const { owner, repo, branch } = cfg();
        await saveFileViaGitTrees(owner, repo, branch, relPath, fullRecord, commitMsg);
      }
    }
  } catch (err) {
    console.warn('saveInspectionRecord GitHub warning:', err.message);
  }

  // Increment running nextNumber
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

export async function deleteInspectionRecord(idOrRecordNo) {
  const safe = String(idOrRecordNo).replace(/[/\\:*?"<>|]/g, '-');
  memoryDeletedRecordKeys.add(idOrRecordNo);
  memoryDeletedRecordKeys.add(safe);
  memoryRecordsMap.delete(idOrRecordNo);
  memoryRecordsMap.delete(safe);

  let deleted = false;
  // 1. Delete from disk
  try {
    const recordsDir = getRecordsDir();
    if (fs.existsSync(recordsDir)) {
      const yms = fs.readdirSync(recordsDir);
      for (const ym of yms) {
        const ymPath = path.join(recordsDir, ym);
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
    }
  } catch (err) {
    console.warn('deleteInspectionRecord disk warning:', err.message);
  }

  // 2. Delete from GitHub if available
  try {
    const { ghReq, cfg, deleteFilesViaGitTrees } = await getGitHubHelpers();
    if (ghReq && cfg && deleteFilesViaGitTrees) {
      const { owner, repo, branch } = cfg();
      const refRes = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      if (refRes.status === 200) {
        const { object: { sha: treeSha } } = await refRes.json();
        const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
        if (treeRes.ok) {
          const { tree } = await treeRes.json();
          const pathsToDelete = tree
            .filter(item =>
              item.type === 'blob' &&
              item.path.startsWith('data/inspection-sheets/records/') &&
              (item.path.endsWith(`/${safe}.json`) || item.path.includes(`/${safe}.`))
            )
            .map(item => item.path);
          if (pathsToDelete.length > 0) {
            await deleteFilesViaGitTrees(owner, repo, branch, pathsToDelete, `ลบผลการตรวจเช็ค [${idOrRecordNo}]`);
            deleted = true;
          }
        }
      }
    }
  } catch (err) {
    console.warn('deleteInspectionRecord GitHub warning:', err.message);
  }

  return { ok: true, deleted: true, id: idOrRecordNo };
}
