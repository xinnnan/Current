'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'
  const { t } = useTranslation()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Language switcher */}
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo.png"
              alt="Current"
              width={56}
              height={56}
              className="rounded-[var(--radius-xl)]"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Current</h1>
          <p className="text-sm text-muted mt-1">{t('auth.subtitle')}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-panel-bg border border-panel-border rounded-[var(--radius-xl)] p-6 shadow-md space-y-4">
          <h2 className="text-lg font-medium text-center">{t('auth.login')}</h2>

          {error && (
            <div className="p-3 bg-danger-light text-danger text-sm rounded-[var(--radius-md)] flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs text-muted mb-1">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-3 py-2 text-sm bg-input-bg border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-muted mb-1">{t('auth.password')}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full px-3 py-2 pr-10 text-sm bg-input-bg border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-0.5"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spinner" />
                {t('auth.loggingIn')}
              </>
            ) : (
              t('auth.login')
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground mt-4">
          {t('auth.tagline')}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 size={24} className="spinner text-accent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
