'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidenav from '../components/Sidenav';

// PM logic (mirrored from page.js)
const BUILDINGS = [
  'ท.0006','ท.0007','ท.0008','ท.0009','ท.0010',
  'ท.0011','ท.0012','ท.0014','ท.0015','ท.0016',
  'ท.0017','ท.0018','ท.0019','ท.0020','ท.0022',
  'ท.0023','ท.0026','ท.0027','ท.0028','ท.0029',
  'ต.0017','ต.0019','ต.0025','ต.0026','ต.0031','ต.0033',
];
const FREQ_MONTHS = 3;

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

const PM_TYPES = [
  { type: 'emergency', icon: '💡', label: 'Emergency Light' },
  { type: 'smoke',     icon: '🚨', label: 'Smoke Detector' },
  { type: 'exit',      icon: '🚪', label: 'Exit Sign' },
];

const TYPE_LABEL = { emergency: 'Emergency', smoke: 'Smoke', exit: 'Exit', fpg: 'FPG' };

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [view, setView] = useState('dashboard'); // 'dashboard' | 'users'

  // ── Dashboard state ──
  const [dates, setDates]         = useState(null);
  const [dashUsers, setDashUsers] = useState(null);
  const [pendingReqs, setPending] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErr, setDashErr]     = useState('');
  const [approving, setApproving] = useState(null);

  // ── Users state ──
  const [users, setUsers]   = useState(null);
  const [admins, setAdmins] = useState([]);
  const [email, setEmail]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');

  const loadDashboard = async () => {
    if (dashLoading) return;
    setDashLoading(true); setDashErr('');
    try {
      const [iRes, uRes, rRes] = await Promise.all([
        fetch('/api/inspections'),
        fetch('/api/users'),
        fetch('/api/delete-request'),
      ]);
      const [insp, ud, rd] = await Promise.all([iRes.json(), uRes.json(), rRes.json()]);
      setDates(insp.dates || []);
      setDashUsers(ud.users || {});
      setPending(rd.requests || []);
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

  const pmData = useMemo(() => {
    if (!dates) return null;
    return {
      emergency: pmSummary(dates, 'emergency'),
      smoke:     pmSummary(dates, 'smoke'),
      exit:      pmSummary(dates, 'exit'),
    };
  }, [dates]);

  const userCount    = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] === 'user').length : 0;
  const visitorCount = dashUsers ? Object.keys(dashUsers).filter(e => dashUsers[e] !== 'user').length : 0;
  const totalOverdue = pmData ? PM_TYPES.reduce((s, { type }) => s + pmData[type].overdue, 0) : 0;

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
  const today = new Date().toISOString().slice(0, 10);

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

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main adm-main">

        {/* ── Header ── */}
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
              <div className="stat-card sc--orange" style={{ cursor: pendingReqs?.length ? 'pointer' : 'default' }}
                onClick={() => pendingReqs?.length && document.getElementById('pending-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <div className="sc-num">{pendingReqs ? pendingReqs.length : '…'}</div>
                <div className="sc-lbl">คำขอลบรอดำเนินการ</div>
                <div className="sc-icon">📋</div>
              </div>
              <div className="stat-card sc--red">
                <div className="sc-num">{pmData ? totalOverdue : '…'}</div>
                <div className="sc-lbl">อาคารเกินกำหนด PM</div>
                <div className="sc-icon">🔴</div>
              </div>
            </div>

            {/* PM Status */}
            <section className="dash-sec">
              <div className="dash-sec-hd">สถานะ PM อาคาร <span className="dash-sec-count">{BUILDINGS.length} อาคาร · ทุก {FREQ_MONTHS} เดือน</span></div>
              <div className="pm-grid">
                {PM_TYPES.map(({ type, icon, label }) => {
                  const s = pmData?.[type];
                  const total = BUILDINGS.length;
                  return (
                    <div key={type} className={`pm-card${s && s.overdue > 0 ? ' pm-card--alert' : ''}`}>
                      <div className="pm-hd">
                        <span className="pm-icon">{icon}</span>
                        <span className="pm-lbl">{label}</span>
                        <button className="pm-go" onClick={() => router.push(`/form/${type}?date=${today}`)}>บันทึก ›</button>
                      </div>
                      <div className="pm-stats">
                        <div className="pm-stat ps--overdue"><span>🔴</span><strong>{s ? s.overdue : '…'}</strong><span>เกินกำหนด</span></div>
                        <div className="pm-stat ps--due">    <span>🟡</span><strong>{s ? s.due     : '…'}</strong><span>ใกล้ครบ</span></div>
                        <div className="pm-stat ps--never">  <span>⚫</span><strong>{s ? s.never   : '…'}</strong><span>ไม่เคยบันทึก</span></div>
                        <div className="pm-stat ps--ok">     <span>🟢</span><strong>{s ? s.ok      : '…'}</strong><span>ปกติ</span></div>
                      </div>
                      {s && (
                        <div className="pm-bar-wrap">
                          <div className="pm-bar">
                            {s.overdue > 0 && <div className="pb pb--overdue" style={{ width: `${(s.overdue / total) * 100}%` }} />}
                            {s.due     > 0 && <div className="pb pb--due"     style={{ width: `${(s.due     / total) * 100}%` }} />}
                            {s.never   > 0 && <div className="pb pb--never"   style={{ width: `${(s.never   / total) * 100}%` }} />}
                            {s.ok      > 0 && <div className="pb pb--ok"      style={{ width: `${(s.ok      / total) * 100}%` }} />}
                          </div>
                          <span className="pm-bar-pct">{s ? Math.round((s.ok / total) * 100) : 0}% ปกติ</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Pending delete requests */}
            {pendingReqs !== null && (
              <section className="dash-sec" id="pending-section">
                <div className="dash-sec-hd">
                  รายการที่ต้องดำเนินการ
                  {pendingReqs.length > 0 && <span className="badge-pill">{pendingReqs.length}</span>}
                </div>
                {pendingReqs.length === 0 ? (
                  <div className="empty-box">✅ ไม่มีคำขอรอดำเนินการ</div>
                ) : (
                  <div className="req-list">
                    {pendingReqs.map(req => (
                      <div key={req.id} className="req-row">
                        <div className="req-meta">
                          <span className={`req-type-tag rt--${req.type}`}>{TYPE_LABEL[req.type] || req.type}</span>
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
                )}
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

        /* Header */
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
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .adm-refresh:hover { background: var(--border-hairline); }
        .adm-refresh:disabled { opacity: 0.5; cursor: default; }

        /* Dashboard wrapper */
        .dash { padding: 24px 28px; display: flex; flex-direction: column; gap: 28px; max-width: 1100px; }
        .dash-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; margin: 0; font-size: 13px; }

        /* Stat cards */
        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 900px) { .stat-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-card {
          position: relative; overflow: hidden;
          border-radius: 16px; padding: 20px 20px 16px;
          display: flex; flex-direction: column; gap: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .sc--blue   { background: linear-gradient(135deg,#dbeafe,#eff6ff); border: 1px solid #bfdbfe; }
        .sc--purple { background: linear-gradient(135deg,#ede9fe,#f5f3ff); border: 1px solid #ddd6fe; }
        .sc--orange { background: linear-gradient(135deg,#fef3c7,#fffbeb); border: 1px solid #fde68a; }
        .sc--red    { background: linear-gradient(135deg,#fee2e2,#fff5f5); border: 1px solid #fecaca; }
        .sc-num  { font-size: 32px; font-weight: 900; color: var(--ink-primary); line-height: 1; }
        .sc-lbl  { font-size: 12px; font-weight: 600; color: var(--ink-secondary); }
        .sc-icon { position: absolute; right: 14px; top: 14px; font-size: 28px; opacity: 0.25; }

        /* Section */
        .dash-sec { display: flex; flex-direction: column; gap: 12px; }
        .dash-sec-hd {
          font-size: 14px; font-weight: 800; color: var(--ink-primary);
          display: flex; align-items: center; gap: 8px;
        }
        .dash-sec-count { font-size: 11px; font-weight: 500; color: var(--ink-muted); }
        .badge-pill {
          background: var(--status-fail, #ef4444); color: #fff;
          font-size: 11px; font-weight: 700; border-radius: 20px;
          padding: 2px 8px; line-height: 1.5;
        }

        /* PM Grid */
        .pm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 900px) { .pm-grid { grid-template-columns: 1fr; } }
        .pm-card {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
          transition: box-shadow 0.15s;
        }
        .pm-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .pm-card--alert { border-color: #fecaca; }
        .pm-hd { display: flex; align-items: center; gap: 8px; }
        .pm-icon { font-size: 20px; }
        .pm-lbl { font-size: 13px; font-weight: 700; color: var(--ink-primary); flex: 1; }
        .pm-go {
          background: var(--bg-surface-raised); border: 1px solid var(--border-hairline);
          border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600;
          color: var(--accent); cursor: pointer; white-space: nowrap;
          transition: background 0.12s;
        }
        .pm-go:hover { background: rgba(37,99,235,0.08); }
        .pm-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .pm-stat {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px; border-radius: 10px;
          font-size: 12px;
        }
        .pm-stat strong { font-size: 16px; font-weight: 800; min-width: 20px; }
        .pm-stat span:last-child { color: var(--ink-muted); font-size: 11px; }
        .ps--overdue { background: #fff1f2; }
        .ps--due     { background: #fffbeb; }
        .ps--never   { background: var(--bg-surface-raised); }
        .ps--ok      { background: #f0fdf4; }
        .pm-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .pm-bar { flex: 1; height: 6px; border-radius: 6px; background: var(--bg-surface-raised); overflow: hidden; display: flex; }
        .pb { height: 100%; }
        .pb--overdue { background: #f87171; }
        .pb--due     { background: #fbbf24; }
        .pb--never   { background: #9ca3af; }
        .pb--ok      { background: #34d399; }
        .pm-bar-pct { font-size: 11px; font-weight: 600; color: var(--ink-muted); white-space: nowrap; }

        /* Pending requests */
        .empty-box {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 12px; padding: 20px; text-align: center;
          color: var(--ink-muted); font-size: 13px;
        }
        .req-list { display: flex; flex-direction: column; gap: 10px; }
        .req-row {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 14px; padding: 16px 18px;
          display: flex; flex-direction: column; gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,.03);
        }
        .req-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .req-type-tag {
          font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px;
        }
        .rt--emergency { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .rt--smoke     { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .rt--exit      { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .rt--fpg       { background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }
        .req-date { font-size: 12px; font-weight: 600; color: var(--ink-secondary); }
        .req-bldg { font-size: 12px; color: var(--ink-muted); }
        .req-reason { font-size: 13px; color: var(--ink-secondary); font-style: italic; }
        .req-foot { display: flex; align-items: center; justify-content: space-between; }
        .req-by { font-size: 11px; color: var(--ink-muted); }
        .req-btns { display: flex; gap: 6px; }
        .req-btn {
          border: none; border-radius: 9px; padding: 6px 14px;
          font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.12s;
        }
        .req-btn:disabled { opacity: 0.5; cursor: default; }
        .rb--approve { background: #dcfce7; color: #166534; }
        .rb--approve:hover:not(:disabled) { background: #bbf7d0; }
        .rb--reject  { background: #fee2e2; color: #991b1b; }
        .rb--reject:hover:not(:disabled)  { background: #fecaca; }

        /* Quick links */
        .quick-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }
        @media (max-width: 900px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
        .quick-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 12px; background: var(--bg-surface);
          border: 1px solid var(--border-hairline); border-radius: 14px;
          cursor: pointer; transition: all 0.12s;
          box-shadow: 0 1px 3px rgba(0,0,0,.03);
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
