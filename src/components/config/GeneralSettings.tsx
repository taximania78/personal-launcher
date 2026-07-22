'use client'
import { useState, useTransition } from 'react'

type Settings = {
  whoogle_url: string
  confetti_enabled: boolean
}

export function GeneralSettings({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [, startTransition] = useTransition()

  function save() {
    setSaved('saving')
    startTransition(async () => {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whoogle_url: values.whoogle_url,
          confetti_enabled: values.confetti_enabled,
        }),
      })
      setSaved(res.ok ? 'ok' : 'error')
      if (res.ok) setTimeout(() => setSaved('idle'), 1500)
    })
  }

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] p-4 px-5">
      <div className="grid gap-4 max-w-xl">
        <label className="grid gap-1">
          <span className="text-xs text-[var(--color-text-secondary)]">URL Whoogle</span>
          <input
            type="text"
            value={values.whoogle_url}
            onChange={e => setValues(v => ({ ...v, whoogle_url: e.target.value }))}
            placeholder="https://whoogle.example.com (vide → Google)"
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.confetti_enabled}
            onChange={e => setValues(v => ({ ...v, confetti_enabled: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-bg-info)]"
          />
          <span className="text-sm">Confettis quand toutes les habitudes du jour sont cochées</span>
        </label>

        <div className="flex gap-3 items-center">
          <button
            onClick={save}
            disabled={saved === 'saving'}
            className="text-sm px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-info)] text-[var(--color-text-info)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved === 'ok' && <span className="text-sm text-[var(--color-text-success)]">✓ Enregistré</span>}
          {saved === 'error' && <span className="text-sm text-[var(--color-text-danger)]">✗ Erreur</span>}
        </div>
      </div>
    </div>
  )
}
