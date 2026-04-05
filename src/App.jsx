import { useState, useEffect } from 'react'
import './App.css'

// ─── Utilities ────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateStrOffset(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => dateStrOffset(6 - i))
}

function currentStreak(habit) {
  let streak = 0
  let i = 0
  while (true) {
    const key = dateStrOffset(i)
    if (habit.completions[key]) {
      streak++
      i++
    } else {
      break
    }
  }
  return streak
}

function bestStreak(habit) {
  const keys = Object.keys(habit.completions).sort()
  if (keys.length === 0) return 0
  let best = 1, run = 1
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1])
    const curr = new Date(keys[i])
    const diff = (curr - prev) / 86400000
    if (diff === 1) {
      run++
      if (run > best) best = run
    } else {
      run = 1
    }
  }
  return best
}

function completionRateLast30(habit) {
  let completed = 0
  for (let i = 0; i < 30; i++) {
    if (habit.completions[dateStrOffset(i)]) completed++
  }
  return { completed, total: 30 }
}

function formatHeader() {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return { dayName: days[d.getDay()], day: d.getDate(), month: months[d.getMonth()] }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const CATEGORIES = [
  { id: 'health', label: 'Health' },
  { id: 'learning', label: 'Learning' },
  { id: 'work', label: 'Work' },
  { id: 'mindfulness', label: 'Mindfulness' },
  { id: 'fitness', label: 'Fitness' },
]

const SAMPLE_HABITS = [
  {
    id: 'sample-1',
    name: 'Read for 10 minutes',
    identity: 'I am a reader',
    cue: 'After my morning coffee, I will read',
    tinyVersion: 'Read one page',
    category: 'learning',
    completions: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    name: 'Meditate',
    identity: 'I am someone who is calm and present',
    cue: 'After brushing my teeth, I will meditate',
    tinyVersion: 'Take 3 deep breaths',
    category: 'mindfulness',
    completions: {},
    createdAt: new Date().toISOString(),
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline
        points="3,8 7,12 13,4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-animate"
      />
    </svg>
  )
}

function Header({ activeTab, setTab }) {
  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'habits', label: 'Habits' },
    { id: 'stats', label: 'Stats' },
  ]
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(247,247,245,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.5" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.5" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Habits</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              style={{
                border: 'none', cursor: 'pointer',
                padding: '5px 14px',
                borderRadius: 7,
                fontSize: 13, fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s ease',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#111' : 'rgba(0,0,0,0.45)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

function SevenDots({ habit }) {
  const days = last7Days()
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {days.map(day => (
        <div
          key={day}
          title={day}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: habit.completions[day] ? '#111' : 'rgba(0,0,0,0.1)',
            transition: 'background 0.2s ease',
          }}
        />
      ))}
    </div>
  )
}

