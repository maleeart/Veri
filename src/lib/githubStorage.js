/**
 * githubStorage.js v4
 *
 * โครงสร้างไฟล์ใน GitHub branch "data":
 *   data/inspections/<type>/<YYYY-MM>/<type>_<YYYY-MM-DD>[_building_floor].json
 *   เช่น data/inspections/fpg/2026-06/fpg_2026-06-24.json
 *        data/inspections/emergency/2026-06/emergency_2026-06-24_อาคาร-A_1.json
 *
 * ใช้ GitHub Trees API (recursive) สำหรับ listInspectionDates
 * เพื่อรองรับไฟล์จำนวนมาก (ไม่ชน limit 1,000 ของ Contents API)
 *
 * branch "data" แยกจาก "main" (โค้ด) — สร้างอัตโนมัติถ้ายังไม่มี
 */

const BASE = 'https://api.github.com';
const DATA_BRANCH = 'data';

const TYPE_LABELS = {
  fpg:       'Fire Pump & Generator',
  emergency: 'Emergency Light',
  smoke:     'Smoke Detector',
};

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) throw new Error('ตั้งค่า GitHub ENV ไม่ครบ');
  return { token, owner, repo, branch: DATA_BRANCH };
}

/** URL-encode เฉพาะ path segment ท้ายสุด (ชื่อไฟล์) ที่อาจมีภาษาไทย */
function encPath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

