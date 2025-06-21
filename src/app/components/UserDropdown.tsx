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
        <button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full">
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
          className="min-w-56 bg-white rounded-md border border-gray-200 shadow-lg p-1 z-50"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-sm cursor-pointer outline-none focus:bg-gray-50"
            >
              <User size={16} className="text-gray-500" />
              <div className="flex flex-col">
                <span className="font-medium">Profile</span>
                <span className="text-xs text-gray-500 truncate max-w-40">{user.email}</span>
              </div>
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <>
              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
              <DropdownMenu.Item asChild>
                <Link
                  href="/upload"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-sm cursor-pointer outline-none focus:bg-gray-50"
                >
                  <Upload size={16} className="text-gray-500" />
                  <span>Upload Subtitles</span>
                </Link>
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
          
          <DropdownMenu.Item
            onSelect={onSignOut}
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-sm cursor-pointer outline-none focus:bg-gray-50"
          >
            <LogOut size={16} className="text-gray-500" />
            <span>Sign Out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}