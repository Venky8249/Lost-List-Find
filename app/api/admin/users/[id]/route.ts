import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== ADMIN DELETE USER API CALLED ===")
    console.log("User ID to delete:", params.id)

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

    // First, get the user to check if they exist and get their email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("id", params.id)
      .single()

    if (userError || !user) {
      console.error("User not found:", userError)
      return NextResponse.json(
        { message: "User not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Prevent deletion of main admin
    if (user.email === "gvenky22211@gmail.com") {
      return NextResponse.json(
        { message: "Cannot delete the main admin account" },
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Deleting user:", user.username, user.email)

    // Delete user's claims first (foreign key constraint)
    const { error: claimsError } = await supabase.from("claims").delete().eq("claimedBy", params.id)

    if (claimsError) {
      console.error("Error deleting user claims:", claimsError)
    }

    // Delete user's items (this will cascade delete related claims)
    const { error: itemsError } = await supabase.from("items").delete().eq("postedBy", params.id)

    if (itemsError) {
      console.error("Error deleting user items:", itemsError)
    }

    // Finally, delete the user
    const { error: deleteError } = await supabase.from("users").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json(
        { message: "Failed to delete user" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("User deleted successfully:", user.username)

    return NextResponse.json(
      { message: "User deleted successfully" },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error in delete user API:", error)
    return NextResponse.json(
      { message: "Internal server error" },
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
