'use client'
import { useState, useTransition } from 'react'

export type TokenItem = {
  id: number
  name: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
}

export function TokensManager({ initial }: { initial: TokenItem[] }) {
  const [tokens, setTokens] = useState(initial)
  const [newName, setNewName] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function add() {
    const name = newName.trim()
    if (!name) return
    setNewName('')
    startTransition(async () => {
      const res = await fetch('/api/config/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const { token, plaintext } = await res.json()
        setTokens(prev => [token, ...prev])
        setSecret(plaintext)
      }
    })
  }

  function revoke(id: number) {
    const snapshot = tokens
    setTokens(prev => prev.filter(t => t.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/config/tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) setTokens(snapshot)
    })
  }

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] p-4 px-5">
      {secret && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-info)] text-[var(--color-text-info)] text-sm">
          <p className="mb-2 font-medium">Copie ce token maintenant — il ne sera plus affiché :</p>
          <code className="block break-all select-all text-xs bg-[var(--color-bg-secondary)] rounded p-2">{secret}</code>
          <button onClick={() => setSecret(null)} className="mt-2 text-xs underline">Fermer</button>
        </div>
      )}

      <ul className="flex flex-col gap-2.5 mb-4">
        {tokens.map(t => (
          <li key={t.id} className="flex gap-2.5 items-center text-sm group">
            <span className="flex-1">{t.name}</span>
            <code className="text-xs text-[var(--color-text-tertiary)]">{t.token_prefix}…</code>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {t.last_used_at ? `utilisé` : 'jamais utilisé'}
            </span>
            <button
              onClick={() => revoke(t.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-tertiary)] hover:text-[var(--color-text-danger)]"
              aria-label="Révoquer"
            >
              Révoquer
            </button>
          </li>
        ))}
        {tokens.length === 0 && (
          <li className="text-sm text-[var(--color-text-tertiary)]">Aucun token.</li>
        )}
      </ul>

      <div className="flex gap-2.5 items-center">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Nom du token (ex. Claude)"
          className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]"
        />
        <button
          onClick={add}
          className="text-sm px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-info)] text-[var(--color-text-info)]"
        >
          Générer
        </button>
      </div>
    </div>
  )
}
