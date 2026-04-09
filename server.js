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

// ── Read responses (JSON) ─────────────────────────────────────────────────────

app.get('/api/responses', (req, res) => {
  if (!existsSync(RESPONSES_FILE)) return res.json([])
  try { res.json(JSON.parse(readFileSync(RESPONSES_FILE, 'utf8'))) } catch { res.json([]) }
})

// ── Admin page (human-readable) ───────────────────────────────────────────────

app.get('/admin', (req, res) => {
  let responses = []
  if (existsSync(RESPONSES_FILE)) {
    try { responses = JSON.parse(readFileSync(RESPONSES_FILE, 'utf8')) } catch {}
  }

  const rows = responses.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(r.nickname || '—')}</td>
      <td>${esc(r.department || '—')}</td>
      <td>${(r.aiTools || []).map(esc).join(', ') || '—'}</td>
      <td>${(r.useCases || []).map(esc).join(', ') || '—'}</td>
      <td>${esc(r.frequency || '—')}</td>
      <td>${r.interestedInClaude ? 'Yes' : 'No'}</td>
      <td>${esc(r.summary || '—')}</td>
      <td>${esc(r.savedAt ? r.savedAt.slice(0, 10) : '—')}</td>
    </tr>`).join('')

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Survey Responses (${responses.length})</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, system-ui, sans-serif; background: #f7f7f5; margin: 0; padding: 32px 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #111; margin: 0 0 6px; }
    p  { font-size: 13px; color: rgba(0,0,0,0.45); margin: 0 0 24px; }
    table { width: 100%; border-collapse: collapse; background: #fff;
            border-radius: 14px; overflow: hidden;
            box-shadow: 0 1px 12px rgba(0,0,0,0.07); font-size: 13px; }
    th { background: #111; color: #fff; padding: 12px 14px; text-align: left;
         font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    td { padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,0.06); color: #333; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(0,0,0,0.02); }
    .empty { text-align: center; padding: 48px; color: rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <h1>AI Survey Responses</h1>
  <p>${responses.length} response${responses.length === 1 ? '' : 's'} collected &nbsp;·&nbsp; refresh to update</p>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Nickname</th><th>Dept</th><th>AI Tools</th>
        <th>Use Cases</th><th>Frequency</th><th>Wants Claude</th><th>Summary</th><th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="9" class="empty">No responses yet</td></tr>`}
    </tbody>
  </table>
</body>
</html>`)
})

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ── Serve built frontend in production ────────────────────────────────────────

const DIST = join(__dirname, 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => res.sendFile(join(DIST, 'index.html')))
}

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n  Survey app  →  http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  ⚠️  ANTHROPIC_API_KEY is not set — /api/chat will fail\n')
  } else {
    console.log('  ✓  Anthropic API key loaded\n')
  }
})
