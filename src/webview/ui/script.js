const vscode = acquireVsCodeApi();

// Store suggestions
let allSuggestions = [];
let filteredSuggestions = [];
let selectedIndex = -1;

// Custom Method Dropdown
const methodSelect = document.getElementById('method-select');
const methodTrigger = methodSelect.querySelector('.custom-select-trigger');
const methodOptions = methodSelect.querySelector('.custom-select-options');
const methodInput = document.getElementById('method');
const selectedMethodSpan = document.getElementById('selected-method');

// Toggle method dropdown
methodTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  methodSelect.classList.toggle('open');
  methodOptions.classList.toggle('hidden');
});

// Handle method option selection
methodOptions.querySelectorAll('.custom-select-option').forEach(option => {
  option.addEventListener('click', (e) => {
    e.stopPropagation();
    const value = option.dataset.value;
    
    // Update UI
    selectedMethodSpan.textContent = value;
    methodInput.value = value;
    
    // Update selected state
    methodOptions.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');
    
    // Close dropdown
    methodSelect.classList.remove('open');
    methodOptions.classList.add('hidden');
  });
});

// Close method dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!methodSelect.contains(e.target)) {
    methodSelect.classList.remove('open');
    methodOptions.classList.add('hidden');
  }
});

// Handle messages from extension
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'populate':
      populateRequest(message.data);
      break;
    case 'response':
      displayResponse(message.data);
      break;
    case 'environments':
      updateEnvironments(message.data);
      break;
    case 'suggestions':
      handleSuggestions(message.data);
      break;
  }
});

function populateRequest(data) {
  if (data.method) {
    // Update custom dropdown
    selectedMethodSpan.textContent = data.method;
    methodInput.value = data.method;
    
    // Update selected option
    methodOptions.querySelectorAll('.custom-select-option').forEach(opt => {
      if (opt.dataset.value === data.method) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  }
  if (data.path) {
    document.getElementById('url').value = data.path;
  }
  if (data.body) {
    document.getElementById('body').value = JSON.stringify(data.body, null, 2);
  }
}

function updateEnvironments(config) {
  const select = document.getElementById('environment');
  const baseUrlInput = document.getElementById('baseUrl');
  select.innerHTML = '';

  config.environments.forEach(env => {
    const option = document.createElement('option');
    option.value = env.name;
    option.textContent = `${env.name}`;
    option.dataset.baseUrl = env.baseUrl;
    if (env.name === config.active) {
      option.selected = true;
      baseUrlInput.value = env.baseUrl;
    }
    select.appendChild(option);
  });
}

function sendRequest() {
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value;
  const body = document.getElementById('body').value;
  const environment = document.getElementById('environment').value;
  const baseUrl = document.getElementById('baseUrl').value;

  // Collect headers
  const headers = {};
  document.querySelectorAll('.header-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const value = row.querySelector('.header-value').value.trim();
    if (key) {
      headers[key] = value;
    }
  });

  // Show loading state
  document.getElementById('send-btn').classList.add('loading');
  document.getElementById('send-btn').textContent = 'Sending...';

  vscode.postMessage({
    type: 'sendRequest',
    data: {
      method,
      url,
      body,
      headers,
      environment,
      baseUrl
    }
  });
}

function displayResponse(response) {
  // Remove loading state
  document.getElementById('send-btn').classList.remove('loading');
  document.getElementById('send-btn').textContent = 'Send Request';

  const responseSection = document.getElementById('response-section');
  responseSection.classList.remove('hidden');

  if (response.error) {
    document.getElementById('error-container').classList.remove('hidden');
    document.getElementById('error-message').textContent = response.error;
  } else {
    document.getElementById('error-container').classList.add('hidden');
  }

  const statusCode = document.getElementById('status-code');
  statusCode.textContent = `${response.status} ${response.statusText}`;
  statusCode.className = 'status-code ' + (response.status >= 200 && response.status < 300 ? 'status-success' : 'status-error');

  document.getElementById('response-time').textContent = `${response.time}ms`;
  document.getElementById('response-body').textContent = response.body;
}

function addHeader() {
  const container = document.getElementById('headers-container');
  const row = document.createElement('div');
  row.className = 'header-row';
  row.innerHTML = `
    <input type="text" placeholder="Key" class="header-key" />
    <input type="text" placeholder="Value" class="header-value" />
    <button class="remove-btn" onclick="removeHeader(this)">Remove</button>
  `;
  container.appendChild(row);
}

function removeHeader(btn) {
  btn.parentElement.remove();
}

// Environment change handler
document.getElementById('environment').addEventListener('change', (e) => {
  const selectedOption = e.target.options[e.target.selectedIndex];
  const baseUrlInput = document.getElementById('baseUrl');

  // Update base URL field with the environment's base URL
  if (selectedOption.dataset.baseUrl) {
    baseUrlInput.value = selectedOption.dataset.baseUrl;
  }

  vscode.postMessage({
    type: 'changeEnvironment',
    data: e.target.value
  });
});

// Auto-suggest functionality
const urlInput = document.getElementById('url');
const suggestionsDiv = document.getElementById('autocomplete-suggestions');

function handleSuggestions(suggestions) {
  console.log('[GoHit] handleSuggestions called with:', suggestions);
  allSuggestions = suggestions || [];
  console.log(`[GoHit] Stored ${allSuggestions.length} suggestions`);

  // Immediately show suggestions if URL field has text
  const currentQuery = urlInput.value;
  if (currentQuery) {
    const filtered = filterSuggestions(currentQuery);
    console.log(`[GoHit] Auto-filtering with query "${currentQuery}", found ${filtered.length} matches`);
    showSuggestions(filtered);
  }
}

function filterSuggestions(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return allSuggestions.filter(s =>
    s.path.toLowerCase().includes(lowerQuery) ||
    s.method.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit to top 10 results
}

function showSuggestions(suggestions) {
  filteredSuggestions = suggestions;
  selectedIndex = -1;

  if (suggestions.length === 0) {
    suggestionsDiv.classList.add('hidden');
    return;
  }

  suggestionsDiv.innerHTML = suggestions.map((s, index) => `
    <div class="autocomplete-item" data-index="${index}">
      <span class="autocomplete-method method-${s.method.toLowerCase()}">${s.method}</span>
      <span class="autocomplete-path">${s.path}</span>
      <span class="autocomplete-framework">${s.framework}</span>
    </div>
  `).join('');

  // Add click handlers
  suggestionsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      selectSuggestion(filteredSuggestions[index]);
    });
  });

  suggestionsDiv.classList.remove('hidden');
}

