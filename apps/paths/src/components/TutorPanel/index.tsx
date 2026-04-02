'use client'
import React, { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle, Copy, Activity } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { apiUrl } from '@/utilities/apiUrl'

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  articles: [
    'Summarize the key points',
    'What are the practical takeaways?',
    'How does this relate to other pillars?',
  ],
  lessons: [
    'Explain this in simpler terms',
    'What should I practice today?',
    'How does this connect to the course goals?',
  ],
}

/** Simple markdown-to-JSX renderer (no external dependency) */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 space-y-0.5 my-1">
          {listItems.map((item, i) => <li key={i}>{formatInline(item)}</li>)}
        </ul>
      )
      listItems = []
    }
  }

  const formatInline = (line: string): React.ReactNode => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 bg-brand-glass-bg rounded text-[11px]">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  for (const line of lines) {
    if (line.match(/^[-*]\s/)) {
      listItems.push(line.replace(/^[-*]\s/, ''))
    } else {
      flushList()
      if (line.trim() === '') {
        elements.push(<br key={`br-${elements.length}`} />)
      } else {
        elements.push(<p key={`p-${elements.length}`} className="my-0.5">{formatInline(line)}</p>)
      }
    }
  }
  flushList()

  return <>{elements}</>
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export const TutorPanel: React.FC<{
  open: boolean
  onClose: () => void
  contextType: string
  contextId: string
  contextTitle: string
}> = ({ open, onClose, contextType, contextId, contextTitle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escalation, setEscalation] = useState<{ topic: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setError(null)

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      const res = await fetch(apiUrl('/api/ai/tutor'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          contextType,
          contextId,
        }),
      })

      if (res.status === 401) {
        setError('Please sign in to use the AI Tutor.')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setError('You do not have access to the AI Tutor. Upgrade your plan for access.')
        setLoading(false)
        return
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => null)
        const isZeroLimit = data?.limit === 0
        setError(
          isZeroLimit
            ? 'AI Tutor is not available on your current plan. Upgrade for access.'
            : 'Daily tutor limit reached. Upgrade your plan for more access.',
        )
        setLoading(false)
        return
      }

      if (res.status === 503) {
        setError('AI features are temporarily unavailable.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Stream SSE response
      const reader = res.body?.getReader()
      if (!reader) return

      let assistantContent = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.escalation) {
                setEscalation({ topic: parsed.topic || 'Health consultation' })
              } else if (parsed.text) {
                assistantContent += parsed.text
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
      clearTimeout(timeout)
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('The AI tutor is taking too long. Please try a shorter question.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-background border-l border-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand-gold" />
            <div>
              <p className="text-sm font-semibold">AI Tutor</p>
              <p className="text-[11px] text-brand-silver truncate max-w-[250px]">{contextTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-brand-glass-bg-hover rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-brand-silver pt-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="mb-4">Ask me anything about this content.</p>
              <div className="space-y-2">
                {(SUGGESTED_QUESTIONS[contextType] || SUGGESTED_QUESTIONS.articles).map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); setTimeout(() => sendMessage(), 0) }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-xs text-brand-silver bg-brand-glass-bg border border-brand-glass-border hover:bg-brand-glass-bg-hover hover:text-brand-light transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'text-sm leading-relaxed group relative',
                msg.role === 'user'
                  ? 'bg-brand-glass-bg rounded-lg p-3 ml-8'
                  : 'pr-8',
              )}
            >
              {msg.role === 'assistant' && msg.content ? (
                <>
                  {renderMarkdown(msg.content)}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content)
                    }}
                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 text-brand-silver/40 hover:text-brand-silver transition-all"
                    aria-label="Copy message"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </>
              ) : (
                msg.content || (loading && i === messages.length - 1 && (
                  <span className="flex items-center gap-2 text-brand-silver/50 text-sm">
                    <span className="inline-block w-2 h-4 bg-brand-gold/50 animate-pulse" />
                    Thinking...
                  </span>
                ))
              )}
            </div>
          ))}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/5 rounded-lg p-3">{error}</div>
          )}

          {/* Escalation CTA */}
          {escalation && (
            <div className="rounded-xl border border-brand-gold/20 bg-brand-gold-dim p-4">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-light mb-1">Clinical Consultation Recommended</p>
                  <p className="text-xs text-brand-silver mb-3">
                    This topic may benefit from personalized guidance from our medical team.
                  </p>
                  <a
                    href="/book/telemedicine"
                    className="inline-block px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.1em] border border-brand-gold bg-brand-gold text-brand-dark hover:bg-brand-gold/90 transition-all min-h-[44px] leading-[28px] text-center"
                  >
                    Book a Telemedicine Consultation
                  </a>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 bg-brand-glass-bg rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-gold/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                'p-2 rounded-lg transition-colors',
                input.trim() ? 'bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30' : 'text-brand-silver',
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
