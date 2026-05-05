const vscode = acquireVsCodeApi();

// DOM Elements
const urlInput = document.getElementById('url');
const methodSelect = document.getElementById('method');
const envSelect = document.getElementById('environment');
const baseUrlInput = document.getElementById('baseUrl');
const headersContainer = document.getElementById('headers-container');
const bodyInput = document.getElementById('body');
const sendBtn = document.getElementById('send-btn');
const responseSection = document.getElementById('response-section');
const statusCodeEl = document.getElementById('status-code');
const responseTimeEl = document.getElementById('response-time');
const responseBodyEl = document.getElementById('response-body');
const errorContainer = document.getElementById('error-container');

window.updateAuthUI = function() {
  const type = document.getElementById('auth-type').value;
  document.getElementById('auth-bearer-config').classList.add('hidden');
  document.getElementById('auth-apikey-config').classList.add('hidden');
  
  if (type === 'bearer') {
    document.getElementById('auth-bearer-config').classList.remove('hidden');
  } else if (type === 'apikey') {
    document.getElementById('auth-apikey-config').classList.remove('hidden');
  }
};

// State
let allSuggestions = [];

// --- Tabs ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

function switchTab(targetId) {
  const btn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
  if (btn) btn.click();
}

// --- Sub Tabs (Tester) ---
document.querySelectorAll('.req-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.req-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.req-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

window.refreshEndpoints = function() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.classList.add('spinning');
  vscode.postMessage({ type: 'refreshEndpoints' });
};

// --- Endpoints ---
function populateSidebar(endpoints) {
  const list = document.getElementById('sidebar-endpoint-list');
  if (!endpoints || endpoints.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding: 40px 0; color: var(--text-secondary); font-size:11px;">Scanning endpoints...</div>`;
    return;
  }
  
  list.innerHTML = endpoints.map((s, index) => `
    <div class="ep-card" onclick="selectSidebarItem(${index})">
      <div class="ep-header">
        <span class="ep-method method-${s.method.toLowerCase()}">${s.method}</span>
        <span class="ep-path" title="${s.path}">${s.path}</span>
      </div>
      <div class="ep-footer">
        <span>${s.framework}</span>
        <span>${s.file.split(/[\\\\/]/).pop()}</span>
      </div>
    </div>
  `).join('');
}

window.selectSidebarItem = function(index) {
  const suggestion = allSuggestions[index];
  methodSelect.value = suggestion.method;
  updateMethodColor();
  urlInput.value = suggestion.path;
  
  // Handle Params
  const paramsContainer = document.getElementById('params-container');
  if (suggestion.params && suggestion.params.length > 0) {
    paramsContainer.innerHTML = suggestion.params.map(p => `
      <div class="row" style="align-items:center;">
        <span class="lbl" style="width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p}">${p}</span>
        <input type="text" class="glass-input param-input" data-param="${p}" placeholder="value" style="flex:1" value="1">
      </div>
    `).join('');
    document.getElementById('tab-btn-params').classList.add('has-params');
    // If it has params, show them first
    document.querySelector('.req-tab[data-target="req-params"]').click();
  } else {
    paramsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-secondary); font-size:11px;">No path parameters detected</div>`;
    document.getElementById('tab-btn-params').classList.remove('has-params');
    document.querySelector('.req-tab[data-target="req-body"]').click();
  }

  if (suggestion.bodyExample) {
    bodyInput.value = JSON.stringify(suggestion.bodyExample, null, 2);
  } else {
    bodyInput.value = '';
  }

  // Handle Field Suggestions
  const fieldContainer = document.getElementById('field-suggestions-container');
  const fieldList = document.getElementById('field-suggestions');
  if (suggestion.fields && suggestion.fields.length > 0) {
    fieldContainer.classList.remove('hidden');
    fieldList.innerHTML = suggestion.fields.map(f => `
      <button class="btn-secondary" style="font-size:10px; padding: 4px 8px;" onclick="insertField('${f}')">${f}</button>
    `).join('');
    document.getElementById('body-struct-name').textContent = 'DETECTED STRUCT';
  } else {
    fieldContainer.classList.add('hidden');
    document.getElementById('body-struct-name').textContent = 'RAW JSON';
  }
  
  switchTab('tab-tester');
};

window.insertField = function(field) {
  const currentBody = bodyInput.value.trim();
  let bodyObj = {};
  try {
    if (currentBody && currentBody !== '{}') {
      bodyObj = JSON.parse(currentBody);
    }
    if (!bodyObj[field]) {
      bodyObj[field] = "";
      bodyInput.value = JSON.stringify(bodyObj, null, 2);
    }
  } catch (e) {
    // If not valid JSON, just append
    bodyInput.value += `\n"${field}": ""`;
  }
};

