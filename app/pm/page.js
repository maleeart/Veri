'use client';

import { useEffect, useState, Fragment, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidenav from '../components/Sidenav';
import { useCanWrite } from '../lib/useCanWrite';
import { itemsForType, GROUP_LABELS, pmStatus, nextDue, daysSince, LIGHT_SYSTEMS } from '../lib/pmSchedule';
import { BUILDINGS, fmtDate, pmSummary, lastDoneByBuilding, getStatus, lastSaturdayISO, currentISOWeek, prevISOWeek } from '../lib/systemStatus';

const TODAY = () => new Date().toISOString().slice(0, 10);

// ISO week → วันศุกร์ (ช่างจดทุกศุกร์) — ponytail: dup เล็กจาก app/page.js, ย้ายเข้า systemStatus ได้ถ้าต้องใช้ที่ 3
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

  const loading = dates === null || machines === null;

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
    rows.push({ icon: '🚒⚡', name: 'Fire Pump & Generator', last: lastFpg,
      chip: fpgDone ? { cls: 'st--ok', txt: '✅ ทำแล้ว' } : { cls: 'st--overdue', txt: '⚠️ ยังไม่ทำ' } });

    // Emergency / Smoke / Exit — รายอาคาร ทุก 3 เดือน
    for (const [type, icon, name] of [
      ['emergency', '💡', 'Emergency Light'],
      ['smoke', '🚨', 'Smoke Detector'],
      ['exit', '🚪', 'Exit Sign'],
    ]) {
      rows.push({ icon, name, type, last: lastOf(type), chip: summaryChip(pmSummary(dates, type)) });
    }

    // Meter กฟน. — รายวัน
    const mDays = Object.keys(meterDays || {}).filter(k => meterDays[k] != null).sort();
    const lastMeter = mDays.length ? `${ym}-${mDays[mDays.length - 1].padStart(2, '0')}` : null;
    const meterDoneToday = meterDays?.[today.slice(8, 10)] != null;
    rows.push({ icon: '⚡', name: 'Meter กฟน.', last: lastMeter,
      chip: meterDoneToday ? { cls: 'st--ok', txt: '✅ วันนี้' } : { cls: 'st--overdue', txt: '⚠️ ยังไม่บันทึกวันนี้' } });

    // Meter อาคาร — รายสัปดาห์ (ศุกร์)
    const thisWeek = currentISOWeek(), prevWeek = prevISOWeek();
    const thisDone = (bmWeeks || []).includes(thisWeek), prevDone = (bmWeeks || []).includes(prevWeek);
    const isFriday = new Date().getDay() === 5;
    const shouldAlert = !prevDone || (isFriday && !thisDone);
    const lastBm = [...(bmWeeks || [])].sort().reverse()[0] || null;
    rows.push({ icon: '🏢', name: 'Meter อาคาร', last: lastBm ? weekToFriday(lastBm) : null,
      chip: !shouldAlert ? { cls: 'st--ok', txt: '✅ ครบ' }
        : !prevDone ? { cls: 'st--overdue', txt: '⚠️ ค้างสัปดาห์ที่แล้ว' }
                    : { cls: 'st--due', txt: '🟡 ยังไม่บันทึกสัปดาห์นี้' } });

    return rows;
  })();

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main pm-main">
        <header className="pm-hdr">
          <button className="pm-back" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
          <h1 className="pm-title">🔧 สถานะ PM</h1>
          <p className="pm-sub">สรุปสถานะทุกระบบ · รอบเปลี่ยน/ตรวจใหญ่</p>
        </header>

        {err && <p className="pm-err">{err}</p>}
        {loading && <p className="pm-msg">กำลังโหลด...</p>}

        {!loading && (
          <>
            {/* ── ภาพรวมระบบ ── */}
            <div className="pm-sec-hd">ภาพรวมระบบ</div>
            <div className="ov-table">
              {overview.map(row => {
                const exp = row.type && expandedOv.has(row.type);
                return (
                  <Fragment key={row.name}>
                    <div className="ov-row">
                      <span className="ov-icon">{row.icon}</span>
                      <div className="ov-info">
                        <span className="ov-name">{row.name}</span>
                        <span className="ov-sub">บันทึกล่าสุด {row.last ? fmtDate(row.last) : '—'}</span>
                      </div>
                      <span className={`chip ${row.chip.cls}`}>{row.chip.txt}</span>
                      {row.type && (
                        <button className="ov-exp" onClick={() => toggleOv(row.type)}>
                          {exp ? '▲ ซ่อน' : '▼ ดูอาคาร'}
                        </button>
                      )}
                    </div>
                    {exp && (
                      <div className="ov-blds">
                        {buildingBubbles(dates, row.type).map(({ b, st, date }) => (
                          <span key={b} className={`bld ${STATUS_META[st].cls}`}
                            title={`${STATUS_META[st].label}${date ? ' · ' + fmtDate(date) : ''}`}>{b}</span>
                        ))}
                        <span className="bld-legend">🟢 ปกติ · 🟡 ใกล้ครบ · 🔴 เกินกำหนด · ⚫ ยังไม่บันทึก</span>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>

            {/* ── รอบเปลี่ยน / ตรวจใหญ่ ── */}
            <div className="pm-sec-hd">รอบเปลี่ยน / ตรวจใหญ่</div>
            {machines.map(m => (
              <MachineBlock key={m.id} machine={m}
                entry={pmState[m.id]} canWrite={canWrite} onPost={post} />
            ))}
            {LIGHT_SYSTEMS.map(ls => (
              <MachineBlock key={ls.id}
                machine={{ id: ls.id, label: ls.label, type: 'light', location_default: '', icon: ls.icon }}
                items={ls.items} entry={pmState[ls.id]} canWrite={canWrite} onPost={post} />
            ))}
          </>
        )}
      </main>

      <style jsx>{`
        .pm-main { background: var(--bg-base, var(--bg-surface-raised)); min-height: 100dvh; padding: 20px 16px 60px; }
        .pm-hdr { margin-bottom: 16px; }
        .pm-back { background: none; border: none; color: var(--accent); font-size: 13px;
          font-weight: 600; cursor: pointer; padding: 0 0 8px; font-family: inherit; }
        .pm-title { font-size: 19px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .pm-sub { font-size: 12px; color: var(--ink-muted); margin: 3px 0 0; }
        .pm-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
        .pm-msg { color: var(--ink-muted); font-size: 14px; }
        .pm-sec-hd { font-size: 12px; font-weight: 800; letter-spacing: .03em; color: var(--ink-muted);
          text-transform: uppercase; margin: 20px 2px 8px; }

        .ov-table { background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05); max-width: 900px; }
        .ov-row { display: flex; align-items: center; gap: 12px; padding: 11px 16px;
          border-top: 1px solid var(--border-hairline); }
        .ov-row:first-child { border-top: none; }
        .ov-icon { font-size: 20px; width: 26px; text-align: center; flex-shrink: 0; }
        .ov-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
        .ov-name { font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .ov-sub { font-size: 11px; color: var(--ink-muted); }
        .ov-exp { background: var(--bg-surface-raised); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 4px 9px; font-size: 11px; font-weight: 600; color: var(--accent);
          cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .ov-exp:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

        .ov-blds { display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
          padding: 12px 16px 14px; background: var(--bg-surface-raised);
          border-top: 1px solid var(--border-hairline); }
        .bld { font-size: 12px; font-weight: 600; border-radius: 8px; padding: 3px 9px;
          border: 1px solid transparent; cursor: default; }
        .bld-legend { flex-basis: 100%; font-size: 10px; color: var(--ink-muted); margin-top: 4px; }

        .chip { font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent; }
        :global(.st--ok)      { background: #dcfce7; color: #14532d; border-color: #86efac; }
        :global(.st--overdue) { background: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }
        :global(.st--due)     { background: #fef3c7; color: #78350f; border-color: #fcd34d; }
        :global(.st--never)   { background: var(--bg-surface-raised); color: var(--ink-secondary); border-color: var(--border-strong); }
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
  if (configured) for (const it of items) counts[pmStatus(entry[it.key], it.intervalDays, it.dueAheadDays)]++;
  const chip = configured ? summaryChip(counts) : { cls: 'st--never', txt: '⚫ ยังไม่ตั้งค่า' };

  return (
    <section className="mb">
      <button className="mb-hd" onClick={() => setOpen(o => !o)}>
        <span className="mb-ico">{machine.icon || (machine.type === 'generator' ? '⚡' : '🚒')}</span>
        <div className="mb-info">
          <span className="mb-name">{machine.label}</span>
          <span className="mb-loc">{machine.location_default}</span>
        </div>
        <span className={`chip ${chip.cls}`}>{chip.txt}</span>
        <span className="mb-arrow">{open ? '⌄' : '›'}</span>
      </button>

      {open && (configured
        ? <StatusList machine={machine} items={items} entry={entry} canWrite={canWrite} onPost={onPost} />
        : <SetupForm machine={machine} items={items} canWrite={canWrite} onPost={onPost} />)}

      <style jsx>{`
        .mb { background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 14px;
          margin-bottom: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05); max-width: 900px; }
        .mb-hd { display: flex; align-items: center; gap: 12px; padding: 12px 16px; width: 100%;
          background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .mb-ico { font-size: 22px; flex-shrink: 0; }
        .mb-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
        .mb-name { font-size: 14px; font-weight: 800; color: var(--ink-primary); }
        .mb-loc { font-size: 11px; color: var(--ink-muted); }
        .mb-arrow { font-size: 16px; color: var(--ink-muted); flex-shrink: 0; }
        .chip { font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent; }
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
      <p className="setup-note">📝 ตั้งค่าครั้งแรก — ระบุวันที่ทำล่าสุด (ไม่ทราบ ให้ติ๊ก)</p>
      {items.map(it => (
        <div key={it.key} className="srow">
          <span className="srow-lbl">{it.label}</span>
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
      <button className="setup-btn" disabled={busy || !canWrite} onClick={submit}>
        {!canWrite ? '🔒 ไม่มีสิทธิ์บันทึก' : busy ? 'กำลังบันทึก...' : '💾 บันทึกค่าเริ่มต้น'}
      </button>
      <style jsx>{`
        .setup { padding: 4px 16px 16px; }
        .setup-note { font-size: 12px; color: var(--ink-secondary); background: var(--bg-surface-raised);
          border-radius: 8px; padding: 8px 12px; margin: 0 0 10px; line-height: 1.6; }
        .srow { display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 7px 0; border-top: 1px solid var(--border-hairline); flex-wrap: wrap; }
        .srow:first-of-type { border-top: none; }
        .srow-lbl { font-size: 13px; color: var(--ink-primary); flex: 1; min-width: 150px; }
        .srow-ctl { display: flex; align-items: center; gap: 10px; }
        .dinp { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-strong);
          background: var(--bg-input); color: var(--ink-primary); font-size: 13px; font-family: inherit; }
        .dinp:disabled { opacity: .45; }
        .unk { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ink-muted); cursor: pointer; white-space: nowrap; }
        .setup-btn { margin-top: 12px; width: 100%; padding: 11px; border-radius: 10px; border: none;
          background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .setup-btn:disabled { opacity: .5; cursor: default; }
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
            <div className="sl-ghd">{GROUP_LABELS[g]}</div>
            {gItems.map(it => (
              <ItemRow key={it.key} machineId={machine.id} item={it}
                last={entry[it.key]} canWrite={canWrite} onPost={onPost} />
            ))}
          </Fragment>
        );
      })}
      <style jsx>{`
        .sl { padding: 2px 0 8px; }
        .sl-ghd { font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
          color: var(--ink-muted); padding: 10px 16px 4px; }
      `}</style>
    </div>
  );
}

function ItemRow({ machineId, item, last, canWrite, onPost }) {
  const [date, setDate] = useState(TODAY());
  const [busy, setBusy] = useState(false);
  const st = pmStatus(last, item.intervalDays, item.dueAheadDays);
  const meta = STATUS_META[st];
  const due = nextDue(last, item.intervalDays);

  const detail = last
    ? `ล่าสุด ${fmtDate(last)} · ครบ ${fmtDate(due)}${st === 'overdue' ? ` (เกิน ${daysSince(last) - item.intervalDays} วัน)` : ''}`
    : 'ยังไม่มีข้อมูล';

  const save = async () => { setBusy(true); await onPost({ machineId, itemKey: item.key, date }); setBusy(false); };

  return (
    <div className={`ir ${st === 'overdue' || st === 'due' ? 'ir--alert' : ''}`}>
      <div className="ir-main">
        <span className="ir-lbl">{item.label}</span>
        <span className="ir-detail">{detail}</span>
      </div>
      <span className={`chip ${meta.cls}`}>{meta.icon} {meta.label}</span>
      {canWrite && (
        <div className="ir-act">
          <input type="date" className="ir-date" value={date} max={TODAY()} onChange={e => setDate(e.target.value)} />
          <button className="ir-btn" disabled={busy} onClick={save}>{busy ? '...' : '✓ ทำแล้ว'}</button>
        </div>
      )}
      <style jsx>{`
        .ir { display: flex; align-items: center; gap: 10px; padding: 10px 16px;
          border-top: 1px solid var(--border-hairline); flex-wrap: wrap; }
        .ir--alert { background: #fffbeb; }
        .ir-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 160px; }
        .ir-lbl { font-size: 13px; font-weight: 600; color: var(--ink-primary); }
        .ir--alert .ir-lbl { color: #92400e; }
        .ir-detail { font-size: 11px; color: var(--ink-muted); }
        .ir--alert .ir-detail { color: #b45309; }
        .chip { font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent; }
        .ir-act { display: flex; align-items: center; gap: 6px; }
        .ir-date { padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-strong);
          background: var(--bg-input); color: var(--ink-primary); font-size: 12px; font-family: inherit; }
        .ir-btn { background: var(--bg-surface-raised); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--accent);
          cursor: pointer; white-space: nowrap; }
        .ir-btn:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
        .ir-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  );
}
