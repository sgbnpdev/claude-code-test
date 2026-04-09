import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import express from 'express'
import cors from 'cors'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESPONSES_FILE = join(__dirname, 'survey-responses.json')

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

const app = express()
app.use(cors())
app.use(express.json())

const SYSTEM_PROMPT = `You are a warm, friendly survey assistant conducting a brief internal employee survey about AI tool usage. Your company wants to understand how employees currently use AI tools — and whether they would benefit from having access to Claude (an AI assistant by Anthropic).

Your survey should cover these topics through natural conversation:
1. Employee name and department (to personalise the conversation)
2. Which AI tools they currently use (ChatGPT, Gemini, Copilot, Midjourney, etc.) — or whether they use none at all
3. What tasks they use AI for (writing, coding, research, summarising, brainstorming, customer support, etc.)
4. How often they use these tools (daily, weekly, occasionally, never tried)
5. What they like and don't like about their current AI tools (or why they haven't tried any)
6. Whether they'd be interested in using Claude for work, and for what tasks specifically

Guidelines:
- Be warm and conversational — not formal or robotic
- Ask 1–2 questions at a time, never more
- Acknowledge and react naturally to each answer before moving on
- Don't re-ask anything they've already answered
- The conversation should feel like a friendly 5-minute chat, not a questionnaire
- Once you genuinely have enough information on all topics (typically 6–10 exchanges), thank them warmly and wrap up

When you are satisfied you have covered all topics, output EXACTLY this marker on its own line (no extra characters):
SURVEY_COMPLETE

Immediately after that marker, output a single valid JSON object on one line (no markdown fences, no extra text):
{"name":"...","department":"...","aiTools":["tool1"],"useCases":["use1"],"frequency":"daily|weekly|occasionally|never","likes":"...","dislikes":"...","interestedInClaude":true,"claudeUseCases":["use1"],"summary":"2–3 sentence summary of this person's AI usage and needs"}

Use empty string "" for unknown text fields and empty arrays [] for unknown lists. Only output SURVEY_COMPLETE when you genuinely have collected enough information — don't rush.`

// ── Chat endpoint ─────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })
    res.json({ content: response.content[0].text })
  } catch (err) {
    console.error('Claude API error:', err.message)
    res.status(500).json({ error: 'Failed to get AI response. Is ANTHROPIC_API_KEY set?' })
  }
})

// ── Save response endpoint ────────────────────────────────────────────────────

app.post('/api/save', (req, res) => {
  const { surveyData } = req.body
  if (!surveyData) return res.status(400).json({ error: 'surveyData required' })

  const entry = { ...surveyData, savedAt: new Date().toISOString() }

  let responses = []
  if (existsSync(RESPONSES_FILE)) {
    try { responses = JSON.parse(readFileSync(RESPONSES_FILE, 'utf8')) } catch {}
  }
  responses.push(entry)
  writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2))

  console.log(`✓ Saved response from ${entry.name || 'Anonymous'} (${entry.department || '—'}) | total: ${responses.length}`)
  res.json({ success: true, total: responses.length })
})

// ── Read responses endpoint (simple admin) ────────────────────────────────────

app.get('/api/responses', (req, res) => {
  if (!existsSync(RESPONSES_FILE)) return res.json([])
  try { res.json(JSON.parse(readFileSync(RESPONSES_FILE, 'utf8'))) } catch { res.json([]) }
})

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n  Survey API  →  http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  ⚠️  ANTHROPIC_API_KEY is not set — /api/chat will fail\n')
  } else {
    console.log('  ✓  Anthropic API key loaded\n')
  }
})
