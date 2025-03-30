import { __awaiter } from "tslib";
import { getPrefs } from './preferencePopup/prefs';
import { supabase, ensureSupabaseSession } from './supabaseclient';
import { injectCss, injectJs } from './utils';
import { Readability } from '@mozilla/readability';
import { fetchWords } from './fetchWords';
import { storeWords } from './wordstorage';
let prefs = null;
// Removed analytics functionality.
function sendCurrentPrefsToInjectedScripts() {
    getPrefs((newPrefs) => {
        document.dispatchEvent(new CustomEvent('prefs', { detail: newPrefs }));
        prefs = newPrefs;
    });
}
function determineLanguage(prefs) {
    if (!prefs)
        return "spanish";
    switch (prefs.sourceLang) {
        case "es":
            return "spanish";
        case "it":
            return "italian";
        case "de":
            return "german";
    }
    return "spanish";
}
injectCss('src/index.css');
injectCss('src/spinner.css');
injectJs('src/index.js').then(sendCurrentPrefsToInjectedScripts);
function checkForYouTubePage() {
    if (window.location.hostname === 'www.youtube.com' && window.location.pathname === '/watch') {
        const lang = determineLanguage(prefs);
        chrome.storage.local.get(['supabaseSession'], (result) => __awaiter(this, void 0, void 0, function* () {
            console.log(result);
            try {
                yield ensureSupabaseSession(result.supabaseSession);
                chrome.storage.local.get(`knownWords_${lang}`, (result) => {
                    const words = result[`knownWords_${lang}`] || [];
                    if (words.length <= 0) {
                        fetchWords(lang).then((words) => {
                            const wordsArray = Array.from(words);
                            console.log(wordsArray);
                            storeWords(wordsArray, lang);
                        });
                    }
                });
            }
            catch (error) {
                console.log("Error adding word");
            }
        }));
    }
}
// Run on page load
window.addEventListener('load', checkForYouTubePage);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
        try {
            // Clone the document so that we do not modify the live page
            const docClone = document.cloneNode(true);
            const reader = new Readability(docClone);
            const article = reader.parse();
            sendResponse({ article });
        }
        catch (error) {
            console.error('Error extracting article:', error);
            sendResponse({ error: error.message });
        }
        // Return true to indicate asynchronous response if needed
        return true;
    }
});
window.addEventListener("logout", (event) => {
    chrome.storage.local.remove('supabaseSession', () => {
        if (chrome.runtime.lastError) {
            console.error('Error deleting session:', chrome.runtime.lastError);
        }
        else {
            console.log('Session deleted successfully');
        }
    });
});
window.addEventListener("message", (event) => {
    // Check if the message is from the expected source
    if (event.data.source !== "translationPopup") {
        return;
    }
    const { wordId } = event.data.payload;
    if (wordId) {
        console.log("Received from translationPopup:", wordId);
        chrome.storage.local.get(['supabaseSession'], (result) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield ensureSupabaseSession(result.supabaseSession);
                addWordToUserwords(wordId);
            }
            catch (error) {
                console.log("Error adding word");
            }
        }));
        // Now you can handle the session and wordId within the content script
        // For example, store session or make further actions
    }
    else {
        console.error("Invalid data received:", event.data.payload);
    }
});
function addWordToUserwords(wordId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(supabase.auth.getSession());
            const { data, error } = yield supabase.rpc('move_words_to_userwords', {
                _word_ids: [wordId]
            });
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            return data;
        }
        catch (err) {
            console.error('Error adding words to userwords:', err);
            throw err;
        }
    });
}
//# sourceMappingURL=contentScript.js.map