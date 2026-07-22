'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'How can I improve my video CTR?',
  'Suggest 3 viral video ideas for my niche',
  'What\'s the best upload schedule for tech content?',
  'Write a catchy hook for an AI tools video',
]

const STARTER_PROMPTS = [
  { icon: '📈', text: 'Analyze my channel growth' },
  { icon: '💡', text: 'Brainstorm video ideas' },
  { icon: '✍️', text: 'Help me write a script' },
  { icon: '🎯', text: 'Improve my SEO' },
]

export function AiChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { view } = useAppStore()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setInput('')
      setLoading(true)
      setHasInteracted(true)

      try {
        const context = `User is currently viewing the "${view}" section of TubeFlow AI, a YouTube workflow platform.`
        const data = await apiFetch<{ reply: string }>('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            context,
          }),
        })
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Sorry, I couldn\'t generate a response.',
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Chat failed')
        const errMsg: Message = {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an error. Please try again.',
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setLoading(false)
      }
    },
    [messages, loading, view]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setHasInteracted(false)
  }

  return (
    <>
      {/* Floating launcher button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-40 group"
            aria-label="Open AI Assistant"
          >
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full grad-primary opacity-40 animate-ping" />
            <span className="absolute inset-0 rounded-full grad-primary opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full grad-primary flex items-center justify-center shadow-xl glow-primary group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {/* Tooltip */}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap glass-strong px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Ask AI Assistant
            </span>
            {/* Unread indicator */}
            {!hasInteracted && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                !
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-3rem)] glass-strong rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative shrink-0 p-4 border-b border-border/60 grad-primary">
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                      TubeFlow AI
                      <Badge className="h-4 px-1 text-[8px] bg-white/20 text-white border-0 hover:bg-white/20">
                        BETA
                      </Badge>
                    </h3>
                    <p className="text-[10px] text-white/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      Online · Powered by Gemini
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                      aria-label="Clear chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-styled p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-2xl grad-primary flex items-center justify-center mb-4 shadow-lg glow-primary"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <h4 className="font-semibold mb-1">Hey! I&apos;m your AI co-pilot</h4>
                  <p className="text-xs text-muted-foreground mb-5 max-w-xs">
                    Ask me anything about your channel, content strategy, scripts,
                    SEO, or growth. I have full context of your workspace.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                    {STARTER_PROMPTS.map((p, i) => (
                      <motion.button
                        key={p.text}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        onClick={() => sendMessage(p.text)}
                        className="glass rounded-xl p-3 text-left hover:bg-accent/60 transition-colors group"
                      >
                        <div className="text-lg mb-1">{p.icon}</div>
                        <div className="text-xs font-medium leading-tight">{p.text}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                          m.role === 'user'
                            ? 'bg-accent'
                            : 'grad-primary'
                        }`}
                      >
                        {m.role === 'user' ? (
                          <UserIcon className="w-4 h-4 text-foreground" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div
                        className={`flex-1 min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          m.role === 'user'
                            ? 'bg-accent text-accent-foreground rounded-tr-sm'
                            : 'glass rounded-tl-sm'
                        }`}
                      >
                        {m.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_a]:text-primary [&_a]:underline">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center grad-primary">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Quick suggestions */}
            {messages.length > 0 && !loading && (
              <div className="shrink-0 px-3 pb-2 flex gap-1.5 flex-wrap">
                {SUGGESTIONS.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[10px] px-2 py-1 rounded-full glass hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-border/60">
              <div className="relative flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your channel…"
                  className="min-h-[44px] max-h-32 resize-none rounded-xl pr-10 text-sm border-border/60 bg-background/40"
                  rows={1}
                  disabled={loading}
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="absolute right-1 bottom-1 w-9 h-9 rounded-lg grad-primary text-white glow-primary shrink-0"
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
