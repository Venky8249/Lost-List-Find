"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

export default function PostItemPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Component is now protected by AuthGuard, no need to check auth here
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const token = localStorage.getItem("token")
    if (!token) {
      setError("Please login to post an item")
      setLoading(false)
      return
    }

    try {
      // Create FormData object
      const formDataToSend = new FormData()
      formDataToSend.append("title", formData.title.trim())
      formDataToSend.append("description", formData.description.trim())
      formDataToSend.append("location", formData.location.trim())

      // Only append image if one is selected
      if (selectedFile) {
        formDataToSend.append("image", selectedFile)
      }

      console.log("Sending form data:", {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        hasImage: !!selectedFile,
      })

      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type header when sending FormData
        },
        body: formDataToSend,
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers.get("content-type"))

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse)
        throw new Error("Server returned non-JSON response. Please try again.")
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (response.ok) {
        setSuccess("Item posted successfully!")
        setFormData({ title: "", description: "", location: "" })
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById("image") as HTMLInputElement
        if (fileInput) {
          fileInput.value = ""
        }
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        setError(data.message || "Failed to post item")
      }
    } catch (error) {
      console.error("Error posting item:", error)
      if (error instanceof Error) {
        if (error.message.includes("JSON")) {
          setError("Server error. Please try again in a moment.")
        } else if (error.message.includes("fetch")) {
          setError("Network error. Please check your connection.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Network error. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-500">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Post a Lost Item</CardTitle>
              <CardDescription>Help others find your lost item by providing detailed information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title">Item Title</Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Black iPhone 13, Blue Backpack"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide detailed description including color, brand, distinctive features..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location Lost</Label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Central Park, Main Street Coffee Shop"
                  />
                </div>

                <div>
                  <Label htmlFor="image">Upload Image (Optional)</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input id="image" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                    {selectedFile && <p className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</p>}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Posting Item..." : "Post Lost Item"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
