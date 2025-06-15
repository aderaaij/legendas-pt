'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'

interface FavoriteButtonProps {
  phraseId: string
  size?: number
  className?: string
}

export function FavoriteButton({ phraseId, size = 16, className = '' }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
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
      await toggleFavorite(phraseId)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const isFaved = isFavorite(phraseId)

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`transition-colors disabled:opacity-50 ${className}`}
      title={isFaved ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={size}
        className={`transition-colors ${
          isFaved
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </button>
  )
}