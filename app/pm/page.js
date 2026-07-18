'use client';

import { useEffect, useState, Fragment } from 'react';
import Sidenav from '../components/Sidenav';
import { useCanWrite } from '../lib/useCanWrite';
import { itemsForType, GROUP_LABELS, pmStatus, nextDue, daysSince } from '../lib/pmSchedule';

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TODAY = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

const STATUS_META = {
  overdue: { cls: 'st--overdue', icon: '🔴', label: 'เกินกำหนด' },
  due:     { cls: 'st--due',     icon: '🟡', label: 'ใกล้ครบ' },
  never:   { cls: 'st--never',   icon: '⚫', label: 'ยังไม่เคย/ไม่ทราบ' },
  ok:      { cls: 'st--ok',      icon: '✅', label: 'ปกติ' },
};

export default function PmPage() {
  const canWrite = useCanWrite();
  const [machines, setMachines] = useState(null);
  const [state, setState] = useState(null); // { machineId: { itemKey: date|null } }
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [fmRes, psRes] = await Promise.all([
        fetch('/api/field-map').then(r => r.json()),
        fetch('/api/pm-status').then(r => r.json()),
      ]);
      setMachines(fmRes.machines || []);
      setState(psRes.state || {});
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
    setState(d.state);
    return true;
  };

  const loading = machines === null || state === null;

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main pm-main">
        <header className="pm-hdr">
          <h1 className="pm-title">🔧 สถานะ PM</h1>
          <p className="pm-sub">รอบเปลี่ยนของเหลว/อะไหล่ · ตรวจใหญ่รายปี — Fire Pump &amp; Generator</p>
        </header>

        {err && <p className="pm-err">{err}</p>}
        {loading && <p className="pm-msg">กำลังโหลด...</p>}

        {!loading && machines.map(m => (
          <MachineBlock key={m.id} machine={m}
            entry={state[m.id]} canWrite={canWrite} onPost={post} />
        ))}
      </main>

      <style jsx>{`
        .pm-main { background: var(--bg-base, var(--bg-surface-raised)); min-height: 100dvh; padding: 22px 20px 60px; }
        .pm-hdr { margin-bottom: 20px; }
        .pm-title { font-size: 20px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .pm-sub { font-size: 12px; color: var(--ink-muted); margin: 4px 0 0; }
        .pm-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
        .pm-msg { color: var(--ink-muted); font-size: 14px; }
      `}</style>
    </div>
  );
}

// ── บล็อกต่อเครื่อง: ยังไม่ตั้งค่า → ฟอร์มตั้งต้น · ตั้งแล้ว → รายการสถานะ ──
function MachineBlock({ machine, entry, canWrite, onPost }) {
  const items = itemsForType(machine.type);
  const configured = !!entry;

  return (
    <section className="mb">
      <div className="mb-hd">
        <span className="mb-ico">{machine.type === 'generator' ? '⚡' : '🚒'}</span>
        <div>
          <div className="mb-name">{machine.label}</div>
          <div className="mb-loc">{machine.location_default}</div>
        </div>
      </div>

      {!configured
        ? <SetupForm machine={machine} items={items} canWrite={canWrite} onPost={onPost} />
        : <StatusList machine={machine} items={items} entry={entry} canWrite={canWrite} onPost={onPost} />}

      <style jsx>{`
        .mb { background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 16px;
          margin-bottom: 18px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05); max-width: 900px; }
        .mb-hd { display: flex; align-items: center; gap: 12px; padding: 14px 18px;
          border-bottom: 1px solid var(--border-hairline); background: var(--bg-surface-raised); }
        .mb-ico { font-size: 24px; }
        .mb-name { font-size: 15px; font-weight: 800; color: var(--ink-primary); }
        .mb-loc { font-size: 12px; color: var(--ink-muted); }
      `}</style>
    </section>
  );
}

