import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

class LoginForm {
  private form: HTMLFormElement;
  private emailInput: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private mailPrompt: HTMLDivElement;
  private timerSpan: HTMLSpanElement;
  private retryTimer: number = 60;
  private timerInterval: number | null = null;

  constructor() {
    this.form = document.getElementById('login-form') as HTMLFormElement;
    this.emailInput = document.getElementById('email') as HTMLInputElement;
    this.submitButton = document.getElementById('login-btn') as HTMLButtonElement;
    this.mailPrompt = document.getElementById('mail-prompt') as HTMLDivElement;
    this.timerSpan = document.getElementById('timer') as HTMLSpanElement;

    window.addEventListener('message', (event) => {
      if (event.data === 'auth_success') {
        window.close();
      }
    });

    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('open-mail')?.addEventListener('click', () => this.openMail());
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    
    if (!email) {
      alert('Please enter a valid email');
      return;
    }

    this.setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: chrome.runtime.getURL("src/auth_handler.html")
        }
      });

      if (error) throw error;

      this.mailPrompt.classList.remove('hidden');
      this.startRetryTimer();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unexpected error occurred');
      }
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.submitButton.disabled = loading;
    if (loading) {
      this.submitButton.classList.add('loading');
    } else {
      this.submitButton.classList.remove('loading');
    }
  }

  private startRetryTimer() {
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

  private stopRetryTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.setLoading(false);
    this.mailPrompt.classList.add('hidden');
  }

  private updateTimerDisplay() {
    this.timerSpan.textContent = this.retryTimer.toString();
  }

  private openMail() {
    const emailProvider = this.emailInput.value.split('@')[1];
    if (emailProvider === 'gmail.com') {
      window.open('https://mail.google.com', '_blank');
    } else {
      window.open('mailto:', '_blank');
    }
  }
}

// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoginForm();
});

// Check auth state when extension loads
export const checkAuthState = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    console.log('User is signed in:', session.user);
    // Handle signed-in state
  } else {
    console.log('No user signed in');
    // Handle signed-out state
  }
};