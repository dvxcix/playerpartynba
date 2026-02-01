import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export function supabaseServer() {
  // Service role key is required for inserts/updates from server routes.
  // Never expose this key to the browser.
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
