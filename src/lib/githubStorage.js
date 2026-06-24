/**
 * githubStorage.js v2
 *
 * โครงสร้างไฟล์ใน GitHub:
 *   data/inspections/<YYYY-MM-DD>.json
 *
 * รูปแบบ JSON:
 * {
 *   "date": "2026-06-23",
 *   "records": {
 *     "fire-pump-1": { machineId, inspectionDate, generalData, ... },
 *     "fire-pump-2": { ... },
 *     "generator-1": { ... }
 *   }
 * }
 *
 * ใช้ 1 ไฟล์ต่อวัน รวมทุกเครื่อง — ดึงจาก GitHub ได้จากเครื่องไหนก็ได้
 */

const BASE = 'https://api.github.com';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_REPO_BRANCH || 'data';
  if (!token || !owner || !repo) throw new Error('ตั้งค่า GitHub ENV ไม่ครบ');
  return { token, owner, repo, branch };
}

/** สร้าง branch สำหรับเก็บข้อมูลถ้ายังไม่มี (branch off จาก main หรือ branch แรกที่เจอ) */
async function ensureDataBranch(branch) {
  const { owner, repo } = cfg();
  const check = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (check.status === 200) return;

  // หา SHA ของ main ก่อน ถ้าไม่มีให้ลอง branch อื่นที่มีอยู่
  let sha;
  for (const ref of ['main', 'master']) {
    const r = await ghReq(`/repos/${owner}/${repo}/git/ref/heads/${ref}`);
    if (r.status === 200) { sha = (await r.json()).object.sha; break; }
  }
  if (!sha) throw new Error('ไม่พบ branch ต้นทางสำหรับสร้าง data branch');

  const res = await ghReq(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  if (!res.ok && res.status !== 422) {
    throw new Error(`สร้าง branch ไม่สำเร็จ HTTP ${res.status}`);
  }
}

function datePath(date) {
  const safe = String(date).replace(/[^0-9-]/g, '');
  if (!safe) throw new Error('date ไม่ถูกต้อง');
  return `data/inspections/${safe}.json`;
}

async function ghReq(path, opts = {}) {
  const { token } = cfg();
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
}

/** โหลดข้อมูลวันที่ระบุ → { date, records: { machineId: data } } หรือ null */
async function loadSessionByDate(date) {
  const { owner, repo, branch } = cfg();
  const path = datePath(date);
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`โหลดไม่สำเร็จ HTTP ${res.status}`);
  const json = await res.json();
  return JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
}

/**
 * บันทึก session (ทุกเครื่อง) ลงไฟล์เดียว
 * dayData = { date, records: { machineId: formData } }
 */
async function saveSessionByDate(date, dayData) {
  const { owner, repo, branch } = cfg();
  await ensureDataBranch(branch);
  const path = datePath(date);
  const apiPath = `/repos/${owner}/${repo}/contents/${path}`;

  // หา sha ของไฟล์เดิม (ถ้ามี)
  let sha;
  const existing = await ghReq(`${apiPath}?ref=${branch}`);
  if (existing.status === 200) {
    sha = (await existing.json()).sha;
  } else if (existing.status !== 404) {
    throw new Error(`ตรวจสอบไฟล์เดิมไม่สำเร็จ HTTP ${existing.status}`);
  }

  const content = Buffer.from(JSON.stringify(dayData, null, 2), 'utf-8').toString('base64');
  const msg = `บันทึกผลตรวจสอบวันที่ ${date}`;

  const put = await ghReq(apiPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, content, branch, ...(sha ? { sha } : {}) }),
  });

  if (!put.ok) {
    const txt = await put.text();
    throw new Error(`บันทึกลง GitHub ไม่สำเร็จ HTTP ${put.status}: ${txt}`);
  }
  return { path };
}

/**
 * บันทึกข้อมูลเครื่องเดียว (merge เข้ากับ records ที่มีอยู่แล้วในวันนั้น)
 */
async function saveInspectionRecord(machineId, date, machineData) {
  const existing = await loadSessionByDate(date).catch(() => null);
  const dayData = existing || { date, records: {} };
  if (machineId === '__session__') {
    // บันทึกทั้ง session พร้อมกัน
    return saveSessionByDate(date, machineData);
  }
  dayData.records[machineId] = machineData;
  return saveSessionByDate(date, dayData);
}

/** รายชื่อวันที่ทั้งหมดที่มีข้อมูล (เรียงใหม่→เก่า) */
async function listInspectionDates() {
  const { owner, repo, branch } = cfg();
  const res = await ghReq(`/repos/${owner}/${repo}/contents/data/inspections?ref=${branch}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`ดึงรายการไม่สำเร็จ HTTP ${res.status}`);
  const items = await res.json();
  return items
    .filter(i => i.type === 'file' && i.name.endsWith('.json'))
    .map(i => i.name.replace(/\.json$/, ''))
    .sort().reverse();
}

/** ดึงข้อมูลวันที่ระบุ (alias) */
async function loadInspectionByDate(date) {
  return loadSessionByDate(date);
}

module.exports = {
  saveInspectionRecord,
  saveSessionByDate,
  loadSessionByDate,
  loadInspectionByDate,
  listInspectionDates,
};
