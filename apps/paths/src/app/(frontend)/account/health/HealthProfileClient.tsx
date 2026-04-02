'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import { BiomarkerTrendsSection } from './BiomarkerTrendsSection'

const BIOMARKER_PRESETS = [
  { name: 'Vitamin D', unit: 'ng/mL', low: 30, high: 100 },
  { name: 'HbA1c', unit: '%', low: 4.0, high: 5.6 },
  { name: 'ApoB', unit: 'mg/dL', low: 0, high: 90 },
  { name: 'hs-CRP', unit: 'mg/L', low: 0, high: 1.0 },
  { name: 'Testosterone', unit: 'ng/dL', low: 300, high: 1000 },
  { name: 'DHEA-S', unit: 'mcg/dL', low: 80, high: 560 },
  { name: 'Fasting Glucose', unit: 'mg/dL', low: 70, high: 99 },
  { name: 'Fasting Insulin', unit: 'uIU/mL', low: 2.0, high: 24.9 },
  { name: 'LDL-C', unit: 'mg/dL', low: 0, high: 100 },
  { name: 'HDL-C', unit: 'mg/dL', low: 40, high: 60 },
  { name: 'Triglycerides', unit: 'mg/dL', low: 0, high: 150 },
  { name: 'Omega-3 Index', unit: '%', low: 8, high: 12 },
  { name: 'Ferritin', unit: 'ng/mL', low: 30, high: 400 },
  { name: 'B12', unit: 'pg/mL', low: 200, high: 900 },
  { name: 'Folate', unit: 'ng/mL', low: 3, high: 20 },
  { name: 'Magnesium', unit: 'mg/dL', low: 1.7, high: 2.2 },
]

const HEALTH_GOAL_OPTIONS = [
  { value: 'improve-sleep', label: 'Improve Sleep' },
  { value: 'lose-weight', label: 'Lose Weight' },
  { value: 'increase-energy', label: 'Increase Energy' },
  { value: 'reduce-inflammation', label: 'Reduce Inflammation' },
  { value: 'build-muscle', label: 'Build Muscle' },
  { value: 'improve-cognition', label: 'Improve Cognition' },
  { value: 'cardiovascular-health', label: 'Cardiovascular Health' },
  { value: 'hormone-balance', label: 'Hormone Balance' },
  { value: 'longevity-optimization', label: 'Longevity Optimization' },
  { value: 'stress-management', label: 'Stress Management' },
]

type Biomarker = {
  name: string
  value: number | ''
  unit: string
  date: string
  normalRangeLow: number
  normalRangeHigh: number
  status: string
}

type Props = {
  existingProfile: any | null
  pillars: Array<{ id: string; name: string }>
  userId: string
}

function calcStatus(value: number | '', low: number, high: number): string {
  if (value === '' || isNaN(Number(value))) return 'normal'
  const v = Number(value)
  if (v < low) return 'low'
  if (v > high) return 'high'
  return 'normal'
}

