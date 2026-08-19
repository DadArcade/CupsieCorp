import { normalizeIppPrinter, getMatchPattern } from './utils.js';

const MIN_SYNC_INTERVAL_MINUTES = 1;
const MAX_SYNC_INTERVAL_MINUTES = 7200;

let loadedCredentials = {};
let statusTimer = null;

function showStatus(messageKey, type = 'success', substitutions = [], duration = 4000) {
  const status = document.getElementById('status');
  status.textContent = chrome.i18n.getMessage(messageKey, substitutions) || messageKey;
  status.className = 'status visible status--' + type;
  // Re-enable save button on terminal states (success/error), keep disabled during info
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn && type !== 'info') saveBtn.disabled = false;
  if (statusTimer) clearTimeout(statusTimer);
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      status.classList.remove('visible');
      statusTimer = null;
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  document.getElementById('addIppPrinterBtn').addEventListener('click', () => {
    addPrinterRow('', '');
  });
  document.getElementById('saveBtn').addEventListener('click', saveOptions);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.lastSyncTime && changes.lastSyncTime.newValue) {
    const d = new Date(changes.lastSyncTime.newValue);
    const el = document.getElementById('lastSyncTime');
    if (el) el.innerText = d.toLocaleString();
  }
  if (namespace === 'local' && changes.syncResults && changes.syncResults.newValue) {
    renderSyncResults(changes.syncResults.newValue);
  }
});

function validateAndFormatUrl(urlStr) {
  let u = urlStr.trim();
  if (!u) return '';
  // Ensure it has a protocol scheme. If not, default to http://
  if (!/^[a-zA-Z0-9+-.]+:\/\//.test(u)) {
    u = 'http://' + u;
  }
  // Lowercase the protocol scheme part (e.g. HTTP:// -> http://)
  u = u.replace(/^([a-zA-Z0-9+-.]+):\/\//, (match, scheme) => scheme.toLowerCase() + '://');
  return u;
}

function saveOptions() {
  document.getElementById('saveBtn').disabled = true;
  const cupsServers = document.getElementById('cupsServers').value
    .split('\n')
    .map(validateAndFormatUrl)
    .filter(s => s.length > 0);

  const ippPrinters = [];
  document.querySelectorAll('.ipp-printer-row').forEach(row => {
    const urlInput = row.querySelector('.printer-url');
    const nameInput = row.querySelector('.printer-name');
    if (urlInput) {
      const url = validateAndFormatUrl(urlInput.value);
      if (url) {
        ippPrinters.push({
          url: url,
          name: nameInput ? nameInput.value.trim() : ''
        });
      }
    }
  });

  const syncInterval = parseInt(document.getElementById('syncInterval').value, 10);
  const defaultRequestingUserEl = document.getElementById('defaultRequestingUser');
  const defaultRequestingUser = (defaultRequestingUserEl.disabled && defaultRequestingUserEl.dataset.rawValue !== undefined)
    ? defaultRequestingUserEl.dataset.rawValue
    : defaultRequestingUserEl.value.trim();

  if (isNaN(syncInterval) || syncInterval < MIN_SYNC_INTERVAL_MINUTES || syncInterval > MAX_SYNC_INTERVAL_MINUTES) {
    showStatus('syncIntervalInvalid', 'error');
    return;
  }

  showStatus('savingSettings', 'info', [], 0);
  saveToSyncStorage(cupsServers, ippPrinters, syncInterval, defaultRequestingUser);
}

async function saveToSyncStorage(cupsServers, ippPrinters, syncInterval, defaultRequestingUser) {
  // Clear auth and ignore tracking flags to re-test connections cleanly on save
  try {
    await chrome.storage.local.remove(['ignoredAuthDevices', 'authRequiredDevices']);
  } catch (e) {
    console.warn('Failed to reset local auth configuration flags:', e);
  }

  // Save to sync storage and local storage
  try {
    await Promise.all([
      chrome.storage.sync.set({
        cupsServers: cupsServers,
        ippPrinters: ippPrinters,
        syncInterval: syncInterval,
        defaultRequestingUser: defaultRequestingUser
      }),
      chrome.storage.local.set({
        deviceCredentials: loadedCredentials
      })
    ]);
  } catch (e) {
    console.error('Failed to save settings:', e);
    showStatus('syncFailed', 'error', [e.message || 'Sync failed']);
    return;
  }

  // Connect to background page to trigger sync and track real-time progress
  const port = chrome.runtime.connect({ name: 'sync_printers' });
  port.onMessage.addListener((msg) => {
    if (msg.status === 'progress') {
      showStatus('syncProgress', 'info', [msg.completed.toString(), msg.total.toString()], 0);
    } else if (msg.status === 'done') {
      showStatus('syncSuccess', 'success');
      port.disconnect();
    } else {
      const errorMsg = msg.error || chrome.i18n.getMessage('unknownErrorOccurred');
      showStatus('syncFailed', 'error', [errorMsg]);
      port.disconnect();
    }
  });

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.error('Sync port disconnected with error:', chrome.runtime.lastError);
      showStatus('syncFailed', 'error', [chrome.runtime.lastError.message]);
    } else {
      // SW may have been killed mid-sync; ensure save button is always re-enabled
      document.getElementById('saveBtn').disabled = false;
    }
  });
}

