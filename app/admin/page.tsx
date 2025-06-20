"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, User, Trash2, Shield, LogOut, Eye, Users, UserX, Crown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

interface Item {
  _id: string
  title: string
  description: string
  location: string
  imageUrl?: string
  datePosted: string
  status: "active" | "claimed"
  claimsCount?: number
  postedBy: {
    username: string
    email: string
  }
}

interface AdminUser {
  _id: string
  username: string
  email: string
  role: string
  dateJoined: string
  itemsCount?: number
  claimsCount?: number
}

export default function AdminDashboard() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteUserLoading, setDeleteUserLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [activeTab, setActiveTab] = useState("items")
  const router = useRouter()

  useEffect(() => {
    fetchAllItems()
    fetchAllUsers()
  }, [])

  const fetchAllItems = async () => {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("/api/admin/items", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAllItems(data)
      } else {
        setError("Failed to fetch items")
      }
    } catch (error) {
      console.error("Error fetching items:", error)
      setError("Network error loading items")
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return
    }

    setDeleteLoading(itemId)
    const token = localStorage.getItem("token")

    try {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setSuccess("Item deleted successfully")
        fetchAllItems()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to delete item")
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      setError("Network error while deleting item")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Prevent admin from deleting themselves
    if (userEmail === "gvenky22211@gmail.com") {
      setError("Cannot delete the main admin account")
      setTimeout(() => setError(""), 3000)
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete this user? This will also delete all their posts and claims. This action cannot be undone.`,
      )
    ) {
      return
    }

    setDeleteUserLoading(userId)
    const token = localStorage.getItem("token")

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setSuccess("User deleted successfully")
        fetchAllUsers()
        fetchAllItems() // Refresh items as user's items might be deleted
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      setError("Network error while deleting user")
    } finally {
      setDeleteUserLoading(null)
    }
  }

  const handlePromoteUser = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"
    const action = newRole === "admin" ? "promote to admin" : "demote to user"

    if (!confirm(`Are you sure you want to ${action}?`)) {
      return
    }

    const token = localStorage.getItem("token")

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setSuccess(`User ${action}d successfully`)
        fetchAllUsers()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || `Failed to ${action}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      setError(`Network error while ${action}ing user`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  // Calculate user statistics
  const getUserStats = (userId: string) => {
    const userItems = allItems.filter((item) => item.postedBy.email === allUsers.find((u) => u._id === userId)?.email)
    const itemsCount = userItems.length
    const claimsCount = userItems.reduce((sum, item) => sum + (item.claimsCount || 0), 0)
    return { itemsCount, claimsCount }
  }

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-red-600 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-white mr-3" />
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-white text-red-600">
                  ADMIN: {adminUser?.username}
                </Badge>
                <Link href="/">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-red-600">
                    <Eye className="h-4 w-4 mr-2" />
                    View Site
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-white text-white hover:bg-white hover:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">System Management</h2>
            <p className="text-gray-600">Manage all lost items and user accounts</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{allItems.length}</div>
                <p className="text-sm text-gray-600">
                  {allItems.filter((item) => item.status === "active").length} active,{" "}
                  {allItems.filter((item) => item.status === "claimed").length} claimed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{allUsers.length}</div>
                <p className="text-sm text-gray-600">
                  {allUsers.filter((user) => user.role === "admin").length} admin,{" "}
                  {allUsers.filter((user) => user.role !== "admin").length} regular
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {allItems.reduce((sum, item) => sum + (item.claimsCount || 0), 0)}
                </div>
                <p className="text-sm text-gray-600">Across all items</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
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

          {/* Management Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Items Management
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
            </TabsList>

            {/* Items Management Tab */}
            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    All Lost Items ({allItems.length})
                  </CardTitle>
                  <CardDescription>Manage all lost items posted by users. You can delete any item.</CardDescription>
                </CardHeader>
                <CardContent>
                  {allItems.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No items found in the system.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allItems.map((item) => (
                        <Card key={item._id} className="overflow-hidden border-l-4 border-l-red-500">
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
                                {item.postedBy.username} ({item.postedBy.email})
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Users ({allUsers.length})
                  </CardTitle>
                  <CardDescription>Manage all user accounts. You can promote, demote, or remove users.</CardDescription>
                </CardHeader>
                <CardContent>
                  {allUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No users found in the system.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allUsers.map((user) => {
                        const stats = getUserStats(user._id)
                        const isMainAdmin = user.email === "gvenky22211@gmail.com"

                        return (
                          <Card
                            key={user._id}
                            className={`overflow-hidden border-l-4 ${user.role === "admin" ? "border-l-red-500" : "border-l-blue-500"}`}
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {user.role === "admin" && <Crown className="h-4 w-4 text-red-600" />}
                                    {user.username}
                                  </CardTitle>
                                  <CardDescription>{user.email}</CardDescription>
                                </div>
                                <Badge variant={user.role === "admin" ? "destructive" : "default"}>
                                  {user.role?.toUpperCase() || "USER"}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Joined: {new Date(user.dateJoined).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Eye className="h-4 w-4 mr-2" />
                                  {stats.itemsCount} items posted
                                </div>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  {stats.claimsCount} total claims received
                                </div>
                                {isMainAdmin && (
                                  <div className="flex items-center text-red-600 font-medium">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Main Admin Account
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex gap-2">
                                {!isMainAdmin && (
                                  <>
                                    <Button
                                      variant={user.role === "admin" ? "outline" : "secondary"}
                                      size="sm"
                                      onClick={() => handlePromoteUser(user._id, user.role)}
                                      className="flex-1"
                                    >
                                      {user.role === "admin" ? (
                                        <>
                                          <UserX className="h-4 w-4 mr-1" />
                                          Demote
                                        </>
                                      ) : (
                                        <>
                                          <Crown className="h-4 w-4 mr-1" />
                                          Promote
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user._id, user.email)}
                                      disabled={deleteUserLoading === user._id}
                                      className="px-3"
                                    >
                                      {deleteUserLoading === user._id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </>
                                )}
                                {isMainAdmin && (
                                  <div className="flex-1 text-center py-2 text-sm text-gray-500">Protected Account</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  )
}
