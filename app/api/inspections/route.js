import { NextResponse } from 'next/server';
import { listInspectionDates, loadInspectionByDate, loadInspectionByFilename, loadInspectionByPath } from '../../../src/lib/githubStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const date = searchParams.get('date');

    const ghPath = searchParams.get('path');
    if (ghPath) {
      let data = null;
      try { data = await loadInspectionByPath(ghPath); } catch {}
      if (!data) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
      return NextResponse.json(data);
    }

    if (filename) {
      let data = null;
      try { data = await loadInspectionByFilename(filename); } catch {}
      // fallback: ลอง date+type (รองรับ throw จาก GitHub หรือ path format เก่า)
      if (!data) {
        const parts = filename.split('_');
        const fbType = parts[0] || 'fpg';
        const fbDate = parts[1] || '';
        if (fbDate) try { data = await loadInspectionByDate(fbDate, fbType); } catch {}
      }
      if (!data) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
      return NextResponse.json(data);
    }

    if (date) {
      const type = searchParams.get('type') || 'fpg';
      const data = await loadInspectionByDate(date, type);
      if (!data) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
      return NextResponse.json(data);
    }

    const dates = await listInspectionDates();

    if (searchParams.get('latest') === '1') {
      const type = searchParams.get('type') || 'fpg';
      const latest = dates.find(d => d.type === type);
      if (!latest) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
      const stem = latest._path.split('/').pop().replace(/\.json$/, '');
      const data = await loadInspectionByFilename(stem);
      if (!data) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
      return NextResponse.json({ ...data, _date: latest.date });
    }

    return NextResponse.json({ dates, githubConfigured: true });
  } catch (err) {
    console.error('inspections API error:', err);
    // ส่ง error กลับพร้อม dates=[] เพื่อให้ frontend แสดงสถานะได้ถูกต้อง
    const isConfigError = err.message?.includes('ENV ไม่ครบ') || err.message?.includes('token');
    return NextResponse.json({
      dates: [],
      githubConfigured: false,
      error: isConfigError ? 'GitHub token ยังไม่ได้ตั้งค่า' : String(err.message || err)
    });
  }
}
