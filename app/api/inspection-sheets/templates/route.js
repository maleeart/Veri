import { NextResponse } from 'next/server';
import { 
  loadInspectionTemplates, 
  saveInspectionTemplate, 
  deleteInspectionTemplate 
} from '../../../../src/lib/inspectionSheetsStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const templates = await loadInspectionTemplates();

    if (id) {
      const template = templates.find(t => t.id === id);
      if (!template) {
        return NextResponse.json({ ok: false, error: 'ไม่พบแบบฟอร์มที่ระบุ' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, template });
    }

    return NextResponse.json({ ok: true, templates });
  } catch (err) {
    console.error('API templates GET error:', err);
    return NextResponse.json({ ok: false, error: err.message, templates: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.name) {
      return NextResponse.json({ ok: false, error: 'กรุณาระบุชื่อแบบฟอร์ม' }, { status: 400 });
    }

    if (!Array.isArray(body.columns) || body.columns.length === 0) {
      return NextResponse.json({ ok: false, error: 'แบบฟอร์มต้องมีอย่างน้อย 1 คอลัมน์' }, { status: 400 });
    }

    const saved = await saveInspectionTemplate(body);
    return NextResponse.json({ ok: true, template: saved });
  } catch (err) {
    console.error('API templates POST error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ต้องระบุ id ของแบบฟอร์ม' }, { status: 400 });
    }

    const result = await deleteInspectionTemplate(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('API templates DELETE error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
