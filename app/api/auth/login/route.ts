import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOGIN API CALLED ===")

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
    console.log("Login attempt for email:", email)

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

    // Check if this is the admin user first (hardcoded check as fallback)
    if (email === "gvenky22211@gmail.com" && password === "222110") {
      console.log("Admin login detected - using hardcoded credentials")
      const token = generateToken({
        userId: "admin-user-id",
        email: email,
        role: "admin",
      })

      return NextResponse.json(
        {
          message: "Admin login successful",
          token,
          user: {
            id: "admin-user-id",
            username: "admin",
            email: email,
            role: "admin",
          },
        },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Create Supabase client with error handling
    let supabase
    try {
      supabase = createServerClient()
      console.log("Supabase client created successfully")
    } catch (supabaseError) {
      console.error("Supabase client creation error:", supabaseError)
      return NextResponse.json(
        { message: "Database connection error. Please try again." },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Find user in database
    let user
    try {
      console.log("Querying database for user:", email)

      // First try to get user with role column
      let { data, error } = await supabase.from("users").select("*").eq("email", email).single()

      // If role column doesn't exist, try without it
      if (error && error.message?.includes("role") && error.message?.includes("does not exist")) {
        console.log("Role column doesn't exist, querying without it")
        const { data: userWithoutRole, error: errorWithoutRole } = await supabase
          .from("users")
          .select("id, username, email, password_hash, created_at, updated_at")
          .eq("email", email)
          .single()

        if (errorWithoutRole) {
          if (errorWithoutRole.code === "PGRST116") {
            // No rows returned
            return NextResponse.json(
              { message: "Invalid email or password" },
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            )
          }
          throw errorWithoutRole
        }

        data = {
          ...userWithoutRole,
          role: userWithoutRole.email === "gvenky22211@gmail.com" ? "admin" : "user",
        }
        error = null
      } else if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return NextResponse.json(
            { message: "Invalid email or password" },
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
        throw error
      }

      user = data
      console.log("User found:", user ? "Yes" : "No")
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { message: "Database error. Please try again." },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check password
    try {
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
    } catch (hashError) {
      console.error("Password hashing error:", hashError)
      return NextResponse.json(
        { message: "Authentication error. Please try again." },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Ensure role is set
    const userRole = user.role || (user.email === "gvenky22211@gmail.com" ? "admin" : "user")

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: userRole,
    })

    console.log("Login successful for user:", user.email, "with role:", userRole)

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: userRole,
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

// Simple password hashing function
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + JWT_SECRET)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  } catch (error) {
    console.error("Hash password error:", error)
    throw new Error("Password hashing failed")
  }
}

// Simple JWT token generation
function generateToken(payload: any): string {
  try {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    // Set token to expire in 30 days instead of 7 days
    const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }))
    const signature = btoa(`${header}.${payloadStr}.${JWT_SECRET}`)
    return `${header}.${payloadStr}.${signature}`
  } catch (error) {
    console.error("Token generation error:", error)
    throw new Error("Token generation failed")
  }
}
