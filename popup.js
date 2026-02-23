document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scanButton').addEventListener('click', scanMattermost);
    document.getElementById('autoStatusSwitch').addEventListener('change', toggleAutoStatus);

    chrome.storage.session.get(["autoStatusEnabled"], (data) => {
        if (data.autoStatusEnabled) {
            document.getElementById('autoStatusSwitch').checked = true;
            updateStatusLabel(true);
            updateStatus();
        }
    });

    updateUI();
});

const updateUI = () => {
    chrome.storage.session.get(["mattermostDomain", "userId"], (data) => {
        const statusEl = document.getElementById('statusMessage');
        const connectBtn = document.getElementById('scanButton');
        
        if (data.mattermostDomain && data.userId) {
            statusEl.textContent = 'Connected to ' + data.mattermostDomain;
            statusEl.className = 'status-success';
            connectBtn.textContent = 'Reconnect';
        } else {
            statusEl.textContent = 'Not connected';
            statusEl.className = 'status-warning';
            connectBtn.textContent = 'Connect to Mattermost';
        }
    });
}

const showMessage = (message, isError = false) => {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = isError ? 'status-error' : 'status-success';
    setTimeout(() => updateUI(), 3000);
};

async function scanMattermost() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url || !tab.url.startsWith('http')) {
            showMessage('Please open a Mattermost page first', true);
            return;
        }

        const url = new URL(tab.url);
        const mattermostDomain = url.hostname;

        if (!mattermostDomain.includes('mattermost')) {
            showMessage('Please open a Mattermost instance', true);
            return;
        }

        chrome.cookies.getAll({ domain: mattermostDomain }, (cookies) => {
            if (chrome.runtime.lastError) {
                showMessage('Error reading cookies: ' + chrome.runtime.lastError.message, true);
                return;
            }

            let userId = null;
            let xRequestId = null;

            cookies.forEach(cookie => {
                if (cookie.name === 'MMAUTHTOKEN') {
                    xRequestId = cookie.value;
                }
                if (cookie.name === 'MMUSERID') {
                    userId = cookie.value;
                }
            });

            if (userId && xRequestId) {
                chrome.storage.session.set({ mattermostDomain, userId, xRequestId }, () => {
                    showMessage('Successfully connected!');
                    updateUI();
                });
            } else {
                showMessage('Please log in to Mattermost first', true);
            }
        });
    } catch (error) {
        showMessage('Error: ' + error.message, true);
    }
}

function toggleAutoStatus(event) {
    const isChecked = event.target.checked;
    
    chrome.storage.session.set({ autoStatusEnabled: isChecked });
    updateStatusLabel(isChecked);

    if (isChecked) {
        chrome.alarms.create("checkStatus", { periodInMinutes: 1 });
        updateStatus();
    } else {
        chrome.alarms.clear("checkStatus");
    }
}

function updateStatusLabel(isOn) {
    document.getElementById('toggleLabel').textContent = isOn ? 'ON' : 'OFF';
}

function updateStatus() {
    chrome.storage.session.get(["mattermostDomain", "xRequestId", "userId"], async (data) => {
        if (data.mattermostDomain && data.xRequestId && data.userId) {
            try {
                const response = await fetch(`https://${data.mattermostDomain}/api/v4/users/${data.userId}/status`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-Request-Id": data.xRequestId
                    },
                    body: JSON.stringify({
                        "user_id": data.userId,
                        "status": "online"
                    }),
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    console.error("Error updating status:", response.statusText);
                } else {
                    console.log("Status successfully updated to 'online'");
                }
            } catch (error) {
                console.error("Error updating status:", error);
            }
        } else {
            console.error("Missing necessary data to update status.");
        }
    });
}

document.getElementById('viewDataButton').addEventListener('click', () => {
    const scanResult = document.getElementById('scanResult');
    if (scanResult.style.display === 'none' || scanResult.style.display === '') {
      viewStoredData();
      scanResult.style.display = 'block';
      document.body.style.height = 'auto';
    } else {
      scanResult.style.display = 'none';
      document.body.style.height = '300px';
    }
});

const viewStoredData = () => {
    chrome.storage.session.get(["mattermostDomain", "userId", "xRequestId"], (data) => {
        if (data.mattermostDomain && data.userId) {
            const maskedXRequestId = data.xRequestId ? data.xRequestId.substring(0, 8) + '...' : 'Not set';
            
            document.getElementById('scanResult').innerHTML = `
                <strong>Stored Data:</strong><br>
                <span>Domain</span><br>
                <button class="copy-button" id="copyDomain">${escapeHtml(data.mattermostDomain)}</button><br>
                <span>User ID</span><br>
                <button class="copy-button" id="copyUserId">${escapeHtml(data.userId.substring(0, 8))}...</button><br>
            `;
        } else {
            document.getElementById('scanResult').innerHTML = '<p>No data stored</p>';
        }
    });
}

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Copied to clipboard');
    }).catch(err => {
        showMessage('Failed to copy', true);
    });
};
