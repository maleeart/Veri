import fieldMap from '../data/field-map.json';

const v = (val, fallback = '–') =>
  (val === undefined || val === null || val === '') ? fallback : String(val);

const chk = (result, pass, fail) =>
  result === pass ? '☑' : result === fail ? '☐' : '☐';

const passBox  = r => r === 'pass'     ? '☑' : '☐';
const failBox  = r => r === 'fail'     ? '☑' : '☐';
const normBox  = r => r === 'normal'   ? '☑' : '☐';
const abnBox   = r => r === 'abnormal' ? '☑' : '☐';
const noneBox  = r => r === 'none'     ? '☑' : '☐';

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'TH SarabunPSK', 'Sarabun', 'Angsana New', Arial, sans-serif;
  font-size: 13px; color: #000;
  padding: 12px 16px;
}
table { border-collapse: collapse; width: 100%; }
td, th {
  border: 1px solid #000;
  padding: 2px 5px;
  vertical-align: middle;
  font-size: 13px;
}
.no-border td, .no-border th { border: none; }
.header-title { font-size: 15px; font-weight: bold; text-align: center; }
.section-header {
  background: #c6efce;
  font-weight: bold;
  padding: 3px 6px;
  border: 1px solid #000;
  margin-top: 6px;
}
.sub-header {
  font-weight: bold;
  padding: 2px 5px;
  background: #f2f2f2;
}
.chk-cell { text-align: center; width: 36px; font-size: 15px; }
.label-cell { width: 180px; font-weight: bold; }
.val-cell { min-width: 80px; }
h2 { font-size: 14px; font-weight: bold; margin: 6px 0 3px; }
.sig-line { border-top: 1px solid #000; margin-top: 35px; padding-top: 3px; text-align: center; }
@page { size: A4 portrait; margin: 10mm; }
@media print { body { padding: 0; } }
`;

function headerBlock(machineInfo, data, logoBase64, sheetLabel) {
  const loc   = data.generalData?.location || machineInfo?.location_default || '';
  const isFp  = machineInfo?.type === 'fire_pump';
  const title = isFp ? 'INSPECTION REPORT OF FIRE PUMP' : 'INSPECTION REPORT OF GENERATOR';
  const logo  = logoBase64
    ? `<img src="data:image/jpeg;base64,${logoBase64}" style="height:52px">`
    : '';
  return `
  <table style="margin-bottom:8px;border:none">
    <tr>
      <td style="border:none;width:120px;vertical-align:top">${logo}</td>
      <td style="border:none;text-align:center;vertical-align:middle">
        <div style="font-size:13px">Electricity Generating Authority of Thailand</div>
        <div style="font-size:14px">การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย</div>
        <div style="font-size:16px;font-weight:bold">${title}</div>
        <div style="font-size:13px">สำนักงาน ไทรน้อย</div>
      </td>
      <td style="border:none;text-align:right;vertical-align:top;font-size:12px;white-space:nowrap">
        ${sheetLabel}
      </td>
    </tr>
  </table>`;
}

function generalDatas(machineInfo, data) {
  const g   = data.generalData || {};
  const isFp = machineInfo?.type === 'fire_pump';
  const stationNo = machineInfo?.label || '';
  return `
  <div style="border:1px solid #000;margin-bottom:6px">
    <table style="border:none">
      <tr>
        <td style="border:none;border-bottom:1px solid #000;font-weight:bold;background:#dce6f1" colspan="8">General Datas</td>
      </tr>
      <tr>
        <td class="label-cell">Location</td>
        <td colspan="2">${v(g.location || machineInfo?.location_default)}</td>
        <td class="label-cell">ชนิด</td><td>${isFp ? 'Vertical' : 'Standby'}</td>
        <td class="label-cell">Station No.</td>
        <td colspan="2">${stationNo}</td>
      </tr>
      <tr>
        <td class="label-cell">Model</td><td>${v(g.model || machineInfo?.model_default)}</td>
        <td class="label-cell">Serial-Number</td><td>${v(g.serialNumber || machineInfo?.serial_default)}</td>
        <td class="label-cell">MFG</td><td>${v(g.manufacturer || machineInfo?.mfg_default)}</td>
        <td class="label-cell">RPM Rating</td><td>${v(g.rpmRating || machineInfo?.rpm_rating_default)}</td>
      </tr>
      <tr>
        <td class="label-cell">Qut. Of Fuel Liquid</td>
        <td>( &nbsp; ) Gal &nbsp; ( ☑ ) Lit &nbsp; ( &nbsp; ) kg</td>
        <td class="label-cell">Fuel Level</td>
        <td>(Before) ${v(g.fuelBefore)} / (After) ${v(g.fuelAfter)} Liters</td>
        <td class="label-cell">ชั่วโมงการทำงาน</td>
        <td colspan="3">(Before) ${v(g.runningHoursBefore)} / (After) ${v(g.runningHoursAfter)} Hrs.</td>
      </tr>
      <tr>
        <td class="label-cell">ระยะเวลาที่เครื่องยนต์ทำงาน</td>
        <td>${v(g.runDurationMins)} mins.</td>
        <td class="label-cell">ความจุถังเชื้อเพลิง</td>
        <td>${isFp ? v(g.tankCapacity || 600) + ' Liters' : v(g.tankCapacity) + ' Liters'}</td>
        <td colspan="4"></td>
      </tr>
    </table>
  </div>`;
}

function preVisualTable(items, results, isFp) {
  const rows = items.map((item, i) => {
    const r = results[i] || {};
    return `<tr>
      <td style="text-align:center;width:28px">${i + 1}</td>
      <td>${item.text}</td>
      <td class="chk-cell">${passBox(r.result)}</td>
      <td class="chk-cell">${failBox(r.result)}</td>
      <td style="min-width:120px">${r.remark || ''}</td>
    </tr>`;
  }).join('');
  return `
  <table>
    <thead>
      <tr style="background:#f2f2f2">
        <th style="width:28px">#</th>
        <th>รายการตรวจสอบ</th>
        <th class="chk-cell">ผ่าน</th>
        <th class="chk-cell">ไม่ผ่าน</th>
        <th>หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function preRunTable(items, results) {
  const rows = items.map((item, i) => {
    const r = results[i] || {};
    return `<tr>
      <td style="text-align:center;width:28px">${i + 1}</td>
      <td>${item.text}</td>
      <td class="chk-cell">${normBox(r.result)}</td>
      <td class="chk-cell">${abnBox(r.result)}</td>
      <td class="chk-cell">${noneBox(r.result)}</td>
      <td style="min-width:120px">${r.remark || ''}</td>
    </tr>`;
  }).join('');
  return `
  <table>
    <thead>
      <tr style="background:#f2f2f2">
        <th style="width:28px">#</th>
        <th>รายการตรวจสอบ</th>
        <th class="chk-cell">ปกติ</th>
        <th class="chk-cell">ผิดปกติ</th>
        <th class="chk-cell">ไม่มี</th>
        <th>หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function measureTable(rows) {
  return `<table>${rows.map(([label, val]) =>
    `<tr><td style="width:280px">${label}</td><td>${val}</td></tr>`
  ).join('')}</table>`;
}

export function generateFpgReportHtml(data, machineInfo, logoBase64, approverSigBase64) {
  const isFp = machineInfo?.type === 'fire_pump';
  const tmpl = isFp ? fieldMap.firepump_template : fieldMap.generator_template;
  const items0 = tmpl?.sheet_visual_fields?.checklist_0_items || [];
  const items1 = tmpl?.sheet_data_fields?.checklist_1_items || [];

  const { preVisual = [], preRunVisual = [], readings = {}, testRun = {}, afterRun = {} } = data;

  const inspDate = data.inspectionDate
    ? new Date(data.inspectionDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '–';

  const conclusion = (afterRun.conclusionText?.trim())
    ? afterRun.conclusionText
    : (tmpl?.sheet_data_fields?.conclusion_default || []).join('\n');

  const measureRowsFp = [
    ['ความดันน้ำในระบบก่อนเดินเครื่อง (bar)', v(readings.engine_system_water_pressure)],
    ['แรงดันแบตเตอรี่ชุด 1 (V)', v(readings.battery_voltage_1)],
    ['แรงดันแบตเตอรี่ชุด 2 (V)', v(readings.battery_voltage_2)],
    ['แรงดัน Jockey Pump L1-L2 / L2-L3 / L1-L3 (V)',
      `${v(readings.jockeyVoltage?.L1L2)} / ${v(readings.jockeyVoltage?.L2L3)} / ${v(readings.jockeyVoltage?.L1L3)}`],
  ];
  const measureRowsGen = [
    ['แรงดันแบตเตอรี่ (V)', v(readings.battery_voltage)],
  ];

  const testRowsFp = [
    ['รอบเครื่องยนต์ (RPM)', v(testRun.rpm)],
    ['ความดันน้ำมันเครื่อง (PSI)', v(testRun.oil_pressure)],
    ['ความดันน้ำระบายความร้อน (PSI)', v(testRun.cooling_water_pressure)],
    ['อุณหภูมิน้ำหล่อเย็น @ 10 นาที (°C)', v(testRun.coolant_temp_10min)],
    ['ความดันน้ำในระบบขณะเดิน (PSI)', v(testRun.system_water_pressure)],
    ['อัตราการสิ้นเปลืองน้ำมัน (L/run)', v(testRun.fuel_consumption_per_run)],
  ];
  const testRowsGen = [
    ['รอบเครื่องยนต์ (RPM)', v(testRun.rpm)],
    ['ความดันน้ำมันเครื่อง (PSI)', v(testRun.oil_pressure)],
    ['อุณหภูมิน้ำหล่อเย็น (°C)', v(testRun.coolant_temp)],
    ['แรงดันไฟฟ้า L1-L2 / L2-L3 / L1-L3 (V)',
      `${v(testRun.voltageL1L2)} / ${v(testRun.voltageL2L3)} / ${v(testRun.voltageL1L3)}`],
    ['กระแสไฟฟ้า L1 / L2 / L3 (A)',
      `${v(testRun.currentL1)} / ${v(testRun.currentL2)} / ${v(testRun.currentL3)}`],
    ['ความถี่ (Hz)', v(testRun.frequency)],
    ['แรงดันชาร์จแบตเตอรี่ (V)', v(testRun.chargeVoltage)],
  ];

  const approverImg = approverSigBase64
    ? `<img src="data:image/png;base64,${approverSigBase64}" style="height:40px;display:block;margin:0 auto">`
    : '';

  const subHeader = isFp ? 'ห้องเครื่องสูบน้ำดับเพลิง' : 'ห้องเครื่องกำเนิดไฟฟ้าสำรอง';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>${CSS}</style>
</head>
<body>

  ${headerBlock(machineInfo, data, logoBase64, 'Sheet 1/2')}

  ${generalDatas(machineInfo, data)}

  <div class="section-header">0.Pre Visual Inspection</div>
  <div class="sub-header">${subHeader}</div>
  <div style="margin-bottom:6px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
      <thead>
        <tr style="background:#f2f2f2">
          <th colspan="2" style="text-align:center">รายการตรวจสอบ</th>
          <th colspan="2" style="text-align:center">ผลการตรวจสอบ</th>
          <th rowspan="2" style="text-align:center">หมายเหตุ</th>
        </tr>
        <tr style="background:#f2f2f2">
          <th style="width:28px">#</th><th></th>
          <th class="chk-cell">ผ่าน</th>
          <th class="chk-cell">ไม่ผ่าน</th>
        </tr>
      </thead>
      <tbody>
        ${items0.map((item, i) => {
          const r = (preVisual[i] || {});
          return `<tr>
            <td style="text-align:center;width:28px">${i + 1}</td>
            <td>${item.text}</td>
            <td class="chk-cell">${passBox(r.result)}</td>
            <td class="chk-cell">${failBox(r.result)}</td>
            <td>${r.remark || ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Page break before sheet 2 -->
  <div style="page-break-before:always"></div>

  ${headerBlock(machineInfo, data, logoBase64, 'Sheet 2/2')}

  <div class="section-header">1.Pre-Run Visual Inspection</div>
  <div class="sub-header">${isFp ? 'เครื่องสูบน้ำดับเพลิง' : 'เครื่องกำเนิดไฟฟ้า'}</div>
  <div style="margin-bottom:6px">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f2f2f2">
          <th style="width:28px">#</th><th>รายการตรวจสอบ</th>
          <th class="chk-cell">ปกติ</th>
          <th class="chk-cell">ผิดปกติ</th>
          <th class="chk-cell">ไม่มี</th>
          <th>หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${items1.map((item, i) => {
          const r = (preRunVisual[i] || {});
          return `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${item.text}</td>
            <td class="chk-cell">${normBox(r.result)}</td>
            <td class="chk-cell">${abnBox(r.result)}</td>
            <td class="chk-cell">${noneBox(r.result)}</td>
            <td>${r.remark || ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section-header">2.ค่าที่บันทึกได้ก่อนเดินเครื่อง</div>
  <div style="margin-bottom:6px">${measureTable(isFp ? measureRowsFp : measureRowsGen)}</div>

  <div class="section-header">3.ค่าที่บันทึกได้ขณะเดินเครื่อง (Test Run)</div>
  <div style="margin-bottom:6px">${measureTable(isFp ? testRowsFp : testRowsGen)}</div>

  <div class="section-header">4.หมายเหตุ / ข้อสังเกต</div>
  <div style="border:1px solid #000;padding:6px;min-height:48px;white-space:pre-line;margin-bottom:6px">${afterRun.comment || ''}</div>

  <div class="section-header">5.สรุปผลการตรวจสอบ</div>
  <div style="border:1px solid #000;padding:6px;min-height:36px;white-space:pre-line;margin-bottom:20px">${conclusion}</div>

  <table style="border:none;margin-top:8px">
    <tr>
      <td style="border:none;width:50%;text-align:center;padding-top:10px">
        <div style="border-top:1px solid #000;padding-top:4px">
          <div>ผู้ตรวจสอบ</div>
          <div style="font-weight:bold;margin:4px 0">${afterRun.inspectedBy || '( ................................ )'}</div>
          <div>วันที่ ${inspDate}</div>
        </div>
      </td>
      <td style="border:none;width:50%;text-align:center;padding-top:10px">
        <div style="border-top:1px solid #000;padding-top:4px">
          ${approverImg}
          <div>ผู้อนุมัติ</div>
          <div style="font-weight:bold;margin:4px 0">${afterRun.approvedBy || '( ................................ )'}</div>
          <div>วันที่ ${inspDate}</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
