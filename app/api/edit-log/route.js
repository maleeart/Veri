import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://api.github.com';
const DATA_BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';
const LOG_DIR = 'data/edit-logs';

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
    ...opts, cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
  });
}

async function listLogs() {
  const { owner, repo } = cfg();
  const treeRes = await ghReq(`/repos/${owner}/${repo}/git/trees/${DATA_BRANCH}?recursive=1`);
  if (!treeRes.ok) return [];
  const { tree } = await treeRes.json();
  const files = (tree || []).filter(f => f.path.startsWith(LOG_DIR + '/') && f.path.endsWith('.json'));
  const logs = await Promise.all(files.map(async f => {
    const res = await ghReq(`/repos/${owner}/${repo}/contents/${f.path}?ref=${DATA_BRANCH}`);
    if (!res.ok) return null;
    const { content } = await res.json();
    try { return JSON.parse(Buffer.from(content, 'base64').toString('utf8')); } catch { return null; }
  }));
  return logs.filter(Boolean).sort((a, b) => (b.editedAt || '').localeCompare(a.editedAt || ''));
}

// GET /api/edit-log          → admin: ทั้งหมด
// GET /api/edit-log?mine=1   → user: เฉพาะของตัวเอง
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === '1';
    const gate = await requireRole(mine ? 'user' : 'admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const all = await listLogs();
    const logs = mine ? all.filter(l => l.editedBy === gate.session.user.email) : all;
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