document.getElementById('sidebar-search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    populateSidebar(allSuggestions);
    return;
  }
  const filtered = allSuggestions.filter(s => 
    s.path.toLowerCase().includes(query) || s.method.toLowerCase().includes(query)
  );
  populateSidebar(filtered);
});

// --- Headers ---
window.addHeader = function(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <input type="text" class="glass-input hk" placeholder="Key" value="${key}">
    <input type="text" class="glass-input hv" placeholder="Value" value="${value}">
    <button class="btn-secondary" style="border:none" onclick="this.parentElement.remove()">✕</button>
  `;
  headersContainer.appendChild(row);
};

function getHeaders() {
  const headers = {};
  headersContainer.querySelectorAll('.row').forEach(row => {
    const k = row.querySelector('.hk').value.trim();
    const v = row.querySelector('.hv').value.trim();
    if (k) headers[k] = v;
  });
  return headers;
}

// --- Request ---
window.sendRequest = function() {
  const method = methodSelect.value;
  let url = urlInput.value;
  const headers = getHeaders();

  // Replace path parameters
  document.querySelectorAll('.param-input').forEach(input => {
    const p = input.dataset.param;
    const v = input.value.trim() || `:${p}`;
    url = url.replace(`:${p}`, v);
    url = url.replace(`{${p}}`, v);
  });
  
  // Add Auth headers
  const authType = document.getElementById('auth-type').value;
  if (authType === 'bearer') {
    const token = document.getElementById('auth-token').value.trim();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else if (authType === 'apikey') {
    const key = document.getElementById('auth-key-name').value.trim();
    const val = document.getElementById('auth-key-value').value.trim();
    if (key && val) headers[key] = val;
  }
  
  let body = undefined;
  const txt = bodyInput.value.trim();
  if (txt) {
    try {
      body = JSON.parse(txt);
    } catch (e) {
      // If it's not valid JSON, send it as-is (might be plain text or raw data)
      body = txt;
    }
  }
  
  const oHtml = sendBtn.innerHTML;
  sendBtn.dataset.oHtml = oHtml;
  sendBtn.innerHTML = 'SENDING...';
  sendBtn.disabled = true;
  
  const isWS = method === 'WS';
  
  if (isWS) {
    document.getElementById('ws-section').classList.remove('hidden');
    responseSection.classList.add('hidden');
    document.getElementById('ws-messages').innerHTML = '<div class="ws-log info">Connecting...</div>';
  } else {
    document.getElementById('ws-section').classList.add('hidden');
    responseSection.classList.add('hidden');
  }

  errorContainer.classList.add('hidden');
  
  vscode.postMessage({
    type: 'sendRequest',
    data: { method, url, baseUrl: baseUrlInput.value.trim(), headers, body }
  });
};

window.sendWSMessage = function() {
  const input = document.getElementById('ws-input');
  const msg = input.value.trim();
  if (msg) {
    vscode.postMessage({ type: 'wsSend', data: msg });
    addWSLog('sent', msg);
    input.value = '';
  }
};

window.copyAsCurl = function() {
  const method = methodSelect.value;
  let url = urlInput.value;
  
  // Replace path parameters
  document.querySelectorAll('.param-input').forEach(input => {
    const p = input.dataset.param;
    const v = input.value.trim() || `:${p}`;
    url = url.replace(`:${p}`, v);
    url = url.replace(`{${p}}`, v);
  });

  const baseUrl = baseUrlInput.value.trim();
  const fullUrl = baseUrl ? (baseUrl.endsWith('/') ? baseUrl + (url.startsWith('/') ? url.slice(1) : url) : baseUrl + (url.startsWith('/') ? url : '/' + url)) : url;
  const headers = getHeaders();
  
  // Add Auth headers
  const authType = document.getElementById('auth-type').value;
  if (authType === 'bearer') {
    const token = document.getElementById('auth-token').value.trim();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else if (authType === 'apikey') {
    const key = document.getElementById('auth-key-name').value.trim();
    const val = document.getElementById('auth-key-value').value.trim();
    if (key && val) headers[key] = val;
  }

  let curl = `curl -X ${method} "${fullUrl}"`;
  for (const [k, v] of Object.entries(headers)) {
    curl += ` \\\n  -H "${k}: ${v}"`;
  }
  
  const body = bodyInput.value.trim();
  if (body && !['GET', 'HEAD', 'WS'].includes(method)) {
    curl += ` \\\n  -d '${body}'`;
  }
  
  navigator.clipboard.writeText(curl).then(() => {
    vscode.postMessage({ type: 'info', data: 'cURL copied to clipboard!' });
  });
};

window.closeWS = function() {
  vscode.postMessage({ type: 'wsClose' });
};

function addWSLog(type, content) {
  const container = document.getElementById('ws-messages');
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `ws-log ${type}`;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'ws-time';
  timeSpan.textContent = `[${time}]`;
  
  const typeSpan = document.createElement('span');
  typeSpan.className = 'ws-type';
  typeSpan.textContent = type.toUpperCase();
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ws-content';
  contentDiv.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  entry.appendChild(timeSpan);
  entry.appendChild(typeSpan);
  entry.appendChild(contentDiv);
  
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function showError(msg) {
  errorContainer.textContent = msg;
  errorContainer.classList.remove('hidden');
  responseSection.classList.remove('hidden');
  responseBodyEl.textContent = '';
  statusCodeEl.textContent = '';
  responseTimeEl.textContent = '';
  
  if (sendBtn.dataset.oHtml) sendBtn.innerHTML = sendBtn.dataset.oHtml;
  sendBtn.disabled = false;
}

// --- Settings & AI ---
window.saveSettings = function() {
  const apiKey = document.getElementById('openrouter-key').value.trim();
  const aiModel = document.getElementById('ai-model').value;
  const aiPrompt = document.getElementById('ai-prompt').value.trim();
  
  vscode.postMessage({ 
    type: 'saveSettings', 
    data: { openRouterApiKey: apiKey, openRouterAiModel: aiModel, openRouterAiPrompt: aiPrompt } 
  });
  
  const st = document.getElementById('settings-status');
  st.classList.remove('hidden');
  setTimeout(() => st.classList.add('hidden'), 3000);
};

window.generateAIBody = function() {
  const method = methodSelect.value;
  const url = urlInput.value;
  if (!url || url.trim() === '') return;
  
  const currentBody = bodyInput.value.trim();
  
  const btn = document.getElementById('ai-generate-btn');
  btn.dataset.oHtml = btn.innerHTML;
  btn.innerHTML = '✨ Generating...';
  
  vscode.postMessage({ type: 'generateAIBody', data: { method, url, currentBody } });
};

window.generateAIParams = function() {
  const method = methodSelect.value;
  const url = urlInput.value;
  if (!url || url.trim() === '') return;
  
  const params = [];
  document.querySelectorAll('.param-input').forEach(input => {
    params.push(input.dataset.param);
  });
  
  if (params.length === 0) return;

  const btn = document.getElementById('ai-params-btn');
  btn.dataset.oHtml = btn.innerHTML;
  btn.innerHTML = '✨ Generating...';
  
  vscode.postMessage({ type: 'generateAIParams', data: { method, url, params } });
};

window.fetchModels = function() {
  vscode.postMessage({ type: 'fetchModels' });
  document.getElementById('ai-model').innerHTML = '<option value="">Fetching models...</option>';
};

window.addEnvironment = function() {
  const name = document.getElementById('new-env-name').value.trim();
  const baseUrl = document.getElementById('new-env-url').value.trim();
  if (name && baseUrl) {
    vscode.postMessage({ type: 'addEnvironment', data: { name, baseUrl } });
    document.getElementById('new-env-name').value = '';
    document.getElementById('new-env-url').value = '';
  }
};

window.deleteEnvironment = function(name) {
  vscode.postMessage({ type: 'deleteEnvironment', data: name });
};

// --- Messages ---
window.addEventListener('message', e => {
  const msg = e.data;
  
  if (msg.type === 'suggestions') {
    allSuggestions = msg.data || [];
    const btn = document.getElementById('refresh-btn');
    if (btn) btn.classList.remove('spinning');
    
    // Update count badge
    const countBadge = document.getElementById('endpoint-count');
    if (countBadge) countBadge.textContent = allSuggestions.length;
    
    populateSidebar(allSuggestions);
  }
  
  if (msg.type === 'populate') {
    methodSelect.value = msg.data.method;
    updateMethodColor();
    urlInput.value = msg.data.path;
    if (msg.data.body) bodyInput.value = JSON.stringify(msg.data.body, null, 2);
  }
  
  if (msg.type === 'response') {
    if (sendBtn.dataset.oHtml) sendBtn.innerHTML = sendBtn.dataset.oHtml;
    sendBtn.disabled = false;
    errorContainer.classList.add('hidden');
    responseSection.classList.remove('hidden');
    
    const { status, statusText, data, time, error } = msg.data;
    
    if (status === 0 || error) {
      statusCodeEl.textContent = status === 0 ? 'CONNECTION FAILED' : `${status} ${statusText}`;
      statusCodeEl.className = 'status-red';
      responseTimeEl.textContent = `${time}ms`;
      responseBodyEl.textContent = error || 'An unknown error occurred during the request.';
      responseBodyEl.style.color = '#f87171'; // Error red
    } else {
      statusCodeEl.textContent = `${status} ${statusText}`;
      statusCodeEl.className = status >= 400 ? 'status-red' : 'status-green';
      responseTimeEl.textContent = `${time}ms`;
      
      let displayData = data;
      if (typeof data === 'object') {
        displayData = JSON.stringify(data, null, 2);
      }
      responseBodyEl.textContent = displayData;
      responseBodyEl.style.color = ''; // Reset to default
    }
  }

  if (msg.type === 'wsStatus') {
    const { status, url, message, code, reason } = msg.data;
    const statusEl = document.getElementById('ws-status-text');
    statusEl.textContent = `WS ${status}`;
    
    if (status === 'CONNECTED') {
      statusEl.style.color = 'var(--neon-cyan)';
      addWSLog('info', `Connected to ${url}`);
      if (sendBtn.dataset.oHtml) sendBtn.innerHTML = sendBtn.dataset.oHtml;
      sendBtn.disabled = false;
    } else if (status === 'CLOSED') {
      statusEl.style.color = 'var(--text-secondary)';
      addWSLog('info', `Connection closed: ${code} ${reason || ''}`);
    } else if (status === 'ERROR') {
      statusEl.style.color = 'var(--neon-pink)';
      addWSLog('error', message);
      if (sendBtn.dataset.oHtml) sendBtn.innerHTML = sendBtn.dataset.oHtml;
      sendBtn.disabled = false;
    }
  }

  if (msg.type === 'wsMessage') {
    addWSLog('received', msg.data.content);
  }
  
  if (msg.type === 'modelsList') {
    const select = document.getElementById('ai-model');
    select.innerHTML = msg.data.map(m => 
      `<option value="${m.id}">${m.isFree ? '🎁 FREE: ' : ''}${m.name}</option>`
    ).join('');
    if (window.lastSavedModel) {
      select.value = window.lastSavedModel;
    }
  }

  if (msg.type === 'environments') {
    const active = msg.data.active;
    envSelect.innerHTML = msg.data.environments.map(en => `<option value="${en.name}" ${en.name === active ? 'selected' : ''}>${en.name}</option>`).join('');
    const actObj = msg.data.environments.find(en => en.name === active);
    if (actObj) baseUrlInput.value = actObj.baseUrl;
    
    // Update Environment List in Settings
    const envList = document.getElementById('env-list');
    if (envList) {
        envList.innerHTML = msg.data.environments.map(en => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid var(--glass-border);">
                <div class="col" style="gap:2px;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-primary);">${en.name}</span>
                    <span style="font-size:10px; color:var(--text-secondary); opacity:0.7;">${en.baseUrl}</span>
                </div>
                ${en.name !== 'local' ? `<button class="btn-secondary" style="border:none; color:#ef4444; width:24px; height:24px; padding:0;" onclick="deleteEnvironment('${en.name}')">✕</button>` : ''}
            </div>
        `).join('');
    }

    if (msg.data.apiKey) document.getElementById('openrouter-key').value = msg.data.apiKey;
    if (msg.data.aiModel) {
      window.lastSavedModel = msg.data.aiModel;
      
      const sel = document.getElementById('ai-model');
      if (sel.querySelector(`option[value="${msg.data.aiModel}"]`)) {
        sel.value = msg.data.aiModel;
      } else if (!sel.innerHTML.includes('Fetching')) {
        const opt = document.createElement('option');
        opt.value = msg.data.aiModel;
        opt.textContent = msg.data.aiModel;
        sel.appendChild(opt);
        sel.value = msg.data.aiModel;
      }
    }
    if (msg.data.aiPrompt !== undefined) {
      document.getElementById('ai-prompt').value = msg.data.aiPrompt;
    }
  }
  
  if (msg.type === 'aiBodyGenerated') {
    const btn = document.getElementById('ai-generate-btn');
    if (btn.dataset.oHtml) btn.innerHTML = btn.dataset.oHtml;
    
    if (msg.data.error) vscode.postMessage({ type: 'error', data: msg.data.error });
    else if (msg.data.body) bodyInput.value = JSON.stringify(msg.data.body, null, 2);
  }

  if (msg.type === 'aiParamsGenerated') {
    const btn = document.getElementById('ai-params-btn');
    if (btn.dataset.oHtml) btn.innerHTML = btn.dataset.oHtml;
    
    if (msg.data.error) vscode.postMessage({ type: 'error', data: msg.data.error });
    else if (msg.data.params) {
      for (const [key, val] of Object.entries(msg.data.params)) {
        const input = document.querySelector(`.param-input[data-param="${key}"]`);
        if (input) input.value = val;
      }
    }
  }
});

function updateMethodColor() {
  const m = methodSelect.value.toLowerCase();
  methodSelect.className = `method-select method-${m}-text`;
}
methodSelect.addEventListener('change', updateMethodColor);
updateMethodColor(); // Initial call

envSelect.addEventListener('change', (e) => {
  vscode.postMessage({ type: 'changeEnvironment', data: e.target.value });
});

vscode.postMessage({ type: 'ready' });
