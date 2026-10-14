import { useState } from 'react'
import { canSubmit } from '../lib/validate.js'

export default function ApplyPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  return (
    <main className="flex flex-col" style={{ padding: 'var(--spacing-16)' }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
      <button disabled={!canSubmit({ name, phone, agreed })}>신청하기</button>
    </main>
  )
}
