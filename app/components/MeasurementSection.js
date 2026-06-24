'use client';

import NumericField from './NumericField';

export default function MeasurementSection({ title, fields, values, onChange }) {
  return (
    <div className="measure-section">
      {title && <h3 className="measure-section__title">{title}</h3>}
      <div className="measure-section__grid">
        {fields.map((f) => (
          <NumericField
            key={f.row}
            label={f.label_th}
            unit={f.unit_default}
            value={values[f.key]}
            onChange={(v) => onChange({ ...values, [f.key]: v })}
          />
        ))}
      </div>

      <style jsx>{`
        .measure-section {
          margin-bottom: 8px;
        }
        .measure-section__title {
          font-family: var(--font-display);
          font-size: 15px;
          color: var(--ink-secondary);
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .measure-section__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
