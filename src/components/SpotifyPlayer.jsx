import { useEffect, useImperativeHandle, useRef } from 'react';

let apiPromise;
function loadSpotifyApi() {
  apiPromise ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const tag = document.createElement('script');
    tag.src = 'https://open.spotify.com/embed/iframe-api/v1';
    tag.async = true;
    tag.onerror = () => {
      apiPromise = undefined;
      reject(new Error('Could not load the Spotify player. Check your connection or ad blocker.'));
    };
    document.body.appendChild(tag);
  });
  return apiPromise;
}

// Spotify's embed only reports its position every so often, so between reports we
// estimate it from the clock. That keeps the loop's end point accurate.
export default function SpotifyPlayer({ trackId, onReady, onTick, onError, ref }) {
  const hostRef = useRef(null);
  const controllerRef = useRef(null);
  const playback = useRef({ pos: 0, at: null, paused: true, duration: 0, started: false, guard: null });
  const pendingSeek = useRef(null);
  const callbacks = useRef({ onReady, onTick, onError });
  useEffect(() => {
    callbacks.current = { onReady, onTick, onError };
  });

  // After a seek, Spotify can still send a stale position or two. Ignore those briefly.
  const markSeek = (sec) => {
    const now = performance.now();
    Object.assign(playback.current, { pos: sec * 1000, at: now, guard: { target: sec * 1000, until: now + 1500 } });
  };

  useImperativeHandle(
    ref,
    () => ({
      playFrom(sec) {
        const c = controllerRef.current;
        if (!c) return;
        if (playback.current.started) {
          c.seek(sec);
          markSeek(sec);
          c.resume();
        } else {
          // Seeking before the first play doesn't stick, so seek once playback begins.
          pendingSeek.current = sec;
          c.play();
        }
      },
      seek(sec) {
        controllerRef.current?.seek(sec);
        markSeek(sec);
      },
      pause() {
        controllerRef.current?.pause();
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    playback.current = { pos: 0, at: null, paused: true, duration: 0, started: false, guard: null };
    pendingSeek.current = null;

    const timer = setInterval(() => {
      const p = playback.current;
      if (p.at == null) return;
      const pos = p.paused ? p.pos : p.pos + (performance.now() - p.at);
      const clamped = p.duration ? Math.min(pos, p.duration) : pos;
      callbacks.current.onTick?.(clamped / 1000, !p.paused, p.duration / 1000);
    }, 50);

    loadSpotifyApi()
      .then((api) => {
        if (cancelled) return;
        const mount = document.createElement('div');
        host.appendChild(mount);
        api.createController(mount, { uri: `spotify:track:${trackId}`, width: '100%', height: 152 }, (controller) => {
          if (cancelled) {
            controller.destroy?.();
            return;
          }
          controllerRef.current = controller;
          controller.addListener('ready', () => callbacks.current.onReady?.(null));
          controller.addListener('playback_update', (e) => {
            const { position, duration, isPaused, isBuffering } = e.data;
            const now = performance.now();
            const p = playback.current;
            if (p.guard && now < p.guard.until && Math.abs(position - p.guard.target) > 1500) return;
            p.guard = null;
            Object.assign(p, { pos: position, at: now, paused: isPaused || isBuffering, duration: duration || 0 });
            if (!isPaused) p.started = true;
            if (pendingSeek.current != null && !isPaused) {
              const target = pendingSeek.current;
              pendingSeek.current = null;
              controller.seek(target);
              markSeek(target);
            }
          });
        });
      })
      .catch((err) => !cancelled && callbacks.current.onError?.(err.message));

    return () => {
      cancelled = true;
      clearInterval(timer);
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      host.innerHTML = '';
    };
  }, [trackId]);

  return <div className="player-frame spotify" ref={hostRef} />;
}
