'use client';

import { useState } from 'react';
import ToggleGroup from './ToggleGroup';
import { RESULT_LABELS_2WAY, RESULT_LABELS_3WAY } from '../lib/formSchema';
const OPTIONS_2WAY = [
  { value: 'pass', label: 'ผ่าน', color: 'pass' },
  { value: 'fail', label: 'ไม่ผ่าน', color: 'fail' },
];

const OPTIONS_3WAY = [
  { value: 'normal', label: 'ปกติ', color: 'pass' },
  { value: 'abnormal', label: 'ผิดปกติ', color: 'fail' },
  { value: 'none', label: 'ไม่มี', color: 'neutral' },
];

export default function ChecklistSection({ title, items, values, onChange, mode }) {
  const options = mode === '3way' ? OPTIONS_3WAY : OPTIONS_2WAY;
  const labelMap = mode === '3way' ? RESULT_LABELS_3WAY : RESULT_LABELS_2WAY;

  const answeredCount = values.filter((v) => v.result).length;

  return (
    <div className="checklist">
      <div className="checklist__header">
        <span className="checklist__count">
          {answeredCount}/{items.length} รายการ
        </span>
      </div>

      <ul className="checklist__list">
        {items.map((item, idx) => (
          <ChecklistRow
            key={idx}
            item={item}
            value={values[idx]}
            options={options}
            onResultChange={(result) => {
              const next = values.slice();
              next[idx] = { ...next[idx], result };
              onChange(next);
            }}
            onRemarkChange={(remark) => {
              const next = values.slice();
              next[idx] = { ...next[idx], remark };
              onChange(next);
            }}
          />
        ))}
      </ul>

      <style jsx>{`
        .checklist {
          margin-bottom: 8px;
        }
        .checklist__header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .checklist__header h3 {
          font-family: var(--font-display);
          font-size: 17px;
          margin: 0;
          color: var(--ink-primary);
        }
        .checklist__count {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--ink-muted);
        }
        .checklist__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}

function ChecklistRow({ item, value, options, onResultChange, onRemarkChange }) {
  const [showRemark, setShowRemark] = useState(Boolean(value?.remark));
  const isFailLike = value?.result === 'fail' || value?.result === 'abnormal';

  return (
    <li className={`row${isFailLike ? ' row--flagged' : ''}`}>
      <p className="row__label">{item.label_th || item.label}</p>
      <ToggleGroup
        name={item.label_th}
        options={options}
        value={value?.result}
        onChange={onResultChange}
      />

      {!showRemark && (
        <button type="button" className="row__remark-toggle" onClick={() => setShowRemark(true)}>
          + เพิ่มหมายเหตุ
        </button>
      )}
      {showRemark && (
        <textarea
          className="row__remark-input"
          placeholder="หมายเหตุ (ถ้ามี)"
          value={value?.remark || ''}
          onChange={(e) => onRemarkChange(e.target.value)}
          rows={2}
        />
      )}

      <style jsx>{`
        .row {
          background: var(--bg-surface);
          border: 1px solid var(--border-hairline);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .row--flagged {
          border-color: var(--status-fail);
        }
        .row__label {
          margin: 0 0 10px;
          font-size: 15px;
          line-height: 1.4;
          color: var(--ink-primary);
        }
        .row__remark-toggle {
          margin-top: 8px;
          background: none;
          border: none;
          color: var(--ink-muted);
          font-size: 13px;
          padding: 4px 0;
          cursor: pointer;
        }
        .row__remark-input {
          margin-top: 8px;
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-hairline);
          border-radius: var(--radius-sm);
          color: var(--ink-primary);
          padding: 8px 10px;
          font-size: 14px;
          resize: vertical;
        }
      `}</style>
    </li>
  );
}
