import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { put } from "@vercel/blob"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-12345"

// GET all items (public) - include claimed items
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: items, error } = await supabase
      .from("items")
      .select(`
        *,
        users!posted_by (
          username
        )
      `)
      // Remove status filter to show all items including claimed ones
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

    // Transform data to match frontend expectations
    const transformedItems = (items || []).map((item) => ({
      _id: item.id,
      title: item.title,
      description: item.description,
      location: item.location,
      imageUrl: item.image_url,
      datePosted: item.created_at,
      status: item.status,
      postedBy: {
        username: item.users?.username || "Unknown",
      },
    }))

    return NextResponse.json(transformedItems, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching items:", error)
    return NextResponse.json(
      { message: "Failed to fetch items" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// POST new item (authenticated)
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
    let formData
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error("Error parsing form data:", formError)
      return NextResponse.json(
        { message: "Invalid form data" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const location = formData.get("location") as string
    const image = formData.get("image") as File | null

    if (!title || !description || !location) {
      return NextResponse.json(
        { message: "Title, description, and location are required" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Handle image upload to Vercel Blob
    let imageUrl = null
    if (image && image.size > 0) {
      try {
        console.log("Uploading image:", {
          name: image.name,
          size: image.size,
          type: image.type,
        })

        // Check if BLOB_READ_WRITE_TOKEN is available
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        if (!blobToken) {
          console.warn("BLOB_READ_WRITE_TOKEN not found, using placeholder image")
          // Create a descriptive placeholder instead
          const timestamp = Date.now()
          imageUrl = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(title.substring(0, 30))}&bg=e3f2fd&color=1976d2&time=${timestamp}`
        } else {
          // Generate a unique filename
          const timestamp = Date.now()
          const fileExtension = image.name.split(".").pop() || "jpg"
          const fileName = `lost-items/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

          // Upload to Vercel Blob
          const blob = await put(fileName, image, {
            access: "public",
            token: blobToken,
          })

          imageUrl = blob.url
          console.log("Image uploaded successfully:", imageUrl)
        }
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError)
        // Create fallback placeholder
        const timestamp = Date.now()
        imageUrl = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(title.substring(0, 30))}&bg=ffebee&color=d32f2f&time=${timestamp}`
        console.log("Using fallback placeholder due to upload error")
      }
    }

    // Create new item in database
    const { data: newItem, error } = await supabase
      .from("items")
      .insert({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        image_url: imageUrl,
        posted_by: decoded.userId,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { message: "Failed to create item" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Item created successfully:", {
      id: newItem.id,
      title: newItem.title,
      hasImage: !!newItem.image_url,
      imageUrl: newItem.image_url,
    })

    return NextResponse.json(
      {
        message: "Item posted successfully",
        item: {
          _id: newItem.id,
          title: newItem.title,
          description: newItem.description,
          location: newItem.location,
          imageUrl: newItem.image_url,
          datePosted: newItem.created_at,
          status: newItem.status,
        },
      },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error posting item:", error)
    return NextResponse.json(
      { message: "Failed to post item. Please try again." },
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
