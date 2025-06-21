'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { StudyService } from '@/lib/study-service'
import { StudyStats } from '@/types/spaced-repetition'

export function ProfileStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        setLoading(true)
        const studyService = new StudyService()
        const userStats = await studyService.getStudyStats(user.id)
        setStats(userStats)
      } catch (err) {
        console.error('Error fetching study stats:', err)
        setError('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Statistics</h2>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Statistics</h2>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Statistics</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">You haven&apos;t started studying any phrases yet.</p>
          <p className="text-sm text-gray-400">
            Visit episode pages and click &quot;Start Study&quot; to begin learning!
          </p>
        </div>
      </div>
    )
  }

  const accuracyRate = stats.totalReviews > 0 
    ? ((stats.totalReviews - stats.totalLapses) / stats.totalReviews * 100).toFixed(1)
    : '0'

  const progressCards = [
    {
      title: 'Total Cards',
      value: stats.total,
      description: 'Phrases studied',
      color: 'bg-blue-500'
    },
    {
      title: 'New Cards',
      value: stats.new,
      description: 'Not yet learned',
      color: 'bg-green-500'
    },
    {
      title: 'Learning',
      value: stats.learning,
      description: 'Currently learning',
      color: 'bg-yellow-500'
    },
    {
      title: 'Review',
      value: stats.review,
      description: 'Ready for review',
      color: 'bg-purple-500'
    },
    {
      title: 'Relearning',
      value: stats.relearning,
      description: 'Need more practice',
      color: 'bg-orange-500'
    },
    {
      title: 'Accuracy',
      value: `${accuracyRate}%`,
      description: 'Success rate',
      color: 'bg-indigo-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-6">Learning Statistics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {progressCards.map((card) => (
            <div key={card.title} className="bg-gray-50 rounded-lg p-4">
              <div className={`w-4 h-4 rounded-full ${card.color} mb-2`}></div>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <div className="text-sm font-medium text-gray-700">{card.title}</div>
              <div className="text-xs text-gray-500">{card.description}</div>
            </div>
          ))}
        </div>

        {stats.totalReviews > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Study Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-lg font-semibold text-gray-700">Total Reviews</div>
                <div className="text-2xl font-bold">{stats.totalReviews}</div>
                <div className="text-sm text-gray-500">Times studied</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-lg font-semibold text-gray-700">Lapses</div>
                <div className="text-2xl font-bold">{stats.totalLapses}</div>
                <div className="text-sm text-gray-500">Cards forgotten</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {stats.review > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Ready to Study!</h3>
          <p className="text-purple-700">
            You have <strong>{stats.review}</strong> card{stats.review !== 1 ? 's' : ''} ready for review.
          </p>
          <p className="text-sm text-purple-600 mt-2">
            Visit any episode page to continue your learning journey.
          </p>
        </div>
      )}
    </div>
  )
}