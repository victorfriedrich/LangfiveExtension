import { getPrefs } from './preferencePopup/prefs';
import { supabase, ensureSupabaseSession } from './supabaseclient';
import { injectCss, injectJs } from './utils';
import { Language } from './preferencePopup/languages';

let prefs: Prefs | null = null;

export type Prefs = {
  sourceLang: Language;
  targetLang: Language;
  hideWords: boolean;
  hideType: 'most-common' | 'all';
  contractions: boolean;
  informal: boolean;
  wordCount: number;
};

// Removed analytics functionality.
function sendCurrentPrefsToInjectedScripts(): void {
  getPrefs((newPrefs) => {
    document.dispatchEvent(new CustomEvent('prefs', { detail: newPrefs }));
    prefs = newPrefs;
  });
}

function determineLanguage(prefs: Prefs): string {
  if(!prefs)
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
    const lang = determineLanguage(prefs!);
    chrome.storage.local.get(['supabaseSession'], async (result) => {
      try {
        await ensureSupabaseSession(result.supabaseSession);
      } catch (error) {
        console.log("Error adding word")
      }
    });
    
  }
}

// Run on page load
window.addEventListener('load', checkForYouTubePage);

window.addEventListener("logout", (event) => {
  chrome.storage.local.remove('supabaseSession', () => {
    if (chrome.runtime.lastError) {
      console.error('Error deleting session:', chrome.runtime.lastError);
    } else {
      console.log('Session deleted successfully');
    }
  });
});

window.addEventListener("message", (event) => {
  // Check if the message is from the expected source
  if (event.source !== window || event.data.source !== "translationPopup") {
    return;
  }

  const { wordId } = event.data.payload;

  if (wordId) {
    console.log("Received from translationPopup:", wordId);
    chrome.storage.local.get(['supabaseSession'], async (result) => {
      try {
        await ensureSupabaseSession(result.supabaseSession);
        addWordToUserwords(wordId);
      } catch (error) {
        console.log("Error adding word")
      }
    });
    // Now you can handle the session and wordId within the content script
    // For example, store session or make further actions
  } else {
    console.error("Invalid data received:", event.data.payload);
  }
});

async function addWordToUserwords(wordId: string): Promise<any> {
  try {
    console.log(supabase.auth.getSession())
    const { data, error } = await supabase.rpc('move_words_to_userwords', {
      _word_ids: [wordId]
    });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error adding words to userwords:', err);
    throw err;
  }
}

