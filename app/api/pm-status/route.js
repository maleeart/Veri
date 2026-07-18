import { NextResponse } from 'next/server';
import { loadJsonFile, saveJsonFile } from '../../../src/lib/githubStorage';
import { requireRole } from '../../../src/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PM_PATH = 'data/pm/pm-status.json';
// state = { [machineId]: { [itemKey]: "YYYY-MM-DD" | null } }
// เครื่องที่ยังไม่มี key = ยังไม่ได้ตั้งค่าครั้งแรก · null = ไม่ทราบ/ยังไม่เคย

export async function GET() {
  try {
    const state = (await loadJsonFile(PM_PATH)) || {};
    return NextResponse.json({ state });
  } catch (err) {
    return NextResponse.json({ state: {}, error: String(err?.message || err) });
  }
}

export async function POST(request) {
  const gate = await requireRole('user');
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  try {
    const body = await request.json();
    const { machineId } = body;
    if (!machineId) return NextResponse.json({ error: 'ต้องระบุ machineId' }, { status: 400 });

    const state = (await loadJsonFile(PM_PATH)) || {};
    const cur = state[machineId] || {};

    if (body.baseline && typeof body.baseline === 'object') {
      // ตั้งค่าครั้งแรก — เขียนทั้งเครื่อง
      state[machineId] = { ...cur, ...body.baseline };
    } else if (body.itemKey) {
      // บันทึกว่าทำแล้ว 1 รายการ
      state[machineId] = { ...cur, [body.itemKey]: body.date || new Date().toISOString().slice(0, 10) };
    } else {
      return NextResponse.json({ error: 'ต้องระบุ baseline หรือ itemKey' }, { status: 400 });
    }

    await saveJsonFile(PM_PATH, state, `บันทึก PM ${machineId}`);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error('pm-status error:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
