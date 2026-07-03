import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://api.github.com';
const DATA_BRANCH = 'data';
const REQ_DIR = 'data/delete-requests';

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

async function deleteViaGitTrees(owner, repo, branch, filePath, message) {
  const { token } = cfg();
  const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const g = (url) => fetch(url, { cache: 'no-store', headers: hdrs });
  const p = (url, body) => fetch(url, { method: 'POST', cache: 'no-store', headers: hdrs, body: JSON.stringify(body) });
  const refRes = await g(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (!refRes.ok) return; // ถ้า branch ไม่มี → ถือว่า ok (ไฟล์ไม่มีอยู่)
  const { object: { sha: commitSha } } = await refRes.json();
  const { tree: { sha: treeSha } } = await (await g(`${BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`)).json();
  const newTreeRes = await p(`${BASE}/repos/${owner}/${repo}/git/trees`, { base_tree: treeSha, tree: [{ path: filePath, mode: '100644', type: 'blob', sha: null }] });
  if (newTreeRes.status === 422) return; // ไฟล์ไม่มีใน tree แล้ว — ถือว่าลบแล้ว
  if (!newTreeRes.ok) { const t = await newTreeRes.text(); throw new Error(`Create tree failed ${newTreeRes.status}: ${t}`); }
  const { sha: newTreeSha } = await newTreeRes.json();
  const newCommitRes = await p(`${BASE}/repos/${owner}/${repo}/git/commits`, { message, tree: newTreeSha, parents: [commitSha] });
  if (!newCommitRes.ok) throw new Error(`Create commit failed ${newCommitRes.status}`);
  const { sha: newCommitSha } = await newCommitRes.json();
  const updRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: 'PATCH', cache: 'no-store', headers: hdrs, body: JSON.stringify({ sha: newCommitSha }) });
  if (!updRes.ok) { const t = await updRes.text(); throw new Error(`Update ref failed ${updRes.status}: ${t}`); }
}

async function ghPut(filePath, content, message, existingSha = null) {
  const { owner, repo } = cfg();
  const body = { message, content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), branch: DATA_BRANCH };
  if (existingSha) body.sha = existingSha;
  const res = await ghReq(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed HTTP ${res.status}`);
}

async function listAllRequests() {
  const { owner, repo } = cfg();
  const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${DATA_BRANCH}?recursive=1`);
  if (!treeRes.ok) return [];
  const { tree } = await treeRes.json();
  const files = (tree || []).filter(f => f.path.startsWith(REQ_DIR + '/') && f.path.endsWith('.json'));
  const requests = await Promise.all(files.map(async f => {
    const res = await ghReq(`/repos/${owner}/${repo}/contents/${f.path}?ref=${DATA_BRANCH}`);
    if (!res.ok) return null;
    const { content, sha } = await res.json();
    try {
      const data = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
      return { ...data, _sha: sha, _path: f.path };
    } catch { return null; }
  }));
  return requests.filter(Boolean).sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
}

// POST /api/delete-request — user ส่งคำขอลบ
export async function POST(request) {
  try {
    const gate = await requireRole('user');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { filename, type, date, building = '', floor = '', reason } = await request.json();
    if (!filename || !type || !date || !reason?.trim()) {
      return NextResponse.json({ error: 'ต้องระบุ filename, type, date และ reason' }, { status: 400 });
    }

    const id = `dr_${Date.now()}`;
    const req = {
      id, filename, type, date, building, floor,
      reason: reason.trim(),
      requestedBy: gate.session.user.email,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    await ghPut(`${REQ_DIR}/${id}.json`, req, `คำขอลบรายงาน [${type}] ${date} โดย ${req.requestedBy}`);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// GET /api/delete-request
//   admin (ไม่มี query)  → pending ทั้งหมด
//   ?all=1               → admin: ทุกสถานะ
//   ?mine=1              → ทุกสถานะของตัวเอง (user+)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === '1';
    const allFlag = url.searchParams.get('all') === '1';

    if (mine) {
      const gate = await requireRole('user');
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
      const all = await listAllRequests();
      return NextResponse.json({ requests: all.filter(r => r.requestedBy === gate.session.user.email) });
    }

    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const all = await listAllRequests();
    return NextResponse.json({ requests: allFlag ? all : all.filter(r => r.status === 'pending') });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// PATCH /api/delete-request — admin อนุมัติหรือปฏิเสธ
export async function PATCH(request) {
  try {
    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id, action, rejectReason = '' } = await request.json();
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'ต้องระบุ id และ action (approve/reject)' }, { status: 400 });
    }

    const { owner, repo } = cfg();
    const filePath = `${REQ_DIR}/${id}.json`;

    const getRes = await ghReq(`/repos/${owner}/${repo}/contents/${filePath}?ref=${DATA_BRANCH}`);
    if (!getRes.ok) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 });
    const { content, sha } = await getRes.json();
    const req = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));

    if (action === 'approve') {
      const { filename, type, date } = req;
      const safeDate = String(date).replace(/[^0-9-]/g, '');
      const safeType = String(type).replace(/[^a-z]/g, '');
      const yearMonth = safeDate.slice(0, 7);
      const reportPath = `data/inspections/${safeType}/${yearMonth}/${filename}.json`;
      // ใช้ Git Trees API — path ไปใน body ไม่ใช่ URL ไม่มีปัญหา Thai chars
      await deleteViaGitTrees(owner, repo, DATA_BRANCH, reportPath, `ลบรายงาน [${type}] ${date} (อนุมัติโดย admin)`);
    }

    const updated = {
      ...req,
      status: action === 'approve' ? 'approved' : 'rejected',
      resolvedAt: new Date().toISOString(),
      ...(action === 'reject' && rejectReason.trim() ? { rejectReason: rejectReason.trim() } : {}),
    };
    await ghPut(filePath, updated, `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอลบ ${id}`, sha);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
