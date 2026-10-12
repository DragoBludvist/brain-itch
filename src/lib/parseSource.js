const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Turns a pasted link into { kind: 'youtube' | 'spotify', id } or { error }.
export function parseSource(raw) {
  const input = String(raw ?? '').trim();
  if (!input) return { error: 'Paste a YouTube or Spotify song link.' };

  const uri = input.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uri) return { kind: 'spotify', id: uri[1] };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');

  if (host === 'spotify.link') {
    return {
      error:
        "Short spotify.link links can't be opened here. Open it in Spotify, then use Share → Copy Song Link.",
    };
  }

  if (host === 'open.spotify.com') {
    const m = url.pathname.match(/^(?:\/intl-[a-z-]+)?\/(track|album|playlist|episode|artist|show)\/([A-Za-z0-9]+)/i);
    if (m && m[1].toLowerCase() === 'track' && SPOTIFY_ID.test(m[2])) return { kind: 'spotify', id: m[2] };
    if (m) return { error: 'That link is not a single song. Open the song itself, then use Share → Copy Song Link.' };
    return { error: "Couldn't find a song in that Spotify link." };
  }

  const isYouTube = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com';
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

  return { error: 'Only YouTube and Spotify links work right now.' };
}
