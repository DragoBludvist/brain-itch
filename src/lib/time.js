import { MAX_TIME_INPUT_LENGTH, MAX_TIME_SECONDS } from './limits.js';

export const isValidTime = (sec) =>
  typeof sec === 'number' && Number.isFinite(sec) && sec >= 0 && sec <= MAX_TIME_SECONDS;

// Accepts "83", "83.5", "1:23", "1:23.5", "1:02:03". Returns seconds, or null if unreadable
// or outside 0..MAX_TIME_SECONDS.
export function parseTime(input) {
  const text = String(input ?? '').trim();
  if (text.length > MAX_TIME_INPUT_LENGTH) return null;
  const parts = text.split(':');
  if (parts.length > 3) return null;
  const last = parts.pop();
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(last)) return null;
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const seconds = parts.reduce((acc, p) => acc * 60 + Number(p), 0) * 60 + Number(last);
  return isValidTime(seconds) ? seconds : null;
}

// 83.4 -> "1:23" (or "1:23.4" when precise).
export function formatTime(sec, precise = false) {
  if (sec == null || !Number.isFinite(sec)) return '--:--';
  const t = Math.max(0, precise ? Math.round(sec * 10) / 10 : Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const whole = Math.floor(s);
  const tenth = Math.round((s - whole) * 10);
  const ss = String(whole).padStart(2, '0') + (precise && tenth ? `.${tenth}` : '');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export const roundTenth = (sec) => Math.round(sec * 10) / 10;
