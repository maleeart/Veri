'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidenav from '../components/Sidenav';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { exportInspectionToExcel } from '../../src/lib/inspectionExcelExporter';

// Thai month names
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function getTodayThaiDate() {
  const d = new Date();
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

// Interactive Canvas Signature Pad Component
function SignaturePad({ value, onChange, label = 'ลงลายเซ็นผู้สำรวจ/ผู้บันทึก' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0f2e5a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    redrawStrokes();
  };

  const redrawStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    strokesRef.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    currentStrokeRef.current = [pos];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    currentStrokeRef.current.push(pos);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
      setHasDrawn(true);
      const canvas = canvasRef.current;
      if (canvas && onChange) {
        onChange(canvas.toDataURL('image/png'));
      }
    }
  };

  const clear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    if (onChange) onChange('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
          ✍️ {label}
        </label>
        <button
          type="button"
          onClick={clear}
          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          ล้างลายเซ็น
        </button>
      </div>

      <div style={{ position: 'relative', border: '1.5px dashed #94a3b8', borderRadius: 8, background: '#ffffff', overflow: 'hidden', height: 110, touchAction: 'none' }}>
        {value && !hasDrawn && (
          <img 
            src={value} 
            alt="Signature Preview" 
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', padding: 8 }} 
          />
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', position: 'relative', zIndex: 2 }}
        />
        {!hasDrawn && !value && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#94a3b8', fontSize: 12, fontStyle: 'italic', zIndex: 1 }}>
            ใช้นิ้วหรือเมาส์เซ็นชื่อในกรอบนี้
          </div>
        )}
      </div>
    </div>
  );
}

