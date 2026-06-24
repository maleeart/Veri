'use client';

export default function GaugeProgress({ percent, label }) {
  const clamped = Math.max(0, Math.min(100, percent));
  // เกจครึ่งวงกลม 180 องศา จากซ้าย (0%) ไปขวา (100%) — มุมเข็มอิงสไตล์เกจวัดแรงดัน/น้ำมันบนตู้ควบคุม
  const angle = -90 + (clamped / 100) * 180;
  const radius = 40;
  const cx = 50;
  const cy = 50;

  // ส่วนโค้งพื้นหลัง (track) และส่วนโค้งที่ fill ตาม percent
  const describeArc = (startAngle, endAngle) => {
    const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
    const start = {
      x: cx + radius * Math.cos(toRad(startAngle)),
      y: cy + radius * Math.sin(toRad(startAngle)),
    };
    const end = {
      x: cx + radius * Math.cos(toRad(endAngle)),
      y: cy + radius * Math.sin(toRad(endAngle)),
    };
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const needleRad = ((angle - 90) * Math.PI) / 180;
  const needleX = cx + (radius - 6) * Math.cos(needleRad);
  const needleY = cy + (radius - 6) * Math.sin(needleRad);

  return (
    <div className="gauge">
      <svg viewBox="0 0 100 62" className="gauge__svg">
        <path d={describeArc(-90, 90)} className="gauge__track" />
        <path d={describeArc(-90, angle)} className="gauge__fill" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} className="gauge__needle" />
        <circle cx={cx} cy={cy} r="3" className="gauge__hub" />
      </svg>
      <div className="gauge__readout">
        <span className="gauge__value">{Math.round(clamped)}%</span>
        {label && <span className="gauge__label">{label}</span>}
      </div>

      <style jsx>{`
        .gauge {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gauge__svg {
          width: 76px;
          height: auto;
          flex-shrink: 0;
        }
        .gauge__track {
          fill: none;
          stroke: var(--border-strong);
          stroke-width: 7;
          stroke-linecap: round;
        }
        .gauge__fill {
          fill: none;
          stroke: var(--accent-strong);
          stroke-width: 7;
          stroke-linecap: round;
          transition: d 0.3s ease;
        }
        .gauge__needle {
          stroke: var(--ink-primary);
          stroke-width: 2;
          stroke-linecap: round;
        }
        .gauge__hub {
          fill: var(--ink-primary);
        }
        .gauge__readout {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .gauge__value {
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-primary);
        }
        .gauge__label {
          font-size: 12px;
          color: var(--ink-muted);
        }
      `}</style>
    </div>
  );
}