export default function HealthProfileClient({ existingProfile, pillars, userId }: Props) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Health goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    existingProfile?.healthGoals?.map((g: any) => g.goal) || [],
  )

  // Biomarkers
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>(
    existingProfile?.biomarkers?.map((b: any) => ({
      name: b.name,
      value: b.value,
      unit: b.unit,
      date: b.date ? new Date(b.date).toISOString().split('T')[0] : '',
      normalRangeLow: b.normalRangeLow ?? 0,
      normalRangeHigh: b.normalRangeHigh ?? 0,
      status: b.status,
    })) || [],
  )

  // Conditions & Medications
  const [conditions, setConditions] = useState<string[]>(
    existingProfile?.conditions?.map((c: any) => c.condition) || [],
  )
  const [medications, setMedications] = useState<string[]>(
    existingProfile?.medications?.map((m: any) => m.medication) || [],
  )

  // Pillar priorities — match by id or name from DT response
  const [pillarOrder, setPillarOrder] = useState<string[]>(() => {
    if (!existingProfile?.pillarPriorities?.length) return pillars.map((p) => p.id)
    const ordered = existingProfile.pillarPriorities
      .map((p: any) => {
        if (typeof p.pillar === 'object' && p.pillar.id) return p.pillar.id
        if (typeof p.pillar === 'object' && p.pillar.name) {
          const match = pillars.find((pl) => pl.name === p.pillar.name)
          return match?.id
        }
        return p.pillar
      })
      .filter(Boolean)
    // Append any pillars not in the saved order
    const remaining = pillars.filter((p) => !ordered.includes(p.id)).map((p) => p.id)
    return [...ordered, ...remaining]
  })

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    )
  }

  const addBiomarker = () => {
    setBiomarkers((prev) => [
      ...prev,
      { name: '', value: '', unit: '', date: new Date().toISOString().split('T')[0], normalRangeLow: 0, normalRangeHigh: 0, status: 'normal' },
    ])
  }

  const updateBiomarker = (index: number, field: string, value: any) => {
    setBiomarkers((prev) => {
      const updated = [...prev]
      const marker = { ...updated[index], [field]: value }

      // Auto-fill from preset when name changes
      if (field === 'name') {
        const preset = BIOMARKER_PRESETS.find((p) => p.name === value)
        if (preset) {
          marker.unit = preset.unit
          marker.normalRangeLow = preset.low
          marker.normalRangeHigh = preset.high
          marker.status = calcStatus(marker.value, preset.low, preset.high)
        }
      }

      // Recalculate status when value changes
      if (field === 'value') {
        marker.status = calcStatus(value, marker.normalRangeLow, marker.normalRangeHigh)
      }

      updated[index] = marker
      return updated
    })
  }

  const removeBiomarker = (index: number) => {
    setBiomarkers((prev) => prev.filter((_, i) => i !== index))
  }

  const movePillar = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= pillarOrder.length) return
    setPillarOrder((prev) => {
      const updated = [...prev]
      ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    // Build pillar priorities as { pillarName: rank } object
    const pillarPriorities: Record<string, number> = {}
    pillarOrder.forEach((id, i) => {
      const pillar = pillars.find((p) => p.id === id)
      if (pillar) pillarPriorities[pillar.name] = i + 1
    })

    const profilePayload = {
      conditions: conditions.filter(Boolean),
      medications: medications.filter(Boolean),
      healthGoals: selectedGoals,
      pillarPriorities,
    }

    const validBiomarkers = biomarkers
      .filter((b) => b.name && b.value !== '')
      .map((b) => ({
        name: b.name,
        value: Number(b.value),
        unit: b.unit,
        measuredAt: b.date || new Date().toISOString(),
        referenceMin: b.normalRangeLow,
        referenceMax: b.normalRangeHigh,
        status: b.status,
        category: 'user-entered',
        source: 'paths',
      }))

    try {
      // Save profile to DT via gateway
      const profileRes = await fetch(apiUrl(`/api/twin/${userId}/profile`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profilePayload),
      })

      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => null)
        setMessage({ type: 'error', text: err?.error || 'Failed to save profile.' })
        setSaving(false)
        return
      }

      // Save biomarkers to DT via gateway
      if (validBiomarkers.length > 0) {
        const bioRes = await fetch(apiUrl(`/api/twin/${userId}/biomarkers/batch`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ biomarkers: validBiomarkers }),
        })

        if (!bioRes.ok) {
          setMessage({ type: 'error', text: 'Profile saved but biomarkers failed. Try again.' })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'Health profile saved successfully.' })
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSaving(false)
    }
  }

  const inputClasses =
    'w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50'
  const selectClasses =
    'w-full px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50 appearance-none'

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">Health Profile</h2>
        <p className="text-xs text-brand-silver">
          Your health data personalizes AI recommendations, action plans, and daily protocols.
          This information is private and never shared.
        </p>
      </div>

      {/* Health Goals */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Health Goals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HEALTH_GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleGoal(option.value)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                selectedGoals.includes(option.value)
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'bg-brand-glass-bg text-brand-silver border border-brand-glass-border hover:bg-brand-glass-bg-hover',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-brand-glass-border" />

      {/* Biomarkers */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Biomarkers</h3>
        <div className="space-y-3">
          {biomarkers.map((marker, i) => (
            <div
              key={i}
              className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-brand-glass-border"
            >
              <div className="w-full sm:w-auto sm:flex-1">
                <label className="block text-[10px] text-brand-silver mb-1">Biomarker</label>
                <select
                  value={marker.name}
                  onChange={(e) => updateBiomarker(i, 'name', e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select...</option>
                  {BIOMARKER_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="block text-[10px] text-brand-silver mb-1">Value</label>
                <input
                  type="number"
                  step="any"
                  value={marker.value}
                  onChange={(e) => updateBiomarker(i, 'value', e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClasses}
                />
              </div>
              <div className="w-16">
                <label className="block text-[10px] text-brand-silver mb-1">Unit</label>
                <input value={marker.unit} readOnly className={cn(inputClasses, 'text-brand-silver/60')} />
              </div>
              <div className="w-32">
                <label className="block text-[10px] text-brand-silver mb-1">Date</label>
                <input
                  type="date"
                  value={marker.date}
                  onChange={(e) => updateBiomarker(i, 'date', e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="w-16">
                <span
                  className={cn(
                    'inline-block px-2 py-1.5 rounded text-[10px] font-semibold uppercase',
                    marker.status === 'low' && 'bg-blue-500/10 text-blue-400',
                    marker.status === 'normal' && 'bg-green-500/10 text-green-500',
                    marker.status === 'high' && 'bg-red-500/10 text-red-400',
                    marker.status === 'critical' && 'bg-red-500/20 text-red-500',
                  )}
                >
                  {marker.status || 'N/A'}
                </span>
              </div>
              <button
                onClick={() => removeBiomarker(i)}
                className="p-1.5 text-brand-silver hover:text-red-400 transition-colors"
                aria-label="Remove biomarker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addBiomarker}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Biomarker
          </button>
        </div>
      </div>

      {/* Biomarker Trends */}
      <BiomarkerTrendsSection biomarkers={biomarkers} />

      <hr className="border-brand-glass-border" />

      {/* Conditions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Health Conditions</h3>
        <p className="text-xs text-brand-silver mb-3">Optional. Helps personalize recommendations.</p>
        <div className="space-y-2">
          {conditions.map((condition, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={condition}
                onChange={(e) => {
                  const updated = [...conditions]
                  updated[i] = e.target.value
                  setConditions(updated)
                }}
                placeholder="e.g. Insulin resistance, Hypertension"
                className={cn(inputClasses, 'flex-1')}
              />
              <button
                onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}
                className="p-2 text-brand-silver hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setConditions([...conditions, ''])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Condition
          </button>
        </div>
      </div>

      <hr className="border-brand-glass-border" />

      {/* Medications */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Current Medications</h3>
        <p className="text-xs text-brand-silver mb-3">Optional. Helps avoid conflicting recommendations.</p>
        <div className="space-y-2">
          {medications.map((med, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={med}
                onChange={(e) => {
                  const updated = [...medications]
                  updated[i] = e.target.value
                  setMedications(updated)
                }}
                placeholder="e.g. Metformin, Atorvastatin"
                className={cn(inputClasses, 'flex-1')}
              />
              <button
                onClick={() => setMedications(medications.filter((_, idx) => idx !== i))}
                className="p-2 text-brand-silver hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setMedications([...medications, ''])}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Medication
          </button>
        </div>
      </div>

      <hr className="border-brand-glass-border" />

      {/* Pillar Priorities */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Pillar Priorities</h3>
        <p className="text-xs text-brand-silver mb-3">Order by importance to you. Influences daily protocols.</p>
        <div className="space-y-1">
          {pillarOrder.map((pillarId, i) => {
            const pillar = pillars.find((p) => p.id === pillarId)
            if (!pillar) return null
            return (
              <div
                key={pillarId}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-brand-glass-border"
              >
                <span className="text-xs text-brand-gold font-semibold w-5">{i + 1}</span>
                <span className="text-sm flex-1">{pillar.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => movePillar(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-brand-silver hover:text-brand-light disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => movePillar(i, 1)}
                    disabled={i === pillarOrder.length - 1}
                    className="p-1 text-brand-silver hover:text-brand-light disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      {message && (
        <p className={cn('text-sm', message.type === 'success' ? 'text-green-500' : 'text-red-400')}>
          {message.text}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'px-5 py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-sm font-medium hover:bg-brand-gold/30 transition-colors',
          saving && 'opacity-50 cursor-not-allowed',
        )}
      >
        {saving ? 'Saving...' : 'Save Health Profile'}
      </button>
    </div>
  )
}
