export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface QuizResponse {
  questions: QuizQuestion[]
}

export function buildQuizPrompt(title: string, contentText: string, questionCount: number): string {
  return `You are a quiz generator for an educational platform. Generate exactly ${questionCount} multiple-choice questions based on the following content.

Content title: ${title}
Content:
${contentText}

Requirements:
- Each question must have exactly 4 options.
- Exactly one option must be correct.
- The correctAnswer field is the 0-based index of the correct option.
- Include a brief explanation for why the correct answer is correct.
- Questions should test understanding, not just recall.
- Vary difficulty: include some easy, some moderate, and some challenging questions.
- Do not include questions about topics not covered in the content.

Respond with ONLY valid JSON in this exact format, no other text:
{
  "questions": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Option A is correct because..."
    }
  ]
}`
}

export function parseQuizResponse(response: string): QuizResponse {
  let cleaned = response.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse quiz response as JSON')
  }

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Quiz response missing "questions" array')
  }

  for (const q of parsed.questions) {
    if (!q.question || typeof q.question !== 'string') throw new Error('Quiz question missing "question" field')
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error('Quiz question must have at least 2 options')
    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
      throw new Error(`Invalid correctAnswer index: ${q.correctAnswer}`)
    }
  }

  return parsed as QuizResponse
}
