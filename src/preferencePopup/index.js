var _a;
import tokens from '../textProcessing/tokens.json';
import { languages } from './languages';
import { getPrefs, setPrefs } from './prefs';
import { supabase } from '../supabaseclient';
const emailEl = document.querySelector('#mail');
const versionEl = document.querySelector('#version');
const commonWordsRangeInputEl = document.querySelector('.commonWordsRangeInput');
const sourceLangSelectEl = document.querySelector('.sourceLangSelect');
const targetLangSelectEl = document.querySelector('.targetLangSelect');
const hideWordsInputEl = document.querySelector('.commonWordsInput');
const hideWordsSectionEl = document.querySelector('.hideWordsSection');
const contractionsWordsInputEl = document.querySelector('.contractionsWordsInput');
const informalWordsInputEl = document.querySelector('.informalWordsInput');
const fieldsetEl = document.querySelector('.fieldset');
const mostFrequentWordsInputEl = document.querySelector('.mostFrequentWordsInput');
const allWordsInputEl = document.querySelector('.allWordsInputInput');
const mostFrequentWordsFieldsetEl = document.querySelector('.mostFrequentWordsFieldset');
const wordCountEl = document.querySelector('.wordCount');
const tabEls = Array.from(document.querySelectorAll('.tab'));
const tabContentEls = Array.from(document.querySelectorAll('.tab-content'));
const settingsLinkEl = document.querySelector('#settings-link');
// Select DOM elements
const loginSection = document.getElementById('login-section');
const logoutSection = document.getElementById('logout-section');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
// Function to update UI based on authentication state
function updateAuthUI(session) {
    if (session) {
        console.log(session);
        emailEl.innerHTML = `${session.user.email}`;
        loginSection.classList.remove('active');
        logoutSection.classList.add('active');
        // Optionally, display user info
    }
    else {
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
    }
    else {
        console.log('User signed out.');
    }
});
const prefsState = {
    get targetLang() {
        return this._targetLang;
    },
    set targetLang(value) {
        this._targetLang = value;
        targetLangSelectEl.value = value;
    },
    get sourceLang() {
        return this._sourceLang;
    },
    set sourceLang(value) {
        this._sourceLang = value;
        sourceLangSelectEl.value = value;
    },
    get hideWords() {
        return this._hideWords;
    },
    set hideWords(value) {
        this._hideWords = value;
        hideWordsInputEl.checked = value;
        fieldsetEl.disabled = !value;
        this.updateWordCount();
        hideWordsSectionEl.classList.toggle('hideWordsSectionOpen', value);
    },
    get contractions() {
        return this._contractions;
    },
    set contractions(value) {
        this._contractions = value;
        contractionsWordsInputEl.checked = value;
        this.updateWordCount();
    },
    get informal() {
        return this._informal;
    },
    set informal(value) {
        this._informal = value;
        informalWordsInputEl.checked = value;
        this.updateWordCount();
    },
    get wordCount() {
        return this._wordCount;
    },
    set wordCount(value) {
        this._wordCount = value;
        commonWordsRangeInputEl.value = value.toString();
        this.updateWordCount();
    },
    get hideType() {
        return this._hideType;
    },
    set hideType(value) {
        this._hideType = value;
        if (value === 'all') {
            allWordsInputEl.checked = true;
            mostFrequentWordsFieldsetEl.disabled = true;
        }
        else {
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
        wordCountEl.innerHTML = (this.wordCount +
            (this.contractions ? tokens.contractions.length : 0) +
            (this.informal ? tokens.informalContractions.length : 0)).toString();
    },
};
function applyPrefs() {
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
function sendPrefsUpdate() {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
    }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { from: 'popup' }, () => ({}));
    });
}
function savePrefs() {
    setPrefs(prefsState, sendPrefsUpdate);
}
function addLanguages() {
    Object.entries(languages)
        .sort(([, value1], [, value2]) => {
        if (value1 < value2)
            return -1;
        if (value1 > value2)
            return 1;
        return 0;
    })
        .forEach(([key, value]) => {
        targetLangSelectEl.insertAdjacentHTML('beforeend', `<option value="${key}">${value}</option>`);
        sourceLangSelectEl.insertAdjacentHTML('beforeend', `<option value="${key}">${value}</option>`);
    });
}
function activateTab(tab) {
    var _a, _b;
    tabEls.forEach((el) => el.classList.remove('active'));
    (_a = tabEls.find((el) => el.name === tab)) === null || _a === void 0 ? void 0 : _a.classList.add('active');
    tabContentEls.forEach((el) => el.classList.remove('active'));
    (_b = tabContentEls.find((el) => el.dataset['name'] === tab)) === null || _b === void 0 ? void 0 : _b.classList.add('active');
    localStorage.setItem('activeTab', tab);
}
addLanguages();
applyPrefs();
activateTab((_a = localStorage.getItem('activeTab')) !== null && _a !== void 0 ? _a : 'description');
versionEl.innerHTML = `v${chrome.runtime.getManifest().version}`;
tabEls.forEach((tab) => {
    tab.addEventListener('click', (event) => {
        const button = event.target;
        activateTab(button === null || button === void 0 ? void 0 : button.name);
    });
});
settingsLinkEl.addEventListener('click', () => {
    activateTab('settings');
});
sourceLangSelectEl.addEventListener('change', (event) => {
    prefsState.sourceLang = event.target.value;
    savePrefs();
});
targetLangSelectEl.addEventListener('change', (event) => {
    prefsState.targetLang = event.target.value;
    savePrefs();
});
hideWordsInputEl.addEventListener('change', (event) => {
    prefsState.hideWords = event.target.checked;
    savePrefs();
});
contractionsWordsInputEl.addEventListener('change', (event) => {
    prefsState.contractions = event.target.checked;
    savePrefs();
});
informalWordsInputEl.addEventListener('change', (event) => {
    prefsState.informal = event.target.checked;
    savePrefs();
});
commonWordsRangeInputEl.addEventListener('input', (event) => {
    prefsState.wordCount = parseInt(event.target.value, 10);
});
commonWordsRangeInputEl.addEventListener('change', (event) => {
    prefsState.wordCount = parseInt(event.target.value, 10);
    savePrefs();
});
allWordsInputEl.addEventListener('change', (event) => {
    if (event.target.checked) {
        prefsState.hideType = 'all';
        savePrefs();
    }
});
mostFrequentWordsInputEl.addEventListener('change', (event) => {
    if (event.target.checked) {
        prefsState.hideType = 'most-common';
        savePrefs();
    }
});
//# sourceMappingURL=index.js.map