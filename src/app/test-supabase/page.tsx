'use client'

import { useState } from 'react'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('')

  const testDirectFetch = async () => {
    try {
      setResult('Testing direct API call...')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      // Test direct REST API call to Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/shows?select=id,name&limit=3`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      setResult(`Direct API response: ${JSON.stringify({ status: response.status, data }, null, 2)}`)
      
    } catch (error) {
      setResult(`Direct API error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Direct Supabase API Test</h1>
        
        <div className="bg-white rounded-lg p-6">
          <button
            onClick={testDirectFetch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            Test Direct REST API Call
          </button>
          
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {result || 'Click the button to test'}
          </pre>
        </div>
      </div>
    </div>
  )
}