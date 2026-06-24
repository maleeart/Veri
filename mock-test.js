const fs = require('fs');
const path = require('path');
const { generateExcelReport } = require('./src/lib/excelExporter');

// ชุดข้อมูลทดสอบ (Dummy JSON) — ครอบคลุมทุกฟิลด์ของ fire-pump-1 ตาม field-map.json
const dummyReportData = {
  machineId: 'fire-pump-1',
  inspectionDate: '2026-06-20',

  generalData: {
    location: 'อาคาร ต.0026 (ทดสอบ)',
    model: 'TEST-MODEL-99',
    serialNumber: 'TEST-SN-12345',
    fuelBefore: 400,
    fuelAfter: 385,
    runDurationMins: 30,
    runningHoursBefore: 135.8,
    runningHoursAfter: 136.4,
  },

  // 0. Pre Visual Inspection — ต้องมี 13 รายการตามลำดับ field-map.json (checklist_0_pre_visual.items)
  preVisual: [
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'fail', remark: 'พบเศษวัสดุกีดขวางทางเข้าหน้าตู้ (ทดสอบ)' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: 'อยู่ห่างอาคารมากกว่า 15.3 เมตร' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
    { result: 'pass', remark: '' },
  ],

  // 1. Pre-Run Visual Inspection — 13 รายการตาม checklist_1_prerun_visual.items
  preRunVisual: [
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'abnormal', remark: 'สายพานเริ่มมีรอยกรอบแตก (ทดสอบ)' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'normal', remark: '' },
    { result: 'none', remark: '' },
    { result: 'normal', remark: '' },
  ],

  // ค่าที่บันทึกได้ — Engine/Battery/Jockey Pump
  readings: {
    engine_system_water_pressure: 0,
    battery_voltage_1: 13.1,
    battery_voltage_2: 13.1,
    cca: {
      battery_voltage_1: { valueText: 924, maxText: '/   924', dateText: 'ว/ด/ป  06/07/68' },
      battery_voltage_2: { valueText: 924, maxText: '/   924', dateText: 'ว/ด/ป  06/07/68' },
    },
    jockeyVoltage: { L1L2: 395.4, L2L3: 393.5, L1L3: 396.1 },
  },

  // 2. Test-Run
  testRun: {
    rpm: 2400,
    oil_pressure: 54,
    cooling_water_pressure: 20,
    coolant_temp_10min: 50,
    system_water_pressure: 156,
    fuel_consumption_per_run: 5,
  },

  // 3. After-Run + Conclusion + ลงชื่อ
  afterRun: {
    comment: 'น้ำมันหล่อลื่นระบบเกียร์รั่วซึม , กรองน้ำมันโซล่ารั่วซึม (ทดสอบ)',
    conclusionText: '', // ปล่อยว่างเพื่อทดสอบว่า fallback ไปใช้ default text จาก field-map.json
    jockeyAmp: { L1: 3.84, L2: 3.95, L3: 3.84 },
    inspectedBy: 'ทดสอบ ผู้ตรวจ',
    approvedBy: 'ทดสอบ ผู้อนุมัติ',
    approvedDate: '2026-06-20',
  },
};

async function runTest() {
  try {
    const templatePath = path.join(__dirname, 'templates', 'Template_FPG.xlsx');
    const outputPath = path.join(__dirname, 'OUTPUT_TEST_RESULT.xlsx');

    if (!fs.existsSync(templatePath)) {
      console.log('⚠️ ไม่พบไฟล์เทมเพลตที่ templates/Template_FPG.xlsx');
      return;
    }

    console.log('⏳ กำลังแปลงข้อมูล JSON และเขียนลงพิกัดเซลล์ Excel...');
    const buffer = await generateExcelReport(dummyReportData, templatePath);

    fs.writeFileSync(outputPath, buffer);
    console.log(`🎉 สำเร็จ! ไฟล์ทดสอบ: ${outputPath}`);
  } catch (error) {
    console.error('❌ รันไม่สำเร็จ:', error);
    process.exitCode = 1;
  }
}

runTest();
