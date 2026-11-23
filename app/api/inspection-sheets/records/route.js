import { NextResponse } from 'next/server';
import { 
  listInspectionRecords, 
  loadInspectionRecord, 
  saveInspectionRecord, 
  deleteInspectionRecord,
  generateInspectionRecordNo
} from '../../../../src/lib/inspectionSheetsStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const getNextRef = searchParams.get('getNextRef');

    if (getNextRef === '1') {
      const prefix = searchParams.get('prefix');
      const nextRef = await generateInspectionRecordNo(null, prefix);
      return NextResponse.json({ ok: true, nextRef });
    }

    if (id) {
      const record = await loadInspectionRecord(id);
      if (!record) {
        return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลบันทึกการตรวจเช็ค' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, record });
    }

    const records = await listInspectionRecords();
    return NextResponse.json({ ok: true, records });
  } catch (err) {
    console.error('API records GET error:', err);
    return NextResponse.json({ ok: false, error: err.message, records: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.templateId) {
      return NextResponse.json({ ok: false, error: 'ต้องระบุแบบฟอร์ม (templateId)' }, { status: 400 });
    }

    const saved = await saveInspectionRecord(body);
    return NextResponse.json({ ok: true, record: saved });
  } catch (err) {
    console.error('API records POST error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('recordNo');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ต้องระบุ id หรือ recordNo' }, { status: 400 });
    }

    const result = await deleteInspectionRecord(id);
    const recordNo = searchParams.get('recordNo');
    if (recordNo && recordNo !== id) {
      await deleteInspectionRecord(recordNo);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('API records DELETE error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
