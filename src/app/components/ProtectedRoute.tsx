'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requireAuth?: boolean
  redirectTo?: string
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireAuth = false,
  redirectTo,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      if (redirectTo) {
        router.push(redirectTo)
      }
      return
    }

    // Check admin requirement
    if (requireAdmin && (!isAuthenticated || !isAdmin)) {
      if (redirectTo) {
        router.push(redirectTo)
      }
      return
    }
  }, [loading, isAuthenticated, isAdmin, requireAuth, requireAdmin, router, redirectTo])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  // Check admin requirement
  if (requireAdmin && (!isAuthenticated || !isAdmin)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireAdmin'>) {
  return (
    <ProtectedRoute requireAdmin={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function AuthenticatedRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireAuth'>) {
  return (
    <ProtectedRoute requireAuth={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}