function selectSuggestion(suggestion) {
  if (!suggestion) return;

  urlInput.value = suggestion.path;
  
  // Update custom dropdown
  selectedMethodSpan.textContent = suggestion.method;
  methodInput.value = suggestion.method;
  
  // Update selected option
  methodOptions.querySelectorAll('.custom-select-option').forEach(opt => {
    if (opt.dataset.value === suggestion.method) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });

  // Populate body if example exists
  if (suggestion.bodyExample) {
    const bodyField = document.getElementById('body');
    bodyField.value = JSON.stringify(suggestion.bodyExample, null, 2);
  }

  hideSuggestions();
}

function hideSuggestions() {
  suggestionsDiv.classList.add('hidden');
  selectedIndex = -1;
}

function highlightItem(index) {
  const items = suggestionsDiv.querySelectorAll('.autocomplete-item');
  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// URL input events
urlInput.addEventListener('input', (e) => {
  const query = e.target.value;
  const suggestions = filterSuggestions(query);
  showSuggestions(suggestions);
});

urlInput.addEventListener('focus', (e) => {
  const query = e.target.value;
  if (query) {
    const suggestions = filterSuggestions(query);
    showSuggestions(suggestions);
  }
});

urlInput.addEventListener('keydown', (e) => {
  if (suggestionsDiv.classList.contains('hidden')) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1);
      highlightItem(selectedIndex);
      break;

    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      highlightItem(selectedIndex);
      break;

    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        selectSuggestion(filteredSuggestions[selectedIndex]);
      }
      break;

    case 'Escape':
      e.preventDefault();
      hideSuggestions();
      break;
  }
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    hideSuggestions();
  }
});

// Request initial state
vscode.postMessage({ type: 'ready' });
