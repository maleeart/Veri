import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://api.github.com';
const DATA_BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';
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

async function listRequests() {
  const { owner, repo } = cfg();
  // ใช้ Trees API เพื่อรองรับไฟล์จำนวนมาก
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
  return requests.filter(Boolean).sort((a, b) => b.requestedAt?.localeCompare(a.requestedAt || '') || 0);
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

// GET /api/delete-request — admin ดูรายการ pending
export async function GET() {
  try {
    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const requests = await listRequests();
    return NextResponse.json({ requests: requests.filter(r => r.status === 'pending') });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// PATCH /api/delete-request — admin อนุมัติหรือปฏิเสธ
export async function PATCH(request) {
  try {
    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id, action } = await request.json(); // action: 'approve' | 'reject'
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'ต้องระบุ id และ action (approve/reject)' }, { status: 400 });
    }

    const { owner, repo } = cfg();
    const filePath = `${REQ_DIR}/${id}.json`;

    // ดึงข้อมูล request
    const getRes = await ghReq(`/repos/${owner}/${repo}/contents/${filePath}?ref=${DATA_BRANCH}`);
    if (!getRes.ok) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 });
    const { content, sha } = await getRes.json();
    const req = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));

    if (action === 'approve') {
      // ลบไฟล์รายงานจริงก่อน
      const { filename, type, date } = req;
      const safeDate = String(date).replace(/[^0-9-]/g, '');
      const safeType = String(type).replace(/[^a-z]/g, '');
      const yearMonth = safeDate.slice(0, 7);
      const reportPath = `data/inspections/${safeType}/${yearMonth}/${filename}.json`;

      const rptRes = await ghReq(`/repos/${owner}/${repo}/contents/${reportPath}?ref=${DATA_BRANCH}`);
      if (rptRes.ok) {
        const { sha: rptSha } = await rptRes.json();
        const delRes = await ghReq(`/repos/${owner}/${repo}/contents/${reportPath}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `ลบรายงาน [${type}] ${date} (อนุมัติโดย admin)`, sha: rptSha, branch: DATA_BRANCH }),
        });
        if (!delRes.ok) {
          const txt = await delRes.text();
          return NextResponse.json({ error: `ลบรายงานไม่สำเร็จ: ${txt}` }, { status: 500 });
        }
      }
    }

    // อัปเดตสถานะ request
    const updated = { ...req, status: action === 'approve' ? 'approved' : 'rejected', resolvedAt: new Date().toISOString() };
    await ghPut(filePath, updated, `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอลบ ${id}`, sha);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
