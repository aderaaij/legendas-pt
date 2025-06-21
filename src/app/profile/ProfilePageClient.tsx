'use client'

import { useAuth } from '@/hooks/useAuth'
import { AuthModal } from '@/app/components/AuthModal'
import { ProfileStats } from '@/app/components/ProfileStats'

export default function ProfilePageClient() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Sign in to view your profile</h1>
        <p className="text-gray-600">Track your learning progress and view detailed statistics.</p>
        <AuthModal />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-gray-600">{user.email}</p>
        </div>
        
        <ProfileStats />
      </div>
    </div>
  )
}