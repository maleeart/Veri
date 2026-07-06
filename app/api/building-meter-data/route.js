import { NextResponse } from 'next/server';
import { parseCSV, toThaiDate, mode } from '../../../src/lib/buildingMeterExporter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OWNER = process.env.GITHUB_REPO_OWNER || 'maleeart';

export async function GET(request) {
  try {
    const week = new URL(request.url).searchParams.get('week');
    if (!/^\d{4}-W\d{2}$/.test(week || ''))
      return NextResponse.json({ error: 'ต้องระบุ week เช่น 2026-W26' }, { status: 400 });

    const url = `https://raw.githubusercontent.com/${OWNER}/Energy-Dashboard/main/forms/${week}.csv`;
    const csvRes = await fetch(url, { cache: 'no-store' });
    if (!csvRes.ok) return NextResponse.json({ error: `ไม่พบข้อมูลสัปดาห์ ${week}` }, { status: 404 });

    const rows = parseCSV(await csvRes.text()).filter(r => r.length > 1);
    if (!rows.length) return NextResponse.json({ error: 'CSV ว่าง' }, { status: 404 });

    const hdr = rows[0].map(h => h.trim());
    const iSort = hdr.indexOf('sort_order'), iUnit = hdr.indexOf('raw_unit'),
          iVal  = hdr.indexOf('raw_reading'), iReader = hdr.indexOf('reader'),
          iDate = hdr.indexOf('reading_date'), iName = hdr.indexOf('meter_name');

    const records = [];
    for (let r = 1; r < rows.length; r++) {
      const c = rows[r];
      const no = parseInt(c[iSort], 10);
      if (!Number.isFinite(no)) continue;
      records.push({
        no,
        unit:   (c[iUnit]   || '').trim(),
        name:   iName   >= 0 ? (c[iName]   || '').trim() : '',
        val:    (c[iVal]    || '').trim(),
        reader: iReader >= 0 ? (c[iReader] || '').trim() : '',
        date:   iDate   >= 0 ? (c[iDate]   || '').trim() : '',
      });
    }

    const allDates   = records.map(r => r.date).filter(Boolean);
    const allReaders = records.map(r => r.reader).filter(Boolean);
    return NextResponse.json({
      week,
      date: toThaiDate(mode(allDates)),
      reader: mode(allReaders),
      records,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
