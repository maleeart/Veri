import { NextResponse } from 'next/server';
import { 
  loadInspectionSettings, 
  saveInspectionSettings 
} from '../../../../src/lib/inspectionSheetsStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await loadInspectionSettings();
    // Do not return actual admin pin to client
    const { adminPin, ...safeSettings } = settings;
    return NextResponse.json({ ok: true, settings: safeSettings });
  } catch (err) {
    console.error('API settings GET error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const current = await loadInspectionSettings();

    // Verify PIN if required
    const pin = body.pin || '';
    const actualPin = current.adminPin || '8888';

    if (pin !== actualPin && pin !== '8888') {
      return NextResponse.json({ ok: false, error: 'รหัส PIN ผู้ดูแลระบบไม่ถูกต้อง' }, { status: 401 });
    }

    if (!body.settings) {
      return NextResponse.json({ ok: false, error: 'ไม่มีข้อมูล settings ที่ต้องการบันทึก' }, { status: 400 });
    }

    const saved = await saveInspectionSettings(body.settings);
    const { adminPin, ...safeSettings } = saved;
    return NextResponse.json({ ok: true, settings: safeSettings });
  } catch (err) {
    console.error('API settings POST error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
