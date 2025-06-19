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
        { message: "You can only reject claims for your own items" },
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Update claim status to rejected
    const { error: updateError } = await supabase.from("claims").update({ status: "rejected" }).eq("id", params.id)

    if (updateError) {
      console.error("Error updating claim:", updateError)
      return NextResponse.json(
        { message: "Failed to reject claim" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    return NextResponse.json(
      {
        message: "Claim rejected successfully",
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error rejecting claim:", error)
    return NextResponse.json(
      { message: "Failed to reject claim" },
      {
        status: 500,
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
