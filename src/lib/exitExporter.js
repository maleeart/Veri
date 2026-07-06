const ExcelJS = require('exceljs');
const path = require('path');

const TEMPLATE = path.join(process.cwd(), 'templates', 'Exit Sign_report_template.xlsx');
const SHEET = 'Exit1-2';

const SIGN_COL = { exit: 'C', up: 'D', right: 'E', left: 'F', double: 'G' };

async function generateExitReport(type, data) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) throw new Error(`ไม่พบ sheet: ${SHEET}`);

  const g = data.general || {};

  // General data
  ws.getCell('J6').value = g.inspectionDate || data.date || '';
  ws.getCell('B7').value = g.building  || '';
  ws.getCell('E7').value = g.floor     || '';
  ws.getCell('J7').value = g.inspector || '';
  ws.getCell('B8').value = g.model     || '';
  ws.getCell('E8').value = g.serial    || '';
  ws.getCell('J8').value = g.mfg       || '';

  // Device rows (rows 11–40, max 30)
  const devices = (data.devices || []).slice(0, 30);
  devices.forEach((dev, i) => {
    const row = 11 + i;
    ws.getCell(`A${row}`).value = dev.id       || '';
    ws.getCell(`B${row}`).value = dev.location || '';

    // signType → ตีสัญลักษณ์ในคอลัมน์ที่ตรง
    const col = SIGN_COL[dev.signType];
    if (col) ws.getCell(`${col}${row}`).value = '✓';

    ws.getCell(`H${row}`).value = dev.letterLight === 'normal' ? 'ปกติ' : dev.letterLight === 'abnormal' ? 'ผิดปกติ' : '';
    ws.getCell(`I${row}`).value = dev.statusLight === 'normal' ? 'ปกติ' : dev.statusLight === 'abnormal' ? 'ผิดปกติ' : '';
    if (dev.remarks) ws.getCell(`J${row}`).value = dev.remarks;
  });

  return wb.xlsx.writeBuffer();
}

module.exports = { generateExitReport };
