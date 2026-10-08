'use client'

import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { ProfileStats } from '@/app/components/common/ProfileStats'

export default function ProfilePageClient() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <div className="text-lg" style={{ color: 'var(--muted)' }}>{t.common.loading}</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <h1 className="text-2xl font-bold">{t.profile.signInTitle}</h1>
        <p style={{ color: 'var(--muted)' }}>{t.profile.signInBody}</p>
        <p className="text-sm" style={{ color: 'var(--faint)' }}>
          {t.profile.signInHint}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="container mx-auto px-5 py-10 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-display mb-2 text-[40px] uppercase leading-none">
              {t.profile.title}
            </h1>
            <p style={{ color: 'var(--muted)' }}>{user.email}</p>
          </div>

          <ProfileStats />
        </div>
      </div>
    </div>
  )
}
