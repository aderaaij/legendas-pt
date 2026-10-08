import { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { toTargetLanguage } from '@/lib/i18n/languages'
import ProfilePageClient from './ProfilePageClient'

type Props = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const { meta } = getDictionary(toTargetLanguage(lang)).profile
  return { title: meta.title, description: meta.description }
}

export default function ProfilePage() {
  return <ProfilePageClient />
}
