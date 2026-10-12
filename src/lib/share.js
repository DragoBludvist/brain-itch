// Loop settings live in the URL hash (#src=...&s=...&e=...&n=...) so a loop can be shared
// as a link. The hash never reaches the server, which also keeps it working on GitHub Pages.

export function readShareState() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const num = (key) => {
    const v = params.get(key);
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const n = params.get('n');
  const loops = num('n');
  return {
    src: params.get('src') || undefined,
    start: num('s'),
    end: num('e'),
    loops: loops === undefined ? undefined : Math.min(999, Math.max(1, Math.round(loops))),
    forever: n === 'inf',
  };
}

export function buildShareUrl({ src, start, end, loops, forever }) {
  const params = new URLSearchParams();
  params.set('src', src);
  params.set('s', String(Math.round(start * 10) / 10));
  if (end != null) params.set('e', String(Math.round(end * 10) / 10));
  params.set('n', forever ? 'inf' : String(loops));
  return `${window.location.href.split('#')[0]}#${params}`;
}
