const fs = require('fs');
const path = require('path');
const { generateExcelReport } = require('./src/lib/excelExporter');

const dummyGenData = {
  machineId: 'generator-1',
  inspectionDate: '2026-06-20',

  generalData: {
    location: 'อาคาร ท.0019 (ทดสอบ)',
    stationNo: 'GENERATOR#1',
    model: '6LTAA8.9-G2',
    serialNumber: '78547960',
    mfg: 'Dongfeng Cummins',
    rpmRating: 1500,
    fuelTankCapacity: 165,
    runDurationMins: 5,
    runCount: 305,
    runningHoursBefore: '45:20',
    runningHoursAfter: '45:25',
  },

  preVisual: [
    { result: 'pass' }, { result: 'pass' }, { result: 'pass' }, { result: 'pass' },
    { result: 'pass' }, { result: 'pass' }, { result: 'pass' }, { result: 'pass' },
    { result: 'pass' }, { result: 'pass' }, { result: 'pass' }, { result: 'pass' },
    { result: 'pass' }, { result: 'pass' }, { result: 'pass' }, { result: 'pass' },
  ],

  preRunVisual: [
    { result: 'normal' }, { result: 'normal' }, { result: 'normal' }, { result: 'normal' },
    { result: 'normal' }, { result: 'normal' }, { result: 'normal' }, { result: 'normal' },
    { result: 'normal' }, { result: 'normal' }, { result: 'normal' },
  ],

  readings: {
    battery_voltage: 27.0,
    cca: {
      battery_voltage: { valueText: '658, 615', maxText: '/ 812', dateText: 'ว/ด/ป..25.../….10..../….66......' },
    },
  },

  testRun: {
    rpm: 1500,
    oil_pressure: 82,
    battery_charge_voltage: 28.4,
    coolant_temp_10min: 39,
    frequency: 49.9,
    fuel_consumption_per_run: 2,
    electricalData: {
      offLoad: {
        volt: { L1N: 229, L2N: 229, L3N: 229, L1L2: 397, L2L3: 397, L1L3: 397 },
        amp: { L1: null, L2: null, L3: null },
      },
      onLoad: {
        volt: { L1N: null, L2N: null, L3N: null, L1L2: null, L2L3: null, L1L3: null },
        amp: { L1: null, L2: null, L3: null },
      },
    },
  },

  afterRun: {
    comment: 'สตาร์ทครั้งที่ 306 (ทดสอบ)',
    conclusionText: '',
    inspectedBy: 'ทดสอบ ผู้ตรวจ',
    approvedBy: 'ทดสอบ ผู้อนุมัติ',
    approvedDate: '2026-06-20',
  },
};

async function runTest() {
  try {
    const templatePath = path.join(__dirname, 'templates', 'Template_FPG.xlsx');
    const outputPath = path.join(__dirname, 'OUTPUT_TEST_GEN.xlsx');

    console.log('⏳ ทดสอบ generator-1 ...');
    const buffer = await generateExcelReport(dummyGenData, templatePath);
    fs.writeFileSync(outputPath, buffer);
    console.log(`🎉 สำเร็จ! ไฟล์ทดสอบ: ${outputPath}`);
  } catch (error) {
    console.error('❌ รันไม่สำเร็จ:', error);
    process.exitCode = 1;
  }
}

runTest();
