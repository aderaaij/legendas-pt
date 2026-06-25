'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Avatar } from './Avatar'
import { User, Upload, LogOut } from 'lucide-react'
import Link from 'next/link'

interface UserDropdownProps {
  user: { email?: string } | null
  isAdmin: boolean
  onSignOut: () => void
}

export function UserDropdown({ user, isAdmin, onSignOut }: UserDropdownProps) {
  if (!user || !user.email) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="focus:outline-none rounded-full">
          <Avatar
            email={user.email}
            isAdmin={isAdmin}
            size={32}
            showAdminBadge={true}
            className="hover:opacity-80 transition-opacity"
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-56 rounded-md p-1 z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm cursor-pointer outline-none hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)]"
              style={{ color: 'var(--text)' }}
            >
              <User size={16} style={{ color: 'var(--muted)' }} />
              <div className="flex flex-col">
                <span className="font-medium">Perfil</span>
                <span className="text-xs truncate max-w-40" style={{ color: 'var(--muted)' }}>{user.email}</span>
              </div>
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <>
              <DropdownMenu.Separator className="h-px my-1" style={{ background: 'var(--border)' }} />
              <DropdownMenu.Item asChild>
                <Link
                  href="/upload"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm cursor-pointer outline-none hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)]"
                  style={{ color: 'var(--text)' }}
                >
                  <Upload size={16} style={{ color: 'var(--muted)' }} />
                  <span>Carregar legendas</span>
                </Link>
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="h-px my-1" style={{ background: 'var(--border)' }} />

          <DropdownMenu.Item
            onSelect={onSignOut}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm cursor-pointer outline-none hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)]"
            style={{ color: 'var(--text)' }}
          >
            <LogOut size={16} style={{ color: 'var(--muted)' }} />
            <span>Terminar sessão</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}