import { useEffect, useState } from 'react';
import { formatTime, parseTime } from '../lib/time.js';
import { MAX_TIME_INPUT_LENGTH } from '../lib/limits.js';

// A text box for times like "1:23.5". Typing is free-form; the value is applied on Enter or blur.
export default function TimeField({ id, label, value, onChange, onUseCurrent, disabled }) {
  const shown = value == null ? '' : formatTime(value, true);
  const [draft, setDraft] = useState(shown);
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(shown);
  }, [shown, editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() === '') return setDraft(shown);
    const t = parseTime(draft);
    if (t == null) {
      setInvalid(true);
      return setDraft(shown);
    }
    setInvalid(false);
    onChange(t);
  };

  return (
    <div className="time-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="row">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder="m:ss"
          value={draft}
          maxLength={MAX_TIME_INPUT_LENGTH}
          disabled={disabled}
          aria-invalid={invalid}
          onFocus={() => setEditing(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <button type="button" className="btn ghost" onClick={onUseCurrent} disabled={disabled} title="Set to where the song is right now">
          Use now
        </button>
      </div>
      {invalid && <p className="error small">Use a time like 1:23 or 83.5</p>}
    </div>
  );
}
