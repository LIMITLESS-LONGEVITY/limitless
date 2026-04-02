import type { Metadata } from 'next'
import VerifyEmailForm from './VerifyEmailForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your PATHS account email address.',
}

export default function VerifyEmailPage() {
  return <VerifyEmailForm />
}
