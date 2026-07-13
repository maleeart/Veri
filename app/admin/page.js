'use client';

import { useEffect, useState, useMemo } from 'react';
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

function getStatus(lastDate) {
  if (!lastDate) return 'never';
  const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
  const limit = FREQ_MONTHS * 30;
  if (days > limit) return 'overdue';
  if (days > limit - 14) return 'due';
  return 'ok';
}

function pmSummary(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const c = { overdue: 0, due: 0, never: 0, ok: 0 };
  for (const b of BUILDINGS) c[getStatus(byB[b])]++;
  return c;
}

// คืน YYYY-MM-DD ของวันเสาร์ล่าสุด
function lastSaturdayISO() {
  const d = new Date();
  const daysBack = d.getDay() === 6 ? 0 : d.getDay() + 1;
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

// ISO week string เช่น "2026-W28"
function currentISOWeek() {
  const d = new Date();
  const thu = new Date(d);
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);

  const [view, setView] = useState('dashboard');

  // Dashboard state
  const [dates, setDates]         = useState(null);
  const [dashUsers, setDashUsers] = useState(null);
  const [pendingReqs, setPending] = useState(null);
  const [meterData, setMeterData] = useState(null);  // { days: { '13': {...} } }
  const [bmWeeks, setBmWeeks]     = useState(null);  // ['2026-W28', ...]
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
      setUsers(d.users || {});
      setEmail('');
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

  // ── computed statuses ──
  const pmData = useMemo(() => {
    if (!dates) return null;
    return {
      emergency: pmSummary(dates, 'emergency'),
      smoke:     pmSummary(dates, 'smoke'),
      exit:      pmSummary(dates, 'exit'),
    };
  }, [dates]);

  const fpgStatus = useMemo(() => {
    if (!dates) return null;
    const lastSat = lastSaturdayISO();
    const lastFpg = dates.filter(d => d.type === 'fpg').map(d => d.date).sort().reverse()[0] || null;
    const done = lastFpg && lastFpg >= lastSat;
    return { done, lastDate: lastFpg, targetDate: lastSat };
  }, [dates]);

  const meterStatus = useMemo(() => {
    if (!meterData) return null;
    const dayKey = today.slice(8, 10); // '13'
    const done = meterData.days?.[dayKey] != null;
    return { done, date: today };
  }, [meterData, today]);

  const bmStatus = useMemo(() => {
    if (!bmWeeks) return null;
    const thisWeek = currentISOWeek();
    const done = bmWeeks.includes(thisWeek);
    const lastWeek = bmWeeks[0] || null;
    return { done, thisWeek, lastWeek };
  }, [bmWeeks]);

  const userCount    = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] === 'user').length : 0;
  const visitorCount = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] !== 'user').length : 0;
  const totalOverdue = pmData ? ['emergency','smoke','exit'].reduce((s, t) => s + pmData[t].overdue, 0) : 0;

  if (status === 'loading') return <main className="msg">กำลังโหลด...</main>;
  if (!isAdmin) return (
    <main className="msg">
      <p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
      <button className="link" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
      <style jsx>{`.msg{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--ink-muted)}.link{background:none;border:none;color:var(--accent);cursor:pointer;font-size:14px}`}</style>
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

  // Helper: render PM status chip for Emergency/Smoke/Exit
  function pmChip(s) {
    if (!s) return <span className="chip chip--loading">กำลังโหลด…</span>;
    if (s.overdue > 0) return <span className="chip chip--overdue">🔴 {s.overdue} อาคารเกินกำหนด</span>;
    if (s.due     > 0) return <span className="chip chip--due">🟡 {s.due} อาคารใกล้ครบ</span>;
    if (s.never   > 0) return <span className="chip chip--never">⚫ {s.never} ยังไม่เคยบันทึก</span>;
    return <span className="chip chip--ok">🟢 ทุกอาคารปกติ</span>;
  }

  // Rows for pending-actions table
  const ACTION_ROWS = [
    {
      icon: '🚒⚡', label: 'Fire Pump & Generator', schedule: 'ทุกวันเสาร์',
      status: fpgStatus === null ? null : fpgStatus.done,
      detail: fpgStatus === null ? '…'
        : fpgStatus.done
          ? `ล่าสุด ${fmtDate(fpgStatus.lastDate)}`
          : `ยังไม่ทำ (เสาร์ ${fmtDate(fpgStatus.targetDate)})`,
      href: '/session',
    },
    {
      icon: '⚡', label: 'Meter กฟน.', schedule: 'ทุกวัน',
      status: meterStatus === null ? null : meterStatus.done,
      detail: meterStatus === null ? '…'
        : meterStatus.done ? `บันทึกแล้ววันนี้` : `ยังไม่บันทึกวันนี้ (${fmtDate(today)})`,
      href: '/meter',
    },
    {
      icon: '🏢', label: 'Meter อาคาร', schedule: 'ทุกวันศุกร์',
      status: bmStatus === null ? null : bmStatus.done,
      detail: bmStatus === null ? '…'
        : bmStatus.done
          ? `บันทึกแล้ว ${bmStatus.thisWeek}`
          : `ยังไม่บันทึกสัปดาห์นี้ (${bmStatus.thisWeek})`,
      href: '/building-meter',
    },
    {
      icon: '💡', label: 'Emergency Light', schedule: `ทุก ${FREQ_MONTHS} เดือน`,
      status: pmData ? (pmData.emergency.overdue === 0 && pmData.emergency.due === 0) : null,
      chip: pmData ? pmChip(pmData.emergency) : null,
      href: `/form/emergency?date=${today}`,
    },
    {
      icon: '🚨', label: 'Smoke Detector', schedule: `ทุก ${FREQ_MONTHS} เดือน`,
      status: pmData ? (pmData.smoke.overdue === 0 && pmData.smoke.due === 0) : null,
      chip: pmData ? pmChip(pmData.smoke) : null,
      href: `/form/smoke?date=${today}`,
    },
    {
      icon: '🚪', label: 'Exit Sign', schedule: `ทุก ${FREQ_MONTHS} เดือน`,
      status: pmData ? (pmData.exit.overdue === 0 && pmData.exit.due === 0) : null,
      chip: pmData ? pmChip(pmData.exit) : null,
      href: `/form/exit?date=${today}`,
    },
  ];

  const pendingCount = ACTION_ROWS.filter(r => r.status === false).length;

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
              <span style={{ display: 'inline-block', animation: dashLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            </button>
          )}
        </header>

        {/* ── Dashboard ── */}
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

            {/* Pending actions — all systems */}
            <section className="dash-sec">
              <div className="dash-sec-hd">
                รายการที่ต้องดำเนินการ
                {pendingCount > 0 && <span className="badge-pill">{pendingCount}</span>}
              </div>
              <div className="action-table">
                {ACTION_ROWS.map(row => {
                  const isDone    = row.status === true;
                  const isNotDone = row.status === false;
                  const isLoading = row.status === null;
                  return (
                    <div key={row.label} className={`action-row${isNotDone ? ' action-row--alert' : ''}`}>
                      <span className="ar-icon">{row.icon}</span>
                      <div className="ar-info">
                        <span className="ar-name">{row.label}</span>
                        <span className="ar-schedule">{row.schedule}</span>
                      </div>
                      <div className="ar-status">
                        {isLoading && <span className="chip chip--loading">กำลังโหลด…</span>}
                        {row.chip
                          ? row.chip
                          : !isLoading && (
                            isDone
                              ? <span className="chip chip--ok">✅ {row.detail}</span>
                              : <span className="chip chip--overdue">⚠️ {row.detail}</span>
                          )
                        }
                      </div>
                      <button className="ar-btn" onClick={() => router.push(row.href)}>
                        บันทึก ›
                      </button>
                    </div>
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

        {/* ── User Management ── */}
        {view === 'users' && (
          <div className="users-wrap">
            <section className="section">
              {err && <p className="err">{err}</p>}
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

        .adm-main { background: var(--bg-base, #f5f7fa); }

        .adm-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 28px 20px;
          border-bottom: 1px solid var(--border-hairline);
          background: var(--bg-surface);
          position: sticky; top: 0; z-index: 10;
        }
        .adm-hdr-left { display: flex; align-items: center; gap: 12px; }
        .adm-back { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .adm-title { font-size: 20px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .adm-sub   { font-size: 12px; color: var(--ink-muted); margin: 2px 0 0; }
        .adm-refresh {
          background: var(--bg-surface-raised); border: 1px solid var(--border-hairline);
          border-radius: 10px; width: 38px; height: 38px; cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center; transition: background 0.12s;
        }
        .adm-refresh:hover { background: var(--border-hairline); }
        .adm-refresh:disabled { opacity: 0.5; cursor: default; }

        .dash { padding: 24px 28px; display: flex; flex-direction: column; gap: 28px; max-width: 1100px; }
        .dash-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; font-size: 13px; }

        /* Stat cards */
        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .stat-card {
          position: relative; overflow: hidden; border-radius: 16px; padding: 20px 20px 16px;
          display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .sc--blue   { background: linear-gradient(135deg,#dbeafe,#eff6ff); border: 1px solid #bfdbfe; }
        .sc--purple { background: linear-gradient(135deg,#ede9fe,#f5f3ff); border: 1px solid #ddd6fe; }
        .sc--orange { background: linear-gradient(135deg,#fef3c7,#fffbeb); border: 1px solid #fde68a; }
        .sc--red    { background: linear-gradient(135deg,#fee2e2,#fff5f5); border: 1px solid #fecaca; }
        .sc-num  { font-size: 32px; font-weight: 900; color: var(--ink-primary); line-height: 1; }
        .sc-lbl  { font-size: 12px; font-weight: 600; color: var(--ink-secondary); }
        .sc-icon { position: absolute; right: 14px; top: 14px; font-size: 28px; opacity: 0.2; }

        /* Section */
        .dash-sec { display: flex; flex-direction: column; gap: 12px; }
        .dash-sec-hd {
          font-size: 14px; font-weight: 800; color: var(--ink-primary);
          display: flex; align-items: center; gap: 8px;
        }
        .badge-pill {
          background: var(--status-fail, #ef4444); color: #fff;
          font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 8px; line-height: 1.5;
        }

        /* Action table */
        .action-table {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        .action-row {
          display: grid;
          grid-template-columns: 36px 1fr auto auto;
          align-items: center; gap: 12px;
          padding: 14px 18px;
          border-top: 1px solid var(--border-hairline);
          transition: background 0.1s;
        }
        .action-row:first-child { border-top: none; }
        .action-row--alert { background: #fffbeb; }
        .action-row--alert:hover { background: #fef9e4; }
        .action-row:not(.action-row--alert):hover { background: var(--bg-surface-raised); }
        .ar-icon  { font-size: 22px; text-align: center; }
        .ar-info  { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ar-name  { font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .ar-schedule { font-size: 11px; color: var(--ink-muted); }
        .ar-status { display: flex; align-items: center; }
        .ar-btn {
          background: var(--bg-surface-raised); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600;
          color: var(--accent); cursor: pointer; white-space: nowrap; transition: background 0.12s;
        }
        .ar-btn:hover { background: rgba(37,99,235,0.08); }

        /* Chips */
        .chip {
          font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap;
        }
        .chip--ok      { background: #dcfce7; color: #166534; }
        .chip--overdue { background: #fee2e2; color: #991b1b; }
        .chip--due     { background: #fef3c7; color: #92400e; }
        .chip--never   { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-strong); }
        .chip--loading { background: var(--bg-surface-raised); color: var(--ink-muted); font-style: italic; }

        /* Delete requests */
        .req-list { display: flex; flex-direction: column; gap: 10px; }
        .req-row {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,.03);
        }
        .req-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .req-type-tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; background: var(--bg-surface-raised); color: var(--ink-secondary); border: 1px solid var(--border-strong); }
        .rt--emergency { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .rt--smoke     { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .rt--exit      { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
        .req-date { font-size: 12px; font-weight: 600; color: var(--ink-secondary); }
        .req-bldg { font-size: 12px; color: var(--ink-muted); }
        .req-reason { font-size: 13px; color: var(--ink-secondary); font-style: italic; }
        .req-foot { display: flex; align-items: center; justify-content: space-between; }
        .req-by   { font-size: 11px; color: var(--ink-muted); }
        .req-btns { display: flex; gap: 6px; }
        .req-btn  { border: none; border-radius: 9px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.12s; }
        .req-btn:disabled { opacity: 0.5; cursor: default; }
        .rb--approve { background: #dcfce7; color: #166534; }
        .rb--approve:hover:not(:disabled) { background: #bbf7d0; }
        .rb--reject  { background: #fee2e2; color: #991b1b; }
        .rb--reject:hover:not(:disabled)  { background: #fecaca; }

        /* Quick links */
        .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .quick-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 12px; background: var(--bg-surface);
          border: 1px solid var(--border-hairline); border-radius: 14px;
          cursor: pointer; transition: all 0.12s; box-shadow: 0 1px 3px rgba(0,0,0,.03);
        }
        .quick-card:hover { background: var(--bg-surface-raised); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .qc-icon  { font-size: 26px; }
        .qc-label { font-size: 12px; font-weight: 600; color: var(--ink-secondary); text-align: center; line-height: 1.3; }

        /* User management */
        .users-wrap { padding: 24px 28px; max-width: 640px; }
        .section { display: flex; flex-direction: column; gap: 14px; }
        .err { color: var(--status-fail); font-size: 13px; background: var(--status-fail-bg); border-radius: 8px; padding: 8px 12px; margin: 0; }
        .add-box { display: flex; flex-direction: column; gap: 6px; }
        .lbl { font-size: 12px; font-weight: 700; color: var(--ink-muted); }
        .add-row { display: flex; gap: 8px; }
        .inp { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border-strong); background: var(--bg-input); color: var(--ink-primary); font-size: 14px; }
        .btn { padding: 10px 16px; border-radius: 10px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .btn:disabled { opacity: 0.5; }
        .hint { font-size: 11px; color: var(--ink-muted); margin: 0; line-height: 1.6; }
        .group { background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 14px; overflow: hidden; }
        .group-hd { padding: 10px 14px; background: var(--bg-surface-raised); font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .empty { padding: 12px 14px; font-size: 13px; color: var(--ink-muted); margin: 0; }
        .row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border-hairline); }
        .email { flex: 1; font-size: 13px; color: var(--ink-primary); word-break: break-all; }
        .tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; white-space: nowrap; }
        .tag--admin   { background: rgba(240,70,70,0.12); color: var(--status-fail); border: 1px solid var(--status-fail); }
        .tag--user    { background: var(--status-pass-bg); color: var(--status-pass); border: 1px solid var(--status-pass); }
        .tag--visitor { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-strong); }
        .btn-sm { background: var(--bg-surface-raised); border: 1px solid var(--border-strong); color: var(--ink-secondary); border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn-sm--promote { background: var(--status-pass-bg); border-color: var(--status-pass); color: var(--status-pass); }
        .btn-sm:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
