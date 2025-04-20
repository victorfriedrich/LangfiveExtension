// Fallback if the backend call fails
export const defaultPrefs = {
    preferredLanguage: 'es'
};
function getBackendDefaultLanguage() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_DEFAULT_LANGUAGE' }, (response) => {
            if (chrome.runtime.lastError || !response || !response.language) {
                console.warn('Could not fetch from background:', chrome.runtime.lastError);
                resolve(defaultPrefs.preferredLanguage);
            }
            else {
                resolve(response.language);
            }
        });
    });
}
export function getPrefs(callback) {
    chrome.storage.sync.get(['preferredLanguage'], (result) => {
        if (result.preferredLanguage) {
            callback({
                preferredLanguage: result.preferredLanguage
            });
        }
        else {
            getBackendDefaultLanguage().then((preferredLanguage) => {
                chrome.storage.sync.set({ preferredLanguage });
                callback({ preferredLanguage });
            });
        }
    });
}
export function setPrefs(prefs, callback) {
    chrome.storage.sync.set({ preferredLanguage: prefs.preferredLanguage }, callback);
}
//# sourceMappingURL=prefs.js.map