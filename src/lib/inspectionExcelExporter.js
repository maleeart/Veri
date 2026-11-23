/**
 * inspectionExcelExporter.js
 * Generates formatted EGAT Inspection Sheets (.xlsx) using ExcelJS
 * Supports both Filled Inspection Records and Blank Printable Forms
 */

export async function exportInspectionToExcel({ template, record, isBlank = false, settings }) {
  if (!template) throw new Error('ไม่พบข้อมูลแบบฟอร์ม');

  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Veri Facility Inspection';
  wb.lastModifiedBy = record?.inspector?.name || settings?.surveyor?.name || 'Veri System';
  wb.created = new Date();
  wb.modified = new Date();

  const sheetName = (template.name || 'Inspection Sheet').slice(0, 31).replace(/[*?:/\\\[\]]/g, '-');
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  const columns = template.columns || [];
  const colCount = Math.max(columns.length, 5);

  // Set column widths
  columns.forEach((col, idx) => {
    const colNum = idx + 1;
    let width = 16;
    if (col.type === 'number') width = 14;
    if (col.type === 'status') width = 15;
    if (col.type === 'photo') width = 16;
    if (col.name.includes('ลำดับ')) width = 8;
    if (col.name.includes('รายการ') || col.name.includes('หัวข้อ')) width = 30;
    if (col.name.includes('หมายเหตุ') || col.name.includes('การแก้ไข')) width = 24;
    ws.getColumn(colNum).width = width;
  });

  let curRow = 1;

  // Row 1: Company Header Title
  const compTitle = settings?.header?.companyTitle || 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)';
  const titleRow = ws.getRow(curRow);
  titleRow.getCell(1).value = compTitle;
  titleRow.getCell(1).font = { name: 'Angsana New', size: 16, bold: true, color: { argb: 'FF0F2E5A' } };
  ws.mergeCells(curRow, 1, curRow, colCount);
  curRow++;

  // Row 2: Department Subtitle
  const compSub = settings?.header?.companySubtitle || template.department || 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)';
  const subRow = ws.getRow(curRow);
  subRow.getCell(1).value = compSub;
  subRow.getCell(1).font = { name: 'Angsana New', size: 13, bold: true, color: { argb: 'FF475569' } };
  ws.mergeCells(curRow, 1, curRow, colCount);
  curRow++;

  // Row 3: Form Title Banner
  const formRow = ws.getRow(curRow);
  formRow.getCell(1).value = `${template.name} ${isBlank ? '(ฟอร์มเปล่าสำหรับพิมพ์บันทึก)' : ''}`;
  formRow.getCell(1).font = { name: 'Angsana New', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  formRow.getCell(1).alignment = { vertical: 'middle' };
  ws.mergeCells(curRow, 1, curRow, colCount);
  curRow++;

  // Row 4: Empty separator
  curRow++;

  // Meta Info Box (Rows 5-6)
  const refCode = record?.recordNo || template.code || '-';
  const inspectDate = record?.inspectionDate || (isBlank ? '........../........../..........' : new Date().toLocaleDateString('th-TH'));
  const location = record?.location || (isBlank ? '....................................................................' : '-');
  const inspectorName = record?.inspector?.name || settings?.surveyor?.name || (isBlank ? '....................................................................' : '-');

  const meta1 = ws.getRow(curRow);
  meta1.getCell(1).value = `รหัสเอกสาร / เลขที่: ${refCode}`;
  meta1.getCell(1).font = { name: 'Angsana New', size: 12, bold: true };
  meta1.getCell(Math.floor(colCount / 2) + 1).value = `วันที่ตรวจเช็ค: ${inspectDate}`;
  meta1.getCell(Math.floor(colCount / 2) + 1).font = { name: 'Angsana New', size: 12, bold: true };
  curRow++;

  const meta2 = ws.getRow(curRow);
  meta2.getCell(1).value = `สถานที่ / อาคาร / จุดติดตั้ง: ${location}`;
  meta2.getCell(1).font = { name: 'Angsana New', size: 12 };
  meta2.getCell(Math.floor(colCount / 2) + 1).value = `ผู้ตรวจเช็ค: ${inspectorName}`;
  meta2.getCell(Math.floor(colCount / 2) + 1).font = { name: 'Angsana New', size: 12 };
  curRow++;

  // Empty separator before table
  curRow++;

  // Table Header
  const headerRow = ws.getRow(curRow);
  headerRow.height = 28;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.name;
    cell.font = { name: 'Angsana New', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2E5A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F2E5A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F2E5A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  curRow++;

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // Table Data Rows
  if (isBlank) {
    // Generate 15 clean empty numbered rows
    const blankRowCount = 15;
    for (let r = 0; r < blankRowCount; r++) {
      const dataRow = ws.getRow(curRow);
      dataRow.height = 24;
      columns.forEach((col, cIdx) => {
        const cell = dataRow.getCell(cIdx + 1);
        if (cIdx === 0 && col.name.includes('ลำดับ')) {
          cell.value = r + 1;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = '';
          cell.alignment = { vertical: 'middle', horizontal: col.type === 'number' ? 'right' : 'left' };
        }
        cell.font = { name: 'Angsana New', size: 12 };
        cell.border = thinBorder;
        if (r % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
      curRow++;
    }
  } else {
    // Filled Records
    const rows = record?.rows || template.defaultRows || [];
    rows.forEach((rowData, rIdx) => {
      const dataRow = ws.getRow(curRow);
      dataRow.height = 24;
      columns.forEach((col, cIdx) => {
        const cell = dataRow.getCell(cIdx + 1);
        let val = rowData[col.id];

        if (col.type === 'photo') {
          val = val ? '📷 มีรูปถ่ายแนบ' : '-';
        } else if (val === undefined || val === null) {
          val = cIdx === 0 ? rIdx + 1 : '-';
        }

        cell.value = val;
        cell.font = { name: 'Angsana New', size: 12 };
        cell.border = thinBorder;

        // Alignment & Status Colors
        if (col.type === 'number') {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (col.type === 'status') {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          const sVal = String(val);
          if (sVal.includes('ปกติ') && !sVal.includes('ผิด')) {
            cell.font = { name: 'Angsana New', size: 12, bold: true, color: { argb: 'FF16A34A' } };
          } else if (sVal.includes('ผิด') || sVal.includes('ชำรุด') || sVal.includes('ปรับปรุง')) {
            cell.font = { name: 'Angsana New', size: 12, bold: true, color: { argb: 'FFDC2626' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          }
        } else if (col.name.includes('ลำดับ')) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }

        if (rIdx % 2 === 1 && !cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
      curRow++;
    });
  }

  // Row spacing
  curRow++;

  // Summary & Remarks Box
  const summaryStatus = record?.summaryStatus || (isBlank ? '[  ] ปกติทุกรายการ      [  ] พบจุดบกพร่อง/ต้องแก้ไข' : 'ปกติทุกรายการ');
  const sumRow = ws.getRow(curRow);
  sumRow.getCell(1).value = `สรุปผลการตรวจสอบภาพรวม: ${summaryStatus}`;
  sumRow.getCell(1).font = { name: 'Angsana New', size: 12.5, bold: true, color: { argb: 'FF0F2E5A' } };
  ws.mergeCells(curRow, 1, curRow, colCount);
  curRow++;

  const notes = record?.notes || (isBlank ? '................................................................................................................................................................' : '-');
  const noteRow = ws.getRow(curRow);
  noteRow.getCell(1).value = `หมายเหตุและข้อเสนอแนะ: ${notes}`;
  noteRow.getCell(1).font = { name: 'Angsana New', size: 12, italic: true };
  ws.mergeCells(curRow, 1, curRow, colCount);
  curRow += 2;

  // Sign-off Box at bottom
  const sigRow1 = ws.getRow(curRow);
  const startCol = Math.max(colCount - 2, 2);
  sigRow1.getCell(startCol).value = 'ลงชื่อ ................................................................ ผู้สำรวจ/บันทึก';
  sigRow1.getCell(startCol).font = { name: 'Angsana New', size: 12.5, bold: true };
  curRow++;

  const sigName = record?.inspector?.name || settings?.surveyor?.name || '................................................................';
  const sigRow2 = ws.getRow(curRow);
  sigRow2.getCell(startCol).value = `(  ${sigName}  )`;
  sigRow2.getCell(startCol).font = { name: 'Angsana New', size: 12 };
  curRow++;

  const sigRole = record?.inspector?.role || settings?.surveyor?.role || '................................................................';
  const sigRow3 = ws.getRow(curRow);
  sigRow3.getCell(startCol).value = `ตำแหน่ง: ${sigRole}`;
  sigRow3.getCell(startCol).font = { name: 'Angsana New', size: 12 };
  curRow++;

  const sigRow4 = ws.getRow(curRow);
  sigRow4.getCell(startCol).value = `วันที่: ${inspectDate}`;
  sigRow4.getCell(startCol).font = { name: 'Angsana New', size: 12 };

  // Write to Buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${(record?.recordNo || template.code || 'Inspection').replace(/[/\\:*?"<>|]/g, '-')}_${isBlank ? 'Blank' : 'Data'}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return { ok: true, fileName };
}
