// Copies text to the clipboard. Returns true on success.
// Tries the modern Clipboard API first, then the older select-and-copy method, which still
// works in some in-app browsers and embedded views where the Clipboard API is blocked.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  Object.assign(box.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(box);
  box.select();
  box.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  box.remove();
  return ok;
}
