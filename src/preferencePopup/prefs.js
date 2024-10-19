import { logPrefix } from '../utils';
export const defaultPrefs = {
    sourceLang: 'en',
    targetLang: 'es',
    hideWords: false,
    hideType: 'most-common',
    contractions: true,
    informal: true,
    wordCount: 100,
};
export function getPrefs(callback) {
    chrome.storage.sync.get([
        'sourceLang',
        'targetLang',
        'contractions',
        'wordCount',
        'informal',
        'hideWords',
        'hideType',
    ], (storagePrefs) => {
        var _a, _b, _c, _d, _e, _f, _g;
        callback({
            sourceLang: (_a = storagePrefs.sourceLang) !== null && _a !== void 0 ? _a : defaultPrefs.sourceLang,
            targetLang: (_b = storagePrefs.targetLang) !== null && _b !== void 0 ? _b : defaultPrefs.targetLang,
            contractions: (_c = storagePrefs.contractions) !== null && _c !== void 0 ? _c : defaultPrefs.contractions,
            wordCount: (_d = storagePrefs.wordCount) !== null && _d !== void 0 ? _d : defaultPrefs.wordCount,
            informal: (_e = storagePrefs.informal) !== null && _e !== void 0 ? _e : defaultPrefs.informal,
            hideWords: (_f = storagePrefs.hideWords) !== null && _f !== void 0 ? _f : defaultPrefs.hideWords,
            hideType: (_g = storagePrefs.hideType) !== null && _g !== void 0 ? _g : defaultPrefs.hideType,
        });
    });
}
export function setPrefs(prefs, callback) {
    chrome.storage.sync.set({
        sourceLang: prefs.sourceLang,
        targetLang: prefs.targetLang,
        hideWords: prefs.hideWords,
        contractions: prefs.contractions,
        informal: prefs.informal,
        wordCount: prefs.wordCount,
        hideType: prefs.hideType,
    }, () => {
        console.log(logPrefix, 'Settings saved');
        callback();
    });
}
//# sourceMappingURL=prefs.js.map