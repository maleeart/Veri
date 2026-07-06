import { NextResponse } from 'next/server';
import { generateExitReport } from '../../../src/lib/exitExporter';
import { loadInspectionByDate, loadInspectionByFilename } from '../../../src/lib/githubStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitize = s => String(s || '').replace(/[\\/:*?"<>|]/g, '').trim();

async function buildResponse(date, general, devices) {
  const buffer = await generateExitReport('exit', { date, general, devices });
  const floor = sanitize(general?.floor);
  const parts = [`Exit Sign_${date}`, floor].filter(Boolean);
  const fname = parts.join('_') + '.xlsx';
  const ascii = fname.replace(/[^\x20-\x7E]/g, '_');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
    },
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date     = searchParams.get('date');
    const filename = searchParams.get('filename');
    const building = searchParams.get('building') || '';
    const floor    = searchParams.get('floor')    || '';
    if (!date) return NextResponse.json({ error: 'ต้องระบุ date' }, { status: 400 });

    const saved = filename
      ? await loadInspectionByFilename(filename)
      : await loadInspectionByDate(date, 'exit', building, floor);
    if (!saved) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });

    return buildResponse(date, saved.records?.general || {}, saved.records?.devices || []);
  } catch (err) {
    console.error('export-exit GET:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
