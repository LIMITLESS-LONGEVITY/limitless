/**
 * Build a health context section for AI prompts.
 * Shared by the tutor (B1), action plans (B2), and daily protocols (C1).
 */
export function buildHealthContextSection(profile: any): string {
  const sections: string[] = []

  // Biomarkers (with trend info for multi-entry markers)
  if (profile.biomarkers?.length > 0) {
    // Group by name to detect trends
    const grouped: Record<string, Array<{ value: number; date: string; unit: string; status: string; normalRangeLow?: number; normalRangeHigh?: number }>> = {}
    for (const b of profile.biomarkers) {
      if (!b.name || b.value == null) continue
      if (!grouped[b.name]) grouped[b.name] = []
      grouped[b.name].push(b)
    }

    const markerDescriptions: string[] = []
    for (const [name, entries] of Object.entries(grouped)) {
      // Sort by date ascending
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const latest = entries[entries.length - 1]
      const range =
        latest.normalRangeLow != null && latest.normalRangeHigh != null
          ? `, normal: ${latest.normalRangeLow}-${latest.normalRangeHigh}`
          : ''

      let trendInfo = ''
      if (entries.length >= 2) {
        const first = entries[0]
        const change = latest.value - first.value
        const direction = Math.abs(change) < (first.value * 0.03) ? 'stable' : change > 0 ? '↑' : '↓'
        const days = Math.round((new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))
        const period = days < 60 ? `${days} days` : `${Math.round(days / 30)} months`
        trendInfo = direction === 'stable'
          ? `, trend: stable over ${period}`
          : `, trend: ${direction} from ${first.value} over ${period}`
      }

      markerDescriptions.push(
        `${name}: ${latest.value} ${latest.unit} (${latest.status.toUpperCase()}${range}${trendInfo})`,
      )
    }

    sections.push(`Biomarkers: ${markerDescriptions.join('; ')}`)
  }

  // Health goals
  if (profile.healthGoals?.length > 0) {
    const goals = profile.healthGoals
      .map((g: any) => g.goal.replace(/-/g, ' '))
      .join(', ')
    sections.push(`Goals: ${goals}`)
  }

  // Conditions
  if (profile.conditions?.length > 0) {
    const conditions = profile.conditions.map((c: any) => c.condition).join(', ')
    sections.push(`Conditions: ${conditions}`)
  }

  // Medications
  if (profile.medications?.length > 0) {
    const meds = profile.medications.map((m: any) => m.medication).join(', ')
    sections.push(`Medications: ${meds}`)
  }

  // Pillar priorities
  if (profile.pillarPriorities?.length > 0) {
    const pillars = profile.pillarPriorities
      .map((p: any) => (typeof p.pillar === 'object' ? p.pillar.name : 'Unknown'))
      .join(', ')
    sections.push(`Priority areas: ${pillars}`)
  }

  if (sections.length === 0) return ''

  return `== Health Context (confidential — do not repeat raw data unnecessarily) ==
${sections.join('\n')}

When relevant, connect content to the student's specific health data.
For example, if discussing a biomarker they have measured, reference their actual value.
IMPORTANT: All guidance is educational, not medical advice. Remind the student to consult a qualified healthcare provider for personal medical decisions.`
}
