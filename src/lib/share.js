import { MAX_LOOPS, MAX_URL_LENGTH } from './limits.js';
import { isValidTime } from './time.js';

// Loop settings live in the URL hash (#src=...&s=...&e=...&n=...) so a loop can be shared
// as a link. The hash never reaches the server, which also keeps it working on GitHub Pages.
//
// Security: anyone can craft one of these links, so every value is untrusted. Only the four
// known keys are read, each must match a strict format, and anything else is dropped as if
// it weren't there. `src` is still only a candidate: it goes through parseSource() like a
// pasted link before anything is loaded.

const MAX_HASH_LENGTH = MAX_URL_LENGTH + 128;
const DECIMAL = /^\d{1,6}(\.\d{1,3})?$/; // plain decimal: no "1e9", "0x10", "Infinity", "-1"
const INTEGER = /^\d{1,3}$/;

export function readShareState() {
  const empty = { src: undefined, start: undefined, end: undefined, loops: undefined, forever: false };
  const hash = window.location.hash.slice(1);
  if (!hash || hash.length > MAX_HASH_LENGTH) return empty;

  let params;
  try {
    params = new URLSearchParams(hash);
  } catch {
    return empty;
  }

  const time = (key) => {
    const v = params.get(key);
    if (v == null || !DECIMAL.test(v)) return undefined;
    const n = Number(v);
    return isValidTime(n) ? n : undefined;
  };
  const n = params.get('n');
  const loops = n != null && INTEGER.test(n) ? Number(n) : undefined;
  const src = params.get('src');

  return {
    src: src && src.length <= MAX_URL_LENGTH ? src : undefined,
    start: time('s'),
    end: time('e'),
    loops: loops >= 1 && loops <= MAX_LOOPS ? loops : undefined,
    forever: n === 'inf',
  };
}

export function buildShareUrl({ src, start, end, loops, forever }) {
  // URLSearchParams percent-encodes every value, so nothing in `src` can break out of its slot.
  const params = new URLSearchParams();
  params.set('src', src);
  params.set('s', String(Math.round(start * 10) / 10));
  if (end != null) params.set('e', String(Math.round(end * 10) / 10));
  params.set('n', forever ? 'inf' : String(loops));
  return `${window.location.origin}${window.location.pathname}#${params}`;
}
