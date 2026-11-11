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
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.refNo !== refNo));
      } else {
        alert('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
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
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidenav />
      
      <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>📝</span>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f2e5a', margin: 0 }}>
                  ใบเสนอแจ้งซ่อม / เปลี่ยนทดแทนอุปกรณ์
                </h1>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
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
                background: '#0284c7',
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}>
              <span>➕ สร้างใบเสนอซ่อมใหม่</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ใบเสนอทั้งหมด</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f2e5a', marginTop: 4 }}>{totalCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'white', border: '1px solid #fef08a', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #eab308' }}>
            <div style={{ fontSize: 12, color: '#854d0e', fontWeight: 600 }}>รอพิจารณาอนุมัติ</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#a16207', marginTop: 4 }}>{pendingCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>อนุมัติเรียบร้อย</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d', marginTop: 4 }}>{approvedCount} <span style={{ fontSize: 14, fontWeight: 500 }}>ฉบับ</span></div>
          </div>
          <div style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>รวมจุดสำรวจชำรุด</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>{totalDefectPoints} <span style={{ fontSize: 14, fontWeight: 500 }}>จุด</span></div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <input 
              type="text" 
              placeholder="🔍 ค้นหาเลขที่ใบแจ้งซ่อม, ชื่องาน, รหัสอาคาร, หรือชื่อผู้แจ้ง..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>สถานะ:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: 'white',
                cursor: 'pointer'
              }}>
              <option value="all">ทั้งหมด ({totalCount})</option>
              <option value="pending_approval">รออนุมัติ ({pendingCount})</option>
              <option value="approved">อนุมัติแล้ว ({approvedCount})</option>
            </select>
            <button 
              onClick={fetchProposals}
              title="รีเฟรชข้อมูล"
              style={{
                padding: '8px 12px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}>
              🔄
            </button>
          </div>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div>กำลังโหลดข้อมูลประวัติใบเสนอแจ้งซ่อม...</div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ background: 'white', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: 18, color: '#334155', margin: '0 0 6px' }}>ยังไม่มีรายการใบเสนอแจ้งซ่อม</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              สามารถเริ่มต้นสร้างใบเสนอแจ้งซ่อมฉบับแรก หรือเปิดตัวอย่างได้ทันที
            </p>
            <button 
              onClick={() => router.push('/repair-proposal/new')}
              style={{
                background: '#0284c7',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer'
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
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '18px 22px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}>
                  
                  {/* Card Top */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ 
                          background: '#e0f2fe', 
                          color: '#0369a1', 
                          fontWeight: 800, 
                          fontSize: 13, 
                          padding: '2px 8px', 
                          borderRadius: 4 
                        }}>
                          {item.refNo}
                        </span>
                        <span style={{ fontSize: 13, color: '#64748b' }}>• วันที่ {item.docDate || item.docDateISO}</span>
                        {item.priority === 'high' && (
                          <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                            เร่งด่วนสูง
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f2e5a', margin: '4px 0' }}>
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
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: isApproved ? '#dcfce7' : '#fef9c3',
                        color: isApproved ? '#15803d' : '#854d0e',
                        border: `1px solid ${isApproved ? '#86efac' : '#fde047'}`
                      }}>
                        {isApproved ? '✅ อนุมัติแล้ว' : '⏳ รอพิจารณาอนุมัติ'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, margin: '14px 0' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>📦 อุปกรณ์/อะไหล่ที่ขอจัดซื้อทดแทน:</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                        {equipName}
                      </div>
                      <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
                        {equipModel}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                        จำนวน: <strong>{equipQty} {equipUnit}</strong>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>📍 จุดติดตั้งที่พบปัญหา ({pointCount} จุด):</div>
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {item.surveyPoints?.slice(0, 6).map((p, idx) => (
                          <span key={idx} style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 3, fontSize: 11.5, fontWeight: 600 }}>
                            {p.building}
                          </span>
                        ))}
                        {pointCount > 6 && (
                          <span style={{ fontSize: 11.5, color: '#64748b', alignSelf: 'center' }}>+{pointCount - 6} จุด...</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                        ผู้ตรวจสอบ: {item.inspector?.name || 'ช่างสำรวจหน้างาน'}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <button 
                      onClick={() => router.push(`/repair-proposal/new?refNo=${encodeURIComponent(item.refNo)}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#f1f5f9',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
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
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: '1px solid #bbf7d0',
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
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #fecaca',
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
