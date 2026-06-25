'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { StudyService } from '@/lib/study-service'
import { StudyStats } from '@/types/spaced-repetition'

const panelStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
} as const

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
        setError('Não foi possível carregar as estatísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-4 text-xl font-extrabold">Estatísticas de aprendizagem</h2>
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
        <h2 className="mb-4 text-xl font-extrabold">Estatísticas de aprendizagem</h2>
        <div style={{ color: 'var(--accent2)' }}>{error}</div>
      </div>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-4 text-xl font-extrabold">Estatísticas de aprendizagem</h2>
        <div className="py-8 text-center">
          <p className="mb-4" style={{ color: 'var(--muted)' }}>
            Ainda não começaste a estudar nenhuma frase.
          </p>
          <p className="text-sm" style={{ color: 'var(--faint)' }}>
            Abre um episódio e carrega em &quot;Iniciar estudo&quot; para começar!
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
    { title: 'Total de cartões', value: stats.total, description: 'Frases estudadas', color: 'var(--blue)' },
    { title: 'Novas', value: stats.new, description: 'Ainda por aprender', color: 'var(--green)' },
    { title: 'A aprender', value: stats.learning, description: 'Em aprendizagem', color: 'var(--amber)' },
    { title: 'Revisão', value: stats.review, description: 'Prontas para rever', color: 'var(--blue)' },
    { title: 'Reaprender', value: stats.relearning, description: 'Precisam de prática', color: 'var(--accent2)' },
    { title: 'Precisão', value: `${accuracyRate}%`, description: 'Taxa de acerto', color: 'var(--gold)' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] p-6" style={panelStyle}>
        <h2 className="mb-6 text-xl font-extrabold">Estatísticas de aprendizagem</h2>

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
            <h3 className="mb-4 text-lg font-bold">Progresso de estudo</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-semibold" style={{ color: 'var(--muted)' }}>Total de revisões</div>
                <div className="font-display text-2xl">{stats.totalReviews}</div>
                <div className="text-sm" style={{ color: 'var(--faint)' }}>Vezes estudadas</div>
              </div>

              <div className="rounded-[var(--radius)] p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-semibold" style={{ color: 'var(--muted)' }}>Lapsos</div>
                <div className="font-display text-2xl">{stats.totalLapses}</div>
                <div className="text-sm" style={{ color: 'var(--faint)' }}>Cartões esquecidos</div>
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
            Pronto para estudar!
          </h3>
          <p style={{ color: '#e7c2c4' }}>
            Tens <strong style={{ color: 'var(--text)' }}>{stats.review}</strong> cartã
            {stats.review !== 1 ? 'os' : 'o'} para rever.
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Abre qualquer episódio para continuar a tua aprendizagem.
          </p>
        </div>
      )}
    </div>
  )
}
