import { useState, useRef, useCallback, useEffect } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import SpriteText from 'three-spritetext'

// Grayscale palette — each team gets a shade
const TEAM_GRAYS = [
  '#111111', '#333333', '#555555', '#777777',
  '#444444', '#222222', '#666666', '#999999',
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
  return TEAM_GRAYS[(teamMap.get(team) ?? 0) % TEAM_GRAYS.length]
}

function buildGraph(nodes) {
  const links = nodes
    .filter(n => n.reportsTo)
    .map(n => ({ source: n.reportsTo, target: n.id }))
  return { nodes: nodes.map(n => ({ ...n })), links }
}

// Build a dot-sphere: random points scattered on a sphere surface
function makeDotSphere(radius, count, color) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color, size: 0.55, sizeAttenuation: true })
  return new THREE.Points(geo, mat)
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

  // After the graph settles, position camera to face the tree front-on
  useEffect(() => {
    const t = setTimeout(() => {
      fgRef.current?.cameraPosition({ x: 0, y: -60, z: 320 }, { x: 0, y: 0, z: 0 }, 1200)
    }, 1800)
    return () => clearTimeout(t)
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

    // Outer dot-sphere (sparse, light)
    group.add(makeDotSphere(7, 180, '#cccccc'))
    // Inner dot-sphere (dense, dark)
    group.add(makeDotSphere(5, 260, color))

    // Name label
    const nameSprite = new SpriteText(node.name)
    nameSprite.color = '#111111'
    nameSprite.backgroundColor = 'rgba(255,255,255,0)'
    nameSprite.textHeight = 3.2
    nameSprite.fontFace = 'Inter, sans-serif'
    nameSprite.fontWeight = '600'
    nameSprite.position.y = -13
    group.add(nameSprite)

    // Title label
    const titleSprite = new SpriteText(node.title)
    titleSprite.color = '#888888'
    titleSprite.backgroundColor = 'rgba(255,255,255,0)'
    titleSprite.textHeight = 2.5
    titleSprite.fontFace = 'Inter, sans-serif'
    titleSprite.fontWeight = '400'
    titleSprite.position.y = -18
    group.add(titleSprite)

    return group
  }, [people.length, teamMap.size])

  const linkCol = useCallback(() => 'rgba(0,0,0,0.12)', [])

  const onNodeClick = useCallback((node) => {
    fgRef.current?.cameraPosition(
      { x: node.x + 80, y: node.y + 30, z: node.z + 80 },
      { x: node.x, y: node.y, z: node.z },
      900
    )
  }, [])

  const graphW = sidebarOpen ? size.w - 340 : size.w

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f7f7f5' }}>

      {/* 3D Graph */}
      <div style={{ position: 'relative', flex: 1 }}>
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={graphW}
          height={size.h}
          backgroundColor="#f7f7f5"
          nodeThreeObject={nodeObject}
          nodeThreeObjectExtend={false}
          linkColor={linkCol}
          linkWidth={0.8}
          linkOpacity={1}
          linkDirectionalParticles={0}
          dagMode="td"
          dagLevelDistance={70}
          onNodeClick={onNodeClick}
          nodeLabel={() => null}
          showNavInfo={false}
          enableNodeDrag
        />

        {/* Header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(247,247,245,0.95) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Logo pill — ark-robotics style */}
            <div style={{
              background: 'rgba(0,0,0,0.08)',
              borderRadius: 40,
              padding: '6px 18px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="1.5" fill="#111" />
                <circle cx="9" cy="3" r="1.5" fill="#111" />
                <circle cx="9" cy="15" r="1.5" fill="#111" />
                <circle cx="3" cy="9" r="1.5" fill="#111" />
                <circle cx="15" cy="9" r="1.5" fill="#111" />
                <line x1="9" y1="3" x2="9" y2="15" stroke="#111" strokeWidth="0.8" />
                <line x1="3" y1="9" x2="15" y2="9" stroke="#111" strokeWidth="0.8" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '0.02em' }}>OrgChart</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>
              {people.length} people · {teams.length} teams
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              pointerEvents: 'all', cursor: 'pointer',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: '#333', borderRadius: 20, padding: '7px 16px',
              fontSize: 12, fontWeight: 600, backdropFilter: 'blur(10px)',
              letterSpacing: '0.02em',
            }}
          >
            {sidebarOpen ? 'Close' : 'Edit Chart'}
          </button>
        </div>

        {/* Team legend */}
        <div style={{
          position: 'absolute', bottom: 24, left: 24,
          display: 'flex', flexDirection: 'column', gap: 7,
          background: 'rgba(255,255,255,0.85)', borderRadius: 14,
          padding: '14px 18px', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Teams</div>
          {teams.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: teamColor(t, teamMap),
              }} />
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 340, height: '100vh',
          background: 'rgba(255,255,255,0.95)',
          borderLeft: '1px solid rgba(0,0,0,0.07)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          overflowY: 'auto',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '28px 24px 0' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Add Person</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>Build your organization chart</div>
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
              style={{ ...inputStyle, color: form.reportsTo ? '#111' : 'rgba(0,0,0,0.3)' }}
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
                background: '#111111',
                border: 'none', borderRadius: 10, color: '#fff',
                fontWeight: 600, fontSize: 13, padding: '13px',
                cursor: 'pointer', letterSpacing: '0.03em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.target.style.opacity = '0.75'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >
              + Add to Chart
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 24px' }} />

          {/* People list */}
          <div style={{ padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              People ({people.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {people.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(0,0,0,0.025)', borderRadius: 10,
                  padding: '10px 12px', border: '1px solid rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: teamColor(p.team, teamMap),
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>{p.title} · {p.team}</div>
                  </div>
                  <button
                    onClick={() => removePerson(p.id)}
                    style={{
                      background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
                      color: '#666', borderRadius: 6, width: 26, height: 26,
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
  background: 'rgba(0,0,0,0.03)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 10, color: '#111',
  fontSize: 13, padding: '12px 14px',
  outline: 'none', width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}
