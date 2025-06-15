'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FavoriteButtonProps {
  phraseId: string
  size?: number
  className?: string
  isFavorite: boolean
  onToggleFavorite: (phraseId: string) => Promise<void>
}

export function FavoriteButton({ phraseId, size = 16, className = '', isFavorite, onToggleFavorite }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const [isToggling, setIsToggling] = useState(false)

  if (!isAuthenticated) {
    return null // Don't show favorite button for unauthenticated users
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isToggling) return

    setIsToggling(true)
    try {
      await onToggleFavorite(phraseId)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`transition-colors disabled:opacity-50 ${className}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={size}
        className={`transition-colors ${
          isFavorite
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </button>
  )
}