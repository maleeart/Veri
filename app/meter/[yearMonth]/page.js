'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const THAI_DAYS   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function pad2(n) { return String(n).padStart(2, '0'); }

function daysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function thaiMonthYear(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** Scan days object in descending order to find last value for auto-carry fields */
function getLastValues(days, beforeDay) {
  const keys = Object.keys(days).filter(k => !days[k].holiday && k < beforeDay).sort().reverse();
  for (const k of keys) {
    const e = days[k];
    if (e.m20 != null) return { m20: e.m20, m21: e.m21, m22: e.m22, m61: e.m61 };
  }
  return {};
}

const BLANK_ENTRY = { time: '08:30', m10: '', m11: '', m12: '', m20: '', m21: '', m22: '', m31: '', m32: '', m60: '', m61: '' };

export default function MeterMonthPage() {
  const router = useRouter();
  const { yearMonth } = useParams();

  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // modal state
  const [modal, setModal] = useState(null); // { dayStr, entry }
  const [form, setForm] = useState({});

  // holiday modal
  const [holidayModal, setHolidayModal] = useState(null); // { dayStr }
  const [holidayName, setHolidayName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/save-meter?month=${yearMonth}`);
      const data = await res.json();
      setDays(data.days || {});
    } catch {}
    setLoading(false);
  }, [yearMonth]);

  useEffect(() => { load(); }, [load]);

  const openWorkday = (dayStr) => {
    const existing = days[dayStr];
    const carried = getLastValues(days, dayStr);
    const entry = existing && !existing.holiday
      ? existing
      : { ...BLANK_ENTRY, m20: carried.m20 ?? '', m21: carried.m21 ?? '', m22: carried.m22 ?? '', m61: carried.m61 ?? '' };
    setForm({ ...entry });
    setModal({ dayStr });
  };

  const saveWorkday = async () => {
    setSaving(true);
    const entry = {};
    for (const [k, v] of Object.entries(form)) {
      entry[k] = v === '' ? null : (k === 'time' ? v : parseFloat(v));
    }
    entry.time = form.time || '08:30';
    try {
      await fetch('/api/save-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, day: modal.dayStr, entry }),
      });
      setDays(prev => ({ ...prev, [modal.dayStr]: entry }));
      setModal(null);
    } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); }
    setSaving(false);
  };

  const deleteEntry = async (dayStr) => {
    if (!confirm('ลบข้อมูลวันนี้?')) return;
    await fetch('/api/save-meter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearMonth, day: dayStr }),
    });
    setDays(prev => { const n = { ...prev }; delete n[dayStr]; return n; });
    setModal(null);
  };

  const saveHoliday = async () => {
    if (!holidayName.trim()) return;
    const entry = { holiday: holidayName.trim() };
    await fetch('/api/save-meter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearMonth, day: holidayModal.dayStr, entry }),
    });
    setDays(prev => ({ ...prev, [holidayModal.dayStr]: entry }));
    setHolidayModal(null);
    setHolidayName('');
  };

  const removeHoliday = async (dayStr) => {
    await fetch('/api/save-meter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearMonth, day: dayStr }),
    });
    setDays(prev => { const n = { ...prev }; delete n[dayStr]; return n; });
  };

  const total = daysInMonth(yearMonth);
  const [y, m] = yearMonth.split('-').map(Number);

  const dayRows = Array.from({ length: total }, (_, i) => {
    const d = i + 1;
    const dayStr = pad2(d);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const entry = days[dayStr];
    return { d, dayStr, dow, isWeekend, entry };
  });

  return (
    <div className="root">
      <header className="hdr">
        <button className="back" onClick={() => router.push('/meter')}>‹</button>
        <div>
          <h1 className="title">⚡ {thaiMonthYear(yearMonth)}</h1>
          <p className="sub">Meter กฟน. Main</p>
        </div>
      </header>

      {loading ? (
        <p className="loading">กำลังโหลด...</p>
      ) : (
        <ul className="day-list">
          {dayRows.map(({ d, dayStr, dow, isWeekend, entry }) => {
            const hasHoliday = entry?.holiday;
            const hasData = entry && !hasHoliday;

            let rowClass = 'day-row';
            if (isWeekend) rowClass += ' day-row--weekend';
            else if (hasHoliday) rowClass += ' day-row--holiday';
            else if (hasData) rowClass += ' day-row--done';

            return (
              <li key={dayStr} className={rowClass}>
                <div className="day-info">
                  <span className="day-name">{THAI_DAYS[dow]}</span>
                  <span className="day-num">{d}</span>
                  {hasHoliday && <span className="holiday-badge">{entry.holiday}</span>}
                  {hasData && <span className="time-badge">{entry.time || ''}</span>}
                </div>
                <div className="day-actions">
                  {isWeekend ? (
                    <span className="day-dash">-</span>
                  ) : hasHoliday ? (
                    <>
                      <button className="btn-sm btn-sm--edit" onClick={() => { setHolidayName(entry.holiday); setHolidayModal({ dayStr }); }}>✏️</button>
                      <button className="btn-sm btn-sm--del" onClick={() => removeHoliday(dayStr)}>✕</button>
                    </>
                  ) : (
                    <>
                      {hasData ? (
                        <button className="btn-sm btn-sm--done" onClick={() => openWorkday(dayStr)}>✓ แก้ไข</button>
                      ) : (
                        <button className="btn-sm btn-sm--fill" onClick={() => openWorkday(dayStr)}>กรอกข้อมูล</button>
                      )}
                      <button className="btn-sm btn-sm--hol" onClick={() => { setHolidayName(''); setHolidayModal({ dayStr }); }}>วันหยุด</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Workday modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">วันที่ {parseInt(modal.dayStr, 10)}</h2>

            <label className="field-label">เวลา</label>
            <input className="field-input" type="time" value={form.time || '08:30'}
              onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />

            <p className="section-label">── Electrical Consumption ──</p>
            {[['m10','มิเตอร์ 10 (kWh Total)'],['m11','มิเตอร์ 11 (On Peak kWh)'],['m12','มิเตอร์ 12 (Off Peak kWh)']].map(([k, lbl]) => (
              <div key={k}>
                <label className="field-label">{lbl}</label>
                <input className="field-input" inputMode="decimal" value={form[k] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}

            <p className="section-label">── Previous (ต้นเดือน) ──</p>
            {[['m20','มิเตอร์ 20'],['m21','มิเตอร์ 21'],['m22','มิเตอร์ 22']].map(([k, lbl]) => (
              <div key={k}>
                <label className="field-label">{lbl}</label>
                <input className="field-input" inputMode="decimal" value={form[k] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}

            <p className="section-label">── Maximum Demand ──</p>
            {[['m31','มิเตอร์ 31 (On Peak kW)'],['m32','มิเตอร์ 32 (Off Peak kW)']].map(([k, lbl]) => (
              <div key={k}>
                <label className="field-label">{lbl}</label>
                <input className="field-input" inputMode="decimal" value={form[k] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}

            <p className="section-label">── Power Reactive ──</p>
            {[['m60','มิเตอร์ 60 (kVarh)'],['m61','มิเตอร์ 61 (kVar)']].map(([k, lbl]) => (
              <div key={k}>
                <label className="field-label">{lbl}</label>
                <input className="field-input" inputMode="decimal" value={form[k] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(null)}>ยกเลิก</button>
              {days[modal.dayStr] && !days[modal.dayStr].holiday && (
                <button className="btn-del-entry" onClick={() => deleteEntry(modal.dayStr)}>ลบ</button>
              )}
              <button className="btn-save" disabled={saving} onClick={saveWorkday}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday modal */}
      {holidayModal && (
        <div className="overlay" onClick={() => setHolidayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">ชื่อวันหยุด</h2>
            <input className="field-input" placeholder="เช่น วันสุนทรภู่" value={holidayName}
              onChange={e => setHolidayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveHoliday()}
              autoFocus />
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn-cancel" onClick={() => setHolidayModal(null)}>ยกเลิก</button>
              <button className="btn-save" onClick={saveHoliday}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      <div className="footer">
        <button className="export-btn" onClick={() => { window.location.href = `/api/export-meter?month=${yearMonth}`; }}>
          ⬇ Export เดือนนี้
        </button>
      </div>

      <style jsx>{`
        .root { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; padding-bottom: 80px; }
        .hdr { display: flex; align-items: center; gap: 12px; padding: 20px 16px 16px; border-bottom: 1px solid var(--border-hairline); }
        .back { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .title { font-size: 19px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .sub { font-size: 13px; color: var(--ink-muted); margin: 2px 0 0; }
        .loading { padding: 24px 16px; color: var(--ink-muted); font-size: 14px; }
        .day-list { list-style: none; margin: 0; padding: 8px 0; }
        .day-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; border-bottom: 1px solid var(--border-hairline);
        }
        .day-row--weekend { opacity: 0.45; }
        .day-row--holiday { background: rgba(120,53,15,0.2); }
        .day-row--done { background: rgba(22,163,74,0.07); }
        .day-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .day-name { font-size: 13px; color: var(--ink-muted); width: 70px; flex-shrink: 0; }
        .day-num { font-size: 15px; font-weight: 700; color: var(--ink-primary); width: 28px; flex-shrink: 0; }
        .holiday-badge { font-size: 12px; color: #fbbf24; background: rgba(251,191,36,0.15); border-radius: 8px; padding: 2px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .time-badge { font-size: 12px; color: var(--ink-muted); }
        .day-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .day-dash { color: var(--ink-muted); font-size: 14px; }
        .btn-sm { border: none; border-radius: 10px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-sm--fill { background: linear-gradient(135deg,#78350f,#d97706); color: #fff; }
        .btn-sm--done { background: rgba(22,163,74,0.2); color: #4ade80; }
        .btn-sm--hol  { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-hairline); }
        .btn-sm--edit { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-hairline); }
        .btn-sm--del  { background: rgba(220,38,38,0.15); color: #f87171; }

        /* modal */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 999; padding: 0; }
        .modal { background: var(--bg-surface); border-radius: 24px 24px 0 0; padding: 24px 20px 32px; width: 100%; max-width: 480px; max-height: 85dvh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--ink-primary); margin: 0 0 16px; }
        .section-label { font-size: 12px; font-weight: 700; color: var(--ink-muted); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .field-label { font-size: 12px; color: var(--ink-muted); display: block; margin-bottom: 4px; }
        .field-input {
          width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border-strong);
          background: var(--bg-input); color: var(--ink-primary); font-size: 16px; outline: none; box-sizing: border-box; margin-bottom: 10px;
        }
        .field-input:focus { border-color: #d97706; }
        .modal-actions { display: flex; gap: 8px; margin-top: 8px; }
        .btn-cancel { flex: 1; padding: 13px; background: var(--bg-surface-raised); border: 1px solid var(--border-strong); border-radius: 14px; font-size: 15px; font-weight: 600; color: var(--ink-primary); cursor: pointer; }
        .btn-save { flex: 2; padding: 13px; background: linear-gradient(135deg,#78350f,#d97706); border: none; border-radius: 14px; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; }
        .btn-del-entry { padding: 13px 16px; background: rgba(220,38,38,0.15); border: 1px solid #f87171; border-radius: 14px; font-size: 15px; font-weight: 600; color: #f87171; cursor: pointer; }

        .footer { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; padding: 12px 16px; background: var(--bg-base); border-top: 1px solid var(--border-hairline); }
        .export-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,#78350f,#d97706); color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  );
}