function SetupForm({ machine, items, canWrite, onPost }) {
  const [vals, setVals] = useState({});   // itemKey → date
  const [unknown, setUnknown] = useState({}); // itemKey → true
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
      <p className="setup-note">📝 ตั้งค่าครั้งแรก — ระบุวันที่ทำล่าสุดของแต่ละรายการ (ถ้าไม่ทราบ ติ๊ก "ไม่ทราบ")</p>
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
        .setup { padding: 14px 18px 18px; }
        .setup-note { font-size: 12px; color: var(--ink-secondary); background: var(--bg-surface-raised);
          border-radius: 8px; padding: 8px 12px; margin: 0 0 12px; line-height: 1.6; }
        .srow { display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 8px 0; border-top: 1px solid var(--border-hairline); flex-wrap: wrap; }
        .srow:first-of-type { border-top: none; }
        .srow-lbl { font-size: 13px; color: var(--ink-primary); flex: 1; min-width: 160px; }
        .srow-ctl { display: flex; align-items: center; gap: 12px; }
        .dinp { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-strong);
          background: var(--bg-input); color: var(--ink-primary); font-size: 13px; font-family: inherit; }
        .dinp:disabled { opacity: .45; }
        .unk { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ink-muted); cursor: pointer; white-space: nowrap; }
        .setup-btn { margin-top: 14px; width: 100%; padding: 12px; border-radius: 10px; border: none;
          background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .setup-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  );
}

function StatusList({ machine, items, entry, canWrite, onPost }) {
  const groups = ['change', 'annual'];
  return (
    <div className="sl">
      {groups.map(g => {
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
        .sl { padding: 6px 0 10px; }
        .sl-ghd { font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
          color: var(--ink-muted); padding: 12px 18px 6px; }
      `}</style>
    </div>
  );
}

function ItemRow({ machineId, item, last, canWrite, onPost }) {
  const [date, setDate] = useState(TODAY());
  const [busy, setBusy] = useState(false);
  const st = pmStatus(last, item.intervalDays);
  const meta = STATUS_META[st];
  const due = nextDue(last, item.intervalDays);

  const detail = last
    ? `ล่าสุด ${fmtDate(last)} · ครบ ${fmtDate(due)}${st === 'overdue' ? ` (เกิน ${daysSince(last) - item.intervalDays} วัน)` : ''}`
    : 'ยังไม่มีข้อมูล';

  const save = async () => {
    setBusy(true);
    await onPost({ machineId, itemKey: item.key, date });
    setBusy(false);
  };

  return (
    <div className={`ir ${st === 'overdue' || st === 'due' ? 'ir--alert' : ''}`}>
      <div className="ir-main">
        <span className="ir-lbl">{item.label}</span>
        <span className="ir-detail">{detail}</span>
      </div>
      <span className={`ir-chip ${meta.cls}`}>{meta.icon} {meta.label}</span>
      {canWrite && (
        <div className="ir-act">
          <input type="date" className="ir-date" value={date} max={TODAY()} onChange={e => setDate(e.target.value)} />
          <button className="ir-btn" disabled={busy} onClick={save}>{busy ? '...' : '✓ ทำแล้ว'}</button>
        </div>
      )}
      <style jsx>{`
        .ir { display: flex; align-items: center; gap: 12px; padding: 12px 18px;
          border-top: 1px solid var(--border-hairline); flex-wrap: wrap; }
        .ir--alert { background: #fffbeb; }
        .ir-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 180px; }
        .ir-lbl { font-size: 13px; font-weight: 600; color: var(--ink-primary); }
        .ir--alert .ir-lbl { color: #92400e; }
        .ir-detail { font-size: 11px; color: var(--ink-muted); }
        .ir--alert .ir-detail { color: #b45309; }
        .ir-chip { font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent; }
        .st--ok { background: #dcfce7; color: #14532d; border-color: #86efac; }
        .st--overdue { background: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }
        .st--due { background: #fef3c7; color: #78350f; border-color: #fcd34d; }
        .st--never { background: var(--bg-surface-raised); color: var(--ink-secondary); border-color: var(--border-strong); }
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
