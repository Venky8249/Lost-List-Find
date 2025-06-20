import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ADMIN ITEMS API CALLED ===")

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

    console.log("Decoded token for admin items:", decoded)

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

    // Get all items with user details
    const { data: items, error } = await supabase
      .from("items")
      .select(`
        *,
        users!posted_by (
          username,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to fetch items" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Get claim counts for each item
    const itemsWithClaims = await Promise.all(
      (items || []).map(async (item) => {
        try {
          const { count } = await supabase
            .from("claims")
            .select("*", { count: "exact", head: true })
            .eq("item_id", item.id)

          return {
            _id: item.id,
            title: item.title,
            description: item.description,
            location: item.location,
            imageUrl: item.image_url,
            datePosted: item.created_at,
            status: item.status,
            claimsCount: count || 0,
            postedBy: {
              username: item.users?.username || "Unknown",
              email: item.users?.email || "",
            },
          }
        } catch (claimError) {
          console.error("Error fetching claims for item:", item.id, claimError)
          return {
            _id: item.id,
            title: item.title,
            description: item.description,
            location: item.location,
            imageUrl: item.image_url,
            datePosted: item.created_at,
            status: item.status,
            claimsCount: 0,
            postedBy: {
              username: item.users?.username || "Unknown",
              email: item.users?.email || "",
            },
          }
        }
      }),
    )

    console.log("Returning admin items:", itemsWithClaims.length)

    return NextResponse.json(itemsWithClaims, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching admin items:", error)
    return NextResponse.json(
      { message: "Failed to fetch items" },
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
