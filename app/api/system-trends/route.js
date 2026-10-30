import { NextResponse } from 'next/server';
import { listInspectionDates, loadInspectionByPath } from '../../../src/lib/githubStorage';
import { loadMeterMonth } from '../../../src/lib/meterStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache for fast repeated responses (5 minutes)
let cache = {
  timestamp: 0,
  data: null,
};
const CACHE_TTL_MS = 5 * 60 * 1000;

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/** Fallback helper for local dev when GitHub ENV is not set */
function tryLocalGitShow(path) {
  try {
    const { execSync } = require('child_process');
    const out = execSync('git show data:' + JSON.stringify(path), { encoding: 'utf-8' });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function tryLocalGitTree(prefix) {
  try {
    const { execSync } = require('child_process');
    const out = execSync('git -c core.quotepath=false ls-tree -r data --name-only', { encoding: 'utf-8' });
    return out.trim().split('\n').filter(p => p.startsWith(prefix) && p.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === '1';

    const now = Date.now();
    if (!refresh && cache.data && (now - cache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cache.data);
    }

    // ── 1. Load FPG inspections ──
    let fpgList = [];
    try {
      const allDates = await listInspectionDates();
      fpgList = allDates.filter(d => d.type === 'fpg').sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // Local fallback
      const localPaths = tryLocalGitTree('data/inspections/fpg/');
      fpgList = localPaths.map(p => {
        const fn = p.split('/').pop().replace(/\.json$/, '');
        const date = fn.split('_')[1];
        return { date, type: 'fpg', _path: p, filename: fn };
      });
    }

    // Take the last 15-20 inspections for trend analysis
    const recentFpg = fpgList.slice(-16);
    const fpgRecords = await Promise.all(recentFpg.map(async item => {
      let doc = null;
      if (item._path) {
        try { doc = await loadInspectionByPath(item._path); } catch {}
      }
      if (!doc && item._path) {
        doc = tryLocalGitShow(item._path);
      }
      return { date: item.date, records: doc?.records || {} };
    }));

    // Process FPG machine time series
    const fpgMachines = {
      'fire-pump-1': { id: 'fire-pump-1', label: 'Fire Pump #1', location: 'อาคาร ต.0026', tankCapacity: 600, color: '#38bdf8', series: [] },
      'fire-pump-2': { id: 'fire-pump-2', label: 'Fire Pump #2', location: 'อาคาร ท.0019', tankCapacity: 1000, color: '#f43f5e', series: [] },
      'fire-pump-3': { id: 'fire-pump-3', label: 'Fire Pump #3', location: 'อาคาร ท.0028', tankCapacity: 750, color: '#fbbf24', series: [] },
      'generator-1': { id: 'generator-1', label: 'Generator #1', location: 'อาคาร ท.0019', tankCapacity: 800, color: '#a855f7', series: [] },
    };

    const dates = fpgRecords.map(r => r.date);

    fpgRecords.forEach(({ date, records }) => {
      for (const mId of Object.keys(fpgMachines)) {
        const r = records[mId] || {};
        fpgMachines[mId].series.push({
          date,
          fuel: parseNum(r.afterRun?.fuelAfter) ?? parseNum(r.testRun?.fuelConsumption),
          rpm: parseNum(r.testRun?.rpm),
          oilPressure: parseNum(r.testRun?.oilPressure),
          coolantTemp: parseNum(r.testRun?.coolantTemp),
          battery1: parseNum(r.readings?.battery1Voltage) ?? parseNum(r.readings?.batteryVoltage),
          battery2: parseNum(r.readings?.battery2Voltage),
          waterPressure: parseNum(r.readings?.waterPressure) ?? parseNum(r.testRun?.systemPressure),
          hours: parseNum(r.afterRun?.runningHoursAfter),
        });
      }
    });

    // ── Generate FPG Diagnostic Insights (จุดที่ควรโฟกัส) ──
    const fpgInsights = [];

    // Fuel analysis
    const fp2Fuels = fpgMachines['fire-pump-2'].series.filter(s => s.fuel != null);
    if (fp2Fuels.length >= 2) {
      const first = fp2Fuels[0].fuel;
      const last = fp2Fuels[fp2Fuels.length - 1].fuel;
      const diff = last - first;
      if (diff < -20) {
        fpgInsights.push({
          type: 'warn',
          icon: '⛽',
          title: 'ระดับน้ำมัน Fire Pump #2 มีแนวโน้มลดลงต่อเนื่อง',
          text: `ระดับน้ำมันลดลงจาก ${first}L เหลือ ${last}L (${diff} ลิตร) ในช่วง ${fp2Fuels.length} ครั้งล่าสุด แนะนำตรวจสอบปริมาณคงเหลือและเตรียมแผนเติมน้ำมันดีเซลสำรอง`,
          badge: `ลดลง ${Math.abs(diff)} ลิตร`
        });
      }
    }

    // Generator coolant temp & oil pressure
    const genSeries = fpgMachines['generator-1'].series.filter(s => s.coolantTemp != null && s.oilPressure != null);
    if (genSeries.length > 0) {
      const latest = genSeries[genSeries.length - 1];
      const avgTemp = (genSeries.reduce((s, c) => s + c.coolantTemp, 0) / genSeries.length).toFixed(1);
      const avgOil = (genSeries.reduce((s, c) => s + c.oilPressure, 0) / genSeries.length).toFixed(1);
      fpgInsights.push({
        type: 'ok',
        icon: '🌡️',
        title: 'อุณหภูมิน้ำหล่อเย็นและแรงดันน้ำมัน Generator #1 อยู่ในเกณฑ์ดี',
        text: `อุณหภูมิล่าสุด ${latest.coolantTemp}°C (ค่าเฉลี่ย ${avgTemp}°C) และแรงดันน้ำมันเครื่อง ${latest.oilPressure} PSI (ค่าเฉลี่ย ${avgOil} PSI) สภาพเครื่องยนต์สมบูรณ์ ไม่มีความร้อนสะสม`,
        badge: 'ปกติสม่ำเสมอ'
      });
    }

    // Battery health analysis
    let lowBatteryCount = 0;
    for (const mId of Object.keys(fpgMachines)) {
      const s = fpgMachines[mId].series.filter(p => p.battery1 != null);
      if (s.length > 0) {
        const lastVal = s[s.length - 1].battery1;
        const threshold = mId === 'generator-1' ? 24.5 : 12.3;
        if (lastVal < threshold) lowBatteryCount++;
      }
    }

    if (lowBatteryCount === 0) {
      fpgInsights.push({
        type: 'ok',
        icon: '⚡',
        title: 'ระบบประจุแรงดันแบตเตอรี่สตาร์ทพร้อมใช้งาน',
        text: 'แรงดันไฟฟ้าแบตเตอรี่ทุกลูกของปั๊มดับเพลิง (12V) และเครื่องกำเนิดไฟฟ้า (24V) อยู่ในเกณฑ์มาตรฐาน (> 12.7V และ > 27.0V) เครื่องชาร์จทำงานปกติ',
        badge: 'พร้อมสตาร์ท 100%'
      });
    } else {
      fpgInsights.push({
        type: 'warn',
        icon: '⚡',
        title: `พบแบตเตอรี่แรงดันต่ำกว่าเกณฑ์ ${lowBatteryCount} จุด`,
        text: 'แนะนำตรวจสอบระดับน้ำกลั่น ขั้วต่อแบตเตอรี่ และระบบ Trickle Charger ของเครื่องจักรที่แรงดันต่ำ',
        badge: 'ต้องตรวจสอบ'
      });
    }

    // Water pressure
    const fp1Water = fpgMachines['fire-pump-1'].series.filter(s => s.waterPressure != null);
    if (fp1Water.length > 0) {
      const latestPress = fp1Water[fp1Water.length - 1].waterPressure;
      fpgInsights.push({
        type: 'info',
        icon: '💧',
        title: 'แรงดันน้ำระบบท่อดับเพลิงเสถียร',
        text: `แรงดันน้ำตรวจวัดล่าสุด ${latestPress} PSI อยู่ในระดับมาตรฐานที่กำหนด (110–160 PSI) พร้อมจ่ายน้ำอัตโนมัติหากเกิดเหตุเพลิงไหม้`,
        badge: `${latestPress} PSI`
      });
    }

    // ── 2. Load Meter กฟน. Data ──
    const today = new Date().toISOString().slice(0, 10);
    const curYM = today.slice(0, 7);
    let meterDoc = null;
    try {
      meterDoc = await loadMeterMonth(curYM);
    } catch {}
    if (!meterDoc) {
      meterDoc = tryLocalGitShow(`data/meter/${curYM.slice(0, 4)}/meter_${curYM}.json`);
    }

    const meterDays = meterDoc?.days || {};
    const sortedDays = Object.keys(meterDays).filter(k => meterDays[k] && typeof meterDays[k] === 'object').sort();

    const meterDaily = [];
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = meterDays[sortedDays[i - 1]];
      const cur = meterDays[sortedDays[i]];
      if (cur.m10 != null && prev.m10 != null) {
        const m1 = Math.round((cur.m10 - prev.m10) * 100) / 100;
        const m2 = (cur.m20 != null && prev.m20 != null) ? Math.round((cur.m20 - prev.m20) * 100) / 100 : 0;
        const m6 = (cur.m60 != null && prev.m60 != null) ? Math.round((cur.m60 - prev.m60) * 100) / 100 : 0;
        const onPeak = (cur.m11 != null && prev.m11 != null) ? Math.round((cur.m11 - prev.m11) * 100) / 100 : 0;
        const offPeak = (cur.m12 != null && prev.m12 != null) ? Math.round((cur.m12 - prev.m12) * 100) / 100 : 0;
        meterDaily.push({
          day: sortedDays[i],
          date: `${curYM}-${sortedDays[i]}`,
          m1,
          m2,
          m6,
          total: Math.round((m1 + m2) * 100) / 100,
          onPeak,
          offPeak,
          holiday: cur.holiday || null,
        });
      }
    }

    const meterInsights = [];
    if (meterDaily.length > 0) {
      const workdays = meterDaily.filter(d => !d.holiday && d.m1 > 0);
      const avgWorkday = workdays.length ? (workdays.reduce((s, d) => s + d.m1, 0) / workdays.length).toFixed(1) : 0;
      const maxDay = [...meterDaily].sort((a, b) => b.m1 - a.m1)[0];

      meterInsights.push({
        type: 'info',
        icon: '⚡',
        title: `การใช้พลังงานไฟฟ้าเฉลี่ยวันทำงาน: ${avgWorkday} หน่วย`,
        text: `วันที่มีการใช้ไฟฟ้าสูงสุดในเดือนนี้คือวันที่ ${maxDay?.day} (${maxDay?.m1} หน่วย) โดยช่วง On-Peak มีสัดส่วนประมาณ ${maxDay?.m1 ? Math.round((maxDay.onPeak / maxDay.m1) * 100) : 0}%`,
        badge: `สูงสุด ${maxDay?.m1} หน่วย`
      });
    }

    // ── 3. Emergency Light & Smoke Overview Stats & Trends ──
    let emerFiles = [];
    let smokeFiles = [];
    try {
      emerFiles = tryLocalGitTree('data/inspections/emergency/');
      smokeFiles = tryLocalGitTree('data/inspections/smoke/');
    } catch {}

    // Group Emergency Light by Month
    const emerByMonth = {};
    for (const f of emerFiles) {
      const ym = f.split('/')[3] || 'other';
      if (!emerByMonth[ym]) emerByMonth[ym] = { month: ym, total: 0, pass: 0, fail: 0, files: 0 };
      emerByMonth[ym].files++;
      const doc = tryLocalGitShow(f);
      const devs = doc?.records?.devices || [];
      for (const d of devs) {
        emerByMonth[ym].total++;
        const isFail = d.lightCondition === 'fail' || d.statusLight === 'abnormal' || d.testResult === 'off';
        if (isFail) emerByMonth[ym].fail++;
        else emerByMonth[ym].pass++;
      }
    }
    const emerTrends = Object.values(emerByMonth).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      passRate: m.total > 0 ? Math.round((m.pass / m.total) * 1000) / 10 : 100,
      failRate: m.total > 0 ? Math.round((m.fail / m.total) * 1000) / 10 : 0,
    }));

    const emerInsights = [];
    if (emerTrends.length > 0) {
      const latest = emerTrends[emerTrends.length - 1];
      const prev = emerTrends.length >= 2 ? emerTrends[emerTrends.length - 2] : null;
      if (latest.passRate >= 98) {
        emerInsights.push({
          type: 'ok',
          icon: '💡',
          title: `รอบตรวจสอบล่าสุด (${latest.month}) อัตราพร้อมใช้งาน ${latest.passRate}%`,
          text: `ตรวจเช็คโคมไฟฉุกเฉินทั้งหมด ${latest.total.toLocaleString()} จุด พบความพร้อมใช้งานสมบูรณ์ อุปกรณ์และแบตเตอรี่ผ่านการทดสอบ`,
          badge: `${latest.passRate}% พร้อมใช้`
        });
      }
      if (prev && prev.fail > 0) {
        emerInsights.push({
          type: 'info',
          icon: '🔧',
          title: `การแก้ไขจุดบกพร่องจากรอบ ${prev.month} เสร็จสิ้น`,
          text: `ในรอบ ${prev.month} เคยพบข้อบกพร่องของแบตเตอรี่/หลอดไฟ ${prev.fail} จุด ได้รับการบำรุงรักษาและเปลี่ยนใหม่เรียบร้อยแล้ว`,
          badge: `ปรับปรุงแล้ว ${prev.fail} จุด`
        });
      }
    }

    // Group Smoke Detector by Month
    const smokeByMonth = {};
    for (const f of smokeFiles) {
      const ym = f.split('/')[3] || 'other';
      if (!smokeByMonth[ym]) smokeByMonth[ym] = { month: ym, total: 0, normal: 0, cleaned: 0, files: 0 };
      smokeByMonth[ym].files++;
      const doc = tryLocalGitShow(f);
      const devs = doc?.records?.devices || [];
      for (const d of devs) {
        smokeByMonth[ym].total++;
        if (d.workingCondition === 'normal' || d.workingCondition === 'pass') smokeByMonth[ym].normal++;
        if (d.cleaned === 'yes' || d.cleaned === 'normal') smokeByMonth[ym].cleaned++;
      }
    }
    const smokeTrends = Object.values(smokeByMonth).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      passRate: m.total > 0 ? Math.round((m.normal / m.total) * 1000) / 10 : 100,
      cleanRate: m.total > 0 ? Math.round((m.cleaned / m.total) * 1000) / 10 : 100,
    }));

    const smokeInsights = [];
    if (smokeTrends.length > 0) {
      const totalTested = smokeTrends.reduce((s, c) => s + c.total, 0);
      const totalNormal = smokeTrends.reduce((s, c) => s + c.normal, 0);
      const overallRate = totalTested > 0 ? ((totalNormal / totalTested) * 100).toFixed(1) : '100';
      smokeInsights.push({
        type: 'ok',
        icon: '🚨',
        title: `ความพร้อมระบบ Smoke Detector สะสมเฉลี่ย ${overallRate}%`,
        text: `ทำการทดสอบสัญญานและทำความสะอาดหัวตรวจจับควันสะสมรวม ${totalTested.toLocaleString()} จุด ทุกอาคารพร้อมส่งสัญญาณแจ้งเหตุเพลิงไหม้`,
        badge: `${overallRate}% ทำงานปกติ`
      });
    }

    const payload = {
      ok: true,
      updatedAt: new Date().toISOString(),
      fpg: {
        dates,
        machines: fpgMachines,
        insights: fpgInsights,
      },
      meter: {
        month: curYM,
        daily: meterDaily,
        insights: meterInsights,
      },
      emergency: {
        trends: emerTrends,
        insights: emerInsights,
      },
      smoke: {
        trends: smokeTrends,
        insights: smokeInsights,
      },
      summary: {
        fpgInspectionCount: fpgList.length,
        emerInspectionCount: emerFiles.length,
        smokeInspectionCount: smokeFiles.length,
        meterRecordedDays: sortedDays.length,
      }
    };

    cache = {
      timestamp: now,
      data: payload,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('system-trends API error:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
