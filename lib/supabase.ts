import { createClient } from "@supabase/supabase-js"

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  console.error("Missing SUPABASE_ANON_KEY environment variable")
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
)

// Server-side client
export const createServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error("Missing Supabase environment variables for server client")
    // Return a client with placeholder values to prevent crashes
    return createClient("https://placeholder.supabase.co", "placeholder-key")
  }

  return createClient(url, key)
}
