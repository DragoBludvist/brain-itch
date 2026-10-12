import { MAX_LOOPS } from '../lib/limits.js';

export default function LoopControls({
  loops,
  onLoopsChange,
  forever,
  onForeverChange,
  status,
  count,
  progress,
  problem,
  onStart,
  onStop,
}) {
  const looping = status === 'looping';
  const step = (d) => onLoopsChange(Math.min(MAX_LOOPS, Math.max(1, (Number(loops) || 1) + d)));

  return (
    <div className="loop-controls">
      <div className="loops-row">
        <span className="field-label" id="loops-label">
          Number of loops
        </span>
        <div className="stepper">
          <button type="button" className="btn ghost" onClick={() => step(-1)} disabled={forever || loops <= 1} aria-label="One fewer loop">
            −
          </button>
          <input
            type="number"
            min="1"
            max={MAX_LOOPS}
            aria-labelledby="loops-label"
            value={forever ? '' : loops}
            placeholder={forever ? '∞' : ''}
            disabled={forever}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onLoopsChange(Number.isNaN(n) ? '' : Math.min(MAX_LOOPS, Math.max(1, n)));
            }}
          />
          <button type="button" className="btn ghost" onClick={() => step(1)} disabled={forever || loops >= MAX_LOOPS} aria-label="One more loop">
            +
          </button>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={forever} onChange={(e) => onForeverChange(e.target.checked)} />
          Loop forever
        </label>
      </div>

      <div className="status" aria-live="polite">
        {looping && (
          <>
            <div className="status-text">
              {forever ? `Loop ${count + 1} · repeating forever` : `Loop ${Math.min(count + 1, loops)} of ${loops}`}
            </div>
            <div className="progress">
              <div style={{ width: `${progress * 100}%` }} />
            </div>
            {!forever && loops <= 40 && (
              <div className="dots" aria-hidden="true">
                {Array.from({ length: loops }, (_, i) => (
                  <span key={i} className={i < count ? 'done' : i === count ? 'current' : ''} />
                ))}
              </div>
            )}
          </>
        )}
        {status === 'done' && (
          <div className="status-text done">
            Done! Played it {count} {count === 1 ? 'time' : 'times'}.
          </div>
        )}
      </div>

      {looping ? (
        <button type="button" className="btn big stop" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="button" className="btn big primary" onClick={onStart} disabled={!!problem}>
          {status === 'done' ? 'Loop again' : 'Start looping'}
        </button>
      )}
      {problem && !looping && <p className="hint center">{problem}</p>}
    </div>
  );
}
