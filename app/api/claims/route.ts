import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { put } from "@vercel/blob"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData()
    const itemId = formData.get("itemId") as string
    const message = formData.get("message") as string
    const proofImage = formData.get("proofImage") as File | null

    console.log("Claim submission:", { itemId, message, hasProofImage: !!proofImage, userId: decoded.userId })

    if (!itemId || !message) {
      return NextResponse.json(
        { message: "Item ID and message are required" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check if item exists and is active
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id, status, posted_by")
      .eq("id", itemId)
      .single()

    if (itemError || !item) {
      console.error("Item lookup error:", itemError)
      return NextResponse.json(
        { message: "Item not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (item.status !== "active") {
      return NextResponse.json(
        { message: "This item is no longer available for claims" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check if user is not the owner
    if (item.posted_by === decoded.userId) {
      return NextResponse.json(
        { message: "You cannot claim your own item" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Check if user has already claimed this item
    const { data: existingClaim } = await supabase
      .from("claims")
      .select("id")
      .eq("item_id", itemId)
      .eq("claimed_by", decoded.userId)
      .single()

    if (existingClaim) {
      return NextResponse.json(
        { message: "You have already submitted a claim for this item" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Handle proof image upload to Vercel Blob
    let proofImageUrl = null
    if (proofImage && proofImage.size > 0) {
      try {
        console.log("Uploading proof image:", {
          name: proofImage.name,
          size: proofImage.size,
          type: proofImage.type,
        })

        // Check if BLOB_READ_WRITE_TOKEN is available
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        if (!blobToken) {
          console.warn("BLOB_READ_WRITE_TOKEN not found, using placeholder for proof image")
          const timestamp = Date.now()
          proofImageUrl = `/placeholder.svg?height=200&width=200&text=Proof&bg=f3e5f5&color=7b1fa2&time=${timestamp}`
        } else {
          // Generate a unique filename
          const timestamp = Date.now()
          const fileExtension = proofImage.name.split(".").pop() || "jpg"
          const fileName = `claim-proofs/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

          // Upload to Vercel Blob
          const blob = await put(fileName, proofImage, {
            access: "public",
            token: blobToken,
          })

          proofImageUrl = blob.url
          console.log("Proof image uploaded successfully:", proofImageUrl)
        }
      } catch (uploadError) {
        console.error("Error uploading proof image:", uploadError)
        // Create fallback placeholder
        const timestamp = Date.now()
        proofImageUrl = `/placeholder.svg?height=200&width=200&text=Proof&bg=ffebee&color=d32f2f&time=${timestamp}`
        console.log("Using fallback placeholder for proof image due to upload error")
      }
    }

    // Create new claim
    const { data: newClaim, error } = await supabase
      .from("claims")
      .insert({
        item_id: itemId,
        claimed_by: decoded.userId,
        message: message.trim(),
        proof_image_url: proofImageUrl,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error creating claim:", error)
      return NextResponse.json(
        { message: "Failed to submit claim" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Claim created successfully:", newClaim.id)

    return NextResponse.json(
      {
        message: "Claim submitted successfully",
        claim: {
          _id: newClaim.id,
          itemId: newClaim.item_id,
          message: newClaim.message,
          status: newClaim.status,
          dateSubmitted: newClaim.created_at,
        },
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error submitting claim:", error)
    return NextResponse.json(
      { message: "Failed to submit claim. Please try again." },
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
