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

  const handleSignIn = () => {
    setLoading(true);
    signIn('google', { callbackUrl }, { prompt: 'select_account' });
  };

  return (
    <div className="root">
      {/* background layers */}
      <div className="bg-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="card">
        {/* top accent bar */}
        <div className="card-bar" />

        {/* brand */}
        <div className="brand">
          <div className="logo-wrap">
            <img src="/logo.png" alt="Veri" width={64} height={64} className="logo-img" />
            <div className="logo-ring" />
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Veri</h1>
            <p className="brand-sub">Facility Inspection System</p>
          </div>
        </div>

        {/* org badge */}
        <div className="org-badge">
          <span className="org-dot" />
          EGAT ไทรน้อย
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

        {/* note */}
        <p className="note">ผู้ใช้ใหม่จะได้สิทธิ์ &ldquo;ผู้เยี่ยมชม&rdquo; จนกว่าผู้ดูแลจะกำหนดสิทธิ์</p>
      </div>

      <style jsx>{`
        /* ── root ── */
        .root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0c1220;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* ── grid overlay ── */
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
          pointer-events: none;
        }

        /* ── orbs ── */
        .orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(72px);
          animation: drift 14s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 560px; height: 560px;
          background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%);
          top: -200px; left: -160px;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(30,64,175,0.15) 0%, transparent 65%);
          bottom: -140px; right: -120px;
          animation-delay: -5s;
        }
        .orb-3 {
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%);
          top: 45%; left: 60%;
          animation-delay: -9s;
        }
        @keyframes drift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(24px,18px) scale(1.06); }
        }

        /* ── card ── */
        .card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(17,29,50,0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(45,63,94,0.7);
          border-radius: 24px;
          padding: 0 36px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          box-shadow:
            0 0 0 1px rgba(37,99,235,0.06),
            0 32px 72px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.05);
          overflow: hidden;
        }

        /* top gradient bar */
        .card-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #2563eb 30%, #6366f1 70%, transparent);
        }

        /* ── brand ── */
        .brand {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 44px;
          margin-bottom: 16px;
          align-self: flex-start;
        }
        .logo-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .logo-img {
          display: block;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(37,99,235,0.35);
        }
        .logo-ring {
          position: absolute;
          inset: -3px;
          border-radius: 21px;
          background: linear-gradient(135deg, rgba(37,99,235,0.6), rgba(99,102,241,0.3));
          z-index: -1;
          filter: blur(4px);
        }
        .brand-text { display: flex; flex-direction: column; gap: 2px; }
        .brand-name {
          margin: 0;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -1.5px;
          line-height: 1;
          background: linear-gradient(135deg, #eff6ff 0%, #93c5fd 55%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .brand-sub {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        /* ── org badge ── */
        .org-badge {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
          background: rgba(37,99,235,0.08);
          border: 1px solid rgba(37,99,235,0.15);
          border-radius: 20px;
          padding: 4px 12px;
          margin-bottom: 28px;
        }
        .org-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,0.7);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.8); }
        }

        /* ── separator ── */
        .sep {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .sep-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(45,63,94,0.8));
        }
        .sep-line:last-child {
          background: linear-gradient(90deg, rgba(45,63,94,0.8), transparent);
        }
        .sep-text {
          font-size: 12px;
          color: #475569;
          white-space: nowrap;
        }

        /* ── error ── */
        .error-box {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(240,70,70,0.1);
          border: 1px solid rgba(240,70,70,0.25);
          color: #f87171;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        /* ── google button ── */
        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 15px 24px;
          background: #ffffff;
          color: #1e293b;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3);
          margin-bottom: 4px;
        }
        .btn-google:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4);
        }
        .btn-google:active:not(:disabled) { transform: translateY(0); }
        .btn-google:disabled { opacity: 0.65; cursor: not-allowed; }
        .g-icon { width: 22px; height: 22px; flex-shrink: 0; }

        /* ── spinner ── */
        .spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(30,41,59,0.15);
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── note ── */
        .note {
          margin: 20px 0 0;
          font-size: 12px;
          color: #334155;
          text-align: center;
          line-height: 1.7;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
