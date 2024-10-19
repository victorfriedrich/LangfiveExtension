var _a;
import { createClient } from '@supabase/supabase-js';
// Initialize Supabase client
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);
export const extensionSupabaseMagicLink = async (email) => {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: chrome.runtime.getURL("src/auth_handler.html")
            }
        });
        if (error) {
            console.error('Error sending magic link:', error.message);
            return false;
        }
        console.log('Magic link sent successfully v2');
        return true;
    }
    catch (error) {
        console.error('Unexpected error:', error);
        return false;
    }
};
// Assuming you have an input field with id 'email-input'
(_a = document.getElementById('login-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', async () => {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    if (email) {
        const success = await extensionSupabaseMagicLink(email);
        if (success) {
            // You might want to show a message to the user here
            console.log('Please check your email for the magic link');
        }
    }
    else {
        console.error('Please enter a valid email');
    }
});
// You might want to add this function to check the auth state when your extension loads
export const checkAuthState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        console.log('User is signed in:', session.user);
        // Handle signed-in state (e.g., update UI)
    }
    else {
        console.log('No user signed in');
        // Handle signed-out state
    }
};
//# sourceMappingURL=auth.js.map