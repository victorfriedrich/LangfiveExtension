let sessionId;
let os_name;
let os_version;
async function getOrCreateUserId() {
    const result = await chrome.storage.local.get('userId');
    let userId = result.userId;
    if (!userId) {
        userId = self.crypto.randomUUID();
        await chrome.storage.local.set({ userId });
    }
    return userId;
}
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'session') {
        sessionId = crypto.randomUUID();
    }
    if (msg.type === 'view-popup') {
        if (!sessionId) {
            sessionId = crypto.randomUUID();
        }
    }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_SUCCESS') {
        console.log('Received AUTH_SUCCESS message');
        // Store the session data in chrome.storage.local
        chrome.storage.local.set({ supabaseSession: message.session }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error storing session:', chrome.runtime.lastError);
            }
            else {
                console.log('Session stored successfully');
            }
        });
        // Optionally, you can send a response back to the auth handler
        sendResponse({ status: 'received' });
        // If you want to notify other parts of your extension about the successful auth
    }
});
//# sourceMappingURL=backgroundScript.js.map