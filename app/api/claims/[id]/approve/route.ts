import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get claim with item details
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        *,
        items!inner (
          id,
          posted_by
        )
      `)
      .eq("id", params.id)
      .single()

    if (claimError || !claim) {
      console.error("Claim lookup error:", claimError)
      return NextResponse.json(
        { message: "Claim not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check if user owns the item
    if (claim.items.posted_by !== decoded.userId) {
      return NextResponse.json(
        { message: "You can only approve claims for your own items" },
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Update claim status to approved
    const { error: updateClaimError } = await supabase.from("claims").update({ status: "approved" }).eq("id", params.id)

    if (updateClaimError) {
      console.error("Error updating claim:", updateClaimError)
      return NextResponse.json(
        { message: "Failed to approve claim" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Update item status to claimed
    const { error: updateItemError } = await supabase
      .from("items")
      .update({ status: "claimed" })
      .eq("id", claim.item_id)

    if (updateItemError) {
      console.error("Error updating item:", updateItemError)
    }

    return NextResponse.json(
      {
        message: "Claim approved successfully",
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error approving claim:", error)
    return NextResponse.json(
      { message: "Failed to approve claim" },
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