async function ghReq(path, opts = {}) {
  const { token } = cfg();
  return fetch(`${BASE}${path}`, {
    ...opts,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
}

/** สร้าง branch data ถ้ายังไม่มี (branch off จาก main/master) */
async function ensureDataBranch() {
  const { owner, repo } = cfg();
  const check = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${DATA_BRANCH}`);
  if (check.status === 200) return;

  let sha;
  for (const ref of ['main', 'master']) {
    const r = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${ref}`);
    if (r.status === 200) { sha = (await r.json()).object.sha; break; }
  }
  if (!sha) throw new Error('ไม่พบ branch ต้นทางสำหรับสร้าง data branch');

  const res = await ghReq(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${DATA_BRANCH}`, sha }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`สร้าง branch ไม่สำเร็จ HTTP ${res.status}`);
}

function sanitizePart(s) {
  return String(s || '').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '-').replace(/_/g, '-').slice(0, 30);
}

/** โครงสร้างใหม่: data/inspections/{type}/{YYYY-MM}/{type}_{YYYY-MM-DD}[_bld_flr].json */
function datePath(date, type = 'fpg', building = '', floor = '') {
  const safeDate = String(date).replace(/[^0-9-]/g, '');
  const safeType = String(type).replace(/[^a-z]/g, '');
  if (!safeDate || !safeType) throw new Error('date หรือ type ไม่ถูกต้อง');
  const yearMonth = safeDate.slice(0, 7); // "2026-06"
  const bld = sanitizePart(building);
  const flr = sanitizePart(floor);
  const extra = [bld, flr].filter(Boolean).join('_');
  return `data/inspections/${safeType}/${yearMonth}/${safeType}_${safeDate}${extra ? '_' + extra : ''}.json`;
}

/** แปลง filename → metadata object */
function parseFilename(filename) {
  // filename = "fpg_2026-06-24" หรือ "emergency_2026-06-24_อาคาร-A_ชั้น-1"
  const parts    = filename.split('_');
  const type     = parts[0] || 'fpg';
  const date     = parts[1] || '';
  const building = (parts[2] || '').replace(/-/g, ' ');
  const floor    = (parts[3] || '').replace(/-/g, ' ');
  return { date, type, label: TYPE_LABELS[type] || type.toUpperCase(), building, floor, filename };
}

/** โหลดข้อมูลวันที่ระบุ */
async function loadSessionByDate(date, type = 'fpg', building = '', floor = '') {
  const { owner, repo, branch } = cfg();
  const path = datePath(date, type, building, floor);
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`โหลดไม่สำเร็จ HTTP ${res.status}`);
  const json = await res.json();
  return JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
}

/** บันทึก session ลงไฟล์
 *  originalFilename = stem ของไฟล์ที่กำลัง edit (ไม่มี .json)
 *  ถ้า path ใหม่ != path เดิม และ path ใหม่มีไฟล์อยู่แล้ว → ใช้ชื่อ <stem>_edited-from-<origDate>.json
 */
async function saveSessionByDate(date, dayData, type = 'fpg', building = '', floor = '', originalFilename = null) {
  const { owner, repo, branch } = cfg();
  await ensureDataBranch();

  let targetPath = datePath(date, type, building, floor);

  // ถ้ามี originalFilename ให้เช็คว่า path เปลี่ยนไปไหม
  if (originalFilename) {
    const origParts  = originalFilename.split('_');
    const origType   = origParts[0] || type;
    const origDate   = origParts[1] || '';
    const origYM     = origDate.slice(0, 7);
    const origPath   = `data/inspections/${origType}/${origYM}/${originalFilename}.json`;

    // path เปลี่ยน → เช็ค conflict กับไฟล์ที่ path ใหม่
    if (targetPath !== origPath) {
      const check = await ghReq(`/repos/${owner}/${repo}/contents/${encPath(targetPath)}?ref=${branch}`);
      if (check.status === 200) {
        // มีไฟล์อื่นอยู่แล้วที่ path ใหม่ → ต่อท้ายด้วยวันที่เดิมเท่านั้น
        const origDate = (originalFilename.split('_')[1] || '').slice(0, 10);
        const dir  = targetPath.substring(0, targetPath.lastIndexOf('/'));
        const stem = targetPath.substring(targetPath.lastIndexOf('/') + 1).replace(/\.json$/, '');
        targetPath = `${dir}/${stem}_edited-from-${origDate}.json`;
      }
    }
  }

  const apiPath = `/repos/${owner}/${repo}/contents/${encPath(targetPath)}`;
  let sha;
  const existing = await ghReq(`${apiPath}?ref=${branch}`);
  if (existing.status === 200) {
    sha = (await existing.json()).sha;
  } else if (existing.status !== 404) {
    throw new Error(`ตรวจสอบไฟล์เดิมไม่สำเร็จ HTTP ${existing.status}`);
  }

  const content = Buffer.from(JSON.stringify(dayData, null, 2), 'utf-8').toString('base64');
  const put = await ghReq(apiPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `บันทึกผลตรวจสอบ [${type}] วันที่ ${date}`,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!put.ok) {
    const txt = await put.text();
    throw new Error(`บันทึกลง GitHub ไม่สำเร็จ HTTP ${put.status}: ${txt}`);
  }
  return { path: targetPath };
}

/** บันทึกข้อมูลเครื่องเดียว (merge เข้ากับ records ที่มีอยู่) */
async function saveInspectionRecord(machineId, date, machineData, type = 'fpg', building = '', floor = '', originalFilename = null) {
  const existing = await loadSessionByDate(date, type, building, floor).catch(() => null);
  const dayData = existing || { date, type, records: {} };
  if (machineId === '__session__') {
    return saveSessionByDate(date, { ...machineData, type }, type, building, floor, originalFilename);
  }
  dayData.records[machineId] = machineData;
  return saveSessionByDate(date, dayData, type, building, floor, originalFilename);
}

/**
 * รายการไฟล์ทั้งหมดโดยใช้ GitHub Trees API (recursive=1)
 * รองรับได้ถึง ~100,000 ไฟล์ ไม่ชน limit ของ Contents API
 * คืน [{ date, type, label, building, floor, filename }] เรียงใหม่→เก่า
 */
async function listInspectionDates() {
  const { owner, repo, branch } = cfg();

  // ดึง SHA ของ branch head
  const refRes = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (refRes.status === 404) return []; // branch ยังไม่มี
  if (!refRes.ok) throw new Error(`ดึง ref ไม่สำเร็จ HTTP ${refRes.status}`);
  const { object: { sha: treeSha } } = await refRes.json();

  // ดึง tree แบบ recursive
  const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
  if (!treeRes.ok) throw new Error(`ดึง tree ไม่สำเร็จ HTTP ${treeRes.status}`);
  const { tree } = await treeRes.json();

  return tree
    .filter(item =>
      item.type === 'blob' &&
      item.path.startsWith('data/inspections/') &&
      item.path.endsWith('.json')
    )
    .map(item => {
      const filename = item.path.split('/').pop().replace(/\.json$/, '');
      return { ...parseFilename(filename), _sha: item.sha, _path: item.path };
    })
    .filter(i => /^\d{4}-\d{2}-\d{2}$/.test(i.date))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** ดึงข้อมูลวันที่ระบุ (alias) */
async function loadInspectionByDate(date, type = 'fpg', building = '', floor = '') {
  return loadSessionByDate(date, type, building, floor);
}

/** ดึงข้อมูลจาก _path ตรงๆ (จาก listInspectionDates) — แม่นที่สุด ไม่ต้อง reconstruct */
async function loadInspectionByPath(filePath) {
  const { owner, repo, branch } = cfg();
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${encPath(filePath)}?ref=${branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`โหลดไม่สำเร็จ HTTP ${res.status}`);
  const json = await res.json();
  return JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
}

/** ดึงข้อมูลจาก filename โดยตรง — รองรับทั้ง path เก่าและใหม่ */
async function loadInspectionByFilename(filename) {
  const { owner, repo, branch } = cfg();

  // ลอง path ใหม่ก่อน: data/inspections/{type}/{YYYY-MM}/{filename}.json
  const parts = filename.split('_');
  const type  = parts[0] || 'fpg';
  const date  = parts[1] || '';
  const yearMonth = date.slice(0, 7);

  const newPath = `data/inspections/${type}/${yearMonth}/${filename}.json`;
  const newRes  = await ghReq(`/repos/${owner}/${repo}/contents/${encPath(newPath)}?ref=${branch}`);
  if (newRes.ok) {
    const json = await newRes.json();
    return JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
  }

  // fallback path เก่า: data/inspections/{filename}.json
  const oldPath = `data/inspections/${filename}.json`;
  const oldRes  = await ghReq(`/repos/${owner}/${repo}/contents/${encPath(oldPath)}?ref=${branch}`);
  if (oldRes.status === 404) return null;
  if (!oldRes.ok) throw new Error(`โหลดไม่สำเร็จ HTTP ${oldRes.status}`);
  const json = await oldRes.json();
  return JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
}

/** โหลด JSON ไฟล์เดียวจาก path ตรงๆ — คืน null ถ้าไม่มี */
async function loadJsonFile(filePath) {
  return loadInspectionByPath(filePath);
}

/** เขียนทับ JSON ไฟล์เดียว (สร้าง data branch ถ้ายังไม่มี) */
async function saveJsonFile(filePath, data, message) {
  const { owner, repo, branch } = cfg();
  await ensureDataBranch();
  const apiPath = `/repos/${owner}/${repo}/contents/${encPath(filePath)}`;
  let sha;
  const existing = await ghReq(`${apiPath}?ref=${branch}`);
  if (existing.status === 200) sha = (await existing.json()).sha;
  else if (existing.status !== 404) throw new Error(`ตรวจสอบไฟล์เดิมไม่สำเร็จ HTTP ${existing.status}`);

  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
  const put = await ghReq(apiPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message || `บันทึก ${filePath}`, content, branch, ...(sha ? { sha } : {}) }),
  });
  if (!put.ok) throw new Error(`บันทึกลง GitHub ไม่สำเร็จ HTTP ${put.status}: ${await put.text()}`);
  return { path: filePath };
}

// ==========================================
// REPAIR PROPOSALS (ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทน)
// Path: data/repair-proposals/<YYYY-MM>/<refNo>.json
// ==========================================

const fs = require('fs');
const path = require('path');

async function saveRepairProposal(proposal) {
  const refNo = String(proposal.refNo || 'REP-TEMP').trim();
  const safeRef = refNo.replace(/[/\\:*?"<>|]/g, '-');
  const dateStr = proposal.docDateISO || (new Date().toISOString().slice(0, 10));
  const yearMonth = dateStr.slice(0, 7);
  const relPath = `data/repair-proposals/${yearMonth}/${safeRef}.json`;

  // 1. Always write to local data cache on disk
  try {
    const localDir = path.join(process.cwd(), 'data', 'repair-proposals', yearMonth);
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(localDir, `${safeRef}.json`), JSON.stringify(proposal, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local proposal cache write error:', err.message);
  }

  // 2. Commit to GitHub data branch if ENV configured
  try {
    await saveJsonFile(relPath, proposal, `บันทึกใบเสนอแจ้งซ่อม [${refNo}] ${proposal.jobTitle || ''}`);
  } catch (err) {
    console.warn('GitHub saveRepairProposal warning:', err.message);
  }

  return { ok: true, path: relPath, refNo };
}

async function listRepairProposals() {
  const map = new Map();

  // 1. Read from local directory cache if exists
  try {
    const baseDir = path.join(process.cwd(), 'data', 'repair-proposals');
    if (fs.existsSync(baseDir)) {
      const ymDirs = fs.readdirSync(baseDir);
      for (const ym of ymDirs) {
        const ymPath = path.join(baseDir, ym);
        if (fs.statSync(ymPath).isDirectory()) {
          const files = fs.readdirSync(ymPath);
          for (const f of files) {
            if (f.endsWith('.json')) {
              try {
                const raw = JSON.parse(fs.readFileSync(path.join(ymPath, f), 'utf-8'));
                if (raw && raw.refNo) map.set(raw.refNo, { ...raw, _source: 'local' });
              } catch {}
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Local proposal read warning:', e.message);
  }

  // 2. Read from GitHub data branch if configured
  try {
    const { owner, repo, branch } = cfg();
    const refRes = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    if (refRes.status === 200) {
      const { object: { sha: treeSha } } = await refRes.json();
      const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
      if (treeRes.ok) {
        const { tree } = await treeRes.json();
        const items = tree.filter(item =>
          item.type === 'blob' &&
          item.path.startsWith('data/repair-proposals/') &&
          item.path.endsWith('.json')
        );
        for (const item of items) {
          try {
            const data = await loadJsonFile(item.path);
            if (data && data.refNo) {
              map.set(data.refNo, { ...data, _path: item.path, _sha: item.sha, _source: 'github' });
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    // GitHub optional fallback
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => {
    const da = a.docDateISO || a.docDate || '';
    const db = b.docDateISO || b.docDate || '';
    return db.localeCompare(da);
  });
}

async function loadRepairProposalByRef(refNo) {
  const list = await listRepairProposals();
  return list.find(p => p.refNo === refNo) || null;
}

async function deleteRepairProposal(refNo) {
  const safeRef = String(refNo || '').replace(/[/\\:*?"<>|]/g, '-');
  // Remove local
  try {
    const baseDir = path.join(process.cwd(), 'data', 'repair-proposals');
    if (fs.existsSync(baseDir)) {
      for (const ym of fs.readdirSync(baseDir)) {
        const p = path.join(baseDir, ym, `${safeRef}.json`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
  } catch {}
  return { ok: true };
}

async function loadRepairSettings() {
  const defaultSettings = {
    header: {
      bannerImageUrl: '',
      bannerLayout: 'bleed', // 'bleed' (เต็มแผ่นกระดาษ A4) | 'contained' (เต็มขอบเนื้อหาเอกสาร)
      companyTitle: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)',
      companySubtitle: 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)',
      companyAddress: 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.',
      logoType: 'egat',
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
      yearType: 'buddhist',
      nextNumber: 1,
      digits: 3
    },
    defaults: {
      department: 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
      inspectorRole: 'วิศวกรระบบไฟฟ้าและบำรุงรักษา',
      priority: 'high'
    }
  };

  const localFile = path.join(process.cwd(), 'data', 'repair-proposals', 'settings.json');
  try {
    if (fs.existsSync(localFile)) {
      const data = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
      return {
        ...defaultSettings,
        ...data,
        header: { ...defaultSettings.header, ...(data.header || {}) },
        approver: { ...defaultSettings.approver, ...(data.approver || {}) },
        runningNumber: { ...defaultSettings.runningNumber, ...(data.runningNumber || {}) },
        defaults: { ...defaultSettings.defaults, ...(data.defaults || {}) }
      };
    }
  } catch (err) {
    console.warn('loadRepairSettings local error:', err.message);
  }

  try {
    const data = await loadJsonFile('data/repair-proposals/settings.json');
    if (data) {
      return {
        ...defaultSettings,
        ...data,
        header: { ...defaultSettings.header, ...(data.header || {}) },
        approver: { ...defaultSettings.approver, ...(data.approver || {}) },
        runningNumber: { ...defaultSettings.runningNumber, ...(data.runningNumber || {}) },
        defaults: { ...defaultSettings.defaults, ...(data.defaults || {}) }
      };
    }
  } catch {}

  return defaultSettings;
}

async function saveRepairSettings(settings) {
  const localDir = path.join(process.cwd(), 'data', 'repair-proposals');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const localFile = path.join(localDir, 'settings.json');
  fs.writeFileSync(localFile, JSON.stringify(settings, null, 2), 'utf-8');

  try {
    await saveJsonFile('data/repair-proposals/settings.json', settings, 'Update repair proposals admin settings');
  } catch (err) {
    console.warn('saveRepairSettings github warning:', err.message);
  }

  return { ok: true, settings };
}

module.exports = {
  saveInspectionRecord,
  saveSessionByDate,
  loadSessionByDate,
  loadInspectionByDate,
  loadInspectionByFilename,
  loadInspectionByPath,
  listInspectionDates,
  loadJsonFile,
  saveJsonFile,
  saveRepairProposal,
  listRepairProposals,
  loadRepairProposalByRef,
  deleteRepairProposal,
  loadRepairSettings,
  saveRepairSettings,
};

