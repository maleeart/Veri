'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [users, setUsers] = useState(null);   // { email: 'user' }
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else { setUsers(d.users || {}); setAdmins(d.admins || []); } })
      .catch(e => setErr(String(e.message || e)));
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

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

  const userEmails = users ? Object.keys(users).sort() : [];

  return (
    <div className="root">
      <header className="hdr">
        <button className="back" onClick={() => router.push('/')}>‹</button>
        <div>
          <h1 className="title">⚙️ จัดการสิทธิ์ผู้ใช้</h1>
          <p className="sub">กำหนดว่าใครเป็นผู้ใช้งาน (บันทึกได้) หรือผู้เยี่ยมชม (ดู/โหลด)</p>
        </div>
      </header>

      <section className="section">
        {err && <p className="err">{err}</p>}

        {/* เพิ่มผู้ใช้งานด้วยอีเมล */}
        <div className="add-box">
          <label className="lbl">ให้สิทธิ์ &ldquo;ผู้ใช้งาน&rdquo; แก่อีเมล</label>
          <div className="add-row">
            <input className="inp" type="email" placeholder="name@gmail.com" value={email}
              onChange={e => setEmail(e.target.value)} />
            <button className="btn" disabled={busy || !email.trim()} onClick={() => setRole(email, 'user')}>
              + เพิ่ม
            </button>
          </div>
          <p className="hint">ผู้ที่ไม่อยู่ในรายการนี้จะเป็น &ldquo;ผู้เยี่ยมชม&rdquo; โดยอัตโนมัติ · เปลี่ยนสิทธิ์แล้วผู้ใช้ต้องออกแล้วเข้าระบบใหม่</p>
        </div>

        {/* admins (จาก env, แก้ที่นี่ไม่ได้) */}
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

        {/* ผู้ใช้งาน */}
        <div className="group">
          <div className="group-hd">ผู้ใช้งาน ({userEmails.length})</div>
          {users === null && <p className="empty">กำลังโหลด...</p>}
          {users && userEmails.length === 0 && <p className="empty">— ยังไม่มีผู้ใช้งาน —</p>}
          {userEmails.map(e => (
            <div key={e} className="row">
              <span className="email">{e}</span>
              <span className="tag tag--user">ผู้ใช้งาน</span>
              <button className="btn-sm" disabled={busy} onClick={() => setRole(e, 'visitor')}>
                ↓ เป็นผู้เยี่ยมชม
              </button>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .root { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; }
        .hdr { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-hairline); }
        .back { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .title { font-size: 18px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .sub { font-size: 12px; color: var(--ink-muted); margin: 2px 0 0; }
        .section { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
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
        .tag--admin { background: rgba(240,70,70,0.12); color: var(--status-fail); border: 1px solid var(--status-fail); }
        .tag--user { background: var(--status-pass-bg); color: var(--status-pass); border: 1px solid var(--status-pass); }
        .btn-sm { background: var(--bg-surface-raised); border: 1px solid var(--border-strong); color: var(--ink-secondary); border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn-sm:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
