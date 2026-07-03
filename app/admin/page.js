'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [view, setView] = useState('menu'); // 'menu' | 'users'
  const [users, setUsers] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadUsers = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else { setUsers(d.users || {}); setAdmins(d.admins || []); } })
      .catch(e => setErr(String(e.message || e)));
  };

  useEffect(() => { if (isAdmin && view === 'users' && users === null) loadUsers(); }, [isAdmin, view]);

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

  if (status === 'loading') return <main className="msg">กำลังโหลด...</main>;
  if (!isAdmin) return (
    <main className="msg">
      <p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
      <button className="link" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
      <style jsx>{`.msg{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--ink-muted)} .link{background:none;border:none;color:var(--accent);cursor:pointer;font-size:14px}`}</style>
    </main>
  );

  const userEmails    = users ? Object.keys(users).filter(e => users[e] === 'user').sort()  : [];
  const visitorEmails = users ? Object.keys(users).filter(e => users[e] !== 'user').sort() : [];

  return (
    <div className="root">
      <header className="hdr">
        <button className="back" onClick={() => view === 'menu' ? router.push('/') : setView('menu')}>‹</button>
        <div>
          <h1 className="title">
            {view === 'menu'  && '⚙️ ตั้งค่า'}
            {view === 'users' && '👥 จัดการผู้ใช้'}
          </h1>
          <p className="sub">
            {view === 'menu'  && 'ตั้งค่าระบบ'}
            {view === 'users' && 'กำหนดสิทธิ์การใช้งาน'}
          </p>
        </div>
      </header>

      {/* ── Menu ── */}
      {view === 'menu' && (
        <section className="section">
          <button className="menu-card" onClick={() => setView('users')}>
            <span className="menu-icon">👥</span>
            <div className="menu-body">
              <span className="menu-title">จัดการผู้ใช้</span>
              <span className="menu-sub">กำหนดสิทธิ์ผู้ใช้งาน / ผู้เยี่ยมชม</span>
            </div>
            <span className="menu-arrow">›</span>
          </button>
        </section>
      )}

      {/* ── User Management ── */}
      {view === 'users' && (
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
      )}

      <style jsx>{`
        .root { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; }
        .hdr { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-hairline); }
        .back { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .title { font-size: 18px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .sub { font-size: 12px; color: var(--ink-muted); margin: 2px 0 0; }
        .section { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .err { color: var(--status-fail); font-size: 13px; background: var(--status-fail-bg); border-radius: 8px; padding: 8px 12px; margin: 0; }

        /* Menu cards */
        .menu-card { display: flex; align-items: center; gap: 14px; width: 100%; padding: 18px 16px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 16px; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; transition: transform .1s; }
        .menu-card:active { transform: scale(0.98); }
        .menu-icon { font-size: 26px; flex-shrink: 0; }
        .menu-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .menu-title { font-size: 16px; font-weight: 700; color: var(--ink-primary); }
        .menu-sub { font-size: 12px; color: var(--ink-muted); }
        .menu-arrow { font-size: 22px; color: var(--ink-muted); line-height: 1; }

        /* User management */
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
        .tag--admin { background: rgba(240,70,70,0.12); color: var(--status-fail); border: 1px solid var(--status-fail); }
        .tag--user { background: var(--status-pass-bg); color: var(--status-pass); border: 1px solid var(--status-pass); }
        .tag--visitor { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-strong); }
        .btn-sm { background: var(--bg-surface-raised); border: 1px solid var(--border-strong); color: var(--ink-secondary); border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn-sm--promote { background: var(--status-pass-bg); border-color: var(--status-pass); color: var(--status-pass); }
        .btn-sm:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
