'use client'
import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'
import { SkeletonProfileForm } from '@/components/Skeleton'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/users/me'), { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const u = data.user
        setUser(u)
        setFirstName(u?.firstName || '')
        setLastName(u?.lastName || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(apiUrl(`/api/users/${user.id}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch(apiUrl(`/api/users/${user.id}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: 'Failed to change password.' })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <SkeletonProfileForm />
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <p className="text-sm text-brand-silver">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Avatar</label>
            <p className="text-xs text-brand-silver mb-2">
              Upload a profile photo. Accepted formats: JPG, PNG.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !user) return
                setSaving(true)
                setMessage(null)
                try {
                  // Upload to media collection
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('alt', `${firstName} ${lastName} avatar`)
                  const uploadRes = await fetch(apiUrl('/api/media'), { method: 'POST', credentials: 'include', body: formData })
                  if (!uploadRes.ok) throw new Error('Upload failed')
                  const media = await uploadRes.json()
                  // Link to user
                  await fetch(apiUrl(`/api/users/${user.id}`), {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar: media.doc.id }),
                  })
                  setMessage({ type: 'success', text: 'Avatar updated.' })
                } catch {
                  setMessage({ type: 'error', text: 'Failed to upload avatar.' })
                } finally {
                  setSaving(false)
                }
              }}
              className="text-sm"
            />
          </div>
          {message && (
            <p
              className={cn(
                'text-sm',
                message.type === 'success' ? 'text-green-500' : 'text-red-400',
              )}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'px-5 py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-sm font-medium hover:bg-brand-gold/30 transition-colors',
              saving && 'opacity-50 cursor-not-allowed',
            )}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <hr className="border-brand-glass-border" />

      <div>
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          {passwordMessage && (
            <p
              className={cn(
                'text-sm',
                passwordMessage.type === 'success' ? 'text-green-500' : 'text-red-400',
              )}
            >
              {passwordMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className={cn(
              'px-5 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors',
              savingPassword && 'opacity-50 cursor-not-allowed',
            )}
          >
            {savingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
