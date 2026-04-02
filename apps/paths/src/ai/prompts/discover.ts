/**
 * Build the prompt for conversational content discovery.
 * Takes a user's free-text goal and a list of candidate content items
 * found via semantic search, asks the AI to rank and structure them
 * into a learning path.
 */
export function buildDiscoverPrompt(
  userQuery: string,
  candidates: Array<{
    sourceId: string
    sourceCollection: string
    sourceTitle: string
    snippet: string
    accessLevel: string
  }>,
): string {
  const candidateList = candidates
    .map(
      (c, i) =>
        `[${i + 1}] "${c.sourceTitle}" (${c.sourceCollection}) — ${c.snippet.slice(0, 150)}`,
    )
    .join('\n')

  return `You are a learning path curator for PATHS by LIMITLESS, a longevity education platform.

A student described their goal:
"${userQuery}"

Below are candidate content items found in the platform's library. Select the most relevant items and order them into a structured learning path. Choose 3-8 items maximum.

Candidates:
${candidateList}

Return a JSON array of selected items in learning order. For each item include:
- "index": the candidate number (1-based)
- "reasoning": one sentence explaining why this item is relevant to the student's goal

Format:
[
  { "index": 1, "reasoning": "..." },
  { "index": 3, "reasoning": "..." }
]

Rules:
- Select only items genuinely relevant to the stated goal.
- Order from foundational to advanced (concepts before application).
- If fewer than 3 candidates are relevant, return fewer.
- Return ONLY the JSON array, no other text.`
}

export function parseDiscoverResponse(
  response: string,
  candidates: Array<{
    sourceId: string
    sourceCollection: string
    sourceTitle: string
    accessLevel: string
  }>,
): Array<{
  sourceId: string
  collection: string
  title: string
  reasoning: string
  order: number
  accessLevel: string
}> {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; reasoning: string }>

    return parsed
      .filter((item) => item.index >= 1 && item.index <= candidates.length)
      .map((item, order) => {
        const candidate = candidates[item.index - 1]
        return {
          sourceId: candidate.sourceId,
          collection: candidate.sourceCollection,
          title: candidate.sourceTitle,
          reasoning: item.reasoning,
          order: order + 1,
          accessLevel: candidate.accessLevel,
        }
      })
  } catch {
    return []
  }
}
