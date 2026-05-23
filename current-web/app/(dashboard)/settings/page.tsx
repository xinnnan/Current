'use client'

import { useTranslation } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/shared/language-switcher'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* API Keys */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">{t('settings.apiKeys')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">{t('settings.minimaxKey')}</label>
              <input
                type="password"
                placeholder={t('settings.minimaxPlaceholder')}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">{t('settings.tripoKey')}</label>
              <input
                type="password"
                placeholder={t('settings.tripoPlaceholder')}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </section>

        {/* Inference Service */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">{t('settings.inferenceService')}</h2>
          <div>
            <label className="block text-xs text-muted mb-1">{t('settings.pythonServiceUrl')}</label>
            <input
              type="text"
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">{t('settings.preferences')}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('settings.speedUnit')}</span>
              <select className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md">
                <option>m/s</option>
                <option>km/h</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('settings.distanceUnit')}</span>
              <select className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md">
                <option>{t('settings.meters')}</option>
                <option>{t('settings.millimeters')}</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('settings.language')}</span>
              <LanguageSwitcher />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
