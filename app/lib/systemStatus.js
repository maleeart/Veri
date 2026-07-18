/**
 * systemStatus.js — สถานะ PM ราย "ระบบ" (Emergency/Smoke/Exit ต่ออาคาร, FPG/Meter รายรอบ)
 * แยกออกมาจากที่เคย inline ซ้ำในหลายหน้า เพื่อให้ /pm ใช้ซ้ำได้
 * ponytail: admin/page.js และ page.js ยังมี copy เดิมอยู่ — ควรรวมมาใช้ที่นี่ทีหลัง
 */

export const BUILDINGS = [
  'ท.0006','ท.0007','ท.0008','ท.0009','ท.0010',
  'ท.0011','ท.0012','ท.0014','ท.0015','ท.0016',
  'ท.0017','ท.0018','ท.0019','ท.0020','ท.0022',
  'ท.0023','ท.0026','ท.0027','ท.0028','ท.0029',
  'ต.0017','ต.0019','ต.0025','ต.0026','ต.0031','ต.0033',
];

export const FREQ_MONTHS = 3;            // smoke/emergency/exit: ทุก 3 เดือน
export const FREQ_DAYS = FREQ_MONTHS * 30;
export const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

export function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function lastDoneByBuilding(dates, type) {
  const map = {};
  for (const d of (dates || [])) {
    if (d.type !== type || !d.building) continue;
    if (!map[d.building] || d.date > map[d.building]) map[d.building] = d.date;
  }
  return map;
}

export function getStatus(lastDate) {
  if (!lastDate) return 'never';
  const days = daysSince(lastDate);
  if (days > FREQ_DAYS) return 'overdue';
  if (days > FREQ_DAYS - 14) return 'due';
  return 'ok';
}

/** สรุปจำนวนอาคารแต่ละสถานะ สำหรับ type (emergency/smoke/exit) */
export function pmSummary(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const c = { overdue: 0, due: 0, never: 0, ok: 0 };
  for (const b of BUILDINGS) c[getStatus(byB[b])]++;
  return c;
}

export function lastSaturdayISO() {
  const d = new Date();
  const daysBack = d.getDay() === 6 ? 0 : d.getDay() + 1;
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

export function isoWeekOf(d) {
  const thu = new Date(d);
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function currentISOWeek() { return isoWeekOf(new Date()); }
export function prevISOWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return isoWeekOf(d);
}
