import { __awaiter } from "tslib";
import { getPrefs } from './preferencePopup/prefs';
import { supabase, ensureSupabaseSession } from './supabaseclient';
import { injectCss, injectJs, logPrefix } from './utils';
import { Readability } from '@mozilla/readability';
import { fetchWords } from './fetchWords';
import { storeWords } from './wordstorage';
let prefs = null;
/**
 * Loads preferences, dispatches them to other parts of the extension,
 * and then checks/refreshes the known words cache.
 */
function sendCurrentPrefsToInjectedScripts() {
    getPrefs((newPrefs) => {
        document.dispatchEvent(new CustomEvent('prefs', { detail: newPrefs }));
        prefs = newPrefs;
        // On every page (not just YouTube) check cache validity.
        checkCacheAndRefreshWords();
    });
}
/**
 * Determines the language string used for known words based on user preferences.
 */
function determineLanguage(prefs) {
    switch (prefs.sourceLang) {
        case 'es':
            return 'spanish';
        case 'it':
            return 'italian';
        case 'de':
            return 'german';
        default:
            return 'spanish';
    }
}
injectCss('src/index.css');
injectCss('src/spinner.css');
injectJs('src/index.js').then(sendCurrentPrefsToInjectedScripts);
/**
 * Uses the existing Supabase RPC function to fetch the user's last update timestamp.
 * This function returns an ISO string timestamp.
 */
function fetchKnownWordsTimestamp() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase.rpc('get_known_words_update_timestamp');
        if (error) {
            throw error;
        }
        // data is expected to be a timestamp (as string)
        return data;
    });
}
/**
 * Checks the locally cached known words timestamp (stored in chrome.storage.local)
 * against the timestamp in Supabase. If the server timestamp is newer (or no local
 * timestamp exists), refresh the known words cache.
 */
function checkCacheAndRefreshWords() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!prefs)
            return;
        const lang = determineLanguage(prefs);
        chrome.storage.local.get(['knownWordsTimestamp', 'supabaseSession'], (result) => __awaiter(this, void 0, void 0, function* () {
            // Verify the session with the updated helper (uses getSession internally)
            try {
                yield ensureSupabaseSession(result.supabaseSession);
            }
            catch (error) {
                console.error("Error ensuring Supabase session:", error);
                return;
            }
            const localTimestamp = result.knownWordsTimestamp
                ? new Date(result.knownWordsTimestamp)
                : null;
            try {
                const serverTimestampStr = yield fetchKnownWordsTimestamp();
                const serverTimestamp = new Date(serverTimestampStr);
                console.log(logPrefix, "Local timestamp:", localTimestamp, "Server timestamp:", serverTimestamp);
                // Refresh cache if no local timestamp or if server timestamp is more recent.
                if (!localTimestamp || serverTimestamp > localTimestamp) {
                    console.log("Cache is outdated. Refreshing known words...");
                    const words = yield fetchWords(lang);
                    const wordsArray = Array.from(words);
                    storeWords(wordsArray, lang);
                    // Update local timestamp.
                    chrome.storage.local.set({ knownWordsTimestamp: serverTimestamp.toISOString() });
                }
                else {
                    console.log("Cache is current.");
                }
            }
            catch (error) {
                console.error("Error checking or updating cache:", error);
            }
        }));
    });
}
function combinedCleanDocument(doc) {
    // Step 1: Remove elements with a fixed set of unwanted selectors.
    const unwantedSelectors = [
        'nav', 'aside', 'footer', 'header', 'form', 'iframe', 'script', 'style', 'noscript',
        '.advertisement', '.ad', '.sidebar', '.related', '.popup'
    ];
    unwantedSelectors.forEach((selector) => {
        doc.querySelectorAll(selector).forEach((el) => el.remove());
    });
    // Step 2: Remove elements that likely belong to footer, privacy, or sitemap sections.
    const additionalSelectors = [
        '[class*="footer"]',
        '[id*="footer"]',
        '[class*="privacy"]',
        '[id*="privacy"]',
        '[class*="sitemap"]',
        '[id*="sitemap"]',
        '[id*="onetrust-consent-sdk"]',
        '[data-e2e*="recommendations-heading"]',
        '[class*="bbc-by8ykd"]'
    ];
    additionalSelectors.forEach((selector) => {
        doc.querySelectorAll(selector).forEach((el) => el.remove());
    });
    return doc;
}
/**
 * Example listener for article extraction.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
        try {
            const docClone = document.cloneNode(true);
            const cleanedDoc = combinedCleanDocument(docClone);
            const reader = new Readability(cleanedDoc);
            const article = reader.parse();
            sendResponse({ article });
        }
        catch (error) {
            console.error('Error extracting article:', error);
            sendResponse({ error: error.message });
        }
        // Indicate an asynchronous response.
        return true;
    }
});
/**
 * Listen for logout events to clear the Supabase session.
 */
document.addEventListener("logout", () => {
    chrome.storage.local.remove('supabaseSession', () => {
        if (chrome.runtime.lastError) {
            console.error('Error deleting session:', chrome.runtime.lastError);
        }
        else {
            console.log('Session deleted successfully');
        }
    });
});
/**
 * Listen for preference changes.
 */
document.addEventListener('prefs', (event) => {
    prefs = event.detail;
    console.log(logPrefix, 'Preferences updated:', prefs);
});
/**
 * Listen for messages from the translation popup.
 * This handles words that the user wants to add to their known words.
 */
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
    }
    else {
        console.error("Invalid data received:", event.data.payload);
    }
});
/**
 * Add a word to the user's known words list via Supabase RPC call.
 * @param wordId The ID of the word to add
 */
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