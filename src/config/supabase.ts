import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxnyzuqqhwjbovxpumtf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bnl6dXFxaHdqYm92eHB1bXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTg5MDYsImV4cCI6MjA4NDY3NDkwNn0.OXn1WLtHRYDLQsrbvRqHYLo8wooNTeWAjce7kEp6vmg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
