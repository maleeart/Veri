'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Sidenav from './components/Sidenav';

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function fmtMonth(ym) { // "2026-06" → "มิ.ย. 69"
  const [y, m] = ym.split('-');
  return `${THAI_MONTHS[parseInt(m) - 1]} ${String(parseInt(y) + 543).slice(2)}`;
}

// วันศุกร์ของ ISO week (ช่างจด RAW ทุกเช้าวันศุกร์)
function isoWeekToFriday(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const monday = new Date(simple);
  monday.setUTCDate(dow <= 4 ? simple.getUTCDate() - dow + 1 : simple.getUTCDate() + 8 - dow);
  const fri = new Date(monday);
  fri.setUTCDate(monday.getUTCDate() + 4);
  return fri;
}
// "2026-W26" → { week, y:'2026', m:'06', label:'26 มิ.ย. 2569' }
function weekInfo(week) {
  const [wy, wn] = week.split('-W').map(Number);
  const d = isoWeekToFriday(wy, wn);
  return {
    week,
    y: String(d.getUTCFullYear()),
    m: String(d.getUTCMonth() + 1).padStart(2, '0'),
    label: `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`,
  };
}

const BUILDINGS = [
  'ท.0006','ท.0007','ท.0008','ท.0009','ท.0010',
  'ท.0011','ท.0012','ท.0014','ท.0015','ท.0016',
  'ท.0017','ท.0018','ท.0019','ท.0020','ท.0022',
  'ท.0023','ท.0026','ท.0027','ท.0028','ท.0029',
  'ต.0017','ต.0019','ต.0025','ต.0026','ต.0031','ต.0033',
];
const FREQ_MONTHS = 3; // smoke & emergency: ทุก 3 เดือน

/** คืน { building → lastDate } สำหรับ type ที่ระบุ */
function lastDoneByBuilding(dates, type) {
  const map = {};
  for (const d of (dates || [])) {
    if (d.type !== type || !d.building) continue;
    if (!map[d.building] || d.date > map[d.building]) map[d.building] = d.date;
  }
  return map;
}

/** daysDiff ระหว่าง date string กับวันนี้ */
function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

/** status: 'ok' | 'due' | 'overdue' | 'never' */
function getStatus(lastDate) {
  if (!lastDate) return 'never';
  const days = daysSince(lastDate);
  const limit = FREQ_MONTHS * 30;
  if (days > limit) return 'overdue';
  if (days > limit - 14) return 'due'; // เตือนล่วงหน้า 2 สัปดาห์
  return 'ok';
}

