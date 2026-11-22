import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

// Replace these with your Supabase project details.
const SUPABASE_URL = "https://wrarylgjldfmwjpbldrk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ZD7BlNomZgF50VY3xeOHiw_5avvD0pj";

// Shared connection for the website.
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);