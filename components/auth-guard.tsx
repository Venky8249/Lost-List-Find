"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = false,
  requireAdmin = false,
  redirectTo = "/login",
}: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        if (requireAuth || requireAdmin) {
          router.push(redirectTo)
          return
        }
        setIsAuthenticated(false)
        return
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setIsAuthenticated(true)
          setUserRole(userData.role)

          // Check admin requirement
          if (requireAdmin && userData.role !== "admin") {
            router.push("/dashboard") // Redirect non-admin users
            return
          }
        } else {
          // Invalid token
          localStorage.removeItem("token")
          if (requireAuth || requireAdmin) {
            router.push(redirectTo)
            return
          }
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        localStorage.removeItem("token")
        if (requireAuth || requireAdmin) {
          router.push(redirectTo)
          return
        }
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [requireAuth, requireAdmin, redirectTo, router])

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