const STATUS_BADGE = { overdue: '🔴', due: '🟡', never: '⚫', ok: '🟢' };
const STATUS_LABEL = { overdue: 'เกินกำหนด', due: 'ใกล้ครบ', never: 'ยังไม่เคยบันทึก', ok: 'ปกติ' };

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dates, setDates] = useState(null);
  const [weeks, setWeeks] = useState([]); // Meter อาคาร: สัปดาห์จาก Energy-Dashboard/forms
  const [meterMonths, setMeterMonths] = useState({}); // year → [yearMonth]
  const [isDesktop, setIsDesktop] = useState(false);
  const [githubOk, setGithubOk] = useState(null);
  const [githubError, setGithubError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [openGroups, setOpenGroups] = useState(new Set());
  const [selectedYear, setSelectedYear] = useState(null);     // "2026" | null = ยังไม่ตั้งค่า
  const [selectedMonth, setSelectedMonth] = useState('');     // "01".."12" | '' = ทั้งปี
  const [selectedBuilding, setSelectedBuilding] = useState(''); // '' = ทั้งหมด
  const { data: session } = useSession();
  const role = session?.user?.role || 'visitor';
  const isAdmin = role === 'admin';
  const [deleting, setDeleting] = useState(null); // filename key ที่กำลังลบ
  const [confirmDelete, setConfirmDelete] = useState(null); // { date, type, filename, building, floor }
  const [deleteRequest, setDeleteRequest] = useState(null); // { date, type, filename, building, floor } — user request
  const [deleteReason, setDeleteReason] = useState('');
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifRequests, setNotifRequests] = useState(null);
  const [notifEditLogs, setNotifEditLogs] = useState(null);
  const [notifBusy, setNotifBusy] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notifTab, setNotifTab] = useState('delete');
  const [notifUnread, setNotifUnread] = useState(false); // มีรายการที่ยังไม่ได้เปิดอ่าน
  const [notifOpened, setNotifOpened] = useState(false); // เคยเปิดครั้งแรกแล้ว
  const [showProfile, setShowProfile] = useState(false);

  const toggleGroup = type => setOpenGroups(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });
  const today = new Date().toISOString().slice(0, 10);
  const SESSION_KEY = `session:${today}`;

  // building-meter weeks → ข้อมูลวันที่ (คำนวณจาก ISO week ไม่ต้องโหลด CSV)
  const weekRows = useMemo(() => weeks.map(weekInfo), [weeks]);

  // ปีที่มีข้อมูล (รวมทั้ง inspections และ building-meter)
  const availableYears = useMemo(() => {
    const s = new Set();
    (dates || []).forEach(d => s.add(d.date.slice(0, 4)));
    weekRows.forEach(w => s.add(w.y));
    return [...s].filter(Boolean).sort().reverse();
  }, [dates, weekRows]);

  const availableBuildings = useMemo(() => {
    const s = new Set((dates || []).map(d => d.building).filter(Boolean));
    return [...s].sort();
  }, [dates]);

  // filtered inspections (ปี + เดือน + อาคาร)
  const filteredDates = useMemo(() => {
    return (dates || []).filter(d => {
      const yOk = !selectedYear   || d.date.slice(0, 4) === selectedYear;
      const mOk = !selectedMonth  || d.date.slice(5, 7) === selectedMonth;
      const bOk = !selectedBuilding || d.building === selectedBuilding;
      return yOk && mOk && bOk;
    });
  }, [dates, selectedYear, selectedMonth, selectedBuilding]);

  // filtered building-meter weeks (ปี + เดือน)
  const filteredWeeks = useMemo(() => {
    return weekRows.filter(w =>
      (!selectedYear || w.y === selectedYear) && (!selectedMonth || w.m === selectedMonth)
    );
  }, [weekRows, selectedYear, selectedMonth]);

  const statusRows = useMemo(() => {
    if (!dates) return [];
    const smokeMap = lastDoneByBuilding(dates, 'smoke');
    const emerMap  = lastDoneByBuilding(dates, 'emergency');
    const exitMap  = lastDoneByBuilding(dates, 'exit');
    return BUILDINGS.map(b => ({
      b,
      smoke: getStatus(smokeMap[b]),
      emer:  getStatus(emerMap[b]),
      exit:  getStatus(exitMap[b]),
      smokeDate: smokeMap[b],
      emerDate:  emerMap[b],
      exitDate:  exitMap[b],
    })).filter(r => r.smoke !== 'ok' || r.emer !== 'ok' || r.exit !== 'ok');
  }, [dates]);

  // default selectedYear = ปีล่าสุดที่มีข้อมูล (ตั้งค่าครั้งเดียวหลังโหลด)
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  useEffect(() => {
    try { if (localStorage.getItem(SESSION_KEY)) setHasDraft(true); } catch {}
    if (searchParams.get('saved')) setJustSaved(true);
    // prefetch all main routes so navigation feels instant
    router.prefetch(`/session`);
    router.prefetch('/form/emergency');
    router.prefetch('/form/smoke');
    router.prefetch('/meter');
    router.prefetch('/building-meter');
  }, []);

  useEffect(() => {
    fetch('/api/inspections')
      .then(r => r.json())
      .then(d => {
        setDates(d.dates || []);
        setGithubOk(d.githubConfigured !== false);
        if (d.error && !d.githubConfigured) setGithubError(d.error);
      })
      .catch(() => { setDates([]); setGithubOk(false); setGithubError('ไม่สามารถเชื่อมต่อ API ได้'); });
  }, []);

  useEffect(() => {
    fetch('/api/building-meter-weeks').then(r => r.json()).then(d => setWeeks(d.weeks || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    setIsDesktop(mq.matches);
    const handler = e => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // โหลด meter months เมื่อเปิด history หรือเปลี่ยนปีที่เลือก
  useEffect(() => {
    const yr = selectedYear || String(new Date().getFullYear());
    if (!showHistory || meterMonths[yr] !== undefined) return;
    fetch(`/api/meter-months?year=${yr}`)
      .then(r => r.json())
      .then(d => setMeterMonths(prev => ({ ...prev, [yr]: d.months || [] })))
      .catch(() => setMeterMonths(prev => ({ ...prev, [yr]: [] })));
  }, [showHistory, selectedYear]);

  // ── notification panel ───────────────────────────────────────────────────
  const loadNotif = () => {
    const delUrl  = isAdmin ? '/api/delete-request?all=1' : '/api/delete-request?mine=1';
    const editUrl = isAdmin ? '/api/edit-log'         : '/api/edit-log?mine=1';
    fetch(delUrl).then(r => r.json()).then(d => { const list = d.requests || []; setNotifRequests(list); if (list.length) setNotifUnread(true); }).catch(() => setNotifRequests([]));
    fetch(editUrl).then(r => r.json()).then(d => { const list = d.logs || []; setNotifEditLogs(list); if (list.length) setNotifUnread(true); }).catch(() => setNotifEditLogs([]));
  };
  const openNotif = () => { setShowNotif(true); setNotifOpened(true); setNotifTab(isAdmin ? 'delete' : 'edit'); loadNotif(); };
  const closeNotif = () => { setShowNotif(false); setNotifUnread(false); setRejectingId(null); setRejectReason(''); };

  const handleApprove = async (id) => {
    setNotifBusy(id);
    try {
      const res = await fetch('/api/delete-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'ดำเนินการไม่สำเร็จ'); return; }
      setNotifRequests(prev => prev.filter(r => r.id !== id));
      setDates(prev => {
        const req = notifRequests?.find(r => r.id === id);
        if (!req) return prev;
        return prev.filter(d => (d.filename || '') !== req.filename);
      });
    } catch (e) { alert(String(e.message || e)); }
    finally { setNotifBusy(null); }
  };

  const handleReject = async (id) => {
    setNotifBusy(id);
    try {
      const res = await fetch('/api/delete-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject', rejectReason }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'ดำเนินการไม่สำเร็จ'); return; }
      setNotifRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectReason } : r));
      setRejectingId(null); setRejectReason('');
    } catch (e) { alert(String(e.message || e)); }
    finally { setNotifBusy(null); }
  };

  // badge: admin = pending deletes + unread edits, user = pending/rejected deletes + own edits
  const notifCount = (notifRequests || notifEditLogs)
    ? (isAdmin
        ? (notifRequests?.filter(r => r.status === 'pending').length || 0) + (notifEditLogs?.length || 0)
        : (notifRequests?.filter(r => r.status !== 'approved').length || 0) + (notifEditLogs?.length || 0))
    : null;

  // ── user: ขอลบ ───────────────────────────────────────────────────────────
  const handleDeleteRequest = async () => {
    if (!deleteRequest || !deleteReason.trim()) return;
    setRequestingDelete(true);
    try {
      const res = await fetch('/api/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deleteRequest, reason: deleteReason }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'ส่งคำขอไม่สำเร็จ'); return; }
      alert('ส่งคำขอลบให้ admin แล้ว จะได้รับแจ้งเมื่อดำเนินการ');
      setDeleteRequest(null);
      setDeleteReason('');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setRequestingDelete(false); }
  };

  // ── admin ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { date, type, filename, building, floor, _sha, _path } = confirmDelete;
    const key = filename || date;
    setDeleting(key);
    setConfirmDelete(null);
    try {
      const res = await fetch('/api/delete-inspection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, filename, building, floor, _sha, _path }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'ลบไม่สำเร็จ'); return; }
      setDates(prev => prev.filter(d => (d.filename || d.date) !== key));
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setDeleting(null); }
  };

  // ── download all Excel in a group ────────────────────────────────────────
  const handleDownloadAll = (group, type) => {
    const isList = type === 'emergency' || type === 'smoke';
    const isExit = type === 'exit';
    group.forEach(({ date, filename, building, floor }, i) => {
      setTimeout(() => {
        let href;
        if (isExit) {
          const params = new URLSearchParams({ date });
          if (filename) params.set('filename', filename);
          if (building) params.set('building', building);
          if (floor)    params.set('floor', floor);
          href = `/api/export-exit?${params}`;
        } else if (isList) {
          const params = new URLSearchParams({ type, date });
          if (filename) params.set('filename', filename);
          if (building) params.set('building', building);
          if (floor)    params.set('floor', floor);
          href = `/api/export-list?${params}`;
        } else {
          href = `/api/export-combined?date=${date}`;
        }
        const a = document.createElement('a');
        a.href = href;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 1200);
    });
  };

  // ── download Excel ───────────────────────────────────────────────────────
  const handleDownload = (date, type = 'fpg', filename = null, building = '', floor = '') => {
    if (type === 'exit') {
      const params = new URLSearchParams({ date });
      if (filename) params.set('filename', filename);
      if (building) params.set('building', building);
      if (floor)    params.set('floor', floor);
      window.location.href = `/api/export-exit?${params}`;
      return;
    }
    const isList = type === 'emergency' || type === 'smoke';
    if (isList) {
      const params = new URLSearchParams({ type, date });
      if (filename) params.set('filename', filename);
      if (building) params.set('building', building);
      if (floor)    params.set('floor', floor);
      window.location.href = `/api/export-list?${params}`;
      return;
    }
    window.location.href = `/api/export-combined?date=${date}`;
  };

  // ── download PDF (xlsx → LibreOffice service → pdf) ──────────────────────
  const handleDownloadPdf = async (date, type = 'fpg', filename = null) => {
    const dlKey = `pdf_${filename || date}`;
    setDownloading(dlKey);
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, filename }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'ดาวน์โหลด PDF ไม่สำเร็จ');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FPG_report_${date}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    finally { setDownloading(null); }
  };

  // ── UI ใหม่ ───────────────────────────────────────────────────────────────
  // Report view: derive from URL ?view=report
  const viewParam = searchParams.get('view');
  const isReport = isDesktop && viewParam === 'report';

  // ── Report state ──────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState(''); // '' = ทั้งหมด

  const reportRows = useMemo(() => {
    if (!isReport) return [];
    const yr = selectedYear || String(new Date().getFullYear());
    const rows = [];
    const types = reportType ? [reportType] : ['fpg', 'emergency', 'smoke', 'exit'];
    if (!reportType || types.includes(reportType)) {
      for (const t of types) {
        if (!['fpg','emergency','smoke','exit'].includes(t)) continue;
        for (const d of (filteredDates || [])) {
          if (d.type !== t) continue;
          rows.push({ kind: 'inspection', type: t, ...d });
        }
      }
    }
    if (!reportType || reportType === 'building-meter') {
      for (const w of filteredWeeks) rows.push({ kind: 'bm', ...w });
    }
    if (!reportType || reportType === 'meter-gfn') {
      const months = meterMonths[yr] || [];
      for (const ym of months) {
        const [, m] = ym.split('-');
        rows.push({ kind: 'mgfn', ym, label: `${THAI_MONTHS[parseInt(m)-1]} ${parseInt(yr)+543}` });
      }
    }
    return rows.sort((a, b) => {
      const da = a.date || a.week || a.ym || '';
      const db = b.date || b.week || b.ym || '';
      return db.localeCompare(da);
    });
  }, [isReport, reportType, filteredDates, filteredWeeks, meterMonths, selectedYear]);

  const TYPE_META = {
    fpg:       { icon: '🚒⚡', label: 'Fire Pump & Generator' },
    emergency: { icon: '💡',   label: 'Emergency Light' },
    smoke:     { icon: '🚨',   label: 'Smoke Detector' },
    exit:      { icon: '🚪',   label: 'Exit Sign' },
    'building-meter': { icon: '🏢', label: 'Meter อาคาร' },
    'meter-gfn':      { icon: '⚡', label: 'Meter กฟน.' },
  };

  return (
    <div className="root">
      <Sidenav notifProps={role !== 'visitor' ? { count: notifCount, unread: notifUnread, onOpen: openNotif } : null} />

      {/* ══ DESKTOP MAIN ══ */}
      <div className="page-main">

      {/* ── Header (mobile only) ── */}
      <header className="header">
        <Image src="/logo.png" alt="Veri" width={40} height={40} className="logo" priority />
        <div style={{flex:1}}>
          <h1 className="title">Facility Inspection</h1>
          <p className="subtitle">ระบบบันทึกการตรวจสอบ</p>
        </div>
        <div className="user-box">
          {role !== 'visitor' && (
            <button className="notif-btn" title="สถานะคำขอ" onClick={openNotif}>
              {notifOpened && !notifUnread ? '📭' : '✉️'}
              {notifUnread && <span className="notif-badge">{notifCount}</span>}
            </button>
          )}
          {isAdmin && (
            <button className="icon-btn" title="จัดการผู้ใช้" onClick={() => router.push('/admin')}>⚙️</button>
          )}
          <div className="profile-wrap">
            <button className="avatar-btn" onClick={() => setShowProfile(p => !p)}>
              {session?.user?.image
                ? <img src={session.user.image} alt="" className="avatar" referrerPolicy="no-referrer" />
                : <span className="avatar-fallback">{session?.user?.name?.[0] || '?'}</span>}
            </button>
            {showProfile && (
              <div className="profile-dropdown" onClick={() => setShowProfile(false)}>
                <p className="pd-name">{session?.user?.name || '-'}</p>
                <p className="pd-email">{session?.user?.email || '-'}</p>
                <div className={`pd-role role-chip--${role}`}>
                  {isAdmin ? '🔓 admin' : role === 'user' ? '✎ ผู้ใช้งาน' : '👁 ผู้เยี่ยมชม'}
                </div>
                <button className="pd-logout" onClick={() => signOut({ callbackUrl: '/login' })}>ออกจากระบบ</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal__icon">🗑️</span>
            <h2 className="modal__title">ยืนยันการลบ</h2>
            <p className="modal__msg">ลบรายงาน <strong>{confirmDelete.type.toUpperCase()}</strong></p>
            <p className="modal__msg" style={{fontFamily:'var(--font-mono)',fontSize:13}}>{confirmDelete.date}{confirmDelete.building ? ` · ${confirmDelete.building}` : ''}</p>
            <p style={{color:'var(--status-fail)',fontSize:13,margin:'8px 0 16px'}}>⚠ ลบแล้วไม่สามารถกู้คืนได้</p>
            <div style={{display:'flex',gap:8}}>
              <button className="modal__close" style={{flex:1}} onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button className="modal__close" style={{flex:1,background:'var(--status-fail)',color:'#fff',border:'none'}} onClick={handleDelete}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Panel ── */}
      {showNotif && (
        <div className="overlay" onClick={closeNotif}>
          <div className="notif-panel" onClick={e => e.stopPropagation()}>
            <div className="notif-hd">
              <span>📬 {isAdmin ? 'การแจ้งเตือน' : 'สถานะของฉัน'}</span>
              <button className="notif-close" onClick={closeNotif}>✕</button>
            </div>

            {/* Tabs */}
            <div className="notif-tabs">
              {isAdmin && (
                <button className={`notif-tab ${notifTab === 'delete' ? 'notif-tab--active' : ''}`}
                  onClick={() => setNotifTab('delete')}>
                  🗑 คำขอลบ
                  {notifRequests?.filter(r => r.status === 'pending').length > 0 && (
                    <span className="notif-tab-badge">{notifRequests.filter(r => r.status === 'pending').length}</span>
                  )}
                </button>
              )}
              <button className={`notif-tab ${notifTab === 'edit' ? 'notif-tab--active' : ''}`}
                onClick={() => setNotifTab('edit')}>
                📋 ประวัติ
              </button>
            </div>

            {/* Tab: Delete requests (admin only — pending) */}
            {notifTab === 'delete' && isAdmin && <>
            {notifRequests === null && <p className="notif-empty">กำลังโหลด...</p>}
            {notifRequests !== null && notifRequests.filter(r => r.status === 'pending').length === 0 && <p className="notif-empty">ไม่มีคำขอลบที่รอดำเนินการ</p>}
            {notifRequests?.filter(r => r.status === 'pending').map(r => {
              const isPending  = r.status === 'pending';
              const isApproved = r.status === 'approved';
              const isRejected = r.status === 'rejected';
              return (
                <div key={r.id} className={`notif-item notif-item--${r.status}`}>
                  <div className="notif-item-top">
                    <span className="notif-item-type">{r.type?.toUpperCase()} · {r.date}{r.building ? ` · ${r.building}` : ''}</span>
                    <span className={`notif-status notif-status--${r.status}`}>
                      {isPending ? '⏳ รอดำเนินการ' : isApproved ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธ'}
                    </span>
                  </div>
                  <p className="notif-reason-txt">เหตุผลขอลบ: {r.reason}</p>
                  {isRejected && r.rejectReason && (
                    <p className="notif-reject-reason">💬 admin: {r.rejectReason}</p>
                  )}
                  <p className="notif-meta">{r.requestedBy} · {r.requestedAt?.slice(0, 10)}</p>

                  {/* admin actions */}
                  {isAdmin && isPending && rejectingId !== r.id && (
                    <div className="notif-actions">
                      <button className="notif-btn-approve" disabled={!!notifBusy} onClick={() => handleApprove(r.id)}>
                        {notifBusy === r.id ? '⏳' : '✓ อนุมัติ'}
                      </button>
                      <button className="notif-btn-reject" disabled={!!notifBusy} onClick={() => { setRejectingId(r.id); setRejectReason(''); }}>
                        ✕ ปฏิเสธ
                      </button>
                    </div>
                  )}
                  {isAdmin && isPending && rejectingId === r.id && (
                    <div className="notif-reject-box">
                      <input className="notif-reject-input" placeholder="ระบุเหตุผลที่ปฏิเสธ (ถ้ามี)"
                        value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                      <div className="notif-actions">
                        <button className="notif-btn-approve" disabled={!!notifBusy} onClick={() => handleReject(r.id)}>
                          {notifBusy === r.id ? '⏳' : 'ยืนยันปฏิเสธ'}
                        </button>
                        <button className="notif-btn-reject" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </>}

            {/* Tab: ประวัติ — edit logs + delete requests merged */}
            {notifTab === 'edit' && (() => {
              const loading = notifEditLogs === null || notifRequests === null;
              const merged = [
                ...(notifEditLogs || []).map(l => ({ _kind: 'edit',   _time: l.editedAt,     ...l })),
                ...(notifRequests || []).map(r => ({ _kind: 'delete', _time: r.requestedAt,  ...r })),
              ].sort((a, b) => (b._time || '').localeCompare(a._time || ''));
              return <>
                {loading && <p className="notif-empty">กำลังโหลด...</p>}
                {!loading && merged.length === 0 && <p className="notif-empty">ยังไม่มีประวัติ</p>}
                {merged.map(item => item._kind === 'edit' ? (
                  <div key={item.id} className="notif-item notif-item--edit">
                    <div className="notif-item-top">
                      <span className="notif-item-type">{item.type?.toUpperCase()} · {item.date}{item.building ? ` · ${item.building}` : ''}</span>
                      <span className="notif-status notif-status--edit">✏️ แก้ไขแล้ว</span>
                    </div>
                    {item.originalFilename !== item.newFilename && (
                      <p className="notif-edit-file">
                        <span className="notif-edit-orig">{item.originalFilename}</span>
                        <span className="notif-edit-arrow"> → </span>
                        <span className="notif-edit-new">{item.newFilename}</span>
                      </p>
                    )}
                    <p className="notif-reason-txt">เหตุผล: {item.editReason}</p>
                    {isAdmin && <p className="notif-meta">โดย {item.editedBy} · {item.editedAt?.slice(0, 10)}</p>}
                    {!isAdmin && <p className="notif-meta">{item.editedAt?.slice(0, 10)}</p>}
                  </div>
                ) : (
                  <div key={item.id} className={`notif-item notif-item--${item.status}`}>
                    <div className="notif-item-top">
                      <span className="notif-item-type">{item.type?.toUpperCase()} · {item.date}{item.building ? ` · ${item.building}` : ''}</span>
                      <span className={`notif-status notif-status--${item.status}`}>
                        {item.status === 'pending' ? '⏳ รอลบ' : item.status === 'approved' ? '✅ ลบแล้ว' : '❌ ปฏิเสธ'}
                      </span>
                    </div>
                    <p className="notif-reason-txt">ขอลบ: {item.reason}</p>
                    {item.status === 'rejected' && item.rejectReason && (
                      <p className="notif-reject-reason">💬 admin: {item.rejectReason}</p>
                    )}
                    {isAdmin && <p className="notif-meta">โดย {item.requestedBy} · {item.requestedAt?.slice(0, 10)}</p>}
                    {!isAdmin && <p className="notif-meta">{item.requestedAt?.slice(0, 10)}</p>}
                  </div>
                ))}
              </>;
            })()}
          </div>
        </div>
      )}

      {/* ── User Delete Request Modal ── */}
      {deleteRequest && (
        <div className="overlay" onClick={() => { setDeleteRequest(null); setDeleteReason(''); }}>
          <div className="dr-modal" onClick={e => e.stopPropagation()}>

            {/* Header gradient */}
            <div className="dr-header">
              <div className="dr-header-icon">🗑️</div>
              <h2 className="dr-header-title">ขอลบรายงาน</h2>
              <p className="dr-header-sub">คำขอจะส่งให้ admin ตรวจสอบก่อนดำเนินการ</p>
            </div>

            {/* Report info chips */}
            <div className="dr-body">
              <div className="dr-chips">
                <span className="dr-chip dr-chip--type">{deleteRequest.type?.toUpperCase()}</span>
                <span className="dr-chip dr-chip--date">📅 {deleteRequest.date}</span>
                {deleteRequest.building && (
                  <span className="dr-chip dr-chip--loc">🏢 {deleteRequest.building}{deleteRequest.floor ? ` · ${deleteRequest.floor}` : ''}</span>
                )}
              </div>

              {/* Reason input */}
              <div className="dr-field">
                <label className="dr-label">
                  เหตุผลในการลบ
                  <span className="dr-required">*</span>
                </label>
                <textarea
                  className="dr-textarea"
                  rows={3}
                  placeholder="เช่น บันทึกข้อมูลผิด / ซ้ำกับรายการอื่น"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="dr-notice">
                <span className="dr-notice-dot">⏳</span>
                admin จะรับแจ้งและดำเนินการให้ — รายงานยังไม่ถูกลบจนกว่าจะได้รับอนุมัติ
              </div>

              {/* Actions */}
              <div className="dr-actions">
                <button className="dr-btn dr-btn--cancel"
                  onClick={() => { setDeleteRequest(null); setDeleteReason(''); }}>
                  ยกเลิก
                </button>
                <button className="dr-btn dr-btn--submit"
                  disabled={!deleteReason.trim() || requestingDelete}
                  onClick={handleDeleteRequest}>
                  {requestingDelete ? '⏳ กำลังส่ง...' : '📨 ส่งคำขอ'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Banners ── */}
      {justSaved && (
        <div className="banner banner--green">
          ✓ บันทึกข้อมูลเรียบร้อย — ดาวน์โหลดได้ที่ History
        </div>
      )}
      {githubOk === false && (
        <div className="banner banner--amber">
          ⚠ {githubError || 'GitHub token ยังไม่ได้ตั้งค่า'}
        </div>
      )}

      {/* ══ REPORT VIEW (desktop only, when ?view=report) ══ */}
      {isReport && (
        <div className="report-view">
          <div className="report-header">
            <h2 className="report-title">📊 รายงานการตรวจสอบ</h2>
          </div>
          <div className="report-filters">
            <div className="filter-col">
              <label className="filter-label">ประเภท</label>
              <select className="filter-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="fpg">🚒⚡ Fire Pump & Generator</option>
                <option value="emergency">💡 Emergency Light</option>
                <option value="smoke">🚨 Smoke Detector</option>
                <option value="exit">🚪 Exit Sign</option>
                <option value="building-meter">🏢 Meter อาคาร</option>
                <option value="meter-gfn">⚡ Meter กฟน.</option>
              </select>
            </div>
            <div className="filter-col">
              <label className="filter-label">ปี</label>
              <select className="filter-select" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value || null)}>
                <option value="">ทั้งหมด</option>
                {availableYears.map(y => <option key={y} value={y}>{parseInt(y)+543}</option>)}
              </select>
            </div>
            <div className="filter-col">
              <label className="filter-label">เดือน</label>
              <select className="filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                <option value="">ทั้งหมด</option>
                {THAI_MONTHS.map((m,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
            </div>
            {(reportType === '' || ['fpg','emergency','smoke','exit'].includes(reportType)) && (
              <div className="filter-col">
                <label className="filter-label">อาคาร</label>
                <select className="filter-select" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {availableBuildings.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
          </div>
          <p className="report-count">{reportRows.length} รายการ</p>
          <div className="report-list">
            {reportRows.length === 0 && <p className="history-empty">ไม่มีข้อมูลในเงื่อนไขนี้</p>}
            {reportRows.map((row, i) => {
              if (row.kind === 'inspection') {
                const meta = TYPE_META[row.type] || {};
                const loc = [row.building, row.floor].filter(Boolean).join(' · ');
                const stem = row.filename || `${row.type}_${row.date}`;
                const previewUrl = `/report/${encodeURIComponent(stem)}${row._path ? `?path=${encodeURIComponent(row._path)}` : ''}`;
                return (
                  <div key={i} className="report-row">
                    <span className="report-row-icon">{meta.icon}</span>
                    <div className="report-row-info">
                      <span className="report-row-type">{meta.label}</span>
                      <span className="report-row-loc">{loc || '–'}</span>
                      <span className="report-row-date">{row.date}</span>
                    </div>
                    <div className="hist-actions">
                      {row.type !== 'fpg' && (
                        <button className="btn-dl btn-dl--preview" onClick={() => router.push(previewUrl)}>Preview</button>
                      )}
                      <button className="btn-dl" onClick={() => handleDownload(row.date, row.type, row.filename, row.building, row.floor)}>⬇︎ Excel</button>
                    </div>
                  </div>
                );
              }
              if (row.kind === 'bm') {
                return (
                  <div key={i} className="report-row">
                    <span className="report-row-icon">🏢</span>
                    <div className="report-row-info">
                      <span className="report-row-type">Meter อาคาร</span>
                      <span className="report-row-loc">{row.label}</span>
                      <span className="report-row-date">{row.week}</span>
                    </div>
                    <div className="hist-actions">
                      <button className="btn-dl btn-dl--preview" onClick={() => router.push(`/report/building-meter?week=${encodeURIComponent(row.week)}`)}>Preview</button>
                      <button className="btn-dl" onClick={() => { window.location.href = `/api/export-building-meter?week=${row.week}`; }}>⬇︎ Excel</button>
                    </div>
                  </div>
                );
              }
              if (row.kind === 'mgfn') {
                return (
                  <div key={i} className="report-row">
                    <span className="report-row-icon">⚡</span>
                    <div className="report-row-info">
                      <span className="report-row-type">Meter กฟน.</span>
                      <span className="report-row-loc">{row.label}</span>
                      <span className="report-row-date">{row.ym}</span>
                    </div>
                    <div className="hist-actions">
                      <button className="btn-dl" onClick={() => { window.location.href = `/api/export-meter?month=${row.ym}`; }}>⬇︎ Excel</button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* ── Two-column layout (dashboard view) ── */}
      {!isReport && <div className="layout">
      <div className="left-col">
      {/* ── Card Grid ── */}
      <main className="grid">

        {/* Card 1 — Fire Pump & Generator (ใหญ่ full-width) */}
        <button
          className="card card--fpg"
          onClick={() => router.push(`/session`)}>
          <span className="card__icon">🚒⚡</span>
          <div className="card__body">
            <span className="card__title">Fire Pump &amp; Generator</span>
            <span className="card__sub">
              {hasDraft ? '💾 draft ค้างไว้' : 'ประจำสัปดาห์'}
            </span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 2 — Emergency Light */}
        <button
          className="card card--emergency"
          onClick={() => router.push(`/form/emergency?date=${today}`)}>
          <span className="card__icon">💡</span>
          <div className="card__body">
            <span className="card__title">Emergency Light</span>
            <span className="card__sub">ไฟฉุกเฉิน</span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 3 — Smoke Detector */}
        <button
          className="card card--smoke"
          onClick={() => router.push(`/form/smoke?date=${today}`)}>
          <span className="card__icon">🚨</span>
          <div className="card__body">
            <span className="card__title">Smoke Detector</span>
            <span className="card__sub">ตรวจจับควัน</span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 3b — Exit Sign */}
        <button
          className="card card--exit"
          onClick={() => router.push(`/form/exit?date=${today}`)}>
          <span className="card__icon">🚪</span>
          <div className="card__body">
            <span className="card__title">Exit Sign</span>
            <span className="card__sub">ไฟทางออกฉุกเฉิน</span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 4 — Meter กฟน. */}
        <button
          className="card card--meter"
          onClick={() => router.push('/meter')}>
          <span className="card__icon">⚡</span>
          <div className="card__body">
            <span className="card__title">Meter กฟน.</span>
            <span className="card__sub">ค่ามิเตอร์รวม</span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 4b — Meter อาคาร (เปิดฟอร์มบันทึกของช่างบน GitHub Pages) */}
        <button
          className="card card--bmeter"
          onClick={() => router.push('/building-meter')}>
          <span className="card__icon">🏢</span>
          <div className="card__body">
            <span className="card__title">Meter อาคาร</span>
            <span className="card__sub">รายอาคาร</span>
          </div>
          <span className="card__arrow">›</span>
        </button>

        {/* Card 5 — History */}
        <button
          className="card card--history"
          onClick={() => setShowHistory(v => !v)}>
          <span className="card__icon">📋</span>
          <div className="card__body">
            <span className="card__title">History</span>
            <span className="card__sub">
              {dates === null ? 'กำลังโหลด...' : `${dates.length} รายการ`}
            </span>
          </div>
          <span className="card__arrow">{showHistory ? '⌄' : '›'}</span>
        </button>

        {/* Card 6 — PM Status Summary (ยุบไว้ กดเปิดถึงเห็น) */}
        {statusRows.length > 0 && (
          <button
            className="card card--status"
            onClick={() => setShowStatus(v => !v)}>
            <span className="card__icon">⚠</span>
            <div className="card__body">
              <span className="card__title">สรุปสถานะรายการ PM</span>
              <span className="card__sub">{statusRows.length} อาคารต้องดำเนินการ</span>
            </div>
            <span className="card__arrow">{showStatus ? '⌄' : '›'}</span>
          </button>
        )}

      </main>
      </div>{/* /left-col */}

      <div className="right-col">
      {/* ── Building Status Panel ── */}
      {(showStatus || isDesktop) && statusRows.length > 0 && (
        <section className="status-panel">
          <h3 className="status-title">⚠ ต้องดำเนินการ</h3>
          <div className="status-header-row">
            <span className="status-col-b"></span>
            <span className="status-col">💡 Emer</span>
            <span className="status-col">🚨 Smoke</span>
            <span className="status-col">🚪 Exit</span>
          </div>
          {statusRows.map(({ b, smoke, emer, exit, smokeDate, emerDate, exitDate }) => (
            <div key={b} className="status-row">
              <span className="status-col-b">{b}</span>
              <span className="status-col" title={`${STATUS_LABEL[emer]}${emerDate ? ' · ' + emerDate : ''}`}>
                {STATUS_BADGE[emer]}
              </span>
              <span className="status-col" title={`${STATUS_LABEL[smoke]}${smokeDate ? ' · ' + smokeDate : ''}`}>
                {STATUS_BADGE[smoke]}
              </span>
              <span className="status-col" title={`${STATUS_LABEL[exit]}${exitDate ? ' · ' + exitDate : ''}`}>
                {STATUS_BADGE[exit]}
              </span>
            </div>
          ))}
          <p className="status-legend">🟢 ปกติ · 🟡 ใกล้ครบ · 🔴 เกินกำหนด · ⚫ ยังไม่บันทึก</p>
        </section>
      )}

      {/* ── History panel ── */}
      {(showHistory || isDesktop) && (
        <section className="history-panel">
          {githubOk === false && <p className="history-empty">⚠ ต้องตั้งค่า GitHub token ก่อน</p>}
          {dates?.length === 0 && weekRows.length === 0 && <p className="history-empty">ยังไม่มีประวัติ</p>}

          {(dates?.length > 0 || weekRows.length > 0) && (
            <>
              <div className="filter-row">
                <div className="filter-col">
                  <label className="filter-label">ปี</label>
                  <select className="filter-select"
                    value={selectedYear || ''}
                    onChange={e => setSelectedYear(e.target.value || null)}>
                    <option value="">ทั้งหมด</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{parseInt(y) + 543}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-col">
                  <label className="filter-label">เดือน</label>
                  <select className="filter-select"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}>
                    <option value="">ทั้งปี</option>
                    {THAI_MONTHS.map((mo, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>{mo}</option>
                    ))}
                  </select>
                </div>
                {availableBuildings.length > 0 && (
                  <div className="filter-col">
                    <label className="filter-label">อาคาร</label>
                    <select className="filter-select"
                      value={selectedBuilding}
                      onChange={e => setSelectedBuilding(e.target.value)}>
                      <option value="">ทั้งหมด</option>
                      {availableBuildings.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="filter-result">
                พบ {filteredDates.length + filteredWeeks.length} รายการ
                {selectedYear ? ` · ปี ${parseInt(selectedYear) + 543}` : ''}
                {selectedMonth ? ` · ${THAI_MONTHS[parseInt(selectedMonth) - 1]}` : ''}
                {selectedBuilding ? ` · ${selectedBuilding}` : ''}
              </p>
            </>
          )}

          {/* ── Grouped list ── */}
          {[
            { type: 'fpg',       icon: '🚒⚡', label: 'Fire Pump & Generator', accent: '#2563eb' },
            { type: 'emergency', icon: '💡',   label: 'Emergency Light',        accent: '#16a34a' },
            { type: 'smoke',     icon: '🚨',   label: 'Smoke Detector',         accent: '#0e7490' },
            { type: 'exit',      icon: '🚪',   label: 'Exit Sign',              accent: '#7c3aed' },
          ].map(({ type, icon, label, accent }) => {
            const group = filteredDates.filter(d => d.type === type);
            if (!group.length) return null;
            const isOpen = openGroups.has(type);
            return (
              <div key={type} className="hist-group">
                <button className="hist-group-hd" onClick={() => toggleGroup(type)}
                  style={{ borderLeft: `4px solid ${accent}` }}>
                  <span className="hist-group-icon">{icon}</span>
                  <span className="hist-group-label">{label}</span>
                  <span className="hist-group-count">{group.length}</span>
                  <span className="hist-group-arrow">{isOpen ? '⌄' : '›'}</span>
                </button>
                {isOpen && (
                  <button className="btn-dl-all"
                    style={{ borderLeft: `4px solid ${accent}` }}
                    onClick={() => handleDownloadAll(group, type)}>
                    ⬇︎ ดาวน์โหลดทั้งหมด ({group.length} ไฟล์)
                  </button>
                )}
                {isOpen && group.map(({ date, building, floor, filename, _sha, _path }) => {
                  const dlKey = filename || date;
                  const location = [building, floor].filter(Boolean).join(' · ');
                  const stem = filename || `${type}_${date}`;
                  const previewUrl = `/report/${encodeURIComponent(stem)}${_path ? `?path=${encodeURIComponent(_path)}` : ''}`;
                  return (
                    <div key={filename || `${type}_${date}`}
                      className={`hist-row ${date === today ? 'hist-row--today' : ''}`}>
                      <div className="hist-info">
                        {location && <span className="hist-location">{location}</span>}
                        <span className="hist-date">{date}{date === today ? ' · วันนี้' : ''}</span>
                      </div>
                      <div className="hist-actions">
                        <button className="btn-dl btn-dl--preview"
                          onClick={() => router.push(previewUrl)}>
                          Preview
                        </button>
                        <button className="btn-dl" disabled={!!downloading}
                          onClick={() => handleDownload(date, type, filename, building, floor)}>
                          {downloading === dlKey ? '⏳' : '⬇︎ Excel'}
                        </button>
                        {isAdmin ? (
                          <button className="btn-del"
                            disabled={deleting === dlKey}
                            onClick={() => setConfirmDelete({ date, type, filename, building, floor, _sha, _path })}>
                            {deleting === dlKey ? '⏳' : '🗑'}
                          </button>
                        ) : role === 'user' && (
                          <>
                            <button className="btn-edit"
                              onClick={() => type === 'fpg'
                                ? router.push(`/session?date=${date}`)
                                : router.push(`/form/${type}?date=${date}&filename=${encodeURIComponent(filename || '')}&edit=1`)}>
                              ✏️
                            </button>
                            <button className="btn-del"
                              onClick={() => { setDeleteRequest({ filename, type, date, building, floor }); setDeleteReason(''); }}>
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Meter อาคาร — รายสัปดาห์จาก Energy-Dashboard */}
          {filteredWeeks.length > 0 && (
            <div className="hist-group">
              <button className="hist-group-hd" onClick={() => toggleGroup('building-meter')}
                style={{ borderLeft: '4px solid #6366f1' }}>
                <span className="hist-group-icon">🏢</span>
                <span className="hist-group-label">Meter อาคาร</span>
                <span className="hist-group-count">{filteredWeeks.length}</span>
                <span className="hist-group-arrow">{openGroups.has('building-meter') ? '⌄' : '›'}</span>
              </button>
              {openGroups.has('building-meter') && filteredWeeks.map(({ week, label }) => (
                <div key={week} className="hist-row">
                  <div className="hist-info">
                    <span className="hist-location">{label}</span>
                    <span className="hist-date">{week}</span>
                  </div>
                  <div className="hist-actions">
                    <button className="btn-dl btn-dl--preview"
                      onClick={() => router.push(`/report/building-meter?week=${encodeURIComponent(week)}`)}>
                      Preview
                    </button>
                    <button className="btn-dl" onClick={() => { window.location.href = `/api/export-building-meter?week=${week}`; }}>
                      ⬇︎ Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meter กฟน. — รายเดือน/รายปี */}
          {(() => {
            const yr = selectedYear || String(new Date().getFullYear());
            const months = meterMonths[yr];
            const isOpen = openGroups.has('meter-gfn');
            return (
              <div className="hist-group">
                <button className="hist-group-hd" onClick={() => toggleGroup('meter-gfn')}
                  style={{ borderLeft: '4px solid #d97706' }}>
                  <span className="hist-group-icon">⚡</span>
                  <span className="hist-group-label">Meter กฟน.</span>
                  <span className="hist-group-count">{months?.length ?? '…'}</span>
                  <span className="hist-group-arrow">{isOpen ? '⌄' : '›'}</span>
                </button>
                {isOpen && (
                  <button className="btn-dl-all"
                    style={{ borderLeft: '4px solid #d97706' }}
                    onClick={() => { window.location.href = `/api/export-meter?year=${yr}`; }}>
                    ⬇︎ Export รายปี {parseInt(yr) + 543}
                  </button>
                )}
                {isOpen && !months && (
                  <div className="hist-row"><span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>กำลังโหลด...</span></div>
                )}
                {isOpen && months?.length === 0 && (
                  <div className="hist-row"><span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>ไม่มีข้อมูลปีนี้</span></div>
                )}
                {isOpen && months?.map(ym => {
                  const [, m] = ym.split('-');
                  const label = `${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(ym.slice(0, 4)) + 543}`;
                  return (
                    <div key={ym} className="hist-row">
                      <div className="hist-info">
                        <span className="hist-location">{label}</span>
                        <span className="hist-date">{ym}</span>
                      </div>
                      <div className="hist-actions">
                        <button className="btn-dl" onClick={() => { window.location.href = `/api/export-meter?month=${ym}`; }}>
                          ⬇︎ Excel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}
      </div>{/* /right-col */}
      </div>}{/* /layout */}

      </div>{/* /page-main */}

      <style jsx>{`
        /* ─── Root ─── */
        .root {
          min-height: 100dvh;
          max-width: 480px;
          margin: 0 auto;
          padding-bottom: 40px;
          display: flex;
          flex-direction: column;
        }

        /* ─── page-main (mobile: normal flow; desktop: flex child of sidenav shell) ─── */
        .page-main { display: contents; }

        /* ════ DESKTOP ≥900px ════ */
        @media (min-width: 900px) {
          .root {
            max-width: none;
            flex-direction: row;
            align-items: stretch;
            padding-bottom: 0;
            min-height: 100dvh;
          }
          .page-main {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-width: 0;
            overflow-y: auto;
            height: 100dvh;
          }
          .header { display: none; }
          .grid { display: none; }
          .layout { display: block; padding: 0; }
          .left-col { display: none; }
          .right-col { padding: 24px 32px; }
          .status-panel { margin: 0 0 20px; }
          .history-panel { margin: 0; gap: 8px; }
          .report-view { padding: 28px 32px; }
        }

        /* ─── Header ─── */
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 22px 20px 18px;
          border-bottom: 1px solid var(--border-hairline);
        }
        .logo { border-radius: 10px; flex-shrink: 0; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-strong); flex-shrink: 0; }
        .title {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .subtitle {
          font-size: 13px;
          color: var(--ink-muted);
          margin: 2px 0 0;
        }

        /* ─── Banners ─── */
        .banner {
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          border-bottom: 1px solid transparent;
        }
        .banner--green {
          background: var(--status-pass-bg);
          color: var(--status-pass);
          border-color: var(--status-pass);
        }
        .banner--amber {
          background: rgba(232,163,61,0.1);
          color: var(--status-warn);
          border-color: var(--status-warn);
        }

        /* ─── Grid ─── */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 20px 16px 0;
        }

        /* ─── Cards ─── */
        .card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: none;
          border-radius: 20px;
          padding: 18px 16px;
          cursor: pointer;
          text-align: left;
          transition: transform 0.12s, box-shadow 0.12s;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          overflow: hidden;
        }
        .card:active { transform: scale(0.97); }

        /* FP&G — full width, Royal Blue gradient */
        .card--fpg {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          box-shadow: 0 8px 24px rgba(37,99,235,0.40);
          min-height: 88px;
        }
        .card--fpg .card__title { color: #fff; font-size: 17px; }
        .card--fpg .card__sub   { color: rgba(255,255,255,0.8); }
        .card--fpg .card__icon  { font-size: 30px; }
        .card--fpg .card__arrow { color: rgba(255,255,255,0.7); }

        /* Emergency Light — green (Veri accent) */
        .card--emergency {
          background: linear-gradient(135deg, #14532d 0%, #16a34a 100%);
          box-shadow: 0 6px 18px rgba(22,163,74,0.35);
          min-height: 72px;
          gap: 12px;
        }
        .card--emergency .card__icon  { font-size: 26px; }
        .card--emergency .card__title { color: #fff; font-size: 15px; }
        .card--emergency .card__sub   { color: rgba(255,255,255,0.75); }
        .card--emergency .card__arrow { color: rgba(255,255,255,0.7); margin-left: auto; }

        /* Smoke Detector — teal */
        .card--smoke {
          background: linear-gradient(135deg, #164e63 0%, #0e7490 100%);
          box-shadow: 0 6px 18px rgba(14,116,144,0.35);
          min-height: 72px;
          gap: 12px;
        }
        .card--smoke .card__icon  { font-size: 26px; }
        .card--smoke .card__title { color: #fff; font-size: 15px; }
        .card--smoke .card__sub   { color: rgba(255,255,255,0.75); }
        .card--smoke .card__arrow { color: rgba(255,255,255,0.7); margin-left: auto; }

        /* Exit Sign — violet */
        .card--exit {
          background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
          box-shadow: 0 6px 18px rgba(124,58,237,0.35);
          min-height: 72px;
          gap: 12px;
        }
        .card--exit .card__icon  { font-size: 26px; }
        .card--exit .card__title { color: #fff; font-size: 15px; }
        .card--exit .card__sub   { color: rgba(255,255,255,0.75); }
        .card--exit .card__arrow { color: rgba(255,255,255,0.7); margin-left: auto; }

        /* Meter กฟน. — amber */
        .card--meter {
          background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
          box-shadow: 0 6px 18px rgba(217,119,6,0.35);
          min-height: 72px;
          gap: 12px;
        }
        .card--meter .card__icon  { font-size: 26px; }
        .card--meter .card__title { color: #fff; font-size: 15px; }
        .card--meter .card__sub   { color: rgba(255,255,255,0.75); }
        .card--meter .card__arrow { color: rgba(255,255,255,0.7); margin-left: auto; }

        /* Meter อาคาร — indigo */
        .card--bmeter {
          background: linear-gradient(135deg, #3730a3 0%, #6366f1 100%);
          box-shadow: 0 6px 18px rgba(99,102,241,0.35);
          min-height: 72px;
          gap: 12px;
        }
        .card--bmeter .card__icon  { font-size: 26px; }
        .card--bmeter .card__title { color: #fff; font-size: 15px; }
        .card--bmeter .card__sub   { color: rgba(255,255,255,0.75); }
        .card--bmeter .card__arrow { color: rgba(255,255,255,0.7); margin-left: auto; }

        /* History — dark */
        .card--history {
          grid-column: 1 / -1;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-hairline);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .card--history .card__icon  { font-size: 26px; }
        .card--history .card__title { color: var(--ink-primary); font-size: 16px; }
        .card--history .card__sub   { color: var(--ink-muted); }
        .card--history .card__arrow { color: var(--ink-muted); margin-left: auto; }

        /* PM Status Summary — dark, same shell as History */
        .card--status {
          grid-column: 1 / -1;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-hairline);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .card--status .card__icon  { font-size: 24px; color: var(--status-warn); }
        .card--status .card__title { color: var(--ink-primary); font-size: 16px; }
        .card--status .card__sub   { color: var(--ink-muted); }
        .card--status .card__arrow { color: var(--ink-muted); margin-left: auto; }

        /* Card internals */
        .card__icon { flex-shrink: 0; }
        .card__body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }
        .card__title {
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card__sub { font-size: 12px; }
        .card__arrow {
          font-size: 22px;
          font-weight: 300;
          flex-shrink: 0;
          line-height: 1;
        }
        .card__badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255,255,255,0.22);
          color: #fff;
          border-radius: 8px;
          padding: 2px 8px;
          letter-spacing: 0.04em;
        }

        /* ─── Building Status Panel ─── */
        .status-panel {
          margin: 14px 16px 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          overflow: hidden;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .status-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--status-warn);
          margin: 0 0 8px;
        }
        .status-header-row, .status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 0;
        }
        .status-header-row {
          border-bottom: 1px solid var(--border-hairline);
          padding-bottom: 6px;
          margin-bottom: 2px;
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-muted);
        }
        .status-col-b { flex: 1; font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .status-col { width: 72px; text-align: center; font-size: 13px; }
        .status-legend { font-size: 11px; color: var(--ink-muted); margin: 6px 0 0; }

        /* ─── History Panel ─── */
        .history-panel {
          margin: 14px 16px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-empty {
          padding: 10px 16px;
          font-size: 14px;
          color: var(--ink-muted);
          margin: 0;
        }

        /* ─── Filter bar ─── */
        .filter-row {
          display: flex;
          gap: 10px;
        }
        .filter-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .filter-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-surface-raised);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-primary);
          appearance: auto;
        }
        .filter-result {
          font-size: 12px;
          color: var(--ink-muted);
          margin: 0;
        }

        /* Group */
        .hist-group {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          overflow: hidden;
        }
        .hist-group-hd {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: var(--bg-surface-raised);
          border: none;
          cursor: pointer;
          text-align: left;
          -webkit-tap-highlight-color: transparent;
        }
        .hist-group-icon { font-size: 18px; flex-shrink: 0; }
        .hist-group-label {
          flex: 1;
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-primary);
        }
        .hist-group-count {
          font-size: 12px;
          font-weight: 600;
          background: var(--border-hairline);
          color: var(--ink-muted);
          border-radius: 20px;
          padding: 2px 8px;
        }
        .hist-group-arrow {
          font-size: 18px;
          color: var(--ink-muted);
          line-height: 1;
          flex-shrink: 0;
        }

        /* Rows */
        .hist-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-top: 1px solid var(--border-hairline);
        }
        .hist-row--today { background: rgba(37,99,235,0.07); }
        .hist-info { display: flex; flex-direction: column; gap: 2px; }
        .hist-location {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-primary);
        }
        .hist-date {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-muted);
        }
        .hist-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .btn-dl {
          background: #217346;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .btn-dl--preview {
          background: #38bdf8;
        }
        .btn-dl-all {
          display: block;
          width: calc(100% - 2px);
          margin: 0 1px 4px;
          padding: 8px 14px;
          background: #f0fdf4;
          color: #15803d;
          border: 1px dashed #86efac;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }
        .btn-dl-all:hover { background: #dcfce7; }
        .btn-dl:disabled { opacity: 0.5; }
        .btn-edit {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 13px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-del {
          background: var(--status-fail-bg);
          color: var(--status-fail);
          border: 1px solid var(--status-fail);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 13px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .btn-del:disabled { opacity: 0.5; }

        /* ─── Report View ─── */
        .report-header { margin-bottom: 16px; }
        .report-title  { font-size: 20px; font-weight: 800; color: var(--ink-primary); margin: 0 0 16px; }
        .report-filters {
          display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
        }
        .report-filters .filter-col { flex: 1; min-width: 140px; max-width: 220px; }
        .report-count { font-size: 12px; color: var(--ink-muted); margin: 0 0 12px; }
        .report-list  { display: flex; flex-direction: column; gap: 6px; }
        .report-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
        }
        .report-row-icon { font-size: 20px; flex-shrink: 0; width: 28px; text-align: center; }
        .report-row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .report-row-type { font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .report-row-loc  { font-size: 12px; color: var(--ink-secondary); }
        .report-row-date { font-size: 11px; color: var(--ink-muted); font-family: var(--font-mono); }

        /* ─── Coming Soon Modal ─── */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 24px;
        }
        .modal {
          background: var(--bg-surface);
          border-radius: 24px;
          padding: 32px 24px;
          width: 100%;
          max-width: 320px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .modal__icon { font-size: 52px; display: block; margin-bottom: 12px; }
        .modal__title {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0 0 8px;
        }
        .modal__msg {
          font-size: 15px;
          color: var(--ink-secondary);
          margin: 0 0 4px;
        }
        .modal__sub {
          font-size: 22px;
          font-weight: 800;
          color: var(--ink-muted);
          letter-spacing: 0.04em;
          margin: 0 0 24px;
        }
        .modal__close {
          width: 100%;
          padding: 13px;
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-primary);
          cursor: pointer;
        }
        /* ─── Delete-Request Modal ─── */
        .dr-modal {
          background: var(--bg-surface);
          border: 1px solid var(--border-strong);
          border-radius: 24px;
          width: 100%;
          max-width: 340px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.15);
        }
        .dr-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%);
          padding: 28px 24px 22px;
          text-align: center;
          position: relative;
        }
        .dr-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }
        .dr-header-icon {
          font-size: 40px;
          line-height: 1;
          margin-bottom: 10px;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
        }
        .dr-header-title {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .dr-header-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          margin: 0;
          line-height: 1.4;
        }
        .dr-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dr-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dr-chip {
          font-size: 12px;
          font-weight: 700;
          border-radius: 99px;
          padding: 4px 12px;
          border: 1px solid;
          letter-spacing: 0.02em;
        }
        .dr-chip--type {
          background: rgba(37,99,235,0.15);
          color: var(--accent-strong);
          border-color: rgba(37,99,235,0.4);
        }
        .dr-chip--date {
          background: var(--bg-surface-raised);
          color: var(--ink-secondary);
          border-color: var(--border-strong);
        }
        .dr-chip--loc {
          background: var(--bg-surface-raised);
          color: var(--ink-secondary);
          border-color: var(--border-strong);
        }
        .dr-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dr-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .dr-required {
          color: var(--status-fail);
          font-size: 15px;
          line-height: 1;
        }
        .dr-textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.15s;
          box-sizing: border-box;
          line-height: 1.5;
        }
        .dr-textarea:focus {
          outline: none;
          border-color: var(--accent-strong);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
        }
        .dr-notice {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: var(--ink-muted);
          background: var(--bg-surface-raised);
          border-radius: 10px;
          padding: 10px 12px;
          line-height: 1.5;
        }
        .dr-notice-dot { flex-shrink: 0; }
        .dr-actions {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 8px;
        }
        .dr-btn {
          padding: 13px 16px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          font-family: inherit;
          border: none;
        }
        .dr-btn:active { transform: scale(0.97); }
        .dr-btn--cancel {
          background: var(--bg-surface-raised);
          color: var(--ink-secondary);
          border: 1px solid var(--border-strong);
        }
        .dr-btn--submit {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          box-shadow: 0 4px 14px rgba(220,38,38,0.35);
        }
        .dr-btn--submit:disabled {
          opacity: 0.45;
          box-shadow: none;
          cursor: not-allowed;
        }

        .user-box { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .role-chip { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 4px 8px; white-space: nowrap; }
        .role-chip--admin   { background: rgba(240,70,70,0.12);  color: var(--status-fail); border: 1px solid var(--status-fail); }
        .role-chip--user    { background: var(--status-pass-bg);  color: var(--status-pass); border: 1px solid var(--status-pass); }
        .role-chip--visitor { background: var(--bg-surface-raised); color: var(--ink-muted); border: 1px solid var(--border-strong); }
        .profile-wrap { position: relative; }
        .avatar-btn { background: none; border: none; cursor: pointer; padding: 0; display: flex; }
        .avatar-fallback { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .profile-dropdown {
          position: absolute; right: 0; top: calc(100% + 8px); z-index: 100;
          background: var(--bg-surface, #111d32); border: 1px solid var(--border-hairline, #334155);
          border-radius: 14px; padding: 14px 16px; min-width: 210px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          display: flex; flex-direction: column; gap: 4px;
        }
        .pd-name { margin: 0; font-size: 14px; font-weight: 700; color: var(--ink-primary); }
        .pd-email { margin: 0; font-size: 11px; color: var(--ink-muted); margin-bottom: 6px; }
        .pd-role { display: inline-block; align-self: flex-start; font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; margin-bottom: 8px; }
        .pd-logout { background: none; border: 1px solid var(--border-strong); border-radius: 8px; padding: 6px 12px; font-size: 12px; color: var(--ink-muted); cursor: pointer; font-family: inherit; text-align: left; }
        .pd-logout:hover { color: var(--status-fail); border-color: var(--status-fail); }
        .notif-btn { position: relative; background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px 6px; border-radius: 8px; line-height: 1; }
        .notif-badge { position: absolute; top: 0; right: 0; background: var(--status-fail); color: #fff; border-radius: 99px; font-size: 10px; font-weight: 800; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 3px; transform: translate(30%,-20%); }
        .notif-panel { background: var(--bg-surface); border-radius: 20px; width: 100%; max-width: 360px; max-height: 80dvh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); display: flex; flex-direction: column; }
        .notif-hd { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid var(--border-hairline); font-size: 15px; font-weight: 800; color: var(--ink-primary); position: sticky; top: 0; background: var(--bg-surface); border-radius: 20px 20px 0 0; }
        .notif-close { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--ink-muted); padding: 4px; }
        .notif-empty { padding: 20px; text-align: center; color: var(--ink-muted); font-size: 14px; margin: 0; }
        .notif-item { padding: 14px 18px; border-bottom: 1px solid var(--border-hairline); }
        .notif-item--approved { opacity: 0.7; }
        .notif-item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .notif-item-type { font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .notif-status { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; white-space: nowrap; flex-shrink: 0; }
        .notif-status--pending  { background: rgba(217,119,6,0.12); color: var(--status-warn); border: 1px solid var(--status-warn); }
        .notif-status--approved { background: var(--status-pass-bg); color: var(--status-pass); border: 1px solid var(--status-pass); }
        .notif-status--rejected { background: var(--status-fail-bg); color: var(--status-fail); border: 1px solid var(--status-fail); }
        .notif-reason-txt { font-size: 12px; color: var(--ink-secondary); margin: 2px 0; }
        .notif-reject-reason { font-size: 12px; color: var(--status-fail); margin: 2px 0; background: var(--status-fail-bg); padding: 4px 8px; border-radius: 6px; }
        .notif-meta { font-size: 11px; color: var(--ink-muted); margin: 4px 0 0; }
        .notif-actions { display: flex; gap: 6px; margin-top: 10px; }
        .notif-btn-approve { flex: 1; padding: 7px 12px; border-radius: 10px; border: none; background: var(--status-pass); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
        .notif-btn-approve:disabled { opacity: 0.5; }
        .notif-btn-reject { flex: 1; padding: 7px 12px; border-radius: 10px; border: 1px solid var(--status-fail); background: var(--status-fail-bg); color: var(--status-fail); font-size: 13px; font-weight: 700; cursor: pointer; }
        .notif-btn-reject:disabled { opacity: 0.5; }
        .notif-reject-box { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
        .notif-reject-input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1.5px solid var(--border-strong); background: var(--bg-input); color: var(--ink-primary); font-size: 13px; box-sizing: border-box; }
        .notif-tabs { display: flex; border-bottom: 1px solid var(--border-hairline); padding: 0 4px; gap: 2px; }
        .notif-tab { flex: 1; padding: 10px 8px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 600; color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: color .15s; margin-bottom: -1px; }
        .notif-tab--active { color: var(--accent-strong); border-bottom-color: var(--accent-strong); }
        .notif-tab-badge { background: var(--status-fail); color: #fff; border-radius: 99px; font-size: 10px; font-weight: 800; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
        .notif-item--edit { background: rgba(37,99,235,0.04); }
        .notif-status--edit { background: rgba(37,99,235,0.12); color: var(--accent-strong); border: 1px solid rgba(37,99,235,0.3); font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; white-space: nowrap; flex-shrink: 0; }
        .notif-edit-file { font-size: 11px; font-family: var(--font-mono); color: var(--ink-muted); margin: 3px 0; word-break: break-all; line-height: 1.5; }
        .notif-edit-orig { color: var(--status-fail); }
        .notif-edit-arrow { color: var(--ink-muted); }
        .notif-edit-new { color: var(--status-pass); }
        .icon-btn { background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px 6px; border-radius: 8px; color: var(--ink-muted); }
        .admin-badge {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 8px;
          color: var(--ink-muted);
          flex-shrink: 0;
        }
        .admin-badge--on {
          background: rgba(240,70,70,0.12);
          color: var(--status-fail);
          font-size: 13px;
          font-weight: 700;
          border: 1px solid var(--status-fail);
          padding: 4px 10px;
        }
        .admin-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-primary);
          font-size: 16px;
          outline: none;
        }
        .admin-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-muted)' }}>
        กำลังโหลด...
      </div>
    }>
      <HomePageInner />
    </Suspense>
  );
}
