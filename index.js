// Global demo configuration - can be replaced at runtime
export const CONFIG = {
  scale: 100, // px per world unit
  beakerHeight: 3,
  beakerWidth: 2,
  stages: [
    { label: 'Premix',         showSurfactant: true  },
    { label: 'Droplet Form',   showSurfactant: true  },
    { label: 'Solidification', showSurfactant: true  },
    { label: 'Purification',   showSurfactant: false }
  ],
  particles: {
    rows: 6,
    radius: { droplet: 0.12, nanoparticle: 0.10 },
    colour: { droplet: '#f4b183', nanoparticle: '#000' }
  },
  surfactant: {
    count: 60,
    length: 20,
    amplitude: 5,
    segments: 10,
    colour: '#1f77b4'
  }
};

// Utility functions -----------------------------------------------------------
const randRange = (a, b) => a + Math.random() * (b - a);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function worldToPx(val, scale) {
  return val * scale;
}

// Draw a beaker outline
function drawBeaker(group, cfg) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  group.add(new Konva.Rect({
    x: 0,
    y: 0,
    width: worldToPx(beakerWidth, scale),
    height: worldToPx(beakerHeight, scale),
    stroke: '#444',
    strokeWidth: 2
  }));
}

// Draw water and organic layers and return shape refs
function drawLiquids(group, stageIdx, cfg, heights) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  const width = worldToPx(beakerWidth, scale);
  const hWater = worldToPx(heights.water, scale);
  const hOrganic = worldToPx(heights.organic || 0, scale);

  const waterRect = new Konva.Rect({
    x: 0,
    y: worldToPx(beakerHeight, scale) - hWater,
    width,
    height: hWater,
    fill: '#85c1e9',
  });

  group.add(waterRect);

  let organicRect = null;
  if (stageIdx === 0) {
    organicRect = new Konva.Rect({
      x: 0,
      y: worldToPx(beakerHeight, scale) - hWater - hOrganic,
      width,
      height: hOrganic,
      fill: '#fad7a0'
    });
    group.add(organicRect);
  }

  return { waterRect, organicRect };
}

// Generate particle positions avoiding walls and each other
function createParticles(stageIdx, cfg, heights) {
  const { beakerWidth, particles } = cfg;
  const radius = stageIdx <= 1 ? particles.radius.droplet : particles.radius.nanoparticle;
  const colour = stageIdx <= 1 ? particles.colour.droplet : particles.colour.nanoparticle;
  const margin = radius * 2;
  const particlesOut = [];
  const cols = particles.rows;
  const rows = particles.rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const maxAttempts = 15;
      let placed = false;
      for (let i = 0; i < maxAttempts && !placed; i++) {
        const x = randRange(margin, beakerWidth - margin);
        const y = randRange(margin, heights.water - margin);
        const pos = { x, y };
        if (particlesOut.every(p => distance(p, pos) > radius * 2.5)) {
          particlesOut.push(pos);
          placed = true;
        }
      }
    }
  }

  return particlesOut.map(p => ({ ...p, radius, colour }));
}

// Draw the particles inside the group
function drawParticles(group, particles, cfg) {
  const { scale, beakerHeight } = cfg;
  particles.forEach(p => {
    const circle = new Konva.Circle({
      x: worldToPx(p.x, scale),
      y: worldToPx(beakerHeight - p.y, scale),
      radius: worldToPx(p.radius, scale),
      fill: p.colour
    });
    group.add(circle);
  });
}

// Generate surfactant dashes avoiding particles/each other
function createSurfactant(particles, cfg, heights) {
  const out = [];
  const { surfactant, beakerWidth } = cfg;
  const margin = surfactant.amplitude;

  for (let i = 0; i < surfactant.count; i++) {
    const maxAttempts = 20;
    let placed = false;
    for (let j = 0; j < maxAttempts && !placed; j++) {
      const x = randRange(margin, beakerWidth - margin);
      const y = randRange(margin, heights.water - margin);
      const pos = { x, y };
      const tooCloseParticle = particles.some(p => distance(p, pos) < p.radius * 1.5);
      const tooCloseDash = out.some(p => distance(p, pos) < surfactant.amplitude * 1.5);
      if (!tooCloseParticle && !tooCloseDash) {
        out.push(pos);
        placed = true;
      }
    }
  }

  return out;
}

