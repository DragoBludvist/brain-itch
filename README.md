# 🔁 Song Looper

Loop any part of a song, as many times as you want. Paste a **YouTube** or **Spotify** link, mark a start and end point, choose how many times it should repeat, and press play.

## How to use it

1. **Song**: paste a YouTube link (`youtube.com/watch?v=…`, `youtu.be/…`, Shorts, YouTube Music) or a Spotify song link (`open.spotify.com/track/…`), then press **Load**.
2. **Start point → end point**: drag the green handles on the timeline, type times like `1:23` or `1:23.5`, or press **Use now** while the song plays to grab the current spot. The arrow keys nudge a focused handle by 0.5s (hold Shift for 5s).
3. **Loops**: pick how many times the part should play, or tick **Loop forever**, then press **Start looping**.

**Copy a link to this loop** makes a link that opens straight to the same song, section, and loop count. Everything lives in the link, and nothing is stored anywhere.

## Good to know

- **Spotify** plays full songs only when you're logged in to Spotify in the same browser. Logged out, Spotify's player gives a 30-second preview. No Spotify Premium or developer account is needed.
- **YouTube**: some videos (often official music videos) block playing on other websites. The app says so when that happens. Try a different upload of the song.
- Loop points are accurate to roughly a tenth of a second. Spotify's player reports its position less often than YouTube's, so its loops can be slightly less precise.

## Host it on your own GitHub (free)

The site is plain static files, built and published by the included GitHub Actions workflow. It works under any GitHub username and repo name.

1. Get the code into your account: **Fork** this repo, or create a new repo and push this code to it.
2. In your repo, open **Settings → Pages** and under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open the **Actions** tab. If you forked, click the button that enables workflows. Then run **Deploy to GitHub Pages** (or push any commit to `main`).
4. After a minute or so, the site is live at `https://<your-username>.github.io/<repo-name>/`. The link also shows up in **Settings → Pages**.

Every push to `main` redeploys automatically.

## Run it locally

Requires [Node.js](https://nodejs.org) 20.19+.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## How it's built

- [React](https://react.dev) + [Vite](https://vite.dev)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) and the [Spotify Embed iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api) to control playback. Neither needs API keys.

```
src/
  App.jsx                  page layout + the looping logic
  components/
    Player.jsx             picks the YouTube or Spotify player
    YouTubePlayer.jsx      wraps the YouTube player
    SpotifyPlayer.jsx      wraps the Spotify embed
    Timeline.jsx           draggable start/end handles
    TimeField.jsx          "1:23.5"-style time boxes
    LoopControls.jsx       loop count, start/stop, progress
    SongInput.jsx          link box
  lib/
    parseSource.js         turns a pasted link into a YouTube/Spotify ID
    time.js                time parsing/formatting
    share.js               shareable loop links
```
