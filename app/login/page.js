'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';
  const error = params.get('error');

  return (
    <div className="wrap">
      <img src="/logo.png" alt="Veri" width={72} height={72} className="logo" />
      <h1 className="title">Facility Inspection</h1>
      <p className="sub">ระบบบันทึกการตรวจสอบ · EGAT ไทรน้อย</p>

      {error && <p className="err">เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง</p>}

      <button className="gbtn" onClick={() => signIn('google', { callbackUrl }, { prompt: 'select_account' })}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.6 5.6C41.9 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      </button>

      <p className="note">ผู้ใช้ใหม่จะได้สิทธิ์ &ldquo;ผู้เยี่ยมชม&rdquo; (ดู/ดาวน์โหลด) จนกว่าผู้ดูแลจะกำหนดสิทธิ์</p>

      <style jsx>{`
        .wrap { min-height: 100dvh; max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; }
        .logo { border-radius: 16px; }
        .title { font-size: 22px; font-weight: 800; color: var(--ink-primary); margin: 8px 0 0; }
        .sub { font-size: 13px; color: var(--ink-muted); margin: 0 0 12px; }
        .err { color: var(--status-fail); font-size: 13px; background: var(--status-fail-bg); border-radius: 8px; padding: 8px 12px; margin: 0; }
        .gbtn { display: flex; align-items: center; gap: 10px; padding: 13px 20px; border-radius: 14px; border: 1px solid var(--border-strong); background: #fff; color: #1f2937; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .gbtn:active { transform: scale(0.98); }
        .note { font-size: 12px; color: var(--ink-muted); margin: 16px 0 0; line-height: 1.6; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
