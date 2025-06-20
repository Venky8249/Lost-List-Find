import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { del } from "@vercel/blob"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()

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

    if (!decoded || !decoded.userId || decoded.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Get item details first
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("id, image_url")
      .eq("id", params.id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json(
        { message: "Item not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Delete associated claims first
    const { error: claimsDeleteError } = await supabase.from("claims").delete().eq("item_id", params.id)

    if (claimsDeleteError) {
      console.error("Error deleting claims:", claimsDeleteError)
      return NextResponse.json(
        { message: "Failed to delete associated claims" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Delete the item from database
    const { error: deleteError } = await supabase.from("items").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting item:", deleteError)
      return NextResponse.json(
        { message: "Failed to delete item" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Delete image from Vercel Blob if it exists and is not a placeholder
    if (item.image_url && !item.image_url.includes("placeholder.svg")) {
      try {
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        if (blobToken) {
          await del(item.image_url, { token: blobToken })
          console.log("Image deleted from blob storage:", item.image_url)
        }
      } catch (blobError) {
        console.error("Error deleting image from blob storage:", blobError)
        // Don't fail the entire operation if blob deletion fails
      }
    }

    console.log("Admin deleted item:", params.id)

    return NextResponse.json(
      { message: "Item deleted successfully by admin" },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error deleting item (admin):", error)
    return NextResponse.json(
      { message: "Failed to delete item" },
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
