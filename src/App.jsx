import { useState, useRef, useEffect } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCompletion(content) {
  const [before, after] = content.split('SURVEY_COMPLETE')
  let data = null
  if (after) {
    const jsonStr = after.trim()
    try { data = JSON.parse(jsonStr) } catch {}
  }
  return { textBefore: before?.trim() || '', data }
}

async function saveResponse(surveyData) {
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyData }),
    })
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={S.typingDots}>
      <span className="dot" /><span className="dot" /><span className="dot" />
    </div>
  )
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ ...S.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={S.avatar}>AI</div>}
      <div style={{ ...S.bubble, ...(isUser ? S.userBubble : S.botBubble) }}>
        {content}
      </div>
    </div>
  )
}

// ── Screens ───────────────────────────────────────────────────────────────────

function LandingScreen({ onStart }) {
  return (
    <div style={S.center}>
      <div style={S.card}>
        <div style={S.logoMark}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#111" strokeWidth="2" />
            <circle cx="16" cy="10" r="2.5" fill="#111" />
            <circle cx="16" cy="16" r="2.5" fill="#111" />
            <circle cx="16" cy="22" r="2.5" fill="#111" />
          </svg>
        </div>
        <h1 style={S.landingTitle}>AI Usage Survey</h1>
        <p style={S.landingDesc}>
          We want to understand how our team already uses AI tools — and whether
          Claude could be useful for you.
        </p>
        <p style={S.landingNote}>
          This is a short chat, not a form. Just answer naturally.&nbsp;
          <span style={{ color: 'rgba(0,0,0,0.4)' }}>~5 minutes</span>
        </p>
        <button style={S.startBtn} onClick={onStart}>
          Start conversation
        </button>
      </div>
    </div>
  )
}

function CompletionScreen({ result }) {
  return (
    <div style={S.center}>
      <div style={S.card}>
        <div style={S.checkCircle}>✓</div>
        <h2 style={S.completionTitle}>Thanks for sharing!</h2>
        <p style={S.completionSub}>Your responses have been recorded.</p>
        {result?.summary && (
          <div style={S.summaryBox}>
            <div style={S.summaryLabel}>Your summary</div>
            <p style={S.summaryText}>{result.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState('landing') // 'landing' | 'chat' | 'done'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [surveyResult, setSurveyResult] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const callClaude = async (history) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Server error')
    }
    return (await res.json()).content
  }

  const handleCompletion = async (content, history) => {
    const { textBefore, data } = parseCompletion(content)
    if (textBefore) {
      setMessages([...history, { role: 'assistant', content: textBefore }])
    }
    if (data) {
      await saveResponse(data)
      setSurveyResult(data)
    }
    setPhase('done')
  }

  const startSurvey = async () => {
    setPhase('chat')
    setLoading(true)
    try {
      const content = await callClaude([])
      if (content.includes('SURVEY_COMPLETE')) {
        await handleCompletion(content, [])
      } else {
        setMessages([{ role: 'assistant', content }])
      }
    } catch (e) {
      setMessages([{ role: 'assistant', content: `⚠️ ${e.message}` }])
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    try {
      const content = await callClaude(history)
      if (content.includes('SURVEY_COMPLETE')) {
        await handleCompletion(content, history)
      } else {
        setMessages([...history, { role: 'assistant', content }])
      }
    } catch (e) {
      setMessages([...history, { role: 'assistant', content: `⚠️ ${e.message}` }])
    }
    setLoading(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const onInput = (e) => {
    // Auto-grow textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
    setInput(e.target.value)
  }

  if (phase === 'landing') return <LandingScreen onStart={startSurvey} />
  if (phase === 'done')    return <CompletionScreen result={surveyResult} />

  return (
    <div style={S.chatShell}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.avatar} style={{ ...S.avatar, width: 34, height: 34, fontSize: 11 }}>AI</div>
        <div>
          <div style={S.headerName}>AI Survey Assistant</div>
          <div style={S.headerStatus}>
            <span style={S.statusDot} />
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={S.messagesArea}>
        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
        {loading && (
          <div style={{ ...S.row, justifyContent: 'flex-start' }}>
            <div style={S.avatar}>AI</div>
            <div style={{ ...S.bubble, ...S.botBubble }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputBar}>
        <div style={S.inputInner}>
          <textarea
            style={S.textarea}
            value={input}
            onChange={onInput}
            onKeyDown={onKeyDown}
            placeholder="Type your message…"
            rows={1}
            disabled={loading}
          />
          <button
            style={{ ...S.sendBtn, opacity: input.trim() && !loading ? 1 : 0.35 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M14 8L9 3M14 8L9 13" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div style={S.hint}>Enter to send &nbsp;·&nbsp; Shift+Enter for new line</div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  // Layout
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f7f7f5', padding: 24,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '48px 44px',
    boxShadow: '0 2px 24px rgba(0,0,0,0.07)', maxWidth: 480, width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  chatShell: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#f7f7f5', fontFamily: 'Inter, sans-serif',
  },

  // Landing
  logoMark: { marginBottom: 24 },
  landingTitle: { fontSize: 26, fontWeight: 800, color: '#111', margin: '0 0 14px' },
  landingDesc: { fontSize: 15, color: 'rgba(0,0,0,0.55)', lineHeight: 1.6, margin: '0 0 10px' },
  landingNote: { fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: '0 0 32px' },
  startBtn: {
    background: '#111', color: '#fff', border: 'none', borderRadius: 12,
    padding: '14px 40px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    letterSpacing: '0.02em',
  },

  // Completion
  checkCircle: {
    width: 56, height: 56, borderRadius: '50%', background: '#111',
    color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  completionTitle: { fontSize: 22, fontWeight: 700, color: '#111', margin: '0 0 8px' },
  completionSub: { fontSize: 14, color: 'rgba(0,0,0,0.45)', margin: '0 0 24px' },
  summaryBox: {
    background: '#f7f7f5', borderRadius: 12, padding: '16px 20px',
    width: '100%', textAlign: 'left',
  },
  summaryLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', marginBottom: 8 },
  summaryText: { fontSize: 14, color: 'rgba(0,0,0,0.7)', lineHeight: 1.6, margin: 0 },

  // Header
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 24px', background: '#fff',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
  },
  headerName: { fontSize: 14, fontWeight: 600, color: '#111' },
  headerStatus: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(0,0,0,0.4)' },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' },

  // Messages
  messagesArea: {
    flex: 1, overflowY: 'auto', padding: '24px 0',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  row: { display: 'flex', alignItems: 'flex-end', gap: 10, padding: '4px 24px' },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#111', color: '#fff', fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: 'min(520px, 72%)', padding: '12px 16px',
    borderRadius: 18, fontSize: 14, lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  botBubble: {
    background: '#fff', color: '#111',
    border: '1px solid rgba(0,0,0,0.08)',
    borderBottomLeftRadius: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  userBubble: {
    background: '#111', color: '#fff',
    borderBottomRightRadius: 4,
  },

  // Typing dots
  typingDots: { display: 'flex', gap: 5, padding: '2px 4px' },

  // Input bar
  inputBar: {
    background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)',
    padding: '16px 24px 20px',
  },
  inputInner: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textarea: {
    flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 14,
    padding: '11px 16px', fontSize: 14, fontFamily: 'Inter, sans-serif',
    resize: 'none', outline: 'none', color: '#111', background: '#fafafa',
    lineHeight: 1.5, minHeight: 44, maxHeight: 140,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 12, background: '#111',
    border: 'none', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
  hint: { fontSize: 11, color: 'rgba(0,0,0,0.28)', marginTop: 8, textAlign: 'center' },
}
