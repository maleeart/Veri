'use client';

import { useState, useEffect, useMemo } from 'react';

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtShortDate(iso) {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10);
  return `${d} ${THAI_MONTHS[m - 1]}`;
}

function fmtYearMonth(ym) {
  if (!ym) return '—';
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  const y = parseInt(parts[0], 10) + 543;
  const m = parseInt(parts[1], 10);
  return `${THAI_MONTHS[m - 1]} ${y}`;
}

const METRICS = [
  { key: 'fuel',          label: '⛽ ระดับน้ำมันเชื้อเพลิง', short: 'น้ำมัน',     unit: 'ลิตร', digits: 0, minSafe: 300, maxSafe: 1000 },
  { key: 'coolantTemp',   label: '🌡️ อุณหภูมิน้ำหล่อเย็น',  short: 'อุณหภูมิน้ำ', unit: '°C',   digits: 0, minSafe: 40,  maxSafe: 90 },
  { key: 'oilPressure',   label: '🛢️ แรงดันน้ำมันเครื่อง', short: 'แรงดัน นมค.', unit: 'PSI',  digits: 0, minSafe: 40,  maxSafe: 85 },
  { key: 'battery1',      label: '⚡ แรงดันแบตเตอรี่',       short: 'แบตเตอรี่',  unit: 'V',    digits: 1, minSafe: 12.4, maxSafe: 28.5 },
  { key: 'waterPressure', label: '💧 แรงดันน้ำระบบดับเพลิง', short: 'แรงดันน้ำ',  unit: 'PSI',  digits: 0, minSafe: 120, maxSafe: 220 },
  { key: 'hours',         label: '⏱️ ชม. ทำงานสะสม',        short: 'ชม. สะสม',   unit: 'ชม.',  digits: 1 },
];

