'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, PhraseExtractionService } from '@/lib/supabase'

export default function DebugPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const testSupabaseConnection = async () => {
    try {
      setError('')
      console.log('Testing Supabase connection...')
      
      // Test environment variables first
      console.log('Checking environment variables...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log('Supabase URL:', supabaseUrl || 'MISSING')
      console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'MISSING')
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Environment variables are missing! Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return
      }
      
      // Test the Supabase connection with a very basic test
      console.log('Testing Supabase connection health...')
      
      try {
        // Test 1: Just test the auth status (should be fast)
        console.log('Step 1: Testing auth status...')
        const authPromise = supabase.auth.getUser()
        const authTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timed out')), 3000)
        )
        const authResult = await Promise.race([authPromise, authTimeout])
        console.log('Auth check result:', authResult)
        
        // Test 2: Try to list all tables (this should work even if shows doesn't exist)
        console.log('Step 2: Testing basic connectivity...')
        const connectivityPromise = supabase.rpc('version')
        const connectivityTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connectivity test timed out')), 3000)
        )
        const connectivityResult = await Promise.race([connectivityPromise, connectivityTimeout])
        console.log('Connectivity result:', connectivityResult)
        
        // Test 3: Try querying shows table
        console.log('Step 3: Testing shows table...')
        const showsPromise = supabase.from('shows').select('*').limit(1)
        const showsTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shows query timed out')), 5000)
        )
        const showsResult = await Promise.race([showsPromise, showsTimeout])
        console.log('Shows query result:', showsResult)
        
        setDebugInfo({
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          supabaseKeyPresent: !!supabaseKey,
          authWorking: true,
          connectivityWorking: !connectivityResult.error,
          showsTableExists: !showsResult.error,
          showsData: showsResult.data,
          allTests: 'completed'
        })
        
      } catch (specificError) {
        console.error('Specific test failed:', specificError)
        setError(`Connection test failed: ${specificError.message}`)
        setDebugInfo({
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          supabaseKeyPresent: !!supabaseKey,
          failedAt: specificError.message,
          testFailed: true
        })
      }
      
    } catch (err) {
      console.error('Debug test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Supabase Test</h2>
          <button
            onClick={testSupabaseConnection}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Supabase Connection
          </button>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600"><strong>Error:</strong> {error}</p>
            </div>
          )}
          
          {debugInfo && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold mb-2">Debug Results:</h3>
              <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Console Output</h2>
          <p className="text-sm text-gray-600">Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  )
}