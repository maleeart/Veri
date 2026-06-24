const fs = require('fs');
const path = require('path');
const { generateExcelReport } = require('./src/lib/excelExporter');

// ทดสอบเฉพาะจุดที่เสี่ยงพังคือ sheet name ที่มี trailing space ('FIRE PUMP#2-1 ')
// และยืนยันว่า general fields เขียนถูกตำแหน่งเหมือน fire-pump-1
const dummyData = {
  machineId: 'fire-pump-2',
  inspectionDate: '2026-06-20',
  generalData: {
    location: 'อาคาร ทดสอบ FP2',
    model: 'FP2-MODEL',
    serialNumber: 'FP2-SERIAL',
    fuelBefore: 300,
    fuelAfter: 290,
    runDurationMins: 30,
    runningHoursBefore: 100.0,
    runningHoursAfter: 100.5,
  },
  preVisual: Array.from({ length: 13 }, () => ({ result: 'pass' })),
  preRunVisual: Array.from({ length: 13 }, () => ({ result: 'normal' })),
  readings: {
    engine_system_water_pressure: 0,
    battery_voltage_1: 13.0,
    battery_voltage_2: 13.0,
    jockeyVoltage: { L1L2: 390, L2L3: 391, L1L3: 392 },
  },
  testRun: {
    rpm: 2300, oil_pressure: 50, cooling_water_pressure: 18,
    coolant_temp_10min: 48, system_water_pressure: 150, fuel_consumption_per_run: 4,
  },
  afterRun: {
    comment: 'ทดสอบ FP2',
    inspectedBy: 'ทดสอบ FP2',
  },
};

async function runTest() {
  const templatePath = path.join(__dirname, 'templates', 'Template_FPG.xlsx');
  const outputPath = path.join(__dirname, 'OUTPUT_TEST_FP2.xlsx');
  try {
    const buffer = await generateExcelReport(dummyData, templatePath);
    fs.writeFileSync(outputPath, buffer);
    console.log('🎉 fire-pump-2 สำเร็จ:', outputPath);
  } catch (error) {
    console.error('❌ fire-pump-2 ล้มเหลว:', error.message);
    process.exitCode = 1;
  }
}
runTest();