// Inner Component with Suspense
function InspectionSheetsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State: 'records' | 'templates'
  const [activeTab, setActiveTab] = useState('records');

  // Data States
  const [templates, setTemplates] = useState([]);
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('all');

  // Modals
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [showFillerModal, setShowFillerModal] = useState(false);
  const [activeTemplateForFill, setActiveTemplateForFill] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const [showDocModal, setShowDocModal] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [isBlankView, setIsBlankView] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const resTpl = await fetch('/api/inspection-sheets/templates', { cache: 'no-store' });
      const jsonTpl = await resTpl.json();
      if (jsonTpl.ok && Array.isArray(jsonTpl.templates)) {
        let finalTemplates = jsonTpl.templates;
        // Merge with locally stored templates if any
        try {
          const cached = localStorage.getItem('veri_inspection_templates');
          if (cached) {
            const localList = JSON.parse(cached);
            if (Array.isArray(localList)) {
              const serverIds = new Set(finalTemplates.map(t => t.id));
              const missingOnServer = localList.filter(t => !serverIds.has(t.id));
              if (missingOnServer.length > 0) {
                finalTemplates = [...missingOnServer, ...finalTemplates];
              }
            }
          }
        } catch {}
        setTemplates(finalTemplates);
        try {
          localStorage.setItem('veri_inspection_templates', JSON.stringify(finalTemplates));
        } catch {}
      }

      const resRec = await fetch('/api/inspection-sheets/records', { cache: 'no-store' });
      const jsonRec = await resRec.json();
      if (jsonRec.ok && Array.isArray(jsonRec.records)) {
        setRecords(jsonRec.records);
      }

      const resSet = await fetch('/api/inspection-sheets/settings', { cache: 'no-store' });
      const jsonSet = await resSet.json();
      if (jsonSet.ok && jsonSet.settings) {
        setSettings(jsonSet.settings);
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
        (r.recordNo && r.recordNo.toLowerCase().includes(q)) ||
        (r.templateName && r.templateName.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.inspector?.name && r.inspector.name.toLowerCase().includes(q));

      const matchTpl = selectedTemplateFilter === 'all' || r.templateId === selectedTemplateFilter;
      return matchSearch && matchTpl;
    });
  }, [records, searchQuery, selectedTemplateFilter]);

  // Handle Admin PIN Check
  const openAdmin = () => {
    if (isAdminAuth) {
      setShowAdminModal(true);
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '8888') {
      setIsAdminAuth(true);
      setShowPinModal(false);
      setShowAdminModal(true);
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้น 8888)');
    }
  };

  // Open Template Builder
  const handleCreateTemplate = () => {
    setEditingTemplate({
      name: '',
      code: `FM-ENG-${Math.floor(100 + Math.random() * 900)}`,
      department: settings?.header?.companySubtitle || 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร',
      frequency: 'รายเดือน',
      description: '',
      columns: [
        { id: 'c1', name: 'ลำดับ', type: 'text', width: 45, required: true },
        { id: 'c2', name: 'รายการตรวจสอบ / อุปกรณ์', type: 'text', width: 180, required: true },
        { id: 'c3', name: 'จุดติดตั้ง / อาคาร', type: 'text', width: 130 },
        { id: 'c4', name: 'ผลการตรวจ', type: 'status', width: 95, options: ['ปกติ', 'ผิดปกติ', 'ไม่ได้ตรวจ'] },
        { id: 'c5', name: 'ภาพถ่ายประกอบ', type: 'photo', width: 110 },
        { id: 'c6', name: 'หมายเหตุ / ข้อเสนอแนะ', type: 'text', width: 150 }
      ],
      defaultRows: [
        { c1: '1', c2: 'จุดตรวจที่ 1', c3: '-', c4: 'ปกติ', c5: null, c6: '-' },
        { c1: '2', c2: 'จุดตรวจที่ 2', c3: '-', c4: 'ปกติ', c5: null, c6: '-' },
        { c1: '3', c2: 'จุดตรวจที่ 3', c3: '-', c4: 'ปกติ', c5: null, c6: '-' }
      ]
    });
    setShowBuilderModal(true);
  };

  const handleEditTemplate = (tpl) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
    setShowBuilderModal(true);
  };

  const handleDeleteTemplate = async (id, name) => {
    if (!confirm(`ยืนยันการลบแบบฟอร์ม "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/inspection-sheets/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTemplates(prev => {
          const updated = prev.filter(t => t.id !== id);
          try {
            localStorage.setItem('veri_inspection_templates', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        alert('ลบไม่สำเร็จ: ' + (data?.error || 'เกิดข้อผิดพลาด'));
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Open Form Filler (New or Edit)
  const handleOpenFill = async (template, recordToEdit = null) => {
    setActiveTemplateForFill(template);
    if (recordToEdit) {
      setEditingRecord(JSON.parse(JSON.stringify(recordToEdit)));
    } else {
      let nextRef = 'INS-2569-001';
      try {
        const res = await fetch('/api/inspection-sheets/records?getNextRef=1');
        const json = await res.json();
        if (json.ok && json.nextRef) nextRef = json.nextRef;
      } catch {}

      setEditingRecord({
        templateId: template.id,
        templateName: template.name,
        templateCode: template.code,
        recordNo: nextRef,
        inspectionDate: getTodayThaiDate(),
        location: '',
        building: '',
        inspector: {
          name: settings?.surveyor?.name || 'นายช่างเทคนิค กฟผ.',
          role: settings?.surveyor?.role || 'วิศวกรระบบไฟฟ้าและบำรุงรักษา',
          department: settings?.surveyor?.department || 'หบท-ธ. ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร'
        },
        signature: settings?.surveyor?.signatureUrl || '',
        summaryStatus: 'ปกติทุกรายการ',
        notes: '',
        rows: (template.defaultRows && template.defaultRows.length > 0)
          ? JSON.parse(JSON.stringify(template.defaultRows))
          : [
              { c1: '1', c2: '', c3: '', c4: 'ปกติ', c5: null, c6: '' },
              { c1: '2', c2: '', c3: '', c4: 'ปกติ', c5: null, c6: '' },
              { c1: '3', c2: '', c3: '', c4: 'ปกติ', c5: null, c6: '' }
            ]
      });
    }
    setShowFillerModal(true);
  };

  const handleDeleteRecord = async (recordNo, id) => {
    if (!confirm(`ยืนยันการลบผลการตรวจเช็คเลขที่ ${recordNo} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/inspection-sheets/records?id=${encodeURIComponent(id || recordNo)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRecords(prev => prev.filter(r => (r.id !== id && r.recordNo !== recordNo)));
      } else {
        alert('ลบไม่สำเร็จ: ' + (data?.error || 'เกิดข้อผิดพลาด'));
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Open Document Viewer
  const handleViewRecord = (record) => {
    const tpl = templates.find(t => t.id === record.templateId) || {
      id: record.templateId,
      name: record.templateName,
      code: record.templateCode,
      columns: record.columns || [
        { id: 'c1', name: 'ลำดับ', type: 'text' },
        { id: 'c2', name: 'รายการ', type: 'text' },
        { id: 'c3', name: 'ผลการตรวจ', type: 'status' }
      ]
    };
    setViewingRecord(record);
    setViewingTemplate(tpl);
    setIsBlankView(false);
    setShowDocModal(true);
  };

  const handleViewBlank = (template) => {
    setViewingTemplate(template);
    setViewingRecord(null);
    setIsBlankView(true);
    setShowDocModal(true);
  };

  // Export to Excel handler
  const handleExportExcel = async (tpl, rec = null, isBlank = false) => {
    try {
      await exportInspectionToExcel({
        template: tpl,
        record: rec,
        isBlank,
        settings
      });
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('ดาวน์โหลด Excel ไม่สำเร็จ: ' + err.message);
    }
  };

  // Direct High-Res PDF Generator
  const handleDownloadPdf = async (elemId, fileName) => {
    if (exportingPdf) return;
    setExportingPdf(true);
    setExportProgress('กำลังประมวลผลเอกสาร A4...');

    try {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }

      const printArea = document.getElementById(elemId);
      if (!printArea) throw new Error('ไม่พบข้อมูลเอกสาร');

      // Ensure images loaded
      const imgs = Array.from(printArea.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
      }));

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (imgHeight > pageHeight) {
        // Multi-page slicing if table is very long
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      }

      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('สร้างไฟล์ PDF ไม่สำเร็จ: ' + err.message);
    } finally {
      setExportingPdf(false);
      setExportProgress('');
    }
  };

  return (
    <div className="sn-shell" style={{ minHeight: '100vh', background: 'var(--bg-base, #0c1220)', color: 'var(--ink-primary, #eef2ff)' }}>
      <Sidenav />

      <main className="sn-shell-main" style={{ flex: 1, padding: '24px 28px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>📋</span>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                  แบบฟอร์มตรวจเช็ค (Inspection Sheets)
                </h1>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)', margin: '4px 0 0' }}>
                  ระบบสร้างแบบฟอร์มตรวจสอบตามต้องการ, บันทึกผลตรวจหน้างาน, แนบรูปถ่าย และส่งออก PDF / Excel มาตรฐาน กฟผ.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={openAdmin}
              title="ตั้งค่าระบบแอดมิน (หัวกระดาษ กฟผ., ข้อมูลผู้สำรวจ, รหัสเอกสาร)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(245, 158, 11, 0.14)',
                border: '1.5px solid rgba(245, 158, 11, 0.45)',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: 13.5,
                padding: '9px 15px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
              <span>⚙️</span>
              <span>ตั้งค่าระบบแอดมิน</span>
            </button>

            <button
              onClick={handleCreateTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-surface-raised, #172340)',
                border: '1px solid var(--border-strong, #2d3f5e)',
                color: 'var(--ink-primary, #eef2ff)',
                fontWeight: 700,
                fontSize: 13.5,
                padding: '9px 16px',
                borderRadius: 8,
                cursor: 'pointer'
              }}>
              <span>📑 สร้างแบบฟอร์มใหม่</span>
            </button>

            {templates.length > 0 && (
              <button
                onClick={() => handleOpenFill(templates[0])}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--accent, #2563eb)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)'
                }}>
                <span>➕ บันทึกตรวจเช็คใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-hairline, #1e2e4a)', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('records')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'records' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'records' ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)',
              fontWeight: activeTab === 'records' ? 800 : 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
            <span>📝 ประวัติบันทึกตรวจเช็ค</span>
            <span style={{ fontSize: 11, background: activeTab === 'records' ? '#2563eb' : 'rgba(255,255,255,0.1)', color: 'white', padding: '1px 7px', borderRadius: 10 }}>
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'templates' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'templates' ? '#60a5fa' : 'var(--ink-secondary, #94a3c4)',
              fontWeight: activeTab === 'templates' ? 800 : 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
            <span>📑 คลังแบบฟอร์ม ({templates.length})</span>
          </button>
        </div>

        {/* TAB 1: RECORDS */}
        {activeTab === 'records' && (
          <div>
            {/* Filter and Search Bar */}
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
                <input 
                  type="text" 
                  placeholder="🔍 ค้นหาเลขที่เอกสาร, ชื่องาน, สถานที่, หรือชื่อผู้ตรวจ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input, #080e1a)',
                    border: '1px solid var(--border-strong, #2d3f5e)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: 'var(--ink-primary, #eef2ff)',
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={selectedTemplateFilter}
                  onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                  style={{
                    background: 'var(--bg-input, #080e1a)',
                    border: '1px solid var(--border-strong, #2d3f5e)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--ink-primary, #eef2ff)',
                    fontSize: 13
                  }}>
                  <option value="all">ทุกแบบฟอร์ม ({templates.length})</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px dashed var(--border-hairline, #1e2e4a)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>📝</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink-primary, #eef2ff)' }}>ยังไม่มีข้อมูลบันทึกการตรวจเช็ค</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 16px 0' }}>
                  สามารถกดปุ่ม "บันทึกตรวจเช็คใหม่" หรือเลือกแบบฟอร์มเพื่อเริ่มบันทึกข้อมูลหน้างาน
                </p>
                {templates.length > 0 && (
                  <button
                    onClick={() => handleOpenFill(templates[0])}
                    style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ➕ บันทึกตรวจเช็คใหม่
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {filteredRecords.map((rec) => {
                  const tpl = templates.find(t => t.id === rec.templateId);
                  const isApproved = rec.summaryStatus === 'ปกติทุกรายการ' || rec.summaryStatus === 'ปกติ';
                  const rowCount = rec.rows?.length || 0;
                  const photoCount = (rec.rows || []).filter(r => Object.values(r).some(v => typeof v === 'string' && v.startsWith('data:image'))).length;

                  return (
                    <div 
                      key={rec.id || rec.recordNo}
                      style={{
                        background: 'var(--bg-surface, #111d32)',
                        border: '1px solid var(--border-hairline, #1e2e4a)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 14,
                        transition: 'border-color 0.15s'
                      }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 14.5, color: '#60a5fa' }}>
                            {rec.recordNo || 'INS-RECORD'}
                          </span>
                          <span style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>
                            {rec.templateCode || tpl?.code || 'FM-INSPECT'}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '1px 8px',
                            borderRadius: 10,
                            background: isApproved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isApproved ? '#4ade80' : '#f87171',
                            border: `1px solid ${isApproved ? '#22c55e' : '#ef4444'}`
                          }}>
                            {rec.summaryStatus || 'ปกติ'}
                          </span>
                        </div>

                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-primary, #eef2ff)', marginBottom: 4 }}>
                          {rec.templateName || tpl?.name || 'แบบฟอร์มตรวจเช็ค'}
                        </div>

                        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-secondary, #94a3c4)', flexWrap: 'wrap' }}>
                          <span>📅 วันที่: <strong style={{ color: '#cbd5e1' }}>{rec.inspectionDate || '-'}</strong></span>
                          <span>🏢 สถานที่: <strong style={{ color: '#cbd5e1' }}>{rec.location || '-'}</strong></span>
                          <span>👤 ผู้ตรวจ: <strong style={{ color: '#cbd5e1' }}>{rec.inspector?.name || '-'}</strong></span>
                          <span>📊 ตรวจ: <strong style={{ color: '#cbd5e1' }}>{rowCount} รายการ</strong></span>
                          {photoCount > 0 && <span style={{ color: '#38bdf8' }}>📷 {photoCount} รูป</span>}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewRecord(rec)}
                          style={{
                            background: 'var(--bg-surface-raised, #172340)',
                            border: '1px solid var(--border-strong, #2d3f5e)',
                            color: 'var(--ink-primary, #eef2ff)',
                            padding: '7px 12px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}>
                          <span>👁️</span> ดูเอกสาร A4
                        </button>

                        <button
                          onClick={() => handleExportExcel(tpl || { name: rec.templateName, code: rec.templateCode, columns: rec.columns }, rec, false)}
                          title="ดาวน์โหลดไฟล์ Excel (.xlsx)"
                          style={{
                            background: 'rgba(22, 163, 74, 0.15)',
                            border: '1px solid #16a34a',
                            color: '#4ade80',
                            padding: '7px 11px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                          <span>📊</span> Excel
                        </button>

                        <button
                          onClick={() => handleOpenFill(tpl || { id: rec.templateId, name: rec.templateName, code: rec.templateCode }, rec)}
                          style={{
                            background: 'var(--bg-surface-raised, #172340)',
                            border: '1px solid var(--border-strong, #2d3f5e)',
                            color: '#93c5fd',
                            padding: '7px 11px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}>
                          ✏️ แก้ไข
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(rec.recordNo, rec.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            padding: '7px 10px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEMPLATES */}
        {activeTab === 'templates' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {templates.map(tpl => {
                const hasPhotoCol = (tpl.columns || []).some(c => c.type === 'photo');
                return (
                  <div
                    key={tpl.id}
                    style={{
                      background: 'var(--bg-surface, #111d32)',
                      border: '1px solid var(--border-hairline, #1e2e4a)',
                      borderRadius: 12,
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                    }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          {tpl.code || 'FM-XXX'}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {hasPhotoCol && (
                            <span style={{ fontSize: 10.5, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              📷 แนบรูปได้
                            </span>
                          )}
                          <span style={{ fontSize: 10.5, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                            {tpl.frequency || 'ตามวาระ'}
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                        {tpl.name}
                      </h3>

                      <p style={{ fontSize: 12.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                        {tpl.description || 'แบบฟอร์มมาตรฐานสำหรับตรวจสอบอุปกรณ์และสภาพการทำงาน'}
                      </p>

                      {/* Columns preview */}
                      <div style={{ background: 'var(--bg-input, #080e1a)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, border: '1px solid var(--border-hairline, #1e2e4a)' }}>
                        <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, marginBottom: 4 }}>
                          โครงสร้างตาราง ({tpl.columns?.length || 0} คอลัมน์):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(tpl.columns || []).map((col, cIdx) => (
                            <span key={col.id || cIdx} style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', padding: '2px 6px', borderRadius: 4 }}>
                              {col.name} {col.type === 'photo' ? '📷' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Template Card Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-hairline, #1e2e4a)', paddingTop: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={() => handleOpenFill(tpl)}
                          style={{
                            background: 'var(--accent, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontWeight: 700,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5
                          }}>
                          <span>📝</span> กรอกข้อมูล
                        </button>

                        <button
                          onClick={() => handleViewBlank(tpl)}
                          title="ดูหรือพิมพ์ฟอร์มเปล่าเพื่อนำไปเขียนตรวจหน้างาน"
                          style={{
                            background: 'var(--bg-surface-raised, #172340)',
                            border: '1px solid var(--border-strong, #2d3f5e)',
                            color: '#93c5fd',
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontWeight: 700,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5
                          }}>
                          <span>📄</span> ฟอร์มเปล่า
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          onClick={() => handleExportExcel(tpl, null, true)}
                          style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: 11.5, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>📊</span> ดาวน์โหลด Excel เปล่า
                        </button>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleEditTemplate(tpl)}
                            style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>
                            แก้ไขฟอร์ม
                          </button>
                          {!tpl.isPreset && (
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11.5, cursor: 'pointer' }}>
                              ลบ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 1: TEMPLATE BUILDER (สร้าง/แก้ไข แบบฟอร์มตรวจเช็ค)
           ======================================================== */}
        {showBuilderModal && editingTemplate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 16, width: '100%', maxWidth: 840, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>📑</span>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                    {editingTemplate.id ? 'แก้ไขโครงสร้างแบบฟอร์ม' : 'สร้างแบบฟอร์มตรวจเช็คใหม่'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBuilderModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Basic Meta Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                      ชื่อแบบฟอร์มสำหรับ... *
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น แบบฟอร์มตรวจสอบตู้ MDB และตู้ย่อย DB"
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                      รหัสแบบฟอร์ม (FM Ref)
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น FM-ENG-001"
                      value={editingTemplate.code}
                      onChange={e => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                      ความถี่ในการตรวจ
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น รายเดือน, รายสัปดาห์, รายวัน"
                      value={editingTemplate.frequency}
                      onChange={e => setEditingTemplate({ ...editingTemplate, frequency: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                    คำอธิบาย / วัตถุประสงค์
                  </label>
                  <input 
                    type="text" 
                    placeholder="ระบุวัตถุประสงค์ของแบบฟอร์มนี้ เช่น ตรวจสอบความร้อน สภาพสายไฟ และค่ามิเตอร์"
                    value={editingTemplate.description}
                    onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                  />
                </div>

                {/* Column Designer Section */}
                <div style={{ border: '1.5px solid #2d3f5e', borderRadius: 10, padding: 14, background: 'var(--bg-surface-raised, #172340)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#eef2ff' }}>
                        📋 ออกแบบคอลัมน์ของตาราง ({editingTemplate.columns?.length || 0} คอลัมน์)
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3c4' }}>
                        สามารถเพิ่ม/ลบคอลัมน์ได้เอง และเลือกว่าจะมีคอลัมน์สำหรับแนบรูปถ่ายประกอบหรือไม่
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newColId = `c${Date.now()}`;
                          const cols = [...(editingTemplate.columns || [])];
                          cols.push({ id: newColId, name: 'คอลัมน์ใหม่', type: 'text', width: 140 });
                          setEditingTemplate({ ...editingTemplate, columns: cols });
                        }}
                        style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ➕ เพิ่มคอลัมน์ทั่วไป
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newColId = `c${Date.now()}`;
                          const cols = [...(editingTemplate.columns || [])];
                          cols.push({ id: newColId, name: 'ภาพถ่ายประกอบ', type: 'photo', width: 110 });
                          setEditingTemplate({ ...editingTemplate, columns: cols });
                        }}
                        style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        📷 เพิ่มคอลัมน์แนบรูป
                      </button>
                    </div>
                  </div>

                  {/* Columns List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(editingTemplate.columns || []).map((col, cIdx) => (
                      <div 
                        key={col.id || cIdx}
                        style={{
                          background: 'var(--bg-input, #080e1a)',
                          border: '1px solid var(--border-strong, #2d3f5e)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap'
                        }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa', width: 22 }}>
                          {cIdx + 1}.
                        </span>

                        <input 
                          type="text" 
                          value={col.name}
                          placeholder="ชื่อหัวคอลัมน์"
                          onChange={e => {
                            const cols = [...editingTemplate.columns];
                            cols[cIdx].name = e.target.value;
                            setEditingTemplate({ ...editingTemplate, columns: cols });
                          }}
                          style={{ flex: 2, minWidth: 140, padding: '6px 10px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                        />

                        <select
                          value={col.type}
                          onChange={e => {
                            const cols = [...editingTemplate.columns];
                            cols[cIdx].type = e.target.value;
                            setEditingTemplate({ ...editingTemplate, columns: cols });
                          }}
                          style={{ padding: '6px 8px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: '#93c5fd', fontSize: 12 }}>
                          <option value="text">ข้อความทั่วไป</option>
                          <option value="number">ตัวเลข / ค่าที่วัดได้</option>
                          <option value="status">สถานะ (ปกติ/ผิดปกติ)</option>
                          <option value="photo">📷 ภาพถ่ายประกอบ</option>
                          <option value="textarea">ข้อความหลายบรรทัด</option>
                        </select>

                        {col.type === 'number' && (
                          <input 
                            type="text" 
                            placeholder="หน่วย (เช่น V, A, Bar, °C)"
                            value={col.unit || ''}
                            onChange={e => {
                              const cols = [...editingTemplate.columns];
                              cols[cIdx].unit = e.target.value;
                              setEditingTemplate({ ...editingTemplate, columns: cols });
                            }}
                            style={{ width: 110, padding: '6px 8px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 11.5 }}
                          />
                        )}

                        <button
                          type="button"
                          disabled={editingTemplate.columns.length <= 1}
                          onClick={() => {
                            const cols = editingTemplate.columns.filter((_, idx) => idx !== cIdx);
                            setEditingTemplate({ ...editingTemplate, columns: cols });
                          }}
                          style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 14, cursor: 'pointer', padding: '4px 6px' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowBuilderModal(false)}
                  style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: '#cbd5e1', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!editingTemplate.name.trim()) {
                      alert('กรุณาระบุชื่อแบบฟอร์ม');
                      return;
                    }
                    try {
                      const res = await fetch('/api/inspection-sheets/templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingTemplate)
                      });
                      const json = await res.json();
                      if (res.ok && json.ok) {
                        const savedTpl = json.template || { ...editingTemplate, id: editingTemplate.id || `tpl-${Date.now()}` };
                        setTemplates(prev => {
                          const exists = prev.some(t => t.id === savedTpl.id);
                          const nextList = exists
                            ? prev.map(t => t.id === savedTpl.id ? savedTpl : t)
                            : [savedTpl, ...prev];
                          try {
                            localStorage.setItem('veri_inspection_templates', JSON.stringify(nextList));
                          } catch {}
                          return nextList;
                        });

                        alert('บันทึกแบบฟอร์มสำเร็จ');
                        setShowBuilderModal(false);
                        setActiveTab('templates');
                        loadData();
                      } else {
                        alert('บันทึกไม่สำเร็จ: ' + (json?.error || 'เกิดข้อผิดพลาด'));
                      }
                    } catch {
                      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                    }
                  }}
                  style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)' }}>
                  💾 บันทึกแบบฟอร์ม
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: FORM FILLER (กรอกข้อมูลตรวจเช็คหน้างาน)
           ======================================================== */}
        {showFillerModal && editingRecord && activeTemplateForFill && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 16, width: '100%', maxWidth: 1040, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
              
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                    📝 บันทึกผลการตรวจเช็ค: {activeTemplateForFill.name}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#93c5fd', marginTop: 2 }}>
                    รหัสแบบฟอร์ม: {activeTemplateForFill.code || 'FM-XXX'} • เลขที่บันทึก: {editingRecord.recordNo}
                  </div>
                </div>
                <button
                  onClick={() => setShowFillerModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Record Meta Box */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                        วันที่ตรวจสอบ *
                      </label>
                      <input 
                        type="text" 
                        value={editingRecord.inspectionDate}
                        onChange={e => setEditingRecord({ ...editingRecord, inspectionDate: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 6, color: 'white', fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                        สถานที่ / อาคาร / จุดติดตั้ง *
                      </label>
                      <input 
                        type="text" 
                        placeholder="เช่น ห้อง MDB ชั้นใต้ดิน อาคาร ท.102"
                        value={editingRecord.location}
                        onChange={e => setEditingRecord({ ...editingRecord, location: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 6, color: 'white', fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                        ชื่อผู้สำรวจ / ตรวจสอบ *
                      </label>
                      <input 
                        type="text" 
                        value={editingRecord.inspector?.name || ''}
                        onChange={e => setEditingRecord({ 
                          ...editingRecord, 
                          inspector: { ...(editingRecord.inspector || {}), name: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 6, color: 'white', fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                        ตำแหน่ง / แผนก
                      </label>
                      <input 
                        type="text" 
                        value={editingRecord.inspector?.role || ''}
                        onChange={e => setEditingRecord({ 
                          ...editingRecord, 
                          inspector: { ...(editingRecord.inspector || {}), role: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 6, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Table of Rows */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#eef2ff' }}>
                      📋 รายการตรวจสอบ ({editingRecord.rows?.length || 0} รายการ)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const rows = [...(editingRecord.rows || [])];
                        const newRow = { c1: String(rows.length + 1) };
                        (activeTemplateForFill.columns || []).forEach(col => {
                          if (col.type === 'status') newRow[col.id] = 'ปกติ';
                          else if (!newRow[col.id]) newRow[col.id] = '';
                        });
                        rows.push(newRow);
                        setEditingRecord({ ...editingRecord, rows });
                      }}
                      style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ➕ เพิ่มแถวรายการ
                    </button>
                  </div>

                  {/* Rows Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(editingRecord.rows || []).map((row, rIdx) => (
                      <div 
                        key={rIdx}
                        style={{
                          background: 'var(--bg-input, #080e1a)',
                          border: '1px solid var(--border-strong, #2d3f5e)',
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa' }}>
                            ลำดับที่ {rIdx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={editingRecord.rows.length <= 1}
                            onClick={() => {
                              const rows = editingRecord.rows.filter((_, idx) => idx !== rIdx);
                              setEditingRecord({ ...editingRecord, rows });
                            }}
                            style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                            ลบแถวนี้ ✕
                          </button>
                        </div>

                        {/* Columns Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                          {(activeTemplateForFill.columns || []).map((col) => {
                            if (col.name.includes('ลำดับ')) return null;

                            return (
                              <div key={col.id}>
                                <label style={{ fontSize: 11, color: '#94a3c4', display: 'block', marginBottom: 2 }}>
                                  {col.name} {col.unit ? `(${col.unit})` : ''}
                                </label>

                                {col.type === 'status' ? (
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {['ปกติ', 'ผิดปกติ'].map(st => {
                                      const isCur = (row[col.id] || 'ปกติ') === st;
                                      return (
                                        <button
                                          key={st}
                                          type="button"
                                          onClick={() => {
                                            const rows = [...editingRecord.rows];
                                            rows[rIdx][col.id] = st;
                                            setEditingRecord({ ...editingRecord, rows });
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: '4px 6px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: isCur 
                                              ? (st === 'ปกติ' ? '1.5px solid #22c55e' : '1.5px solid #ef4444')
                                              : '1px solid #334155',
                                            background: isCur 
                                              ? (st === 'ปกติ' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)')
                                              : '#111d32',
                                            color: isCur 
                                              ? (st === 'ปกติ' ? '#4ade80' : '#f87171')
                                              : '#94a3b8'
                                          }}>
                                          {st === 'ปกติ' ? '✓ ปกติ' : '✕ ผิดปกติ'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : col.type === 'photo' ? (
                                  <div>
                                    {row[col.id] ? (
                                      <div style={{ position: 'relative', width: '100%', height: 75, background: '#ffffff', borderRadius: 4, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                        <img src={row[col.id]} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const rows = [...editingRecord.rows];
                                            rows[rIdx][col.id] = null;
                                            setEditingRecord({ ...editingRecord, rows });
                                          }}
                                          style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: 10, width: 20, height: 20, fontSize: 10, cursor: 'pointer' }}>
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, background: '#111d32', border: '1px dashed #3b82f6', borderRadius: 4, color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>
                                        <span>📷 แนบรูป (1 รูป)</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          style={{ display: 'none' }}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = (re) => {
                                                const rows = [...editingRecord.rows];
                                                rows[rIdx][col.id] = re.target.result;
                                                setEditingRecord({ ...editingRecord, rows });
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <input 
                                    type={col.type === 'number' ? 'number' : 'text'}
                                    value={row[col.id] || ''}
                                    onChange={e => {
                                      const rows = [...editingRecord.rows];
                                      rows[rIdx][col.id] = e.target.value;
                                      setEditingRecord({ ...editingRecord, rows });
                                    }}
                                    style={{ width: '100%', padding: '5px 8px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 4, color: 'white', fontSize: 12 }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Summary & Remarks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                      สรุปผลการตรวจสอบภาพรวม *
                    </label>
                    <select
                      value={editingRecord.summaryStatus}
                      onChange={e => setEditingRecord({ ...editingRecord, summaryStatus: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}>
                      <option value="ปกติทุกรายการ">✅ ปกติทุกรายการ</option>
                      <option value="พบจุดบกพร่อง/ต้องแก้ไข">⚠️ พบจุดบกพร่อง / ต้องแก้ไข</option>
                      <option value="รออะไหล่/รอการบำรุงรักษา">⏳ รออะไหล่ / รอการบำรุงรักษา</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 4 }}>
                      หมายเหตุและข้อเสนอแนะ
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น อุณหภูมิตู้ปกติ, พบฝุ่นเล็กน้อยได้ทำความสะอาดแล้ว"
                      value={editingRecord.notes}
                      onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Surveyor Signature Box */}
                <div style={{ background: '#ffffff', borderRadius: 8, padding: 14 }}>
                  <SignaturePad 
                    value={editingRecord.signature}
                    onChange={(sigData) => setEditingRecord({ ...editingRecord, signature: sigData })}
                    label="ลงนามผู้สำรวจ/ผู้บันทึก (Surveyor Signature)"
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowFillerModal(false)}
                  style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: '#cbd5e1', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!editingRecord.location.trim()) {
                      alert('กรุณาระบุสถานที่/อาคารที่ตรวจเช็ค');
                      return;
                    }
                    try {
                      const res = await fetch('/api/inspection-sheets/records', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingRecord)
                      });
                      const json = await res.json();
                      if (res.ok && json.ok) {
                        const savedRec = json.record || editingRecord;
                        setRecords(prev => {
                          const exists = prev.some(r => (savedRec.id && r.id === savedRec.id) || (savedRec.recordNo && r.recordNo === savedRec.recordNo));
                          return exists
                            ? prev.map(r => ((savedRec.id && r.id === savedRec.id) || (savedRec.recordNo && r.recordNo === savedRec.recordNo)) ? savedRec : r)
                            : [savedRec, ...prev];
                        });
                        alert(`บันทึกผลการตรวจเช็คเลขที่ ${savedRec.recordNo || ''} เรียบร้อยแล้ว`);
                        setShowFillerModal(false);
                        loadData();
                        // Open view directly
                        handleViewRecord(savedRec);
                      } else {
                        alert('บันทึกไม่สำเร็จ: ' + (json?.error || 'เกิดข้อผิดพลาด'));
                      }
                    } catch {
                      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                    }
                  }}
                  style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '8px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)' }}>
                  💾 บันทึกผลการตรวจเช็ค
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 3: DOCUMENT VIEWER / PRINT / PDF / EXCEL MODAL
           ======================================================== */}
        {showDocModal && viewingTemplate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '10px 18px', width: '100%', maxWidth: '210mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>
                {isBlankView ? '📄 ฟอร์มเปล่าสำหรับพิมพ์ (Blank Sheet)' : `📄 ${viewingRecord?.recordNo || 'เอกสารผลการตรวจเช็ค'}`}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleExportExcel(viewingTemplate, viewingRecord, isBlankView)}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>📊</span> โหลด Excel
                </button>

                <button
                  disabled={exportingPdf}
                  onClick={() => handleDownloadPdf('inspection-doc-print-area', `${viewingRecord?.recordNo || viewingTemplate.code || 'Inspection'}_${isBlankView ? 'Blank' : 'Result'}`)}
                  style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>📥</span> {exportingPdf ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF'}
                </button>

                <button
                  onClick={() => window.print()}
                  style={{ background: '#334155', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  🖨️ พิมพ์
                </button>

                <button
                  onClick={() => setShowDocModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', marginLeft: 8 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Document A4 Scrollable Container */}
            <div style={{ width: '100%', maxWidth: '210mm', maxHeight: '85vh', overflowY: 'auto', background: '#334155', borderRadius: 8, padding: '12px 0' }}>
              
              {/* PRINTABLE A4 AREA */}
              <div 
                id="inspection-doc-print-area"
                style={{ 
                  background: '#ffffff', 
                  width: '210mm', 
                  minHeight: '297mm', 
                  margin: '0 auto', 
                  padding: '18mm 20mm', 
                  boxSizing: 'border-box', 
                  color: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                }}
              >
                <div>
                  {/* Official EGAT Letterhead */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #0f2e5a', paddingBottom: 10, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img 
                        src="/logo.png" 
                        alt="EGAT Logo" 
                        style={{ height: 60, width: 'auto', objectFit: 'contain' }} 
                      />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f2e5a', lineHeight: 1.25 }}>
                          {settings?.header?.companyTitle || 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                          {settings?.header?.companySubtitle || viewingTemplate.department || 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)'}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                          {settings?.header?.companyAddress || 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ border: '1.5px solid #0f2e5a', borderRadius: 5, padding: '3px 8px', background: '#f8fafc', display: 'inline-block' }}>
                        <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>รหัสแบบฟอร์ม (FM Ref)</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f2e5a' }}>
                          {viewingRecord?.recordNo || viewingTemplate.code || 'FM-ENG-001'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Title Banner */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #0f2e5a', borderRadius: 6, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f2e5a' }}>
                      {viewingTemplate.name} {isBlankView ? '(ฟอร์มเปล่า)' : ''}
                    </div>
                    <span style={{ fontSize: 10.5, color: '#ffffff', background: '#0f2e5a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      รอบตรวจ: {viewingTemplate.frequency || 'ประจำเดือน'}
                    </span>
                  </div>

                  {/* Meta Details Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '16%', background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          สถานที่/อาคาร:
                        </td>
                        <td style={{ width: '44%', padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}>
                          {viewingRecord?.location || (isBlankView ? '....................................................................' : '-')}
                        </td>
                        <td style={{ width: '18%', background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          วันที่ตรวจสอบ:
                        </td>
                        <td style={{ width: '22%', padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}>
                          {viewingRecord?.inspectionDate || (isBlankView ? '........../........../..........' : '-')}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          ผู้ตรวจเช็ค:
                        </td>
                        <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                          {viewingRecord?.inspector?.name || settings?.surveyor?.name || (isBlankView ? '....................................................................' : '-')}
                        </td>
                        <td style={{ background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          ตำแหน่ง/แผนก:
                        </td>
                        <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                          {viewingRecord?.inspector?.role || settings?.surveyor?.role || (isBlankView ? '................................' : '-')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Main Inspection Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: '#0f2e5a', color: '#ffffff' }}>
                        {(viewingTemplate.columns || []).map((col, cIdx) => (
                          <th 
                            key={col.id || cIdx} 
                            style={{ 
                              padding: '6px 6px', 
                              border: '1px solid #0f2e5a',
                              textAlign: col.type === 'number' ? 'right' : (col.type === 'status' || col.name.includes('ลำดับ') ? 'center' : 'left'),
                              width: col.width ? `${col.width}px` : 'auto'
                            }}>
                            {col.name} {col.unit ? `(${col.unit})` : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isBlankView ? (
                        // Render 12 Blank Rows for manual handwriting
                        Array.from({ length: 12 }).map((_, rIdx) => (
                          <tr key={rIdx} style={{ background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                            {(viewingTemplate.columns || []).map((col, cIdx) => (
                              <td 
                                key={col.id || cIdx} 
                                style={{ 
                                  padding: '8px 6px', 
                                  border: '1px solid #cbd5e1',
                                  textAlign: col.name.includes('ลำดับ') ? 'center' : 'left'
                                }}>
                                {col.name.includes('ลำดับ') ? rIdx + 1 : ''}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        // Render Filled Data Rows
                        (viewingRecord?.rows || []).map((row, rIdx) => (
                          <tr key={rIdx} style={{ background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                            {(viewingTemplate.columns || []).map((col, cIdx) => {
                              const val = row[col.id];
                              const isPhotoCol = col.type === 'photo';

                              return (
                                <td 
                                  key={col.id || cIdx} 
                                  style={{ 
                                    padding: '5px 6px', 
                                    border: '1px solid #cbd5e1',
                                    verticalAlign: 'middle',
                                    textAlign: col.type === 'number' ? 'right' : (col.type === 'status' || col.name.includes('ลำดับ') ? 'center' : 'left')
                                  }}>
                                  {isPhotoCol ? (
                                    val ? (
                                      <div style={{ width: 85, height: 60, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto' }}>
                                        <img src={val} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                      </div>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: 9.5 }}>-</span>
                                    )
                                  ) : col.type === 'status' ? (
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      background: val === 'ปกติ' ? '#dcfce7' : '#fee2e2',
                                      color: val === 'ปกติ' ? '#166534' : '#991b1b',
                                      border: `1px solid ${val === 'ปกติ' ? '#bbf7d0' : '#fecaca'}`
                                    }}>
                                      {val || 'ปกติ'}
                                    </span>
                                  ) : (
                                    <span>{val !== undefined && val !== null ? val : (cIdx === 0 ? rIdx + 1 : '-')}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary & Notes Section */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', background: '#f8fafc', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                        ผลการตรวจสอบภาพรวม: <strong style={{ color: viewingRecord?.summaryStatus === 'ปกติทุกรายการ' ? '#16a34a' : '#b45309' }}>
                          {viewingRecord?.summaryStatus || (isBlankView ? '[  ] ปกติทุกรายการ      [  ] พบจุดบกพร่อง/ต้องแก้ไข' : 'ปกติทุกรายการ')}
                        </strong>
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#475569' }}>
                      หมายเหตุ/ข้อเสนอแนะ: {viewingRecord?.notes || (isBlankView ? '................................................................................................................................' : '-')}
                    </div>
                  </div>
                </div>

                {/* Bottom Signature Card */}
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 10.5 }}>
                  <div style={{ color: '#64748b', fontSize: 9.5 }}>
                    เอกสารระบบ Facility Inspection • Veri App • การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย
                  </div>

                  <div style={{ textAlign: 'center', width: 220 }}>
                    <div style={{ height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                      {viewingRecord?.signature ? (
                        <img src={viewingRecord.signature} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 10 }}>
                          {isBlankView ? 'ลงชื่อ ................................................................' : '(ไม่มีลายเซ็นอิเล็กทรอนิกส์)'}
                        </span>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #475569', paddingTop: 3, fontWeight: 700, color: '#0f172a' }}>
                      ( {viewingRecord?.inspector?.name || settings?.surveyor?.name || '................................................................'} )
                    </div>
                    <div style={{ fontSize: 9.5, color: '#475569', marginTop: 1 }}>
                      ผู้สำรวจและตรวจสอบ / วันที่: {viewingRecord?.inspectionDate || (isBlankView ? '........../........../..........' : '-')}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 4: ADMIN SETTINGS PANEL (ตั้งค่าระบบแอดมิน)
           ======================================================== */}
        {showAdminModal && settings && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>⚙️</span>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>
                    ตั้งค่าระบบแอดมิน: แบบฟอร์มตรวจเช็ค
                  </h3>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Section 1: Letterhead */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginBottom: 10 }}>
                    🏢 หัวกระดาษเอกสาร (Letterhead & Banner)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ชื่อหน่วยงานหลัก</label>
                      <input 
                        type="text" 
                        value={settings.header?.companyTitle || ''}
                        onChange={e => setSettings({ 
                          ...settings, 
                          header: { ...(settings.header || {}), companyTitle: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ฝ่าย / แผนก</label>
                      <input 
                        type="text" 
                        value={settings.header?.companySubtitle || ''}
                        onChange={e => setSettings({ 
                          ...settings, 
                          header: { ...(settings.header || {}), companySubtitle: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Default Surveyor */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginBottom: 10 }}>
                    👤 ข้อมูลผู้สำรวจและตรวจสอบเริ่มต้น
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ชื่อผู้สำรวจ</label>
                      <input 
                        type="text" 
                        value={settings.surveyor?.name || ''}
                        onChange={e => setSettings({ 
                          ...settings, 
                          surveyor: { ...(settings.surveyor || {}), name: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ตำแหน่ง</label>
                      <input 
                        type="text" 
                        value={settings.surveyor?.role || ''}
                        onChange={e => setSettings({ 
                          ...settings, 
                          surveyor: { ...(settings.surveyor || {}), role: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Running RefNo */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginBottom: 10 }}>
                    🔢 การรันเลขที่เอกสาร (Running Number)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>คำนำหน้า (Prefix)</label>
                      <input 
                        type="text" 
                        value={settings.runningNumber?.prefix || 'INS-'}
                        onChange={e => setSettings({ 
                          ...settings, 
                          runningNumber: { ...(settings.runningNumber || {}), prefix: e.target.value } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ลำดับถัดไป (Next Number)</label>
                      <input 
                        type="number" 
                        value={settings.runningNumber?.nextNumber || 1}
                        onChange={e => setSettings({ 
                          ...settings, 
                          runningNumber: { ...(settings.runningNumber || {}), nextNumber: parseInt(e.target.value, 10) || 1 } 
                        })}
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-hairline, #1e2e4a)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', color: '#cbd5e1', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                  ปิด
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/inspection-sheets/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin: '8888', settings })
                      });
                      const json = await res.json();
                      if (res.ok && json.ok) {
                        alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
                        setShowAdminModal(false);
                      } else {
                        alert('บันทึกไม่สำเร็จ: ' + (json?.error || 'เกิดข้อผิดพลาด'));
                      }
                    } catch {
                      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                    }
                  }}
                  style={{ background: 'var(--accent, #2563eb)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  💾 บันทึกการตั้งค่า
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 5: PIN AUTH MODAL
           ======================================================== */}
        {showPinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--bg-surface, #111d32)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 14, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🔒</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink-primary, #eef2ff)', margin: 0 }}>ยืนยันสิทธิ์แอดมิน</h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-secondary, #94a3c4)', margin: '4px 0 0' }}>กรุณากรอกรหัส PIN (ค่าเริ่มต้น 8888)</p>
              </div>

              <form onSubmit={handlePinSubmit}>
                <input 
                  type="password" 
                  autoFocus 
                  maxLength={4} 
                  value={pinInput} 
                  onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                  placeholder="••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 20,
                    textAlign: 'center',
                    letterSpacing: 8,
                    borderRadius: 8,
                    background: '#080e1a',
                    border: pinError ? '2px solid #ef4444' : '1.5px solid #2d3f5e',
                    color: 'white',
                    marginBottom: 10
                  }}
                />

                {pinError && (
                  <div style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                    {pinError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setShowPinModal(false); setPinError(''); }}
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, fontWeight: 700, fontSize: 13, color: '#eef2ff', cursor: 'pointer' }}>
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--accent, #2563eb)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    ยืนยัน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function InspectionSheetsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0c1220', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังโหลดแบบฟอร์มตรวจเช็ค...</div>}>
      <InspectionSheetsInner />
    </Suspense>
  );
}
