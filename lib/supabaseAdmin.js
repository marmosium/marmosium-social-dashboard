import { createClient } from "@supabase/supabase-js";

// DİKKAT: Bu client sadece sunucu tarafında (app/api/... route'ları içinde) import edilmeli.
// Service role key tüm RLS kurallarını atlar, tarayıcıya asla gönderilmemeli.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
