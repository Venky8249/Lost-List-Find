"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, Eye, CheckCircle, XCircle, User, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Item {
  _id: string
  title: string
  description: string
  location: string
  imageUrl?: string
  datePosted: string
  status: "active" | "claimed"
  claimsCount?: number
  postedBy?: {
    username: string
  }
}

interface Claim {
  _id: string
  item: {
    _id: string
    title: string
    imageUrl?: string
  }
  claimedBy: {
    username: string
    email: string
  }
  proofImageUrl?: string
  message: string
  status: "pending" | "approved" | "rejected"
  dateSubmitted: string
}

export default function DashboardPage() {
  const [myItems, setMyItems] = useState<Item[]>([])
  const [recentItems, setRecentItems] = useState<Item[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ username: string } | null>(null)
  const [error, setError] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    setIsAuthenticated(true)
    fetchUserData()
    fetchMyItems()
    fetchRecentItems()
    fetchMyClaims()
  }, [router])

  const fetchUserData = async () => {
    const token = localStorage.getItem("token")
    try {
      console.log("Fetching user data...")
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("User data response status:", response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log("User data:", userData)
        setUser(userData)
      } else {
        console.error("Failed to fetch user data")
        // Don't set error for user data failure, it's not critical
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      // Don't set error for user data failure, it's not critical
    }
  }

  const fetchMyItems = async () => {
    const token = localStorage.getItem("token")
    try {
      console.log("Fetching my items...")
      const response = await fetch("/api/items/my-items", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("My items response status:", response.status)
      console.log("My items response headers:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log("My items data:", data)
        setMyItems(Array.isArray(data) ? data : [])
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch my items:", response.status, errorText)

        try {
          const errorData = JSON.parse(errorText)
          console.error("Error data:", errorData)
          if (response.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem("token")
            router.push("/login")
            return
          }
          setError(`Failed to load your items: ${errorData.message || "Unknown error"}`)
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
          setError("Failed to load your items")
        }
      }
    } catch (error) {
      console.error("Error fetching my items:", error)
      setError("Network error loading your items")
    }
  }

  const fetchRecentItems = async () => {
    try {
      console.log("Fetching recent items...")
      const response = await fetch("/api/items")
      console.log("Recent items response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Recent items data:", data)
        // Show all items including claimed ones
        setRecentItems(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch recent items")
        // Don't set error for recent items failure, it's not critical
      }
    } catch (error) {
      console.error("Error fetching recent items:", error)
      // Don't set error for recent items failure, it's not critical
    }
  }

  const fetchMyClaims = async () => {
    const token = localStorage.getItem("token")
    try {
      console.log("Fetching my claims...")
      const response = await fetch("/api/claims/my-items", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("My claims response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("My claims data:", data)
        setClaims(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch claims")
        // Don't set error for claims failure, it's not critical
      }
    } catch (error) {
      console.error("Error fetching claims:", error)
      // Don't set error for claims failure, it's not critical
    } finally {
      setLoading(false)
    }
  }

  const handleClaimAction = async (claimId: string, action: "approve" | "reject") => {
    const token = localStorage.getItem("token")
    try {
      console.log(`${action}ing claim:`, claimId)
      const response = await fetch(`/api/claims/${claimId}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        console.log(`Claim ${action}ed successfully`)
        fetchMyClaims()
        fetchMyItems()
        fetchRecentItems() // Refresh recent items to show updated status
      } else {
        console.error(`Failed to ${action} claim`)
      }
    } catch (error) {
      console.error(`Error ${action}ing claim:`, error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return
    }

    setDeleteLoading(itemId)
    const token = localStorage.getItem("token")

    try {
      console.log("Deleting item:", itemId)
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        console.log("Item deleted successfully")
        // Refresh all data
        fetchMyItems()
        fetchRecentItems()
        fetchMyClaims()
      } else {
        const errorData = await response.json()
        console.error("Failed to delete item:", errorData)
        setError(errorData.message || "Failed to delete item")
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      setError("Network error while deleting item")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Lost & Found
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.username || "User"}</span>
              <Link href="/post-item">
                <Button>Post New Item</Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your lost items and help others find theirs</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError("")
                fetchMyItems()
                fetchRecentItems()
                fetchMyClaims()
              }}
            >
              Retry
            </Button>
          </div>
        )}

        <Tabs defaultValue="recent-items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent-items">Recently Lost Items ({recentItems.length})</TabsTrigger>
            <TabsTrigger value="my-items">My Posted Items ({myItems.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims on My Items ({claims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="recent-items">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Recently Lost Items</h2>
                <Link href="/">
                  <Button variant="outline">View All Items</Button>
                </Link>
              </div>

              {recentItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-4">No lost items posted yet.</p>
                    <Link href="/post-item">
                      <Button>Post the First Item</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentItems.slice(0, 6).map((item) => (
                    <Card
                      key={item._id}
                      className={`overflow-hidden hover:shadow-lg transition-shadow ${item.status === "claimed" ? "opacity-75" : ""}`}
                    >
                      {item.imageUrl && (
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          {item.status === "claimed" && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                              <Badge variant="secondary" className="bg-green-600 text-white">
                                CLAIMED
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {item.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(item.datePosted).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Posted by {item.postedBy?.username || "Unknown"}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link href={`/item/${item._id}`} className="flex-1">
                            <Button className="w-full">View Details</Button>
                          </Link>
                          {item.status === "active" ? (
                            <Link href={`/item/${item._id}#claim`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                Quick Claim
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="outline" className="flex-1" disabled>
                              Already Claimed
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {recentItems.length > 6 && (
                <div className="text-center">
                  <Link href="/">
                    <Button variant="outline">View All {recentItems.length} Items</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-items">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Posted Items</h2>
                <Link href="/post-item">
                  <Button>Post New Item</Button>
                </Link>
              </div>

              {myItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-4">You haven't posted any items yet.</p>
                    <Link href="/post-item">
                      <Button>Post Your First Item</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myItems.map((item) => (
                    <Card key={item._id} className="overflow-hidden">
                      {item.imageUrl && (
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {item.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(item.datePosted).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            {item.claimsCount || 0} claims
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link href={`/item/${item._id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteItem(item._id)}
                            disabled={deleteLoading === item._id}
                            className="px-3"
                          >
                            {deleteLoading === item._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="claims">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Claims on Your Items</h2>

              {claims.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 text-lg">No claims on your items yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <Card key={claim._id}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          {claim.item.imageUrl && (
                            <img
                              src={claim.item.imageUrl || "/placeholder.svg"}
                              alt={claim.item.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{claim.item.title}</h3>
                                <p className="text-gray-600">
                                  Claimed by {claim.claimedBy.username} ({claim.claimedBy.email})
                                </p>
                              </div>
                              <Badge
                                variant={
                                  claim.status === "approved"
                                    ? "default"
                                    : claim.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {claim.status}
                              </Badge>
                            </div>

                            <p className="text-gray-700 mb-3">{claim.message}</p>

                            {claim.proofImageUrl && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Proof Image:</p>
                                <img
                                  src={claim.proofImageUrl || "/placeholder.svg"}
                                  alt="Claim proof"
                                  className="w-32 h-32 object-cover rounded-lg"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-500">
                                Submitted on {new Date(claim.dateSubmitted).toLocaleDateString()}
                              </p>

                              {claim.status === "pending" && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleClaimAction(claim._id, "approve")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleClaimAction(claim._id, "reject")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
