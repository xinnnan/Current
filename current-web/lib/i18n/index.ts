import { useI18nStore } from './store'
import { translations } from './translations'

/**
 * Translation hook — returns a `t` function that resolves keys to localized strings.
 *
 * Usage:
 * ```tsx
 * const { t, locale } = useTranslation()
 * return <h1>{t('home.title')}</h1>
 * ```
 */
export function useTranslation() {
  const locale = useI18nStore((s) => s.locale)
  const setLocale = useI18nStore((s) => s.setLocale)

  const dict = translations[locale]

  const t = (key: string): string => {
    return dict[key] ?? key
  }

  return { t, locale, setLocale }
}

export type { Locale } from './translations'
