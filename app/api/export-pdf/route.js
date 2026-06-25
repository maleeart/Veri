import { NextResponse } from 'next/server';
import path from 'path';
import { generateCombinedReport } from '../../../src/lib/excelExporter';
import { loadInspectionByDate } from '../../../src/lib/githubStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'Template_FPG.xlsx');

/**
 * POST /api/export-pdf
 * Body: { date, records?, type?, filename? }
 *
 * 1. generate xlsx buffer (เหมือน export-combined)
 * 2. POST ไป LibreOffice service บน Railway
 * 3. คืน PDF ให้ client
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { date, records: clientRecords, type = 'fpg', filename } = body;

    // โหลด records
    let records = clientRecords;
    if (!records) {
      try {
        const dayData = await loadInspectionByDate(date, type);
        records = dayData?.records;
      } catch (e) {
        return NextResponse.json({ error: 'ดึงข้อมูลจาก GitHub ไม่สำเร็จ: ' + e.message }, { status: 500 });
      }
    }

    if (!records || Object.keys(records).length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
    }

    // Generate xlsx
    const xlsxBuf = await generateCombinedReport(records, TEMPLATE_PATH);

    // ตรวจสอบ env
    const loUrl = process.env.LIBREOFFICE_SERVICE_URL;
    if (!loUrl) {
      return NextResponse.json(
        { error: 'LIBREOFFICE_SERVICE_URL ยังไม่ได้ตั้งค่าใน Environment Variables' },
        { status: 500 }
      );
    }

    // ส่ง xlsx ไปแปลงเป็น PDF
    const convertRes = await fetch(`${loUrl.replace(/\/$/, '')}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: xlsxBuf,
    });

    if (!convertRes.ok) {
      const errText = await convertRes.text().catch(() => 'unknown error');
      return NextResponse.json({ error: 'แปลง PDF ไม่สำเร็จ: ' + errText }, { status: 500 });
    }

    const pdfBuf = await convertRes.arrayBuffer();
    const pdfFilename = `FPG_report_${date || 'report'}.pdf`;

    return new NextResponse(pdfBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (err) {
    console.error('export-pdf:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
