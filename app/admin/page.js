'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidenav from '../components/Sidenav';

const BUILDINGS = [
  'ท.0006','ท.0007','ท.0008','ท.0009','ท.0010',
  'ท.0011','ท.0012','ท.0014','ท.0015','ท.0016',
  'ท.0017','ท.0018','ท.0019','ท.0020','ท.0022',
  'ท.0023','ท.0026','ท.0027','ท.0028','ท.0029',
  'ต.0017','ต.0019','ต.0025','ต.0026','ต.0031','ต.0033',
];
const FREQ_MONTHS = 3;
const FREQ_DAYS = FREQ_MONTHS * 30;
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function lastDoneByBuilding(dates, type) {
  const map = {};
  for (const d of (dates || [])) {
    if (d.type !== type || !d.building) continue;
    if (!map[d.building] || d.date > map[d.building]) map[d.building] = d.date;
  }
  return map;
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getStatus(lastDate) {
  if (!lastDate) return 'never';
  const days = daysSince(lastDate);
  if (days > FREQ_DAYS) return 'overdue';
  if (days > FREQ_DAYS - 14) return 'due';
  return 'ok';
}

function pmSummary(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const c = { overdue: 0, due: 0, never: 0, ok: 0 };
  for (const b of BUILDINGS) c[getStatus(byB[b])]++;
  return c;
}

// คืนรายอาคารที่ไม่ ok (overdue/due/never)
function pmBuildingDetails(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const overdue = [], due = [], never = [];
  for (const b of BUILDINGS) {
    const last = byB[b] || null;
    const s = getStatus(last);
    if (s === 'ok') continue;
    const days = last ? daysSince(last) : null;
    if (s === 'overdue') overdue.push({ building: b, lastDate: last, daysOver: days - FREQ_DAYS });
    else if (s === 'due')   due.push({ building: b, lastDate: last, daysLeft: FREQ_DAYS - days });
    else                    never.push({ building: b });
  }
  return { overdue, due, never };
}

function lastSaturdayISO() {
  const d = new Date();
  const daysBack = d.getDay() === 6 ? 0 : d.getDay() + 1;
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function isoWeekOf(d) {
  const thu = new Date(d);
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function currentISOWeek() { return isoWeekOf(new Date()); }
function prevISOWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return isoWeekOf(d);
}

const PM_TYPES = [
  { type: 'emergency', icon: '💡', label: 'Emergency Light' },
  { type: 'smoke',     icon: '🚨', label: 'Smoke Detector' },
  { type: 'exit',      icon: '🚪', label: 'Exit Sign' },
];

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);

  const [view, setView] = useState('dashboard');
  const [expandedPM, setExpandedPM] = useState(new Set());

  // Dashboard state
  const [dates, setDates]         = useState(null);
  const [dashUsers, setDashUsers] = useState(null);
  const [pendingReqs, setPending] = useState(null);
  const [meterData, setMeterData] = useState(null);
  const [bmWeeks, setBmWeeks]     = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErr, setDashErr]     = useState('');
  const [approving, setApproving] = useState(null);

  // Users state
  const [users, setUsers]   = useState(null);
  const [admins, setAdmins] = useState([]);
  const [email, setEmail]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');

  const loadDashboard = async () => {
    if (dashLoading) return;
    setDashLoading(true); setDashErr('');
    const todayYM = today.slice(0, 7);
    try {
      const [iRes, uRes, rRes, mRes, bwRes] = await Promise.all([
        fetch('/api/inspections'),
        fetch('/api/users'),
        fetch('/api/delete-request'),
        fetch(`/api/save-meter?month=${todayYM}`),
        fetch('/api/building-meter-weeks'),
      ]);
      const [insp, ud, rd, md, bwd] = await Promise.all(
        [iRes, uRes, rRes, mRes, bwRes].map(r => r.json())
      );
      setDates(insp.dates || []);
      setDashUsers(ud.users || {});
      setPending(rd.requests || []);
      setMeterData(md || { days: {} });
      setBmWeeks(bwd.weeks || []);
    } catch (e) {
      setDashErr(String(e.message || e));
    } finally {
      setDashLoading(false);
    }
  };

  const loadUsers = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else { setUsers(d.users || {}); setAdmins(d.admins || []); } })
      .catch(e => setErr(String(e.message || e)));
  };

  useEffect(() => {
    if (isAdmin && view === 'dashboard' && dates === null && !dashLoading) loadDashboard();
  }, [isAdmin, view]);

  useEffect(() => {
    if (isAdmin && view === 'users' && users === null) loadUsers();
  }, [isAdmin, view]);

  const setRole = async (targetEmail, role) => {
    if (!targetEmail) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim().toLowerCase(), role }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'บันทึกไม่สำเร็จ'); return; }
      setUsers(d.users || {}); setEmail('');
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const handleAction = async (req, action) => {
    setApproving(req.id);
    try {
      const res = await fetch('/api/delete-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, action }),
      });
      if (res.ok) setPending(prev => prev.filter(r => r.id !== req.id));
    } catch {}
    finally { setApproving(null); }
  };

  const togglePM = (type) => setExpandedPM(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  // ── computed ──
  const pmData = useMemo(() => {
    if (!dates) return null;
    return {
      emergency: pmSummary(dates, 'emergency'),
      smoke:     pmSummary(dates, 'smoke'),
      exit:      pmSummary(dates, 'exit'),
    };
  }, [dates]);

  const pmDetails = useMemo(() => {
    if (!dates) return null;
    const r = {};
    for (const { type } of PM_TYPES) r[type] = pmBuildingDetails(dates, type);
    return r;
  }, [dates]);

  const fpgStatus = useMemo(() => {
    if (!dates) return null;
    const lastSat = lastSaturdayISO();
    const lastFpg = dates.filter(d => d.type === 'fpg').map(d => d.date).sort().reverse()[0] || null;
    return { done: !!(lastFpg && lastFpg >= lastSat), lastDate: lastFpg, targetDate: lastSat };
  }, [dates]);

  const meterStatus = useMemo(() => {
    if (!meterData) return null;
    const dayKey = today.slice(8, 10);
    return { done: meterData.days?.[dayKey] != null };
  }, [meterData, today]);

  const bmStatus = useMemo(() => {
    if (!bmWeeks) return null;
    const thisWeek = currentISOWeek();
    const prevWeek = prevISOWeek();
    const thisWeekDone = bmWeeks.includes(thisWeek);
    const prevWeekDone = bmWeeks.includes(prevWeek);
    const isFriday = new Date().getDay() === 5;
    const missingLastWeek = !prevWeekDone;
    const shouldAlert = missingLastWeek || (isFriday && !thisWeekDone);
    return { thisWeekDone, prevWeekDone, thisWeek, prevWeek, isFriday, missingLastWeek, shouldAlert };
  }, [bmWeeks]);

  const userCount    = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] === 'user').length : 0;
  const visitorCount = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] !== 'user').length : 0;
  const totalOverdue = pmData ? PM_TYPES.reduce((s, { type }) => s + pmData[type].overdue, 0) : 0;

  if (status === 'loading') return <main className="msg">กำลังโหลด...</main>;
  if (!isAdmin) return (
    <main className="msg">
      <p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
      <button className="link" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
      <style jsx>{`.msg{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#64748b}.link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:14px}`}</style>
    </main>
  );

  const userEmails    = users ? Object.keys(users).filter(e => users[e] === 'user').sort()  : [];
  const visitorEmails = users ? Object.keys(users).filter(e => users[e] !== 'user').sort() : [];

  const QUICK = [
    { icon: '🚒⚡', label: 'Fire Pump & Generator', href: '/session' },
    { icon: '💡',   label: 'Emergency Light',        href: `/form/emergency?date=${today}` },
    { icon: '🚨',   label: 'Smoke Detector',         href: `/form/smoke?date=${today}` },
    { icon: '🚪',   label: 'Exit Sign',              href: `/form/exit?date=${today}` },
    { icon: '⚡',   label: 'Meter กฟน.',             href: '/meter' },
    { icon: '🏢',   label: 'Meter อาคาร',            href: '/building-meter' },
    { icon: '📊',   label: 'รายงาน',                 href: '/?view=report' },
    { icon: '👥',   label: 'จัดการผู้ใช้',           href: null, action: () => setView('users') },
  ];

  // chip helper
  function pmChip(s) {
    if (!s) return <span className="chip chip--loading">กำลังโหลด…</span>;
    if (s.overdue > 0) return <span className="chip chip--overdue">🔴 {s.overdue} เกินกำหนด</span>;
    if (s.due     > 0) return <span className="chip chip--due">🟡 {s.due} ใกล้ครบ</span>;
    if (s.never   > 0) return <span className="chip chip--never">⚫ {s.never} ยังไม่เคยบันทึก</span>;
    return <span className="chip chip--ok">✅ ทุกอาคารปกติ</span>;
  }

  // action rows — FPG / Meter กฟน. / Meter อาคาร
  const SIMPLE_ROWS = [
    {
      icon: '🚒⚡', label: 'Fire Pump & Generator', schedule: 'ทุกวันเสาร์',
      done: fpgStatus?.done ?? null,
      detail: !fpgStatus ? '…'
        : fpgStatus.done
          ? `ล่าสุด ${fmtDate(fpgStatus.lastDate)}`
          : `ยังไม่ทำ (เสาร์ ${fmtDate(fpgStatus.targetDate)})`,
      href: '/session',
    },
    {
      icon: '⚡', label: 'Meter กฟน.', schedule: 'ทุกวัน',
      done: meterStatus?.done ?? null,
      detail: !meterStatus ? '…'
        : meterStatus.done ? 'บันทึกแล้ววันนี้' : `ยังไม่บันทึกวันนี้ (${fmtDate(today)})`,
      href: '/meter',
    },
    {
      icon: '🏢', label: 'Meter อาคาร', schedule: 'ทุกวันศุกร์',
      done: bmStatus ? !bmStatus.shouldAlert : null,
      detail: !bmStatus ? '…'
        : !bmStatus.shouldAlert
          ? (bmStatus.thisWeekDone ? `บันทึกแล้ว ${bmStatus.thisWeek}` : 'สัปดาห์ที่แล้วครบแล้ว')
          : bmStatus.missingLastWeek
            ? `ยังไม่บันทึกสัปดาห์ที่แล้ว (${bmStatus.prevWeek})`
            : `วันนี้ศุกร์ ยังไม่บันทึกสัปดาห์นี้ (${bmStatus.thisWeek})`,
      href: '/building-meter',
    },
  ];

  const pendingCount = SIMPLE_ROWS.filter(r => r.done === false).length
    + PM_TYPES.filter(({ type }) => pmData && (pmData[type].overdue > 0 || pmData[type].due > 0)).length;

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main adm-main">

        <header className="adm-hdr">
          <div className="adm-hdr-left">
            {view !== 'dashboard' && (
              <button className="adm-back" onClick={() => setView('dashboard')}>‹</button>
            )}
            <div>
              <h1 className="adm-title">
                {view === 'dashboard' && '🏠 ภาพรวมระบบ'}
                {view === 'users' && '👥 จัดการผู้ใช้'}
              </h1>
              <p className="adm-sub">
                {view === 'dashboard' && 'Admin Dashboard · Facility Inspection'}
                {view === 'users' && 'กำหนดสิทธิ์การใช้งาน'}
              </p>
            </div>
          </div>
          {view === 'dashboard' && (
            <button className="adm-refresh" onClick={loadDashboard} disabled={dashLoading} title="รีเฟรชข้อมูล">
              <span style={{ display:'inline-block', animation: dashLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            </button>
          )}
        </header>

        {view === 'dashboard' && (
          <div className="dash">
            {dashErr && <p className="dash-err">{dashErr}</p>}

            {/* Stat cards */}
            <div className="stat-row">
              <div className="stat-card sc--blue">
                <div className="sc-num">{dashUsers ? userCount : '…'}</div>
                <div className="sc-lbl">ผู้ใช้งาน</div>
                <div className="sc-icon">👥</div>
              </div>
              <div className="stat-card sc--purple">
                <div className="sc-num">{dashUsers ? visitorCount : '…'}</div>
                <div className="sc-lbl">ผู้เยี่ยมชม</div>
                <div className="sc-icon">👁</div>
              </div>
              <div className="stat-card sc--orange">
                <div className="sc-num">{dates ? pendingCount : '…'}</div>
                <div className="sc-lbl">งานที่ยังไม่เสร็จ</div>
                <div className="sc-icon">⏳</div>
              </div>
              <div className="stat-card sc--red">
                <div className="sc-num">{pmData ? totalOverdue : '…'}</div>
                <div className="sc-lbl">อาคารเกินกำหนด PM</div>
                <div className="sc-icon">🔴</div>
              </div>
            </div>

            {/* Pending actions */}
            <section className="dash-sec">
              <div className="dash-sec-hd">
                รายการที่ต้องดำเนินการ
                {pendingCount > 0 && <span className="badge-pill">{pendingCount}</span>}
              </div>
              <div className="action-table">

                {/* Simple rows: FPG / Meter กฟน. / Meter อาคาร */}
                {SIMPLE_ROWS.map(row => (
                  <div key={row.label}
                    className={`action-row${row.done === false ? ' action-row--alert' : ''}`}>
                    <span className="ar-icon">{row.icon}</span>
                    <div className="ar-info">
                      <span className="ar-name">{row.label}</span>
                      <span className="ar-schedule">{row.schedule}</span>
                    </div>
                    <div className="ar-status">
                      {row.done === null
                        ? <span className="chip chip--loading">กำลังโหลด…</span>
                        : row.done
                          ? <span className="chip chip--ok">✅ {row.detail}</span>
                          : <span className="chip chip--overdue">⚠️ {row.detail}</span>
                      }
                    </div>
                    <button className="ar-btn" onClick={() => router.push(row.href)}>บันทึก ›</button>
                  </div>
                ))}

                {/* PM rows: Emergency / Smoke / Exit — expandable */}
                {PM_TYPES.map(({ type, icon, label }) => {
                  const s     = pmData?.[type];
                  const det   = pmDetails?.[type];
                  const hasProblems = det && (det.overdue.length + det.due.length + det.never.length > 0);
                  const isExp = expandedPM.has(type);
                  const isAlert = s && (s.overdue > 0 || s.due > 0);

                  return (
                    <Fragment key={type}>
                      <div className={`action-row${isAlert ? ' action-row--alert' : ''}`}>
                        <span className="ar-icon">{icon}</span>
                        <div className="ar-info">
                          <span className="ar-name">{label}</span>
                          <span className="ar-schedule">ทุก {FREQ_MONTHS} เดือน · {BUILDINGS.length} อาคาร</span>
                        </div>
                        <div className="ar-status">
                          {pmChip(s)}
                          {hasProblems && (
                            <button className="ar-expand" onClick={() => togglePM(type)}
                              title={isExp ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}>
                              {isExp ? '▲' : '▼'}
                            </button>
                          )}
                        </div>
                        <button className="ar-btn" onClick={() => router.push(`/form/${type}?date=${today}`)}>
                          บันทึก ›
                        </button>
                      </div>

                      {isExp && det && hasProblems && (
                        <div className="pm-detail-panel">
                          {det.overdue.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--overdue">🔴 เกินกำหนด ({det.overdue.length})</span>
                              <div className="pm-tags">
                                {det.overdue.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--overdue"
                                    title={`ครั้งล่าสุด: ${fmtDate(b.lastDate)} · เกินมา ${b.daysOver} วัน`}>
                                    {b.building}
                                    <em>+{b.daysOver}ว.</em>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {det.due.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--due">🟡 ใกล้ครบ ({det.due.length})</span>
                              <div className="pm-tags">
                                {det.due.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--due"
                                    title={`ครั้งล่าสุด: ${fmtDate(b.lastDate)} · อีก ${b.daysLeft} วัน`}>
                                    {b.building}
                                    <em>{b.daysLeft}ว.</em>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {det.never.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--never">⚫ ยังไม่เคยบันทึก ({det.never.length})</span>
                              <div className="pm-tags">
                                {det.never.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--never">{b.building}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </section>

            {/* Delete requests */}
            {pendingReqs !== null && pendingReqs.length > 0 && (
              <section className="dash-sec">
                <div className="dash-sec-hd">
                  📋 คำขอลบรอดำเนินการ
                  <span className="badge-pill">{pendingReqs.length}</span>
                </div>
                <div className="req-list">
                  {pendingReqs.map(req => (
                    <div key={req.id} className="req-row">
                      <div className="req-meta">
                        <span className={`req-type-tag rt--${req.type}`}>{req.type}</span>
                        <span className="req-date">{req.date}</span>
                        {req.building && <span className="req-bldg">{req.building}{req.floor ? ` ชั้น ${req.floor}` : ''}</span>}
                      </div>
                      <div className="req-reason">"{req.reason}"</div>
                      <div className="req-foot">
                        <span className="req-by">{req.requestedBy}</span>
                        <div className="req-btns">
                          <button className="req-btn rb--approve" disabled={approving === req.id}
                            onClick={() => handleAction(req, 'approve')}>
                            {approving === req.id ? '⏳' : '✓ อนุมัติ'}
                          </button>
                          <button className="req-btn rb--reject" disabled={approving === req.id}
                            onClick={() => handleAction(req, 'reject')}>
                            ✕ ปฏิเสธ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick links */}
            <section className="dash-sec">
              <div className="dash-sec-hd">ทางลัดระบบ</div>
              <div className="quick-grid">
                {QUICK.map(({ icon, label, href, action }) => (
                  <button key={label} className="quick-card"
                    onClick={() => action ? action() : router.push(href)}>
                    <span className="qc-icon">{icon}</span>
                    <span className="qc-label">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* User Management */}
        {view === 'users' && (
          <div className="users-wrap">
            <section className="section">
              {err && <p className="u-err">{err}</p>}
              <div className="group">
                <div className="group-hd">ผู้ดูแลระบบ (Admin)</div>
                {admins.length === 0 && <p className="empty">— ยังไม่ได้ตั้ง ADMIN_EMAILS —</p>}
                {admins.map(a => (
                  <div key={a} className="row">
                    <span className="email">{a}</span>
                    <span className="tag tag--admin">admin</span>
                  </div>
                ))}
              </div>
              <div className="group">
                <div className="group-hd">ผู้ใช้งาน ({users === null ? '...' : userEmails.length})</div>
                {users === null && <p className="empty">กำลังโหลด...</p>}
                {users && userEmails.length === 0 && <p className="empty">— ยังไม่มีผู้ใช้งาน —</p>}
                {userEmails.map(e => (
                  <div key={e} className="row">
                    <span className="email">{e}</span>
                    <span className="tag tag--user">ผู้ใช้งาน</span>
                    <button className="btn-sm" disabled={busy} onClick={() => setRole(e, 'visitor')}>↓ ผู้เยี่ยมชม</button>
                  </div>
                ))}
              </div>
              <div className="group">
                <div className="group-hd">ผู้เยี่ยมชม ({users === null ? '...' : visitorEmails.length})</div>
                {users === null && <p className="empty">กำลังโหลด...</p>}
                {users && visitorEmails.length === 0 && <p className="empty">— ยังไม่มีผู้เยี่ยมชม —</p>}
                {visitorEmails.map(e => (
                  <div key={e} className="row">
                    <span className="email">{e}</span>
                    <span className="tag tag--visitor">ผู้เยี่ยมชม</span>
                    <button className="btn-sm btn-sm--promote" disabled={busy} onClick={() => setRole(e, 'user')}>↑ ผู้ใช้งาน</button>
                  </div>
                ))}
              </div>
              <div className="add-box">
                <label className="lbl">เพิ่มอีเมลล่วงหน้า (ยังไม่เคย login)</label>
                <div className="add-row">
                  <input className="inp" type="email" placeholder="name@gmail.com" value={email}
                    onChange={e => setEmail(e.target.value)} />
                  <button className="btn" disabled={busy || !email.trim()} onClick={() => setRole(email, 'user')}>
                    + ผู้ใช้งาน
                  </button>
                </div>
                <p className="hint">เปลี่ยนสิทธิ์แล้วผู้ใช้ต้องออกแล้วเข้าระบบใหม่</p>
              </div>
            </section>
          </div>
        )}

      </main>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .adm-main { background: #f1f5f9; min-height: 100dvh; }

        /* ── Header ── */
        .adm-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 28px 18px;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .adm-hdr-left { display: flex; align-items: center; gap: 12px; }
        .adm-back { background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .adm-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .adm-sub   { font-size: 12px; color: #64748b; margin: 2px 0 0; }
        .adm-refresh {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 10px; width: 38px; height: 38px; cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center; transition: background .12s;
        }
        .adm-refresh:hover { background: #e2e8f0; }
        .adm-refresh:disabled { opacity: .5; cursor: default; }

        /* ── Dashboard ── */
        .dash { padding: 24px 28px; display: flex; flex-direction: column; gap: 28px; max-width: 1100px; }
        .dash-err { color: #b91c1c; background: #fee2e2; border-radius: 10px; padding: 10px 14px; font-size: 13px; }

        /* Stat cards */
        .stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .stat-card {
          position: relative; overflow: hidden; border-radius: 16px; padding: 20px 20px 16px;
          display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.07);
        }
        .sc--blue   { background: linear-gradient(135deg,#dbeafe,#eff6ff); border: 1px solid #93c5fd; }
        .sc--purple { background: linear-gradient(135deg,#ede9fe,#f5f3ff); border: 1px solid #c4b5fd; }
        .sc--orange { background: linear-gradient(135deg,#fef3c7,#fffbeb); border: 1px solid #fcd34d; }
        .sc--red    { background: linear-gradient(135deg,#fee2e2,#fff5f5); border: 1px solid #fca5a5; }
        /* hardcoded dark so gradient bg never fights CSS vars */
        .sc-num  { font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1; }
        .sc-lbl  { font-size: 12px; font-weight: 600; color: #475569; }
        .sc-icon { position: absolute; right: 14px; top: 14px; font-size: 28px; opacity: .18; }

        /* Section label */
        .dash-sec { display: flex; flex-direction: column; gap: 12px; }
        .dash-sec-hd {
          font-size: 14px; font-weight: 800; color: #0f172a;
          display: flex; align-items: center; gap: 8px;
        }
        .badge-pill {
          background: #ef4444; color: #fff;
          font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 8px; line-height: 1.6;
        }

        /* Action table */
        .action-table {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05);
        }
        .action-row {
          display: grid; grid-template-columns: 36px 1fr auto auto;
          align-items: center; gap: 14px; padding: 14px 18px;
          border-top: 1px solid #f1f5f9; transition: background .1s;
        }
        .action-row:first-child { border-top: none; }
        .action-row:hover { background: #f8fafc; }
        .action-row--alert { background: #fffbeb !important; }
        .action-row--alert:hover { background: #fef9e4 !important; }
        .action-row--alert .ar-name { color: #92400e; }
        .action-row--alert .ar-schedule { color: #b45309; }

        .ar-icon     { font-size: 22px; text-align: center; flex-shrink: 0; }
        .ar-info     { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ar-name     { font-size: 13px; font-weight: 700; color: #1e293b; }
        .ar-schedule { font-size: 11px; color: #64748b; }
        .ar-status   { display: flex; align-items: center; gap: 6px; }
        .ar-expand {
          background: none; border: 1px solid #cbd5e1; border-radius: 6px;
          padding: 2px 7px; font-size: 10px; color: #64748b; cursor: pointer;
          transition: background .1s;
        }
        .ar-expand:hover { background: #f1f5f9; }
        .ar-btn {
          background: #f1f5f9; border: 1px solid #cbd5e1;
          border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600;
          color: #2563eb; cursor: pointer; white-space: nowrap; transition: background .12s;
          flex-shrink: 0;
        }
        .ar-btn:hover { background: #dbeafe; border-color: #93c5fd; }

        /* Chips — all hardcoded for contrast */
        .chip {
          font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent;
        }
        .chip--ok      { background: #dcfce7; color: #14532d; border-color: #86efac; }
        .chip--overdue { background: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }
        .chip--due     { background: #fef3c7; color: #78350f; border-color: #fcd34d; }
        .chip--never   { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
        .chip--loading { background: #f8fafc; color: #94a3b8; font-style: italic; border-color: #e2e8f0; }

        /* PM expandable details */
        .pm-detail-panel {
          padding: 14px 18px 16px 72px;
          background: #f8fafc; border-top: 1px solid #e2e8f0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .pm-group { display: flex; flex-direction: column; gap: 6px; }
        .pm-group-lbl { font-size: 11px; font-weight: 700; }
        .pm-gl--overdue { color: #991b1b; }
        .pm-gl--due     { color: #92400e; }
        .pm-gl--never   { color: #475569; }
        .pm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pm-tag {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600; border-radius: 8px;
          padding: 4px 10px; cursor: default;
          border: 1px solid transparent;
        }
        .pm-tag em { font-style: normal; font-size: 10px; opacity: .8; }
        .pm-tag--overdue { background: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }
        .pm-tag--due     { background: #fef3c7; color: #78350f; border-color: #fcd34d; }
        .pm-tag--never   { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }

        /* Delete requests */
        .req-list { display: flex; flex-direction: column; gap: 10px; }
        .req-row {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .req-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .req-type-tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .rt--emergency { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
        .rt--smoke     { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .rt--exit      { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
        .req-date   { font-size: 12px; font-weight: 600; color: #334155; }
        .req-bldg   { font-size: 12px; color: #64748b; }
        .req-reason { font-size: 13px; color: #475569; font-style: italic; }
        .req-foot   { display: flex; align-items: center; justify-content: space-between; }
        .req-by     { font-size: 11px; color: #94a3b8; }
        .req-btns   { display: flex; gap: 6px; }
        .req-btn    { border: none; border-radius: 9px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .12s; }
        .req-btn:disabled { opacity: .5; cursor: default; }
        .rb--approve { background: #dcfce7; color: #14532d; }
        .rb--approve:hover:not(:disabled) { background: #bbf7d0; }
        .rb--reject  { background: #fee2e2; color: #7f1d1d; }
        .rb--reject:hover:not(:disabled)  { background: #fecaca; }

        /* Quick links */
        .quick-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .quick-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          cursor: pointer; transition: all .12s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .quick-card:hover { background: #f8fafc; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .qc-icon  { font-size: 26px; }
        .qc-label { font-size: 12px; font-weight: 600; color: #475569; text-align: center; line-height: 1.3; }

        /* User management */
        .users-wrap { padding: 24px 28px; max-width: 640px; }
        .section { display: flex; flex-direction: column; gap: 14px; }
        .u-err { color: #b91c1c; font-size: 13px; background: #fee2e2; border-radius: 8px; padding: 8px 12px; margin: 0; }
        .add-box { display: flex; flex-direction: column; gap: 6px; }
        .lbl { font-size: 12px; font-weight: 700; color: #64748b; }
        .add-row { display: flex; gap: 8px; }
        .inp { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #fff; color: #0f172a; font-size: 14px; }
        .btn { padding: 10px 16px; border-radius: 10px; border: none; background: #2563eb; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .btn:disabled { opacity: .5; }
        .hint { font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6; }
        .group { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
        .group-hd { padding: 10px 14px; background: #f8fafc; font-size: 13px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
        .empty { padding: 12px 14px; font-size: 13px; color: #94a3b8; margin: 0; }
        .row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid #f1f5f9; }
        .email { flex: 1; font-size: 13px; color: #1e293b; word-break: break-all; }
        .tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; white-space: nowrap; border: 1px solid transparent; }
        .tag--admin   { background: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }
        .tag--user    { background: #dcfce7; color: #14532d; border-color: #86efac; }
        .tag--visitor { background: #f1f5f9; color: #64748b; border-color: #cbd5e1; }
        .btn-sm { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn-sm--promote { background: #dcfce7; border-color: #86efac; color: #14532d; }
        .btn-sm:disabled { opacity: .5; }
      `}</style>
    </div>
  );
}
