import { NextResponse } from 'next/server';
import { requireRole } from '../../../src/lib/auth';
import { listUsers, setRole } from '../../../src/lib/usersStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// GET → รายชื่อ role ทั้งหมด (admin เท่านั้น)
export async function GET() {
  const gate = await requireRole('admin');
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    return NextResponse.json({ users: await listUsers(), admins: ADMIN_EMAILS });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// POST { email, role:'user'|'visitor' } → ตั้งสิทธิ์ (admin เท่านั้น)
export async function POST(request) {
  const gate = await requireRole('admin');
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { email, role } = await request.json();
    if (!email || !['user', 'visitor'].includes(role))
      return NextResponse.json({ error: 'ต้องระบุ email และ role (user/visitor)' }, { status: 400 });
    if (ADMIN_EMAILS.includes(String(email).toLowerCase()))
      return NextResponse.json({ error: 'เปลี่ยนสิทธิ์ admin ผ่านหน้านี้ไม่ได้ (แก้ที่ env ADMIN_EMAILS)' }, { status: 400 });
    const users = await setRole(email, role);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
