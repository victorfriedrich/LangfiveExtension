import tokens from '../textProcessing/tokens.json';
import { Language, languages } from './languages';
import { getPrefs, Prefs, setPrefs } from './prefs';
import { supabase } from '../supabaseclient';

const emailEl = document.querySelector<HTMLInputElement>('#authinfo')!;
const versionEl = document.querySelector<HTMLInputElement>('#version')!;
const commonWordsRangeInputEl = document.querySelector<HTMLInputElement>(
  '.commonWordsRangeInput',
)!;
const sourceLangSelectEl =
  document.querySelector<HTMLSelectElement>('.sourceLangSelect')!;
const targetLangSelectEl =
  document.querySelector<HTMLSelectElement>('.sourceLangSelect')!;
const hideWordsInputEl = document.querySelector<HTMLInputElement>('.commonWordsInput')!;
const hideWordsSectionEl = document.querySelector<HTMLInputElement>('.hideWordsSection')!;
const contractionsWordsInputEl = document.querySelector<HTMLInputElement>(
  '.contractionsWordsInput',
)!;
const informalWordsInputEl =
  document.querySelector<HTMLInputElement>('.informalWordsInput')!;
const fieldsetEl = document.querySelector<HTMLFieldSetElement>('.fieldset')!;
const mostFrequentWordsInputEl = document.querySelector<HTMLInputElement>(
  '.mostFrequentWordsInput',
)!;
const allWordsInputEl = document.querySelector<HTMLInputElement>('.allWordsInputInput')!;
const mostFrequentWordsFieldsetEl = document.querySelector<HTMLFieldSetElement>(
  '.mostFrequentWordsFieldset',
)!;
const wordCountEl = document.querySelector<HTMLElement>('.wordCount')!;
const tabEls = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab'));
const tabContentEls = Array.from(
  document.querySelectorAll<HTMLDivElement>('.tab-content'),
);
const settingsLinkEl = document.querySelector<HTMLAnchorElement>('#settings-link')!;

// Select DOM elements
const loginSection = document.getElementById('login-section') as HTMLElement;
const logoutSection = document.getElementById('logout-section') as HTMLElement;
const loginButton = document.getElementById('login-button') as HTMLButtonElement;
const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;

// Function to update UI based on authentication state
function updateAuthUI(session: any) {
  if (session) {
    console.log(session);
    emailEl.innerHTML = `Signed in as ${session.user.email}`
    loginSection.classList.remove('active');
    logoutSection.classList.add('active');
    // Optionally, display user info
  } else {
    emailEl.innerHTML = 'Sign in to get started'
    logoutSection.classList.remove('active');
    loginSection.classList.add('active');
  }
}

// Listen for authentication state changes
supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});

// Initial check
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
});

// Handle login button click
loginButton.addEventListener('click', () => {
  const authUrl = chrome.runtime.getURL('src/auth.html');
  console.log('Auth URL:', authUrl);
  chrome.tabs.create({ url: authUrl });
});

// Handle logout button click
logoutButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();

  const logoutEvent = new CustomEvent("logout", {
    detail: {
      reason: 'user_initiated',
      timestamp: new Date().toISOString()
    }
  });
  
  window.dispatchEvent(logoutEvent);

  if (error) {
    console.error('Error signing out:', error.message);
  } else {
    console.log('User signed out.');
  }
});

const prefsState = {
  get targetLang(): string {
    return this._targetLang;
  },
  set targetLang(value: string) {
    this._targetLang = value;
    targetLangSelectEl.value = value;
  },

  get sourceLang(): string {
    return this._sourceLang;
  },
  set sourceLang(value: string) {
    this._sourceLang = value;
    sourceLangSelectEl.value = value;
  },

  get hideWords(): boolean {
    return this._hideWords;
  },
  set hideWords(value: boolean) {
    this._hideWords = value;
    hideWordsInputEl.checked = value;
    fieldsetEl.disabled = !value;
    this.updateWordCount();
    hideWordsSectionEl.classList.toggle('hideWordsSectionOpen', value);
  },

  get contractions(): boolean {
    return this._contractions;
  },
  set contractions(value: boolean) {
    this._contractions = value;
    contractionsWordsInputEl.checked = value;
    this.updateWordCount();
  },

  get informal(): boolean {
    return this._informal;
  },
  set informal(value: boolean) {
    this._informal = value;
    informalWordsInputEl.checked = value;
    this.updateWordCount();
  },

  get wordCount(): number {
    return this._wordCount;
  },
  set wordCount(value: number) {
    this._wordCount = value;
    commonWordsRangeInputEl.value = value.toString();
    this.updateWordCount();
  },

  get hideType(): 'most-common' | 'all' {
    return this._hideType;
  },
  set hideType(value: 'most-common' | 'all') {
    this._hideType = value;
    if (value === 'all') {
      allWordsInputEl.checked = true;
      mostFrequentWordsFieldsetEl.disabled = true;
    } else {
      mostFrequentWordsInputEl.checked = true;
      mostFrequentWordsFieldsetEl.disabled = false;
    }
    this.updateWordCount();
  },

  updateWordCount() {
    if (!this.hideWords) {
      wordCountEl.innerHTML = '0';
      return;
    }
    if (this.hideType === 'all') {
      wordCountEl.innerHTML = 'All';
      return;
    }

    wordCountEl.innerHTML = (
      this.wordCount +
      (this.contractions ? tokens.contractions.length : 0) +
      (this.informal ? tokens.informalContractions.length : 0)
    ).toString();
  },
} as Prefs;

