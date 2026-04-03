'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GlassCard from '@/components/dashboard/GlassCard'

interface Patient {
  id: string
  pathsUserId: string
  email: string
  firstName: string | null
  lastName: string | null
  tier: string | null
}

export default function PatientsClient() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clinician/patients')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPatients)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    return (
      !q ||
      p.email.toLowerCase().includes(q) ||
      (p.firstName?.toLowerCase().includes(q)) ||
      (p.lastName?.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-light tracking-wide text-brand-light">Patients</h1>
        <p className="mt-1 text-sm text-brand-silver">{patients.length} patient(s)</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full max-w-md px-4 py-2.5 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50"
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-brand-glass-bg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <p className="text-brand-silver/50 text-sm text-center py-6">
            {search ? 'No patients match your search' : 'No patients yet'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((patient) => (
            <Link key={patient.id} href={`/clinician/patients/${patient.id}`}>
              <GlassCard className="flex items-center justify-between hover:bg-brand-glass-bg-hover transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-brand-light">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-xs text-brand-silver">{patient.email}</p>
                </div>
                {patient.tier && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-gold-dim text-brand-gold capitalize">
                    {patient.tier}
                  </span>
                )}
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
