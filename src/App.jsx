import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore'
import { auth, db, googleProvider, isConfigured } from './firebase'
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
  let streak = 0, i = 0
  while (true) {
    if (habit.completions?.[dateStrOffset(i)]) { streak++; i++ } else break
  }
  return streak
}

function bestStreak(habit) {
  const keys = Object.keys(habit.completions || {}).sort()
  if (!keys.length) return 0
  let best = 1, run = 1
  for (let i = 1; i < keys.length; i++) {
    const diff = (new Date(keys[i]) - new Date(keys[i - 1])) / 86400000
    run = diff === 1 ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

function completionRateLast30(habit) {
  let completed = 0
  for (let i = 0; i < 30; i++) if (habit.completions?.[dateStrOffset(i)]) completed++
  return { completed, total: 30 }
}

function formatHeader() {
  const d = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
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

// ─── Setup Screen (no Firebase config) ────────────────────────────────────────

function SetupScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="white"/>
            <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
            <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.4"/>
            <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.25"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 }}>Firebase setup needed</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 1.7, marginBottom: 24 }}>
          Add your Firebase config to <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>.env</code> to enable Google sign-in and cloud sync.
        </div>
        <div style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#333', lineHeight: 2 }}>
          VITE_FIREBASE_API_KEY=...<br/>
          VITE_FIREBASE_AUTH_DOMAIN=...<br/>
          VITE_FIREBASE_PROJECT_ID=...<br/>
          VITE_FIREBASE_STORAGE_BUCKET=...<br/>
          VITE_FIREBASE_MESSAGING_SENDER_ID=...<br/>
          VITE_FIREBASE_APP_ID=...
        </div>
      </div>
    </div>
  )
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onSignIn, loading }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="white"/>
            <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
            <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.4"/>
            <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.25"/>
          </svg>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', marginBottom: 8 }}>Habits</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, marginBottom: 36 }}>
          Small habits, remarkable results.<br/>Sign in to keep your habits private and synced.
        </div>
        <button
          onClick={onSignIn}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 20px',
            background: loading ? 'rgba(0,0,0,0.08)' : '#111',
            color: loading ? 'rgba(0,0,0,0.35)' : 'white',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill={loading ? '#aaa' : '#4285F4'}/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill={loading ? '#aaa' : '#34A853'}/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill={loading ? '#aaa' : '#FBBC05'}/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill={loading ? '#aaa' : '#EA4335'}/>
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  )
}

// ─── UI Components ────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polyline points="3,8 7,12 13,4" stroke="white" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="check-animate"/>
    </svg>
  )
}

function Header({ activeTab, setTab, user, onSignOut }) {
  const tabs = [{ id: 'today', label: 'Today' }, { id: 'habits', label: 'Habits' }, { id: 'stats', label: 'Stats' }]
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(247,247,245,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white"/>
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Habits</span>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)} style={{
              border: 'none', cursor: 'pointer', padding: '5px 14px', borderRadius: 7,
              fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s ease',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#111' : 'rgba(0,0,0,0.45)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>{tab.label}</button>
          ))}
        </div>
        {user && (
          <button onClick={onSignOut} title={`Sign out ${user.displayName}`} style={{
            background: 'none', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '50%',
            width: 32, height: 32, padding: 0, cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {user.photoURL
              ? <img src={user.photoURL} alt="" width="32" height="32" style={{ borderRadius: '50%' }}/>
              : <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{user.displayName?.[0] ?? '?'}</span>}
          </button>
        )}
      </div>
    </header>
  )
}

function SevenDots({ habit }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {last7Days().map(day => (
        <div key={day} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: habit.completions?.[day] ? '#111' : 'rgba(0,0,0,0.1)',
          transition: 'background 0.2s ease',
        }}/>
      ))}
    </div>
  )
}

function HabitCard({ habit, done, onToggle, isAnimating }) {
  const streak = currentStreak(habit)
  return (
    <div className={isAnimating ? 'completing' : ''} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)',
      border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '14px 16px',
      backdropFilter: 'blur(12px)',
      transition: 'background 0.2s ease, opacity 0.2s ease',
      opacity: done ? 0.6 : 1,
    }}>
      <button onClick={onToggle} aria-checked={done} role="checkbox" style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
        border: done ? 'none' : '2px solid rgba(0,0,0,0.2)',
        background: done ? '#111' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        {done && <CheckIcon/>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
          {habit.name}
        </div>
        {habit.cue && (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
            {habit.cue}
          </div>
        )}
        <SevenDots habit={habit}/>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', lineHeight: 1 }}>{streak}</div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 2, letterSpacing: '0.04em' }}>{streak === 1 ? 'day' : 'days'}</div>
      </div>
    </div>
  )
}

// ─── Today View ───────────────────────────────────────────────────────────────

