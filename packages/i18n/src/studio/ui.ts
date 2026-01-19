/**
 * Generate the Studio UI HTML.
 */
export function generateStudioUI(wsPort: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>i18n Studio</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f0f;
      color: #e5e5e5;
      min-height: 100vh;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid #2a2a2a;
      background: #1a1a1a;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header h1::before {
      content: "🌐";
    }

    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .search-input {
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      padding: 8px 12px;
      color: #e5e5e5;
      font-size: 14px;
      width: 250px;
    }

    .search-input:focus {
      outline: none;
      border-color: #5a5a5a;
    }

    .btn {
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      padding: 8px 16px;
      color: #e5e5e5;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn:hover {
      background: #3a3a3a;
    }

    .btn-primary {
      background: #3b82f6;
      border-color: #3b82f6;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #888;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }

    .status-dot.connected {
      background: #22c55e;
    }

    .container {
      padding: 24px;
      overflow-x: auto;
    }

    .grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
    }

    .grid-header {
      display: table-header-group;
    }

    .grid-body {
      display: table-row-group;
    }

    .grid-row {
      display: table-row;
    }

    .grid-row:hover {
      background: #1f1f1f;
    }

    .grid-cell {
      display: table-cell;
      padding: 12px 16px;
      border-bottom: 1px solid #2a2a2a;
      vertical-align: top;
    }

    .grid-header .grid-cell {
      font-weight: 600;
      background: #1a1a1a;
      position: sticky;
      top: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
    }

    .key-cell {
      font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
      font-size: 13px;
      color: #f59e0b;
      min-width: 200px;
    }

    .value-cell {
      min-width: 250px;
    }

    .value-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 6px 8px;
      width: 100%;
      color: #e5e5e5;
      font-size: 14px;
      resize: none;
      min-height: 24px;
    }

    .value-input:hover {
      border-color: #3a3a3a;
    }

    .value-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #1a1a1a;
    }

    .value-input.empty {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .value-input.empty::placeholder {
      color: #ef4444;
    }

    .actions-cell {
      width: 60px;
      text-align: center;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 16px;
    }

    .delete-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #1a1a1a;
      border-top: 1px solid #2a2a2a;
      font-size: 12px;
      color: #888;
    }

    .stats {
      display: flex;
      gap: 16px;
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      align-items: center;
      justify-content: center;
    }

    .modal.open {
      display: flex;
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 24px;
      width: 400px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      color: #888;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      padding: 10px 12px;
      color: #e5e5e5;
      font-size: 14px;
    }

    .form-input:focus {
      outline: none;
      border-color: #5a5a5a;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .interpolation {
      color: #10b981;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>i18n Studio</h1>
    <div class="toolbar">
      <input type="text" class="search-input" id="search" placeholder="Search translations...">
      <button class="btn btn-primary" id="addBtn">+ Add Key</button>
      <div class="status">
        <span class="status-dot" id="statusDot"></span>
        <span id="statusText">Disconnected</span>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="grid" id="grid">
      <div class="grid-header">
        <div class="grid-row" id="headerRow">
          <div class="grid-cell key-cell">Key</div>
        </div>
      </div>
      <div class="grid-body" id="gridBody"></div>
    </div>
    <div class="empty-state" id="emptyState" style="display: none;">
      No translations yet. Click "Add Key" to get started.
    </div>
  </main>

  <footer class="footer">
    <div class="stats">
      <span><strong id="totalKeys">0</strong> keys</span>
      <span><strong id="missingCount">0</strong> missing</span>
    </div>
    <span>@jlnstack/i18n Studio</span>
  </footer>

  <div class="modal" id="addModal">
    <div class="modal-content">
      <h2 class="modal-title">Add Translation Key</h2>
      <div class="form-group">
        <label class="form-label">Key name</label>
        <input type="text" class="form-input" id="newKey" placeholder="e.g. welcomeMessage">
      </div>
      <div id="localeInputs"></div>
      <div class="modal-actions">
        <button class="btn" id="cancelAdd">Cancel</button>
        <button class="btn btn-primary" id="confirmAdd">Add</button>
      </div>
    </div>
  </div>

  <script>
    const API_URL = window.location.origin;
    const WS_URL = \`ws://\${window.location.hostname}:${wsPort}\`;

    let translations = { entries: [], locales: [] };
    let ws = null;
    let searchFilter = "";

    // DOM elements
    const headerRow = document.getElementById("headerRow");
    const gridBody = document.getElementById("gridBody");
    const emptyState = document.getElementById("emptyState");
    const searchInput = document.getElementById("search");
    const addBtn = document.getElementById("addBtn");
    const addModal = document.getElementById("addModal");
    const cancelAdd = document.getElementById("cancelAdd");
    const confirmAdd = document.getElementById("confirmAdd");
    const newKeyInput = document.getElementById("newKey");
    const localeInputs = document.getElementById("localeInputs");
    const totalKeysEl = document.getElementById("totalKeys");
    const missingCountEl = document.getElementById("missingCount");
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    // Initialize
    async function init() {
      await fetchTranslations();
      connectWebSocket();
      render();
    }

    async function fetchTranslations() {
      try {
        const res = await fetch(\`\${API_URL}/api/translations\`);
        const json = await res.json();
        if (json.success) {
          translations = json.data;
        }
      } catch (err) {
        console.error("Failed to fetch translations:", err);
      }
    }

    function connectWebSocket() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        statusDot.classList.add("connected");
        statusText.textContent = "Connected";
      };

      ws.onclose = () => {
        statusDot.classList.remove("connected");
        statusText.textContent = "Disconnected";
        // Reconnect after 2 seconds
        setTimeout(connectWebSocket, 2000);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "sync") {
          translations = message.data;
          render();
        }
      };
    }

    function render() {
      // Update header
      const locales = translations.locales || [];
      headerRow.innerHTML = '<div class="grid-cell key-cell">Key</div>';
      locales.forEach(locale => {
        headerRow.innerHTML += \`<div class="grid-cell">\${locale}</div>\`;
      });
      headerRow.innerHTML += '<div class="grid-cell actions-cell"></div>';

      // Filter entries
      const entries = (translations.entries || []).filter(entry =>
        !searchFilter ||
        entry.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
        Object.values(entry.translations).some(v =>
          v.toLowerCase().includes(searchFilter.toLowerCase())
        )
      );

      // Update grid
      gridBody.innerHTML = "";

      if (entries.length === 0) {
        emptyState.style.display = "block";
        return;
      }

      emptyState.style.display = "none";

      entries.forEach(entry => {
        const row = document.createElement("div");
        row.className = "grid-row";
        row.dataset.key = entry.key;

        let html = \`<div class="grid-cell key-cell">\${escapeHtml(entry.key)}</div>\`;

        locales.forEach(locale => {
          const value = entry.translations[locale] || "";
          const isEmpty = !value;
          html += \`
            <div class="grid-cell value-cell">
              <textarea
                class="value-input \${isEmpty ? "empty" : ""}"
                data-key="\${escapeHtml(entry.key)}"
                data-locale="\${locale}"
                placeholder="Missing translation"
              >\${escapeHtml(value)}</textarea>
            </div>
          \`;
        });

        html += \`
          <div class="grid-cell actions-cell">
            <button class="delete-btn" data-key="\${escapeHtml(entry.key)}" title="Delete">🗑</button>
          </div>
        \`;

        row.innerHTML = html;
        gridBody.appendChild(row);
      });

      // Add event listeners
      gridBody.querySelectorAll(".value-input").forEach(input => {
        input.addEventListener("blur", handleValueChange);
        input.addEventListener("keydown", handleKeydown);
      });

      gridBody.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", handleDelete);
      });

      // Update stats
      let missing = 0;
      entries.forEach(entry => {
        locales.forEach(locale => {
          if (!entry.translations[locale]) missing++;
        });
      });

      totalKeysEl.textContent = entries.length;
      missingCountEl.textContent = missing;
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    async function handleValueChange(event) {
      const input = event.target;
      const key = input.dataset.key;
      const locale = input.dataset.locale;
      const value = input.value;

      try {
        await fetch(\`\${API_URL}/api/translations/\${encodeURIComponent(key)}\`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, value }),
        });

        input.classList.toggle("empty", !value);
      } catch (err) {
        console.error("Failed to update translation:", err);
      }
    }

    function handleKeydown(event) {
      if (event.key === "Tab") {
        event.preventDefault();
        const inputs = Array.from(gridBody.querySelectorAll(".value-input"));
        const currentIndex = inputs.indexOf(event.target);
        const nextIndex = event.shiftKey
          ? (currentIndex - 1 + inputs.length) % inputs.length
          : (currentIndex + 1) % inputs.length;
        inputs[nextIndex].focus();
      }
    }

    async function handleDelete(event) {
      const key = event.target.dataset.key;
      if (!confirm(\`Delete translation key "\${key}"?\`)) return;

      try {
        await fetch(\`\${API_URL}/api/translations/\${encodeURIComponent(key)}\`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete translation:", err);
      }
    }

    // Search
    searchInput.addEventListener("input", (e) => {
      searchFilter = e.target.value;
      render();
    });

    // Add modal
    addBtn.addEventListener("click", () => {
      newKeyInput.value = "";
      localeInputs.innerHTML = "";

      (translations.locales || []).forEach(locale => {
        localeInputs.innerHTML += \`
          <div class="form-group">
            <label class="form-label">\${locale}</label>
            <input type="text" class="form-input locale-input" data-locale="\${locale}">
          </div>
        \`;
      });

      addModal.classList.add("open");
      newKeyInput.focus();
    });

    cancelAdd.addEventListener("click", () => {
      addModal.classList.remove("open");
    });

    confirmAdd.addEventListener("click", async () => {
      const key = newKeyInput.value.trim();
      if (!key) {
        alert("Please enter a key name");
        return;
      }

      const newTranslations = {};
      localeInputs.querySelectorAll(".locale-input").forEach(input => {
        newTranslations[input.dataset.locale] = input.value;
      });

      try {
        await fetch(\`\${API_URL}/api/translations\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, translations: newTranslations }),
        });

        addModal.classList.remove("open");
      } catch (err) {
        console.error("Failed to add translation:", err);
      }
    });

    // Close modal on escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        addModal.classList.remove("open");
      }
    });

    // Initialize
    init();
  </script>
</body>
</html>`;
}
