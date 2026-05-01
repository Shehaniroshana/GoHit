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
  vscode.postMessage({ type: 'refreshEndpoints' });
  const btn = document.querySelector('.icon-btn-small');
  if (btn) {
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 1000);
  }
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
  bodyInput.value = '';
  switchTab('tab-tester');
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
  const url = urlInput.value;
  const headers = getHeaders();
  
  let body;
  try {
    const txt = bodyInput.value.trim();
    body = txt ? JSON.parse(txt) : undefined;
  } catch (e) {
    showError('Invalid JSON in Request Body');
    return;
  }
  
  const oHtml = sendBtn.innerHTML;
  sendBtn.dataset.oHtml = oHtml;
  sendBtn.innerHTML = 'SENDING...';
  sendBtn.disabled = true;
  
  responseSection.classList.add('hidden');
  errorContainer.classList.add('hidden');
  
  vscode.postMessage({
    type: 'sendRequest',
    data: { method, url, baseUrl: baseUrlInput.value.trim(), headers, body }
  });
};

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
  
  const btn = document.getElementById('ai-generate-btn');
  btn.dataset.oHtml = btn.innerHTML;
  btn.innerHTML = '✨ Generating...';
  
  vscode.postMessage({ type: 'generateAIBody', data: { method, url } });
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
    
    const { status, statusText, data, time } = msg.data;
    statusCodeEl.textContent = `${status} ${statusText}`;
    statusCodeEl.className = status >= 400 || status === 'ERROR' ? 'status-red' : 'status-green';
    responseTimeEl.textContent = `${time}ms`;
    
    let displayData = data;
    if (typeof data === 'object') {
      displayData = JSON.stringify(data, null, 2);
    }
    responseBodyEl.textContent = displayData;
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
        sel.innerHTML += `<option value="${msg.data.aiModel}">${msg.data.aiModel}</option>`;
        sel.value = msg.data.aiModel;
      }
    }
    if (msg.data.aiPrompt) document.getElementById('ai-prompt').value = msg.data.aiPrompt;
  }
  
  if (msg.type === 'aiBodyGenerated') {
    const btn = document.getElementById('ai-generate-btn');
    if (btn.dataset.oHtml) btn.innerHTML = btn.dataset.oHtml;
    
    if (msg.data.error) alert("AI Error: " + msg.data.error);
    else if (msg.data.body) bodyInput.value = JSON.stringify(msg.data.body, null, 2);
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
