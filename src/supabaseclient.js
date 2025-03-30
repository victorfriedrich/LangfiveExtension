import { __awaiter } from "tslib";
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// @ts-ignore
export function ensureSupabaseSession(authData) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if there is an existing session
        const { data: { session }, error } = yield supabase.auth.getSession();
        if (error) {
            console.error('Error fetching session:', error.message);
            return;
        }
        if (session) {
            console.log('Using existing session:', session);
        }
        else {
            // Create a new session using the provided access token
            const { access_token, refresh_token } = authData;
            const { error: sessionError } = yield supabase.auth.setSession({
                access_token,
                refresh_token,
            });
            if (sessionError) {
                console.error('Error creating session:', sessionError.message);
            }
            else {
                console.log('New session created successfully!');
                console.log(supabase.auth.getSession());
            }
        }
    });
}
//# sourceMappingURL=supabaseclient.js.map