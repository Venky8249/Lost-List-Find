"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkExistingLogin = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          // Verify token is still valid
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const userData = await response.json()
            console.log("Existing valid session found, redirecting...")

            // Redirect based on user role
            if (userData.role === "admin") {
              router.push("/admin")
            } else {
              // Check if there's a redirect URL in the search params
              const redirectTo = searchParams.get("redirect")
              if (redirectTo) {
                router.push(decodeURIComponent(redirectTo))
              } else {
                router.push("/dashboard")
              }
            }
          } else {
            // Token is invalid, remove it
            localStorage.removeItem("token")
          }
        } catch (error) {
          console.error("Error checking existing session:", error)
          // Remove invalid token
          localStorage.removeItem("token")
        }
      }
    }

    checkExistingLogin()
  }, [router, searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("Attempting login with:", { email: formData.email, isAdmin: isAdminLogin })

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      console.log("Login response status:", response.status)
      console.log("Login response headers:", Object.fromEntries(response.headers.entries()))

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse)

        // Check if it's a Cloudflare error
        if (textResponse.includes("cloudflare") || textResponse.includes("500 Internal Server Error")) {
          throw new Error("Database connection error. Please check your internet connection and try again.")
        }

        throw new Error("Server error. Please try again.")
      }

      const data = await response.json()
      console.log("Login response data:", data)

      if (response.ok) {
        localStorage.setItem("token", data.token)
        console.log("Login successful")

        // Check if user is admin and this is admin login
        if (isAdminLogin) {
          if (data.user.role === "admin") {
            console.log("Admin login successful, redirecting to admin dashboard")
            router.push("/admin")
          } else {
            setError("Access denied. Admin credentials required.")
            return
          }
        } else {
          // Regular user login
          if (data.user.role === "admin") {
            // Admin trying to login through regular login
            setError("Please use Admin Login for admin accounts.")
            return
          }

          // Check if there's a redirect URL in the search params
          const redirectTo = searchParams.get("redirect")
          if (redirectTo) {
            console.log("Redirecting to:", redirectTo)
            router.push(decodeURIComponent(redirectTo))
          } else {
            console.log("Redirecting to dashboard")
            router.push("/dashboard")
          }
        }
      } else {
        setError(data.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof Error) {
        if (error.message.includes("Database connection")) {
          setError("Database connection error. Please check your internet connection and try again.")
        } else if (error.message.includes("fetch")) {
          setError("Network error. Please check your connection.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Network error. Please check your connection and try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminLogin = () => {
    setIsAdminLogin(!isAdminLogin)
    setFormData({ email: "", password: "" })
    setError("")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{isAdminLogin ? "Admin Login" : "Welcome Back"}</h2>
          <p className="mt-2 text-gray-600">{isAdminLogin ? "Access admin dashboard" : "Sign in to your account"}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isAdminLogin && <Shield className="h-5 w-5 text-red-600" />}
                  {isAdminLogin ? "Admin Login" : "Login"}
                </CardTitle>
                <CardDescription>
                  {isAdminLogin
                    ? "Enter admin credentials to access system management"
                    : "Enter your credentials to access your account"}
                </CardDescription>
              </div>
              {isAdminLogin && (
                <Badge variant="destructive" className="ml-2">
                  ADMIN
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isAdminLogin ? "Admin email" : "Enter your email"}
                  className={isAdminLogin ? "border-red-200 focus:border-red-500" : ""}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isAdminLogin ? "Admin password" : "Enter your password"}
                  className={isAdminLogin ? "border-red-200 focus:border-red-500" : ""}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className={`w-full ${isAdminLogin ? "bg-red-600 hover:bg-red-700" : ""}`}
                disabled={loading}
              >
                {loading ? "Signing In..." : isAdminLogin ? "Admin Sign In" : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleAdminLogin}
                  className={`w-full ${isAdminLogin ? "border-red-200 text-red-600 hover:bg-red-50" : ""}`}
                >
                  {isAdminLogin ? (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Switch to User Login
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Login
                    </>
                  )}
                </Button>
              </div>

              {!isAdminLogin && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {"Don't have an account? "}
                    <Link href="/register" className="text-blue-600 hover:text-blue-500">
                      Sign up
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
