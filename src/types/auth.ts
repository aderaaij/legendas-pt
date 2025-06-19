import { User } from '@supabase/supabase-js'

export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuthUser extends User {
  profile?: UserProfile
}

export interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  isAdmin: boolean
  isAuthenticated: boolean
}

export interface UserFavorite {
  id: string
  user_id: string
  phrase_id: string
  created_at: string
}