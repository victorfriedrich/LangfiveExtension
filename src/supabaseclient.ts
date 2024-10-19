import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// @ts-ignore
export async function ensureSupabaseSession(authData) {
    // Check if there is an existing session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error fetching session:', error.message);
        return;
    }

    if (session) {
        console.log('Using existing session:', session);
    } else {
        // Create a new session using the provided access token
        const { access_token, refresh_token } = authData;

        const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
        });

        if (sessionError) {
            console.error('Error creating session:', sessionError.message);
        } else {
            console.log('New session created successfully!');
            console.log(supabase.auth.getSession())
        }
    }
}