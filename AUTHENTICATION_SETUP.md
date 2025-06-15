# Authentication Setup for LegendasPT

This guide explains how to set up Supabase authentication with user roles in your LegendasPT application.

## 1. Database Setup

First, run the SQL script in your Supabase SQL editor:

```bash
# Copy and run the contents of supabase-auth-setup.sql in your Supabase dashboard
cat supabase-auth-setup.sql
```

This will create:
- `user_profiles` table with role management
- `user_favorites` table for phrase favorites
- Row Level Security (RLS) policies
- Database functions for role checking
- Triggers for automatic profile creation

## 2. Supabase Configuration

Make sure your environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Authentication Features

### User Roles
- **User**: Can view content and favorite phrases
- **Admin**: Can upload, edit, and manage all content

### Route Protection
- `/upload` - Admin only
- `/[series]/edit` - Admin only  
- `/[series]/[episode]/edit` - Admin only
- All other routes - Public access

### User Features
- Sign up / Sign in
- Favorite phrases (authenticated users only)
- Profile management

## 4. Creating Your First Admin User

1. Sign up normally through the UI
2. In your Supabase dashboard, go to the SQL editor
3. Run this query to make a user an admin:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## 5. Components Available

### Authentication Components
- `<Navigation />` - Shows login/logout state and admin menu
- `<AuthModal />` - Login/signup modal
- `<ProtectedRoute />` - Route protection wrapper
- `<AdminRoute />` - Admin-only route wrapper

### User Features
- `<FavoriteButton />` - Toggle phrase favorites
- `useFavorites()` - Hook for managing favorites
- `useAuth()` - Hook for authentication state

## 6. Usage Examples

### Protecting a route for admins only:
```tsx
import { AdminRoute } from '@/app/components/ProtectedRoute'

export default function AdminOnlyPage() {
  return (
    <AdminRoute redirectTo="/">
      <div>Admin content here</div>
    </AdminRoute>
  )
}
```

### Using authentication state:
```tsx
import { useAuth } from '@/hooks/useAuth'

export default function MyComponent() {
  const { user, isAdmin, isAuthenticated } = useAuth()
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.email}</p>
      ) : (
        <p>Please sign in</p>
      )}
      
      {isAdmin && (
        <button>Admin only button</button>
      )}
    </div>
  )
}
```

### Adding favorite functionality:
```tsx
import { FavoriteButton } from '@/app/components/FavoriteButton'

export default function PhraseCard({ phraseId }: { phraseId: string }) {
  return (
    <div className="phrase-card">
      <FavoriteButton phraseId={phraseId} />
      {/* phrase content */}
    </div>
  )
}
```

## 7. Security Notes

- Row Level Security (RLS) is enabled on all tables
- Admin operations are protected at the database level
- User profiles are automatically created on signup
- Email confirmation is required for new accounts

## 8. Testing Authentication

1. Visit your app and try to access `/upload` (should be redirected)
2. Sign up for a new account
3. Check your email for confirmation
4. After confirming, you should be able to sign in
5. Promote your account to admin in the database
6. Try accessing admin-only routes

The authentication system is now fully functional with role-based access control!