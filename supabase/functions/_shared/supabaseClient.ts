import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { Database } from "./database.types.ts"

// local実行時のみ
// import "https://deno.land/std@0.190.0/dotenv/load.ts";

// 環境変数チェック
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseKey = Deno.env.get("SUPABASE_KEY")
if (!supabaseUrl || !supabaseKey) {
  throw new Error("supabaseの環境変数が設定されていません")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
