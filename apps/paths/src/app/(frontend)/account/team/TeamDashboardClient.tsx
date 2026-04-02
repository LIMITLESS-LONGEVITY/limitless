'use client'
import React, { useState } from 'react'
import { GlassCard } from '@/components/homepage/GlassCard'
import { cn } from '@/utilities/ui'
import {
  Users, BookOpen, Award, AlertTriangle, ChevronDown, ChevronRight,
  Download, CheckCircle2, Clock, XCircle,
} from 'lucide-react'

type StaffEnrollment = {
  courseTitle: string
  status: string
  completionPercentage: number
  enrolledAt: string
  completedAt?: string | null
}

type StaffCertificate = {
  courseTitle: string
  certificateNumber: string
  issuedAt: string
  expiresAt?: string | null
  isExpired: boolean
  isExpiringSoon: boolean
}

type StaffMember = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  enrollments: StaffEnrollment[]
  certificates: StaffCertificate[]
  status: 'not-started' | 'in-progress' | 'completed'
}

type Props = {
  tenantName: string
  organizationName: string
  certificationEnabled: boolean
  certificationExpiry: number | null
  stats: {
    totalStaff: number
    activeEnrollments: number
    completedCertifications: number
    overdue: number
  }
  staff: StaffMember[]
}

const STATUS_CONFIG = {
  'completed': { label: 'Completed', color: 'text-green-500 bg-green-500/10', icon: CheckCircle2 },
  'in-progress': { label: 'In Progress', color: 'text-brand-gold bg-brand-gold/10', icon: Clock },
  'not-started': { label: 'Not Started', color: 'text-brand-silver bg-brand-glass-bg', icon: XCircle },
}

function exportCSV(staff: StaffMember[], orgName: string) {
  const rows = [['Name', 'Email', 'Role', 'Course', 'Status', 'Completion %', 'Certificate', 'Issued', 'Expires']]

  for (const member of staff) {
    if (member.enrollments.length === 0 && member.certificates.length === 0) {
      rows.push([
        `${member.firstName} ${member.lastName}`,
        member.email,
        member.role,
        '', '', '', '', '', '',
      ])
      continue
    }

    for (const e of member.enrollments) {
      const cert = member.certificates.find((c) => c.courseTitle === e.courseTitle)
      rows.push([
        `${member.firstName} ${member.lastName}`,
        member.email,
        member.role,
        e.courseTitle,
        e.status,
        String(e.completionPercentage),
        cert?.certificateNumber || '',
        cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '',
        cert?.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : '',
      ])
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${orgName.replace(/\s+/g, '-').toLowerCase()}-compliance-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TeamDashboardClient({
  tenantName: _tenantName,
  organizationName,
  certificationEnabled,
  certificationExpiry,
  stats,
  staff,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'completion'>('name')

  const sortedStaff = [...staff].sort((a, b) => {
    if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    if (sortBy === 'status') {
      const order = { completed: 0, 'in-progress': 1, 'not-started': 2 }
      return (order[a.status] ?? 2) - (order[b.status] ?? 2)
    }
    // completion: average across enrollments
    const avgA = a.enrollments.length ? a.enrollments.reduce((s, e) => s + e.completionPercentage, 0) / a.enrollments.length : 0
    const avgB = b.enrollments.length ? b.enrollments.reduce((s, e) => s + e.completionPercentage, 0) / b.enrollments.length : 0
    return avgB - avgA
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{organizationName}</h2>
          <p className="text-xs text-brand-silver">Team compliance dashboard</p>
        </div>
        <button
          onClick={() => exportCSV(staff, organizationName)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-brand-silver hover:text-brand-light bg-brand-glass-bg border border-brand-glass-border rounded-lg hover:bg-brand-glass-bg-hover transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-4 text-center">
          <Users className="w-5 h-5 text-brand-teal mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.totalStaff}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Total Staff</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <BookOpen className="w-5 h-5 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.activeEnrollments}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Active Enrollments</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Award className="w-5 h-5 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.completedCertifications}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Certificates</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <AlertTriangle className={cn('w-5 h-5 mx-auto mb-2', stats.overdue > 0 ? 'text-red-400' : 'text-brand-silver/40')} />
          <p className={cn('text-2xl font-display font-light', stats.overdue > 0 ? 'text-red-400' : 'text-brand-light')}>{stats.overdue}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Overdue / Expired</p>
        </GlassCard>
      </div>

      {/* Certification info */}
      {certificationEnabled && certificationExpiry && (
        <p className="text-xs text-brand-silver/60">
          Certificates expire after {certificationExpiry} months. Expired or expiring certificates are flagged below.
        </p>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-silver">Sort by:</span>
        {(['name', 'status', 'completion'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-medium transition-colors',
              sortBy === key
                ? 'bg-brand-gold/20 text-brand-gold'
                : 'text-brand-silver hover:text-brand-light',
            )}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Staff list */}
      <div className="space-y-2">
        {sortedStaff.map((member) => {
          const isExpanded = expandedId === member.id
          const config = STATUS_CONFIG[member.status]
          const StatusIcon = config.icon
          const avgCompletion = member.enrollments.length
            ? Math.round(member.enrollments.reduce((s, e) => s + e.completionPercentage, 0) / member.enrollments.length)
            : 0

          return (
            <div key={member.id} className="border border-brand-glass-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : member.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-glass-bg-hover transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-brand-silver flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-brand-silver flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-semibold">{member.firstName} {member.lastName}</span>
                  <span className="text-xs text-brand-silver ml-2">{member.role}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {member.enrollments.length > 0 && (
                    <span className="text-xs text-brand-silver">{avgCompletion}%</span>
                  )}
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded', config.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </span>
                  {member.certificates.length > 0 && (
                    <Award className="w-3.5 h-3.5 text-brand-gold" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-brand-glass-border">
                  {/* Enrollments */}
                  {member.enrollments.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-brand-silver uppercase tracking-wider mb-2">Enrollments</p>
                      {member.enrollments.map((e, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className="text-xs flex-1">{e.courseTitle}</span>
                          <div className="w-20 h-1.5 bg-brand-dark-alt rounded-full">
                            <div className="h-full bg-brand-gold rounded-full" style={{ width: `${e.completionPercentage}%` }} />
                          </div>
                          <span className="text-[10px] text-brand-silver w-8 text-right">{e.completionPercentage}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-brand-silver/50">No enrollments yet.</p>
                  )}

                  {/* Certificates */}
                  {member.certificates.length > 0 && (
                    <div>
                      <p className="text-[10px] text-brand-silver uppercase tracking-wider mb-2">Certificates</p>
                      {member.certificates.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <Award className={cn('w-3.5 h-3.5 flex-shrink-0', c.isExpired ? 'text-red-400' : c.isExpiringSoon ? 'text-brand-gold' : 'text-green-500')} />
                          <span className="text-xs flex-1">{c.courseTitle}</span>
                          <span className="text-[10px] text-brand-silver font-mono">{c.certificateNumber}</span>
                          {c.isExpired && <span className="text-[9px] text-red-400 font-semibold uppercase">Expired</span>}
                          {c.isExpiringSoon && <span className="text-[9px] text-brand-gold font-semibold uppercase">Expiring</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {staff.length === 0 && (
          <GlassCard hover={false} className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3 text-brand-silver/30" />
            <p className="text-brand-silver">No staff members in this organization yet.</p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
