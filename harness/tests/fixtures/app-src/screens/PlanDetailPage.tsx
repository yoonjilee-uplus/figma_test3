import plans from '../data/plans.json'
import { formatAfterDiscount, formatPrice, formatThrottle } from '../lib/display.js'

export default function PlanDetailPage({ id }: { id: string }) {
  const plan = plans.find((p) => p.id === id) ?? plans[0]
  return (
    <main className="flex flex-col" style={{ padding: 'var(--spacing-16)', color: 'var(--color-text-primary)' }}>
      <h1 className="ts-heading-h3">{plan.name}</h1>
      <p className="ts-body-medium">{formatPrice(plan.monthly_price)}</p>
      <p className="ts-body-small-medium">{formatAfterDiscount(plan)}</p>
      <p className="ts-body-medium">{formatThrottle(plan)}</p>
    </main>
  )
}
