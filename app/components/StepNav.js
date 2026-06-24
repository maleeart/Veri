'use client';

export default function StepNav({ stepIndex, stepCount, onPrev, onNext, onSubmit, isLastStep, submitLabel, disabled }) {
  return (
    <nav className="stepnav">
      <button
        type="button"
        className="stepnav__btn stepnav__btn--ghost"
        onClick={onPrev}
        disabled={stepIndex === 0 || disabled}
      >
        ย้อนกลับ
      </button>

      <span className="stepnav__indicator">
        {stepIndex + 1} / {stepCount}
      </span>

      {isLastStep ? (
        <button type="button" className="stepnav__btn stepnav__btn--submit" onClick={onSubmit} disabled={disabled}>
          {submitLabel || '✓ บันทึกและดาวน์โหลด'}
        </button>
      ) : (
        <button type="button" className="stepnav__btn stepnav__btn--primary" onClick={onNext} disabled={disabled}>
          ถัดไป
        </button>
      )}

      <style jsx>{`
        .stepnav {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
          background: var(--bg-surface);
          border-top: 1px solid var(--border-hairline);
        }
        .stepnav__indicator {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--ink-muted);
          flex-shrink: 0;
          min-width: 36px;
          text-align: center;
        }
        .stepnav__btn {
          min-height: 46px;
          padding: 0 16px;
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          -webkit-tap-highlight-color: transparent;
        }
        .stepnav__btn:disabled { opacity: 0.35; }
        .stepnav__btn--ghost {
          background: transparent;
          color: var(--ink-secondary);
          border: 1px solid var(--border-hairline);
          min-width: 80px;
        }
        .stepnav__btn--primary {
          background: var(--accent);
          color: var(--accent-ink);
          flex: 1;
        }
        .stepnav__btn--submit {
          background: var(--status-pass);
          color: #ffffff;
          flex: 1;
        }
      `}</style>
    </nav>
  );
}
