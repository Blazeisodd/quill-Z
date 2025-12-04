'use strict';

let quillZEnabled = true;     // controls paste simulation
let lastCorrectAnswer = null; // cached optimal answer from API

// Messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'QUILL_Z_TOGGLE') {
    quillZEnabled = !!msg.enabled;
    console.log('[quill-Z] Paste enabled =', quillZEnabled);
  }

  if (msg.type === 'QUILL_Z_FETCH_ANSWERS') {
    if (!lastCorrectAnswer) {
      console.warn('[quill-Z] No answer cached yet');
      return;
    }

    // Copy via hidden textarea + execCommand
    const ta = document.createElement('textarea');
    ta.value = lastCorrectAnswer;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      console.log('[quill-Z] Answer copy', ok ? 'succeeded' : 'failed');
    } catch (err) {
      console.warn('[quill-Z] execCommand copy failed', err);
    }
    document.body.removeChild(ta);
  }
});

function triggerReactChange(el, value) {
  const lastValue = el.value;
  el.value = value;

  const event = new Event('input', { bubbles: true });
  const tracker = el._valueTracker;
  if (tracker) tracker.setValue(lastValue);

  el.dispatchEvent(event);
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

function pasteToContentEditable(element, text) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Paste simulation
document.addEventListener(
  'paste',
  (evt) => {
    if (!quillZEnabled) return;

    const active = document.activeElement;
    const text = (evt.clipboardData || window.clipboardData)?.getData('text');
    if (!text) return;

    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      evt.preventDefault();
      triggerReactChange(active, text);
    } else if (active && active.isContentEditable) {
      evt.preventDefault();
      pasteToContentEditable(active, text);
    }
  },
  true
);

// Intercept /multiple_choice_options to cache optimal answer
const originalFetch = window.fetch;

window.fetch = function (...args) {
  return originalFetch.apply(this, args).then((res) => {
    try {
      const cloned = res.clone();

      if (cloned && cloned.url && cloned.url.includes('/multiple_choice_options')) {
        cloned
          .json()
          .then((responseData) => {
            const item = Array.isArray(responseData)
              ? responseData.find((x) => x && x.optimal === true)
              : null;

            if (!item || !item.text) {
              console.warn('[quill-Z] No optimal answer in response');
              return;
            }

            lastCorrectAnswer = String(item.text).trim();
            console.log('[quill-Z] Stored answer:', lastCorrectAnswer);
          })
          .catch((err) => {
            console.warn('[quill-Z] Error parsing multiple_choice_options JSON', err);
          });
      }
    } catch (e) {
      console.warn('[quill-Z] fetch intercept error', e);
    }

    return res;
  });
};
