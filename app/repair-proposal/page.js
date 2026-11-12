'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidenav from '../components/Sidenav';

function RepairProposalListInner() {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingRef, setDeletingRef] = useState(null);

  // Fetch proposals from API
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repair-proposals', { cache: 'no-store' });
      const json = await res.json();
      if (json && json.proposals) {
        setProposals(json.proposals);
      }
    } catch (err) {
      console.error('Fetch proposals error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleDelete = async (refNo) => {
    if (!confirm(`ยืนยันการลบใบเสนอแจ้งซ่อมเลขที่ ${refNo} ใช่หรือไม่?`)) return;
    setDeletingRef(refNo);
    try {
      const res = await fetch(`/api/repair-proposals?refNo=${encodeURIComponent(refNo)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setProposals(prev => prev.filter(p => p.refNo !== refNo));
      } else {
        alert('ลบไม่สำเร็จ: ' + (data?.error || 'กรุณาลองใหม่อีกครั้ง'));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingRef(null);
    }
  };

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(item => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || 
        (item.refNo && item.refNo.toLowerCase().includes(q)) ||
        (item.fmRefNo && item.fmRefNo.toLowerCase().includes(q)) ||
        (item.jobTitle && item.jobTitle.toLowerCase().includes(q)) ||
        (item.inspector?.name && item.inspector.name.toLowerCase().includes(q)) ||
        (item.surveyPoints && item.surveyPoints.some(sp => sp.building && sp.building.toLowerCase().includes(q)));

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [proposals, search, statusFilter]);

  // Statistics
  const totalCount = proposals.length;
  const pendingCount = proposals.filter(p => p.status === 'pending_approval' || !p.status).length;
  const approvedCount = proposals.filter(p => p.status === 'approved').length;
  const totalDefectPoints = proposals.reduce((acc, p) => acc + (p.surveyPoints?.length || 0), 0);

  return (
    <div className="sn-shell" style={{ minHeight: '100vh', background: 'var(--bg-base, #0c1220)', color: 'var(--ink-primary, #eef2ff)' }}>
      <Sidenav />
      
      <main className="sn-shell-main" style={{ flex: 1, padding: '24px 28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>📝</span>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                  ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์
                </h1>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)', margin: '4px 0 0' }}>
                  ระบบจัดทำ จัดเก็บ และตรวจสอบประวัติใบเสนอจัดซื้อเปลี่ยนอุปกรณ์/อะไหล่สำหรับแก้ไขงาน
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={() => router.push('/repair-proposal/new')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--accent, #2563eb)',
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
                transition: 'background 0.15s'
              }}>
              <span>➕ สร้างใบเสนอซ่อมใหม่</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', fontWeight: 600 }}>ใบเสนอทั้งหมด</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', marginTop: 4 }}>{totalCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>รอพิจารณาอนุมัติ</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>{pendingCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>อนุมัติเรียบร้อย</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', marginTop: 4 }}>{approvedCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>รวมจุดสำรวจชำรุด</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#60a5fa', marginTop: 4 }}>{totalDefectPoints} <span style={{ fontSize: 14, fontWeight: 500 }}>จุด</span></div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <input 
              type="text" 
              placeholder="🔍 ค้นหาเลขที่ใบแจ้งซ่อม, ชื่องาน, รหัสอาคาร, หรือชื่อผู้แจ้ง..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-strong, #2d3f5e)',
                background: 'var(--bg-input, #080e1a)',
                color: 'var(--ink-primary, #eef2ff)',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', fontWeight: 600 }}>สถานะ:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-strong, #2d3f5e)',
                background: 'var(--bg-input, #080e1a)',
                color: 'var(--ink-primary, #eef2ff)',
                fontSize: 13,
                cursor: 'pointer',
                outline: 'none'
              }}>
              <option value="all" style={{ background: '#0c1220', color: '#eef2ff' }}>ทั้งหมด ({totalCount})</option>
              <option value="pending_approval" style={{ background: '#0c1220', color: '#eef2ff' }}>รออนุมัติ ({pendingCount})</option>
              <option value="approved" style={{ background: '#0c1220', color: '#eef2ff' }}>อนุมัติแล้ว ({approvedCount})</option>
            </select>
            <button 
              onClick={fetchProposals}
              title="รีเฟรชข้อมูล"
              style={{
                padding: '8px 12px',
                background: 'var(--bg-surface-raised, #172340)',
                border: '1px solid var(--border-strong, #2d3f5e)',
                borderRadius: 8,
                color: 'var(--ink-primary, #eef2ff)',
                cursor: 'pointer',
                fontSize: 13
              }}>
              🔄
            </button>
          </div>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-secondary, #94a3c4)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <div>กำลังโหลดข้อมูลประวัติใบเสนอแจ้งซ่อม...</div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px dashed var(--border-strong, #2d3f5e)', borderRadius: 12, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: 18, color: 'var(--ink-primary, #eef2ff)', margin: '0 0 6px' }}>ยังไม่มีรายการใบเสนอแจ้งซ่อม</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 16px' }}>
              สามารถเริ่มต้นสร้างใบเสนอแจ้งซ่อมฉบับแรก หรือเปิดตัวอย่างได้ทันที
            </p>
            <button 
              onClick={() => router.push('/repair-proposal/new')}
              style={{
                background: 'var(--accent, #2563eb)',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}>
              ➕ สร้างใบเสนอซ่อมฉบับใหม่
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredProposals.map((item) => {
              const pointCount = item.surveyPoints?.length || 0;
              const itemsCount = item.itemsRequested?.length || 1;
              const firstItem = item.itemsRequested?.[0];
              const equipName = itemsCount > 1 
                ? `${itemsCount} รายการ: ${firstItem?.name || ''}` 
                : (firstItem?.name || item.bomName || 'อุปกรณ์/อะไหล่');
              const equipModel = firstItem?.modelPart || item.bomModelPart || item.bomModel || '-';
              const equipQty = firstItem?.qty || item.bomQty || pointCount;
              const equipUnit = firstItem?.unit || item.bomUnit || 'ตัว';
              const isApproved = item.status === 'approved';

              return (
                <div 
                  key={item.refNo}
                  style={{
                    background: 'var(--bg-surface, #111d32)',
                    border: '1px solid var(--border-hairline, #1e2e4a)',
                    borderRadius: 12,
                    padding: '18px 22px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'border-color 0.15s, transform 0.15s'
                  }}>
                  
                  {/* Card Top */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border-hairline, #1e2e4a)', paddingBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ 
                          background: 'rgba(37, 99, 235, 0.22)', 
                          color: '#60a5fa', 
                          fontWeight: 800, 
                          fontSize: 13, 
                          padding: '3px 9px', 
                          borderRadius: 6,
                          border: '1px solid rgba(59, 130, 246, 0.4)'
                        }}>
                          {item.refNo}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)' }}>• วันที่ {item.docDate || item.docDateISO}</span>
                        {item.fmRefNo && (
                          <span style={{ 
                            background: 'rgba(2, 132, 199, 0.18)', 
                            color: '#38bdf8', 
                            fontSize: 11.5, 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            border: '1px solid rgba(2, 132, 199, 0.35)' 
                          }}>
                            FM: {item.fmRefNo}
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', margin: '4px 0' }}>
                        {item.jobTitle}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 11px',
                        borderRadius: 20,
                        background: isApproved ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: isApproved ? '#4ade80' : '#fbbf24',
                        border: `1px solid ${isApproved ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        {isApproved ? '✅ อนุมัติแล้ว' : '⏳ รอพิจารณาอนุมัติ'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, margin: '14px 0' }}>
                    <div style={{ background: 'var(--bg-surface-raised, #172340)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-hairline, #1e2e4a)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', fontWeight: 600 }}>📦 อุปกรณ์/อะไหล่ที่ขอจัดซื้อทดแทน:</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginTop: 2 }}>
                        {equipName}
                      </div>
                      <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>
                        {equipModel}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', marginTop: 2 }}>
                        จำนวน: <strong style={{ color: 'var(--ink-primary, #eef2ff)' }}>{equipQty} {equipUnit}</strong>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface-raised, #172340)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-hairline, #1e2e4a)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', fontWeight: 600 }}>📍 จุดติดตั้งที่พบปัญหา ({pointCount} จุด):</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-primary, #eef2ff)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {item.surveyPoints?.slice(0, 6).map((p, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-input, #080e1a)', color: '#eef2ff', border: '1px solid var(--border-strong, #2d3f5e)', padding: '2px 7px', borderRadius: 4, fontSize: 11.5, fontWeight: 600 }}>
                            {p.building}
                          </span>
                        ))}
                        {pointCount > 6 && (
                          <span style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', alignSelf: 'center' }}>+{pointCount - 6} จุด...</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', marginTop: 6 }}>
                        ผู้ตรวจสอบ: {item.inspector?.name || 'ช่างสำรวจหน้างาน'}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-hairline, #1e2e4a)', paddingTop: 12 }}>
                    <button 
                      onClick={() => router.push(`/repair-proposal/new?refNo=${encodeURIComponent(item.refNo)}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--bg-surface-raised, #172340)',
                        color: 'var(--ink-primary, #eef2ff)',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-strong, #2d3f5e)',
                        cursor: 'pointer'
                      }}>
                      <span>👁️ เปิดดู / พิมพ์ A4</span>
                    </button>

                    <button 
                      onClick={() => router.push(`/repair-proposal/new?edit=${encodeURIComponent(item.refNo)}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(37, 99, 235, 0.18)',
                        color: '#60a5fa',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        cursor: 'pointer'
                      }}>
                      <span>✏️ แก้ไข</span>
                    </button>

                    <button 
                      onClick={() => handleDelete(item.refNo)}
                      disabled={deletingRef === item.refNo}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        cursor: 'pointer'
                      }}>
                      <span>{deletingRef === item.refNo ? 'กำลังลบ...' : '🗑️ ลบ'}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}

export default function RepairProposalListPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดหน้าใบเสนอแจ้งซ่อม...</div>}>
      <RepairProposalListInner />
    </Suspense>
  );
}
