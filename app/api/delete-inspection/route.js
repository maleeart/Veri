import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE   = 'https://api.github.com';
const BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) throw new Error('ตั้งค่า GitHub ENV ไม่ครบ');
  return { token, owner, repo };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/**
 * ลบไฟล์ผ่าน Git Trees API — path ไปใน JSON body ไม่ใช่ URL
 * แก้ปัญหา Contents API ไม่รองรับ Thai chars ใน URL path
 */
async function deleteViaGitTrees(owner, repo, branch, filePath, message) {
  const { token } = cfg();
  const hdrs = headers(token);
  const g = (url) => fetch(url, { cache: 'no-store', headers: hdrs });
  const p = (url, body) => fetch(url, { method: 'POST', cache: 'no-store', headers: hdrs, body: JSON.stringify(body) });

  // 1. HEAD commit SHA
  const refRes = await g(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (!refRes.ok) throw new Error(`Get ref failed ${refRes.status}`);
  const { object: { sha: commitSha } } = await refRes.json();

  // 2. tree SHA จาก commit
  const commitRes = await g(`${BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`);
  if (!commitRes.ok) throw new Error(`Get commit failed ${commitRes.status}`);
  const { tree: { sha: treeSha } } = await commitRes.json();

  // 3. สร้าง tree ใหม่โดย set sha: null เพื่อลบไฟล์ (path อยู่ใน body ไม่ใช่ URL)
  const newTreeRes = await p(`${BASE}/repos/${owner}/${repo}/git/trees`, {
    base_tree: treeSha,
    tree: [{ path: filePath, mode: '100644', type: 'blob', sha: null }],
  });
  if (!newTreeRes.ok) {
    const txt = await newTreeRes.text();
    throw new Error(`Create tree failed ${newTreeRes.status}: ${txt}`);
  }
  const { sha: newTreeSha } = await newTreeRes.json();

  // 4. commit ใหม่
  const newCommitRes = await p(`${BASE}/repos/${owner}/${repo}/git/commits`, {
    message,
    tree: newTreeSha,
    parents: [commitSha],
  });
  if (!newCommitRes.ok) throw new Error(`Create commit failed ${newCommitRes.status}`);
  const { sha: newCommitSha } = await newCommitRes.json();

  // 5. อัพเดท branch ref
  const updateRes = await fetch(`${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH', cache: 'no-store', headers: hdrs,
    body: JSON.stringify({ sha: newCommitSha, force: false }),
  });
  if (!updateRes.ok) {
    const txt = await updateRes.text();
    throw new Error(`Update ref failed ${updateRes.status}: ${txt}`);
  }
}

/** DELETE /api/delete-inspection
 *  Body: { filename, type, date, _path? }
 *  _path = full path จาก Trees API (รองรับ Thai chars ใน filename)
 */
export async function DELETE(request) {
  try {
    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { filename, type = 'fpg', date, building = '', floor = '', _path } = await request.json();

    if (!date || !type) {
      return NextResponse.json({ error: 'ต้องระบุ date และ type' }, { status: 400 });
    }

    const { owner, repo } = cfg();

    // ใช้ _path จาก Trees API ถ้ามี ไม่งั้น construct ใหม่
    let filePath = _path;
    if (!filePath) {
      const safeDate = String(date).replace(/[^0-9-]/g, '');
      const safeType = String(type).replace(/[^a-z]/g, '');
      const yearMonth = safeDate.slice(0, 7);
      if (filename) {
        filePath = `data/inspections/${safeType}/${yearMonth}/${filename}.json`;
      } else {
        const san = s => String(s || '').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '-').replace(/_/g, '-').slice(0, 30);
        const extra = [san(building), san(floor)].filter(Boolean).join('_');
        filePath = `data/inspections/${safeType}/${yearMonth}/${safeType}_${safeDate}${extra ? '_' + extra : ''}.json`;
      }
    }

    await deleteViaGitTrees(owner, repo, BRANCH, filePath, `ลบรายงาน [${type}] วันที่ ${date}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
