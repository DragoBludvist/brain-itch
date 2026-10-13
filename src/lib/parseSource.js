import { MAX_URL_LENGTH } from './limits.js';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Turns a pasted link into { kind: 'youtube', id } or { error }.
//
// Security: the pasted text itself is never used. Only an ID matching the strict pattern
// above leaves this function, and only that ID reaches the player. Hosts are compared
// exactly (no "contains"/"ends with" checks), so look-alikes such as youtube.com.evil.example
// or evil.example/?youtube.com are rejected. Error messages are fixed strings that never
// echo the input back.
export function parseSource(raw) {
  const input = String(raw ?? '').trim();
  if (!input) return { error: 'Paste a YouTube link.' };
  if (input.length > MAX_URL_LENGTH) return { error: 'That link is too long.' };
  // Real song links never contain control characters, spaces, quotes, angle brackets or backslashes.
  if (/[\u0000- \u007f-\u009f\s<>"'`\\]/.test(input)) return { error: "That doesn't look like a link." };

  if (/^spotify:/i.test(input)) return { error: 'Spotify links are not supported. Paste a YouTube link instead.' };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: "That doesn't look like a link." };
  if (url.username || url.password) return { error: "That doesn't look like a link." };
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');

  if (host === 'open.spotify.com' || host === 'spotify.link') {
    return { error: 'Spotify links are not supported. Paste a YouTube link instead.' };
  }

  const isYouTube = host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com';
  if (isYouTube) {
    let id = null;
    if (host === 'youtu.be') {
      id = url.pathname.split('/')[1];
    } else {
      id = url.searchParams.get('v');
      if (!id) id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? null;
    }
    if (id && YOUTUBE_ID.test(id)) return { kind: 'youtube', id };
    return { error: "Couldn't find a video in that YouTube link." };
  }

  return { error: 'Only YouTube links work.' };
}
