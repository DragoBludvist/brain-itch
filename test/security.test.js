// Attack inputs for everything a user or a shared link can feed in.
// Run with: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parseSource } from '../src/lib/parseSource.js';
import { parseTime, isValidTime } from '../src/lib/time.js';
import { readShareState, buildShareUrl } from '../src/lib/share.js';
import { MAX_URL_LENGTH, MAX_TIME_INPUT_LENGTH, MAX_TIME_SECONDS, MAX_LOOPS } from '../src/lib/limits.js';

const YT_ID = 'dQw4w9WgXcQ';
const SP_ID = '4cOdK2wGLETKBW3PvgPWqT';

const rejected = (input) => {
  const result = parseSource(input);
  assert.ok(result.error, `expected rejection for ${String(JSON.stringify(input)).slice(0, 80)}`);
  assert.equal(result.kind, undefined);
  assert.equal(result.id, undefined);
  return result;
};

// share.js reads window.location; give it a minimal one per test.
function withHash(hash) {
  globalThis.window = { location: { hash, origin: 'https://example.github.io', pathname: '/brain-itch/' } };
  return readShareState();
}

const EMPTY_SHARE = { src: undefined, start: undefined, end: undefined, loops: undefined, forever: false };

describe('parseSource: valid links still work', () => {
  for (const [input, kind, id] of [
    [`https://www.youtube.com/watch?v=${YT_ID}`, 'youtube', YT_ID],
    [`https://youtu.be/${YT_ID}?si=abc`, 'youtube', YT_ID],
    [`youtube.com/shorts/${YT_ID}`, 'youtube', YT_ID],
    [`https://m.youtube.com/watch?v=${YT_ID}&t=30`, 'youtube', YT_ID],
    [`https://music.youtube.com/watch?v=${YT_ID}`, 'youtube', YT_ID],
    [`https://www.youtube-nocookie.com/embed/${YT_ID}`, 'youtube', YT_ID],
    [`https://open.spotify.com/track/${SP_ID}?si=xyz`, 'spotify', SP_ID],
    [`https://open.spotify.com/intl-de/track/${SP_ID}`, 'spotify', SP_ID],
    [`spotify:track:${SP_ID}`, 'spotify', SP_ID],
    [`  https://YOUTUBE.com/watch?v=${YT_ID}  `, 'youtube', YT_ID],
  ]) {
    test(input.trim(), () => assert.deepEqual(parseSource(input), { kind, id }));
  }
});

describe('parseSource: dangerous protocols', () => {
  for (const input of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    `javascript://www.youtube.com/watch?v=${YT_ID}`,
    `javascript:alert(1)//https://youtu.be/${YT_ID}`,
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    `vbscript:msgbox(1)`,
    `file:///etc/passwd`,
    `ftp://youtube.com/watch?v=${YT_ID}`,
    `blob:https://youtube.com/${YT_ID}`,
    `\tjavascript:alert(1)`,
    `java\nscript:alert(1)`,
  ]) {
    test(JSON.stringify(input), () => rejected(input));
  }
});

describe('parseSource: look-alike hosts', () => {
  for (const input of [
    `https://youtube.com.evil.example/watch?v=${YT_ID}`,
    `https://www.youtube.com.evil.example/watch?v=${YT_ID}`,
    `https://evilyoutube.com/watch?v=${YT_ID}`,
    `https://youtube.co/watch?v=${YT_ID}`,
    `https://evil.example/?youtube.com&v=${YT_ID}`,
    `https://evil.example/youtube.com/watch?v=${YT_ID}`,
    `https://evil.example#youtube.com/watch?v=${YT_ID}`,
    `https://youtu.be.evil.example/${YT_ID}`,
    `https://open.spotify.com.evil.example/track/${SP_ID}`,
    `https://spotify.com/track/${SP_ID}`,
    `https://evil.example/open.spotify.com/track/${SP_ID}`,
    `https://xn--youtube-ffb.com/watch?v=${YT_ID}`, // punycode look-alike
    `https://yоutube.com/watch?v=${YT_ID}`, // Cyrillic "о"
    `https://www.www.youtube.com/watch?v=${YT_ID}`,
  ]) {
    test(input, () => rejected(input));
  }
});

describe('parseSource: credentials in the link', () => {
  for (const input of [
    `https://user:pass@www.youtube.com/watch?v=${YT_ID}`,
    `https://user@youtu.be/${YT_ID}`,
    `https://:secret@open.spotify.com/track/${SP_ID}`,
    // The real host here is evil.example; "youtube.com" is only the username.
    `https://youtube.com@evil.example/watch?v=${YT_ID}`,
    `https://www.youtube.com:443@evil.example/watch?v=${YT_ID}`,
    `youtube.com@evil.example/watch?v=${YT_ID}`,
  ]) {
    test(input, () => rejected(input));
  }
});

