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

    const { username, email, password } = body

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists with this email" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Simple password hashing (in production, use bcrypt)
    const hashedPassword = await hashPassword(password)

    // Create user in database
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password_hash: hashedPassword,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to create user" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Generate simple JWT token
    const token = generateToken({ userId: newUser.id, email: newUser.email })

    return NextResponse.json(
      {
        message: "User registered successfully",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Registration failed. Please try again." },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// Simple password hashing function
async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt. For now, using a simple hash
  const encoder = new TextEncoder()
  const data = encoder.encode(password + JWT_SECRET)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Simple JWT token generation
function generateToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  const signature = btoa(`${header}.${payloadStr}.${JWT_SECRET}`)
  return `${header}.${payloadStr}.${signature}`
}
