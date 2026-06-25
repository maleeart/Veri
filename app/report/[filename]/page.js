'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';

const v = (val, unit = '') => {
  if (val === undefined || val === null || val === '') return '–';
  return unit ? `${val} ${unit}` : String(val);
};

// ─── Main loader ──────────────────────────────────────────────────────────────
function ReportInner() {
  const { filename } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fieldMap, setFieldMap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections?filename=${encodeURIComponent(filename)}`).then(r => {
        if (!r.ok) throw new Error('ไม่พบข้อมูล (filename: ' + filename + ')');
        return r.json();
      }),
      fetch('/api/field-map').then(r => r.json()),
    ])
      .then(([d, fm]) => { setData(d); setFieldMap(fm); })
      .catch(err => setError(err.message));
  }, [filename]);

  if (error) return <div style={{ padding: 40, color: '#c03232', fontFamily: 'sans-serif' }}>❌ {error}</div>;
  if (!data || !fieldMap) return <div style={{ padding: 40, color: '#666', fontFamily: 'sans-serif' }}>กำลังโหลดข้อมูล...</div>;

  const isFpg = data.type === 'fpg';

  return (
    <div className="rp-root">
      {/* toolbar — ซ่อนตอนพิมพ์ */}
      <div className="no-print toolbar">
        <button className="btn-back" onClick={() => router.back()}>‹ กลับ</button>
        <span className="toolbar-title">ตัวอย่างก่อนพิมพ์ · {isFpg ? 'Fire Pump & Generator' : data.type === 'emergency' ? 'Emergency Light' : 'Smoke Detector'}</span>
        <button className="btn-print" onClick={() => window.print()}>📄 ออกรายงาน PDF (A4)</button>
      </div>

      <div className="rp-pages">
        {isFpg
          ? <FpgReport data={data} fieldMap={fieldMap} />
          : <ListReport data={data} fieldMap={fieldMap} />
        }
      </div>

      <style jsx global>{`
        /* ─────────────── PRINT ─────────────── */
        @media print {
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', sans-serif !important;
                 font-size: 10pt !important; color: #000 !important; background: #fff !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .rp-root { padding: 0 !important; background: none !important; }
          .rp-pages { max-width: none !important; width: 100% !important; padding: 0 !important; }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .avoid-break { page-break-inside: avoid; }
          img { max-width: 100% !important; }
          .sig-img { max-height: 44pt !important; }
        }

        /* ─────────────── SCREEN ─────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #d0d0d0; font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
        .rp-root { min-height: 100vh; padding-top: 60px; }

        /* toolbar */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 999;
          display: flex; align-items: center; gap: 12px; padding: 0 16px;
          background: #111827; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        }
        .toolbar-title { flex: 1; text-align: center; font-size: 13px; color: #9ca3af; }
        .btn-back {
          padding: 7px 14px; border-radius: 8px; border: 1px solid #374151;
          background: #1f2937; color: #d1d5db; font-size: 13px; cursor: pointer;
        }
        .btn-print {
          padding: 9px 18px; border-radius: 8px; border: none;
          background: #dc2626; color: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
        }
        .btn-print:hover { background: #b91c1c; }

        /* A4 page wrapper (screen only) */
        .rp-pages {
          max-width: 210mm; margin: 0 auto; padding: 16px 16px 60px;
          display: flex; flex-direction: column; gap: 0;
        }
        .a4-page {
          background: #fff; padding: 15mm;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          margin-bottom: 12px;
        }
        @media print { .a4-page { box-shadow: none; padding: 0; margin: 0; } }

        /* ─────────── Shared ─────────── */
        .form-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #000; padding-bottom: 6pt; margin-bottom: 8pt;
        }
        .form-header-left { display: flex; flex-direction: column; gap: 2pt; }
        .form-org { font-size: 8pt; color: #555; }
        .form-title { font-size: 14pt; font-weight: 900; color: #000; line-height: 1.2; }
        .form-sub { font-size: 9pt; color: #333; }
        .form-header-right { text-align: right; font-size: 9pt; line-height: 1.8; }
        .form-date-label { font-size: 8pt; color: #666; }
        .form-date-val { font-size: 11pt; font-weight: 800; color: #000; }

        /* info row */
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; font-size: 9pt; }
        .info-table td { border: 1px solid #555; padding: 3pt 6pt; vertical-align: top; }
        .info-table .lbl { background: #f0f0f0; font-weight: 700; white-space: nowrap; width: 18%; }
        @media print { .info-table .lbl { background: #e8e8e8 !important; } }

        /* section header */
        .sec-hd {
          background: #1a1a2e; color: #fff; font-size: 9.5pt; font-weight: 700;
          padding: 3pt 8pt; margin: 8pt 0 0; letter-spacing: 0.02em;
        }
        @media print { .sec-hd { background: #000 !important; color: #fff !important; } }

        /* checklist / data table */
        .r-tbl { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 0; }
        .r-tbl th, .r-tbl td { border: 1px solid #555; padding: 3pt 5pt; vertical-align: middle; line-height: 1.35; }
        .r-tbl th { background: #e8e8e8; font-weight: 700; text-align: center; }
        @media print { .r-tbl th { background: #e0e0e0 !important; } }
        .r-tbl td.c { text-align: center; }
        .r-tbl td.r { text-align: right; font-variant-numeric: tabular-nums; }
        .pass { color: #14532d; font-weight: 700; }
        .fail { color: #7f1d1d; font-weight: 700; }
        .norm { color: #14532d; font-weight: 700; }
        .abno { color: #7f1d1d; font-weight: 700; }
        .na   { color: #6b7280; }

        /* images strip */
        .img-strip { display: flex; flex-wrap: wrap; gap: 4pt; margin: 6pt 0 8pt; }
        .img-strip img { height: 56pt; width: auto; max-width: 80pt; border: 1px solid #ccc; object-fit: cover; border-radius: 2pt; }
        @media print { .img-strip img { height: 50pt !important; } }

        /* conclusion + signature */
        .concl-box { border: 1px solid #555; padding: 5pt 8pt; min-height: 28pt; font-size: 9pt; white-space: pre-wrap; line-height: 1.6; margin-bottom: 8pt; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin-top: 6pt; }
        .sig-box { border: 1px solid #555; padding: 5pt 8pt; text-align: center; min-height: 60pt; }
        .sig-box-lbl { font-size: 8pt; color: #555; margin-bottom: 3pt; }
        .sig-img { max-height: 44pt; max-width: 100%; object-fit: contain; }
        .sig-line { border-top: 1px solid #999; width: 70%; margin: 5pt auto 3pt; }
        .sig-name { font-size: 9pt; font-weight: 700; }
        .sig-role { font-size: 7.5pt; color: #777; }
      `}</style>
    </div>
  );
}

// ─── FPG Report ───────────────────────────────────────────────────────────────
function FpgReport({ data, fieldMap }) {
  return (
    <>
      {fieldMap.machines.map((machine, mIdx) => {
        const rec = data.records?.[machine.id];
        if (!rec) return null;
        const isGen = machine.type === 'generator';
        const tpl = isGen ? fieldMap.generator_template : fieldMap.fire_pump_template;
        const preVisualItems = tpl.sheet_visual_fields.checklist_0_items || [];
        const preRunItems    = tpl.sheet_data_fields.checklist_1_items   || [];
        const g        = rec.generalData || {};
        const readings = rec.readings    || {};
        const testRun  = rec.testRun     || {};
        const afterRun = rec.afterRun    || {};
        const jp = readings.jockeyPump   || {};
        const el = readings.electrical   || {};
        const inspDate = rec.inspectionDate || data.date;

        return (
          <div key={machine.id} className={`a4-page${mIdx > 0 ? ' page-break' : ''}`}>

            {/* ── Form header ── */}
            <div className="form-header">
              <div className="form-header-left">
                <span className="form-org">การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย · สำนักงานไทรน้อย</span>
                <span className="form-title">{machine.label_th || machine.label}</span>
                <span className="form-sub">{machine.label} · {machine.location_default}</span>
              </div>
              <div className="form-header-right">
                <div className="form-date-label">วันที่ตรวจสอบ</div>
                <div className="form-date-val">{inspDate}</div>
              </div>
            </div>

            {/* ── Machine info ── */}
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="lbl">Model</td><td>{machine.model_default}</td>
                  <td className="lbl">Serial No.</td><td>{machine.serial_default}</td>
                  <td className="lbl">ผู้ผลิต</td><td>{machine.mfg_default}</td>
                </tr>
                <tr>
                  {!isGen ? (
                    <><td className="lbl">น้ำมัน ก่อน/หลัง</td><td>{v(g.fuelBefore)} / {v(afterRun.fuelAfter)} L</td></>
                  ) : (
                    <><td className="lbl">จำนวนครั้งทำงาน</td><td>{v(g.runCount)} ครั้ง</td></>
                  )}
                  <td className="lbl">ชั่วโมง ก่อน/หลัง</td>
                  <td>{v(g.runningHoursBefore)} / {v(afterRun.runningHoursAfter)} Hrs</td>
                  <td className="lbl">เวลาเดินเครื่อง</td>
                  <td>{v(g.runDurationMins)} นาที</td>
                </tr>
              </tbody>
            </table>

            {/* ── Reference photos ── */}
            {machine.image_files?.length > 0 && (
              <div className="avoid-break">
                <div className="sec-hd">รูปอ้างอิงอุปกรณ์ (Nameplate / Equipment)</div>
                <div className="img-strip">
                  {machine.image_files.map(f => (
                    <img key={f} src={`/${machine.image_dir}/${f}`} alt={f} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Checklist 0 ── */}
            <div className="avoid-break">
              <div className="sec-hd">0. ตรวจสอบก่อนเข้าใช้งาน (Pre-Visual Checklist)</div>
              <table className="r-tbl">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ textAlign: 'left' }}>รายการ</th>
                    <th style={{ width: '13%' }}>ผลการตรวจ</th>
                    <th style={{ width: '24%' }}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {preVisualItems.map((item, i) => {
                    const e = (rec.preVisual || [])[i] || {};
                    return (
                      <tr key={i}>
                        <td className="c">{i + 1}</td>
                        <td>{item.text}</td>
                        <td className="c">
                          {e.result === 'pass' && <span className="pass">✓ ผ่าน</span>}
                          {e.result === 'fail' && <span className="fail">✗ ไม่ผ่าน</span>}
                          {!e.result && <span className="na">–</span>}
                        </td>
                        <td>{e.note || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Checklist 1 ── */}
            <div className="avoid-break">
              <div className="sec-hd">1. ตรวจสภาพก่อนเดินเครื่อง (Pre-Run Checklist)</div>
              <table className="r-tbl">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ textAlign: 'left' }}>รายการ</th>
                    <th style={{ width: '13%' }}>ผลการตรวจ</th>
                    <th style={{ width: '24%' }}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {preRunItems.map((item, i) => {
                    const e = (rec.preRunVisual || [])[i] || {};
                    return (
                      <tr key={i}>
                        <td className="c">{i + 1}</td>
                        <td>{item.text}</td>
                        <td className="c">
                          {e.result === 'normal'   && <span className="norm">✓ ปกติ</span>}
                          {e.result === 'abnormal' && <span className="abno">✗ ผิดปกติ</span>}
                          {e.result === 'na'       && <span className="na">ไม่มี</span>}
                          {!e.result && <span className="na">–</span>}
                        </td>
                        <td>{e.note || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Readings + Test Run ── */}
            <div className="avoid-break">
              <div className="sec-hd">2. ค่าที่บันทึกได้ระหว่าง Test-Run</div>
              <table className="r-tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '38%' }}>รายการ</th>
                    <th style={{ width: '12%' }}>ค่า</th>
                    <th style={{ width: '8%' }}>หน่วย</th>
                    <th style={{ textAlign: 'left', width: '38%' }}>รายการ</th>
                    <th style={{ width: '12%' }}>ค่า</th>
                    <th style={{ width: '8%' }}>หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {isGen ? (<>
                    <MRow a="แรงดันแบตเตอรี่" av={readings.batteryVoltage} au="V"   b="ความเร็วรอบ"         bv={testRun.rpm}           bu="RPM" />
                    <MRow a="V Off-Load L1-N"  av={el.offload_L1N}          au="V"   b="แรงดันน้ำมันเครื่อง" bv={testRun.oilPressure}   bu="Psi" />
                    <MRow a="V Off-Load L2-N"  av={el.offload_L2N}          au="V"   b="อุณหภูมิน้ำหล่อเย็น" bv={testRun.coolantTemp}   bu="°C"  />
                    <MRow a="V Off-Load L3-N"  av={el.offload_L3N}          au="V"   b="แรงดันชาร์จแบต"      bv={testRun.chargeVoltage} bu="V"   />
                    <MRow a="V Off-Load L1-L2" av={el.offload_L1L2}         au="V"   b="ความถี่ไฟฟ้า"        bv={testRun.frequency}     bu="Hz"  />
                    <MRow a="V Off-Load L2-L3" av={el.offload_L2L3}         au="V"   b="แรงดันน้ำในระบบ"     bv={testRun.systemPressure} bu="Psi" />
                    <MRow a="V Off-Load L1-L3" av={el.offload_L1L3}         au="V"   b="อัตราสิ้นเปลืองเชื้อเพลิง" bv={testRun.fuelConsumption} bu="L" />
                    <MRow a="กระแส L1"          av={el.current_L1}           au="A"   b="" bv="" bu="" />
                    <MRow a="กระแส L2"          av={el.current_L2}           au="A"   b="" bv="" bu="" />
                    <MRow a="กระแส L3"          av={el.current_L3}           au="A"   b="" bv="" bu="" />
                  </>) : (<>
                    <MRow a="แรงดันน้ำในระบบ"        av={readings.waterPressure}  au="Psi" b="ความเร็วรอบ"              bv={testRun.rpm}             bu="RPM" />
                    <MRow a="แรงดันแบตเตอรี่ #1"     av={readings.battery1Voltage} au="V" b="แรงดันน้ำมันเครื่อง"      bv={testRun.oilPressure}     bu="Psi" />
                    <MRow a="แรงดันแบตเตอรี่ #2"     av={readings.battery2Voltage} au="V" b="แรงดันน้ำระบาย"            bv={testRun.coolingPressure} bu="Psi" />
                    <MRow a="Jockey V L1-L2"          av={jp.voltageL1L2}          au="V"  b="อุณหภูมิน้ำหล่อเย็น"     bv={testRun.coolantTemp}     bu="°C"  />
                    <MRow a="Jockey V L2-L3"          av={jp.voltageL2L3}          au="V"  b="แรงดันน้ำในระบบ (ขณะเดิน)" bv={testRun.systemPressure} bu="Psi" />
                    <MRow a="Jockey V L1-L3"          av={jp.voltageL1L3}          au="V"  b="อัตราสิ้นเปลืองเชื้อเพลิง" bv={testRun.fuelConsumption} bu="L"  />
                    <MRow a="Jockey A L1"             av={jp.currentL1}            au="A"  b="" bv="" bu="" />
                    <MRow a="Jockey A L2"             av={jp.currentL2}            au="A"  b="" bv="" bu="" />
                    <MRow a="Jockey A L3"             av={jp.currentL3}            au="A"  b="" bv="" bu="" />
                  </>)}
                </tbody>
              </table>
            </div>

            {/* ── Conclusion + Signature ── */}
            <div className="avoid-break" style={{ marginTop: '8pt' }}>
              <div className="sec-hd">3. สรุปผลและลงชื่อ</div>
              {afterRun.comment && (
                <div className="concl-box" style={{ borderBottom: 'none', marginBottom: 0 }}>
                  <strong style={{ fontSize: '8pt' }}>หมายเหตุ / Remarks:</strong><br />{afterRun.comment}
                </div>
              )}
              <div className="concl-box">
                <strong style={{ fontSize: '8pt' }}>สรุปผล / Conclusion:</strong><br />
                {afterRun.conclusionText || '–'}
              </div>
              <div className="sig-row">
                <div className="sig-box">
                  <div className="sig-box-lbl">ลายเซ็นผู้ตรวจสอบ / Inspector</div>
                  {afterRun.inspectorSignature
                    ? <img src={afterRun.inspectorSignature} alt="sig" className="sig-img" />
                    : <div style={{ height: 32, borderBottom: '1px solid #aaa', margin: '8pt 20% 0' }} />
                  }
                  <div className="sig-line" />
                  <div className="sig-name">{v(afterRun.inspectedBy)}</div>
                  <div className="sig-role">ผู้ตรวจสอบ · {inspDate}</div>
                </div>
                <div className="sig-box">
                  <div className="sig-box-lbl">ลายเซ็นผู้อนุมัติ / Approver</div>
                  <div style={{ height: 32, borderBottom: '1px solid #aaa', margin: '8pt 20% 0' }} />
                  <div className="sig-line" />
                  <div className="sig-name">{v(afterRun.approvedBy)}</div>
                  <div className="sig-role">ผู้อนุมัติ</div>
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </>
  );
}

// helper row สำหรับตารางค่าวัด 2 คอลัมน์
function MRow({ a, av, au, b, bv, bu }) {
  return (
    <tr>
      <td>{a}</td>
      <td className="r">{av !== undefined && av !== null && av !== '' ? av : '–'}</td>
      <td className="c">{au}</td>
      <td>{b}</td>
      <td className="r">{bv !== undefined && bv !== null && bv !== '' ? bv : (b ? '–' : '')}</td>
      <td className="c">{bu}</td>
    </tr>
  );
}

// ─── Emergency / Smoke List Report ───────────────────────────────────────────
function ListReport({ data, fieldMap }) {
  const { general = {}, devices = [] } = data.records || {};
  const isEmer = data.type === 'emergency';
  const title = isEmer ? 'รายงานตรวจสอบไฟฉุกเฉิน (Emergency Light)' : 'รายงานตรวจสอบ Smoke Detector';

  const passCount = devices.filter(d =>
    isEmer ? d.lightCondition === 'pass' : d.externalCondition === 'normal'
  ).length;

  return (
    <div className="a4-page">
      {/* header */}
      <div className="form-header">
        <div className="form-header-left">
          <span className="form-org">การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย · สำนักงานไทรน้อย</span>
          <span className="form-title">{title}</span>
        </div>
        <div className="form-header-right">
          <div className="form-date-label">วันที่ตรวจสอบ</div>
          <div className="form-date-val">{general.inspectionDate || data.date}</div>
        </div>
      </div>

      {/* info */}
      <table className="info-table" style={{ marginBottom: '8pt' }}>
        <tbody>
          <tr>
            <td className="lbl">ผู้ตรวจสอบ</td><td>{general.inspector || '–'}</td>
            <td className="lbl">อาคาร</td><td>{general.building || '–'}</td>
            <td className="lbl">ชั้น / โซน</td><td>{general.floor || '–'}</td>
          </tr>
          <tr>
            <td className="lbl">Model</td><td>{general.model || '–'}</td>
            <td className="lbl">Serial No.</td><td>{general.serial || '–'}</td>
            <td className="lbl">ผู้ผลิต</td><td>{general.mfg || '–'}</td>
          </tr>
        </tbody>
      </table>

      {/* summary bar */}
      <div style={{ display: 'flex', gap: '8pt', marginBottom: '8pt', fontSize: '9pt' }}>
        <span style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: '4pt', padding: '3pt 10pt', color: '#14532d', fontWeight: 700 }}>
          ปกติ / ผ่าน: {passCount} จุด
        </span>
        {devices.length - passCount > 0 && (
          <span style={{ background: '#fef2f2', border: '1px solid #dc2626', borderRadius: '4pt', padding: '3pt 10pt', color: '#7f1d1d', fontWeight: 700 }}>
            ไม่ผ่าน: {devices.length - passCount} จุด
          </span>
        )}
        <span style={{ background: '#f9fafb', border: '1px solid #9ca3af', borderRadius: '4pt', padding: '3pt 10pt', color: '#374151' }}>
          รวม: {devices.length} จุด
        </span>
      </div>

      {/* device table */}
      {isEmer ? (
        <table className="r-tbl">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '14%' }}>รหัส / ID</th>
              <th style={{ textAlign: 'left' }}>ตำแหน่งติดตั้ง</th>
              <th style={{ width: '11%' }}>สภาพโคม</th>
              <th style={{ width: '11%' }}>ไฟสถานะ</th>
              <th style={{ width: '11%' }}>ผล Test</th>
              <th style={{ width: '18%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                <td className="c">{d.id || '–'}</td>
                <td>{d.location || '–'}</td>
                <td className="c">{d.lightCondition  === 'pass'    ? <span className="pass">✓ ผ่าน</span>   : <span className="fail">✗ ไม่ผ่าน</span>}</td>
                <td className="c">{d.statusLight     === 'normal'  ? <span className="norm">ปกติ</span>      : <span className="abno">ผิดปกติ</span>}</td>
                <td className="c">{d.testResult      === 'on'      ? <span className="pass">ติด</span>       : <span className="fail">ดับ</span>}</td>
                <td>{d.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="r-tbl">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '16%' }}>Zone / Address</th>
              <th style={{ textAlign: 'left' }}>ตำแหน่งติดตั้ง</th>
              <th style={{ width: '13%' }}>สภาพภายนอก</th>
              <th style={{ width: '13%' }}>ทำความสะอาด</th>
              <th style={{ width: '13%' }}>สภาพการทำงาน</th>
              <th style={{ width: '16%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                <td className="c">{d.zone || '–'}</td>
                <td>{d.location || '–'}</td>
                <td className="c">{d.externalCondition === 'normal'    ? <span className="norm">ปกติ</span>   : <span className="abno">สกปรก</span>}</td>
                <td className="c">{d.cleaned          === 'yes'        ? <span className="pass">✓ ทำแล้ว</span> : <span className="fail">ไม่ทำ</span>}</td>
                <td className="c">{d.workingCondition === 'normal'     ? <span className="norm">ปกติ</span>   : <span className="abno">ไม่ทำงาน</span>}</td>
                <td>{d.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif', color: '#666' }}>กำลังโหลด...</div>}>
      <ReportInner />
    </Suspense>
  );
}
