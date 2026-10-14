import plans from '../data/plans.json'
import { formatAfterDiscount, formatPrice, formatThrottle } from '../lib/display.js'

export default function PlansPage() {
  return (
    <main className="flex flex-col" style={{ padding: 'var(--spacing-16)', gap: 'var(--spacing-12)', background: 'var(--color-bg-default)' }}>
      {plans.map((plan) => (
        <section key={plan.id} className="ts-body-medium" style={{ borderRadius: 'var(--radius-16)' }}>
          <h2 className="ts-heading-h4">{plan.name}</h2>
          <p>{formatThrottle(plan)}</p>
          <p>{formatPrice(plan.monthly_price)}</p>
          <p>{formatAfterDiscount(plan)}</p>
        </section>
      ))}
    </main>
  )
}
