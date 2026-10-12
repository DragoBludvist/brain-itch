import { useRef } from 'react';
import { formatTime, roundTenth } from '../lib/time.js';

export default function Timeline({ duration, start, end, current, minGap, onStartChange, onEndChange, onSeek }) {
  const trackRef = useRef(null);
  const dragging = useRef(null);

  if (!duration) {
    return (
      <div className="timeline empty">
        The timeline appears once the song length is known. If it doesn't, press play on the player.
      </div>
    );
  }

  const endValue = end ?? duration;
  const pct = (t) => `${Math.min(100, Math.max(0, (t / duration) * 100))}%`;
  const timeAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    return roundTenth(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * duration);
  };
  const setFor = (which, t) =>
    which === 'start'
      ? onStartChange(roundTenth(Math.max(0, Math.min(t, endValue - minGap))))
      : onEndChange(roundTenth(Math.min(duration, Math.max(t, start + minGap))));

  const handleProps = (which) => {
    const value = which === 'start' ? start : endValue;
    return {
      role: 'slider',
      tabIndex: 0,
      className: `handle ${which}`,
      style: { left: pct(value) },
      'aria-label': which === 'start' ? 'Start point' : 'End point',
      'aria-valuemin': 0,
      'aria-valuemax': Math.round(duration),
      'aria-valuenow': Math.round(value),
      'aria-valuetext': formatTime(value, true),
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = which;
      },
      onPointerMove: (e) => dragging.current === which && setFor(which, timeAt(e.clientX)),
      onPointerUp: () => (dragging.current = null),
      onPointerCancel: () => (dragging.current = null),
      onClick: (e) => e.stopPropagation(),
      onKeyDown: (e) => {
        const step = e.shiftKey ? 5 : 0.5;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          setFor(which, value - step);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          setFor(which, value + step);
        }
      },
    };
  };

  return (
    <div className="timeline">
      <div className="track" ref={trackRef} onClick={(e) => onSeek(timeAt(e.clientX))} title="Click to jump here">
        <div className="segment" style={{ left: pct(start), width: `calc(${pct(endValue)} - ${pct(start)})` }} />
        <div className="playhead" style={{ left: pct(current) }} />
        <div {...handleProps('start')}>
          <span className="handle-label">{formatTime(start, true)}</span>
        </div>
        <div {...handleProps('end')}>
          <span className="handle-label">{formatTime(endValue, true)}</span>
        </div>
      </div>
      <div className="scale">
        <span>0:00</span>
        <span>now {formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
