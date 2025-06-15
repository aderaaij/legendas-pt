'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthContextType, AuthUser, UserProfile } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timed out')), 5000)
        )
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any
        console.log('Session result:', { session, error })
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          console.log('User found, fetching profile...')
          const authUser = session.user as AuthUser
          await fetchUserProfile(authUser)
        } else {
          console.log('No session found')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        // Don't hang forever - set loading to false even on error
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session)
        try {
          if (session?.user) {
            const authUser = session.user as AuthUser
            await fetchUserProfile(authUser)
          } else {
            setUser(null)
            setProfile(null)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (authUser: AuthUser) => {
    try {
      console.log('Fetching user profile for:', authUser.id)
      
      // Add timeout to profile fetch
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out')), 3000)
      )
      
      const { data: profileData, error } = await Promise.race([profilePromise, timeoutPromise]) as any
      console.log('Profile fetch result:', { profileData, error })

      if (error) {
        console.error('Error fetching user profile:', error)
        // Still set the user even without profile
        setUser(authUser)
        setProfile(null)
        return
      }

      const userProfile: UserProfile = profileData
      console.log('Setting user profile:', userProfile)
      setUser({ ...authUser, profile: userProfile })
      setProfile(userProfile)
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      // Still set the user even without profile
      setUser(authUser)
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isAuthenticated = !!user

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}