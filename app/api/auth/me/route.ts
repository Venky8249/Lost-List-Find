import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "No token provided" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: "Invalid token" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", decoded.userId)
      .single()

    if (error || !user) {
      console.error("User lookup error:", error)
      return NextResponse.json(
        { message: "User not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    return NextResponse.json(
      {
        _id: user.id,
        id: user.id,
        username: user.username,
        email: user.email,
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json(
      { message: "Invalid token" },
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// Simple JWT token verification
function verifyToken(token: string): any {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}
