/*
PERSISTENT MATTERMOST ONLINE STATUS

CREATED BY @Nightyonlyy
*/

const CHECK_INTERVAL_MINUTES = 2;
const IDLE_THRESHOLD_SECONDS = 60;

const saveCookiesToLocalStorage = (cookies, domain) => {
    let xRequestId = null;
    let userId = null;

    cookies.forEach(cookie => {
        if (cookie.name === 'MMAUTHTOKEN') {
            xRequestId = cookie.value;
        }
        if (cookie.name === 'MMUSERID') {
            userId = cookie.value;
        }
    });

    if (xRequestId && userId) {
        chrome.storage.session.set({ xRequestId, userId, mattermostDomain: domain }, () => {
            console.log('Captured data saved to session storage:', { userId });
        });
    } else {
        console.error('Missing data to save:', { xRequestId, userId });
    }
};

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        if (details.url.includes('/api/v4/users/') && details.requestHeaders) {
            const authHeader = details.requestHeaders.find(h => h.name === 'X-Request-Id');
            if (authHeader) {
                const domain = new URL(details.url).hostname;
                chrome.cookies.getAll({ domain: domain }, (cookies) => {
                    if (cookies && cookies.length > 0) {
                        saveCookiesToLocalStorage(cookies, domain);
                    }
                });
            }
        }
    },
    { urls: ["<all_urls>"], types: ["xmlhttprequest"] },
    ["requestHeaders", "blocking"]
);

const fetchStatus = async (url, headers) => {
    try {
        const response = await fetch(url, { method: "GET", headers, credentials: 'same-origin' });
        if (!response.ok) throw new Error(response.statusText);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return data.status;
        } else {
            throw new Error("Response is not JSON");
        }
    } catch (error) {
        console.error("Error fetching status:", error);
        return null;
    }
};

const updateStatus = async (url, headers, body) => {
    try {
        const response = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body), credentials: 'same-origin' });
        if (!response.ok) throw new Error(response.statusText);
        console.log("Status successfully updated to 'online'");
        return true;
    } catch (error) {
        console.error("Error updating status:", error);
        return false;
    }
};

const checkStatusAlarm = async () => {
    try {
        const state = await chrome.idle.queryState(IDLE_THRESHOLD_SECONDS);
        if (state !== 'active') {
            console.log('User is idle, skipping status check');
            return;
        }

        const storage = await chrome.storage.session.get(["mattermostDomain", "xRequestId", "userId"]);
        const { mattermostDomain, xRequestId, userId } = storage;
        
        if (mattermostDomain && xRequestId && userId) {
            const headers = {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-Request-Id": xRequestId
            };

            const statusUrl = `https://${mattermostDomain}/api/v4/users/${userId}/status`;
            const status = await fetchStatus(statusUrl, headers);
            if (status === "away") {
                await updateStatus(statusUrl, headers, { "user_id": userId, "status": "online" });
            }
        }
    } catch (error) {
        console.error('Error in checkStatusAlarm:', error);
    }
};

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkStatus") {
        checkStatusAlarm();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("checkStatus", { periodInMinutes: CHECK_INTERVAL_MINUTES });
});

chrome.alarms.get("checkStatus", (alarm) => {
    if (!alarm) {
        chrome.alarms.create("checkStatus", { periodInMinutes: CHECK_INTERVAL_MINUTES });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateStatus") {
        checkStatusAlarm().then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
});
