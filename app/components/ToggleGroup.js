'use client';

export default function ToggleGroup({ options, value, onChange, name }) {
  return (
    <div className="toggle-group" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`toggle-btn toggle-btn--${opt.color}${active ? ' is-active' : ''}`}
            onClick={() => onChange(active ? null : opt.value)}
          >
            {opt.label}
          </button>
        );
      })}

      <style jsx>{`
        .toggle-group {
          display: grid;
          grid-auto-flow: column;
          gap: 8px;
        }
        .toggle-btn {
          min-height: 48px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 2px solid var(--border-strong);
          background: var(--bg-input);
          color: var(--ink-secondary);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.06s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .toggle-btn:active {
          transform: scale(0.97);
        }
        .toggle-btn--pass.is-active {
          background: var(--status-pass-bg);
          border-color: var(--status-pass);
          color: var(--status-pass);
        }
        .toggle-btn--fail.is-active {
          background: var(--status-fail-bg);
          border-color: var(--status-fail);
          color: var(--status-fail);
        }
        .toggle-btn--neutral.is-active {
          background: var(--status-neutral-bg);
          border-color: var(--status-neutral);
          color: var(--ink-primary);
        }
      `}</style>
    </div>
  );
}
