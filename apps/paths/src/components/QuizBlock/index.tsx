'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import { CheckCircle2, XCircle } from 'lucide-react'

type QuizBlockProps = {
  question: string
  options: Array<{ text: string }>
  correctAnswer: number
  explanation?: string
}

export const QuizBlock: React.FC<QuizBlockProps> = ({
  question,
  options,
  correctAnswer: rawCorrectAnswer,
  explanation,
}) => {
  const correctAnswer = Number(rawCorrectAnswer)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const handleSelect = (index: number) => {
    if (revealed) return
    setSelected(index)
    setRevealed(true)
  }

  return (
    <div className="my-6 p-5 border border-border rounded-xl bg-card/50">
      <p className="text-sm font-semibold mb-4">{question}</p>
      <div className="space-y-2">
        {options.map((option, i) => {
          const isCorrect = i === correctAnswer
          const isSelected = i === selected

          let optionStyle = 'border-border hover:bg-muted/50 cursor-pointer'
          if (revealed) {
            if (isCorrect) optionStyle = 'border-green-500/50 bg-green-500/5'
            else if (isSelected && !isCorrect) optionStyle = 'border-red-500/50 bg-red-500/5'
            else optionStyle = 'border-border opacity-50'
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-left transition-all',
                optionStyle,
              )}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full border border-current text-xs font-medium flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option.text}</span>
              {revealed && isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              {revealed && isSelected && !isCorrect && (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
      {revealed && explanation && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Explanation: </span>
          {explanation}
        </div>
      )}
    </div>
  )
}
