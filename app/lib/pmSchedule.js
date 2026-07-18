/**
 * pmSchedule.js — รายการ PM (รอบเปลี่ยน + ตรวจใหญ่รายปี) สำหรับ fire pump / generator
 *
 * สถานะคิดจาก "เวลา" อย่างเดียว — fire pump/gen เดินโหลดน้อย รอบเวลาถึงก่อนชั่วโมงเสมอ
 * ponytail: intervalDays เป็นค่ามาตรฐาน แก้ที่นี่ที่เดียวถ้าต้องปรับรอบ
 *
 * forType: เครื่องที่ใช้รายการนี้ ('fire_pump' | 'generator')
 * group:   'change' = รอบเปลี่ยนของเหลว/อะไหล่ · 'annual' = ตรวจใหญ่รายปี
 */

const D = { m6: 182, y1: 365, y2: 730, y3: 1095, y4: 1460 };

export const PM_ITEMS = [
  // ── A. รอบเปลี่ยน ─────────────────────────────────────────────
  { key: 'engine_oil',   label: 'น้ำมันเครื่อง + ไส้กรองน้ำมันเครื่อง', intervalDays: D.m6, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'fuel_filter',  label: 'ไส้กรองเชื้อเพลิง',                     intervalDays: D.y1, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'air_filter',   label: 'ไส้กรองอากาศ',                         intervalDays: D.y1, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'coolant',      label: 'น้ำหล่อเย็น / คูลแลนท์',               intervalDays: D.y2, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'belt',         label: 'สายพาน',                               intervalDays: D.y2, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'hoses',        label: 'ท่อยาง (hoses)',                       intervalDays: D.y4, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'battery',      label: 'แบตเตอรี่',                            intervalDays: D.y3, group: 'change', forType: ['fire_pump', 'generator'] },
  { key: 'fuel_tank',    label: 'ล้างถัง / ระบายน้ำ-ตะกอนเชื้อเพลิง',   intervalDays: D.y1, group: 'change', forType: ['fire_pump', 'generator'] },

  // ── C. ตรวจใหญ่รายปี ──────────────────────────────────────────
  { key: 'flow_test',    label: 'ทดสอบ Flow Test (NFPA 25)',           intervalDays: D.y1, group: 'annual', forType: ['fire_pump'] },
  { key: 'bank_test',    label: 'Full-load Bank Test',                  intervalDays: D.y1, group: 'annual', forType: ['generator'] },
  { key: 'valve_lash',   label: 'ปรับตั้ง valve lash / ตรวจหัวฉีด',     intervalDays: D.y1, group: 'annual', forType: ['fire_pump', 'generator'] },
  { key: 'coolant_flush',label: 'ฟลัช / ล้างระบบหล่อเย็น',              intervalDays: D.y1, group: 'annual', forType: ['fire_pump', 'generator'] },
  { key: 'alignment',    label: 'ตรวจ alignment ปั๊ม–เครื่องยนต์',      intervalDays: D.y1, group: 'annual', forType: ['fire_pump'] },
];

export const GROUP_LABELS = { change: 'รอบเปลี่ยนของเหลว/อะไหล่', annual: 'ตรวจใหญ่รายปี' };

const DUE_AHEAD_DAYS = 30; // เตือน "ใกล้ครบ" ล่วงหน้า

export function itemsForType(machineType) {
  return PM_ITEMS.filter(it => it.forType.includes(machineType));
}

export function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

/** 'never' | 'overdue' | 'due' | 'ok' — คิดจากเวลาอย่างเดียว */
export function pmStatus(lastDate, intervalDays) {
  if (!lastDate) return 'never';
  const days = daysSince(lastDate);
  if (days > intervalDays) return 'overdue';
  if (days > intervalDays - DUE_AHEAD_DAYS) return 'due';
  return 'ok';
}

/** วันครบกำหนดถัดไป (YYYY-MM-DD) หรือ null ถ้ายังไม่เคยทำ */
export function nextDue(lastDate, intervalDays) {
  if (!lastDate) return null;
  const d = new Date(lastDate);
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().slice(0, 10);
}
