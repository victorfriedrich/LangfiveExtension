import { __awaiter } from "tslib";
import { supabase } from '../supabaseclient';
import { setPrefs, defaultPrefs } from './prefs';
// --- DOM Elements for Logged In View ---
const loggedInPane = document.getElementById('loggedInPane');
const languageButtonsContainer = document.getElementById('languageButtons');
const userInfoEl = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const versionEl = document.getElementById('version');
// --- DOM Elements for Logged Out (Login) View ---
const loggedOutPane = document.getElementById('loggedOutPane');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const loginBtn = document.getElementById('loginBtn');
const timerSpan = document.getElementById('timer');
const mailPrompt = document.getElementById('mailPrompt');
// @ts-ignore
const progressCircle = document.getElementById('progress-circle');
// Set version text from manifest
const extensionVersion = chrome.runtime.getManifest().version;
versionEl.textContent = `v${extensionVersion}`;
// Helper: send message to active tab about prefs update
function sendPrefsUpdate() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var _a;
        if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {
            chrome.tabs.sendMessage(tabs[0].id, { from: 'popup', type: 'PREFS_UPDATED' });
        }
    });
}
// --- Language Buttons Rendering (Logged In View) ---
function renderLanguageButtons(activeLang) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data: languages, error } = yield supabase.rpc('get_available_languages');
            if (error)
                throw error;
            if (!Array.isArray(languages))
                return;
            languageButtonsContainer.innerHTML = '';
            languages.forEach((lang) => {
                const flagUrl = `https://flagcdn.com/${lang}.svg`;
                const languageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang) || lang;
                const btn = document.createElement('div');
                btn.className = 'language-button' + (lang === activeLang ? ' active' : '');
                btn.dataset.lang = lang;
                btn.innerHTML = `<img src="${flagUrl}" width="28px" className="language-flag" alt="${languageName}"><span>${languageName}</span>`;
                btn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                    // Update active button state
                    document.querySelectorAll('.language-button').forEach((el) => el.classList.remove('active'));
                    btn.classList.add('active');
                    try {
                        // Call Supabase RPC to update default language
                        const { error } = yield supabase.rpc('set_user_default_language', { _language: lang });
                        if (error)
                            throw error;
                        // Update local chrome storage prefs and notify content script
                        // @ts-ignore
                        const newPrefs = { preferredLanguage: lang };
                        setPrefs(newPrefs, () => {
                            sendPrefsUpdate();
                        });
                    }
                    catch (err) {
                        console.error('Error setting default language:', err);
                    }
                }));
                languageButtonsContainer.appendChild(btn);
            });
        }
        catch (err) {
            console.error('Error fetching languages:', err);
        }
    });
}
// --- UI Update Based on Authentication ---
function updateUIForSession(session) {
    if (session) {
        // Logged In View
        loggedOutPane.classList.add('hidden');
        loggedInPane.classList.remove('hidden');
        userInfoEl.textContent = session.user.email;
        // @ts-ignore
        supabase.rpc('get_user_default_language').then(({ data, error }) => {
            if (error) {
                console.error('Error getting default language:', error);
                return;
            }
            const activeLang = data || defaultPrefs.preferredLanguage;
            renderLanguageButtons(activeLang);
        });
    }
    else {
        // Logged Out View
        loggedInPane.classList.add('hidden');
        loggedOutPane.classList.remove('hidden');
    }
}
// Listen for auth state changes
// @ts-ignore
supabase.auth.onAuthStateChange((_event, session) => {
    updateUIForSession(session);
});
// Check session on popup load
// @ts-ignore
supabase.auth.getSession().then(({ data: { session } }) => {
    updateUIForSession(session);
});
// --- Login / Magic Link Flow ---
let retryTimer = 60;
let timerInterval = null;
const TOTAL_SECONDS = 60;
function setLoading(loading) {
    loginBtn.disabled = loading;
    if (loading) {
        loginBtn.classList.add('loading');
    }
    else {
        loginBtn.classList.remove('loading');
        // Reset progress circle
        updateProgressCircle(TOTAL_SECONDS);
    }
}
function updateTimerDisplay() {
    timerSpan.textContent = retryTimer.toString();
}
function updateProgressCircle(secondsLeft) {
    // SVG circle has a circumference of 2πr = 2π*9 = ~56.55
    // We use 60 as approx dasharray value for simplicity
    const dashOffset = (secondsLeft / TOTAL_SECONDS) * 60;
    progressCircle.style.strokeDashoffset = dashOffset.toString();
}
function startRetryTimer() {
    if (timerInterval)
        clearInterval(timerInterval);
    retryTimer = 60;
    updateTimerDisplay();
    timerInterval = window.setInterval(() => {
        retryTimer--;
        updateTimerDisplay();
        if (retryTimer <= 0) {
            stopRetryTimer();
        }
    }, 1000);
}
function stopRetryTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    setLoading(false);
}
function sendMagicLink(email) {
    return __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const { error } = yield supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: chrome.runtime.getURL("src/auth_handler.html")
                }
            });
            if (error)
                throw error;
            startRetryTimer();
        }
        catch (err) {
            alert(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    });
}
// Handle login form submission
loginForm.addEventListener('submit', (e) => __awaiter(void 0, void 0, void 0, function* () {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
        alert('Please enter a valid email');
        return;
    }
    yield sendMagicLink(email);
}));
const signUpBtn = document.getElementById('signUpBtn');
signUpBtn.addEventListener('click', () => {
    // Redirect to sign up page or open sign up URL
    // You can modify this URL to point to your sign up page
    window.open('https://lang-nine.vercel.app/', '_blank');
});
document.querySelectorAll('#version').forEach(el => {
    el.textContent = `v${extensionVersion}`;
});
// Logout button event
logoutBtn.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    const { error } = yield supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
}));
//# sourceMappingURL=index.js.map