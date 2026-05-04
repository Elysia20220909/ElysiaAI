const logWindow = document.getElementById('logs');
const shroudBtn = document.getElementById('shroud-btn');
const revealBtn = document.getElementById('reveal-btn');
const shardList = document.getElementById('shard-list');

const API_BASE = 'http://localhost:8000/api/aether';

function addLog(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logWindow.appendChild(div);
    logWindow.scrollTop = logWindow.scrollHeight;
}

async function shroudFile() {
    const fileInput = document.getElementById('video-file');
    const chunkSize = document.getElementById('chunk-size').value;
    const camoType = document.getElementById('camo-type').value;

    if (!fileInput.files[0]) {
        addLog("Error: No file selected.", "error");
        return;
    }

    const file = fileInput.files[0];
    addLog(`Initiating shrouding for ${file.name}...`, "info");
    shroudBtn.disabled = true;
    shroudBtn.textContent = "SHROUDING...";

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chunk_size', chunkSize);
    formData.append('camo_type', camoType);

    try {
        const response = await fetch(`${API_BASE}/shroud`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            addLog(`Shrouding successful! Phantom ID: ${data.phantom_id}`, "success");
            addLog(data.message, "success");
            refreshVault();
        } else {
            addLog(`Error: ${data.detail || 'Failed to shroud'}`, "error");
        }
    } catch (err) {
        addLog(`Network Error: ${err.message}`, "error");
    } finally {
        shroudBtn.disabled = false;
        shroudBtn.textContent = "INITIATE SHROUDING";
    }
}

async function revealFile() {
    const phantomId = document.getElementById('reveal-id').value;
    if (!phantomId) {
        addLog("Error: Phantom ID required.", "error");
        return;
    }

    addLog(`Attempting to materialize Phantom ${phantomId}...`, "info");
    revealBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phantom_id: phantomId })
        });

        const data = await response.json();
        if (response.ok) {
            addLog(`Materialization complete: ${data.path}`, "success");
            addLog(data.message, "success");
        } else {
            addLog(`Error: ${data.detail || 'Failed to materialize'}`, "error");
        }
    } catch (err) {
        addLog(`Network Error: ${err.message}`, "error");
    } finally {
        revealBtn.disabled = false;
    }
}

async function refreshVault() {
    try {
        const response = await fetch(`${API_BASE}/list`);
        const data = await response.json();
        
        shardList.innerHTML = '<div class="card-title" style="margin-top:20px; font-size:1rem;">ACTIVE PHANTOMS</div>';
        
        Object.entries(data.entities).forEach(([id, meta]) => {
            const item = document.createElement('div');
            item.className = 'shard-item';
            item.innerHTML = `
                <span class="shard-name">${meta.original_name}</span>
                <span class="shard-status" style="color:var(--text-secondary)">ID: ${id} | ${meta.fragments.length} Frags</span>
            `;
            item.style.cursor = 'pointer';
            item.onclick = () => {
                document.getElementById('reveal-id').value = id;
                addLog(`Targeting Phantom ${id} for materialization.`, "info");
            };
            shardList.appendChild(item);
        });
    } catch (err) {
        console.error("Failed to fetch vault list", err);
    }
}

shroudBtn.addEventListener('click', shroudFile);
revealBtn.addEventListener('click', revealFile);

// Initial Load
refreshVault();
setInterval(refreshVault, 10000);