function applyPrefs(): void {
  console.log("Fetching prefs")
  getPrefs((storagePrefs) => {
    prefsState.targetLang = storagePrefs.targetLang;
    prefsState.sourceLang = storagePrefs.sourceLang;
    prefsState.contractions = storagePrefs.contractions;
    prefsState.wordCount = storagePrefs.wordCount;
    prefsState.informal = storagePrefs.informal;
    prefsState.hideWords = storagePrefs.hideWords;
    prefsState.hideType = storagePrefs.hideType;
  });
}

function sendPrefsUpdate(): void {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { from: 'popup' }, () => ({}));
    },
  );
}

function savePrefs(): void {
  console.log("Saving prefs")
  setPrefs(prefsState, sendPrefsUpdate);
}

function addLanguages(): void {
  Object.entries(languages)
    .sort(([, value1], [, value2]) => {
      if (value1 < value2) return -1;
      if (value1 > value2) return 1;
      return 0;
    })
    .forEach(([key, value]) => {
      targetLangSelectEl.insertAdjacentHTML(
        'beforeend',
        `<option value="${key}">${value}</option>`,
      );
      sourceLangSelectEl.insertAdjacentHTML(
        'beforeend',
        `<option value="${key}">${value}</option>`,
      );
    });
}

function activateTab(tab: 'description' | 'settings'): void {
  tabEls.forEach((el) => el.classList.remove('active'));
  tabEls.find((el) => el.name === tab)?.classList.add('active');
  tabContentEls.forEach((el) => el.classList.remove('active'));
  tabContentEls.find((el) => el.dataset['name'] === tab)?.classList.add('active');

  localStorage.setItem('activeTab', tab);
}

addLanguages();
applyPrefs();
activateTab(
  (localStorage.getItem('activeTab') as 'description' | 'settings' | null) ??
    'description',
);

versionEl.innerHTML = `v${chrome.runtime.getManifest().version}`;

tabEls.forEach((tab) => {
  tab.addEventListener('click', (event: PointerEvent) => {
    const button = event.target as HTMLButtonElement;
    activateTab(button?.name as 'description' | 'settings');
  });
});

settingsLinkEl.addEventListener('click', () => {
  activateTab('settings');
});

sourceLangSelectEl.addEventListener('change', (event: Event) => {
  prefsState.sourceLang = (event.target as HTMLInputElement).value as Language;
  savePrefs();
});
targetLangSelectEl.addEventListener('change', (event: Event) => {
  prefsState.targetLang = (event.target as HTMLInputElement).value as Language;
  savePrefs();
});
hideWordsInputEl.addEventListener('change', (event: Event) => {
  prefsState.hideWords = (event.target as HTMLInputElement).checked;
  savePrefs();
});
contractionsWordsInputEl.addEventListener('change', (event: Event) => {
  prefsState.contractions = (event.target as HTMLInputElement).checked;
  savePrefs();
});
informalWordsInputEl.addEventListener('change', (event: Event) => {
  prefsState.informal = (event.target as HTMLInputElement).checked;
  savePrefs();
});
commonWordsRangeInputEl.addEventListener('input', (event: Event) => {
  prefsState.wordCount = parseInt((event.target as HTMLInputElement).value, 10);
});
commonWordsRangeInputEl.addEventListener('change', (event: Event) => {
  prefsState.wordCount = parseInt((event.target as HTMLInputElement).value, 10);
  savePrefs();
});
allWordsInputEl.addEventListener('change', (event: Event) => {
  if ((event.target as HTMLInputElement).checked) {
    prefsState.hideType = 'all';
    savePrefs();
  }
});
mostFrequentWordsInputEl.addEventListener('change', (event: Event) => {
  if ((event.target as HTMLInputElement).checked) {
    prefsState.hideType = 'most-common';
    savePrefs();
  }
});