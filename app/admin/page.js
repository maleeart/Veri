'use client';

import { useEffect, useState, useMemo, Fragment, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidenav from '../components/Sidenav';
import SystemTrends from '../components/SystemTrends';

const BUILDINGS = [
  'ท.0006','ท.0007','ท.0008','ท.0009','ท.0010',
  'ท.0011','ท.0012','ท.0014','ท.0015','ท.0016',
  'ท.0017','ท.0018','ท.0019','ท.0020','ท.0022',
  'ท.0023','ท.0026','ท.0027','ท.0028','ท.0029',
  'ต.0017','ต.0019','ต.0025','ต.0026','ต.0031','ต.0033',
];
const FREQ_MONTHS = 3;
const FREQ_DAYS = FREQ_MONTHS * 30;
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function lastDoneByBuilding(dates, type) {
  const map = {};
  for (const d of (dates || [])) {
    if (d.type !== type || !d.building) continue;
    if (!map[d.building] || d.date > map[d.building]) map[d.building] = d.date;
  }
  return map;
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getStatus(lastDate) {
  if (!lastDate) return 'never';
  const days = daysSince(lastDate);
  if (days > FREQ_DAYS) return 'overdue';
  if (days > FREQ_DAYS - 14) return 'due';
  return 'ok';
}

function pmSummary(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const c = { overdue: 0, due: 0, never: 0, ok: 0 };
  for (const b of BUILDINGS) c[getStatus(byB[b])]++;
  return c;
}

// คืนรายอาคารที่ไม่ ok (overdue/due/never)
function pmBuildingDetails(dates, type) {
  const byB = lastDoneByBuilding(dates, type);
  const overdue = [], due = [], never = [];
  for (const b of BUILDINGS) {
    const last = byB[b] || null;
    const s = getStatus(last);
    if (s === 'ok') continue;
    const days = last ? daysSince(last) : null;
    if (s === 'overdue') overdue.push({ building: b, lastDate: last, daysOver: days - FREQ_DAYS });
    else if (s === 'due')   due.push({ building: b, lastDate: last, daysLeft: FREQ_DAYS - days });
    else                    never.push({ building: b });
  }
  return { overdue, due, never };
}

function lastSaturdayISO() {
  const d = new Date();
  const daysBack = d.getDay() === 6 ? 0 : d.getDay() + 1;
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function isoWeekOf(d) {
  const thu = new Date(d);
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(thu.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function currentISOWeek() { return isoWeekOf(new Date()); }
function prevISOWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return isoWeekOf(d);
}

const PM_TYPES = [
  { type: 'emergency', icon: '💡', label: 'Emergency Light' },
  { type: 'smoke',     icon: '🚨', label: 'Smoke Detector' },
  { type: 'exit',      icon: '🚪', label: 'Exit Sign' },
];

const MENU_OPTIONS = [
  { value: 'all', label: 'ทั้งหมดทุกระบบ', icon: '📁' },
  { value: 'fpg', label: 'Fire Pump & Generator', icon: '🚒' },
  { value: 'emergency', label: 'Emergency Light', icon: '💡' },
  { value: 'smoke', label: 'Smoke Detector', icon: '🚨' },
  { value: 'exit', label: 'Exit Sign', icon: '🚪' },
  { value: 'elec', label: 'บริภัณฑ์ไฟฟ้าประจำปี', icon: '📑' },
  { value: 'other', label: 'อื่นๆ', icon: '📦' },
];

function getMenuInfo(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'fpg') return { icon: '🚒', label: 'Fire Pump & Generator', tagClass: 'tag-fpg' };
  if (t === 'emergency') return { icon: '💡', label: 'Emergency Light', tagClass: 'tag-emerg' };
  if (t === 'smoke') return { icon: '🚨', label: 'Smoke Detector', tagClass: 'tag-smoke' };
  if (t === 'exit') return { icon: '🚪', label: 'Exit Sign', tagClass: 'tag-exit' };
  if (t === 'elec' || t.includes('annual') || t.includes('electrical')) return { icon: '📑', label: 'บริภัณฑ์ไฟฟ้าประจำปี', tagClass: 'tag-elec' };
  return { icon: '📦', label: type ? type.toUpperCase() : 'ไม่ระบุ', tagClass: 'tag-other' };
}

function AdminInner() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [view, setView] = useState(initialTab === 'delete-reports' || initialTab === 'settings' ? 'delete-reports' : 'dashboard');
  const [expandedPM, setExpandedPM] = useState(new Set());

  // Delete reports state & filters
  const [reportsLoading, setReportsLoading] = useState(false);
  const [allReports, setAllReports] = useState([]);
  const [filterMenu, setFilterMenu] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingPath, setDeletingPath] = useState(null);
  const [confirmDelModal, setConfirmDelModal] = useState(null);

  // Dashboard state
  const [dates, setDates]         = useState(null);
  const [dashUsers, setDashUsers] = useState(null);
  const [pendingReqs, setPending] = useState(null);
  const [meterData, setMeterData] = useState(null);
  const [bmWeeks, setBmWeeks]     = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErr, setDashErr]     = useState('');
  const [approving, setApproving] = useState(null);

  // Users state
  const [users, setUsers]   = useState(null);
  const [admins, setAdmins] = useState([]);
  const [email, setEmail]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');

  const loadAllReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/inspections');
      const data = await res.json();
      const list = data.dates || [];
      setAllReports(list);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDeleteReport = async (rep) => {
    setDeletingPath(rep._path || rep.filename || rep.date);
    try {
      const res = await fetch('/api/delete-inspection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: rep.date,
          type: rep.type,
          filename: rep.filename,
          building: rep.building,
          floor: rep.floor,
          _path: rep._path,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ลบรายงานไม่สำเร็จ');
      } else {
        setAllReports(prev => prev.filter(r => (r._path || r.filename || r.date) !== (rep._path || rep.filename || rep.date)));
        if (dates) {
          setDates(prev => prev.filter(r => (r._path || r.filename || r.date) !== (rep._path || rep.filename || rep.date)));
        }
        setConfirmDelModal(null);
      }
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setDeletingPath(null);
    }
  };

  const loadDashboard = async () => {
    if (dashLoading) return;
    setDashLoading(true); setDashErr('');
    const todayYM = today.slice(0, 7);
    try {
      const [iRes, uRes, rRes, mRes, bwRes] = await Promise.all([
        fetch('/api/inspections'),
        fetch('/api/users'),
        fetch('/api/delete-request'),
        fetch(`/api/save-meter?month=${todayYM}`),
        fetch('/api/building-meter-weeks'),
      ]);
      const [insp, ud, rd, md, bwd] = await Promise.all(
        [iRes, uRes, rRes, mRes, bwRes].map(r => r.json())
      );
      setDates(insp.dates || []);
      setDashUsers(ud.users || {});
      setPending(rd.requests || []);
      setMeterData(md || { days: {} });
      setBmWeeks(bwd.weeks || []);
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

  useEffect(() => {
    if (isAdmin && view === 'delete-reports' && allReports.length === 0 && !reportsLoading) loadAllReports();
  }, [isAdmin, view]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'delete-reports' || tab === 'settings') {
      setView('delete-reports');
    }
  }, [searchParams]);

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
      setUsers(d.users || {}); setEmail('');
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

  const togglePM = (type) => setExpandedPM(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  // ── computed ──
  const pmData = useMemo(() => {
    if (!dates) return null;
    return {
      emergency: pmSummary(dates, 'emergency'),
      smoke:     pmSummary(dates, 'smoke'),
      exit:      pmSummary(dates, 'exit'),
    };
  }, [dates]);

  const pmDetails = useMemo(() => {
    if (!dates) return null;
    const r = {};
    for (const { type } of PM_TYPES) r[type] = pmBuildingDetails(dates, type);
    return r;
  }, [dates]);

  const fpgStatus = useMemo(() => {
    if (!dates) return null;
    const lastSat = lastSaturdayISO();
    const lastFpg = dates.filter(d => d.type === 'fpg').map(d => d.date).sort().reverse()[0] || null;
    return { done: !!(lastFpg && lastFpg >= lastSat), lastDate: lastFpg, targetDate: lastSat };
  }, [dates]);

  const meterStatus = useMemo(() => {
    if (!meterData) return null;
    const dayKey = today.slice(8, 10);
    return { done: meterData.days?.[dayKey] != null };
  }, [meterData, today]);

  const bmStatus = useMemo(() => {
    if (!bmWeeks) return null;
    const thisWeek = currentISOWeek();
    const prevWeek = prevISOWeek();
    const thisWeekDone = bmWeeks.includes(thisWeek);
    const prevWeekDone = bmWeeks.includes(prevWeek);
    const isFriday = new Date().getDay() === 5;
    const missingLastWeek = !prevWeekDone;
    const shouldAlert = missingLastWeek || (isFriday && !thisWeekDone);
    return { thisWeekDone, prevWeekDone, thisWeek, prevWeek, isFriday, missingLastWeek, shouldAlert };
  }, [bmWeeks]);

  const totalOverdue = pmData ? PM_TYPES.reduce((s, { type }) => s + pmData[type].overdue, 0) : 0;

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const r of allReports) {
      if (r.date && r.date.length >= 4) {
        s.add(r.date.slice(0, 4));
      }
    }
    return Array.from(s).sort().reverse();
  }, [allReports]);

  const availableBuildings = useMemo(() => {
    const s = new Set(BUILDINGS);
    for (const r of allReports) {
      if (r.building) s.add(r.building);
    }
    return Array.from(s).sort();
  }, [allReports]);

  const filteredReports = useMemo(() => {
    return allReports.filter(rep => {
      // Menu filter
      if (filterMenu !== 'all') {
        const t = (rep.type || '').toLowerCase();
        if (filterMenu === 'other') {
          const known = ['fpg', 'emergency', 'smoke', 'exit', 'elec'];
          if (known.some(k => t.includes(k))) return false;
        } else if (filterMenu === 'elec') {
          if (!t.includes('elec') && !t.includes('annual') && !t.includes('electrical')) return false;
        } else {
          if (!t.includes(filterMenu)) return false;
        }
      }
      // Year filter
      if (filterYear !== 'all') {
        const y = (rep.date || '').slice(0, 4);
        if (y !== filterYear) return false;
      }
      // Building filter
      if (filterBuilding !== 'all') {
        if ((rep.building || '').trim() !== filterBuilding.trim()) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${rep.date || ''} ${rep.building || ''} ${rep.floor || ''} ${rep.label || ''} ${rep.type || ''} ${rep.filename || ''} ${rep._path || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [allReports, filterMenu, filterYear, filterBuilding, searchQuery]);

  if (status === 'loading') return <main className="msg">กำลังโหลด...</main>;
  if (!isAdmin) return (
    <main className="msg">
      <p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
      <button className="link" onClick={() => router.push('/')}>‹ กลับหน้าหลัก</button>
      <style jsx>{`.msg{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#64748b}.link{background:none;border:none;color:#2563eb;cursor:pointer;font-size:14px}`}</style>
    </main>
  );

  const userEmails    = users ? Object.keys(users).filter(e => users[e] === 'user').sort()  : [];
  const visitorEmails = users ? Object.keys(users).filter(e => users[e] !== 'user').sort() : [];

  const QUICK = [
    { icon: '🏠',   label: 'หน้าแรก (เมนูลัด)',       href: '/' },
    { icon: '⚙️',   label: 'ตั้งค่า / ลบรายงาน',     href: null, action: () => setView('delete-reports') },
    { icon: '🚒',   label: 'Fire Pump & Generator', href: '/session' },
    { icon: '💡',   label: 'Emergency Light',        href: `/form/emergency?date=${today}` },
    { icon: '🚨',   label: 'Smoke Detector',         href: `/form/smoke?date=${today}` },
    { icon: '🚪',   label: 'Exit Sign',              href: `/form/exit?date=${today}` },
    { icon: '📑',   label: 'บริภัณฑ์ไฟฟ้าประจำปี',   href: '/electrical-annual' },
    { icon: '⚡',   label: 'Meter กฟน.',             href: '/meter' },
    { icon: '🏢',   label: 'Meter อาคาร',            href: '/building-meter' },
    { icon: '🔧',   label: 'สถานะ PM',               href: '/pm' },
    { icon: '📊',   label: 'รายงาน',                 href: '/?view=report' },
    { icon: '👥',   label: 'จัดการผู้ใช้',           href: null, action: () => setView('users') },
  ];

  // chip helper
  function pmChip(s) {
    if (!s) return <span className="chip chip--loading">กำลังโหลด…</span>;
    if (s.overdue > 0) return <span className="chip chip--overdue">🔴 {s.overdue} เกินกำหนด</span>;
    if (s.due     > 0) return <span className="chip chip--due">🟡 {s.due} ใกล้ครบ</span>;
    if (s.never   > 0) return <span className="chip chip--never">⚫ {s.never} ยังไม่เคยบันทึก</span>;
    return <span className="chip chip--ok">✅ ทุกอาคารปกติ</span>;
  }

  // action rows — FPG / Meter กฟน. / Meter อาคาร
  const SIMPLE_ROWS = [
    {
      icon: '🚒', label: 'Fire Pump & Generator', schedule: 'ทุกวันเสาร์',
      done: fpgStatus?.done ?? null,
      detail: !fpgStatus ? '…'
        : fpgStatus.done
          ? `ล่าสุด ${fmtDate(fpgStatus.lastDate)}`
          : `ยังไม่ทำ (เสาร์ ${fmtDate(fpgStatus.targetDate)})`,
      href: '/session',
    },
    {
      icon: '⚡', label: 'Meter กฟน.', schedule: 'ทุกวัน',
      done: meterStatus?.done ?? null,
      detail: !meterStatus ? '…'
        : meterStatus.done ? 'บันทึกแล้ววันนี้' : `ยังไม่บันทึกวันนี้ (${fmtDate(today)})`,
      href: '/meter',
    },
    {
      icon: '🏢', label: 'Meter อาคาร', schedule: 'ทุกวันศุกร์',
      done: bmStatus ? !bmStatus.shouldAlert : null,
      detail: !bmStatus ? '…'
        : !bmStatus.shouldAlert
          ? (bmStatus.thisWeekDone ? `บันทึกแล้ว ${bmStatus.thisWeek}` : 'สัปดาห์ที่แล้วครบแล้ว')
          : bmStatus.missingLastWeek
            ? `ยังไม่บันทึกสัปดาห์ที่แล้ว (${bmStatus.prevWeek})`
            : `วันนี้ศุกร์ ยังไม่บันทึกสัปดาห์นี้ (${bmStatus.thisWeek})`,
      href: '/building-meter',
    },
  ];

  const pendingCount = SIMPLE_ROWS.filter(r => r.done === false).length
    + PM_TYPES.filter(({ type }) => pmData && (pmData[type].overdue > 0 || pmData[type].due > 0)).length;

  return (
    <div className="sn-shell">
      <Sidenav />
      <main className="sn-shell-main adm-main">

        <header className="adm-hdr">
          <div className="adm-hdr-left">
            {view !== 'dashboard' && (
              <button className="adm-back" onClick={() => setView('dashboard')}>‹</button>
            )}
            <div>
              <h1 className="adm-title">
                {view === 'dashboard' && '🏠 ภาพรวมระบบ'}
                {view === 'users' && '👥 จัดการผู้ใช้'}
                {view === 'delete-reports' && '⚙️ ตั้งค่าระบบ / ลบรายงาน'}
              </h1>
              <p className="adm-sub">
                {view === 'dashboard' && 'Admin Dashboard · Facility Inspection'}
                {view === 'users' && 'กำหนดสิทธิ์การใช้งาน'}
                {view === 'delete-reports' && 'ค้นหา ตัวกรอง และลบรายงานที่ไม่ต้องการ (เฉพาะ Admin 8888)'}
              </p>
            </div>
          </div>
          <div className="adm-hdr-actions">
            <div className="adm-tabs-pills">
              <button
                type="button"
                className={`tab-pill ${view === 'dashboard' ? 'active' : ''}`}
                onClick={() => setView('dashboard')}
              >
                🏠 ภาพรวม
              </button>
              <button
                type="button"
                className={`tab-pill ${view === 'delete-reports' ? 'active' : ''}`}
                onClick={() => setView('delete-reports')}
              >
                ⚙️ ลบรายงาน
              </button>
              <button
                type="button"
                className={`tab-pill ${view === 'users' ? 'active' : ''}`}
                onClick={() => setView('users')}
              >
                👥 จัดการผู้ใช้
              </button>
            </div>
            <button className="adm-btn-home" onClick={() => router.push('/')} title="ไปหน้าแรก (เมนูลัด)">
              <span>🏠</span> หน้าแรก
            </button>
            {view === 'dashboard' && (
              <button className="adm-refresh" onClick={loadDashboard} disabled={dashLoading} title="รีเฟรชข้อมูล">
                <span style={{ display:'inline-block', animation: dashLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              </button>
            )}
            {view === 'delete-reports' && (
              <button className="adm-refresh" onClick={loadAllReports} disabled={reportsLoading} title="รีเฟรชรายการรายงาน">
                <span style={{ display:'inline-block', animation: reportsLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
              </button>
            )}
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="dash">
            {dashErr && <p className="dash-err">{dashErr}</p>}

            {/* Stat cards */}
            <div className="stat-row">
              <div className="stat-card sc--orange">
                <div className="sc-num">{dates ? pendingCount : '…'}</div>
                <div className="sc-lbl">งานที่ยังไม่เสร็จ</div>
                <div className="sc-icon">⏳</div>
              </div>
              <div className="stat-card sc--red">
                <div className="sc-num">{pmData ? totalOverdue : '…'}</div>
                <div className="sc-lbl">อาคารเกินกำหนด PM</div>
                <div className="sc-icon">🔴</div>
              </div>
            </div>

            {/* Pending actions */}
            <section className="dash-sec">
              <div className="dash-sec-hd">
                รายการที่ต้องดำเนินการ
                {pendingCount > 0 && <span className="badge-pill">{pendingCount}</span>}
              </div>
              <div className="action-table">

                {/* Simple rows: FPG / Meter กฟน. / Meter อาคาร */}
                {SIMPLE_ROWS.map(row => (
                  <div key={row.label}
                    className={`action-row${row.done === false ? ' action-row--alert' : ''}`}>
                    <span className="ar-icon">{row.icon}</span>
                    <div className="ar-info">
                      <span className="ar-name">{row.label}</span>
                      <span className="ar-schedule">{row.schedule}</span>
                    </div>
                    <div className="ar-status">
                      {row.done === null
                        ? <span className="chip chip--loading">กำลังโหลด…</span>
                        : row.done
                          ? <span className="chip chip--ok">✅ {row.detail}</span>
                          : <span className="chip chip--overdue">⚠️ {row.detail}</span>
                      }
                    </div>
                    <button className="ar-btn" onClick={() => router.push(row.href)}>บันทึก ›</button>
                  </div>
                ))}

                {/* PM rows: Emergency / Smoke / Exit — expandable */}
                {PM_TYPES.map(({ type, icon, label }) => {
                  const s     = pmData?.[type];
                  const det   = pmDetails?.[type];
                  const hasProblems = det && (det.overdue.length + det.due.length + det.never.length > 0);
                  const isExp = expandedPM.has(type);
                  const isAlert = s && (s.overdue > 0 || s.due > 0);

                  return (
                    <Fragment key={type}>
                      <div className={`action-row${isAlert ? ' action-row--alert' : ''}`}>
                        <span className="ar-icon">{icon}</span>
                        <div className="ar-info">
                          <span className="ar-name">{label}</span>
                          <span className="ar-schedule">ทุก {FREQ_MONTHS} เดือน · {BUILDINGS.length} อาคาร</span>
                        </div>
                        <div className="ar-status">
                          {pmChip(s)}
                          {hasProblems && (
                            <button className="ar-expand" onClick={() => togglePM(type)}>
                              {isExp ? '▲ ซ่อน' : '▼ ดูอาคาร'}
                            </button>
                          )}
                        </div>
                        <button className="ar-btn" onClick={() => router.push(`/form/${type}?date=${today}`)}>
                          บันทึก ›
                        </button>
                      </div>

                      {isExp && det && hasProblems && (
                        <div className="pm-detail-panel">
                          {det.overdue.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--overdue">🔴 เกินกำหนด ({det.overdue.length})</span>
                              <div className="pm-tags">
                                {det.overdue.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--overdue"
                                    title={`ครั้งล่าสุด: ${fmtDate(b.lastDate)} · เกินมา ${b.daysOver} วัน`}>
                                    {b.building}
                                    <em>+{b.daysOver}ว.</em>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {det.due.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--due">🟡 ใกล้ครบ ({det.due.length})</span>
                              <div className="pm-tags">
                                {det.due.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--due"
                                    title={`ครั้งล่าสุด: ${fmtDate(b.lastDate)} · อีก ${b.daysLeft} วัน`}>
                                    {b.building}
                                    <em>{b.daysLeft}ว.</em>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {det.never.length > 0 && (
                            <div className="pm-group">
                              <span className="pm-group-lbl pm-gl--never">⚫ ยังไม่เคยบันทึก ({det.never.length})</span>
                              <div className="pm-tags">
                                {det.never.map(b => (
                                  <span key={b.building} className="pm-tag pm-tag--never">{b.building}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </section>

            {/* System Trends & Condition Analytics */}
            <SystemTrends />

            {/* Delete requests */}
            {pendingReqs !== null && pendingReqs.length > 0 && (
              <section className="dash-sec">
                <div className="dash-sec-hd">
                  📋 คำขอลบรอดำเนินการ
                  <span className="badge-pill">{pendingReqs.length}</span>
                </div>
                <div className="req-list">
                  {pendingReqs.map(req => (
                    <div key={req.id} className="req-row">
                      <div className="req-meta">
                        <span className={`req-type-tag rt--${req.type}`}>{req.type}</span>
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

        {/* User Management */}
        {view === 'users' && (
          <div className="users-wrap">
            <section className="section">
              {err && <p className="u-err">{err}</p>}
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

        {/* Delete Reports Management */}
        {view === 'delete-reports' && (
          <div className="del-view">
            {/* Top overview stats */}
            <div className="del-overview-card">
              <div className="doc-left">
                <div className="doc-title">🗑️ จัดการลบรายงานในระบบ</div>
                <div className="doc-desc">
                  ค้นหา กรองตามหมวดหมู่/ปี/อาคาร และลบรายงานที่ไม่ต้องการออกจากฐานข้อมูลถาวร
                </div>
              </div>
              <div className="doc-stats">
                <div className="stat-pill">
                  <span className="sp-val">{allReports.length}</span>
                  <span className="sp-lbl">รายงานทั้งหมด</span>
                </div>
                <div className="stat-pill stat-pill--highlight">
                  <span className="sp-val">{filteredReports.length}</span>
                  <span className="sp-lbl">ตรงตามตัวกรอง</span>
                </div>
              </div>
            </div>

            {/* Filter controls box */}
            <div className="filter-box">
              <div className="fb-hd">
                <span>🔍 ตัวกรองค้นหารายงาน</span>
                {(filterMenu !== 'all' || filterYear !== 'all' || filterBuilding !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    className="fb-reset-btn"
                    onClick={() => {
                      setFilterMenu('all');
                      setFilterYear('all');
                      setFilterBuilding('all');
                      setSearchQuery('');
                    }}
                  >
                    ↺ ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>

              <div className="fb-grid">
                {/* 1. Menu Filter */}
                <div className="fb-field">
                  <label className="fb-label">หมวดหมู่ / เมนูระบบ</label>
                  <select
                    className="fb-select"
                    value={filterMenu}
                    onChange={e => setFilterMenu(e.target.value)}
                  >
                    {MENU_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Year Filter */}
                <div className="fb-field">
                  <label className="fb-label">ปี (พ.ศ. / ค.ศ.)</label>
                  <select
                    className="fb-select"
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                  >
                    <option value="all">📅 ทุกปี</option>
                    {availableYears.map(y => {
                      const num = parseInt(y, 10);
                      const thYear = isNaN(num) ? y : num + 543;
                      return (
                        <option key={y} value={y}>
                          พ.ศ. {thYear} ({y})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. Building Filter */}
                <div className="fb-field">
                  <label className="fb-label">อาคาร / สถานที่</label>
                  <select
                    className="fb-select"
                    value={filterBuilding}
                    onChange={e => setFilterBuilding(e.target.value)}
                  >
                    <option value="all">🏢 ทุกอาคาร</option>
                    {availableBuildings.map(b => (
                      <option key={b} value={b}>
                        อาคาร {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Search Filter */}
                <div className="fb-field fb-field--search">
                  <label className="fb-label">ค้นหาคำสำคัญ</label>
                  <div className="fb-input-wrap">
                    <input
                      type="text"
                      className="fb-input"
                      placeholder="พิมพ์วันที่, อาคาร, ชั้น, ชื่อไฟล์..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button type="button" className="fb-clear-text" onClick={() => setSearchQuery('')}>×</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reports List */}
            {reportsLoading ? (
              <div className="del-loading-state">
                <span className="loading-spinner">🔄</span>
                <p>กำลังโหลดรายการรายงานทั้งหมดจากระบบ...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="del-empty-state">
                <span className="empty-emoji">🔍</span>
                <div className="empty-title">ไม่พบรายงานที่ตรงตามเงื่อนไข</div>
                <div className="empty-sub">ลองเปลี่ยนตัวกรอง หรือกดปุ่ม &quot;ล้างตัวกรองทั้งหมด&quot;</div>
              </div>
            ) : (
              <div className="del-list-wrap">
                <div className="del-list-header">
                  <span>พบรายงานทั้งหมด {filteredReports.length} รายการ</span>
                </div>
                <div className="del-table">
                  <div className="del-th-row">
                    <div className="del-th col-date">วันที่บันทึก</div>
                    <div className="del-th col-menu">หมวดหมู่ / เมนู</div>
                    <div className="del-th col-bldg">อาคาร / ชั้น</div>
                    <div className="del-th col-file">ชื่อไฟล์ / ที่จัดเก็บ</div>
                    <div className="del-th col-act">การจัดการ</div>
                  </div>
                  {filteredReports.map((rep, idx) => {
                    const info = getMenuInfo(rep.type);
                    const isDeleting = deletingPath === (rep._path || rep.filename || rep.date);
                    return (
                      <div key={rep._path || rep.filename || idx} className="del-tr-row">
                        <div className="del-td col-date">
                          <span className="dt-primary">{fmtDate(rep.date)}</span>
                          <span className="dt-sub">{rep.date}</span>
                        </div>
                        <div className="del-td col-menu">
                          <span className={`menu-tag ${info.tagClass}`}>
                            {info.icon} {info.label}
                          </span>
                        </div>
                        <div className="del-td col-bldg">
                          {rep.building ? (
                            <div className="bldg-badge">
                              <span className="bldg-icon">🏢</span>
                              <span className="bldg-name">{rep.building}</span>
                              {rep.floor && <span className="bldg-floor">ชั้น {rep.floor}</span>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                        <div className="del-td col-file">
                          <div className="file-info" title={rep._path || rep.filename}>
                            <span className="file-name">{rep.filename || rep._path}</span>
                            {rep._path && <span className="file-path">{rep._path}</span>}
                          </div>
                        </div>
                        <div className="del-td col-act">
                          <button
                            type="button"
                            className="btn-del-action"
                            disabled={isDeleting}
                            onClick={() => setConfirmDelModal(rep)}
                            title="ลบรายงานนี้ออกจากระบบ"
                          >
                            {isDeleting ? 'กำลังลบ...' : '🗑️ ลบรายงาน'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelModal && (
              <div className="del-modal-backdrop" onClick={() => !deletingPath && setConfirmDelModal(null)}>
                <div className="del-modal-card" onClick={e => e.stopPropagation()}>
                  <div className="dm-icon">⚠️</div>
                  <h3 className="dm-title">ยืนยันการลบรายงาน</h3>
                  <p className="dm-warning">
                    คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้ และไฟล์จะถูกลบออกจากฐานข้อมูลถาวร
                  </p>
                  <div className="dm-details">
                    <div className="dm-row">
                      <span className="dm-k">หมวดหมู่ระบบ:</span>
                      <span className="dm-v">{getMenuInfo(confirmDelModal.type).icon} {getMenuInfo(confirmDelModal.type).label}</span>
                    </div>
                    <div className="dm-row">
                      <span className="dm-k">วันที่บันทึก:</span>
                      <span className="dm-v">{fmtDate(confirmDelModal.date)} ({confirmDelModal.date})</span>
                    </div>
                    {confirmDelModal.building && (
                      <div className="dm-row">
                        <span className="dm-k">สถานที่:</span>
                        <span className="dm-v">อาคาร {confirmDelModal.building} {confirmDelModal.floor ? `ชั้น ${confirmDelModal.floor}` : ''}</span>
                      </div>
                    )}
                    <div className="dm-row">
                      <span className="dm-k">ชื่อไฟล์:</span>
                      <span className="dm-v"><code className="dm-code">{confirmDelModal.filename || confirmDelModal._path}</code></span>
                    </div>
                  </div>
                  <div className="dm-actions">
                    <button
                      type="button"
                      className="dm-btn-cancel"
                      disabled={deletingPath != null}
                      onClick={() => setConfirmDelModal(null)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      className="dm-btn-confirm"
                      disabled={deletingPath != null}
                      onClick={() => handleDeleteReport(confirmDelModal)}
                    >
                      {deletingPath ? 'กำลังลบ...' : '🗑️ ยืนยันลบถาวร'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .adm-main { background: var(--bg-base, var(--bg-surface-raised)); min-height: 100dvh; }

        /* ── Header ── */
        .adm-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px 18px;
          border-bottom: 1px solid var(--border-hairline);
          background: var(--bg-surface);
          position: sticky; top: 0; z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
          width: 100%;
          box-sizing: border-box;
        }
        .adm-hdr-left { display: flex; align-items: center; gap: 12px; }
        .adm-back  { background: none; border: none; font-size: 28px; color: var(--ink-muted); cursor: pointer; padding: 0 6px 0 0; line-height: 1; }
        .adm-title { font-size: 20px; font-weight: 800; color: var(--ink-primary); margin: 0; }
        .adm-sub   { font-size: 12px; color: var(--ink-muted); margin: 2px 0 0; }
        .adm-hdr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .adm-tabs-pills { display: flex; align-items: center; background: var(--bg-surface-raised); padding: 3px; border-radius: 12px; border: 1px solid var(--border-hairline); gap: 4px; }
        .tab-pill {
          background: transparent; border: none; color: var(--ink-secondary);
          padding: 6px 12px; border-radius: 9px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all .15s; font-family: inherit; display: flex; align-items: center; gap: 4px;
        }
        .tab-pill:hover { color: var(--ink-primary); background: rgba(255,255,255,0.04); }
        .tab-pill.active { background: var(--accent); color: #fff; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
        .adm-btn-home {
          display: flex; align-items: center; gap: 6px;
          background: rgba(37,99,235,0.14); border: 1px solid rgba(59,130,246,0.35);
          color: #60a5fa; border-radius: 10px; padding: 7px 12px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all .15s; font-family: inherit;
        }
        .adm-btn-home:hover { background: rgba(37,99,235,0.25); color: #93c5fd; border-color: #60a5fa; }
        .adm-refresh {
          background: var(--bg-surface-raised); border: 1px solid var(--border-hairline);
          border-radius: 10px; width: 38px; height: 38px; cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center; transition: background .12s;
        }
        .adm-refresh:hover { background: var(--border-hairline); }
        .adm-refresh:disabled { opacity: .5; cursor: default; }

        /* ── Dashboard ── */
        .dash {
          padding: 24px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
          max-width: none;
          box-sizing: border-box;
        }
        .dash-err { color: var(--status-fail); background: var(--status-fail-bg); border-radius: 10px; padding: 10px 14px; font-size: 13px; }

        /* Stat cards — 2 columns across full width */
        .stat-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 640px) {
          .stat-row { grid-template-columns: 1fr; }
        }
        .stat-card {
          position: relative; overflow: hidden; border-radius: 16px; padding: 22px 24px 18px;
          display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .sc--orange { background: linear-gradient(135deg, rgba(217,119,6,0.18), rgba(120,53,15,0.35)); border: 1px solid rgba(245,158,11,0.4); }
        .sc--red    { background: linear-gradient(135deg, rgba(220,38,38,0.18), rgba(127,29,29,0.35)); border: 1px solid rgba(239,68,68,0.4); }
        .sc-num  { font-size: 36px; font-weight: 900; line-height: 1; }
        .sc--orange .sc-num { color: #fbbf24; }
        .sc--red .sc-num { color: #f87171; }
        .sc-lbl  { font-size: 13px; font-weight: 600; color: var(--ink-secondary); }
        .sc-icon { position: absolute; right: 18px; top: 18px; font-size: 32px; opacity: .25; }

        /* Section label */
        .dash-sec { display: flex; flex-direction: column; gap: 12px; }
        .dash-sec-hd {
          font-size: 14px; font-weight: 800; color: var(--ink-primary);
          display: flex; align-items: center; gap: 8px;
        }
        .badge-pill {
          background: var(--status-fail); color: #fff;
          font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 8px; line-height: 1.6;
        }

        /* Action table */
        .action-table {
          background: var(--bg-surface); border: 1px solid var(--border-hairline);
          border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05);
        }
        .action-row {
          display: grid; grid-template-columns: 36px 1fr auto auto;
          align-items: center; gap: 14px; padding: 14px 18px;
          border-top: 1px solid var(--border-hairline); transition: background .1s;
        }
        .action-row:first-child { border-top: none; }
        .action-row:hover { background: var(--bg-surface-raised); }
        /* alert rows in dark theme */
        .action-row--alert { background: rgba(245, 158, 11, 0.08) !important; }
        .action-row--alert:hover { background: rgba(245, 158, 11, 0.14) !important; }
        .action-row--alert .ar-name     { color: #fbbf24; }
        .action-row--alert .ar-schedule { color: #f59e0b; }

        .ar-icon     { font-size: 22px; text-align: center; flex-shrink: 0; }
        .ar-info     { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ar-name     { font-size: 13px; font-weight: 700; color: var(--ink-primary); }
        .ar-schedule { font-size: 11px; color: var(--ink-muted); }
        .ar-status   { display: flex; align-items: center; gap: 6px; }
        .ar-expand {
          background: var(--bg-surface-raised); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600;
          color: var(--accent-strong); cursor: pointer; white-space: nowrap; transition: background .1s;
        }
        .ar-expand:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
        .ar-btn {
          background: var(--bg-surface-raised); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600;
          color: var(--accent-strong); cursor: pointer; white-space: nowrap; transition: background .12s;
          flex-shrink: 0;
        }
        .ar-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

        /* Chips — dark theme tinted pills */
        .chip {
          font-size: 12px; font-weight: 600; border-radius: 8px; padding: 4px 10px;
          white-space: nowrap; border: 1px solid transparent;
        }
        .chip--ok      { background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.35); }
        .chip--overdue { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.35); }
        .chip--due     { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35); }
        .chip--never   { background: var(--bg-surface-raised); color: var(--ink-secondary); border-color: var(--border-strong); }
        .chip--loading { background: var(--bg-surface-raised); color: var(--ink-muted); font-style: italic; border-color: var(--border-hairline); }

        /* PM expandable details */
        .pm-detail-panel {
          padding: 14px 18px 16px 72px;
          background: var(--bg-surface-raised); border-top: 1px solid var(--border-hairline);
          display: flex; flex-direction: column; gap: 10px;
        }
        .pm-group { display: flex; flex-direction: column; gap: 6px; }
        .pm-group-lbl { font-size: 11px; font-weight: 700; }
        .pm-gl--overdue { color: #f87171; }
        .pm-gl--due     { color: #fbbf24; }
        .pm-gl--never   { color: var(--ink-muted); }
        .pm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pm-tag {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600; border-radius: 8px;
          padding: 4px 10px; cursor: default; border: 1px solid transparent;
        }
        .pm-tag em { font-style: normal; font-size: 10px; opacity: .8; }
        .pm-tag--overdue { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }
        .pm-tag--due     { background: rgba(245, 158, 11, 0.15); color: #fcd34d; border-color: rgba(245, 158, 11, 0.3); }
        .pm-tag--never   { background: var(--bg-surface-raised); color: var(--ink-secondary); border-color: var(--border-strong); }

        /* Delete requests */
        .req-list { display: flex; flex-direction: column; gap: 10px; }
        .req-row {
          background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 14px;
          padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .req-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .req-type-tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; background: var(--bg-surface-raised); color: var(--ink-secondary); border: 1px solid var(--border-strong); }
        .rt--emergency { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
        .rt--smoke     { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
        .rt--exit      { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3); }
        .req-date   { font-size: 12px; font-weight: 600; color: var(--ink-secondary); }
        .req-bldg   { font-size: 12px; color: var(--ink-muted); }
        .req-reason { font-size: 13px; color: var(--ink-secondary); font-style: italic; }
        .req-foot   { display: flex; align-items: center; justify-content: space-between; }
        .req-by     { font-size: 11px; color: var(--ink-muted); }
        .req-btns   { display: flex; gap: 6px; }
        .req-btn    { border: none; border-radius: 9px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .12s; }
        .req-btn:disabled { opacity: .5; cursor: default; }
        .rb--approve { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
        .rb--approve:hover:not(:disabled) { background: rgba(34, 197, 94, 0.3); }
        .rb--reject  { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
        .rb--reject:hover:not(:disabled)  { background: rgba(239, 68, 68, 0.3); }

        /* Quick links */
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
        }
        .quick-card {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 12px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 14px;
          cursor: pointer; transition: all .12s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .quick-card:hover { background: var(--bg-surface-raised); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .qc-icon  { font-size: 26px; }
        .qc-label { font-size: 12px; font-weight: 600; color: var(--ink-secondary); text-align: center; line-height: 1.3; }

        @media (max-width: 640px) {
          .adm-hdr { padding: 16px 16px 14px; }
          .dash { padding: 16px 14px 36px; gap: 20px; }
          .quick-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* User management */
        .users-wrap { padding: 24px 28px; max-width: 640px; }
        .section { display: flex; flex-direction: column; gap: 14px; }
        .u-err { color: var(--status-fail); font-size: 13px; background: var(--status-fail-bg); border-radius: 8px; padding: 8px 12px; margin: 0; }
        .add-box { display: flex; flex-direction: column; gap: 6px; }
        .lbl { font-size: 12px; font-weight: 700; color: var(--ink-muted); }
        .add-row { display: flex; gap: 8px; }
        .inp { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border-strong); background: var(--bg-input); color: var(--ink-primary); font-size: 14px; }
        .btn { padding: 10px 16px; border-radius: 10px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .btn:disabled { opacity: .5; }
        .hint { font-size: 11px; color: var(--ink-muted); margin: 0; line-height: 1.6; }
        .group { background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: 14px; overflow: hidden; }
        .group-hd { padding: 10px 14px; background: var(--bg-surface-raised); font-size: 13px; font-weight: 700; color: var(--ink-primary); border-bottom: 1px solid var(--border-hairline); }
        .empty { padding: 12px 14px; font-size: 13px; color: var(--ink-muted); margin: 0; }
        .row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border-hairline); }
        .email { flex: 1; font-size: 13px; color: var(--ink-primary); word-break: break-all; }
        .tag { font-size: 11px; font-weight: 700; border-radius: 8px; padding: 3px 8px; white-space: nowrap; border: 1px solid transparent; }
        .tag--admin   { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
        .tag--user    { background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3); }
        .tag--visitor { background: var(--bg-surface-raised); color: var(--ink-muted); border-color: var(--border-strong); }
        .btn-sm { background: var(--bg-surface-raised); border: 1px solid var(--border-strong); color: var(--ink-secondary); border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .btn-sm--promote { background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4); color: #4ade80; }
        .btn-sm:disabled { opacity: .5; }

        /* ── Delete Reports View ── */
        .del-view {
          padding: 24px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .del-overview-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        @media (max-width: 768px) {
          .del-overview-card { flex-direction: column; align-items: flex-start; }
        }
        .doc-left { display: flex; flex-direction: column; gap: 4px; }
        .doc-title { font-size: 18px; font-weight: 800; color: var(--ink-primary); }
        .doc-desc  { font-size: 13px; color: var(--ink-secondary); }
        .doc-stats { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .stat-pill {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }
        .stat-pill--highlight {
          background: rgba(37,99,235,0.12);
          border-color: rgba(59,130,246,0.35);
        }
        .stat-pill--highlight .sp-val { color: #60a5fa; }
        .sp-val { font-size: 20px; font-weight: 800; color: var(--ink-primary); line-height: 1.1; }
        .sp-lbl { font-size: 11px; font-weight: 600; color: var(--ink-muted); margin-top: 2px; }

        /* Filter Box */
        .filter-box {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .fb-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .fb-reset-btn {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--ink-secondary);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all .12s;
        }
        .fb-reset-btn:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.4); }

        .fb-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr) 1.5fr;
          gap: 14px;
          align-items: flex-end;
        }
        @media (max-width: 900px) {
          .fb-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .fb-grid { grid-template-columns: 1fr; }
        }
        .fb-field { display: flex; flex-direction: column; gap: 6px; }
        .fb-label { font-size: 12px; font-weight: 700; color: var(--ink-secondary); }
        .fb-select, .fb-input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-input, var(--bg-surface-raised));
          color: var(--ink-primary);
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color .15s;
        }
        .fb-select:focus, .fb-input:focus { border-color: var(--accent); }
        .fb-input-wrap { position: relative; display: flex; align-items: center; }
        .fb-clear-text {
          position: absolute; right: 10px;
          background: none; border: none; color: var(--ink-muted);
          cursor: pointer; font-size: 18px; line-height: 1; padding: 2px 4px;
        }

        /* States */
        .del-loading-state, .del-empty-state {
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          color: var(--ink-muted);
          text-align: center;
        }
        .loading-spinner { font-size: 32px; animation: spin 1s linear infinite; display: inline-block; }
        .empty-emoji { font-size: 38px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--ink-secondary); }
        .empty-sub { font-size: 13px; color: var(--ink-muted); }

        /* Report List Table */
        .del-list-wrap {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .del-list-header {
          padding: 12px 20px;
          background: var(--bg-surface-raised);
          border-bottom: 1px solid var(--border-hairline);
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-secondary);
        }
        .del-table { display: flex; flex-direction: column; }
        .del-th-row {
          display: grid;
          grid-template-columns: 140px 180px 140px 1fr 120px;
          padding: 12px 18px;
          background: rgba(0,0,0,0.08);
          border-bottom: 1px solid var(--border-hairline);
          font-size: 12px;
          font-weight: 800;
          color: var(--ink-muted);
          align-items: center;
        }
        .del-tr-row {
          display: grid;
          grid-template-columns: 140px 180px 140px 1fr 120px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-hairline);
          align-items: center;
          transition: background .12s;
        }
        .del-tr-row:last-child { border-bottom: none; }
        .del-tr-row:hover { background: var(--bg-surface-raised); }

        @media (max-width: 860px) {
          .del-th-row { display: none; }
          .del-tr-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 16px 18px;
          }
          .del-td.col-act { width: 100%; }
          .btn-del-action { width: 100%; justify-content: center; }
        }

        .del-td { font-size: 13px; color: var(--ink-primary); }
        .col-date { display: flex; flex-direction: column; gap: 2px; }
        .dt-primary { font-weight: 700; font-size: 13px; color: var(--ink-primary); }
        .dt-sub { font-size: 11px; color: var(--ink-muted); }

        .menu-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .tag-fpg   { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.35); }
        .tag-emerg { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35); }
        .tag-smoke { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border-color: rgba(220, 38, 38, 0.35); }
        .tag-exit  { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.35); }
        .tag-elec  { background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.35); }
        .tag-other { background: var(--bg-surface-raised); color: var(--ink-secondary); border-color: var(--border-strong); }

        .bldg-badge { display: flex; align-items: center; gap: 6px; }
        .bldg-icon { font-size: 14px; opacity: .7; }
        .bldg-name { font-weight: 700; font-size: 13px; color: var(--ink-primary); }
        .bldg-floor { font-size: 11px; color: var(--ink-muted); background: var(--bg-surface-raised); padding: 2px 6px; border-radius: 6px; }
        .text-muted { color: var(--ink-muted); }

        .file-info { display: flex; flex-direction: column; gap: 2px; overflow: hidden; padding-right: 12px; }
        .file-name { font-weight: 600; font-size: 12px; color: var(--ink-secondary); word-break: break-all; }
        .file-path { font-size: 10px; color: var(--ink-muted); word-break: break-all; font-family: monospace; }

        .btn-del-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          border-radius: 9px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .btn-del-action:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
          border-color: #ef4444;
          color: #fca5a5;
        }
        .btn-del-action:disabled { opacity: .5; cursor: default; }

        /* Modal Backdrop & Card */
        .del-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }
        .del-modal-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: 18px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
          animation: popIn .18s ease-out;
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .dm-icon { font-size: 36px; text-align: center; }
        .dm-title { font-size: 18px; font-weight: 800; color: #f87171; text-align: center; margin: 0; }
        .dm-warning {
          font-size: 13px;
          color: var(--ink-secondary);
          text-align: center;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          margin: 0;
          line-height: 1.5;
        }
        .dm-details {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-hairline);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
        }
        .dm-row { display: flex; gap: 8px; }
        .dm-k { font-weight: 700; color: var(--ink-muted); min-width: 90px; }
        .dm-v { color: var(--ink-primary); word-break: break-all; }
        .dm-code { font-size: 11px; background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 6px; font-family: monospace; }
        .dm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
        .dm-btn-cancel {
          background: var(--bg-surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--ink-secondary);
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .dm-btn-cancel:hover:not(:disabled) { background: var(--border-strong); color: var(--ink-primary); }
        .dm-btn-confirm {
          background: #dc2626;
          border: none;
          color: #fff;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(220,38,38,0.35);
          font-family: inherit;
        }
        .dm-btn-confirm:hover:not(:disabled) { background: #ef4444; }
        .dm-btn-confirm:disabled, .dm-btn-cancel:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="msg">กำลังโหลด...</main>}>
      <AdminInner />
    </Suspense>
  );
}
