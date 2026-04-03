'use client'
import React from 'react'
import { GlassCard } from '@/components/homepage/GlassCard'
import { BiomarkerChart } from '@/components/BiomarkerChart'
import { Activity } from 'lucide-react'

type Biomarker = {
  name: string
  value: number | ''
  unit: string
  date: string
  normalRangeLow: number
  normalRangeHigh: number
  status: string
}

export const BiomarkerTrendsSection: React.FC<{
  biomarkers: Biomarker[]
}> = ({ biomarkers }) => {
  // Filter valid entries and group by name
  const validEntries = biomarkers.filter(
    (b) => b.name && b.value !== '' && !isNaN(Number(b.value)) && b.date,
  )

  const grouped: Record<string, Array<{ date: string; value: number; status: string; unit: string; normalRangeLow: number; normalRangeHigh: number }>> = {}

  for (const b of validEntries) {
    if (!grouped[b.name]) grouped[b.name] = []
    grouped[b.name].push({
      date: b.date,
      value: Number(b.value),
      status: b.status,
      unit: b.unit,
      normalRangeLow: b.normalRangeLow,
      normalRangeHigh: b.normalRangeHigh,
    })
  }

  // Sort each group by date ascending
  for (const name in grouped) {
    grouped[name].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Only show biomarkers with 2+ data points
  const trendBiomarkers = Object.entries(grouped).filter(([_, entries]) => entries.length >= 2)

  if (trendBiomarkers.length === 0) {
    if (validEntries.length === 0) return null // No biomarkers at all

    return (
      <div>
        <h3 className="text-sm font-semibold mb-3">Biomarker Trends</h3>
        <GlassCard hover={false} className="text-center py-8">
          <Activity className="w-8 h-8 mx-auto mb-2 text-brand-silver/30" />
          <p className="text-xs text-brand-silver">
            Add multiple measurements for the same biomarker (with different dates) to see trends.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-1">Biomarker Trends</h3>
      <p className="text-xs text-brand-silver mb-4">Track how your markers change over time.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {trendBiomarkers.map(([name, entries]) => {
          const first = entries[0]
          return (
            <GlassCard key={name} hover={false} className="p-4">
              <BiomarkerChart
                biomarkerName={name}
                unit={first.unit}
                normalRangeLow={first.normalRangeLow}
                normalRangeHigh={first.normalRangeHigh}
                data={entries}
              />
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
