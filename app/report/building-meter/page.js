'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ReportInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const week = searchParams.get('week');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!week) { setError('ไม่ระบุสัปดาห์'); return; }
    fetch(`/api/building-meter-data?week=${encodeURIComponent(week)}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error || 'โหลดไม่สำเร็จ')))
      .then(setData)
      .catch(setError);
  }, [week]);

  if (error) return <div style={{ padding: 40, color: '#c03232', fontFamily: 'sans-serif' }}>❌ {String(error)}</div>;
  if (!data) return <div style={{ padding: 40, color: '#666', fontFamily: 'sans-serif' }}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="rp-root">
      <div className="no-print toolbar">
        <button className="btn-back" onClick={() => router.back()}>‹ กลับ</button>
        <span className="toolbar-title">ตัวอย่างก่อนพิมพ์ · Meter อาคาร · {data.week}</span>
        <button className="btn-print" onClick={() => window.print()}>📄 พิมพ์ / PDF</button>
      </div>

      <div className="rp-pages">
        <div className="a4-page">
          <div className="form-header">
            <div className="form-header-center">
              <span className="form-org">การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย · สำนักงานไทรน้อย</span>
              <span className="form-title">บันทึกการจดหน่วยมิเตอร์ไฟฟ้า</span>
              <span className="form-sub">สัปดาห์ {data.week}</span>
            </div>
            <div className="form-header-right">
              <div className="form-date-label">วันที่จด</div>
              <div className="form-date-val">{data.date || '–'}</div>
            </div>
          </div>

          <div style={{ fontSize: '9pt', marginBottom: '6pt', color: '#000' }}>
            ผู้จดบันทึก: <strong>{data.reader || '–'}</strong>
          </div>

          <table className="r-tbl">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>ลำดับ</th>
                <th style={{ width: '16%' }}>หน่วย (Unit)</th>
                <th style={{ textAlign: 'left' }}>ชื่อมิเตอร์</th>
                <th style={{ width: '18%' }}>ค่าที่จด</th>
                <th style={{ width: '14%' }}>ผู้จด</th>
                <th style={{ width: '16%' }}>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map(r => (
                <tr key={r.no}>
                  <td className="c">{r.no}</td>
                  <td className="c">{r.unit || '–'}</td>
                  <td>{r.name || '–'}</td>
                  <td className="r" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.val || '–'}</td>
                  <td className="c" style={{ fontSize: '8pt' }}>{r.reader || '–'}</td>
                  <td className="c" style={{ fontSize: '8pt' }}>{r.date || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif !important; font-size: 10pt !important; background: #fff !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .rp-root { padding: 0 !important; }
          .rp-pages { max-width: none !important; padding: 0 !important; }
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #c8c8c8; font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; color: #000; }
        .rp-root { min-height: 100vh; padding-top: 64px; }
        .toolbar { position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 999; display: flex; align-items: center; gap: 12px; padding: 0 16px; background: #111827; box-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .toolbar-title { flex: 1; text-align: center; font-size: 13px; color: #9ca3af; }
        .btn-back { padding: 7px 14px; border-radius: 8px; border: 1px solid #374151; background: #1f2937; color: #d1d5db; font-size: 13px; cursor: pointer; }
        .btn-print { padding: 9px 18px; border-radius: 8px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .rp-pages { max-width: 210mm; margin: 0 auto; padding: 16px 16px 60px; }
        .a4-page { background: #fff; padding: 14mm 15mm; box-shadow: 0 4px 28px rgba(0,0,0,0.22); color: #000; }
        @media print { .a4-page { box-shadow: none; padding: 0; } }
        .form-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #000; padding-bottom: 6pt; margin-bottom: 8pt; gap: 8pt; }
        .form-header-center { flex: 1; display: flex; flex-direction: column; gap: 2pt; text-align: center; }
        .form-org   { font-size: 8pt; font-weight: 600; }
        .form-title { font-size: 14pt; font-weight: 900; line-height: 1.2; }
        .form-sub   { font-size: 9pt; }
        .form-header-right { text-align: right; line-height: 1.8; flex-shrink: 0; }
        .form-date-label { font-size: 8pt; }
        .form-date-val   { font-size: 12pt; font-weight: 800; }
        .r-tbl { width: 100%; border-collapse: collapse; font-size: 8.5pt; color: #000; }
        .r-tbl th, .r-tbl td { border: 1px solid #444; padding: 3pt 5pt; vertical-align: middle; line-height: 1.4; }
        .r-tbl th { background: #e0e0e0; font-weight: 700; text-align: center; }
        @media print { .r-tbl th { background: #d8d8d8 !important; } }
        .r-tbl td.c { text-align: center; }
        .r-tbl td.r { text-align: right; }
      `}</style>
    </div>
  );
}

export default function BuildingMeterReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif', color: '#666' }}>กำลังโหลด...</div>}>
      <ReportInner />
    </Suspense>
  );
}
