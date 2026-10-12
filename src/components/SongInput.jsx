import { MAX_URL_LENGTH } from '../lib/limits.js';

export default function SongInput({ value, onChange, onSubmit, error }) {
  return (
    <form
      className="song-input"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <label className="field-label" htmlFor="song-url">
        Song link
      </label>
      <div className="row">
        <input
          id="song-url"
          type="text"
          inputMode="url"
          placeholder="Paste a YouTube or Spotify link"
          value={value}
          maxLength={MAX_URL_LENGTH}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn primary">
          Load
        </button>
      </div>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <p className="hint">Like youtube.com/watch?v=… or open.spotify.com/track/…</p>
      )}
    </form>
  );
}
