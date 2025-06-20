import { createClient } from "@supabase/supabase-js"

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

console.log("Supabase config check:", {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "missing",
})

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

// Server-side client with better error handling
export const createServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("Server client config:", {
    hasUrl: !!url,
    hasKey: !!key,
    keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
  })

  if (!url || !key) {
    console.error("Missing Supabase environment variables for server client")
    console.error("Available env vars:", {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })

    // Return a client with placeholder values to prevent crashes
    return createClient("https://placeholder.supabase.co", "placeholder-key")
  }

  try {
    return createClient(url, key)
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw new Error("Failed to create database connection")
  }
}
