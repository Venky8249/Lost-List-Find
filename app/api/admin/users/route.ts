import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN USERS API CALLED ===")

    // Check admin authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Authentication required" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    // Check if user is admin (including hardcoded admin)
    const isAdmin =
      decoded &&
      (decoded.role === "admin" || decoded.userId === "admin-user-id" || decoded.email === "gvenky22211@gmail.com")

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Admin access required" },
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const supabase = createServerClient()

    // Try to get all users with role column first
    let { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, role, created_at")
      .order("created_at", { ascending: false })

    // If role column doesn't exist, try without it
    if (error && error.message?.includes("role") && error.message?.includes("does not exist")) {
      console.log("Role column doesn't exist, querying without it")
      const { data: usersWithoutRole, error: errorWithoutRole } = await supabase
        .from("users")
        .select("id, username, email, created_at")
        .order("created_at", { ascending: false })

      if (errorWithoutRole) {
        console.error("Database error:", errorWithoutRole)
        return NextResponse.json(
          { message: "Failed to fetch users" },
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      users =
        usersWithoutRole?.map((user) => ({
          ...user,
          role: user.email === "gvenky22211@gmail.com" ? "admin" : "user",
        })) || []
    } else if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to fetch users" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Add hardcoded admin user if not in database
    const hasAdminUser = users?.some((user) => user.email === "gvenky22211@gmail.com")
    if (!hasAdminUser) {
      users = [
        {
          id: "admin-user-id",
          username: "admin",
          email: "gvenky22211@gmail.com",
          role: "admin",
          created_at: new Date().toISOString(),
        },
        ...(users || []),
      ]
    }

    // Transform data
    const transformedUsers = (users || []).map((user) => ({
      _id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || (user.email === "gvenky22211@gmail.com" ? "admin" : "user"),
      dateJoined: user.created_at,
    }))

    console.log("Returning admin users:", transformedUsers.length)

    return NextResponse.json(transformedUsers, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return NextResponse.json(
      { message: "Failed to fetch users" },
      {
        status: 500,
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
