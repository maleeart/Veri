'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';
  const error = params.get('error');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);

  const handleSignIn = () => {
    setLoading(true);
    signIn('google', { callbackUrl }, { prompt: 'select_account' });
  };

  return (
    <div className={`root ${dark ? 'dark' : 'light'}`}>
      <div className="bg-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* mode toggle */}
      <button className="mode-toggle" onClick={() => setDark(d => !d)} aria-label="สลับโหมด">
        {dark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      <div className="card">
        <div className="card-bar" />

        {/* brand */}
        <div className="brand">
          <div className="logo-wrap">
            <img src="/logo.png" alt="Veri" width={56} height={56} className="logo-img" />
            <div className="logo-ring" />
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Veri</h1>
            <p className="brand-sub">Facility Inspection System</p>
          </div>
        </div>

        {/* divider */}
        <div className="sep">
          <span className="sep-line" />
          <span className="sep-text">เข้าสู่ระบบ</span>
          <span className="sep-line" />
        </div>

        {/* error */}
        {error && (
          <div className="error-box">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่
          </div>
        )}

        {/* google button */}
        <button className="btn-google" onClick={handleSignIn} disabled={loading}>
          {loading ? (
            <span className="spinner" />
          ) : (
            <svg className="g-icon" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.6 5.6C41.9 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
          )}
          <span>{loading ? 'กำลังเข้าสู่ระบบ…' : 'Sign in with Google'}</span>
        </button>

        <p className="note">ผู้ใช้ใหม่จะได้สิทธิ์ &ldquo;ผู้เยี่ยมชม&rdquo; จนกว่าผู้ดูแลจะกำหนดสิทธิ์</p>
        <p className="admin-line">ผู้ดูแลระบบ : นายตวงเพชร ชัยยานนท์ &middot; วศ.4 หบอว-ธ. กบห-ธ. ชธธ.</p>
      </div>

      <style jsx>{`
        .root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px;
          transition: background 0.3s;
        }
        .root.dark  { background: #0c1220; }
        .root.light { background: #e8f0fe; }

        /* grid */
        .bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
          pointer-events: none;
        }

        /* orbs */
        .orb {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(72px);
          animation: drift 14s ease-in-out infinite alternate;
        }
        .orb-1 { width: 500px; height: 500px; top: -200px; left: -160px; animation-delay: 0s; }
        .orb-2 { width: 380px; height: 380px; bottom: -140px; right: -120px; animation-delay: -5s; }
        .orb-3 { width: 260px; height: 260px; top: 45%; left: 60%; animation-delay: -9s; }
        .dark  .orb-1 { background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%); }
        .dark  .orb-2 { background: radial-gradient(circle, rgba(30,64,175,0.15) 0%, transparent 65%); }
        .dark  .orb-3 { background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%); }
        .light .orb-1 { background: radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%); }
        .light .orb-2 { background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%); }
        .light .orb-3 { background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%); }
        @keyframes drift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(24px,18px) scale(1.06); }
        }

        /* mode toggle */
        .mode-toggle {
          position: fixed; top: 16px; right: 16px; z-index: 10;
          width: 36px; height: 36px;
          border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.3s, color 0.3s;
        }
        .dark  .mode-toggle { background: rgba(255,255,255,0.08); color: #93c5fd; }
        .light .mode-toggle { background: rgba(37,99,235,0.1); color: #1d4ed8; }
        .mode-toggle:hover { opacity: 0.8; }

        /* card */
        .card {
          position: relative; width: 100%; max-width: 400px;
          border-radius: 24px;
          padding: 0 32px 32px;
          display: flex; flex-direction: column; align-items: center;
          overflow: hidden;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .dark .card {
          background: rgba(17,29,50,0.88);
          border: 1px solid rgba(45,63,94,0.7);
          box-shadow: 0 0 0 1px rgba(37,99,235,0.06), 0 32px 72px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .light .card {
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(147,197,253,0.5);
          box-shadow: 0 8px 40px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .card-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #2563eb 30%, #6366f1 70%, transparent);
        }

        /* brand */
        .brand {
          display: flex; align-items: center; gap: 14px;
          margin-top: 40px; margin-bottom: 20px;
          align-self: flex-start;
        }
        .logo-wrap { position: relative; flex-shrink: 0; }
        .logo-img { display: block; border-radius: 16px; box-shadow: 0 6px 20px rgba(37,99,235,0.3); }
        .logo-ring {
          position: absolute; inset: -3px; border-radius: 19px;
          background: linear-gradient(135deg, rgba(37,99,235,0.5), rgba(99,102,241,0.25));
          z-index: -1; filter: blur(4px);
        }
        .brand-text { display: flex; flex-direction: column; gap: 2px; }
        .brand-name {
          margin: 0; font-size: 28px; font-weight: 900;
          letter-spacing: -1px; line-height: 1;
          background-clip: text; -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          transition: background-image 0.3s;
        }
        .dark  .brand-name { background-image: linear-gradient(135deg, #eff6ff 0%, #93c5fd 55%, #818cf8 100%); }
        .light .brand-name { background-image: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #6366f1 100%); }
        .brand-sub {
          margin: 0; font-size: 11px; font-weight: 500;
          letter-spacing: 0.5px; text-transform: uppercase;
          transition: color 0.3s;
        }
        .dark  .brand-sub { color: #475569; }
        .light .brand-sub { color: #94a3b8; }

        /* sep */
        .sep { width: 100%; display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .sep-line { flex: 1; height: 1px; }
        .dark  .sep-line { background: linear-gradient(90deg, transparent, rgba(45,63,94,0.8)); }
        .light .sep-line { background: linear-gradient(90deg, transparent, rgba(147,197,253,0.6)); }
        .sep-line:last-child { transform: scaleX(-1); }
        .sep-text { font-size: 12px; white-space: nowrap; transition: color 0.3s; }
        .dark  .sep-text { color: #475569; }
        .light .sep-text { color: #94a3b8; }

        /* error */
        .error-box {
          width: 100%; display: flex; align-items: center; gap: 8px;
          background: rgba(240,70,70,0.1); border: 1px solid rgba(240,70,70,0.25);
          color: #f87171; border-radius: 12px; padding: 10px 14px;
          font-size: 13px; margin-bottom: 16px;
        }

        /* google button */
        .btn-google {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 14px 24px;
          background: #ffffff; color: #1e293b;
          border: none; border-radius: 14px;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          margin-bottom: 4px;
        }
        .light .btn-google {
          border: 1px solid rgba(37,99,235,0.15);
          box-shadow: 0 2px 12px rgba(37,99,235,0.1);
        }
        .btn-google:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .btn-google:active:not(:disabled) { transform: translateY(0); }
        .btn-google:disabled { opacity: 0.65; cursor: not-allowed; }
        .g-icon { width: 20px; height: 20px; flex-shrink: 0; }

        /* spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(30,41,59,0.15);
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.65s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* note & admin */
        .note { margin: 20px 0 0; font-size: 12px; text-align: center; line-height: 1.7; transition: color 0.3s; }
        .admin-line { margin: 6px 0 0; font-size: 11px; text-align: center; transition: color 0.3s; }
        .dark  .note, .dark  .admin-line { color: #64748b; }
        .light .note, .light .admin-line { color: #94a3b8; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
