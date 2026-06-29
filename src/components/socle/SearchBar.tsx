'use client'
import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

export function SearchBar({ whoogleUrl }: { whoogleUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="mb-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const q = inputRef.current?.value.trim()
          if (!q) return
          const base = whoogleUrl?.trim() || 'https://www.google.com'
          window.location.href = `${base}/search?q=${encodeURIComponent(q)}`
        }}
        className="surface-glass flex items-center gap-3 rounded-[var(--radius-lg)] py-3.5 px-4"
      >
        <span className="text-[var(--color-text-tertiary)]" aria-hidden>
          <Search size={18} />
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder={whoogleUrl ? 'Rechercher avec Whoogle…' : 'Rechercher (Google)…'}
          className="flex-1 bg-transparent border-none outline-none text-base h-7 italic placeholder:italic placeholder:text-[var(--color-text-tertiary)]"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      <p className="text-on-image text-xs text-[var(--color-text-primary)] pl-1 mt-1">
        {whoogleUrl
          ? 'Entrée → Whoogle · privacy by default'
          : 'Entrée → Google · configurable dans /config'}
      </p>
    </div>
  )
}
