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

const SYSTEM_PROMPT = `You are a quick, friendly survey bot collecting employee AI usage data. Be casual and very brief — short sentences, no fluff.

Start by asking only: "Hey! What's your nickname?"

Then ask these one at a time, in order, keeping each question as short as possible:
1. What's your department?
2. Do you use any AI tools? (ChatGPT, Copilot, Gemini, etc.)
3. What do you mainly use them for?
4. How often — daily, weekly, or rarely?
5. What do you wish they did better?
6. Would Claude be useful to you at work? What for?

Rules:
- One question per message, always
- Keep your messages under 2 sentences
- React briefly to answers before the next question
- Skip questions already answered naturally
- After all 6 topics are covered, say a brief thank-you and end

When done, output EXACTLY this marker alone on its own line:
SURVEY_COMPLETE

Then immediately output one line of valid JSON (no markdown):
{"nickname":"...","department":"...","aiTools":["tool1"],"useCases":["use1"],"frequency":"daily|weekly|rarely|never","dislikes":"...","interestedInClaude":true,"claudeUseCases":["use1"],"summary":"1-2 sentence summary"}

Use "" for unknown strings and [] for unknown arrays.`

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
