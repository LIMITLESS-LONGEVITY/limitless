import type { RetrievedChunk } from '../retrieval'
import { buildHealthContextSection } from './healthContext'

/**
 * Build the prompt for generating a personalized daily longevity protocol.
 */
export function buildDailyProtocolPrompt(
  enrolledCourses: Array<{ title: string; pillarName: string }>,
  recentLessons: Array<{ title: string; courseTitle: string }>,
  chunks: RetrievedChunk[],
  healthProfile?: any | null,
  stayContext?: string | null,
): string {
  const courseList = enrolledCourses
    .map((c) => `- ${c.title} (${c.pillarName})`)
    .join('\n')

  const recentList = recentLessons.length > 0
    ? recentLessons.map((l) => `- "${l.title}" from ${l.courseTitle}`).join('\n')
    : 'No recent activity'

  const contentContext = chunks
    .slice(0, 6)
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 200)}`)
    .join('\n')

  const healthContext = healthProfile ? buildHealthContextSection(healthProfile) : ''

  return `You are a daily longevity protocol generator for PATHS by LIMITLESS.

Create a personalized daily protocol for today based on the student's enrolled courses and recent learning activity.

Enrolled courses:
${courseList || 'None'}

Recently completed lessons:
${recentList}

Relevant content:
${contentContext}
${healthContext ? `\n${healthContext}\n` : ''}${stayContext ? `\n== Stay Context ==\n${stayContext}\n` : ''}
Generate a daily protocol with morning, afternoon, and evening blocks. Each block has 2-4 specific, actionable items.

Return ONLY a JSON object:
{
  "blocks": [
    {
      "timeOfDay": "morning",
      "actions": [
        {
          "id": "m1",
          "action": "10-minute cold exposure (cold shower, last 2 minutes)",
          "sourceTitle": "Cold Exposure for Recovery",
          "completed": false
        }
      ]
    },
    {
      "timeOfDay": "afternoon",
      "actions": [...]
    },
    {
      "timeOfDay": "evening",
      "actions": [...]
    }
  ]
}

Rules:
- Each action must be specific and time-bounded (e.g., "10 minutes", "2 servings")
- Reference course content where possible via sourceTitle
- Include a mix across pillars the student is studying
- Morning: movement, exposure, nutrition prep
- Afternoon: nutrition, learning, movement
- Evening: sleep prep, reflection, recovery
- Total 6-10 actions across the day
- Use sequential IDs: m1, m2, a1, a2, e1, e2, etc.
- IMPORTANT: Educational guidance, not medical advice
- Return ONLY valid JSON`
}

export function parseDailyProtocolResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.blocks || !Array.isArray(parsed.blocks)) return null
    // Count total actions
    let total = 0
    for (const block of parsed.blocks) {
      if (Array.isArray(block.actions)) total += block.actions.length
    }
    return { ...parsed, _totalCount: total }
  } catch {
    return null
  }
}
