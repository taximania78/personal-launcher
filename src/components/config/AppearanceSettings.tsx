'use client'
import { useState, useTransition, useRef, DragEvent } from 'react'
import { Upload, Trash2, ImageIcon } from 'lucide-react'

type Props = {
  initialPath: string | null
  initialDim: number
  initialUpdatedAt: number
}

const MAX_BYTES = 5 * 1024 * 1024

export function AppearanceSettings({ initialPath, initialDim, initialUpdatedAt }: Props) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [dim, setDim] = useState(initialDim)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      setUploadState('error')
      setErrorMsg('Fichier trop gros (max 5 MB)')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadState('error')
      setErrorMsg('Format non supporté (JPEG, PNG, WebP)')
      return
    }
    setUploadState('uploading')
    setErrorMsg(null)
    const buf = await file.arrayBuffer()
    const res = await fetch('/api/appearance/background', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: buf,
    })
    if (!res.ok) {
      setUploadState('error')
      const body = await res.json().catch(() => ({}))
      setErrorMsg(typeof body.error === 'string' ? body.error : 'Erreur')
      return
    }
    const data: { background_image_path: string } = await res.json()
    setCurrentPath(data.background_image_path)
    setUpdatedAt(Date.now())
    setUploadState('idle')
    window.location.reload()
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function onDimChange(value: number) {
    setDim(value)
    startTransition(async () => {
      await fetch('/api/appearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ background_dim_pct: value }),
      })
    })
  }

  function onRemove() {
    if (!confirm('Retirer le background image ?')) return
    startTransition(async () => {
      const res = await fetch('/api/appearance/background', { method: 'DELETE' })
      if (res.ok) {
        setCurrentPath(null)
        window.location.reload()
      }
    })
  }

  const previewUrl = currentPath ? `/api/bg/current?v=${updatedAt}` : null

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] p-4 px-5">
      <div className="grid gap-4 max-w-xl">
        <div>
          <div className="text-xs text-[var(--color-text-secondary)] mb-2">Image actuelle</div>
          {previewUrl ? (
            <div className="relative w-60 h-[135px] rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border-tertiary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Background actuel" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-60 h-[135px] rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-secondary)] flex items-center justify-center text-[var(--color-text-tertiary)]">
              <ImageIcon size={20} />
              <span className="text-xs ml-2">Aucune image</span>
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-[var(--color-border-secondary)] rounded-[var(--radius-md)] p-6 text-center hover:border-[var(--color-text-tertiary)] transition-colors"
        >
          <Upload size={20} className="mx-auto text-[var(--color-text-tertiary)] mb-2" />
          <div className="text-sm">
            Glisser une image ici ou <span className="text-[var(--color-text-info)]">cliquer pour choisir</span>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">JPEG, PNG, WebP · max 5 MB · 1280×800 recommandé</div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
        </div>

        {uploadState === 'uploading' && <div className="text-sm text-[var(--color-text-secondary)]">Upload en cours…</div>}
        {uploadState === 'error' && errorMsg && <div className="text-sm text-[var(--color-text-danger)]">{errorMsg}</div>}

        <label className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Intensité du voile</span>
            <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">{dim}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={dim}
            onChange={(e) => onDimChange(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </label>

        {currentPath && (
          <div>
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] text-[var(--color-text-danger)] hover:bg-[var(--color-bg-danger)]"
            >
              <Trash2 size={14} /> Retirer l&apos;image
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
