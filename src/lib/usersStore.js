/**
 * usersStore.js — เก็บ role ของผู้ใช้ในไฟล์ data/users.json บน data branch
 * รูปแบบ: { "someone@gmail.com": "user" | "visitor" }
 * (admin กำหนดผ่าน env ADMIN_EMAILS ไม่เก็บในไฟล์นี้)
 */

const BASE = 'https://api.github.com';
const DATA_BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';
const USERS_PATH = 'data/users.json';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) throw new Error('ตั้งค่า GitHub ENV ไม่ครบ');
  return { token, owner, repo };
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

/** คืน { map, sha } — map = {email: role}, sha = ไว้ใช้ตอนเขียนทับ (null ถ้ายังไม่มีไฟล์) */
async function loadUsers() {
  const { owner, repo } = cfg();
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${USERS_PATH}?ref=${DATA_BRANCH}`);
  if (res.status === 404) return { map: {}, sha: null };
  if (!res.ok) throw new Error(`โหลด users.json ไม่สำเร็จ HTTP ${res.status}`);
  const json = await res.json();
  const map = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
  return { map: map && typeof map === 'object' ? map : {}, sha: json.sha };
}

async function saveUsers(map, sha, message) {
  const { owner, repo } = cfg();
  const content = Buffer.from(JSON.stringify(map, null, 2), 'utf-8').toString('base64');
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${USERS_PATH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content,
      branch: DATA_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`บันทึก users.json ไม่สำเร็จ HTTP ${res.status}`);
}

async function getRoleForEmail(email) {
  const key = String(email || '').toLowerCase();
  if (!key) return 'visitor';
  try {
    const { map, sha } = await loadUsers();
    if (!(key in map)) {
      // ลงทะเบียนผู้ใช้ใหม่เป็น visitor เพื่อให้ admin เห็นในหน้าจัดการสิทธิ์
      map[key] = 'visitor';
      saveUsers(map, sha, `ลงทะเบียน ${key}`).catch(() => {});
    }
    return map[key] === 'user' ? 'user' : 'visitor';
  } catch {
    return 'visitor';
  }
}

async function listUsers() {
  const { map } = await loadUsers();
  return map;
}

/** ตั้ง role ให้ email (role = 'user' | 'visitor'); เก็บทั้งคู่ไว้ให้ admin เห็น */
async function setRole(email, role) {
  const key = String(email || '').toLowerCase().trim();
  if (!key) throw new Error('email ไม่ถูกต้อง');
  const { map, sha } = await loadUsers();
  map[key] = role === 'user' ? 'user' : 'visitor';
  await saveUsers(map, sha, `ตั้งสิทธิ์ ${key} = ${role}`);
  return map;
}

module.exports = { getRoleForEmail, listUsers, setRole };