function TodayView({ habits, toggleCompletion, justCompleted, setTab }) {
  const { dayName, day, month } = formatHeader()
  const todayKey = todayStr()
  const doneCount = habits.filter(h => h.completions?.[todayKey]).length
  const topHabit = habits.reduce((best, h) => {
    const s = currentStreak(h)
    return s > (best ? currentStreak(best) : -1) ? h : best
  }, null)

  if (!habits.length) return (
    <div className="tab-content" style={{ paddingTop: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>○</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>No habits yet</div>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginBottom: 24, lineHeight: 1.6 }}>Small habits compound into remarkable results.<br/>Start with just one.</div>
      <button onClick={() => setTab('habits')} style={{ background: '#111', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        Add your first habit
      </button>
    </div>
  )

  return (
    <div className="tab-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{dayName}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', lineHeight: 1 }}>{day} {month}</div>
      </div>
      {topHabit?.identity && (
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '12px 14px', marginBottom: 24, borderLeft: '2px solid rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Identity</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', fontStyle: 'italic', lineHeight: 1.5 }}>{topHabit.identity}</div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>{doneCount} of {habits.length} done</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{Math.round((doneCount / habits.length) * 100)}%</div>
      </div>
      <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${(doneCount / habits.length) * 100}%`, background: '#111', borderRadius: 2, transition: 'width 0.4s ease' }}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.map(habit => (
          <HabitCard key={habit.id} habit={habit} done={!!habit.completions?.[todayKey]}
            onToggle={() => toggleCompletion(habit.id)} isAnimating={justCompleted.has(habit.id)}/>
        ))}
      </div>
      {doneCount === habits.length && habits.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>All done for today. Keep showing up.</div>
      )}
    </div>
  )
}

// ─── Habits View ──────────────────────────────────────────────────────────────

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }
const inputStyle = { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, color: '#111', fontSize: 13, padding: '11px 13px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', resize: 'none' }
const iconBtnStyle = { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

function AddHabitForm({ form, setForm, onSave, onCancel, editing }) {
  const field = (key, placeholder, multi) => multi
    ? <textarea placeholder={placeholder} value={form[key]} rows={2} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}/>
    : <input placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}/>

  return (
    <div style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, backdropFilter: 'blur(12px)', marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>{editing ? 'Edit Habit' : 'New Habit'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><label style={labelStyle}>Habit</label>{field('name', 'e.g. Read every day')}</div>
        <div><label style={labelStyle}>Identity — who are you becoming?</label>{field('identity', 'I am someone who...')}</div>
        <div><label style={labelStyle}>Implementation intention</label>{field('cue', 'After [trigger], I will [habit]', true)}</div>
        <div><label style={labelStyle}>2-minute version (tiny habit)</label>{field('tinyVersion', 'e.g. Read one page')}</div>
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setForm(f => ({ ...f, category: cat.id }))} style={{
                border: form.category === cat.id ? '1.5px solid #111' : '1.5px solid rgba(0,0,0,0.15)',
                background: form.category === cat.id ? '#111' : 'transparent',
                color: form.category === cat.id ? 'white' : 'rgba(0,0,0,0.55)',
                borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s ease',
              }}>{cat.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onSave} disabled={!form.name.trim()} style={{
            flex: 1, background: form.name.trim() ? '#111' : 'rgba(0,0,0,0.15)',
            color: 'white', border: 'none', borderRadius: 10, padding: '11px',
            fontSize: 13, fontWeight: 600, cursor: form.name.trim() ? 'pointer' : 'default',
            fontFamily: 'Inter, sans-serif', transition: 'background 0.15s ease',
          }}>{editing ? 'Save Changes' : 'Add Habit'}</button>
          <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: '11px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function HabitsView({ habits, onAdd, onUpdate, onDelete }) {
  const emptyForm = { name: '', identity: '', cue: '', tinyVersion: '', category: 'health' }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = h => { setEditingId(h.id); setForm({ name: h.name, identity: h.identity, cue: h.cue, tinyVersion: h.tinyVersion, category: h.category }); setShowForm(true) }
  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }
  const handleSave = () => {
    if (!form.name.trim()) return
    if (editingId) onUpdate(editingId, form)
    else onAdd(form)
    handleCancel()
  }
  const handleDelete = id => { onDelete(id); if (editingId === id) handleCancel() }

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Your Habits</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{habits.length} habit{habits.length !== 1 ? 's' : ''} tracked</div>
        </div>
        {!showForm && (
          <button onClick={openAdd} style={{ background: '#111', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Habit
          </button>
        )}
      </div>
      {showForm && <AddHabitForm form={form} setForm={setForm} onSave={handleSave} onCancel={handleCancel} editing={!!editingId}/>}
      {!habits.length && !showForm
        ? <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7 }}>No habits yet.<br/>Click "Add Habit" to get started.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.75)', border: editingId === h.id ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '13px 16px', backdropFilter: 'blur(12px)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#111', flexShrink: 0, opacity: 0.5 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 500 }}>{CATEGORIES.find(c => c.id === h.category)?.label ?? h.category}</span>
                    {h.tinyVersion && <span>{h.tinyVersion}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openEdit(h)} style={iconBtnStyle} title="Edit">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="#666" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => handleDelete(h.id)} style={iconBtnStyle} title="Delete">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Stats View ───────────────────────────────────────────────────────────────

function StatsView({ habits }) {
  const todayKey = todayStr()
  const doneToday = habits.filter(h => h.completions?.[todayKey]).length
  const overallBest = habits.reduce((max, h) => Math.max(max, bestStreak(h)), 0)

  if (!habits.length) return (
    <div className="tab-content" style={{ paddingTop: 48, textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7 }}>
      No habits tracked yet.<br/>Add habits to see your stats.
    </div>
  )

  return (
    <div className="tab-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.01em', marginBottom: 2 }}>Stats</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Your progress at a glance</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {[{ label: 'Habits', value: habits.length }, { label: 'Today', value: `${doneToday}/${habits.length}` }, { label: 'Best Streak', value: `${overallBest}d` }].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '16px 14px', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', marginTop: 4, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Per Habit</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(habit => {
          const { completed } = completionRateLast30(habit)
          const pct = Math.round((completed / 30) * 100)
          return (
            <div key={habit.id} style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{habit.name}</div>
                <span style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.5)' }}>{CATEGORIES.find(c => c.id === habit.category)?.label ?? habit.category}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#111', borderRadius: 2, transition: 'width 0.5s ease' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{pct}% last 30 days</div>
                <div style={{ display: 'flex', gap: 14 }}>
                  {[{ label: 'Streak', val: currentStreak(habit) }, { label: 'Best', val: bestStreak(habit) }].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{val}</div>
                      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]               = useState(undefined) // undefined = loading
  const [authLoading, setAuthLoading] = useState(false)
  const [habits, setHabits]           = useState([])
  const [activeTab, setTab]           = useState('today')
  const [justCompleted, setJustCompleted] = useState(new Set())

  // Auth listener
  useEffect(() => {
    if (!isConfigured) return
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  // Firestore habits listener — runs whenever user changes
  useEffect(() => {
    if (!isConfigured || !user) { setHabits([]); return }
    const ref = collection(db, 'users', user.uid, 'habits')
    const unsub = onSnapshot(ref, snap => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const handleSignIn = async () => {
    setAuthLoading(true)
    try { await signInWithPopup(auth, googleProvider) }
    catch (e) { console.error(e) }
    finally { setAuthLoading(false) }
  }

  const handleSignOut = () => signOut(auth)

  // Habit CRUD (Firestore)
  const habitCol = useCallback(() => collection(db, 'users', user.uid, 'habits'), [user])
  const habitDoc = useCallback(id => doc(db, 'users', user.uid, 'habits', id), [user])

  const handleAdd = async (form) => {
    await addDoc(habitCol(), { ...form, completions: {}, createdAt: new Date().toISOString() })
  }

  const handleUpdate = async (id, form) => {
    await updateDoc(habitDoc(id), { ...form })
  }

  const handleDelete = async (id) => {
    await deleteDoc(habitDoc(id))
  }

  const toggleCompletion = async (id) => {
    const habit = habits.find(h => h.id === id)
    if (!habit) return
    const key = todayStr()
    const wasCompleted = !!habit.completions?.[key]
    const update = wasCompleted
      ? { [`completions.${key}`]: false }
      : { [`completions.${key}`]: true }

    // Optimistic UI
    setHabits(prev => prev.map(h => h.id !== id ? h : {
      ...h, completions: { ...h.completions, [key]: !wasCompleted }
    }))

    await updateDoc(habitDoc(id), update)

    if (!wasCompleted) {
      setJustCompleted(prev => new Set([...prev, id]))
      setTimeout(() => setJustCompleted(prev => { const s = new Set(prev); s.delete(id); return s }), 600)
    }
  }

  // Loading states
  if (!isConfigured) return <SetupScreen/>
  if (user === undefined) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
    </div>
  )
  if (!user) return <AuthScreen onSignIn={handleSignIn} loading={authLoading}/>

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: 'Inter, sans-serif' }}>
      <Header activeTab={activeTab} setTab={setTab} user={user} onSignOut={handleSignOut}/>
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 80px' }}>
        {activeTab === 'today' && <TodayView habits={habits} toggleCompletion={toggleCompletion} justCompleted={justCompleted} setTab={setTab}/>}
        {activeTab === 'habits' && <HabitsView habits={habits} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete}/>}
        {activeTab === 'stats' && <StatsView habits={habits}/>}
      </main>
    </div>
  )
}
