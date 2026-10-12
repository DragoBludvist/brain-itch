import { useEffect, useRef, useState } from 'react';
import SongInput from './components/SongInput.jsx';
import Player from './components/Player.jsx';
import Timeline from './components/Timeline.jsx';
import TimeField from './components/TimeField.jsx';
import LoopControls from './components/LoopControls.jsx';
import { parseSource } from './lib/parseSource.js';
import { formatTime, roundTenth } from './lib/time.js';
import { buildShareUrl, readShareState } from './lib/share.js';
import { copyText } from './lib/copy.js';

const MIN_SECTION = 0.5; // seconds
const shared = readShareState();
const sharedSource = shared.src ? parseSource(shared.src) : null;

export default function App() {
  const [songUrl, setSongUrl] = useState(shared.src ?? '');
  const [loadedUrl, setLoadedUrl] = useState(sharedSource && !sharedSource.error ? shared.src : '');
  const [source, setSource] = useState(sharedSource && !sharedSource.error ? sharedSource : null);
  const [sourceError, setSourceError] = useState(sharedSource?.error ?? '');
  const [playerError, setPlayerError] = useState('');

  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [start, setStart] = useState(shared.start ?? 0);
  const [end, setEnd] = useState(shared.end ?? null);
  const [loops, setLoops] = useState(shared.loops ?? 5);
  const [forever, setForever] = useState(shared.forever);

  const [status, setStatus] = useState('idle'); // idle | looping | done
  const [count, setCount] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [copyState, setCopyState] = useState(null); // copied | shown | manual
  const shareInputRef = useRef(null);
  const copiedTimer = useRef(null);

  const playerRef = useRef(null);
  // The players report the position ~20x a second; the loop state lives in refs so each
  // report sees the latest settings without waiting for a re-render.
  const loop = useRef({ active: false, count: 0, returningSince: 0 });
  const settings = useRef({ start, end, loops, forever });
  useEffect(() => {
    settings.current = { start, end, loops, forever };
  });

  // A copied link goes stale once the loop changes, so hide it.
  useEffect(() => {
    setShareUrl('');
    setCopyState(null);
  }, [loadedUrl, start, end, loops, forever]);

  // Default the section to the whole song once its length is known.
  useEffect(() => {
    if (duration > 0 && end == null) setEnd(duration);
  }, [duration, end]);

  function stopLoop(pause = true) {
    loop.current.active = false;
    if (pause) playerRef.current?.pause();
    setStatus('idle');
  }

  function loadSong(url) {
    const parsed = parseSource(url);
    if (parsed.error) return setSourceError(parsed.error);
    stopLoop(false);
    setSourceError('');
    setPlayerError('');
    setSource(parsed);
    setLoadedUrl(url.trim());
    setDuration(0);
    setCurrent(0);
    setStart(0);
    setEnd(null);
    setCount(0);
  }

  function handleTick(time, playing, dur) {
    setCurrent(time);
    if (dur > 0) setDuration((d) => (Math.abs(d - dur) > 0.05 ? dur : d));

    const L = loop.current;
    if (!L.active) return;
    const { start, end, loops, forever } = settings.current;
    if (end == null) return;
    // When the section runs to the very end of the song, the player stops a hair short of `end`.
    const atEnd = time >= end || (!playing && time >= end - 0.35);
    if (!playing && !atEnd) return;

    // Right after jumping back to the start, ignore positions until the player is back inside
    // the section (or give up waiting after 2s and treat the jump as failed).
    if (L.returningSince) {
      const back = time >= start - 0.75 && time < end - 0.25;
      if (!back && performance.now() - L.returningSince < 2000) return;
      L.returningSince = 0;
    }

    if (atEnd) {
      L.count += 1;
      setCount(L.count);
      if (!forever && L.count >= loops) {
        L.active = false;
        playerRef.current?.pause();
        setStatus('done');
      } else {
        L.returningSince = performance.now();
        playerRef.current?.playFrom(start);
      }
    }
  }

  function startLoop() {
    loop.current = { active: true, count: 0, returningSince: performance.now() };
    setCount(0);
    setStatus('looping');
    playerRef.current?.playFrom(start);
  }

  async function copyShareLink() {
    const url = buildShareUrl({ src: loadedUrl, start, end, loops, forever });
    window.history.replaceState(null, '', url);
    setShareUrl(url);
    const ok = await copyText(url);
    setCopyState(ok ? 'copied' : 'manual');
    if (ok) {
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopyState((s) => (s === 'copied' ? 'shown' : s)), 2000);
    } else {
      // Couldn't copy automatically: select the link so a single Cmd/Ctrl+C (or tap → Copy) does it.
      requestAnimationFrame(() => shareInputRef.current?.select());
    }
  }

  let problem = '';
  if (!source) problem = 'Load a song first.';
  else if (end == null) problem = 'Set an end point, or press play once so the song length loads.';
  else if (end - start < MIN_SECTION) problem = 'The end point needs to be after the start point.';
  else if (duration > 0 && end > duration + 0.5) problem = `The end point is past the end of the song (${formatTime(duration)}).`;
  else if (!forever && !(loops >= 1)) problem = 'Pick at least 1 loop.';

  const sectionLength = end != null ? end - start : null;
  const progress = sectionLength > 0 ? Math.min(1, Math.max(0, (current - start) / sectionLength)) : 0;

  return (
    <div className="app">
      <header>
        <h1>
          <span aria-hidden="true">🔁</span> Brain Itch
        </h1>
        <p>Pick a song, mark the part you love, and hear it on repeat.</p>
      </header>

      <main>
        <section className="card">
          <h2>
            <span className="step">1</span> Song
          </h2>
          <SongInput value={songUrl} onChange={setSongUrl} onSubmit={loadSong} error={sourceError} />
          {source && (
            <div className="player-wrap">
              <Player source={source} ref={playerRef} onTick={handleTick} onReady={(d) => d && setDuration(d)} onError={setPlayerError} />
              {playerError && <p className="error">{playerError}</p>}
              {source.kind === 'spotify' && (
                <p className="hint">
                  Spotify plays the full song only if you're logged in to Spotify in this browser. Otherwise it's a 30-second preview.
                </p>
              )}
            </div>
          )}
        </section>

        <section className={`card ${source ? '' : 'disabled'}`}>
          <h2>
            <span className="step">2</span> Start point to end point
          </h2>
          {source && (
            <Timeline
              duration={duration}
              start={start}
              end={end}
              current={current}
              minGap={MIN_SECTION}
              onStartChange={setStart}
              onEndChange={setEnd}
              onSeek={(t) => playerRef.current?.seek(t)}
            />
          )}
          <div className="time-fields">
            <TimeField
              id="start"
              label="Start"
              value={start}
              onChange={(t) => setStart(Math.max(0, t))}
              onUseCurrent={() => setStart(roundTenth(current))}
              disabled={!source}
            />
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <TimeField
              id="end"
              label="End"
              value={end}
              onChange={setEnd}
              onUseCurrent={() => setEnd(roundTenth(current))}
              disabled={!source}
            />
          </div>
          <p className="hint">
            Drag the handles, type a time like 1:23.5, or press <b>Use now</b> while the song plays.
            {sectionLength > 0 && <> This part is {formatTime(sectionLength, true)} long.</>}
          </p>
        </section>

        <section className={`card ${source ? '' : 'disabled'}`}>
          <h2>
            <span className="step">3</span> Loops
          </h2>
          <LoopControls
            loops={loops}
            onLoopsChange={setLoops}
            forever={forever}
            onForeverChange={setForever}
            status={status}
            count={count}
            progress={progress}
            problem={problem}
            onStart={startLoop}
            onStop={() => stopLoop()}
          />
          {source && !problem && (
            <div className="share">
              <button type="button" className="btn ghost" onClick={copyShareLink}>
                {copyState === 'copied' ? 'Link copied!' : 'Copy a link to this loop'}
              </button>
              {shareUrl && (
                <div className="share-result">
                  <p className={copyState === 'manual' ? 'error small' : 'hint'} aria-live="polite">
                    {copyState === 'manual'
                      ? "Your browser blocked copying. The link below is selected. Press Cmd/Ctrl+C, or tap and hold it, then choose Copy."
                      : 'Copied! Paste it anywhere to share this loop.'}
                  </p>
                  <input
                    ref={shareInputRef}
                    type="text"
                    readOnly
                    value={shareUrl}
                    aria-label="Link to this loop"
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>Works with YouTube and Spotify links. Nothing is stored. Your loops live in the link.</footer>
    </div>
  );
}
