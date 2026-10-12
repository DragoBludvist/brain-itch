import YouTubePlayer from './YouTubePlayer.jsx';
import SpotifyPlayer from './SpotifyPlayer.jsx';

export default function Player({ source, ref, ...handlers }) {
  if (source.kind === 'youtube') {
    return <YouTubePlayer key={source.id} ref={ref} videoId={source.id} {...handlers} />;
  }
  return <SpotifyPlayer key={source.id} ref={ref} trackId={source.id} {...handlers} />;
}