export default function SystemTrends() {
  const [activeTab, setActiveTab] = useState('fpg'); // 'fpg' | 'meter' | 'emer' | 'smoke'
  const [metricKey, setMetricKey] = useState('fuel');
  const [hiddenMachines, setHiddenMachines] = useState({});
  const [hoverIndex, setHoverIndex] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const loadData = async (refresh = false) => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/system-trends${refresh ? '?refresh=1' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const curMetric = METRICS.find(m => m.key === metricKey) || METRICS[0];

  const toggleMachine = (mId) => {
    setHiddenMachines(prev => ({ ...prev, [mId]: !prev[mId] }));
  };

  // ─── Fire Pump & Generator SVG Chart Data ───
  const fpgChart = useMemo(() => {
    if (!data?.fpg?.machines || !data?.fpg?.dates?.length) return null;
    const { dates, machines } = data.fpg;
    const mKeys = Object.keys(machines);

    // Compute min / max across visible machines for the selected metric
    let minVal = Infinity;
    let maxVal = -Infinity;
    let hasValues = false;

    mKeys.forEach(mId => {
      if (hiddenMachines[mId]) return;
      machines[mId].series.forEach(pt => {
        const v = pt[metricKey];
        if (v != null && !isNaN(v)) {
          hasValues = true;
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      });
    });

    if (!hasValues) {
      minVal = 0;
      maxVal = 100;
    } else {
      const pad = (maxVal - minVal) * 0.12 || 5;
      minVal = Math.max(0, Math.floor(minVal - pad));
      maxVal = Math.ceil(maxVal + pad);
    }

    const W = 820;
    const H = 280;
    const padL = 60;
    const padR = 25;
    const padT = 30;
    const padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const xStep = dates.length > 1 ? chartW / (dates.length - 1) : chartW;
    const getY = (val) => {
      if (val == null || isNaN(val)) return null;
      const pct = (val - minVal) / (maxVal - minVal || 1);
      return padT + chartH - pct * chartH;
    };

    // Build paths
    const lines = mKeys.map(mId => {
      const m = machines[mId];
      const isHidden = !!hiddenMachines[mId];
      const pts = m.series.map((pt, idx) => {
        const x = padL + idx * xStep;
        const y = getY(pt[metricKey]);
        return { x, y, val: pt[metricKey], date: pt.date };
      });

      // Filter valid points for path
      const validPts = pts.filter(p => p.y != null);
      let d = '';
      if (validPts.length > 0) {
        d = `M ${validPts[0].x.toFixed(1)} ${validPts[0].y.toFixed(1)}`;
        for (let i = 1; i < validPts.length; i++) {
          d += ` L ${validPts[i].x.toFixed(1)} ${validPts[i].y.toFixed(1)}`;
        }
      }

      return {
        id: mId,
        label: m.label,
        location: m.location,
        color: m.color,
        isHidden,
        d,
        pts,
      };
    });

    // Y ticks (4 levels)
    const yTicks = [0, 0.33, 0.66, 1].map(pct => {
      const v = minVal + pct * (maxVal - minVal);
      const y = padT + chartH - pct * chartH;
      return { val: Math.round(v), y };
    });

    return { W, H, padL, padR, padT, padB, chartW, chartH, dates, lines, yTicks, minVal, maxVal, xStep };
  }, [data, metricKey, hiddenMachines]);

  // ─── Meter กฟน. SVG Chart Data ───
  const meterChart = useMemo(() => {
    if (!data?.meter?.daily?.length) return null;
    const daily = data.meter.daily;
    const W = 820;
    const H = 260;
    const padL = 60;
    const padR = 25;
    const padT = 30;
    const padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    let maxKwh = Math.max(...daily.map(d => d.m1 || 0), 10);
    maxKwh = Math.ceil(maxKwh * 1.15);

    const xStep = daily.length > 1 ? chartW / (daily.length - 1) : chartW;
    const getY = (val) => padT + chartH - (val / maxKwh) * chartH;

    const totalPts = daily.map((d, i) => ({ x: padL + i * xStep, y: getY(d.m1), val: d.m1, date: d.date, day: d.day, holiday: d.holiday }));
    const onPeakPts = daily.map((d, i) => ({ x: padL + i * xStep, y: getY(d.onPeak), val: d.onPeak }));
    const offPeakPts = daily.map((d, i) => ({ x: padL + i * xStep, y: getY(d.offPeak), val: d.offPeak }));

    const makeLine = (pts) => pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

    const totalPath = makeLine(totalPts);
    const onPeakPath = makeLine(onPeakPts);
    const offPeakPath = makeLine(offPeakPts);

    const yTicks = [0, 0.5, 1].map(pct => ({
      val: Math.round(pct * maxKwh),
      y: padT + chartH - pct * chartH,
    }));

    return { W, H, padL, padR, padT, padB, chartW, chartH, daily, totalPts, onPeakPts, offPeakPts, totalPath, onPeakPath, offPeakPath, yTicks, maxKwh, xStep };
  }, [data]);

  return (
    <section className="dash-sec trends-box">
      {/* Header */}
      <div className="trends-hd">
        <div className="trends-hd-left">
          <div className="trends-title-wrap">
            <span className="trends-icon">📈</span>
            <div>
              <h2 className="trends-title">ภาพรวมและแนวโน้มแต่ละระบบ (System Trends & Condition)</h2>
              <p className="trends-sub">
                กราฟเปรียบเทียบแนวโน้มค่าตรวจวัดย้อนหลัง เพื่อวิเคราะห์ความพร้อมและตรวจพบสิ่งผิดปกติล่วงหน้า
              </p>
            </div>
          </div>
        </div>

        <div className="trends-hd-right">
          <button
            className="trends-btn-refresh"
            onClick={() => loadData(true)}
            disabled={loading}
            title="โหลดข้อมูลล่าสุดใหม่">
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            <span>รีเฟรชกราฟ</span>
          </button>
        </div>
      </div>

      {/* System Tabs */}
      <div className="sys-tabs">
        <button
          className={`sys-tab${activeTab === 'fpg' ? ' sys-tab--active' : ''}`}
          onClick={() => { setActiveTab('fpg'); setHoverIndex(null); }}>
          <span className="st-ico">🚒</span>
          <span className="st-label">Fire Pump & Generator</span>
          <span className="st-badge">4 เครื่องจักร</span>
        </button>

        <button
          className={`sys-tab${activeTab === 'meter' ? ' sys-tab--active' : ''}`}
          onClick={() => { setActiveTab('meter'); setHoverIndex(null); }}>
          <span className="st-ico">⚡</span>
          <span className="st-label">Meter กฟน.</span>
          <span className="st-badge">{data?.meter?.month || 'รายวัน'}</span>
        </button>

        <button
          className={`sys-tab${activeTab === 'emer' ? ' sys-tab--active' : ''}`}
          onClick={() => { setActiveTab('emer'); setHoverIndex(null); }}>
          <span className="st-ico">💡</span>
          <span className="st-label">Emergency Light</span>
          <span className="st-badge">731+ จุด</span>
        </button>

        <button
          className={`sys-tab${activeTab === 'smoke' ? ' sys-tab--active' : ''}`}
          onClick={() => { setActiveTab('smoke'); setHoverIndex(null); }}>
          <span className="st-ico">🚨</span>
          <span className="st-label">Smoke Detector</span>
          <span className="st-badge">1,194 จุด</span>
        </button>
      </div>

      {loading && !data && (
        <div className="trends-loading">
          <div className="trends-spinner" />
          <span>กำลังประมวลผลข้อมูลแนวโน้มระบบ...</span>
        </div>
      )}

      {err && (
        <div className="trends-err">
          <span>⚠️ {err}</span>
          <button onClick={() => loadData(true)} className="btn-retry">ลองใหม่</button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: Fire Pump & Generator */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'fpg' && data?.fpg && (
        <div className="tab-pane">
          {/* Metric Selector Pills */}
          <div className="metric-bar">
            <span className="metric-bar-lbl">เลือกค่าตรวจวัด:</span>
            <div className="metric-pills">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  className={`metric-pill${metricKey === m.key ? ' metric-pill--active' : ''}`}
                  onClick={() => { setMetricKey(m.key); setHoverIndex(null); }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Legend & Line Toggles */}
          <div className="machine-legend">
            <span className="legend-hint">คลิกเพื่อซ่อน/แสดงกราฟเครื่องจักร:</span>
            <div className="legend-items">
              {Object.keys(data.fpg.machines).map(mId => {
                const m = data.fpg.machines[mId];
                const isOff = !!hiddenMachines[mId];
                const latestPt = m.series[m.series.length - 1];
                const latestVal = latestPt ? latestPt[metricKey] : null;

                return (
                  <button
                    key={mId}
                    className={`legend-btn${isOff ? ' legend-btn--off' : ''}`}
                    onClick={() => toggleMachine(mId)}
                    style={{ '--m-color': m.color }}>
                    <span className="lb-color" style={{ backgroundColor: isOff ? '#64748b' : m.color }} />
                    <span className="lb-title">{m.label}</span>
                    <span className="lb-loc">({m.location})</span>
                    {latestVal != null && (
                      <span className="lb-val">
                        {curMetric.digits === 0 ? Math.round(latestVal) : latestVal.toFixed(curMetric.digits)} {curMetric.unit}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SVG Chart Container */}
          {fpgChart && (
            <div className="chart-shell">
              <div className="chart-meta-row">
                <span className="cm-title">
                  แนวโน้ม <strong>{curMetric.label}</strong> ย้อนหลัง {fpgChart.dates.length} ครั้งตรวจล่าสุด ({fmtShortDate(fpgChart.dates[0])} — {fmtShortDate(fpgChart.dates[fpgChart.dates.length - 1])})
                </span>
                <span className="cm-unit">หน่วย: {curMetric.unit}</span>
              </div>

              <div className="svg-wrap">
                <svg
                  viewBox={`0 0 ${fpgChart.W} ${fpgChart.H}`}
                  className="trend-svg"
                  onMouseLeave={() => setHoverIndex(null)}>
                  {/* Grid lines */}
                  {fpgChart.yTicks.map(t => (
                    <g key={t.val}>
                      <line
                        x1={fpgChart.padL}
                        y1={t.y}
                        x2={fpgChart.W - fpgChart.padR}
                        y2={t.y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={fpgChart.padL - 10}
                        y={t.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="rgba(255,255,255,0.5)">
                        {t.val}
                      </text>
                    </g>
                  ))}

                  {/* Machine Line Paths */}
                  {fpgChart.lines.map(line => {
                    if (line.isHidden || !line.d) return null;
                    return (
                      <g key={line.id}>
                        {/* Glow outline */}
                        <path
                          d={line.d}
                          fill="none"
                          stroke={line.color}
                          strokeWidth="5"
                          strokeOpacity="0.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Main line */}
                        <path
                          d={line.d}
                          fill="none"
                          stroke={line.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Dots */}
                        {line.pts.map((p, idx) => {
                          if (p.val == null) return null;
                          const isHovered = hoverIndex === idx;
                          return (
                            <circle
                              key={idx}
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 5.5 : 3.5}
                              fill={line.color}
                              stroke="#0f172a"
                              strokeWidth={isHovered ? 2.5 : 1.5}
                              style={{ transition: 'r 0.15s ease' }}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* Vertical hover crosshair line */}
                  {hoverIndex !== null && (
                    <line
                      x1={fpgChart.padL + hoverIndex * fpgChart.xStep}
                      y1={fpgChart.padT}
                      x2={fpgChart.padL + hoverIndex * fpgChart.xStep}
                      y2={fpgChart.H - fpgChart.padB}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.8"
                    />
                  )}

                  {/* X Axis Labels */}
                  {fpgChart.dates.map((d, idx) => {
                    // Show dates with readable spacing
                    const showLabel = idx === 0 || idx === fpgChart.dates.length - 1 || idx % 3 === 0;
                    if (!showLabel) return null;
                    const x = fpgChart.padL + idx * fpgChart.xStep;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={fpgChart.H - 14}
                        textAnchor="middle"
                        fontSize="10.5"
                        fill="rgba(255,255,255,0.6)">
                        {fmtShortDate(d)}
                      </text>
                    );
                  })}

                  {/* Interactive invisible click/hover rectangles over each date column */}
                  {fpgChart.dates.map((_, idx) => {
                    const x = fpgChart.padL + idx * fpgChart.xStep - (fpgChart.xStep / 2);
                    return (
                      <rect
                        key={idx}
                        x={Math.max(0, x)}
                        y={fpgChart.padT}
                        width={fpgChart.xStep}
                        height={fpgChart.chartH}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoverIndex(idx)}
                      />
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hoverIndex !== null && (
                  <div className="chart-tooltip">
                    <div className="ct-date">
                      📅 วันที่ {fmtShortDate(fpgChart.dates[hoverIndex])} ({fpgChart.dates[hoverIndex]})
                    </div>
                    <div className="ct-grid">
                      {fpgChart.lines.map(line => {
                        if (line.isHidden) return null;
                        const pt = line.pts[hoverIndex];
                        const val = pt ? pt.val : null;
                        return (
                          <div key={line.id} className="ct-item">
                            <span className="ct-badge" style={{ backgroundColor: line.color }} />
                            <span className="ct-name">{line.label}:</span>
                            <span className="ct-val">
                              {val != null
                                ? `${curMetric.digits === 0 ? Math.round(val) : val.toFixed(curMetric.digits)} ${curMetric.unit}`
                                : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Equipment Diagnostics & Insights (จุดที่ควรโฟกัส) */}
          <div className="insights-sec">
            <div className="insights-hd">
              <span className="ih-icon">🔍</span>
              <div>
                <h3 className="ih-title">จุดที่ควรโฟกัสและวิเคราะห์แนวโน้มอุปกรณ์ (Condition & Insights)</h3>
                <span className="ih-sub">สรุปจากการวิเคราะห์พารามิเตอร์ตรวจเช็ค Fire Pump และ Generator</span>
              </div>
            </div>

            <div className="insights-grid">
              {data.fpg.insights.map((ins, idx) => (
                <div key={idx} className={`insight-card ic--${ins.type}`}>
                  <div className="ic-top">
                    <span className="ic-icon">{ins.icon}</span>
                    <span className="ic-badge">{ins.badge}</span>
                  </div>
                  <h4 className="ic-title">{ins.title}</h4>
                  <p className="ic-text">{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: Meter กฟน. */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'meter' && data?.meter && (
        <div className="tab-pane">
          {meterChart && (
            <div className="chart-shell">
              <div className="chart-meta-row">
                <span className="cm-title">
                  ⚡ ปริมาณการใช้พลังงานไฟฟ้าประจำวัน ประจำเดือน <strong>{fmtYearMonth(data.meter.month)}</strong> ({meterChart.daily.length} วัน)
                </span>
                <span className="cm-unit">หน่วย: kWh (กิโลวัตต์-ชั่วโมง)</span>
              </div>

              <div className="meter-legend-row">
                <span className="ml-item">
                  <span className="ml-dot" style={{ backgroundColor: '#38bdf8' }} /> รวมรายวัน (M10)
                </span>
                <span className="ml-item">
                  <span className="ml-dot" style={{ backgroundColor: '#f43f5e' }} /> On-Peak (กลางวัน)
                </span>
                <span className="ml-item">
                  <span className="ml-dot" style={{ backgroundColor: '#10b981' }} /> Off-Peak (กลางคืน/วันหยุด)
                </span>
              </div>

              <div className="svg-wrap">
                <svg
                  viewBox={`0 0 ${meterChart.W} ${meterChart.H}`}
                  className="trend-svg"
                  onMouseLeave={() => setHoverIndex(null)}>
                  {/* Grid */}
                  {meterChart.yTicks.map(t => (
                    <g key={t.val}>
                      <line
                        x1={meterChart.padL}
                        y1={t.y}
                        x2={meterChart.W - meterChart.padR}
                        y2={t.y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={meterChart.padL - 10}
                        y={t.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="rgba(255,255,255,0.5)">
                        {t.val.toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {/* Off-Peak line */}
                  <path
                    d={meterChart.offPeakPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeOpacity="0.85"
                  />

                  {/* On-Peak line */}
                  <path
                    d={meterChart.onPeakPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeOpacity="0.85"
                  />

                  {/* Total line + glow */}
                  <path
                    d={meterChart.totalPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="5"
                    strokeOpacity="0.2"
                  />
                  <path
                    d={meterChart.totalPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots */}
                  {meterChart.totalPts.map((p, idx) => {
                    const isHovered = hoverIndex === idx;
                    const isHol = !!p.holiday;
                    return (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 5.5 : isHol ? 4 : 3}
                        fill={isHol ? '#fbbf24' : '#38bdf8'}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Vertical hover line */}
                  {hoverIndex !== null && (
                    <line
                      x1={meterChart.padL + hoverIndex * meterChart.xStep}
                      y1={meterChart.padT}
                      x2={meterChart.padL + hoverIndex * meterChart.xStep}
                      y2={meterChart.H - meterChart.padB}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* X Axis */}
                  {meterChart.daily.map((d, idx) => {
                    const show = idx === 0 || idx === meterChart.daily.length - 1 || idx % 2 === 0;
                    if (!show) return null;
                    const x = meterChart.padL + idx * meterChart.xStep;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={meterChart.H - 14}
                        textAnchor="middle"
                        fontSize="10"
                        fill="rgba(255,255,255,0.6)">
                        {d.day}
                      </text>
                    );
                  })}

                  {/* Hover rects */}
                  {meterChart.daily.map((_, idx) => {
                    const x = meterChart.padL + idx * meterChart.xStep - (meterChart.xStep / 2);
                    return (
                      <rect
                        key={idx}
                        x={Math.max(0, x)}
                        y={meterChart.padT}
                        width={meterChart.xStep}
                        height={meterChart.chartH}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoverIndex(idx)}
                      />
                    );
                  })}
                </svg>

                {hoverIndex !== null && (
                  <div className="chart-tooltip">
                    <div className="ct-date">
                      📅 วันที่ {meterChart.daily[hoverIndex].day} {fmtYearMonth(data.meter.month)}
                      {meterChart.daily[hoverIndex].holiday && ' (วันหยุด/ส-อา)'}
                    </div>
                    <div className="ct-grid">
                      <div className="ct-item">
                        <span className="ct-badge" style={{ backgroundColor: '#38bdf8' }} />
                        <span className="ct-name">รวมการใช้ไฟฟ้า:</span>
                        <span className="ct-val">{meterChart.daily[hoverIndex].m1?.toLocaleString()} kWh</span>
                      </div>
                      <div className="ct-item">
                        <span className="ct-badge" style={{ backgroundColor: '#f43f5e' }} />
                        <span className="ct-name">On-Peak (กลางวัน):</span>
                        <span className="ct-val">{meterChart.daily[hoverIndex].onPeak?.toLocaleString()} kWh</span>
                      </div>
                      <div className="ct-item">
                        <span className="ct-badge" style={{ backgroundColor: '#10b981' }} />
                        <span className="ct-name">Off-Peak (กลางคืน):</span>
                        <span className="ct-val">{meterChart.daily[hoverIndex].offPeak?.toLocaleString()} kWh</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meter Insights */}
          <div className="insights-sec">
            <div className="insights-hd">
              <span className="ih-icon">⚡</span>
              <div>
                <h3 className="ih-title">วิเคราะห์การใช้พลังงานไฟฟ้า MEA (Meter Analysis)</h3>
                <span className="ih-sub">ข้อมูลการตรวจวัดจากหม้อแปลงหลัก M10, M20, M60</span>
              </div>
            </div>

            <div className="insights-grid">
              {data.meter.insights.map((ins, idx) => (
                <div key={idx} className={`insight-card ic--${ins.type}`}>
                  <div className="ic-top">
                    <span className="ic-icon">{ins.icon}</span>
                    <span className="ic-badge">{ins.badge}</span>
                  </div>
                  <h4 className="ic-title">{ins.title}</h4>
                  <p className="ic-text">{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: Emergency Light */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'emer' && data?.emergency && (
        <div className="tab-pane">
          <div className="pm-overview-grid">
            {data.emergency.trends.map(t => (
              <div key={t.month} className="pm-cycle-card">
                <div className="pcc-hd">
                  <span className="pcc-month">รอบ {fmtYearMonth(t.month)}</span>
                  <span className={`pcc-badge ${t.passRate === 100 ? 'pcc-badge--ok' : 'pcc-badge--warn'}`}>
                    {t.passRate === 100 ? '✅ พร้อมใช้ 100%' : `⚠️ พบแก้ไข ${t.fail} จุด`}
                  </span>
                </div>

                <div className="pcc-nums">
                  <div className="pcc-num-box">
                    <span className="pcc-num">{t.total.toLocaleString()}</span>
                    <span className="pcc-lbl">โคมไฟตรวจเช็ค (จุด)</span>
                  </div>
                  <div className="pcc-num-box">
                    <span className="pcc-num text-emerald">{t.pass.toLocaleString()}</span>
                    <span className="pcc-lbl">ผ่านเกณฑ์</span>
                  </div>
                  <div className="pcc-num-box">
                    <span className="pcc-num text-rose">{t.fail}</span>
                    <span className="pcc-lbl">ข้อบกพร่อง/แบต</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="pcc-progress-bg">
                  <div
                    className="pcc-progress-fill"
                    style={{ width: `${t.passRate}%`, backgroundColor: t.passRate === 100 ? '#10b981' : '#f59e0b' }}
                  />
                </div>
                <div className="pcc-foot">
                  <span>อัตราความพร้อมใช้งาน: <strong>{t.passRate}%</strong></span>
                  <span>บันทึก {t.files} แผ่นตรวจ</span>
                </div>
              </div>
            ))}
          </div>

          <div className="insights-sec">
            <div className="insights-hd">
              <span className="ih-icon">💡</span>
              <div>
                <h3 className="ih-title">วิเคราะห์ความพร้อมระบบไฟฉุกเฉิน (Emergency Light Readiness)</h3>
                <span className="ih-sub">การตรวจเช็คตามรอบ PM ไตรมาสและการเปลี่ยนแบตเตอรี่เสื่อมสภาพ</span>
              </div>
            </div>

            <div className="insights-grid">
              {data.emergency.insights.map((ins, idx) => (
                <div key={idx} className={`insight-card ic--${ins.type}`}>
                  <div className="ic-top">
                    <span className="ic-icon">{ins.icon}</span>
                    <span className="ic-badge">{ins.badge}</span>
                  </div>
                  <h4 className="ic-title">{ins.title}</h4>
                  <p className="ic-text">{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: Smoke Detector */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'smoke' && data?.smoke && (
        <div className="tab-pane">
          <div className="pm-overview-grid">
            {data.smoke.trends.map(t => (
              <div key={t.month} className="pm-cycle-card">
                <div className="pcc-hd">
                  <span className="pcc-month">รอบ {fmtYearMonth(t.month)}</span>
                  <span className="pcc-badge pcc-badge--ok">
                    ✅ พร้อมใช้ {t.passRate}%
                  </span>
                </div>

                <div className="pcc-nums">
                  <div className="pcc-num-box">
                    <span className="pcc-num">{t.total.toLocaleString()}</span>
                    <span className="pcc-lbl">หัวตรวจจับควัน (จุด)</span>
                  </div>
                  <div className="pcc-num-box">
                    <span className="pcc-num text-emerald">{t.normal.toLocaleString()}</span>
                    <span className="pcc-lbl">สัญญาณปกติ</span>
                  </div>
                  <div className="pcc-num-box">
                    <span className="pcc-num text-sky">{t.cleaned.toLocaleString()}</span>
                    <span className="pcc-lbl">ทำความสะอาดแล้ว</span>
                  </div>
                </div>

                <div className="pcc-progress-bg">
                  <div
                    className="pcc-progress-fill"
                    style={{ width: `${t.cleanRate}%`, backgroundColor: '#38bdf8' }}
                  />
                </div>
                <div className="pcc-foot">
                  <span>ความสะอาดและการทำงาน: <strong>{t.cleanRate}%</strong></span>
                  <span>บันทึก {t.files} แผ่นตรวจ</span>
                </div>
              </div>
            ))}
          </div>

          <div className="insights-sec">
            <div className="insights-hd">
              <span className="ih-icon">🚨</span>
              <div>
                <h3 className="ih-title">วิเคราะห์ความพร้อมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm & Smoke)</h3>
                <span className="ih-sub">การตรวจเช็คระบบ Detectors ทุกอาคารตามข้อกำหนดความปลอดภัย</span>
              </div>
            </div>

            <div className="insights-grid">
              {data.smoke.insights.map((ins, idx) => (
                <div key={idx} className={`insight-card ic--${ins.type}`}>
                  <div className="ic-top">
                    <span className="ic-icon">{ins.icon}</span>
                    <span className="ic-badge">{ins.badge}</span>
                  </div>
                  <h4 className="ic-title">{ins.title}</h4>
                  <p className="ic-text">{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .trends-box {
          margin-top: 24px;
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 16px;
          background: var(--bg-surface, #1e293b);
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }

        .trends-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
        }

        .trends-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .trends-icon {
          font-size: 26px;
        }

        .trends-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--ink, #f8fafc);
          margin: 0;
        }

        .trends-sub {
          font-size: 13px;
          color: var(--ink-muted, #94a3b8);
          margin: 3px 0 0;
        }

        .trends-btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.14));
          background: rgba(255,255,255,0.04);
          color: var(--ink, #e2e8f0);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .trends-btn-refresh:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.3);
        }

        /* Tabs */
        .sys-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 20px 0;
        }

        .sys-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          background: rgba(255,255,255,0.02);
          color: var(--ink-muted, #94a3b8);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .sys-tab:hover {
          background: rgba(255,255,255,0.06);
          color: var(--ink, #f8fafc);
        }
        .sys-tab--active {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          font-weight: 600;
        }

        .st-ico { font-size: 20px; }
        .st-label { font-size: 13.5px; flex: 1; }
        .st-badge {
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: inherit;
        }

        /* Metric bar */
        .metric-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(0,0,0,0.18);
        }

        .metric-bar-lbl {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-muted, #94a3b8);
        }

        .metric-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .metric-pill {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: rgba(255,255,255,0.04);
          color: var(--ink-muted, #94a3b8);
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .metric-pill:hover {
          background: rgba(255,255,255,0.09);
          color: var(--ink, #f8fafc);
        }
        .metric-pill--active {
          background: #0284c7;
          border-color: #38bdf8;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 0 10px rgba(56,189,248,0.3);
        }

        /* Legend & Toggles */
        .machine-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .legend-hint {
          font-size: 11.5px;
          color: var(--ink-muted, #64748b);
        }

        .legend-items {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .legend-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
          background: rgba(255,255,255,0.03);
          color: var(--ink, #e2e8f0);
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .legend-btn:hover {
          background: rgba(255,255,255,0.08);
        }
        .legend-btn--off {
          opacity: 0.45;
          text-decoration: line-through;
        }

        .lb-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .lb-title { font-weight: 600; }
        .lb-loc { font-size: 11.5px; color: var(--ink-muted, #94a3b8); }
        .lb-val {
          font-size: 12px;
          font-weight: 700;
          color: var(--m-color);
          margin-left: 4px;
        }

        /* Chart Shell */
        .chart-shell {
          border-radius: 12px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
          padding: 16px 20px;
          margin-bottom: 24px;
          position: relative;
        }

        .chart-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .cm-title {
          font-size: 13.5px;
          color: var(--ink, #f1f5f9);
        }

        .cm-unit {
          font-size: 12px;
          color: var(--ink-muted, #94a3b8);
        }

        .meter-legend-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--ink-muted, #cbd5e1);
        }
        .ml-item { display: inline-flex; align-items: center; gap: 6px; }
        .ml-dot { width: 9px; height: 9px; border-radius: 50%; }

        .svg-wrap {
          position: relative;
          width: 100%;
        }

        .trend-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }

        /* Tooltip */
        .chart-tooltip {
          position: absolute;
          top: 10px;
          right: 15px;
          background: rgba(15, 23, 42, 0.94);
          border: 1px solid rgba(56, 189, 248, 0.4);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          border-radius: 10px;
          padding: 10px 14px;
          pointer-events: none;
          z-index: 10;
          min-width: 200px;
        }

        .ct-date {
          font-size: 12.5px;
          font-weight: 700;
          color: #f8fafc;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 6px;
          margin-bottom: 6px;
        }

        .ct-grid {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .ct-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
        }

        .ct-badge {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ct-name {
          color: #94a3b8;
          flex: 1;
        }

        .ct-val {
          font-weight: 700;
          color: #f1f5f9;
        }

        /* Diagnostics & Insights */
        .insights-sec {
          margin-top: 20px;
        }

        .insights-hd {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .ih-icon { font-size: 20px; }

        .ih-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink, #f8fafc);
          margin: 0;
        }

        .ih-sub {
          font-size: 12px;
          color: var(--ink-muted, #94a3b8);
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }

        .insight-card {
          border-radius: 12px;
          padding: 16px;
          border: 1px solid;
          background: rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ic--warn {
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.08);
        }
        .ic--ok {
          border-color: rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.06);
        }
        .ic--info {
          border-color: rgba(56, 189, 248, 0.35);
          background: rgba(56, 189, 248, 0.06);
        }

        .ic-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ic-icon { font-size: 22px; }

        .ic-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(0,0,0,0.25);
          color: inherit;
        }

        .ic-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink, #f8fafc);
          margin: 0;
          line-height: 1.4;
        }

        .ic-text {
          font-size: 12.5px;
          color: var(--ink-muted, #cbd5e1);
          margin: 0;
          line-height: 1.5;
        }

        /* Cycle cards for PM tabs */
        .pm-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .pm-cycle-card {
          border-radius: 12px;
          padding: 16px;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pcc-hd {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pcc-month {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink, #f1f5f9);
        }

        .pcc-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .pcc-badge--ok { background: rgba(16,185,129,0.2); color: #10b981; }
        .pcc-badge--warn { background: rgba(245,158,11,0.2); color: #f59e0b; }

        .pcc-nums {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          text-align: center;
        }

        .pcc-num-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pcc-num {
          font-size: 18px;
          font-weight: 800;
          color: var(--ink, #f8fafc);
        }
        .text-emerald { color: #10b981; }
        .text-rose { color: #f43f5e; }
        .text-sky { color: #38bdf8; }

        .pcc-lbl {
          font-size: 10.5px;
          color: var(--ink-muted, #94a3b8);
        }

        .pcc-progress-bg {
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .pcc-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .pcc-foot {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: var(--ink-muted, #94a3b8);
        }

        .trends-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 12px;
          color: var(--ink-muted, #94a3b8);
          font-size: 13.5px;
        }

        .trends-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .trends-err {
          padding: 16px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .btn-retry {
          padding: 4px 10px;
          border-radius: 6px;
          background: #ef4444;
          color: #ffffff;
          border: none;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
