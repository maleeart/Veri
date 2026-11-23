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

// Compress and downscale uploaded inspection images client-side before storing
const compressImageFile = (file, maxWidth = 900, maxHeight = 900, quality = 0.75, forceJpeg = true) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('ไฟล์ไม่ใช่รูปภาพ'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (forceJpeg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const format = forceJpeg ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getHeaderLogoUrl = (header) => {
  if (!header || header.logoType === 'none') return null;
  if (header.logoType === 'custom') return header.customLogoUrl || null;
  if (header.logoType === 'veri') return '/logo.png';
  return '/assets/shared/egat-logo.jpg'; // default egat (ดึงจากเมนูใบเสนอซ่อม)
};

const getHeaderLogoHeight = (logoSize) => {
  if (logoSize === 'xlarge') return 96;
  if (logoSize === 'normal') return 60;
  return 80; // default large (ตรงกับใบเสนอซ่อม)
};

const getHeaderLogoMaxWidth = (logoSize) => {
  if (logoSize === 'xlarge') return 180;
  if (logoSize === 'normal') return 120;
  return 150; // default large (ตรงกับใบเสนอซ่อม)
};

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

  // Guarantee valid non-empty document running number
  const docRefNumber = useMemo(() => {
    if (isBlankView) {
      return viewingTemplate?.code 
        ? `${viewingTemplate.code.replace(/-\d+$/, '').replace(/-+$/, '')}-..........` 
        : 'INS-..........';
    }
    const num = viewingRecord?.recordNo || viewingRecord?.docNo || viewingRecord?.refNo;
    if (num && String(num).trim()) return String(num).trim();
    if (viewingTemplate?.code && String(viewingTemplate.code).trim()) {
      return `${String(viewingTemplate.code).trim().replace(/-+$/, '')}-001`;
    }
    return `INS-${new Date().getFullYear() + 543}-001`;
  }, [isBlankView, viewingTemplate, viewingRecord]);

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
      // 1. Templates (Canonical sync from server + Tombstones)
      const resTpl = await fetch('/api/inspection-sheets/templates', { cache: 'no-store' });
      const jsonTpl = await resTpl.json();
      
      const delTplIds = new Set(JSON.parse(localStorage.getItem('veri_deleted_template_ids') || '[]'));
      if (jsonTpl.ok && Array.isArray(jsonTpl.deletedTemplateIds)) {
        jsonTpl.deletedTemplateIds.forEach(id => { if (id) delTplIds.add(id); });
        try {
          localStorage.setItem('veri_deleted_template_ids', JSON.stringify(Array.from(delTplIds)));
        } catch {}
      }

      let serverTemplates = [];
      if (jsonTpl.ok && Array.isArray(jsonTpl.templates)) {
        serverTemplates = jsonTpl.templates.filter(t => t && t.id && !delTplIds.has(t.id));
        setTemplates(serverTemplates);
        try {
          localStorage.setItem('veri_inspection_templates', JSON.stringify(serverTemplates));
        } catch {}
      } else {
        // Offline fallback only
        try {
          const cachedTpl = localStorage.getItem('veri_inspection_templates');
          if (cachedTpl) {
            const localList = JSON.parse(cachedTpl);
            if (Array.isArray(localList)) {
              serverTemplates = localList.filter(t => t && t.id && !delTplIds.has(t.id));
              setTemplates(serverTemplates);
            }
          }
        } catch {}
      }

      // 2. Records (Canonical sync from server + Tombstones)
      const resRec = await fetch('/api/inspection-sheets/records', { cache: 'no-store' });
      const jsonRec = await resRec.json();

      const delRecKeys = new Set(JSON.parse(localStorage.getItem('veri_deleted_records') || '[]'));
      if (jsonRec.ok && Array.isArray(jsonRec.deletedRecordKeys)) {
        jsonRec.deletedRecordKeys.forEach(k => { if (k && k !== 'undefined' && k !== 'null') delRecKeys.add(k); });
        try {
          localStorage.setItem('veri_deleted_records', JSON.stringify(Array.from(delRecKeys)));
        } catch {}
      }

      let finalRecords = [];
      if (jsonRec.ok && Array.isArray(jsonRec.records)) {
        finalRecords = jsonRec.records.filter(r => {
          if (!r) return false;
          if (r.id && delRecKeys.has(r.id)) return false;
          if (r.recordNo && delRecKeys.has(r.recordNo)) return false;
          return true;
        });
        setRecords(finalRecords);
        try {
          localStorage.setItem('veri_inspection_records', JSON.stringify(finalRecords));
        } catch {}
      } else {
        // Offline fallback only
        try {
          const cachedRec = localStorage.getItem('veri_inspection_records');
          if (cachedRec) {
            const localRecords = JSON.parse(cachedRec);
            if (Array.isArray(localRecords)) {
              finalRecords = localRecords.filter(r => {
                if (!r) return false;
                if (r.id && delRecKeys.has(r.id)) return false;
                if (r.recordNo && delRecKeys.has(r.recordNo)) return false;
                return true;
              });
              setRecords(finalRecords);
            }
          }
        } catch {}
      }

      // 3. Settings
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
    const curYear = new Date().getFullYear() + 543;
    setEditingTemplate({
      name: '',
      code: `INS-${curYear}-`,
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
            const delIds = JSON.parse(localStorage.getItem('veri_deleted_template_ids') || '[]');
            if (!delIds.includes(id)) {
              delIds.push(id);
              localStorage.setItem('veri_deleted_template_ids', JSON.stringify(delIds));
            }
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
      const cloned = JSON.parse(JSON.stringify(recordToEdit));
      if (!cloned.id) cloned.id = `rec-${Date.now()}`;
      setEditingRecord(cloned);
    } else {
      let nextRef = 'INS-2569-001';
      try {
        const prefix = (template.code || '').trim();
        const res = await fetch(`/api/inspection-sheets/records?getNextRef=1${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ''}`);
        const json = await res.json();
        if (json.ok && json.nextRef) nextRef = json.nextRef;
      } catch {}

      setEditingRecord({
        id: `rec-${Date.now()}`,
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
    const targetLabel = recordNo || id || 'รายการนี้';
    if (!confirm(`ยืนยันการลบผลการตรวจเช็คเลขที่ ${targetLabel} ใช่หรือไม่?`)) return;
    
    // 1. Optimistic deletion on client (Safe exact-match filtering only)
    setRecords(prev => {
      const updated = prev.filter(r => {
        if (!r) return false;
        if (id && id !== 'undefined' && id !== 'null' && r.id && r.id === id) return false;
        if (recordNo && recordNo !== 'undefined' && recordNo !== 'null' && r.recordNo && r.recordNo === recordNo) return false;
        return true;
      });
      try {
        localStorage.setItem('veri_inspection_records', JSON.stringify(updated));
        const delRecs = JSON.parse(localStorage.getItem('veri_deleted_records') || '[]');
        if (recordNo && recordNo !== 'undefined' && recordNo !== 'null' && !delRecs.includes(recordNo)) {
          delRecs.push(recordNo);
        }
        if (id && id !== 'undefined' && id !== 'null' && !delRecs.includes(id)) {
          delRecs.push(id);
        }
        localStorage.setItem('veri_deleted_records', JSON.stringify(delRecs));
      } catch {}
      return updated;
    });

    // 2. Call server
    try {
      const queryParams = [];
      if (id && id !== 'undefined' && id !== 'null') queryParams.push(`id=${encodeURIComponent(id)}`);
      if (recordNo && recordNo !== 'undefined' && recordNo !== 'null') queryParams.push(`recordNo=${encodeURIComponent(recordNo)}`);
      if (queryParams.length > 0) {
        await fetch(`/api/inspection-sheets/records?${queryParams.join('&')}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.warn('Delete server warning:', err);
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

      // Ensure scroll container is at top before capturing to avoid clipping
      const scrollParent = printArea.parentElement;
      const origScrollTop = scrollParent ? scrollParent.scrollTop : 0;
      if (scrollParent) scrollParent.scrollTop = 0;

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
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      if (scrollParent) scrollParent.scrollTop = origScrollTop;

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
                            {rec.templateName || tpl?.name || 'แบบฟอร์มตรวจเช็ค'}
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
                          เลขรัน: {tpl.code || 'INS-'}
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
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                            style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11.5, cursor: 'pointer' }}>
                            ลบ
                          </button>
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
                      เลขรันเอกสาร / คำนำหน้ารหัสรัน *
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น INS- หรือ INS-2569- หรือ MDB-"
                      value={editingTemplate.code || ''}
                      onChange={e => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 6, color: 'white', fontSize: 13 }}
                    />
                    <div style={{ fontSize: 11, color: '#94a3c4', marginTop: 3 }}>
                      กำหนดรหัสเลขรันของแบบฟอร์มนี้ (เช่น INS-, MDB-, PMP-)
                    </div>
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
                    แบบฟอร์ม: {activeTemplateForFill.name} • เลขที่เอกสาร: {editingRecord.recordNo}
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
                        เลขที่เอกสาร (เลขรัน) *
                      </label>
                      <input 
                        type="text" 
                        value={editingRecord.recordNo || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, recordNo: e.target.value })}
                        placeholder="เช่น INS-2569-001"
                        style={{ width: '100%', padding: '7px 10px', background: '#080e1a', border: '1px solid #3b82f6', borderRadius: 6, color: '#60a5fa', fontWeight: 700, fontSize: 12.5 }}
                      />
                    </div>

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
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              try {
                                                const compressed = await compressImageFile(file, 900, 900, 0.75, true);
                                                const rows = [...editingRecord.rows];
                                                rows[rIdx][col.id] = compressed;
                                                setEditingRecord({ ...editingRecord, rows });
                                              } catch (err) {
                                                alert('ไม่สามารถอัปโหลดรูปภาพได้: ' + (err.message || ''));
                                              }
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
                          const updated = [
                            savedRec,
                            ...prev.filter(r => {
                              if (!r) return false;
                              const sameId = savedRec.id && r.id && r.id === savedRec.id;
                              const sameRecordNo = savedRec.recordNo && r.recordNo && r.recordNo === savedRec.recordNo;
                              return !(sameId || sameRecordNo);
                            })
                          ];
                          try {
                            localStorage.setItem('veri_inspection_records', JSON.stringify(updated));
                          } catch {}
                          return updated;
                        });
                        alert(`บันทึกผลการตรวจเช็คเลขที่ ${savedRec.recordNo || ''} เรียบร้อยแล้ว`);
                        setShowFillerModal(false);
                        setActiveTab('records');
                        loadData();
                        handleViewRecord(savedRec);
                      } else {
                        alert('บันทึกไม่สำเร็จ: ' + (json?.error || 'เกิดข้อผิดพลาด'));
                      }
                    } catch {
                      // Offline/Network fallback: save locally so work is never lost
                      const localSaved = {
                        ...editingRecord,
                        id: editingRecord.id || `rec-${Date.now()}`,
                        updatedAt: new Date().toISOString()
                      };
                      setRecords(prev => {
                        const updated = [
                          localSaved,
                          ...prev.filter(r => {
                            if (!r) return false;
                            const sameId = localSaved.id && r.id && r.id === localSaved.id;
                            const sameRecordNo = localSaved.recordNo && r.recordNo && r.recordNo === localSaved.recordNo;
                            return !(sameId || sameRecordNo);
                          })
                        ];
                        try {
                          localStorage.setItem('veri_inspection_records', JSON.stringify(updated));
                        } catch {}
                        return updated;
                      });
                      alert(`บันทึกข้อมูลผลตรวจเช็คเรียบร้อยแล้ว (เลขที่ ${localSaved.recordNo || ''})`);
                      setShowFillerModal(false);
                      setActiveTab('records');
                      handleViewRecord(localSaved);
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
                {isBlankView ? '📄 ฟอร์มเปล่าสำหรับพิมพ์ (Blank Sheet)' : `📄 ${docRefNumber} - ${viewingTemplate?.name || 'เอกสารผลการตรวจเช็ค'}`}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleExportExcel(viewingTemplate, viewingRecord, isBlankView)}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>📊</span> โหลด Excel
                </button>

                <button
                  disabled={exportingPdf}
                  onClick={() => handleDownloadPdf('inspection-doc-print-area', `${docRefNumber}_${isBlankView ? 'Blank' : 'Result'}`)}
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
                  {/* Official Letterhead Banner */}
                  {settings?.header?.showLetterhead !== false && (
                    settings?.header?.bannerImageUrl ? (
                      /* MODE A: รูปภาพหัวกระดาษแบบเต็ม A4 (Full Banner Image) */
                      <div 
                        style={settings.header?.bannerLayout === 'contained' ? {
                          width: '100%',
                          borderBottom: '2.5px solid #0f2e5a',
                          paddingBottom: 6,
                          marginBottom: 14
                        } : {
                          width: 'calc(100% + 40mm)',
                          margin: '-18mm -20mm 14mm -20mm',
                          borderTopLeftRadius: 0,
                          borderTopRightRadius: 0,
                          overflow: 'hidden',
                          borderBottom: '2.5px solid #0f2e5a'
                        }}>
                        <img 
                          src={settings.header.bannerImageUrl} 
                          alt="Official Letterhead Banner" 
                          style={{ width: '100%', height: 'auto', display: 'block' }} 
                        />
                      </div>
                    ) : (
                      /* MODE B: หัวกระดาษทางการ (โลโก้ + ข้อความหน่วยงาน) */
                      <div 
                        style={settings?.header?.bannerLayout === 'contained' ? {
                          width: '100%',
                          backgroundColor: settings?.header?.bannerTheme === 'navy' ? '#0a2540' : '#ffffff',
                          background: settings?.header?.bannerTheme === 'navy'
                            ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)'
                            : '#ffffff',
                          borderBottom: settings?.header?.bannerTheme === 'navy'
                            ? '3.5px solid #d97706'
                            : '3.5px solid #0f2e5a',
                          padding: settings?.header?.bannerTheme === 'navy' ? '12px 16px' : '0 0 10px 0',
                          borderRadius: 6,
                          marginBottom: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14
                        } : {
                          width: 'calc(100% + 40mm)',
                          margin: '-18mm -20mm 14mm -20mm',
                          backgroundColor: settings?.header?.bannerTheme === 'navy' ? '#0a2540' : '#ffffff',
                          background: settings?.header?.bannerTheme === 'navy'
                            ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)'
                            : '#ffffff',
                          borderBottom: settings?.header?.bannerTheme === 'navy'
                            ? '3.5px solid #d97706'
                            : '3.5px solid #0f2e5a',
                          boxShadow: settings?.header?.bannerTheme === 'navy'
                            ? 'none'
                            : '0 3px 0 #d97706',
                          padding: '14mm 20mm 10mm 20mm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 18
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          {getHeaderLogoUrl(settings?.header) && (
                            <div style={{ flexShrink: 0 }}>
                              <img 
                                src={getHeaderLogoUrl(settings?.header)} 
                                alt="Logo" 
                                style={{ 
                                  height: getHeaderLogoHeight(settings?.header?.logoSize), 
                                  maxWidth: getHeaderLogoMaxWidth(settings?.header?.logoSize), 
                                  objectFit: 'contain', 
                                  display: 'block',
                                  background: settings?.header?.bannerTheme === 'navy' ? '#ffffff' : 'transparent',
                                  padding: settings?.header?.bannerTheme === 'navy' ? 4 : 0,
                                  borderRadius: settings?.header?.bannerTheme === 'navy' ? 6 : 0
                                }} 
                              />
                            </div>
                          )}
                          <div>
                            <div style={{ 
                              fontSize: settings?.header?.logoSize === 'xlarge' ? 18 : settings?.header?.logoSize === 'normal' ? 15 : 16.5, 
                              fontWeight: 900, 
                              color: settings?.header?.bannerTheme === 'navy' ? '#ffffff' : '#0f2e5a', 
                              lineHeight: 1.25 
                            }}>
                              {settings?.header?.companyTitle || 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)'}
                            </div>
                            <div style={{ 
                              fontSize: settings?.header?.logoSize === 'xlarge' ? 13 : settings?.header?.logoSize === 'normal' ? 11.5 : 12.5, 
                              fontWeight: 700, 
                              color: settings?.header?.bannerTheme === 'navy' ? '#e2e8f0' : '#334155', 
                              marginTop: 2 
                            }}>
                              {settings?.header?.companySubtitle || viewingTemplate.department || 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)'}
                            </div>
                            <div style={{ 
                              fontSize: 10, 
                              color: settings?.header?.bannerTheme === 'navy' ? '#94a3b8' : '#64748b', 
                              fontWeight: 500, 
                              marginTop: 2 
                            }}>
                              {settings?.header?.companyAddress || 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.'}
                            </div>
                          </div>
                        </div>

                        {/* Document Running No in Header */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ 
                            border: settings?.header?.bannerTheme === 'navy' ? '1.5px solid #fbbf24' : '1.5px solid #0f2e5a', 
                            borderRadius: 6, 
                            padding: '4px 12px', 
                            backgroundColor: settings?.header?.bannerTheme === 'navy' ? '#0f3d68' : '#f8fafc', 
                            display: 'inline-block',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                          }}>
                            <div style={{ fontSize: 9.5, color: settings?.header?.bannerTheme === 'navy' ? '#e2e8f0' : '#475569', fontWeight: 700 }}>เลขที่เอกสาร</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: settings?.header?.bannerTheme === 'navy' ? '#fbbf24' : '#0f2e5a', letterSpacing: 0.3 }}>
                              {docRefNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Form Title Banner */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #0f2e5a', borderRadius: 6, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f2e5a' }}>
                      {viewingTemplate.name} {isBlankView ? '(ฟอร์มเปล่า)' : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f2e5a', border: '1.5px solid #0f2e5a', background: '#ffffff', padding: '2px 10px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span>เลขที่:</span> <strong style={{ color: '#b91c1c' }}>{docRefNumber}</strong>
                      </span>
                      <span style={{ fontSize: 10.5, color: '#ffffff', background: '#0f2e5a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        รอบตรวจ: {viewingTemplate.frequency || 'ประจำเดือน'}
                      </span>
                    </div>
                  </div>

                  {/* Meta Details Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '16%', background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          เลขที่เอกสาร:
                        </td>
                        <td style={{ width: '44%', padding: '5px 8px', border: '1px solid #cbd5e1', color: '#b91c1c', fontWeight: 800, fontSize: 11.5 }}>
                          {docRefNumber}
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
                          สถานที่/อาคาร:
                        </td>
                        <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}>
                          {viewingRecord?.location || (isBlankView ? '....................................................................' : '-')}
                        </td>
                        <td style={{ background: '#f1f5f9', padding: '5px 8px', fontWeight: 700, border: '1px solid #cbd5e1', color: '#334155' }}>
                          รอบการตรวจ:
                        </td>
                        <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}>
                          {viewingTemplate.frequency || 'ประจำเดือน'}
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
                
                {/* Section 1: Full-featured Letterhead & Banner Customizer */}
                <div style={{ background: 'var(--bg-surface-raised, #172340)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏢</span> ปรับแต่งหัวกระดาษเอกสารเต็มรูปแบบ (Letterhead Customizer)
                    </div>
                    <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {settings.header?.bannerImageUrl ? 'โหมดรูปภาพสำเร็จรูป' : `โหมดข้อความ + โลโก้ (${settings.header?.logoSize || 'large'})`}
                    </span>
                  </div>

                  {/* Live Preview Box */}
                  <div style={{ border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 8, padding: 12, background: 'var(--bg-input, #080e1a)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>👁️</span> ตัวอย่างการแสดงผลบนกระดาษ A4 (Live Preview)
                      </div>
                      <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        ขนาดจัดวาง: {settings.header?.bannerLayout === 'contained' ? 'Contained (ตามกรอบเนื้อหา)' : 'Bleed (ชิดขอบกระดาษ)'}
                      </span>
                    </div>

                    {/* Preview canvas */}
                    <div style={{ background: '#ffffff', borderRadius: 6, overflow: 'hidden', padding: settings.header?.bannerLayout === 'contained' ? '8px 12px' : '0', border: '1px solid #cbd5e1' }}>
                      {settings.header?.bannerImageUrl ? (
                        <img 
                          src={settings.header.bannerImageUrl} 
                          alt="Banner Live Preview" 
                          style={{ width: '100%', height: 'auto', display: 'block' }} 
                        />
                      ) : (
                        <div style={{
                          background: settings.header?.bannerTheme === 'navy' 
                            ? 'linear-gradient(135deg, #0a2540 0%, #0f3d68 100%)' 
                            : '#ffffff',
                          padding: '12px 18px 10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14,
                          borderBottom: settings.header?.bannerTheme === 'navy' ? '3px solid #d97706' : '3px solid #0f2e5a',
                          boxShadow: settings.header?.bannerTheme === 'navy' ? 'none' : '0 2px 0 #d97706'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {getHeaderLogoUrl(settings.header) && (
                              <div style={{ flexShrink: 0 }}>
                                <img 
                                  src={getHeaderLogoUrl(settings.header)} 
                                  alt="Logo Preview" 
                                  style={{ 
                                    height: getHeaderLogoHeight(settings.header?.logoSize) * 0.7, 
                                    maxWidth: getHeaderLogoMaxWidth(settings.header?.logoSize) * 0.7, 
                                    objectFit: 'contain', 
                                    display: 'block',
                                    background: settings.header?.bannerTheme === 'navy' ? '#ffffff' : 'transparent',
                                    padding: settings.header?.bannerTheme === 'navy' ? 3 : 0,
                                    borderRadius: settings.header?.bannerTheme === 'navy' ? 4 : 0
                                  }} 
                                />
                              </div>
                            )}
                            <div>
                              <div style={{ 
                                fontSize: settings.header?.logoSize === 'xlarge' ? 14 : 13, 
                                fontWeight: 900, 
                                color: settings.header?.bannerTheme === 'navy' ? '#ffffff' : '#0f2e5a', 
                                lineHeight: 1.25 
                              }}>
                                {settings.header?.companyTitle || 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย (กฟผ.)'}
                              </div>
                              <div style={{ 
                                fontSize: 11, 
                                fontWeight: 700, 
                                color: settings.header?.bannerTheme === 'navy' ? '#e2e8f0' : '#1e293b', 
                                marginTop: 2 
                              }}>
                                {settings.header?.companySubtitle || 'ฝ่ายบำรุงรักษาและวิศวกรรมอาคาร (หบท-ธ.)'}
                              </div>
                              <div style={{ 
                                fontSize: 9.5, 
                                color: settings.header?.bannerTheme === 'navy' ? '#94a3b8' : '#64748b', 
                                fontWeight: 500, 
                                marginTop: 2 
                              }}>
                                {settings.header?.companyAddress || 'โทรศัพท์ 02-436-0000 | อาคาร ท.102 สำนักงานกลาง กฟผ.'}
                              </div>
                            </div>
                          </div>

                          <div style={{ border: settings.header?.bannerTheme === 'navy' ? '1px solid rgba(255,255,255,0.3)' : '1px solid #0f2e5a', borderRadius: 4, padding: '3px 8px', background: settings.header?.bannerTheme === 'navy' ? 'rgba(255,255,255,0.1)' : '#f8fafc', textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 8.5, color: settings.header?.bannerTheme === 'navy' ? '#cbd5e1' : '#64748b', fontWeight: 600 }}>เลขที่เอกสาร</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: settings.header?.bannerTheme === 'navy' ? '#ffffff' : '#0f2e5a' }}>INS-2569-001</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Layout Selector for Banner Width */}
                  <div style={{ background: 'var(--bg-input, #080e1a)', border: '1px solid var(--border-strong, #2d3f5e)', borderRadius: 8, padding: '10px 14px' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                      📐 รูปแบบความกว้างการแสดงผลบนกระดาษ A4 (Layout Width):
                    </label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: settings.header?.bannerLayout !== 'contained' ? 700 : 500, color: 'var(--ink-primary, #eef2ff)' }}>
                        <input 
                          type="radio" 
                          name="inspectBannerLayout" 
                          checked={settings.header?.bannerLayout !== 'contained'} 
                          onChange={() => setSettings({
                            ...settings,
                            header: { ...(settings.header || {}), bannerLayout: 'bleed' }
                          })} 
                        />
                        เต็มแผ่นกระดาษ A4 (ชิดขอบกระดาษทุกด้าน Bleed Edge-to-Edge) ⭐ แนะนำ
                      </label>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: settings.header?.bannerLayout === 'contained' ? 700 : 500, color: 'var(--ink-secondary, #94a3c4)' }}>
                        <input 
                          type="radio" 
                          name="inspectBannerLayout" 
                          checked={settings.header?.bannerLayout === 'contained'} 
                          onChange={() => setSettings({
                            ...settings,
                            header: { ...(settings.header || {}), bannerLayout: 'contained' }
                          })} 
                        />
                        เต็มขอบเนื้อหาเอกสาร (Contained เสมอเท่าขอบตารางและกรอบฟอร์ม)
                      </label>
                    </div>
                  </div>

                  {/* Section A: Full Banner Image */}
                  <div style={{ border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 8, padding: 12, background: 'var(--bg-input, #080e1a)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 12.5, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🖼️</span> อัปโหลดรูปภาพหัวกระดาษสำเร็จรูปเต็มแผ่น A4 (Full Banner Image)
                      </div>
                      {settings.header?.bannerImageUrl && (
                        <button
                          type="button"
                          onClick={() => setSettings({
                            ...settings,
                            header: { ...(settings.header || {}), bannerImageUrl: '' }
                          })}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                          ✕ นำรูปออก (กลับไปใช้โลโก้+ข้อความ)
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--ink-secondary, #94a3c4)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      เมื่ออัปโหลดรูปภาพหัวกระดาษสำเร็จรูป ระบบจะแสดงภาพเต็มความกว้าง A4 ทันที และซ่อนข้อความชื่อองค์กรซ้ำซ้อน
                    </p>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ background: 'var(--accent, #2563eb)', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        📁 {settings.header?.bannerImageUrl ? 'เปลี่ยนรูปหัวกระดาษใหม่' : 'อัปโหลดรูปหัวกระดาษแบบเต็ม A4'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const compressed = await compressImageFile(f, 1400, 420, 0.82, true);
                              setSettings({
                                ...settings,
                                header: { ...(settings.header || {}), bannerImageUrl: compressed }
                              });
                            } catch (err) {
                              alert('ไม่สามารถโหลดรูปภาพได้: ' + (err.message || ''));
                            }
                          }} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                      {settings.header?.bannerImageUrl && (
                        <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 600 }}>
                          ✓ มีรูปภาพหัวกระดาษสำเร็จรูปพร้อมใช้งาน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section B: Text & Logo Header */}
                  <div style={{ border: '1px solid var(--border-hairline, #1e2e4a)', borderRadius: 8, padding: 12, background: settings.header?.bannerImageUrl ? 'rgba(15, 23, 42, 0.4)' : 'var(--bg-input, #080e1a)', opacity: settings.header?.bannerImageUrl ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-primary, #eef2ff)' }}>
                        🏢 ตั้งค่าหัวกระดาษทางการและโลโก้ (เมื่อไม่ใช้ภาพหัวกระดาษสำเร็จรูป)
                      </div>
                      {settings.header?.bannerImageUrl && (
                        <span style={{ fontSize: 10.5, background: '#111d32', color: '#94a3b8', border: '1px solid #2d3f5e', padding: '2px 6px', borderRadius: 4 }}>
                          ซ่อนในเอกสารอัตโนมัติ (เนื่องจากใช้รูปภาพหัวกระดาษแล้ว)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ชื่อองค์กร / บริษัทหลัก</label>
                        <input 
                          type="text" 
                          value={settings.header?.companyTitle || ''}
                          onChange={e => setSettings({ 
                            ...settings, 
                            header: { ...(settings.header || {}), companyTitle: e.target.value } 
                          })}
                          style={{ width: '100%', padding: '7px 10px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>หน่วยงานย่อย / ฝ่าย / แผนก</label>
                        <input 
                          type="text" 
                          value={settings.header?.companySubtitle || ''}
                          onChange={e => setSettings({ 
                            ...settings, 
                            header: { ...(settings.header || {}), companySubtitle: e.target.value } 
                          })}
                          style={{ width: '100%', padding: '7px 10px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: '#cbd5e1', display: 'block', marginBottom: 3 }}>ข้อมูลติดต่อ / ที่อยู่</label>
                        <input 
                          type="text" 
                          value={settings.header?.companyAddress || ''}
                          onChange={e => setSettings({ 
                            ...settings, 
                            header: { ...(settings.header || {}), companyAddress: e.target.value } 
                          })}
                          style={{ width: '100%', padding: '7px 10px', background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 5, color: 'white', fontSize: 12.5 }}
                        />
                      </div>

                      {/* Logo Size Selector */}
                      <div style={{ background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 6, padding: '8px 12px' }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                          🔍 ขนาดความใหญ่ของโลโก้ (Logo Size):
                        </label>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'var(--ink-secondary, #94a3c4)' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoSize" 
                              checked={settings.header?.logoSize === 'normal'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoSize: 'normal' } })} 
                            />
                            ปกติ (60px)
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 700, color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoSize" 
                              checked={!settings.header?.logoSize || settings.header?.logoSize === 'large'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoSize: 'large' } })} 
                            />
                            ใหญ่เต็มตา (80px) ⭐ แนะนำ
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 700, color: '#38bdf8' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoSize" 
                              checked={settings.header?.logoSize === 'xlarge'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoSize: 'xlarge' } })} 
                            />
                            ใหญ่พิเศษ (96px)
                          </label>
                        </div>
                      </div>

                      {/* Header Theme Selector */}
                      <div style={{ background: '#111d32', border: '1px solid #2d3f5e', borderRadius: 6, padding: '8px 12px' }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#93c5fd', display: 'block', marginBottom: 6 }}>
                          🎨 ธีมสีหัวกระดาษ (Header Theme):
                        </label>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: (!settings.header?.bannerTheme || settings.header?.bannerTheme === 'white') ? 700 : 500, color: 'var(--ink-primary, #eef2ff)' }}>
                            <input 
                              type="radio" 
                              name="inspectBannerTheme" 
                              checked={!settings.header?.bannerTheme || settings.header?.bannerTheme === 'white'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), bannerTheme: 'white' } })} 
                            />
                            สีขาวทางการ (White & Navy/Gold Line) ⭐ แนะนำ
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: settings.header?.bannerTheme === 'navy' ? 700 : 500, color: '#60a5fa' }}>
                            <input 
                              type="radio" 
                              name="inspectBannerTheme" 
                              checked={settings.header?.bannerTheme === 'navy'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), bannerTheme: 'navy' } })} 
                            />
                            สีกรมท่าพรีเมียม (Navy Gradient)
                          </label>
                        </div>
                      </div>

                      {/* Logo Source Selector */}
                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-secondary, #94a3c4)', display: 'block', marginBottom: 4 }}>
                          เลือกรูปภาพโลโก้:
                        </label>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)', background: (!settings.header?.logoType || settings.header?.logoType === 'egat') ? 'rgba(37,99,235,0.18)' : '#111d32', padding: '4px 8px', borderRadius: 6, border: (!settings.header?.logoType || settings.header?.logoType === 'egat') ? '1px solid #3b82f6' : '1px solid #2d3f5e' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoType" 
                              checked={!settings.header?.logoType || settings.header?.logoType === 'egat'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoType: 'egat' } })} 
                            />
                            <img src="/assets/shared/egat-logo.jpg" alt="EGAT" style={{ height: 20, width: 'auto', background: '#ffffff', borderRadius: 2, padding: 1 }} />
                            <span>โลโก้ กฟผ. (EGAT)</span>
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)', background: settings.header?.logoType === 'veri' ? 'rgba(37,99,235,0.18)' : '#111d32', padding: '4px 8px', borderRadius: 6, border: settings.header?.logoType === 'veri' ? '1px solid #3b82f6' : '1px solid #2d3f5e' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoType" 
                              checked={settings.header?.logoType === 'veri'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoType: 'veri' } })} 
                            />
                            <img src="/logo.png" alt="Veri" style={{ height: 20, width: 'auto' }} />
                            <span>โลโก้ Veri</span>
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-primary, #eef2ff)', background: settings.header?.logoType === 'custom' ? 'rgba(37,99,235,0.18)' : '#111d32', padding: '4px 8px', borderRadius: 6, border: settings.header?.logoType === 'custom' ? '1px solid #3b82f6' : '1px solid #2d3f5e' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoType" 
                              checked={settings.header?.logoType === 'custom'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoType: 'custom' } })} 
                            />
                            <span>📁 อัปโหลดเอง (Custom)</span>
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-secondary, #94a3c4)', background: settings.header?.logoType === 'none' ? 'rgba(37,99,235,0.18)' : '#111d32', padding: '4px 8px', borderRadius: 6, border: settings.header?.logoType === 'none' ? '1px solid #3b82f6' : '1px solid #2d3f5e' }}>
                            <input 
                              type="radio" 
                              name="inspectLogoType" 
                              checked={settings.header?.logoType === 'none'} 
                              onChange={() => setSettings({ ...settings, header: { ...(settings.header || {}), logoType: 'none' } })} 
                            />
                            <span>🚫 ไม่แสดงโลโก้</span>
                          </label>
                        </div>

                        {settings.header?.logoType === 'custom' && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ background: '#111d32', border: '1px solid #2d3f5e', color: 'white', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              📁 เลือกไฟล์โลโก้
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  try {
                                    const compressed = await compressImageFile(f, 600, 400, 0.85, true);
                                    setSettings({ ...settings, header: { ...(settings.header || {}), customLogoUrl: compressed } });
                                  } catch (err) {
                                    alert('ไม่สามารถโหลดรูปโลโก้ได้: ' + (err.message || ''));
                                  }
                                }} 
                                style={{ display: 'none' }} 
                              />
                            </label>
                            {settings.header?.customLogoUrl && (
                              <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 600 }}>✓ โหลดโลโก้เรียบร้อย</span>
                            )}
                          </div>
                        )}
                      </div>

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
