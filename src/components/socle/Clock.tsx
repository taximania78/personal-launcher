'use client'
import { useEffect, useState } from 'react'

export function Clock() {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      setTime(`${h}:${m}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="surface-glass-soft inline-flex items-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] tabular-nums">
      {time || '--:--'}
    </span>
  )
}
