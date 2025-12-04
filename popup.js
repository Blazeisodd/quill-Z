const STORAGE_KEY = 'quillZEnabled';
const AUTOFILL_KEY = 'quillZAutoFillEnabled'; // second toggle

function updateButton(button, enabled) {
  if (!button) return;
  button.classList.toggle('enabled', enabled);
  button.classList.toggle('disabled', !enabled);
  const label = button.querySelector('.toggle-text');
  if (label) {
    label.textContent = enabled ? 'Enabled' : 'Disabled';
  }
}

function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab) return;
    try {
      chrome.tabs.sendMessage(tab.id, message);
    } catch (e) {
      // ignore if no content script
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const mainBtn = document.getElementById('toggle');
  const autoFillBtn = document.getElementById('copy-top-answer');

  chrome.storage.sync.get([STORAGE_KEY, AUTOFILL_KEY], (res) => {
    const enabled = res[STORAGE_KEY] !== false;   // default true
    const autoFill = res[AUTOFILL_KEY] !== false; // default true

    updateButton(mainBtn, enabled);
    updateButton(autoFillBtn, autoFill);

    sendToActiveTab({ type: 'QUILL_Z_TOGGLE', enabled });
    sendToActiveTab({ type: 'QUILL_Z_SECOND_TOGGLE', enabled: autoFill });
  });

  // Main paste toggle
  if (mainBtn) {
    mainBtn.addEventListener('click', () => {
      chrome.storage.sync.get([STORAGE_KEY], (res) => {
        const current = res[STORAGE_KEY] !== false;
        const next = !current;

        chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => {
          updateButton(mainBtn, next);
          sendToActiveTab({ type: 'QUILL_Z_TOGGLE', enabled: next });
        });
      });
    });
  }

  // Second toggle
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', () => {
      chrome.storage.sync.get([AUTOFILL_KEY], (res) => {
        const current = res[AUTOFILL_KEY] !== false;
        const next = !current;

        chrome.storage.sync.set({ [AUTOFILL_KEY]: next }, () => {
          updateButton(autoFillBtn, next);
          sendToActiveTab({ type: 'QUILL_Z_SECOND_TOGGLE', enabled: next });
        });
      });
    });
  }
});