function HabitCard({ habit, done, onToggle, isAnimating }) {
  const streak = currentStreak(habit)
  return (
    <div
      className={isAnimating ? 'completing' : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 14,
        padding: '14px 16px',
        backdropFilter: 'blur(12px)',
        transition: 'background 0.2s ease, opacity 0.2s ease',
        opacity: done ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-checked={done}
        role="checkbox"
        style={{
          flexShrink: 0,
          width: 38, height: 38,
          borderRadius: '50%',
          border: done ? 'none' : '2px solid rgba(0,0,0,0.2)',
          background: done ? '#111' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        {done && <CheckIcon />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#111',
          textDecoration: done ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 3,
        }}>
          {habit.name}
        </div>
        {habit.cue && (
          <div style={{
            fontSize: 11, color: 'rgba(0,0,0,0.38)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 6,
          }}>
            {habit.cue}
          </div>
        )}
        <SevenDots habit={habit} />
      </div>

      {/* Streak */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', lineHeight: 1 }}>{streak}</div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2, letterSpacing: '0.04em' }}>
          {streak === 1 ? 'day' : 'days'}
        </div>
      </div>
    </div>
  )
}

function TodayView({ habits, toggleCompletion, justCompleted, setTab }) {
  const { dayName, day, month } = formatHeader()
  const todayKey = todayStr()
  const doneCount = habits.filter(h => h.completions[todayKey]).length

  // Derive identity quote from habit with longest current streak
  const topHabit = habits.reduce((best, h) => {
    const s = currentStreak(h)
    return s > (best ? currentStreak(best) : -1) ? h : best
  }, null)

  if (habits.length === 0) {
    return (
      <div className="tab-content" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>○</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>No habits yet</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
          Small habits compound into remarkable results.<br />Start with just one.
        </div>
        <button
          onClick={() => setTab('habits')}
          style={{
            background: '#111', color: 'white', border: 'none',
            borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Add your first habit
        </button>
      </div>
    )
  }

  return (
    <div className="tab-content">
      {/* Date Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          {dayName}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {day} {month}
        </div>
      </div>

      {/* Identity Quote */}
      {topHabit?.identity && (
        <div style={{
          background: 'rgba(0,0,0,0.03)', borderRadius: 10,
          padding: '12px 14px', marginBottom: 24,
          borderLeft: '2px solid rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Identity</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {topHabit.identity}
          </div>
        </div>
      )}

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>
          {doneCount} of {habits.length} done
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>
          {Math.round((doneCount / habits.length) * 100)}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 20 }}>
        <div style={{
          height: '100%',
          width: `${(doneCount / habits.length) * 100}%`,
          background: '#111', borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Habit List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.map(habit => (
          <HabitCard
            key={habit.id}
            habit={habit}
            done={!!habit.completions[todayKey]}
            onToggle={() => toggleCompletion(habit.id)}
            isAnimating={justCompleted.has(habit.id)}
          />
        ))}
      </div>

      {doneCount === habits.length && habits.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
          All done for today. Keep showing up.
        </div>
      )}
    </div>
  )
}

function AddHabitForm({ form, setForm, onSave, onCancel, editing }) {
  const field = (key, placeholder, multiline) => {
    const style = {
      background: 'rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: 10, color: '#111',
      fontSize: 13, padding: '11px 13px',
      outline: 'none', width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
      resize: 'none',
    }
    return multiline ? (
      <textarea
        placeholder={placeholder}
        value={form[key]}
        rows={2}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={style}
      />
    ) : (
      <input
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={style}
      />
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.8)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 14, padding: 20,
      backdropFilter: 'blur(12px)',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>
        {editing ? 'Edit Habit' : 'New Habit'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Habit</label>
          {field('name', 'e.g. Read every day')}
        </div>

        {/* Identity */}
        <div>
          <label style={labelStyle}>Identity — who are you becoming?</label>
          {field('identity', 'I am someone who...')}
        </div>

        {/* Cue */}
        <div>
          <label style={labelStyle}>Implementation intention</label>
          {field('cue', 'After [trigger], I will [habit]', true)}
        </div>

        {/* Tiny version */}
        <div>
          <label style={labelStyle}>2-minute version (tiny habit)</label>
          {field('tinyVersion', 'e.g. Read one page')}
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                style={{
                  border: form.category === cat.id ? '1.5px solid #111' : '1.5px solid rgba(0,0,0,0.15)',
                  background: form.category === cat.id ? '#111' : 'transparent',
                  color: form.category === cat.id ? 'white' : 'rgba(0,0,0,0.55)',
                  borderRadius: 20, padding: '5px 12px',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={onSave}
            disabled={!form.name.trim()}
            style={{
              flex: 1, background: form.name.trim() ? '#111' : 'rgba(0,0,0,0.15)',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '11px', fontSize: 13, fontWeight: 600,
              cursor: form.name.trim() ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s ease',
            }}
          >
            {editing ? 'Save Changes' : 'Add Habit'}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.5)', borderRadius: 10,
              padding: '11px 16px', fontSize: 13, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function HabitsView({ habits, setHabits }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', identity: '', cue: '', tinyVersion: '', category: 'health' })

  const emptyForm = { name: '', identity: '', cue: '', tinyVersion: '', category: 'health' }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (habit) => {
    setEditingId(habit.id)
    setForm({ name: habit.name, identity: habit.identity, cue: habit.cue, tinyVersion: habit.tinyVersion, category: habit.category })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editingId) {
      setHabits(prev => prev.map(h =>
        h.id === editingId ? { ...h, ...form } : h
      ))
    } else {
      setHabits(prev => [...prev, {
        id: generateId(),
        ...form,
        completions: {},
        createdAt: new Date().toISOString(),
      }])
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    if (editingId === id) {
      setShowForm(false)
      setEditingId(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div className="tab-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Your Habits</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{habits.length} habit{habits.length !== 1 ? 's' : ''} tracked</div>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            style={{
              background: '#111', color: 'white', border: 'none',
              borderRadius: 10, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Habit
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <AddHabitForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={handleCancel}
          editing={!!editingId}
        />
      )}

      {/* Habit list */}
      {habits.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7 }}>
            You don't have any habits yet.<br />
            Click "Add Habit" to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.map(habit => (
            <div
              key={habit.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.75)',
                border: editingId === habit.id ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.07)',
                borderRadius: 12, padding: '13px 16px',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Category dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#111', flexShrink: 0, opacity: 0.5 }} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {habit.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    background: 'rgba(0,0,0,0.06)', borderRadius: 20,
                    padding: '2px 8px', fontSize: 10, fontWeight: 500,
                  }}>
                    {CATEGORIES.find(c => c.id === habit.category)?.label ?? habit.category}
                  </span>
                  {habit.tinyVersion && <span>{habit.tinyVersion}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(habit)}
                  style={iconBtnStyle}
                  title="Edit"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="#666" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  style={iconBtnStyle}
                  title="Delete"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 3.5h9M5 3.5V2.5h3v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatsView({ habits }) {
  const todayKey = todayStr()
  const totalHabits = habits.length
  const doneToday = habits.filter(h => h.completions[todayKey]).length
  const overallBest = habits.reduce((max, h) => Math.max(max, bestStreak(h)), 0)

  if (habits.length === 0) {
    return (
      <div className="tab-content" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7 }}>
          No habits tracked yet.<br />Add habits to see your stats.
        </div>
      </div>
    )
  }

  return (
    <div className="tab-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.01em', marginBottom: 2 }}>Stats</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Your progress at a glance</div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Habits', value: totalHabits },
          { label: 'Today', value: `${doneToday}/${totalHabits}` },
          { label: 'Best Streak', value: `${overallBest}d` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 12, padding: '16px 14px', backdropFilter: 'blur(12px)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', marginTop: 4, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Per-habit */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
        Per Habit
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(habit => {
          const { completed } = completionRateLast30(habit)
          const pct = Math.round((completed / 30) * 100)
          const streak = currentStreak(habit)
          const best = bestStreak(habit)
          return (
            <div key={habit.id} style={{
              background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(12px)',
            }}>
              {/* Name + category */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{habit.name}</div>
                <span style={{
                  background: 'rgba(0,0,0,0.06)', borderRadius: 20,
                  padding: '2px 8px', fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.5)',
                }}>
                  {CATEGORIES.find(c => c.id === habit.category)?.label ?? habit.category}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 8 }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: '#111', borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>

              {/* Metrics row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{pct}% last 30 days</div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{streak}</div>
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Streak</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{best}</div>
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Best</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared Style Objects ──────────────────────────────────────────────────────

const labelStyle = {
  display: 'block',
  fontSize: 10, fontWeight: 700,
  color: 'rgba(0,0,0,0.35)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  marginBottom: 5,
}

const iconBtnStyle = {
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 7, width: 30, height: 30,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [habits, setHabits] = useState([])
  const [activeTab, setTab] = useState('today')
  const [justCompleted, setJustCompleted] = useState(new Set())
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ah_habits_v1')
      if (stored) {
        setHabits(JSON.parse(stored))
      } else {
        setHabits(SAMPLE_HABITS)
      }
    } catch {
      setHabits(SAMPLE_HABITS)
    }
    setLoaded(true)
  }, [])

  // Save to localStorage whenever habits change (after initial load)
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('ah_habits_v1', JSON.stringify(habits))
    }
  }, [habits, loaded])

  function toggleCompletion(id) {
    const key = todayStr()
    let wasCompleted = false
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      wasCompleted = !!h.completions[key]
      return {
        ...h,
        completions: h.completions[key]
          ? Object.fromEntries(Object.entries(h.completions).filter(([k]) => k !== key))
          : { ...h.completions, [key]: true },
      }
    }))
    // Only animate on completion, not un-completion
    if (!wasCompleted) {
      setJustCompleted(prev => new Set([...prev, id]))
      setTimeout(() => setJustCompleted(prev => {
        const s = new Set(prev)
        s.delete(id)
        return s
      }), 600)
    }
  }

  if (!loaded) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: 'Inter, sans-serif' }}>
      <Header activeTab={activeTab} setTab={setTab} />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 80px' }}>
        {activeTab === 'today' && (
          <TodayView
            habits={habits}
            toggleCompletion={toggleCompletion}
            justCompleted={justCompleted}
            setTab={setTab}
          />
        )}
        {activeTab === 'habits' && (
          <HabitsView habits={habits} setHabits={setHabits} />
        )}
        {activeTab === 'stats' && (
          <StatsView habits={habits} />
        )}
      </main>
    </div>
  )
}
