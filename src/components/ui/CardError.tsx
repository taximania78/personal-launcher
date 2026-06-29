import { Card } from './Card'
export function CardError({ title }: { title: string }) {
  return <Card title={title}><div className="text-[var(--color-text-tertiary)]">—</div></Card>
}
