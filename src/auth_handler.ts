import { supabase } from './supabaseclient';

const loadingState = document.getElementById('loadingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');

// @ts-ignore
function showState(state) {
  loadingState!.style.display = 'none';
  successState!.style.display = 'none';
  errorState!.style.display = 'none';
  state.style.display = 'block';
}

// Attempt to get the session from the URL
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('Error retrieving session from URL:', error.message);
      showState(errorState);
      return;
    }

    if (data.session) {
      // Store session in chrome.storage
      chrome.storage.local.set({ supabaseSession: data.session }, () => {
        console.log('Session stored successfully');
      });

      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'AUTH_SUCCESS',
        session: data.session
      }, () => {
        showState(successState);

        if (window.opener) {
          window.opener.postMessage('auth_success', '*');
        }

        // Close the window after a brief delay to show the success state
        setTimeout(() => window.close(), 1700);
      });
    } else {
      console.error('No session data found in the URL.');
      showState(errorState);
    }
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    showState(errorState);
  });
