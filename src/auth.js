import { __awaiter } from "tslib";
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);
class LoginForm {
    constructor() {
        this.retryTimer = 60;
        this.timerInterval = null;
        this.form = document.getElementById('login-form');
        this.emailInput = document.getElementById('email');
        this.submitButton = document.getElementById('login-btn');
        this.mailPrompt = document.getElementById('mail-prompt');
        this.timerSpan = document.getElementById('timer');
        window.addEventListener('message', (event) => {
            if (event.data === 'auth_success') {
                window.close();
            }
        });
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        var _a;
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        (_a = document.getElementById('open-mail')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => this.openMail());
    }
    handleSubmit(e) {
        return __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const email = this.emailInput.value.trim();
            if (!email) {
                alert('Please enter a valid email');
                return;
            }
            this.setLoading(true);
            try {
                const { error } = yield supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: chrome.runtime.getURL("src/auth_handler.html")
                    }
                });
                if (error)
                    throw error;
                this.mailPrompt.classList.remove('hidden');
                this.startRetryTimer();
            }
            catch (error) {
                if (error instanceof Error) {
                    alert(error.message);
                }
                else {
                    alert('An unexpected error occurred');
                }
                this.setLoading(false);
            }
        });
    }
    setLoading(loading) {
        this.submitButton.disabled = loading;
        if (loading) {
            this.submitButton.classList.add('loading');
        }
        else {
            this.submitButton.classList.remove('loading');
        }
    }
    startRetryTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.retryTimer = 60;
        this.updateTimerDisplay();
        this.timerInterval = window.setInterval(() => {
            this.retryTimer--;
            this.updateTimerDisplay();
            if (this.retryTimer <= 0) {
                this.stopRetryTimer();
            }
        }, 1000);
    }
    stopRetryTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.setLoading(false);
        this.mailPrompt.classList.add('hidden');
    }
    updateTimerDisplay() {
        this.timerSpan.textContent = this.retryTimer.toString();
    }
    openMail() {
        const emailProvider = this.emailInput.value.split('@')[1];
        if (emailProvider === 'gmail.com') {
            window.open('https://mail.google.com', '_blank');
        }
        else {
            window.open('mailto:', '_blank');
        }
    }
}
// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginForm();
});
// Check auth state when extension loads
export const checkAuthState = () => __awaiter(void 0, void 0, void 0, function* () {
    const { data: { session } } = yield supabase.auth.getSession();
    if (session) {
        console.log('User is signed in:', session.user);
        // Handle signed-in state
    }
    else {
        console.log('No user signed in');
        // Handle signed-out state
    }
});
//# sourceMappingURL=auth.js.map