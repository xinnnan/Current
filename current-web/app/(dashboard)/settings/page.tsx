'use client'

import { useTranslation } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { useUnitStore, type UnitSystem } from '@/lib/units/store'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { unitSystem, setUnitSystem } = useUnitStore()

  const unitOptions: { value: UnitSystem; label: string }[] = [
    { value: 'metric', label: t('settings.metric') },
    { value: 'imperial', label: t('settings.imperial') },
    { value: 'us_customary', label: t('settings.usCustomary') },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* Preferences */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">{t('settings.preferences')}</h2>
          <div className="space-y-4">
            {/* Unit System */}
            <div>
              <label className="block text-sm mb-1.5">{t('settings.unitSystem')}</label>
              <p className="text-xs text-muted mb-2">{t('settings.unitSystemDesc')}</p>
              <div className="flex gap-2">
                {unitOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setUnitSystem(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors duration-[var(--transition-fast)] ${
                      unitSystem === opt.value
                        ? 'bg-accent text-white border-accent'
                        : 'bg-gray-50 border-gray-200 text-foreground hover:border-accent/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-sm">{t('settings.language')}</span>
                <p className="text-xs text-muted">{t('settings.languageDesc')}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