async function restoreOptions() {
  let managed = {};
  if (chrome.storage && chrome.storage.managed) {
    try {
      managed = await chrome.storage.managed.get(['cupsServers', 'ippPrinters', 'syncInterval', 'defaultRequestingUser']) || {};
    } catch (e) {
      console.warn('Managed storage not available or policy not configured:', e.message);
    }
  }
  await restoreUserAndLocalOptions(managed);
}

async function restoreUserAndLocalOptions(managed) {
  const hasManaged = managed && Object.keys(managed).length > 0;

  if (hasManaged) {
    if (managed.cupsServers && managed.cupsServers.length > 0) {
      const el = document.getElementById('managedCupsServers');
      if (el) el.value = managed.cupsServers.join('\n');
      const sec = document.getElementById('managedCupsSection');
      if (sec) sec.classList.add('visible');
    }
    if (managed.ippPrinters && managed.ippPrinters.length > 0) {
      const container = document.getElementById('managedIppPrintersContainer');
      if (container) {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        managed.ippPrinters.forEach(printer => {
          const norm = normalizeIppPrinter(printer);
          if (norm) {
            const row = document.createElement('div');
            row.className = 'printer-row-managed';

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.className = 'managed-url';
            urlInput.value = norm.url;
            urlInput.readOnly = true;

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'managed-name';
            nameInput.value = norm.name;
            nameInput.readOnly = true;

            row.appendChild(urlInput);
            row.appendChild(nameInput);
            fragment.appendChild(row);
          }
        });
        container.appendChild(fragment);
      }
      const sec = document.getElementById('managedIppSection');
      if (sec) sec.classList.add('visible');
    }
    if (managed.syncInterval !== undefined) {
      const syncInput = document.getElementById('syncInterval');
      if (syncInput) {
        syncInput.value = managed.syncInterval;
        syncInput.disabled = true;
      }
      const badge = document.getElementById('managedIntervalBadge');
      if (badge) badge.classList.add('visible');
    }
    if (managed.defaultRequestingUser !== undefined) {
      const userInput = document.getElementById('defaultRequestingUser');
      if (userInput) {
        userInput.dataset.rawValue = managed.defaultRequestingUser;
        userInput.value = await resolveUsernameForDisplay(managed.defaultRequestingUser);
        userInput.disabled = true;
      }
      const badge = document.getElementById('managedUserBadge');
      if (badge) badge.classList.add('visible');
    }
  }

  // Now query sync user configuration and local sync logs
  let syncItems = {};
  let localItems = {};
  try {
    const [syncRes, localRes] = await Promise.all([
      chrome.storage.sync.get(['cupsServers', 'ippPrinters', 'syncInterval', 'defaultRequestingUser']),
      chrome.storage.local.get(['lastSyncTime', 'syncResults', 'deviceCredentials'])
    ]);
    syncItems = syncRes || {};
    localItems = localRes || {};
  } catch (e) {
    console.error('Failed to load settings from storage:', e);
  }

  const items = { ...(syncItems || {}), ...(localItems || {}) };
  if (items.cupsServers) {
    const el = document.getElementById('cupsServers');
    if (el) el.value = items.cupsServers.join('\n');
  }
  if (items.ippPrinters && items.ippPrinters.length > 0) {
    const container = document.getElementById('ippPrintersContainer');
    if (container) {
      container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      items.ippPrinters.forEach(printer => {
        const norm = normalizeIppPrinter(printer);
        if (norm) {
          addPrinterRow(norm.url, norm.name, fragment);
        }
      });
      container.appendChild(fragment);
    }
  } else {
    const container = document.getElementById('ippPrintersContainer');
    if (container) {
      container.innerHTML = '';
    }
    addPrinterRow('', '');
  }
  // Apply local interval value only if it's not managed by enterprise policy
  if (items.syncInterval !== undefined && (!managed || managed.syncInterval === undefined)) {
    const syncInput = document.getElementById('syncInterval');
    if (syncInput) syncInput.value = items.syncInterval;
  }
  // Apply local requesting username value only if it's not managed by enterprise policy
  if (items.defaultRequestingUser !== undefined && (!managed || managed.defaultRequestingUser === undefined)) {
    const userInput = document.getElementById('defaultRequestingUser');
    if (userInput) {
      userInput.dataset.rawValue = items.defaultRequestingUser;
      if (typeof items.defaultRequestingUser === 'string' && (items.defaultRequestingUser.includes('${user_name}') || items.defaultRequestingUser.includes('#{user_name}'))) {
        userInput.value = await resolveUsernameForDisplay(items.defaultRequestingUser);
        userInput.disabled = true;
      } else {
        userInput.value = items.defaultRequestingUser;
      }
    }
  }
  if (items.lastSyncTime) {
    const d = new Date(items.lastSyncTime);
    const el = document.getElementById('lastSyncTime');
    if (el) el.innerText = d.toLocaleString();
  }
  if (items.syncResults) {
    renderSyncResults(items.syncResults);
  }

  loadedCredentials = items.deviceCredentials || {};
  renderStoredCredentials(loadedCredentials);

}

