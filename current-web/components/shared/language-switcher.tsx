'use client'

import { Globe } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation()

  const toggle = () => {
    setLocale(locale === 'en' ? 'zh' : 'en')
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-gray-100 text-muted hover:text-foreground transition-colors"
      title={t('lang.switch')}
      aria-label={t('lang.switch')}
    >
      <Globe size={compact ? 14 : 12} aria-hidden="true" />
      <span>{locale === 'en' ? '中文' : 'EN'}</span>
    </button>
  )
}
