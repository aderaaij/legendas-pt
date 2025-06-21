import { Metadata } from 'next'
import ProfilePageClient from './ProfilePageClient'

export const metadata: Metadata = {
  title: 'Profile - LegendasPT',
  description: 'User profile and learning statistics',
}

export default function ProfilePage() {
  return <ProfilePageClient />
}