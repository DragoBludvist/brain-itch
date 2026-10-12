// Hard limits on everything a user (or a shared link) can feed in.
// Anything outside these is rejected, never trimmed into something "close enough".
export const MAX_URL_LENGTH = 2048; // longest song link we'll accept
export const MAX_TIME_INPUT_LENGTH = 16; // "1:02:03.5" is 9 chars
export const MAX_TIME_SECONDS = 24 * 60 * 60; // nothing we can play is longer than a day
export const MAX_LOOPS = 999;
