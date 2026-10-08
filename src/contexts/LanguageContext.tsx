'use client'

import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  LANGUAGES,
  LANGUAGE_COOKIE,
  type LanguageInfo,
  type TargetLanguage,
} from '@/lib/i18n/languages'
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries'

interface LanguageContextType {
  /** The selected target language (also the UI chrome language). */
  lang: TargetLanguage
  info: LanguageInfo
  /** UI strings for `lang`. */
  t: Dictionary
  /** Persist a new target language and re-render the current route in it. */
  setLanguage: (lang: TargetLanguage) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  /** From the `[lang]` route segment, which `src/proxy.ts` fills from the cookie. */
  lang: TargetLanguage
  children: ReactNode
}

export function LanguageProvider({ lang, children }: LanguageProviderProps) {
  const router = useRouter()

  const setLanguage = useCallback(
    (next: TargetLanguage) => {
      if (next === lang) return
      document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      // The proxy reads the cookie on the next request; refresh re-renders the
      // current URL under the new [lang] segment and drops the router cache.
      router.refresh()
    },
    [lang, router]
  )

  const value = useMemo(
    () => ({ lang, info: LANGUAGES[lang], t: getDictionary(lang), setLanguage }),
    [lang, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
