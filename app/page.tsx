"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, User } from "lucide-react"
import Link from "next/link"

interface Item {
  _id: string
  title: string
  description: string
  location: string
  imageUrl?: string
  datePosted: string
  postedBy: {
    username: string
  }
  status: "active" | "claimed"
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      console.log("Fetching items from /api/items")
      const response = await fetch("/api/items")
      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Items data:", data)
        // Show all items including claimed ones
        setItems(data)
      } else {
        console.error("Failed to fetch items:", response.status)
        setError("Failed to load items")
      }
    } catch (error) {
      console.error("Error fetching items:", error)
      setError("Network error loading items")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lost items...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Lost & Found</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
              <Link href="/post-item">
                <Button>Post Lost Item</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Recently Lost Items</h2>
          <p className="text-gray-600">Help reunite people with their lost belongings</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No lost items posted yet.</p>
            <Link href="/post-item">
              <Button>Post the First Item</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
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
                      Posted by {item.postedBy.username}
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
      </main>
    </div>
  )
}
