'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Box,
  Map,
  Play,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useTranslation } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/shared/language-switcher'

const NAV_KEYS = [
  { href: '/', icon: LayoutDashboard, labelKey: 'nav.overview', exact: true },
  { href: '/assets', icon: Box, labelKey: 'nav.assets' },
  { href: '/map', icon: Map, labelKey: 'nav.map' },
  { href: '/simulation', icon: Play, labelKey: 'nav.simulation' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-52'
      } h-full bg-sidebar-bg border-r border-sidebar-border flex flex-col transition-[width] duration-[var(--transition-normal)] shrink-0`}
      role="navigation"
      aria-label={t('sidebar.mainNav')}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Current" width={24} height={24} className="rounded" />
            <span className="text-base font-semibold tracking-tight">Current</span>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <Image src="/logo.png" alt="Current" width={24} height={24} className="rounded" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1 rounded-[var(--radius-sm)] text-muted hover:text-foreground hover:bg-gray-100 transition-colors ${collapsed ? 'mx-auto' : ''}`}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1.5" role="list">
        {NAV_KEYS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`
                relative flex items-center gap-2.5 mx-2 my-0.5 px-2.5 py-2 text-sm rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)]
                ${collapsed ? 'justify-center' : ''}
                ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:bg-gray-100 hover:text-foreground'
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full" />
              )}
              <item.icon size={18} aria-hidden="true" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Language switcher */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <LanguageSwitcher />
        </div>
      )}

      {/* User info */}
      {user && (
        <div className={`border-t border-sidebar-border px-2 py-2 ${collapsed ? '' : 'flex items-center gap-2'}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-1.5 text-muted hover:text-danger rounded-[var(--radius-sm)] hover:bg-danger-light transition-colors"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
            >
              <LogOut size={16} />
            </button>
          ) : (
            <>
              <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                <User size={13} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" title={user.email ?? ''}>{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-muted hover:text-danger rounded-[var(--radius-sm)] hover:bg-danger-light transition-colors"
                aria-label={t('sidebar.logout')}
                title={t('sidebar.logout')}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
