"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, User, Upload, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Item {
  _id: string
  title: string
  description: string
  location: string
  imageUrl?: string
  datePosted: string
  postedBy: {
    _id: string
    username: string
    email: string
  }
  status: "active" | "claimed"
}

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimData, setClaimData] = useState({
    message: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsAuthenticated(true)
      fetchCurrentUser()
    }
    fetchItem()
  }, [params.id])

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setCurrentUserId(userData._id)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setItem(data)
      } else {
        setError("Item not found")
      }
    } catch (error) {
      setError("Error loading item")
    } finally {
      setLoading(false)
    }
  }

  const handleClaimChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setClaimData({
      ...claimData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setClaimLoading(true)
    setError("")
    setSuccess("")

    const token = localStorage.getItem("token")
    if (!token) {
      setError("Please login to claim an item")
      setClaimLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append("itemId", params.id)
      formData.append("message", claimData.message)
      if (selectedFile) {
        formData.append("proofImage", selectedFile)
      }

      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Claim submitted successfully! The owner will review your claim.")
        setClaimData({ message: "" })
        setSelectedFile(null)
        setShowClaimForm(false)
      } else {
        setError(data.message || "Failed to submit claim")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setClaimLoading(false)
    }
  }

  const handleLoginRedirect = () => {
    // Create redirect URL to come back to this item's claim section
    const currentUrl = `/item/${params.id}#claim`
    const loginUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`
    router.push(loginUrl)
  }

  const isOwner = currentUserId === item?.postedBy._id

  useEffect(() => {
    // Check if URL has #claim anchor and show claim form
    if (window.location.hash === "#claim" && isAuthenticated && !isOwner && item?.status === "active") {
      setShowClaimForm(true)
    }
  }, [isAuthenticated, isOwner, item])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading item details...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Item not found</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-500">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Items
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Item Details */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {item.imageUrl && (
                  <div className="aspect-video relative overflow-hidden rounded-lg">
                    <img
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-gray-700">{item.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-3" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-3" />
                    <span>Posted on {new Date(item.datePosted).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <User className="h-5 w-5 mr-3" />
                    <span>Posted by {item.postedBy.username}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Claim Form */}
          <div>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {isOwner ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Item</CardTitle>
                  <CardDescription>
                    This is your posted item. You can manage claims from your dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard">
                    <Button className="w-full">Go to Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : item.status === "claimed" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Item Already Claimed</CardTitle>
                  <CardDescription>This item has already been claimed and returned to its owner.</CardDescription>
                </CardHeader>
              </Card>
            ) : !isAuthenticated ? (
              <Card>
                <CardHeader>
                  <CardTitle>Claim This Item</CardTitle>
                  <CardDescription>Please login to claim this item</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={handleLoginRedirect}>
                    Login to Claim
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    {"Don't have an account? "}
                    <Link href="/register" className="text-blue-600 hover:text-blue-500">
                      Sign up
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ) : !showClaimForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Claim This Item</CardTitle>
                  <CardDescription>Think this item belongs to you? Submit a claim with proof.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => setShowClaimForm(true)}>
                    Submit Claim
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card id="claim">
                <CardHeader>
                  <CardTitle>Submit Your Claim</CardTitle>
                  <CardDescription>Provide details and proof that this item belongs to you</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleClaimSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="message">Why do you think this is your item?</Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        value={claimData.message}
                        onChange={handleClaimChange}
                        placeholder="Describe why this item belongs to you, include any unique identifiers..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="proofImage">Upload Proof Image (Optional)</Label>
                      <div className="mt-2">
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="proofImage"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> proof image
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                            <input
                              id="proofImage"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>
                        {selectedFile && <p className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</p>}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowClaimForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={claimLoading}>
                        {claimLoading ? "Submitting..." : "Submit Claim"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