// Draw surfactant wavy lines
function drawSurfactant(group, segments, cfg, heights) {
  const { surfactant, beakerHeight, scale } = cfg;
  segments.forEach(pos => {
    const points = [];
    const segLen = surfactant.length / surfactant.segments;
    for (let i = 0; i <= surfactant.segments; i++) {
      const dx = i * segLen;
      const dy = Math.sin((i / surfactant.segments) * Math.PI) * surfactant.amplitude;
      points.push(worldToPx(pos.x + dx - surfactant.length / 2, scale));
      points.push(worldToPx(beakerHeight - (pos.y + dy), scale));
    }
    group.add(new Konva.Line({
      points,
      stroke: surfactant.colour,
      strokeWidth: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }));
  });
}

// Redraw the full stage content when levels change
function rebuildStage(stage, stageIdx, cfg, heights) {
  stage.destroyChildren();
  drawBeaker(stage, cfg);
  const liquidShapes = drawLiquids(stage, stageIdx, cfg, heights);
  const particles = createParticles(stageIdx, cfg, heights);
  drawParticles(stage, particles, cfg);
  if (cfg.stages[stageIdx].showSurfactant) {
    const surf = createSurfactant(particles, cfg, heights);
    drawSurfactant(stage, surf, cfg, heights);
  }
  // Create draggable handles
  createHandles(stage, stageIdx, cfg, heights, liquidShapes);
}

// Create handle(s) and bind events
function createHandles(stage, stageIdx, cfg, heights, liquids) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  const width = worldToPx(beakerWidth, scale);
  const handleProps = {
    width: width,
    height: 6,
    fill: '#888',
    draggable: true,
    dragBoundFunc(pos) {
      const minY = 0;
      const maxY = worldToPx(beakerHeight, scale) - (stageIdx === 0 && this === this.organic ? liquids.waterRect.height() + 6 : 0);
      return { x: 0, y: Math.max(minY, Math.min(pos.y, maxY)) };
    }
  };

  // Water handle
  const waterHandle = new Konva.Rect({
    ...handleProps,
    x: 0,
    y: liquids.waterRect.y() - 3
  });
  waterHandle.on('dragmove', () => {
    heights.water = beakerHeight - waterHandle.y() / scale - waterHandle.height() / scale / 2;
    rebuildStage(stage, stageIdx, cfg, heights);
  });
  stage.add(waterHandle);

  if (stageIdx === 0 && liquids.organicRect) {
    const organicHandle = new Konva.Rect({
      ...handleProps,
      x: 0,
      y: liquids.organicRect.y() - 3
    });
    organicHandle.organic = organicHandle; // flag for dragBoundFunc
    organicHandle.on('dragmove', () => {
      heights.organic = beakerHeight - heights.water - organicHandle.y() / scale - organicHandle.height() / scale / 2;
      rebuildStage(stage, stageIdx, cfg, heights);
    });
    stage.add(organicHandle);
  }
}

// Build stage groups ---------------------------------------------------------
function renderVisualiser(containerEl, config = CONFIG) {
  containerEl.innerHTML = '';
  const stageWidth = config.stages.length * worldToPx(config.beakerWidth + 0.5, config.scale);
  const stageHeight = worldToPx(config.beakerHeight + 0.5, config.scale);

  const stage = new Konva.Stage({
    container: containerEl,
    width: stageWidth,
    height: stageHeight
  });

  const groupSpacing = worldToPx(config.beakerWidth + 0.5, config.scale);

  // legend
  buildLegend(document.getElementById('legend'), config);

  config.stages.forEach((s, idx) => {
    const g = new Konva.Group({ x: idx * groupSpacing, y: worldToPx(0.25, config.scale) });
    stage.add(g);
    const heights = {
      water: idx === config.stages.length - 1 ? config.beakerHeight / 2 : config.beakerHeight,
      organic: idx === 0 ? config.beakerHeight * 0.3 : 0
    };
    rebuildStage(g, idx, config, heights);
  });
}

// Build legend DOM
function buildLegend(target, cfg) {
  target.innerHTML = '';
  const items = [
    { label: 'Water', colour: '#85c1e9' },
    { label: 'Organic', colour: '#fad7a0' },
    { label: 'Droplet', colour: cfg.particles.colour.droplet },
    { label: 'Nanoparticle', colour: cfg.particles.colour.nanoparticle },
    { label: 'Surfactant', colour: cfg.surfactant.colour }
  ];

  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `<span class="legend-swatch" style="background:${it.colour}"></span>${it.label}`;
    target.appendChild(div);
  });
}

window.renderVisualiser = renderVisualiser;

// Auto render default config on load
if (document.readyState !== 'loading') {
  renderVisualiser(document.getElementById('app'), CONFIG);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    renderVisualiser(document.getElementById('app'), CONFIG);
  });
}
