import { useState, useRef, useCallback, useEffect } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import SpriteText from 'three-spritetext'

const TEAM_COLORS = [
  '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
]

const SAMPLE_NODES = [
  { id: '1', name: 'Alex Rivera', title: 'CEO', team: 'Leadership' },
  { id: '2', name: 'Sam Chen', title: 'CTO', team: 'Engineering', reportsTo: '1' },
  { id: '3', name: 'Jordan Lee', title: 'CMO', team: 'Marketing', reportsTo: '1' },
  { id: '4', name: 'Taylor Kim', title: 'CFO', team: 'Finance', reportsTo: '1' },
  { id: '5', name: 'Morgan Wu', title: 'VP Engineering', team: 'Engineering', reportsTo: '2' },
  { id: '6', name: 'Casey Park', title: 'Lead Dev', team: 'Engineering', reportsTo: '5' },
  { id: '7', name: 'Riley Zhang', title: 'Developer', team: 'Engineering', reportsTo: '5' },
  { id: '8', name: 'Drew Santos', title: 'Marketing Dir', team: 'Marketing', reportsTo: '3' },
  { id: '9', name: 'Quinn Patel', title: 'Content Lead', team: 'Marketing', reportsTo: '8' },
  { id: '10', name: 'Avery Moore', title: 'Finance Lead', team: 'Finance', reportsTo: '4' },
]

function buildTeamMap(nodes) {
  const teams = [...new Set(nodes.map(n => n.team))].sort()
  return new Map(teams.map((t, i) => [t, i]))
}

function teamColor(team, teamMap) {
  return TEAM_COLORS[(teamMap.get(team) ?? 0) % TEAM_COLORS.length]
}

function buildGraph(nodes) {
  const links = nodes
    .filter(n => n.reportsTo)
    .map(n => ({ source: n.reportsTo, target: n.id }))
  return { nodes: nodes.map(n => ({ ...n })), links }
}

export default function App() {
  const [people, setPeople] = useState(SAMPLE_NODES)
  const [form, setForm] = useState({ name: '', title: '', team: '', reportsTo: '' })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const fgRef = useRef()

  const teamMap = buildTeamMap(people)
  const graphData = buildGraph(people)
  const teams = [...new Set(people.map(p => p.team))].sort()

  useEffect(() => {
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const addPerson = () => {
    if (!form.name.trim() || !form.title.trim() || !form.team.trim()) return
    setPeople(prev => [...prev, { id: Date.now().toString(), ...form }])
    setForm({ name: '', title: '', team: '', reportsTo: '' })
  }

  const removePerson = (id) => {
    setPeople(prev => prev.filter(p => p.id !== id && p.reportsTo !== id))
  }

  const nodeObject = useCallback((node) => {
    const color = teamColor(node.team, teamMap)

    const group = new THREE.Group()

    // Core sphere
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(5, 32, 32),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.9 })
    )
    group.add(core)

    // Glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.BackSide })
    )
    group.add(halo)

    // Name label
    const nameSprite = new SpriteText(node.name)
    nameSprite.color = '#ffffff'
    nameSprite.textHeight = 3.5
    nameSprite.fontFace = 'Inter, sans-serif'
    nameSprite.fontWeight = '600'
    nameSprite.position.y = -13
    group.add(nameSprite)

    // Title label
    const titleSprite = new SpriteText(node.title)
    titleSprite.color = color
    titleSprite.textHeight = 2.8
    titleSprite.position.y = -18.5
    group.add(titleSprite)

    return group
  }, [people.length, teamMap.size])

  const linkCol = useCallback((link) => {
    const t = people.find(p => p.id === (link.target?.id ?? link.target))
    if (!t) return 'rgba(255,255,255,0.15)'
    return teamColor(t.team, teamMap) + '66'
  }, [people])

  const onNodeClick = useCallback((node) => {
    fgRef.current?.cameraPosition(
      { x: node.x + 80, y: node.y + 30, z: node.z + 80 },
      { x: node.x, y: node.y, z: node.z },
      900
    )
  }, [])

  const graphW = sidebarOpen ? size.w - 360 : size.w

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#05050f' }}>

      {/* 3D Graph */}
      <div style={{ position: 'relative', flex: 1 }}>
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={graphW}
          height={size.h}
          backgroundColor="#05050f"
          nodeThreeObject={nodeObject}
          nodeThreeObjectExtend={false}
          linkColor={linkCol}
          linkWidth={1.5}
          linkOpacity={0.7}
          linkDirectionalParticles={4}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={linkCol}
          onNodeClick={onNodeClick}
          nodeLabel={() => null}
          showNavInfo={false}
          enableNodeDrag
        />

        {/* Header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(5,5,15,0.9) 0%, transparent 100%)',
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              OrgChart <span style={{ color: '#7c3aed' }}>3D</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {people.length} people · {teams.length} teams · drag to explore
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              pointerEvents: 'all', cursor: 'pointer',
              background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.5)',
              color: '#a78bfa', borderRadius: 10, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, backdropFilter: 'blur(10px)',
            }}
          >
            {sidebarOpen ? '✕ Close' : '☰ Edit Chart'}
          </button>
        </div>

        {/* Team legend */}
        <div style={{
          position: 'absolute', bottom: 24, left: 24,
          display: 'flex', flexDirection: 'column', gap: 8,
          background: 'rgba(5,5,15,0.7)', borderRadius: 14,
          padding: '14px 18px', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Teams</div>
          {teams.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                background: teamColor(t, teamMap),
                boxShadow: `0 0 8px ${teamColor(t, teamMap)}`,
              }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 360, height: '100vh', background: 'rgba(8,8,20,0.95)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          overflowY: 'auto',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '28px 24px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Add Person</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Build your organization chart</div>
          </div>

          {/* Form */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'name', placeholder: 'Full name' },
              { key: 'title', placeholder: 'Job title' },
              { key: 'team', placeholder: 'Team / Department', list: 'team-list' },
            ].map(({ key, placeholder, list }) => (
              <input
                key={key}
                list={list}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={inputStyle}
              />
            ))}

            <datalist id="team-list">
              {teams.map(t => <option key={t} value={t} />)}
            </datalist>

            <select
              value={form.reportsTo}
              onChange={e => setForm(f => ({ ...f, reportsTo: e.target.value }))}
              style={{ ...inputStyle, color: form.reportsTo ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              <option value="">No manager (top level)</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.title}</option>
              ))}
            </select>

            <button
              onClick={addPerson}
              style={{
                marginTop: 4,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none', borderRadius: 10, color: '#fff',
                fontWeight: 700, fontSize: 14, padding: '13px',
                cursor: 'pointer', letterSpacing: '0.02em',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.target.style.opacity = '0.85'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              + Add to Chart
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 24px' }} />

          {/* People list */}
          <div style={{ padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
              People ({people.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {people.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                  padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: teamColor(p.team, teamMap),
                    boxShadow: `0 0 10px ${teamColor(p.team, teamMap)}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{p.title} · {p.team}</div>
                  </div>
                  <button
                    onClick={() => removePerson(p.id)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171', borderRadius: 6, width: 26, height: 26,
                      cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff',
  fontSize: 14, padding: '12px 14px',
  outline: 'none', width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}
