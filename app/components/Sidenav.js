'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

// notifProps: { count, unread, onOpen } — optional, only passed from home page
export default function Sidenav({ notifProps = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role || 'visitor';
  const isAdmin = role === 'admin';
  const today = new Date().toISOString().slice(0, 10);

  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try { setHasDraft(!!localStorage.getItem(`session:${today}`)); } catch {}
  }, [today]);

  // Determine active section
  const view = searchParams.get('view');
  const active = pathname === '/' && view === 'report' ? 'report'
    : pathname.startsWith('/form/') ? `form:${pathname.split('/')[2]}`
    : pathname === '/' ? 'dashboard'
    : pathname;

  const navItems = [
    { icon: '🚒⚡', label: 'Fire Pump & Generator', key: 'fpg',    href: '/session', badge: hasDraft ? 'draft' : null },
    { icon: '💡',   label: 'Emergency Light',        key: 'emer',   href: `/form/emergency?date=${today}` },
    { icon: '🚨',   label: 'Smoke Detector',         key: 'smoke',  href: `/form/smoke?date=${today}` },
    { icon: '🚪',   label: 'Exit Sign',              key: 'exit',   href: `/form/exit?date=${today}` },
    { icon: '⚡',   label: 'Meter กฟน.',             key: 'meter',  href: '/meter' },
    { icon: '🏢',   label: 'Meter อาคาร',            key: 'bmeter', href: '/building-meter' },
  ];

  return (
    <nav className="sidenav">
      {/* Logo */}
      <div className="sn-logo">
        <Image src="/logo.png" alt="Veri" width={36} height={36} style={{ borderRadius: 8 }} priority />
        <div>
          <div className="sn-logo-title">Facility Inspection</div>
          <div className="sn-logo-sub">ระบบบันทึกตรวจสอบ</div>
        </div>
      </div>

      {/* Admin home */}
      {isAdmin && (
        <>
          <div className="sn-section-label">แอดมิน</div>
          <button className={`sn-item${pathname === '/admin' ? ' sn-item--active' : ''}`}
            onClick={() => router.push('/admin')}>
            <span className="sn-item-icon">🏠</span>
            <span className="sn-item-label">หน้าหลัก</span>
          </button>
          <div className="sn-divider" />
        </>
      )}

      {/* Nav items */}
      <div className="sn-section-label">บันทึกข้อมูล</div>
      {navItems.map(({ icon, label, key, href, badge }) => {
        const isActive = active === `form:${key}` || (key === 'fpg' && active === '/session');
        return (
          <button key={key} className={`sn-item${isActive ? ' sn-item--active' : ''}`}
            onClick={() => router.push(href)}>
            <span className="sn-item-icon">{icon}</span>
            <span className="sn-item-label">{label}</span>
            {badge && <span className="sn-item-badge">{badge}</span>}
          </button>
        );
      })}

      <div className="sn-divider" />

      {/* Report */}
      <div className="sn-section-label">รายงาน</div>
      <button className={`sn-item${active === 'report' ? ' sn-item--active' : ''}`}
        onClick={() => router.push('/?view=report')}>
        <span className="sn-item-icon">📊</span>
        <span className="sn-item-label">รายงานการตรวจสอบ</span>
      </button>

      <div className="sn-divider" />

      {/* Footer */}
      <div className="sn-footer">
        <div className="sn-user">
          {session?.user?.image
            ? <img src={session.user.image} alt="" className="sn-avatar" referrerPolicy="no-referrer" />
            : <span className="sn-avatar-fallback">{session?.user?.name?.[0] || '?'}</span>}
          <div className="sn-user-info">
            <span className="sn-user-name">{session?.user?.name || '-'}</span>
            <span className={`sn-role-chip role-chip--${role}`}>
              {isAdmin ? '🔓 admin' : role === 'user' ? '✎ ผู้ใช้งาน' : '👁 ผู้เยี่ยมชม'}
            </span>
          </div>
        </div>
        <div className="sn-footer-btns">
          {notifProps && role !== 'visitor' && (
            <button className="sn-icon-btn" title="สถานะคำขอ" style={{ position: 'relative' }}
              onClick={notifProps.onOpen}>
              {notifProps.unread ? '✉️' : '📭'}
              {notifProps.unread && <span className="sn-notif-badge">{notifProps.count}</span>}
            </button>
          )}
          {isAdmin && (
            <button className="sn-icon-btn" title="จัดการผู้ใช้" onClick={() => router.push('/admin')}>⚙️</button>
          )}
          <button className="sn-icon-btn" title="ออกจากระบบ"
            onClick={() => signOut({ callbackUrl: '/login' })}>🚪</button>
        </div>
      </div>

      <style jsx global>{`
        .sidenav {
          display: none;
        }
        @media (min-width: 900px) {
          .sn-shell {
            display: flex;
            flex-direction: row;
            min-height: 100dvh;
          }
          .sidenav {
            display: flex;
            flex-direction: column;
            width: 240px;
            flex-shrink: 0;
            background: var(--bg-surface);
            border-right: 1px solid var(--border-hairline);
            position: sticky;
            top: 0;
            height: 100dvh;
            overflow-y: auto;
            padding: 20px 12px;
            gap: 2px;
          }
          .sn-shell-main {
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            height: 100dvh;
          }
        }
        .sn-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 4px 8px 16px;
          border-bottom: 1px solid var(--border-hairline);
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .sn-logo-title { font-size: 14px; font-weight: 800; color: var(--ink-primary); line-height: 1.2; }
        .sn-logo-sub   { font-size: 11px; color: var(--ink-muted); }
        .sn-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          color: var(--ink-muted); text-transform: uppercase;
          padding: 8px 10px 4px; flex-shrink: 0;
        }
        .sn-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 9px 10px; border: none;
          background: transparent; border-radius: 10px;
          cursor: pointer; text-align: left;
          transition: background 0.12s;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .sn-item:hover { background: var(--bg-surface-raised); }
        .sn-item--active { background: rgba(37,99,235,0.18) !important; }
        .sn-item--active .sn-item-label { color: var(--accent-strong); }
        .sn-item-icon  { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
        .sn-item-label { font-size: 13px; font-weight: 600; color: var(--ink-primary); flex: 1; }
        .sn-item-badge {
          font-size: 10px; font-weight: 700; padding: 2px 6px;
          background: #fef3c7; color: #92400e;
          border-radius: 6px; flex-shrink: 0;
        }
        .sn-divider { height: 1px; background: var(--border-hairline); margin: 8px 0; flex-shrink: 0; }
        .sn-footer { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
        .sn-user {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          background: var(--bg-surface-raised); border-radius: 10px;
        }
        .sn-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-strong); flex-shrink: 0; }
        .sn-avatar-fallback {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--border-strong); color: var(--ink-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .sn-user-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; overflow: hidden; }
        .sn-user-name  { font-size: 12px; font-weight: 700; color: var(--ink-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sn-role-chip  { font-size: 10px; font-weight: 600; }
        .sn-footer-btns { display: flex; gap: 4px; padding: 0 6px; }
        .sn-icon-btn {
          background: none; border: none;
          font-size: 18px; cursor: pointer; padding: 6px 8px;
          border-radius: 8px; line-height: 1;
          transition: background 0.12s;
        }
        .sn-icon-btn:hover { background: var(--bg-surface-raised); }
        .sn-notif-badge {
          position: absolute; top: 2px; right: 2px;
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--status-fail); color: #fff;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </nav>
  );
}
