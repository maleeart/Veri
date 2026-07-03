import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://api.github.com';
const DATA_BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';

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

/** DELETE /api/delete-inspection
 *  Body: { password, filename, type, date, building?, floor? }
 *  filename = stem เช่น "fpg_2026-06-24" (ไม่มี .json)
 */
export async function DELETE(request) {
  try {
    const gate = await requireRole('admin');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { filename, type = 'fpg', date, building = '', floor = '', _sha, _path } = await request.json();

    if (!date || !type) {
      return NextResponse.json({ error: 'ต้องระบุ date และ type' }, { status: 400 });
    }

    const { owner, repo } = cfg();

    let sha = _sha;
    let apiPath;

    if (_sha && _path) {
      // ใช้ sha + path จาก Trees API โดยตรง — ไม่ต้อง GET อีกรอบ
      const encodedPath = _path.split('/').map(encodeURIComponent).join('/');
      apiPath = `/repos/${owner}/${repo}/contents/${encodedPath}`;
    } else {
      // fallback: สร้าง path และ GET sha
      const safeDate = String(date).replace(/[^0-9-]/g, '');
      const safeType = String(type).replace(/[^a-z]/g, '');
      const yearMonth = safeDate.slice(0, 7);
      let filePath;
      if (filename) {
        filePath = `data/inspections/${safeType}/${yearMonth}/${filename}.json`;
      } else {
        const sanitize = s => String(s || '').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '-').replace(/_/g, '-').slice(0, 30);
        const bld = sanitize(building);
        const flr = sanitize(floor);
        const extra = [bld, flr].filter(Boolean).join('_');
        filePath = `data/inspections/${safeType}/${yearMonth}/${safeType}_${safeDate}${extra ? '_' + extra : ''}.json`;
      }
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      apiPath = `/repos/${owner}/${repo}/contents/${encodedPath}`;
      const getRes = await ghReq(`${apiPath}?ref=${DATA_BRANCH}`);
      if (getRes.status === 404) {
        return NextResponse.json({ error: `ไม่พบไฟล์: ${filePath}` }, { status: 404 });
      }
      if (!getRes.ok) {
        return NextResponse.json({ error: `ดึงข้อมูล GitHub ไม่สำเร็จ HTTP ${getRes.status}` }, { status: 500 });
      }
      sha = (await getRes.json()).sha;
    }

    // ลบไฟล์
    const delRes = await ghReq(apiPath, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `ลบรายงาน [${type}] วันที่ ${date}`,
        sha,
        branch: DATA_BRANCH,
      }),
    });

    if (!delRes.ok) {
      const txt = await delRes.text();
      return NextResponse.json({ error: `ลบไม่สำเร็จ HTTP ${delRes.status}: ${txt}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