describe('parseSource: HTML / script injection', () => {
  for (const input of [
    '<script>alert(1)</script>',
    `https://www.youtube.com/watch?v=${YT_ID}"><script>alert(1)</script>`,
    `https://www.youtube.com/watch?v=${YT_ID}'onload='alert(1)`,
    `https://youtu.be/${YT_ID}<img src=x onerror=alert(1)>`,
    `https://www.youtube.com/watch?v=<svg/onload=alert(1)>`,
    `https://open.spotify.com/track/${SP_ID}\`alert(1)\``,
    `https://www.youtube.com/watch?v=${YT_ID}\\..\\..`,
    `https://www.youtube.com/watch?v=${YT_ID}\u0000`,
    `https://www.youtube.com/watch?v=${YT_ID}‮`, // right-to-left override is let through by URL, but the ID check fails
  ]) {
    test(JSON.stringify(input), () => rejected(input));
  }

  test('percent-encoded markup in the video ID is rejected', () => {
    rejected('https://www.youtube.com/watch?v=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    rejected(`https://www.youtube.com/watch?v=${YT_ID}%22%3E%3Cscript%3E`);
    rejected('https://youtu.be/%3Cscript%3E');
  });

  test('only a strictly formatted ID ever comes out', () => {
    for (const input of [
      `https://www.youtube.com/watch?v=${YT_ID}&v=<script>`,
      `https://www.youtube.com/watch?v=${YT_ID}&x=<b>`,
      `https://open.spotify.com/track/${SP_ID}/<b>`,
    ]) {
      const r = parseSource(input);
      if (!r.error) assert.match(r.id, /^[A-Za-z0-9_-]{11}$|^[A-Za-z0-9]{22}$/);
    }
  });

  test('wrong-length IDs are rejected', () => {
    rejected(`https://www.youtube.com/watch?v=${YT_ID}x`);
    rejected(`https://www.youtube.com/watch?v=${YT_ID.slice(1)}`);
    rejected(`https://open.spotify.com/track/${SP_ID}x`);
    rejected(`spotify:track:${SP_ID}x`);
    rejected(`spotify:track:${SP_ID.slice(0, 21)}_`);
  });

  test('error messages never echo the input', () => {
    const payload = '<script>alert("pwned")</script>';
    for (const input of [
      payload,
      `https://evil.example/${payload}`,
      `https://www.youtube.com/watch?v=${encodeURIComponent(payload)}`,
      `https://open.spotify.com/album/${encodeURIComponent(payload)}`,
    ]) {
      const { error } = rejected(input);
      assert.ok(!error.includes('<') && !error.includes('pwned') && !error.includes('evil'), error);
    }
  });
});

describe('parseSource: oversized and odd input', () => {
  test('a link longer than MAX_URL_LENGTH is rejected', () => {
    const base = `https://www.youtube.com/watch?v=${YT_ID}&pad=`;
    const atLimit = base + 'a'.repeat(MAX_URL_LENGTH - base.length);
    assert.equal(atLimit.length, MAX_URL_LENGTH);
    assert.deepEqual(parseSource(atLimit), { kind: 'youtube', id: YT_ID });
    assert.equal(rejected(atLimit + 'a').error, 'That link is too long.');
  });

  test('a huge input is rejected quickly', () => {
    const huge = 'https://www.youtube.com/watch?v=' + 'A'.repeat(5_000_000);
    const t0 = performance.now();
    rejected(huge);
    assert.ok(performance.now() - t0 < 200, 'length check should run before any parsing');
  });

  for (const input of [undefined, null, '', '   ', 42, {}, [], { toString: () => 'javascript:alert(1)' }]) {
    test(`non-link value ${JSON.stringify(input) ?? String(input)}`, () => rejected(input));
  }

  test('a non-song Spotify link is rejected', () => {
    rejected(`https://open.spotify.com/playlist/${SP_ID}`);
    rejected(`https://open.spotify.com/album/${SP_ID}`);
    rejected('https://spotify.link/abc123');
  });
});

describe('parseTime: malformed values', () => {
  for (const input of [
    '1e9', '1E3', '1e-1', '0x10', '0X10', '0b101', '0o17',
    '-5', '-0', '+5', '-1:00', '1:-30',
    'Infinity', '-Infinity', 'NaN', '',  '   ', ':', '::', '1::2', ':30', '1:',
    '1:2:3:4', '1,5', '1 30', '١٢', // Arabic-Indic digits
    '5abc', 'abc', '<script>', '1:23<b>', '1.2.3', '..5', '.',
    '9'.repeat(MAX_TIME_INPUT_LENGTH + 1),
    '99999999', // over a day
    '24:00:01',
    '1441:00',
  ]) {
    test(JSON.stringify(input), () => assert.equal(parseTime(input), null));
  }

  for (const input of [null, undefined, {}, [], NaN, Infinity, -5, 1e9]) {
    test(`non-string ${String(input)}`, () => assert.equal(parseTime(input), null));
  }

  test('valid times still parse', () => {
    assert.equal(parseTime('83'), 83);
    assert.equal(parseTime('83.5'), 83.5);
    assert.equal(parseTime('.5'), 0.5);
    assert.equal(parseTime('1:23'), 83);
    assert.equal(parseTime('1:23.5'), 83.5);
    assert.equal(parseTime('1:02:03'), 3723);
    assert.equal(parseTime(' 0 '), 0);
    assert.equal(parseTime('24:00:00'), MAX_TIME_SECONDS);
  });

  test('isValidTime only accepts finite seconds in range', () => {
    for (const v of [0, 1.5, MAX_TIME_SECONDS]) assert.equal(isValidTime(v), true);
    for (const v of [-1, -0.1, MAX_TIME_SECONDS + 1, NaN, Infinity, '5', null, undefined, 1e9]) {
      assert.equal(isValidTime(v), false, String(v));
    }
  });
});

describe('readShareState: malformed shared links', () => {
  test('a well-formed link is read', () => {
    const src = `https://youtu.be/${YT_ID}`;
    assert.deepEqual(withHash(`#src=${encodeURIComponent(src)}&s=12.5&e=30&n=3`), {
      src, start: 12.5, end: 30, loops: 3, forever: false,
    });
    assert.equal(withHash('#n=inf').forever, true);
  });

  test('no hash / empty hash', () => {
    assert.deepEqual(withHash(''), EMPTY_SHARE);
    assert.deepEqual(withHash('#'), EMPTY_SHARE);
  });

  for (const s of ['1e9', '0x10', '-5', '+5', 'Infinity', 'NaN', '1e2', '1.', '.5', '1.2345', '1,5', ' 5', '5 ', '9999999', '100000']) {
    test(`time ${JSON.stringify(s)} is dropped`, () => {
      const state = withHash(`#s=${encodeURIComponent(s)}&e=${encodeURIComponent(s)}`);
      assert.equal(state.start, undefined);
      assert.equal(state.end, undefined);
    });
  }

  for (const n of ['0', '-1', '1000', '1e2', '0x10', '1.5', 'Infinity', 'INF', 'infinity', ' 3', '', '9999']) {
    test(`loop count ${JSON.stringify(n)} is dropped`, () => {
      const state = withHash(`#n=${encodeURIComponent(n)}`);
      assert.equal(state.loops, undefined);
      assert.equal(state.forever, false);
    });
  }

  test(`loop count limits are 1..${MAX_LOOPS}`, () => {
    assert.equal(withHash('#n=1').loops, 1);
    assert.equal(withHash(`#n=${MAX_LOOPS}`).loops, MAX_LOOPS);
  });

  test('an oversized src is dropped', () => {
    const src = `https://youtu.be/${YT_ID}?x=${'a'.repeat(MAX_URL_LENGTH)}`;
    assert.equal(withHash(`#src=${src}`).src, undefined);
  });

  test('an oversized hash is ignored entirely', () => {
    assert.deepEqual(withHash(`#s=5&n=3&pad=${'a'.repeat(MAX_URL_LENGTH + 200)}`), EMPTY_SHARE);
  });

  test('a malicious src is passed on only as a candidate, and parseSource rejects it', () => {
    for (const evil of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      `https://youtube.com.evil.example/watch?v=${YT_ID}`,
      `https://youtube.com@evil.example/watch?v=${YT_ID}`,
      `https://youtu.be/${YT_ID}"><script>alert(1)</script>`,
    ]) {
      const { src } = withHash(`#src=${encodeURIComponent(evil)}`);
      assert.equal(src, evil);
      rejected(src);
    }
  });

  test('unknown keys and prototype tricks are ignored', () => {
    const state = withHash('#__proto__=x&constructor=y&toString=z&evil=<script>&s=5');
    assert.deepEqual(Object.keys(state).sort(), ['end', 'forever', 'loops', 'src', 'start']);
    assert.equal(state.start, 5);
    assert.equal({}.x, undefined);
  });

  test('repeated keys use the first value only', () => {
    assert.equal(withHash('#s=5&s=1e9').start, 5);
    assert.equal(withHash('#n=3&n=inf').forever, false);
  });

  test('broken percent-encoding does not throw', () => {
    assert.doesNotThrow(() => withHash('#src=%E0%A4%A&s=%&n=%zz'));
    const state = withHash('#src=%E0%A4%A&s=%&n=%zz');
    assert.equal(state.start, undefined);
    assert.equal(state.loops, undefined);
  });

  test('buildShareUrl encodes src so it cannot break out of its slot', () => {
    globalThis.window = { location: { hash: '', origin: 'https://example.github.io', pathname: '/brain-itch/' } };
    const src = 'https://youtu.be/x&s=1e9&n=inf#<script>';
    const url = buildShareUrl({ src, start: 1, end: 2, loops: 3, forever: false });
    const hash = url.slice(url.indexOf('#'));
    assert.ok(!hash.slice(1).includes('#') && !hash.includes('<'), hash);
    assert.deepEqual(withHash(hash), { src, start: 1, end: 2, loops: 3, forever: false });
  });
});
