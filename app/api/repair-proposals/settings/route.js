import { NextResponse } from 'next/server';
import { loadRepairSettings, saveRepairSettings } from '../../../../src/lib/githubStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await loadRepairSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error('repair-proposals/settings GET error:', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // Optional PIN verification if sent
    if (body.pin && String(body.pin).trim() !== '8888') {
      return NextResponse.json({ ok: false, error: 'รหัส PIN ไม่ถูกต้อง' }, { status: 403 });
    }

    const { pin, ...settingsToSave } = body;
    const result = await saveRepairSettings(settingsToSave.settings || settingsToSave);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('repair-proposals/settings POST error:', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
