'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { StudyService } from '@/lib/study-service'
import { StudyStats } from '@/types/spaced-repetition'

const panelStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
} as const

export function ProfileStats() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const s = t.profile.stats
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-4 text-xl font-extrabold">{s.heading}</h2>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--surface2)' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-4 text-xl font-extrabold">{s.heading}</h2>
        <div style={{ color: 'var(--accent2)' }}>{s.loadError}</div>
      </div>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-4 text-xl font-extrabold">{s.heading}</h2>
        <div className="py-8 text-center">
          <p className="mb-4" style={{ color: 'var(--muted)' }}>
            {s.emptyTitle}
          </p>
          <p className="text-sm" style={{ color: 'var(--faint)' }}>
            {s.emptyHint(t.episode.startStudy)}
          </p>
        </div>
      </div>
    )
  }

  const accuracyRate =
    stats.totalReviews > 0
      ? (((stats.totalReviews - stats.totalLapses) / stats.totalReviews) * 100).toFixed(1)
      : '0'

  const progressCards = [
    { ...s.cards.total, value: stats.total, color: 'var(--blue)' },
    { ...s.cards.new, value: stats.new, color: 'var(--green)' },
    { ...s.cards.learning, value: stats.learning, color: 'var(--amber)' },
    { ...s.cards.review, value: stats.review, color: 'var(--blue)' },
    { ...s.cards.relearning, value: stats.relearning, color: 'var(--accent2)' },
    { ...s.cards.accuracy, value: `${accuracyRate}%`, color: 'var(--gold)' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-6 text-xl font-extrabold">{s.heading}</h2>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {progressCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[var(--radius)] p-4"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
            >
              <div className="mb-2 h-4 w-4 rounded-full" style={{ background: card.color }} />
              <div className="font-display mb-1 text-2xl">{card.value}</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{card.title}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{card.description}</div>
            </div>
          ))}
        </div>

        {stats.totalReviews > 0 && (
          <div className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <h3 className="mb-4 text-lg font-bold">{s.studyProgress}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-semibold" style={{ color: 'var(--muted)' }}>{s.totalReviews.title}</div>
                <div className="font-display text-2xl">{stats.totalReviews}</div>
                <div className="text-sm" style={{ color: 'var(--faint)' }}>{s.totalReviews.description}</div>
              </div>

              <div className="rounded-[var(--radius)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-semibold" style={{ color: 'var(--muted)' }}>{s.lapses.title}</div>
                <div className="font-display text-2xl">{stats.totalLapses}</div>
                <div className="text-sm" style={{ color: 'var(--faint)' }}>{s.lapses.description}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {stats.review > 0 && (
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{
            background: 'linear-gradient(90deg, rgba(229,9,20,.12), rgba(255,45,59,.06))',
            border: '1px solid rgba(229,9,20,.25)',
          }}
        >
          <h3 className="mb-2 text-lg font-extrabold" style={{ color: 'var(--accent2)' }}>
            {s.readyTitle}
          </h3>
          <p style={{ color: '#e7c2c4' }}>
            {s.readyBefore} <strong style={{ color: 'var(--text)' }}>{stats.review}</strong>{' '}
            {s.readyAfter(stats.review)}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {s.readyHint}
          </p>
        </div>
      )}
    </div>
  )
}
