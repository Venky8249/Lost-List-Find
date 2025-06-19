import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Find user in database
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error || !user) {
      console.error("User lookup error:", error)
      return NextResponse.json(
        { message: "Invalid email or password" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check password
    const hashedPassword = await hashPassword(password)
    if (hashedPassword !== user.password_hash) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email })

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { message: "Login failed. Please try again." },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// Simple password hashing function (same as register)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + JWT_SECRET)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Simple JWT token generation (same as register)
function generateToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  const signature = btoa(`${header}.${payloadStr}.${JWT_SECRET}`)
  return `${header}.${payloadStr}.${signature}`
}
