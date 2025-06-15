import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserFavorite } from '@/types/auth'

export function useFavorites() {
  const { user, isAuthenticated } = useAuth()
  const [favorites, setFavorites] = useState<UserFavorite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFavorites()
    } else {
      setFavorites([])
    }
  }, [isAuthenticated, user])

  const fetchFavorites = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching favorites:', error)
        return
      }

      setFavorites(data || [])
    } catch (error) {
      console.error('Error in fetchFavorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToFavorites = async (phraseId: string) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          phrase_id: phraseId,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding to favorites:', error)
        return { error }
      }

      setFavorites(prev => [data, ...prev])
      return { data, error: null }
    } catch (error) {
      console.error('Error in addToFavorites:', error)
      return { error }
    }
  }

  const removeFromFavorites = async (phraseId: string) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('phrase_id', phraseId)

      if (error) {
        console.error('Error removing from favorites:', error)
        return { error }
      }

      setFavorites(prev => prev.filter(fav => fav.phrase_id !== phraseId))
      return { error: null }
    } catch (error) {
      console.error('Error in removeFromFavorites:', error)
      return { error }
    }
  }

  const isFavorite = (phraseId: string) => {
    return favorites.some(fav => fav.phrase_id === phraseId)
  }

  const toggleFavorite = async (phraseId: string) => {
    if (isFavorite(phraseId)) {
      return await removeFromFavorites(phraseId)
    } else {
      return await addToFavorites(phraseId)
    }
  }

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  }
}