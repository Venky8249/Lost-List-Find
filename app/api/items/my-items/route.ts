import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    console.log("=== MY ITEMS API CALLED ===")
    const supabase = createServerClient()

    // Check authentication
    const authHeader = request.headers.get("authorization")
    console.log("Auth header:", authHeader ? "Present" : "Missing")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid auth header")
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
    console.log("Decoded token:", decoded ? "Valid" : "Invalid")

    if (!decoded || !decoded.userId) {
      console.log("Invalid token or missing userId")
      return NextResponse.json(
        { message: "Invalid token" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Fetching items for user:", decoded.userId)

    // Get user's items
    const { data: items, error } = await supabase
      .from("items")
      .select("*")
      .eq("posted_by", decoded.userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to fetch your items", error: error.message },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Found items:", items?.length || 0)

    if (!items || items.length === 0) {
      console.log("No items found for user")
      return NextResponse.json([], {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get claim counts for each item
    const itemsWithClaims = await Promise.all(
      items.map(async (item) => {
        try {
          const { count } = await supabase
            .from("claims")
            .select("*", { count: "exact", head: true })
            .eq("item_id", item.id)

          console.log(`Item ${item.id} has ${count || 0} claims`)

          return {
            _id: item.id,
            title: item.title,
            description: item.description,
            location: item.location,
            imageUrl: item.image_url,
            datePosted: item.created_at,
            status: item.status,
            claimsCount: count || 0,
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
          }
        }
      }),
    )

    console.log("Returning items with claims:", itemsWithClaims.length)

    return NextResponse.json(itemsWithClaims, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in my-items API:", error)
    return NextResponse.json(
      { message: "Failed to fetch your items", error: error instanceof Error ? error.message : "Unknown error" },
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
