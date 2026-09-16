import { Card } from './Card'
import { CardErrorBeacon } from './CardErrorBeacon'
export function CardError({ title }: { title: string }) {
  return (
    <Card title={title}>
      <CardErrorBeacon />
      <div className="text-[var(--color-text-tertiary)]">—</div>
    </Card>
  )
}