function renderSyncResults(results) {
  const list = document.getElementById('syncLog');
  if (!list) return;
  list.innerHTML = '';

  if (!results || Object.keys(results).length === 0) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'note';
    span.textContent = chrome.i18n.getMessage('noPrintersConfigured');
    li.appendChild(span);
    list.appendChild(li);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const [url, data] of Object.entries(results)) {
    const li = document.createElement('li');
    const isSuccess = data.status === 'success';
    li.className = 'sync-result ' + (isSuccess ? 'sync-result--success' : 'sync-result--error');

    // Use DOM construction instead of innerHTML to avoid XSS from crafted URLs/messages
    const strong = document.createElement('strong');
    strong.textContent = url;
    const br = document.createElement('br');
    const span = document.createElement('span');
    span.className = isSuccess ? 'sync-result__message--success' : 'sync-result__message--error';
    span.textContent = data.message;
    li.appendChild(strong);
    li.appendChild(br);
    li.appendChild(span);
    fragment.appendChild(li);
  }
  list.appendChild(fragment);
}

function addPrinterRow(url = '', name = '', targetParent = null) {
  const container = targetParent || document.getElementById('ippPrintersContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'ipp-printer-row printer-row';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'printer-url';
  urlInput.placeholder = 'http://192.168.1.50:631/ipp/print';
  urlInput.value = url;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'printer-name';
  nameInput.placeholder = chrome.i18n.getMessage('printerNamePlaceholder') || 'Name (optional)';
  nameInput.value = name;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '\u2715';
  removeBtn.title = chrome.i18n.getMessage('removePrinterTitle') || 'Remove printer';
  removeBtn.addEventListener('click', () => {
    row.remove();
    const containerEl = document.getElementById('ippPrintersContainer');
    if (containerEl && containerEl.children.length === 0) {
      addPrinterRow('', '');
    }
  });

  row.appendChild(urlInput);
  row.appendChild(nameInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

function renderStoredCredentials(credentials) {
  const container = document.getElementById('credentialsContainer');
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(credentials);
  if (entries.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'note';
    emptyMsg.setAttribute('data-i18n', 'noStoredCredentials');
    emptyMsg.textContent = chrome.i18n.getMessage('noStoredCredentials') || 'No stored credentials found.';
    container.appendChild(emptyMsg);
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach(([url, creds]) => {
    const row = document.createElement('div');
    row.className = 'credentials-row';
    row.dataset.url = url;

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'credential-url';
    urlInput.value = url;
    urlInput.readOnly = true;

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.className = 'credential-username';
    usernameInput.value = creds.username || '';
    usernameInput.readOnly = true;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '\u2715';
    removeBtn.title = chrome.i18n.getMessage('removeCredentialTitle') || 'Remove credential';

    removeBtn.addEventListener('click', () => {
      delete loadedCredentials[url];
      chrome.storage.local.set({ deviceCredentials: loadedCredentials });
      row.remove();
      if (container.children.length === 0) {
        renderStoredCredentials({});
      }
    });

    row.appendChild(urlInput);
    row.appendChild(usernameInput);
    row.appendChild(removeBtn);
    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

async function resolveUsernameForDisplay(configuredUser) {
  if (typeof configuredUser !== 'string' || (!configuredUser.includes('${user_name}') && !configuredUser.includes('#{user_name}'))) {
    return configuredUser;
  }
  let identityUser = null;
  if (chrome.identity && chrome.identity.getProfileUserInfo) {
    try {
      let userInfo;
      try {
        userInfo = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
      } catch (e) {
        userInfo = await chrome.identity.getProfileUserInfo();
      }
      if (userInfo && userInfo.email && userInfo.email.includes('@')) {
        const extractedUser = userInfo.email.trim().split('@')[0];
        if (extractedUser) {
          identityUser = extractedUser;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve user info via chrome.identity:', e);
    }
  }
  return configuredUser
    .replace(/\$\{user_name\}/g, identityUser || 'Chrome User')
    .replace(/#\{user_name\}/g, identityUser || 'Chrome User');
}
