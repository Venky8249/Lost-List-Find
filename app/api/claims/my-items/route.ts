import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check authentication
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

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: "Invalid token" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Fetching claims for user items:", decoded.userId)

    // Get claims for user's items
    const { data: claims, error } = await supabase
      .from("claims")
      .select(`
        *,
        items!inner (
          id,
          title,
          image_url,
          posted_by
        ),
        users!claimed_by (
          username,
          email
        )
      `)
      .eq("items.posted_by", decoded.userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to fetch claims" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Found claims:", claims?.length || 0)

    // Transform data to match frontend expectations
    const transformedClaims = (claims || []).map((claim) => ({
      _id: claim.id,
      item: {
        _id: claim.items.id,
        title: claim.items.title,
        imageUrl: claim.items.image_url,
      },
      claimedBy: {
        username: claim.users?.username || "Unknown",
        email: claim.users?.email || "",
      },
      message: claim.message,
      proofImageUrl: claim.proof_image_url,
      status: claim.status,
      dateSubmitted: claim.created_at,
    }))

    return NextResponse.json(transformedClaims, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching claims:", error)
    return NextResponse.json(
      { message: "Failed to fetch claims" },
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
