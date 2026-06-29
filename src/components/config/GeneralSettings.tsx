'use client'
import { useState, useTransition } from 'react'

type Settings = {
  whoogle_url: string
  focus_default: string
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
          focus_default: values.focus_default,
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

        <label className="grid gap-1">
          <span className="text-xs text-[var(--color-text-secondary)]">Focus banner par défaut</span>
          <input
            type="text"
            value={values.focus_default}
            onChange={e => setValues(v => ({ ...v, focus_default: e.target.value }))}
            placeholder="Aucun focus défini (vide → —)"
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]"
          />
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
