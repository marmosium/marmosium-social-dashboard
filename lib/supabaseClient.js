import { createClient } from "@supabase/supabase-js";

// Bu dosya frontend (tarayıcı) tarafında kullanılır — sadece anon key ile,
// asla service role key ile değil.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
