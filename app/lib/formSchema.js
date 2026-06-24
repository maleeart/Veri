/**
 * formSchema.js — สร้าง form data structure เปล่าจาก field-map.json
 * v2: ปรับให้ตรงกับ template ใหม่ที่มีช่องสีเหลือง
 */

export function getMachineTemplate(fieldMap, machineId) {
  const machine = fieldMap.machines.find(m => m.id === machineId);
  if (!machine) return null;
  const isGen = machine.type === 'generator';
  return {
    machine,
    tpl: isGen ? fieldMap.generator_template : fieldMap.fire_pump_template,
    isGen,
  };
}

export function buildEmptyFormData(fieldMap, machineId, inspectionDate) {
  const result = getMachineTemplate(fieldMap, machineId);
  if (!result) return null;
  const { machine, tpl, isGen } = result;

  const preVisual = (tpl.sheet_visual_fields.checklist_0_items || []).map(() => ({
    result: null, // 'pass' | 'fail'
    note: '',
  }));

  const preRunVisual = (tpl.sheet_data_fields.checklist_1_items || []).map(() => ({
    result: null, // 'normal' | 'abnormal' | 'na'
    note: '',
  }));

  return {
    machineId,
    inspectionDate: inspectionDate || new Date().toISOString().slice(0, 10),
    generalData: {
      // model/serial/location ไม่ต้องกรอก — ดึงจาก field-map defaults
      fuelBefore: '',
      runningHoursBefore: '',
      runDurationMins: '',
      ...(isGen ? { runCount: '' } : {}),
    },
    preVisual,
    preRunVisual,
    readings: {
      ...(isGen ? {
        batteryVoltage: '',
        electrical: {
          offload_L1N: '', offload_L2N: '', offload_L3N: '',
          offload_L1L2: '', offload_L2L3: '', offload_L1L3: '',
          current_L1: '', current_L2: '', current_L3: '',
        },
      } : {
        waterPressure: '',
        battery1Voltage: '',
        battery2Voltage: '',
        jockeyPump: {
          voltageL1L2: '', voltageL2L3: '', voltageL1L3: '',
          currentL1: '', currentL2: '', currentL3: '',
        },
      }),
    },
    testRun: {
      rpm: '',
      oilPressure: '',
      coolantTemp: '',
      fuelConsumption: '',
      ...(isGen ? {
        chargeVoltage: '',
        frequency: '',
        systemPressure: '',
      } : {
        coolingPressure: '',
        systemPressure: '',
      }),
    },
    afterRun: {
      fuelAfter: '',
      runningHoursAfter: '',
      comment: '',
      conclusionText: '',
      inspectedBy: '',
      approvedBy: '',
      approvedDate: '',
      inspectorSignature: null,
      approverSignature: null,
    },
  };
}

// ค่า label สำหรับ checklist ToggleGroup
export const RESULT_LABELS_2WAY = { pass: 'ผ่าน', fail: 'ไม่ผ่าน' };
export const RESULT_LABELS_3WAY = { normal: 'ปกติ', abnormal: 'ผิดปกติ', na: 'ไม่มี' };
