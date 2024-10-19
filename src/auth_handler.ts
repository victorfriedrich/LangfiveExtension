import { supabase } from './supabaseclient';

// Attempt to get the session from the URL
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('Error retrieving session from URL:', error.message);
      return;
    }

    if (data.session) {

      chrome.storage.local.set({ supabaseSession: data.session }, () => {
        console.log('Session stored successfully');
      });

      chrome.runtime.sendMessage({
        type: 'AUTH_SUCCESS',
        session: data.session
      }, () => {
        window.close();
      });
    } else {
      console.error('No session data found in the URL.');
    }
  });
