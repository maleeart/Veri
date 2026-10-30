'use client';

import { useEffect, useState, Fragment, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidenav from '../components/Sidenav';
import { useCanWrite } from '../lib/useCanWrite';
import { itemsForType, GROUP_LABELS, pmStatus, nextDue, daysSince, LIGHT_SYSTEMS } from '../lib/pmSchedule';
import { BUILDINGS, fmtDate, pmSummary, lastDoneByBuilding, getStatus, lastSaturdayISO, currentISOWeek, prevISOWeek, getBuildingLabel } from '../lib/systemStatus';

const TODAY = () => new Date().toISOString().slice(0, 10);

// ISO week → วันศุกร์ (ช่างจดทุกศุกร์)
function weekToFriday(week) {
  const [y, w] = week.split('-W').map(Number);
  const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
  const dow = simple.getUTCDay();
  const monday = new Date(simple);
  monday.setUTCDate(dow <= 4 ? simple.getUTCDate() - dow + 1 : simple.getUTCDate() + 8 - dow);
  monday.setUTCDate(monday.getUTCDate() + 4);
  return monday.toISOString().slice(0, 10);
}

// เรียงอาคารตามความรุนแรง (แดง→เหลือง→เทา→เขียว) เพื่อให้ที่ค้างเด่นก่อน
const SEVERITY = { overdue: 0, due: 1, never: 2, ok: 3 };
function buildingBubbles(dates, type) {
  const map = lastDoneByBuilding(dates, type);
  return BUILDINGS.map(b => ({ b, st: getStatus(map[b]), date: map[b] }))
    .sort((a, z) => SEVERITY[a.st] - SEVERITY[z.st] || a.b.localeCompare(z.b));
}

const STATUS_META = {
  overdue: { cls: 'st--overdue', icon: '🔴', label: 'เกินกำหนด' },
  due:     { cls: 'st--due',     icon: '🟡', label: 'ใกล้ครบ' },
  never:   { cls: 'st--never',   icon: '⚫', label: 'ยังไม่เคย' },
  ok:      { cls: 'st--ok',      icon: '✅', label: 'ปกติ' },
};

function formatInterval(days) {
  if (!days) return '';
  if (days === 182) return 'ทุก 6 เดือน';
  if (days === 365) return 'ทุก 1 ปี';
  if (days === 730) return 'ทุก 2 ปี';
  if (days === 1095) return 'ทุก 3 ปี';
  if (days === 1460) return 'ทุก 4 ปี';
  if (days % 365 === 0) return `ทุก ${days / 365} ปี`;
  if (days % 30 === 0) return `ทุก ${days / 30} เดือน`;
  return `ทุก ${days} วัน`;
}

/** counts → chip เดียว (worst-first) */
function summaryChip(c) {
  if (c.overdue) return { cls: 'st--overdue', txt: `🔴 ${c.overdue} เกินกำหนด` };
  if (c.due)     return { cls: 'st--due',     txt: `🟡 ${c.due} ใกล้ครบ` };
  if (c.never)   return { cls: 'st--never',   txt: `⚫ ${c.never} ยังไม่เคย` };
  return { cls: 'st--ok', txt: '✅ ปกติ' };
}

export default function PmPage() {
  return (
    <Suspense fallback={<main style={{ padding: 40, color: 'var(--ink-muted)' }}>กำลังโหลด...</main>}>
      <PmPageInner />
    </Suspense>
  );
}

function PmPageInner() {
  const router = useRouter();
  const canWrite = useCanWrite();
  const [dates, setDates] = useState(null);
  const [machines, setMachines] = useState(null);
  const [pmState, setPmState] = useState(null);
  const [meterDays, setMeterDays] = useState(null);
  const [bmWeeks, setBmWeeks] = useState(null);
  const [expandedOv, setExpandedOv] = useState(new Set()); // type ที่กางดูอาคาร
  const [err, setErr] = useState('');

  const toggleOv = (type) => setExpandedOv(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  const today = TODAY();

  const load = async () => {
    try {
      const [insp, fm, ps, md, bw] = await Promise.all([
        fetch('/api/inspections').then(r => r.json()),
        fetch('/api/field-map').then(r => r.json()),
        fetch('/api/pm-status').then(r => r.json()),
        fetch(`/api/save-meter?month=${today.slice(0, 7)}`).then(r => r.json()),
        fetch('/api/building-meter-weeks').then(r => r.json()),
      ]);
      setDates(insp.dates || []);
      setMachines(fm.machines || []);
      setPmState(ps.state || {});
      setMeterDays(md?.days || {});
      setBmWeeks(bw.weeks || []);
    } catch (e) { setErr(String(e.message || e)); }
  };

  useEffect(() => { load(); }, []);

  const post = async (payload) => {
    const res = await fetch('/api/pm-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error || 'บันทึกไม่สำเร็จ'); return false; }
    setPmState(d.state);
    return true;
  };

  const loading = dates === null || machines === null || pmState === null;

  // ── สรุปสถิติ KPI รวม ──
  const kpis = (() => {
    if (loading || !machines || !pmState) return null;
    let total = 0, overdue = 0, due = 0, ok = 0;
    for (const m of machines) {
      const items = itemsForType(m.type);
      const entry = pmState[m.id];
      for (const it of items) {
        total++;
        const st = pmStatus(entry?.[it.key], it.intervalDays, it.dueAheadDays);
        if (st === 'overdue') overdue++;
        else if (st === 'due') due++;
        else ok++;
      }
    }
    for (const ls of LIGHT_SYSTEMS) {
      const entry = pmState[ls.id];
      for (const it of ls.items) {
        total++;
        const st = pmStatus(entry?.[it.key], it.intervalDays, it.dueAheadDays);
        if (st === 'overdue') overdue++;
        else if (st === 'due') due++;
        else ok++;
      }
    }
    return { total, ok, due, overdue };
  })();

  // ── ภาพรวมระบบ (สถานะ + วันที่บันทึกล่าสุด) ──
  const overview = (() => {
    if (loading) return [];
    const ym = today.slice(0, 7);
    const lastOf = (type) => dates.filter(d => d.type === type).map(d => d.date).sort().reverse()[0] || null;
    const rows = [];

    // FPG รายสัปดาห์
    const lastSat = lastSaturdayISO();
    const lastFpg = lastOf('fpg');
    const fpgDone = !!(lastFpg && lastFpg >= lastSat);
    rows.push({
      icon: '🚒',
      name: 'Fire Pump & Generator',
      cycle: 'รอบตรวจรายสัปดาห์ (ทุกเสาร์)',
      href: '/session',
      last: lastFpg,
      chip: fpgDone ? { cls: 'st--ok', txt: '✅ ทำแล้ว' } : { cls: 'st--overdue', txt: '⚠️ ยังไม่ทำ' }
    });

    // Emergency / Smoke / Exit — รายอาคาร ทุก 3 เดือน
    for (const [type, icon, name, href] of [
      ['emergency', '💡', 'Emergency Light', `/form/emergency?date=${today}`],
      ['smoke', '🚨', 'Smoke Detector', `/form/smoke?date=${today}`],
      ['exit', '🚪', 'Exit Sign', `/form/exit?date=${today}`],
    ]) {
      const summary = pmSummary(dates, type);
      rows.push({
        icon,
        name,
        type,
        cycle: `รอบตรวจทุก 3 เดือน · ${BUILDINGS.length} อาคาร`,
        href,
        last: lastOf(type),
        chip: summaryChip(summary)
      });
    }

    // Meter กฟน. — รายวัน
    const mDays = Object.keys(meterDays || {}).filter(k => meterDays[k] != null).sort();
    const lastMeter = mDays.length ? `${ym}-${mDays[mDays.length - 1].padStart(2, '0')}` : null;
    const meterDoneToday = meterDays?.[today.slice(8, 10)] != null;
    rows.push({
      icon: '⚡',
      name: 'Meter กฟน.',
      cycle: 'รอบจดบันทึกรายวัน (จันทร์-ศุกร์)',
      href: '/meter',
      last: lastMeter,
      chip: meterDoneToday ? { cls: 'st--ok', txt: '✅ วันนี้' } : { cls: 'st--overdue', txt: '⚠️ ยังไม่บันทึกวันนี้' }
    });

    // Meter อาคาร — รายสัปดาห์ (ศุกร์)
    const thisWeek = currentISOWeek(), prevWeek = prevISOWeek();
    const thisDone = (bmWeeks || []).includes(thisWeek), prevDone = (bmWeeks || []).includes(prevWeek);
    const isFriday = new Date().getDay() === 5;
    const shouldAlert = !prevDone || (isFriday && !thisDone);
    const lastBm = [...(bmWeeks || [])].sort().reverse()[0] || null;
    rows.push({
      icon: '🏢',
      name: 'Meter อาคาร',
      cycle: 'รอบจดบันทึกรายสัปดาห์ (ทุกศุกร์)',
      href: '/building-meter',
      last: lastBm ? weekToFriday(lastBm) : null,
      chip: !shouldAlert ? { cls: 'st--ok', txt: '✅ ครบ' }
        : !prevDone ? { cls: 'st--overdue', txt: '⚠️ ค้างสัปดาห์ที่แล้ว' }
                    : { cls: 'st--due', txt: '🟡 ยังไม่บันทึกสัปดาห์นี้' }
    });

    return rows;
  })();

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main pm-main">
        {/* ── Header ── */}
        <header className="pm-hdr">
          <div className="pm-hdr-top">
            <div className="pm-hdr-left">
              <div className="pm-title-row">
                <h1 className="pm-title">🔧 สถานะ PM</h1>
                <span className="pm-badge">Preventive Maintenance</span>
              </div>
              <p className="pm-sub">สรุปภาพรวมสถานะทุกระบบ · รอบเปลี่ยนอะไหล่/ของเหลว และตรวจใหญ่ประจำปี</p>
            </div>
            <div className="pm-hdr-actions">
              <button className="pm-btn-home" onClick={() => router.push('/')}>
                🏠 หน้าแรก
              </button>
              <button className="pm-btn-home" onClick={() => router.push('/admin')} title="ดูภาพรวมและแนวโน้มแต่ละระบบ">
                📈 ภาพรวมระบบ
              </button>
              <button className="pm-refresh" title="รีเฟรชข้อมูล" onClick={load} disabled={loading}>
                🔄 รีเฟรช
              </button>
            </div>
          </div>

          {/* ── KPI Stat Cards (เดสก์ท็อปเต็มความกว้าง) ── */}
          {kpis && (
            <div className="pm-kpi-grid">
              <div className="kpi-card kpi-card--total">
                <span className="kpi-icon">⚙️</span>
                <div className="kpi-content">
                  <span className="kpi-num">{kpis.total}</span>
                  <span className="kpi-lbl">รายการ PM ทั้งหมด</span>
                </div>
              </div>
              <div className="kpi-card kpi-card--ok">
                <span className="kpi-icon">✅</span>
                <div className="kpi-content">
                  <span className="kpi-num">{kpis.ok}</span>
                  <span className="kpi-lbl">สถานะปกติ</span>
                </div>
              </div>
              <div className="kpi-card kpi-card--due">
                <span className="kpi-icon">🟡</span>
                <div className="kpi-content">
                  <span className="kpi-num">{kpis.due}</span>
                  <span className="kpi-lbl">ใกล้ครบกำหนด (เตือน)</span>
                </div>
              </div>
              <div className="kpi-card kpi-card--overdue">
                <span className="kpi-icon">🔴</span>
                <div className="kpi-content">
                  <span className="kpi-num">{kpis.overdue}</span>
                  <span className="kpi-lbl">เกินกำหนด (ค้างทำ)</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {err && <p className="pm-err">{err}</p>}
        {loading && <p className="pm-msg">กำลังโหลดข้อมูลสถานะ PM...</p>}

        {!loading && (
          <>
            {/* ── ส่วนที่ 1: ภาพรวมระบบ ── */}
            <div className="pm-sec-head">
              <div className="pm-sec-title">
                <span>📊 ภาพรวมระบบ</span>
                <span className="sec-tag">6 ระบบหลัก</span>
              </div>
              <span className="pm-sec-sub">สถานะการตรวจสอบรอบล่าสุดและสถานะรายอาคาร</span>
            </div>

            <div className="ov-table">
              {overview.map(row => {
                const exp = row.type && expandedOv.has(row.type);
                return (
                  <Fragment key={row.name}>
                    <div className="ov-row">
                      <span className="ov-icon">{row.icon}</span>
                      <div className="ov-info">
                        <div className="ov-title-line">
                          <span className="ov-name">{row.name}</span>
                          <span className="ov-cycle">{row.cycle}</span>
                        </div>
                        <span className="ov-sub">บันทึกล่าสุด: {row.last ? fmtDate(row.last) : '—'}</span>
                      </div>
                      <div className="ov-actions">
                        <span className={`chip ${row.chip.cls}`}>{row.chip.txt}</span>
                        {row.type && (
                          <button className="ov-exp" onClick={() => toggleOv(row.type)}>
                            {exp ? '▲ ซ่อนอาคาร' : '▼ ดูอาคาร'}
                          </button>
                        )}
                        {row.href && (
                          <button className="ov-go" onClick={() => router.push(row.href)} title={`ไปหน้า ${row.name}`}>
                            บันทึก ›
                          </button>
                        )}
                      </div>
                    </div>
                    {exp && (
                      <div className="ov-blds">
                        <div className="ov-blds-hd">
                          <span>สถานะรายอาคาร ({BUILDINGS.length} อาคาร)</span>
                          <span className="bld-legend">🟢 ปกติ · 🟡 ใกล้ครบ · 🔴 เกินกำหนด · ⚫ ยังไม่บันทึก</span>
                        </div>
                        <div className="ov-blds-list">
                          {buildingBubbles(dates, row.type).map(({ b, st, date }) => {
                            const meta = STATUS_META[st] || STATUS_META.never;
                            return (
                              <span key={b} className={`bld ${meta.cls}`}
                                title={`${getBuildingLabel(b)}\nสถานะ: ${meta.label}${date ? ' · ครั้งล่าสุด: ' + fmtDate(date) : ''}`}>
                                {b}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>

            {/* ── ส่วนที่ 2: รอบเปลี่ยน / ตรวจใหญ่ ── */}
            <div className="pm-sec-head">
              <div className="pm-sec-title">
                <span>🔧 รอบเปลี่ยนของเหลว / ตรวจใหญ่</span>
                <span className="sec-tag">รายเครื่องจักรและระบบ</span>
              </div>
              <span className="pm-sec-sub">คลิกที่แต่ละเครื่องเพื่อดูรายการอะไหล่และบันทึกผลการบำรุงรักษา</span>
            </div>

            <div className="mb-grid">
              {machines.map(m => (
                <MachineBlock key={m.id} machine={m}
                  entry={pmState?.[m.id]} canWrite={canWrite} onPost={post} />
              ))}
              {LIGHT_SYSTEMS.map(ls => (
                <MachineBlock key={ls.id}
                  machine={{ id: ls.id, label: ls.label, type: 'light', location_default: 'ทุกอาคาร', icon: ls.icon }}
                  items={ls.items} entry={pmState?.[ls.id]} canWrite={canWrite} onPost={post} />
              ))}
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .pm-main {
          background: var(--bg-base, var(--bg-surface-raised));
          min-height: 100dvh;
          padding: 16px 14px 60px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 900px) {
          .pm-main {
            padding: 24px 32px 64px;
          }
        }

        /* ── Header ── */
        .pm-hdr {
          margin-bottom: 24px;
        }
        .pm-hdr-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .pm-hdr-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pm-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pm-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .pm-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 6px;
          background: rgba(37,99,235,0.18);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.3);
        }
        .pm-sub {
          font-size: 13px;
          color: var(--ink-muted);
          margin: 0;
        }
        .pm-hdr-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pm-btn-home {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          color: var(--ink-primary);
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pm-btn-home:hover {
          background: var(--bg-surface-raised);
          border-color: var(--accent);
          color: var(--accent-strong);
        }
        .pm-refresh {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          color: var(--ink-muted);
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pm-refresh:hover:not(:disabled) {
          background: var(--bg-surface-raised);
          color: var(--ink-primary);
          border-color: var(--border-strong);
        }
        .pm-refresh:disabled {
          opacity: 0.5;
          cursor: default;
        }

        /* ── KPI Stat Cards ── */
        .pm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 900px) {
          .pm-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }
        .kpi-card {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          transition: transform 0.15s, border-color 0.15s;
        }
        .kpi-card:hover {
          transform: translateY(-1px);
        }
        .kpi-card--total   { border-color: rgba(59,130,246,0.3); background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(17,29,50,0.8)); }
        .kpi-card--ok      { border-color: rgba(34,197,94,0.3); background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(17,29,50,0.8)); }
        .kpi-card--due     { border-color: rgba(245,158,11,0.3); background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(17,29,50,0.8)); }
        .kpi-card--overdue { border-color: rgba(239,68,68,0.35); background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(17,29,50,0.8)); }
        .kpi-icon {
          font-size: 26px;
          width: 36px;
          text-align: center;
          flex-shrink: 0;
        }
        .kpi-content {
          display: flex;
          flex-direction: column;
        }
        .kpi-num {
          font-size: 24px;
          font-weight: 800;
          line-height: 1.1;
          color: var(--ink-primary);
        }
        .kpi-card--ok .kpi-num { color: #4ade80; }
        .kpi-card--due .kpi-num { color: #fbbf24; }
        .kpi-card--overdue .kpi-num { color: #f87171; }
        .kpi-lbl {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-secondary);
          margin-top: 2px;
        }

        .pm-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
        .pm-msg { color: var(--ink-muted); font-size: 14px; }

        /* ── Section Header ── */
        .pm-sec-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin: 28px 2px 12px;
          flex-wrap: wrap;
        }
        .pm-sec-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--ink-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sec-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-strong);
          background: rgba(37,99,235,0.15);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .pm-sec-sub {
          font-size: 12px;
          color: var(--ink-muted);
        }

        /* ── Overview Table ── */
        .ov-table {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          width: 100%;
        }
        .ov-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 18px;
          border-top: 1px solid var(--border-hairline);
          transition: background 0.1s;
        }
        .ov-row:first-child { border-top: none; }
        .ov-row:hover { background: var(--bg-surface-raised); }
        .ov-icon {
          font-size: 22px;
          width: 32px;
          text-align: center;
          flex-shrink: 0;
        }
        .ov-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .ov-title-line {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ov-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-primary);
        }
        .ov-cycle {
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-secondary);
          background: var(--bg-surface-raised);
          padding: 1px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-hairline);
        }
        .ov-sub {
          font-size: 12px;
          color: var(--ink-muted);
        }
        .ov-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ov-exp {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent-strong);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s;
        }
        .ov-exp:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .ov-go {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-hairline);
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s;
        }
        .ov-go:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        /* ── Buildings Expanded ── */
        .ov-blds {
          padding: 14px 20px 18px;
          background: rgba(12, 18, 32, 0.55);
          border-top: 1px solid var(--border-hairline);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ov-blds-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-secondary);
          flex-wrap: wrap;
          gap: 8px;
        }
        .bld-legend {
          font-size: 11px;
          color: var(--ink-muted);
          font-weight: normal;
        }
        .ov-blds-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .bld {
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          padding: 4px 10px;
          border: 1px solid transparent;
          cursor: default;
          transition: transform 0.1s;
        }
        .bld:hover {
          transform: scale(1.05);
        }

        /* ── Machines 2-Column Grid ── */
        .mb-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .mb-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .chip {
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          padding: 4px 10px;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        :global(.st--ok)      { background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.35); }
        :global(.st--overdue) { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.35); }
        :global(.st--due)     { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35); }
        :global(.st--never)   { background: rgba(148, 163, 184, 0.12); color: #94a3b8; border-color: rgba(148, 163, 184, 0.25); }
      `}</style>
    </div>
  );
}

// ── บล็อกต่อเครื่อง/ระบบ: หัวสรุป (ยุบได้) → ตั้งค่า/รายการ ──
function MachineBlock({ machine, items: itemsProp, entry, canWrite, onPost }) {
  const items = itemsProp || itemsForType(machine.type);
  const configured = !!entry;
  const [open, setOpen] = useState(!configured); // ยังไม่ตั้งค่า = เปิดเลย

  // สรุปสถานะทั้งเครื่อง
  const counts = { overdue: 0, due: 0, never: 0, ok: 0 };
  if (configured && entry) {
    for (const it of items) {
      const st = pmStatus(entry[it.key], it.intervalDays, it.dueAheadDays);
      if (counts[st] !== undefined) counts[st]++;
      else counts.overdue++;
    }
  }
  const chip = configured ? summaryChip(counts) : { cls: 'st--never', txt: '⚫ ยังไม่ตั้งค่า' };

  return (
    <section className="mb">
      <button className="mb-hd" onClick={() => setOpen(o => !o)}>
        <span className="mb-ico">{machine.icon || (machine.type === 'generator' ? '⚡' : '🚒')}</span>
        <div className="mb-info">
          <div className="mb-name-row">
            <span className="mb-name">{machine.label}</span>
            {machine.location_default && <span className="mb-loc">{machine.location_default}</span>}
          </div>
          <span className="mb-count-sub">
            {items.length} รายการตรวจสอบ {configured && counts.overdue > 0 ? `· 🔴 เกิน ${counts.overdue}` : ''}
          </span>
        </div>
        <span className={`chip ${chip.cls}`}>{chip.txt}</span>
        <span className="mb-arrow">{open ? '⌄' : '›'}</span>
      </button>

      {open && (configured
        ? <StatusList machine={machine} items={items} entry={entry} canWrite={canWrite} onPost={onPost} />
        : <SetupForm machine={machine} items={items} canWrite={canWrite} onPost={onPost} />)}

      <style jsx>{`
        .mb {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mb:hover {
          border-color: var(--border-strong);
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
        }
        .mb-hd {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: background 0.1s;
        }
        .mb-hd:hover {
          background: var(--bg-surface-raised);
        }
        .mb-ico {
          font-size: 24px;
          flex-shrink: 0;
          width: 32px;
          text-align: center;
        }
        .mb-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .mb-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mb-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .mb-loc {
          font-size: 11px;
          color: var(--ink-secondary);
          background: var(--bg-surface-raised);
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-hairline);
        }
        .mb-count-sub {
          font-size: 11px;
          color: var(--ink-muted);
        }
        .mb-arrow {
          font-size: 16px;
          color: var(--ink-muted);
          flex-shrink: 0;
          width: 20px;
          text-align: center;
        }
        .chip {
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          padding: 4px 10px;
          white-space: nowrap;
          border: 1px solid transparent;
        }
      `}</style>
    </section>
  );
}

function SetupForm({ machine, items, canWrite, onPost }) {
  const [vals, setVals] = useState({});
  const [unknown, setUnknown] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const baseline = {};
    for (const it of items) baseline[it.key] = unknown[it.key] ? null : (vals[it.key] || null);
    await onPost({ machineId: machine.id, baseline });
    setBusy(false);
  };

  return (
    <div className="setup">
      <div className="setup-hdr">
        <span className="setup-title">📝 ตั้งค่ารอบ PM ครั้งแรก</span>
        <span className="setup-note">ระบุวันที่ทำล่าสุดของแต่ละรายการ (หากไม่ทราบข้อมูล ให้เลือกช่อง &ldquo;ไม่ทราบ&rdquo;)</span>
      </div>
      <div className="setup-list">
        {items.map(it => (
          <div key={it.key} className="srow">
            <div className="srow-info">
              <span className="srow-lbl">{it.label}</span>
              <span className="srow-cycle">{formatInterval(it.intervalDays)}</span>
            </div>
            <div className="srow-ctl">
              <input type="date" className="dinp" value={vals[it.key] || ''} max={TODAY()}
                disabled={unknown[it.key] || !canWrite}
                onChange={e => setVals(v => ({ ...v, [it.key]: e.target.value }))} />
              <label className="unk">
                <input type="checkbox" checked={!!unknown[it.key]} disabled={!canWrite}
                  onChange={e => setUnknown(u => ({ ...u, [it.key]: e.target.checked }))} />
                ไม่ทราบ
              </label>
            </div>
          </div>
        ))}
      </div>
      <button className="setup-btn" disabled={busy || !canWrite} onClick={submit}>
        {!canWrite ? '🔒 ไม่มีสิทธิ์บันทึก' : busy ? 'กำลังบันทึก...' : '💾 บันทึกค่าเริ่มต้น PM'}
      </button>
      <style jsx>{`
        .setup {
          padding: 6px 18px 18px;
          border-top: 1px solid var(--border-hairline);
          background: rgba(12, 18, 32, 0.4);
        }
        .setup-hdr {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: var(--bg-surface-raised);
          border-radius: 10px;
          padding: 10px 14px;
          margin: 10px 0 12px;
          border: 1px solid var(--border-hairline);
        }
        .setup-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink-primary);
        }
        .setup-note {
          font-size: 12px;
          color: var(--ink-muted);
        }
        .setup-list {
          display: flex;
          flex-direction: column;
        }
        .srow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-top: 1px solid var(--border-hairline);
          flex-wrap: wrap;
        }
        .srow:first-of-type { border-top: none; }
        .srow-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 180px;
          flex-wrap: wrap;
        }
        .srow-lbl {
          font-size: 13px;
          color: var(--ink-primary);
        }
        .srow-cycle {
          font-size: 10px;
          font-weight: 700;
          color: var(--ink-secondary);
          background: var(--bg-surface-raised);
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-hairline);
        }
        .srow-ctl {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dinp {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 13px;
          font-family: inherit;
        }
        .dinp:disabled { opacity: 0.45; }
        .unk {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--ink-muted);
          cursor: pointer;
          white-space: nowrap;
        }
        .setup-btn {
          margin-top: 14px;
          width: 100%;
          padding: 11px;
          border-radius: 10px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.12s;
        }
        .setup-btn:hover:not(:disabled) {
          background: var(--accent-strong);
        }
        .setup-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

