import { useState, useRef, useEffect } from 'react'
import { aiApi } from '@/api/aiApi'
import { Send, Bot, User, Zap, BarChart3, FileText, Landmark, Scale, TrendingUp, Activity } from 'lucide-react'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { AIQueryResponse } from '@/types/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  intent?: string
  dataSource?: string
}

const QUICK_ACTIONS = [
  { label: 'What is our biggest risk?', icon: Zap },
  { label: 'How should we invest?', icon: BarChart3 },
  { label: 'What is the national posture?', icon: Landmark },
  { label: 'Compliance coverage vs regulations?', icon: Scale },
  { label: 'EAL forecast over 12 months?', icon: TrendingUp },
  { label: 'What is our VaR95?', icon: Activity },
  { label: 'Executive Summary', icon: FileText },
]

function renderMessage(content: string) {
  let html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br/>')
  return html
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI security assistant. Ask me anything about your organization\'s cybersecurity posture, risk analysis, or investment recommendations.',
    },
  ])
  const [input, setInput] = useState('')
  const [responding, setResponding] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const send = async (question: string) => {
    if (!question.trim() || responding) return
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setResponding(true)

    try {
      const res = await aiApi.query(question.trim())
      const data: AIQueryResponse = res.data
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        intent: data.intent,
        dataSource: data.data_source,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
        },
      ])
    }
    setResponding(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col cyber-card">
      <div className="border-b border-border-subtle px-6 py-4" data-tour="ai-header">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent-primary" />
          <h2 className="text-sm font-semibold text-text-primary">AI Security Assistant</h2>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4" data-tour="chat-thread">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-[75%] items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-bg-elevated text-text-primary border border-border-subtle'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-accent-secondary" />
                  )}
                </div>
                <div>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
                  />
                  {msg.confidence !== undefined && (
                    <p className="mt-1 text-xs opacity-60">
                      Confidence: {(msg.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                  {msg.intent && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-text-tertiary">
                      <span className="rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-accent-primary">
                        {msg.intent}
                      </span>
                      <span className="max-w-[240px] truncate font-mono opacity-80">
                        {msg.dataSource}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {responding && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-bg-elevated px-4 py-3 text-sm text-text-tertiary">
                <LoadingSpinner size="sm" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border-subtle px-6 py-3" data-tour="chat-composer">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => send(action.label)}
              disabled={responding}
              className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="cyber-input flex-1"
            disabled={responding}
          />
          <button
            type="submit"
            disabled={!input.trim() || responding}
            className="cyber-btn-primary"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
