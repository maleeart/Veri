'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─── helpers ─────────────────────────────────────────────────────────────────
const v = val => (val !== undefined && val !== null && val !== '') ? val : '–';
const RESULT_2WAY = { pass: 'ผ่าน', fail: 'ไม่ผ่าน' };
const RESULT_3WAY = { normal: 'ปกติ', abnormal: 'ผิดปกติ', na: 'ไม่มี' };

// ─── main ────────────────────────────────────────────────────────────────────
function ReportInner() {
  const { filename } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fieldMap, setFieldMap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections?filename=${encodeURIComponent(filename)}`).then(r => {
        if (!r.ok) throw new Error('ไม่พบข้อมูล');
        return r.json();
      }),
      fetch('/api/field-map').then(r => r.json()),
    ])
      .then(([d, fm]) => { setData(d); setFieldMap(fm); })
      .catch(err => setError(err.message));
  }, [filename]);

  if (error) return <div style={{ padding: 40, color: '#c03232' }}>❌ {error}</div>;
  if (!data || !fieldMap) return <div style={{ padding: 40, color: '#666' }}>กำลังโหลดข้อมูล...</div>;

  const isFpg = data.type === 'fpg';

  return (
    <div className="report-root">
      {/* ── toolbar (hidden on print) ── */}
      <div className="no-print toolbar">
        <button className="btn-back" onClick={() => router.back()}>‹ กลับ</button>
        <div className="toolbar-center">
          <span className="toolbar-title">ตัวอย่างก่อนพิมพ์</span>
        </div>
        <button className="btn-print" onClick={() => window.print()}>
          📄 ออกรายงาน PDF (A4)
        </button>
      </div>

      {/* ── report body ── */}
      <div className="report-body">
        {isFpg
          ? <FpgReport data={data} fieldMap={fieldMap} />
          : <ListReport data={data} fieldMap={fieldMap} />
        }
      </div>

      <style jsx global>{`
        /* ─── Print CSS ─── */
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
                 font-size: 10pt !important; color: #000 !important;
                 background: #fff !important; }
          .no-print { display: none !important; }
          .report-root { padding: 0 !important; background: none !important; }
          .report-body { max-width: none !important; width: 100% !important; padding: 0 !important; }
          .machine-section + .machine-section { page-break-before: always; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .sig-img { max-height: 48pt !important; }
        }

        /* ─── Screen CSS ─── */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sarabun', 'TH Sarabun New', 'Noto Sans Thai', sans-serif;
               background: #e8e8e8; }
        .report-root { min-height: 100vh; padding-top: 56px; }

        /* toolbar */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 100;
          display: flex; align-items: center; gap: 12px; padding: 0 16px;
          background: #1a1a2e; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .toolbar-center { flex: 1; text-align: center; }
        .toolbar-title { font-size: 14px; font-weight: 600; color: #ccc; }
        .btn-back {
          padding: 8px 14px; border-radius: 8px; border: 1px solid #444;
          background: #2a2a3e; color: #ccc; font-size: 13px; cursor: pointer;
        }
        .btn-print {
          padding: 10px 20px; border-radius: 8px; border: none;
          background: #e63946; color: #fff; font-size: 14px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
        }
        .btn-print:hover { background: #c1121f; }

        /* report body */
        .report-body {
          max-width: 210mm; margin: 0 auto; padding: 20px 16px 60px;
        }

        /* ─── Shared table styles ─── */
        .r-table {
          width: 100%; border-collapse: collapse; font-size: 9pt;
          margin-bottom: 10pt;
        }
        .r-table th, .r-table td {
          border: 1px solid #333; padding: 4pt 6pt;
          vertical-align: middle; line-height: 1.4;
        }
        .r-table th {
          background: #1a1a2e; color: #fff; font-weight: 700;
          text-align: center; font-size: 9pt;
        }
        @media print {
          .r-table th { background: #000 !important; color: #fff !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .r-table td.center { text-align: center; }
        .r-table td.num { text-align: right; font-family: monospace; }

        /* ─── FPG Report ─── */
        .machine-section { margin-bottom: 20pt; }
        .m-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 8pt; padding-bottom: 6pt;
          border-bottom: 2.5px solid #1a1a2e;
        }
        .m-title { font-size: 14pt; font-weight: 800; color: #1a1a2e; }
        .m-sub { font-size: 9pt; color: #555; margin-top: 2pt; }
        .m-date { font-size: 9pt; font-weight: 700; color: #333; text-align: right; }

        .info-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0; margin-bottom: 10pt;
          border: 1px solid #333;
        }
        .info-cell { padding: 4pt 6pt; border-right: 1px solid #333; }
        .info-cell:last-child { border-right: none; }
        .info-cell + .info-cell { border-left: none; }
        .info-key { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.03em; }
        .info-val { font-size: 9pt; font-weight: 700; color: #111; }

        .section-title {
          font-size: 10pt; font-weight: 700; background: #f0f0f5;
          padding: 4pt 8pt; margin-bottom: 0;
          border: 1px solid #333; border-bottom: none;
        }

        .readings-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0 12pt;
          margin-bottom: 10pt;
        }
        .readings-group { }
        .readings-group-title {
          font-size: 8pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; color: #555; margin: 6pt 0 2pt;
        }

        .result-pass { color: #1a7a3f; font-weight: 700; }
        .result-fail { color: #c03232; font-weight: 700; }
        .result-normal { color: #1a7a3f; font-weight: 700; }
        .result-abnormal { color: #c03232; font-weight: 700; }
        .result-na { color: #888; }

        .after-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0 16pt; margin-top: 10pt;
        }
        .conclusion-box {
          border: 1px solid #333; padding: 6pt 8pt; min-height: 36pt;
          font-size: 9pt; white-space: pre-wrap; line-height: 1.6;
          margin-bottom: 10pt;
        }
        .sig-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0 16pt;
          margin-top: 8pt;
        }
        .sig-box {
          border: 1px solid #333; padding: 6pt 8pt; text-align: center;
          min-height: 56pt;
        }
        .sig-label { font-size: 8pt; color: #666; margin-bottom: 4pt; }
        .sig-img { max-height: 48pt; max-width: 100%; object-fit: contain; }
        .sig-name { font-size: 9pt; font-weight: 700; margin-top: 4pt; }
        .sig-divider { border-top: 1px solid #999; width: 60%; margin: 4pt auto; }

        /* ─── List Report (Emergency / Smoke) ─── */
        .list-header {
          margin-bottom: 10pt; padding-bottom: 6pt;
          border-bottom: 2.5px solid #1a1a2e;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .list-title { font-size: 14pt; font-weight: 800; color: #1a1a2e; }
        .list-meta { font-size: 9pt; color: #444; text-align: right; line-height: 1.8; }
        .list-info-row {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; border: 1px solid #333; margin-bottom: 10pt;
        }
        .list-info-cell { padding: 4pt 8pt; border-right: 1px solid #333; }
        .list-info-cell:last-child { border-right: none; }
      `}</style>
    </div>
  );
}

// ─── FPG Report ───────────────────────────────────────────────────────────────
function FpgReport({ data, fieldMap }) {
  const machines = fieldMap.machines;
  return (
    <>
      {machines.map((machine, mIdx) => {
        const rec = data.records?.[machine.id];
        if (!rec) return null;
        const isGen = machine.type === 'generator';
        const tpl = isGen ? fieldMap.generator_template : fieldMap.fire_pump_template;
        const preVisualItems = tpl.sheet_visual_fields.checklist_0_items || [];
        const preRunItems = tpl.sheet_data_fields.checklist_1_items || [];
        const g = rec.generalData || {};
        const readings = rec.readings || {};
        const testRun = rec.testRun || {};
        const afterRun = rec.afterRun || {};
        const jp = readings.jockeyPump || {};
        const el = readings.electrical || {};

        return (
          <div key={machine.id} className={`machine-section${mIdx > 0 ? '' : ''}`}>
            {/* ── Machine header ── */}
            <div className="m-header">
              <div>
                <div className="m-title">{machine.label_th || machine.label}</div>
                <div className="m-sub">{machine.label} · {machine.location_default}</div>
              </div>
              <div className="m-date">
                วันที่ตรวจสอบ<br />
                <strong>{rec.inspectionDate || data.date}</strong>
              </div>
            </div>

            {/* ── Info grid ── */}
            <div className="info-grid">
              <div className="info-cell">
                <div className="info-key">Model</div>
                <div className="info-val">{machine.model_default}</div>
              </div>
              <div className="info-cell">
                <div className="info-key">Serial No.</div>
                <div className="info-val">{machine.serial_default}</div>
              </div>
              <div className="info-cell">
                <div className="info-key">ผู้ผลิต</div>
                <div className="info-val">{machine.mfg_default}</div>
              </div>
              <div className="info-cell">
                <div className="info-key">ที่ตั้ง</div>
                <div className="info-val">{machine.location_default}</div>
              </div>
            </div>

            {/* ── General data row ── */}
            <div className="info-grid" style={{ marginBottom: '10pt' }}>
              {!isGen ? (
                <div className="info-cell">
                  <div className="info-key">น้ำมัน (ก่อน/หลัง)</div>
                  <div className="info-val">{v(g.fuelBefore)} / {v(afterRun.fuelAfter)} L</div>
                </div>
              ) : (
                <div className="info-cell">
                  <div className="info-key">จำนวนครั้งทำงาน</div>
                  <div className="info-val">{v(g.runCount)} ครั้ง</div>
                </div>
              )}
              <div className="info-cell">
                <div className="info-key">ชั่วโมง (ก่อน/หลัง)</div>
                <div className="info-val">{v(g.runningHoursBefore)} / {v(afterRun.runningHoursAfter)} Hrs</div>
              </div>
              <div className="info-cell">
                <div className="info-key">ระยะเวลาเดินเครื่อง</div>
                <div className="info-val">{v(g.runDurationMins)} นาที</div>
              </div>
              <div className="info-cell">
                <div className="info-key">อัตราการใช้เชื้อเพลิง</div>
                <div className="info-val">{v(testRun.fuelConsumption)} L</div>
              </div>
            </div>

            {/* ── Checklist 0 — ก่อนเข้าใช้งาน ── */}
            <div className="section-title">0. ตรวจสอบก่อนเข้าใช้งาน</div>
            <table className="r-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ textAlign: 'left' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '12%' }}>ผลการตรวจ</th>
                  <th style={{ width: '22%' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {preVisualItems.map((item, i) => {
                  const entry = (rec.preVisual || [])[i] || {};
                  const res = entry.result;
                  return (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td>{item.text}</td>
                      <td className="center">
                        {res === 'pass' && <span className="result-pass">✓ ผ่าน</span>}
                        {res === 'fail' && <span className="result-fail">✗ ไม่ผ่าน</span>}
                        {!res && <span className="result-na">–</span>}
                      </td>
                      <td>{entry.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Checklist 1 — ก่อนเดินเครื่อง ── */}
            <div className="section-title">1. ตรวจสภาพก่อนเดินเครื่อง</div>
            <table className="r-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ textAlign: 'left' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '12%' }}>ผลการตรวจ</th>
                  <th style={{ width: '22%' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {preRunItems.map((item, i) => {
                  const entry = (rec.preRunVisual || [])[i] || {};
                  const res = entry.result;
                  return (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td>{item.text}</td>
                      <td className="center">
                        {res === 'normal'   && <span className="result-normal">✓ ปกติ</span>}
                        {res === 'abnormal' && <span className="result-abnormal">✗ ผิดปกติ</span>}
                        {res === 'na'       && <span className="result-na">ไม่มี</span>}
                        {!res && <span className="result-na">–</span>}
                      </td>
                      <td>{entry.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Readings + Test Run ── */}
            <div className="section-title">2. ค่าที่บันทึกได้ / Test-Run</div>
            <table className="r-table" style={{ marginBottom: '10pt' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '40%' }}>รายการ</th>
                  <th style={{ width: '15%' }}>ค่าที่วัดได้</th>
                  <th style={{ width: '10%' }}>หน่วย</th>
                  <th style={{ textAlign: 'left', width: '40%' }}>รายการ</th>
                  <th style={{ width: '15%' }}>ค่าที่วัดได้</th>
                  <th style={{ width: '10%' }}>หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {isGen ? (
                  <>
                    <tr>
                      <td>แรงดันแบตเตอรี่</td>
                      <td className="num">{v(readings.batteryVoltage)}</td><td className="center">V</td>
                      <td>ความเร็วรอบ</td>
                      <td className="num">{v(testRun.rpm)}</td><td className="center">RPM</td>
                    </tr>
                    <tr>
                      <td>แรงดัน Off-Load L1-N / L2-N</td>
                      <td className="num">{v(el.offload_L1N)} / {v(el.offload_L2N)}</td><td className="center">V</td>
                      <td>แรงดันน้ำมันเครื่อง</td>
                      <td className="num">{v(testRun.oilPressure)}</td><td className="center">Psi</td>
                    </tr>
                    <tr>
                      <td>แรงดัน Off-Load L3-N / L1-L2</td>
                      <td className="num">{v(el.offload_L3N)} / {v(el.offload_L1L2)}</td><td className="center">V</td>
                      <td>อุณหภูมิน้ำหล่อเย็น</td>
                      <td className="num">{v(testRun.coolantTemp)}</td><td className="center">°C</td>
                    </tr>
                    <tr>
                      <td>แรงดัน Off-Load L2-L3 / L1-L3</td>
                      <td className="num">{v(el.offload_L2L3)} / {v(el.offload_L1L3)}</td><td className="center">V</td>
                      <td>แรงดันชาร์จแบตเตอรี่</td>
                      <td className="num">{v(testRun.chargeVoltage)}</td><td className="center">V</td>
                    </tr>
                    <tr>
                      <td>กระแส L1 / L2 / L3</td>
                      <td className="num">{v(el.current_L1)} / {v(el.current_L2)} / {v(el.current_L3)}</td><td className="center">A</td>
                      <td>ความถี่ไฟฟ้า</td>
                      <td className="num">{v(testRun.frequency)}</td><td className="center">Hz</td>
                    </tr>
                    <tr>
                      <td>แรงดันน้ำในระบบ</td>
                      <td className="num">{v(testRun.systemPressure)}</td><td className="center">Psi</td>
                      <td></td><td></td><td></td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td>แรงดันน้ำในระบบ</td>
                      <td className="num">{v(readings.waterPressure)}</td><td className="center">Psi</td>
                      <td>ความเร็วรอบ</td>
                      <td className="num">{v(testRun.rpm)}</td><td className="center">RPM</td>
                    </tr>
                    <tr>
                      <td>แรงดันแบตเตอรี่ #1 / #2</td>
                      <td className="num">{v(readings.battery1Voltage)} / {v(readings.battery2Voltage)}</td><td className="center">V</td>
                      <td>แรงดันน้ำมันเครื่อง</td>
                      <td className="num">{v(testRun.oilPressure)}</td><td className="center">Psi</td>
                    </tr>
                    <tr>
                      <td>Jockey V L1-L2 / L2-L3 / L1-L3</td>
                      <td className="num">{v(jp.voltageL1L2)} / {v(jp.voltageL2L3)} / {v(jp.voltageL1L3)}</td><td className="center">V</td>
                      <td>อุณหภูมิน้ำหล่อเย็น</td>
                      <td className="num">{v(testRun.coolantTemp)}</td><td className="center">°C</td>
                    </tr>
                    <tr>
                      <td>Jockey A L1 / L2 / L3</td>
                      <td className="num">{v(jp.currentL1)} / {v(jp.currentL2)} / {v(jp.currentL3)}</td><td className="center">A</td>
                      <td>แรงดันน้ำระบาย</td>
                      <td className="num">{v(testRun.coolingPressure)}</td><td className="center">Psi</td>
                    </tr>
                    <tr>
                      <td></td><td></td><td></td>
                      <td>แรงดันน้ำในระบบ (ขณะเดิน)</td>
                      <td className="num">{v(testRun.systemPressure)}</td><td className="center">Psi</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* ── Conclusion + Signature ── */}
            <div className="section-title">3. สรุปผลและลงชื่อ</div>
            {afterRun.comment && (
              <div className="conclusion-box" style={{ borderBottom: 'none', marginBottom: 0 }}>
                <strong style={{ fontSize: '8pt', color: '#555' }}>หมายเหตุ:</strong><br />
                {afterRun.comment}
              </div>
            )}
            <div className="conclusion-box">
              <strong style={{ fontSize: '8pt', color: '#555' }}>สรุปผล:</strong><br />
              {afterRun.conclusionText || '–'}
            </div>
            <div className="sig-row">
              <div className="sig-box">
                <div className="sig-label">ลายเซ็นผู้ตรวจสอบ / Inspector Signature</div>
                {afterRun.inspectorSignature
                  ? <img src={afterRun.inspectorSignature} alt="sig" className="sig-img" />
                  : <div style={{ height: 36, borderBottom: '1px solid #999', margin: '8pt 16pt 0' }} />
                }
                <div className="sig-divider" />
                <div className="sig-name">{v(afterRun.inspectedBy)}</div>
                <div style={{ fontSize: '8pt', color: '#777' }}>ผู้ตรวจสอบ · {rec.inspectionDate || data.date}</div>
              </div>
              <div className="sig-box">
                <div className="sig-label">ลายเซ็นผู้อนุมัติ / Approver Signature</div>
                <div style={{ height: 36, borderBottom: '1px solid #999', margin: '8pt 16pt 0' }} />
                <div className="sig-divider" />
                <div className="sig-name">{v(afterRun.approvedBy)}</div>
                <div style={{ fontSize: '8pt', color: '#777' }}>ผู้อนุมัติ</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Emergency / Smoke List Report ───────────────────────────────────────────
function ListReport({ data, fieldMap }) {
  const { general = {}, devices = [] } = data.records || {};
  const isEmergency = data.type === 'emergency';
  const title = isEmergency ? 'รายงานตรวจสอบไฟฉุกเฉิน (Emergency Light)' : 'รายงานตรวจสอบ Smoke Detector';
  const icon = isEmergency ? '💡' : '🚨';

  const passCount = devices.filter(d => {
    const key = isEmergency ? 'lightCondition' : 'externalCondition';
    const passVal = isEmergency ? 'pass' : 'normal';
    return d[key] === passVal;
  }).length;

  return (
    <div>
      {/* header */}
      <div className="list-header">
        <div>
          <div className="list-title">{icon} {title}</div>
          <div style={{ fontSize: '9pt', color: '#555', marginTop: '3pt' }}>
            ผู้ตรวจสอบ: <strong>{general.inspector || '–'}</strong>
          </div>
        </div>
        <div className="list-meta">
          วันที่ตรวจสอบ: <strong>{general.inspectionDate || data.date}</strong><br />
          อาคาร: <strong>{general.building || '–'}</strong> ชั้น: <strong>{general.floor || '–'}</strong><br />
          รวม {devices.length} จุด · ปกติ/ผ่าน {passCount} จุด
          {devices.length - passCount > 0 && ` · ไม่ผ่าน ${devices.length - passCount} จุด`}
        </div>
      </div>

      {/* device table */}
      {isEmergency ? (
        <table className="r-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '14%' }}>รหัส / ID</th>
              <th style={{ textAlign: 'left' }}>ตำแหน่งติดตั้ง</th>
              <th style={{ width: '12%' }}>สภาพโคม</th>
              <th style={{ width: '12%' }}>ไฟสถานะ</th>
              <th style={{ width: '12%' }}>ผล Test</th>
              <th style={{ width: '18%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td className="center">{i + 1}</td>
                <td className="center">{d.id || '–'}</td>
                <td>{d.location || '–'}</td>
                <td className="center">
                  {d.lightCondition === 'pass'
                    ? <span className="result-pass">✓ ผ่าน</span>
                    : <span className="result-fail">✗ ไม่ผ่าน</span>}
                </td>
                <td className="center">
                  {d.statusLight === 'normal'
                    ? <span className="result-normal">ปกติ</span>
                    : <span className="result-abnormal">ผิดปกติ</span>}
                </td>
                <td className="center">
                  {d.testResult === 'on'
                    ? <span className="result-pass">ติด</span>
                    : <span className="result-fail">ดับ</span>}
                </td>
                <td>{d.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="r-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '18%' }}>Zone / Address</th>
              <th style={{ textAlign: 'left' }}>ตำแหน่งติดตั้ง</th>
              <th style={{ width: '14%' }}>สภาพภายนอก</th>
              <th style={{ width: '14%' }}>ทำความสะอาด</th>
              <th style={{ width: '14%' }}>สภาพการทำงาน</th>
              <th style={{ width: '16%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td className="center">{i + 1}</td>
                <td className="center">{d.zone || '–'}</td>
                <td>{d.location || '–'}</td>
                <td className="center">
                  {d.externalCondition === 'normal'
                    ? <span className="result-normal">ปกติ</span>
                    : <span className="result-abnormal">สกปรก</span>}
                </td>
                <td className="center">
                  {d.cleaned === 'yes'
                    ? <span className="result-pass">ทำแล้ว</span>
                    : <span className="result-fail">ไม่ทำ</span>}
                </td>
                <td className="center">
                  {d.workingCondition === 'normal'
                    ? <span className="result-normal">ปกติ</span>
                    : <span className="result-abnormal">ไม่ทำงาน</span>}
                </td>
                <td>{d.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* general info footer */}
      {(general.model || general.serial || general.mfg) && (
        <div className="list-info-row" style={{ marginTop: '10pt' }}>
          <div className="list-info-cell">
            <div className="info-key">Model</div>
            <div className="info-val">{general.model || '–'}</div>
          </div>
          <div className="list-info-cell">
            <div className="info-key">Serial No.</div>
            <div className="info-val">{general.serial || '–'}</div>
          </div>
          <div className="list-info-cell">
            <div className="info-key">ผู้ผลิต (MFG)</div>
            <div className="info-val">{general.mfg || '–'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#666' }}>กำลังโหลด...</div>}>
      <ReportInner />
    </Suspense>
  );
}
