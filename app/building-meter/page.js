'use client';

import { useRouter } from 'next/navigation';
import { useCanWrite } from '../lib/useCanWrite';

// fork ของ meter_form.html (recolor ธีมมืดให้เข้ากับแอป) เสิร์ฟจาก origin เดียวกัน — logic + Apps Script เดิมไม่แตะ
const FORM_URL = '/meter_form.html';

export default function BuildingMeterPage() {
  const router = useRouter();
  const canWrite = useCanWrite();
  return (
    <div className="root">
      <header className="hdr">
        <button className="back" onClick={() => router.push('/')}>‹</button>
        <div>
          <h1 className="title">🏢 Meter อาคาร</h1>
          <p className="sub">บันทึกค่ามิเตอร์รายอาคาร</p>
        </div>
      </header>

      {/* ฟอร์มของช่าง (host บน GitHub Pages, ผูกกับ Google Apps Script) ฝังในแอปให้ดูเป็นหน้าเดียวกัน */}
      {canWrite ? (
        <iframe className="frame" src={FORM_URL} title="Meter อาคาร" />
      ) : (
        <div className="ro">
          <span className="ro-icon">👁</span>
          <p className="ro-title">บัญชีผู้เยี่ยมชม</p>
          <p className="ro-msg">ดูและดาวน์โหลดรายงานได้ที่หน้าหลัก (History) แต่ไม่มีสิทธิ์บันทึกค่ามิเตอร์</p>
          <button className="ro-btn" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
        </div>
      )}

      <style jsx>{`
        .root { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; }
        .hdr { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-hairline); }
        .back { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .title { font-size: 18px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .sub { font-size: 12px; color: var(--ink-muted); margin: 2px 0 0; }
        .frame { flex: 1; width: 100%; border: none; background: #fff; }
        .ro { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 32px; text-align: center; }
        .ro-icon { font-size: 44px; }
        .ro-title { font-size: 18px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .ro-msg { font-size: 13px; color: var(--ink-muted); margin: 0; line-height: 1.6; max-width: 280px; }
        .ro-btn { margin-top: 8px; background: var(--bg-surface-raised); border: 1px solid var(--border-strong); color: var(--ink-secondary); border-radius: 12px; padding: 10px 18px; font-size: 14px; cursor: pointer; }
      `}</style>
    </div>
  );
}
