import type { Block } from 'payload'

export const QuizQuestion: Block = {
  slug: 'quizQuestion',
  interfaceName: 'QuizQuestionBlock',
  labels: { singular: 'Quiz Question', plural: 'Quiz Questions' },
  fields: [
    { name: 'question', type: 'text', required: true },
    {
      name: 'options',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 6,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'correctAnswer',
      type: 'number',
      required: true,
      admin: { description: '0-based index of the correct option' },
    },
    { name: 'explanation', type: 'textarea' },
  ],
}
