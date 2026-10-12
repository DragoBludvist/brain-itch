import { useEffect, useImperativeHandle, useRef } from 'react';

const ERRORS = {
  2: "That YouTube link doesn't look right.",
  5: "This video can't be played in the browser player.",
  100: 'Video not found. It may be private or removed.',
  101: "This video's owner doesn't allow it to be played on other websites. Try another upload of the song.",
  150: "This video's owner doesn't allow it to be played on other websites. Try another upload of the song.",
};

let apiPromise;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      apiPromise = undefined;
      reject(new Error('Could not load the YouTube player. Check your connection or ad blocker.'));
    };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export default function YouTubePlayer({ videoId, onReady, onTick, onError, ref }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const callbacks = useRef({ onReady, onTick, onError });
  useEffect(() => {
    callbacks.current = { onReady, onTick, onError };
  });

  useImperativeHandle(
    ref,
    () => ({
      playFrom(sec) {
        playerRef.current?.seekTo(sec, true);
        playerRef.current?.playVideo();
      },
      seek(sec) {
        playerRef.current?.seekTo(sec, true);
      },
      pause() {
        playerRef.current?.pauseVideo();
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let timer;
    const host = hostRef.current;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        // YouTube replaces the element it's given with an iframe, so hand it a child React doesn't own.
        const mount = document.createElement('div');
        host.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              callbacks.current.onReady?.(e.target.getDuration() || null);
              timer = setInterval(() => {
                const p = playerRef.current;
                if (!p?.getCurrentTime) return;
                callbacks.current.onTick?.(
                  p.getCurrentTime(),
                  p.getPlayerState() === YT.PlayerState.PLAYING,
                  p.getDuration(),
                );
              }, 50);
            },
            onError: (e) => callbacks.current.onError?.(ERRORS[e.data] ?? 'YouTube could not play this video.'),
          },
        });
      })
      .catch((err) => !cancelled && callbacks.current.onError?.(err.message));

    return () => {
      cancelled = true;
      clearInterval(timer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      host.innerHTML = '';
    };
  }, [videoId]);

  return <div className="player-frame youtube" ref={hostRef} />;
}
