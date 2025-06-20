import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    console.log("=== AUTH ME API CALLED ===")

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

    console.log("Decoded token:", { userId: decoded.userId, email: decoded.email, role: decoded.role })

    // Check if this is the hardcoded admin user
    if (decoded.userId === "admin-user-id" || decoded.email === "gvenky22211@gmail.com") {
      console.log("Hardcoded admin user detected")
      return NextResponse.json(
        {
          _id: "admin-user-id",
          id: "admin-user-id",
          username: "admin",
          email: "gvenky22211@gmail.com",
          role: "admin",
        },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Try to get user from database
    try {
      const supabase = createServerClient()

      // First try to get user with role column
      let { data: user, error } = await supabase
        .from("users")
        .select("id, username, email, role")
        .eq("id", decoded.userId)
        .single()

      // If role column doesn't exist, try without it
      if (error && error.message?.includes("role") && error.message?.includes("does not exist")) {
        console.log("Role column doesn't exist, querying without it")
        const { data: userWithoutRole, error: errorWithoutRole } = await supabase
          .from("users")
          .select("id, username, email")
          .eq("id", decoded.userId)
          .single()

        if (errorWithoutRole || !userWithoutRole) {
          console.error("User lookup error (without role):", errorWithoutRole)
          return NextResponse.json(
            { message: "User not found" },
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        user = {
          ...userWithoutRole,
          role: userWithoutRole.email === "gvenky22211@gmail.com" ? "admin" : "user",
        }
      } else if (error || !user) {
        console.error("User lookup error:", error)
        return NextResponse.json(
          { message: "User not found" },
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Ensure role is set
      const userRole = user.role || (user.email === "gvenky22211@gmail.com" ? "admin" : "user")

      console.log("User found:", { id: user.id, email: user.email, role: userRole })

      return NextResponse.json(
        {
          _id: user.id,
          id: user.id,
          username: user.username,
          email: user.email,
          role: userRole,
        },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (dbError) {
      console.error("Database error:", dbError)

      // If database fails but we have a valid token, return basic user info
      return NextResponse.json(
        {
          _id: decoded.userId,
          id: decoded.userId,
          username: decoded.email?.split("@")[0] || "user",
          email: decoded.email,
          role: decoded.email === "gvenky22211@gmail.com" ? "admin" : "user",
        },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
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

// Update the verifyToken function to handle longer sessions
function verifyToken(token: string): any {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))

    // Check expiration - tokens are valid for 7 days
    if (payload.exp && payload.exp < Date.now()) {
      console.log("Token expired:", new Date(payload.exp), "Current:", new Date())
      return null
    }

    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}
