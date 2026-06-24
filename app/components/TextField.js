'use client';

export default function TextField({ label, value, onChange, placeholder, multiline }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <Tag
        className="field__input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
      />

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
        .field__input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-hairline);
          border-radius: var(--radius-sm);
          color: var(--ink-primary);
          padding: 12px;
          font-size: 15px;
          resize: vertical;
        }
        .field__input:focus {
          outline: none;
          border-color: var(--accent-strong);
        }
      `}</style>
    </label>
  );
}
