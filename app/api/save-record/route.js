import { NextResponse } from 'next/server';
import { saveInspectionRecord } from '../../../src/lib/githubStorage';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';

const BASE = 'https://api.github.com';
const DATA_BRANCH = process.env.GITHUB_REPO_BRANCH || 'data';

async function ghPutLog(id, content) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) return; // ถ้า env ไม่ครบ ข้ามไป ไม่ block การบันทึกหลัก
  const body = {
    message: `บันทึก edit log ${id}`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    branch: DATA_BRANCH,
  };
  await fetch(`${BASE}/repos/${owner}/${repo}/contents/data/edit-logs/${id}.json`, {
    method: 'PUT', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(request) {
  try {
    const gate = await requireRole('user');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await request.json();

    // Option A: session (records object)
    if (body.records) {
      const { date, records, type = 'fpg', building = '', floor = '', originalFilename = null } = body;
      if (!date || !records) return NextResponse.json({ error: 'ต้องระบุ date และ records' }, { status: 400 });

      const result = await saveInspectionRecord('__session__', date, { date, type, records }, type, building, floor, originalFilename);

      // บันทึก edit log ถ้ามี editReason (top-level หรือใน records)
      const editReason = body.editReason || records?.editReason || null;
      if (editReason && originalFilename) {
        const newStem = result.path.split('/').pop().replace(/\.json$/, '');
        const id = `el_${Date.now()}`;
        ghPutLog(id, {
          id, type, date, building, floor,
          originalFilename,
          newFilename: newStem,
          editReason,
          editedBy: gate.session.user.email,
          editedAt: new Date().toISOString(),
        }).catch(() => {}); // fire-and-forget ไม่ block response
      }

      return NextResponse.json({ ok: true, path: result.path });
    }

    // Option B: single machine
    if (body.machineId) {
      const { machineId, inspectionDate, type = 'fpg' } = body;
      const result = await saveInspectionRecord(machineId, inspectionDate, body, type);
      return NextResponse.json({ ok: true, path: result.path });
    }

    return NextResponse.json({ error: 'body ไม่ถูกต้อง' }, { status: 400 });
  } catch (err) {
    console.error('save-record error:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
