/* global THREE, SpriteText, ForceGraph3D */
'use strict';

(function () {

  // ── Grayscale palette per team ────────────────────────────
  const TEAM_GRAYS = ['#111111','#333333','#555555','#777777','#444444','#222222','#666666','#999999'];
  const teamColorMap = new Map();
  let teamColorIdx = 0;

  function teamColor(team) {
    if (!teamColorMap.has(team)) {
      teamColorMap.set(team, TEAM_GRAYS[teamColorIdx++ % TEAM_GRAYS.length]);
    }
    return teamColorMap.get(team);
  }

  // ── Dot-sphere node builder ───────────────────────────────
  function makeDotSphere(radius, count, color) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = radius * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = radius * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.55, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
  }

  function buildNodeObject(node) {
    const color = teamColor(node.team);
    const group = new THREE.Group();

    group.add(makeDotSphere(7, 180, '#cccccc'));   // outer halo
    group.add(makeDotSphere(5, 260, color));        // inner core

    const nameSprite = new SpriteText(node.name);
    nameSprite.color           = '#111111';
    nameSprite.backgroundColor = 'rgba(255,255,255,0)';
    nameSprite.textHeight      = 3.2;
    nameSprite.fontFace        = 'Inter, sans-serif';
    nameSprite.fontWeight      = '600';
    nameSprite.position.y      = -13;
    group.add(nameSprite);

    const titleSprite = new SpriteText(node.title);
    titleSprite.color           = '#888888';
    titleSprite.backgroundColor = 'rgba(255,255,255,0)';
    titleSprite.textHeight      = 2.5;
    titleSprite.fontFace        = 'Inter, sans-serif';
    titleSprite.fontWeight      = '400';
    titleSprite.position.y      = -18;
    group.add(titleSprite);

    return group;
  }

  // ── State ─────────────────────────────────────────────────
  let graphData = window.__ORGCHART_DATA__ || { nodes: [], links: [] };

  // Pre-seed team color map so legend dots are consistent
  graphData.nodes.forEach(n => teamColor(n.team));

  // ── Graph init ────────────────────────────────────────────
  const container = document.getElementById('graph-container');
  const sidebar   = document.getElementById('orgchart-sidebar');

  function graphWidth() {
    return sidebar.classList.contains('open')
      ? window.innerWidth - 340
      : window.innerWidth;
  }

  const Graph = ForceGraph3D()(container)
    .graphData(graphData)
    .width(graphWidth())
    .height(window.innerHeight)
    .backgroundColor('#f7f7f5')
    .nodeThreeObject(buildNodeObject)
    .nodeThreeObjectExtend(false)
    .linkColor(() => 'rgba(0,0,0,0.12)')
    .linkWidth(0.8)
    .linkOpacity(1)
    .linkDirectionalParticles(0)
    .nodeLabel(() => null)
    .showNavInfo(false)
    .enableNodeDrag(true)
    .onNodeClick(node => {
      Graph.cameraPosition(
        { x: node.x + 80, y: node.y + 30, z: node.z + 80 },
        { x: node.x, y: node.y, z: node.z },
        900
      );
    });

  window.addEventListener('resize', () => {
    Graph.width(graphWidth()).height(window.innerHeight);
  });

  // ── Legend dot colours ────────────────────────────────────
  document.querySelectorAll('.legend-dot[data-team]').forEach(el => {
    el.style.background = teamColor(el.dataset.team);
  });

  // ── Sidebar toggle ────────────────────────────────────────
  const toggleBtn = document.getElementById('sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    toggleBtn.textContent = open ? 'Close' : 'Edit Chart';
    setTimeout(() => Graph.width(graphWidth()), 260);
  });

  // ── Populate manager dropdown & people list ───────────────
  function rebuildUI() {
    const managerSel = document.getElementById('inp-manager');
    const current    = managerSel.value;
    managerSel.innerHTML = '<option value="">No manager (top level)</option>';
    graphData.nodes.forEach(n => {
      const opt = document.createElement('option');
      opt.value       = n.id;
      opt.textContent = `${n.name} — ${n.title}`;
      if (n.id === current) opt.selected = true;
      managerSel.appendChild(opt);
    });

    // Team datalist
    const dl     = document.getElementById('team-datalist');
    const teams  = [...new Set(graphData.nodes.map(n => n.team))].sort();
    dl.innerHTML = '';
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      dl.appendChild(opt);
    });

    // People list
    const list = document.getElementById('people-list');
    list.innerHTML = '';
    graphData.nodes.forEach(n => {
      const row = document.createElement('div');
      row.className = 'person-row';
      row.innerHTML = `
        <span class="person-dot" style="background:${teamColor(n.team)}"></span>
        <div class="person-info">
          <div class="person-name">${escHtml(n.name)}</div>
          <div class="person-meta">${escHtml(n.title)} · ${escHtml(n.team)}</div>
        </div>
        <button class="btn-remove" data-id="${n.id}">×</button>
      `;
      list.appendChild(row);
    });

    // Counts
    document.getElementById('people-count').textContent = graphData.nodes.length;
    const listCount = document.getElementById('list-count');
    if (listCount) listCount.textContent = graphData.nodes.length;
    document.getElementById('teams-count').textContent =
      new Set(graphData.nodes.map(n => n.team)).size;

    // Legend dots
    document.querySelectorAll('.legend-dot[data-team]').forEach(el => {
      el.style.background = teamColor(el.dataset.team);
    });
  }

  rebuildUI();

  // ── Add person ────────────────────────────────────────────
  document.getElementById('btn-add').addEventListener('click', async () => {
    const name      = document.getElementById('inp-name').value.trim();
    const title     = document.getElementById('inp-title').value.trim();
    const team      = document.getElementById('inp-team').value.trim();
    const managerId = document.getElementById('inp-manager').value || null;
    if (!name || !title || !team) return;

    const result = await jsonRpc('/orgchart/add', { name, title, team, manager_id: managerId });
    if (result) {
      graphData.nodes.push({ id: result.id, name: result.name, title: result.title, team: result.team });
      if (managerId) {
        graphData.links.push({ source: managerId, target: result.id });
      }
      Graph.graphData({ ...graphData });
      rebuildUI();
      document.getElementById('inp-name').value  = '';
      document.getElementById('inp-title').value = '';
      document.getElementById('inp-team').value  = '';
      document.getElementById('inp-manager').value = '';
    }
  });

  // ── Remove person ─────────────────────────────────────────
  document.getElementById('people-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-remove');
    if (!btn) return;
    const id = btn.dataset.id;
    await jsonRpc('/orgchart/remove', { person_id: id });
    graphData.nodes  = graphData.nodes.filter(n => n.id !== id);
    graphData.links  = graphData.links.filter(
      l => (l.source?.id ?? l.source) !== id && (l.target?.id ?? l.target) !== id
    );
    Graph.graphData({ ...graphData });
    rebuildUI();
  });

  // ── Helpers ───────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function jsonRpc(url, params) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
    });
    const data = await res.json();
    return data.result;
  }

})();
