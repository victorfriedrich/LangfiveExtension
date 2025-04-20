import { Language } from "./languages";
import { supabase } from "../supabaseclient";

export type Prefs = {
  preferredLanguage: Language;
};

// Fallback if the backend call fails
export const defaultPrefs: Prefs = {
  preferredLanguage: 'es'
};

function getBackendDefaultLanguage(): Promise<Language> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_DEFAULT_LANGUAGE' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.language) {
        console.warn('Could not fetch from background:', chrome.runtime.lastError);
        resolve(defaultPrefs.preferredLanguage);
      } else {
        resolve(response.language as Language);
      }
    });
  });
}

export function getPrefs(callback: (prefs: Prefs) => void) {
  chrome.storage.sync.get(['preferredLanguage'], (result) => {
    if (result.preferredLanguage) {
      callback({
        preferredLanguage: result.preferredLanguage
      });
    } else {
      getBackendDefaultLanguage().then((preferredLanguage) => {
        chrome.storage.sync.set({ preferredLanguage });
        callback({ preferredLanguage });
      });
    }
  });
}

export function setPrefs(prefs: Prefs, callback: () => void) {
  chrome.storage.sync.set({ preferredLanguage: prefs.preferredLanguage }, callback);
}