function StatusList({ machine, items, entry, canWrite, onPost }) {
  return (
    <div className="sl">
      {['change', 'annual'].map(g => {
        const gItems = items.filter(it => it.group === g);
        if (!gItems.length) return null;
        return (
          <Fragment key={g}>
            <div className="sl-ghd">
              <span>{GROUP_LABELS[g]}</span>
              <span className="sl-ghd-count">{gItems.length} รายการ</span>
            </div>
            {gItems.map(it => (
              <ItemRow key={it.key} machineId={machine.id} item={it}
                last={entry[it.key]} canWrite={canWrite} onPost={onPost} />
            ))}
          </Fragment>
        );
      })}
      <style jsx>{`
        .sl {
          padding: 0 0 8px;
          border-top: 1px solid var(--border-hairline);
          background: rgba(12, 18, 32, 0.4);
        }
        .sl-ghd {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--accent-strong);
          padding: 12px 18px 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sl-ghd::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-hairline);
        }
        .sl-ghd-count {
          font-size: 10px;
          font-weight: 600;
          color: var(--ink-muted);
          background: var(--bg-surface-raised);
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-hairline);
        }
      `}</style>
    </div>
  );
}

function ItemRow({ machineId, item, last, canWrite, onPost }) {
  const [date, setDate] = useState(TODAY());
  const [busy, setBusy] = useState(false);
  const st = pmStatus(last, item.intervalDays, item.dueAheadDays);
  const meta = STATUS_META[st] || STATUS_META.never;
  const due = nextDue(last, item.intervalDays);

  let detail = 'ยังไม่มีข้อมูล';
  if (last) {
    if (st === 'overdue') {
      const daysOver = daysSince(last) - item.intervalDays;
      detail = `ล่าสุด ${fmtDate(last)} · ครบกำหนด ${fmtDate(due)} (เกินมา ${daysOver} วัน)`;
    } else if (st === 'due') {
      const daysLeft = item.intervalDays - daysSince(last);
      detail = `ล่าสุด ${fmtDate(last)} · ครบกำหนด ${fmtDate(due)} (อีก ${daysLeft} วัน)`;
    } else {
      detail = `ล่าสุด ${fmtDate(last)} · ครบกำหนด ${fmtDate(due)}`;
    }
  }

  const save = async () => {
    setBusy(true);
    await onPost({ machineId, itemKey: item.key, date });
    setBusy(false);
  };

  return (
    <div className={`ir ${st === 'overdue' ? 'ir--overdue' : st === 'due' ? 'ir--due' : ''}`}>
      <div className="ir-main">
        <div className="ir-title-row">
          <span className="ir-lbl">{item.label}</span>
          <span className="ir-badge">{formatInterval(item.intervalDays)}</span>
        </div>
        <span className="ir-detail">{detail}</span>
      </div>
      <div className="ir-right">
        <span className={`chip ${meta.cls}`}>{meta.icon} {meta.label}</span>
        {canWrite && (
          <div className="ir-act">
            <input type="date" className="ir-date" value={date} max={TODAY()} onChange={e => setDate(e.target.value)} />
            <button className="ir-btn" disabled={busy} onClick={save}>{busy ? '...' : '✓ ทำแล้ว'}</button>
          </div>
        )}
      </div>
      <style jsx>{`
        .ir {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-top: 1px solid var(--border-hairline);
          flex-wrap: wrap;
          transition: background 0.1s;
        }
        .ir:first-of-type { border-top: none; }
        .ir:hover { background: rgba(255,255,255,0.02); }
        .ir--due { background: rgba(245, 158, 11, 0.06); }
        .ir--due:hover { background: rgba(245, 158, 11, 0.1); }
        .ir--overdue { background: rgba(239, 68, 68, 0.06); }
        .ir--overdue:hover { background: rgba(239, 68, 68, 0.1); }
        .ir-main {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 180px;
        }
        .ir-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ir-lbl {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-primary);
        }
        .ir--due .ir-lbl { color: #fbbf24; }
        .ir--overdue .ir-lbl { color: #f87171; }
        .ir-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          background: var(--bg-surface-raised);
          color: var(--ink-secondary);
          border: 1px solid var(--border-hairline);
        }
        .ir-detail {
          font-size: 11px;
          color: var(--ink-muted);
        }
        .ir--due .ir-detail { color: #f59e0b; }
        .ir--overdue .ir-detail { color: #f87171; }
        .ir-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .chip {
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          padding: 4px 10px;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .ir-act {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ir-date {
          padding: 5px 8px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 12px;
          font-family: inherit;
        }
        .ir-btn {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s;
        }
        .ir-btn:hover:not(:disabled) {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .ir-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
