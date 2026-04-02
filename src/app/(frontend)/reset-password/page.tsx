import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your PATHS account.',
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
