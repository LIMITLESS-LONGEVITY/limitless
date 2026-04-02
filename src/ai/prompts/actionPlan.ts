import type { RetrievedChunk } from '../retrieval'
import { buildHealthContextSection } from './healthContext'

/**
 * Build the prompt for generating a personalized 30-day action plan
 * based on course content and optional health profile data.
 */
export function buildActionPlanPrompt(
  courseTitle: string,
  pillarName: string,
  chunks: RetrievedChunk[],
  healthProfile?: any | null,
): string {
  const contentContext = chunks
    .slice(0, 8)
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 300)}`)
    .join('\n\n')

  const healthContext = healthProfile ? buildHealthContextSection(healthProfile) : ''

  return `You are a longevity action plan generator for PATHS by LIMITLESS.

The student has completed the course: "${courseTitle}" (Pillar: ${pillarName})

Course content excerpts:
${contentContext}
${healthContext ? `\n${healthContext}\n` : ''}
Generate a personalized 30-day action plan structured as 4 weeks. Each week has a theme and 7 days. Each day has morning, afternoon, and evening action blocks.

${healthProfile ? 'Personalize recommendations based on the health context above. Reference specific biomarker values when suggesting supplements or interventions.' : 'Provide general longevity recommendations based on the course content.'}

Return ONLY a JSON object with this structure:
{
  "title": "30-Day [Pillar] Action Plan",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Foundation — Building Baseline Habits",
      "days": [
        {
          "dayNumber": 1,
          "morning": ["Action description (5-10 min cold exposure)"],
          "afternoon": ["Action description"],
          "evening": ["Action description"]
        }
      ],
      "checkpoint": "End-of-week reflection question or measurement to track"
    }
  ]
}

Rules:
- Each action should be specific and actionable (not vague like "eat healthy")
- Reference course content when possible
- Include a mix of nutrition, movement, sleep, and mindset actions appropriate to the pillar
- Gradually increase intensity/complexity across weeks
- Keep each day's total actions to 3-5 items
- IMPORTANT: This is educational guidance, not medical advice
- Return ONLY valid JSON, no other text`
}

export function parseActionPlanResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}
