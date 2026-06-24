'use client';

export default function NumericField({ label, value, onChange, unit, placeholder }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <div className="field__input-row">
        <input
          type="text"
          inputMode="decimal"
          className="field__input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0'}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>

      <style jsx>{`
        .field {
          display: block;
        }
        .field__label {
          display: block;
          font-size: 13px;
          color: var(--ink-secondary);
          margin-bottom: 6px;
        }
        .field__input-row {
          display: flex;
          align-items: stretch;
          background: var(--bg-input);
          border: 1px solid var(--border-hairline);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .field__input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          color: var(--ink-primary);
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 16px;
          font-weight: 600;
        }
        .field__input:focus {
          outline: none;
        }
        .field__unit {
          display: flex;
          align-items: center;
          padding: 0 12px;
          background: var(--bg-surface-raised);
          color: var(--ink-muted);
          font-size: 13px;
          white-space: nowrap;
        }
      `}</style>
    </label>
  );
}
