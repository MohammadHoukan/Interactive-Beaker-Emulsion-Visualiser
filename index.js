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
function intersects(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

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

  // top of water layer sits above organic layer (if present)
  const waterTop = worldToPx(beakerHeight - heights.water - heights.organic, scale);

  const waterRect = new Konva.Rect({
    x: 0,
    y: waterTop,
    width,
    height: hWater,
    fill: '#85c1e9',
  });

  group.add(waterRect);

  let organicRect = null;
  if (stageIdx === 0 && hOrganic > 0) {
    organicRect = new Konva.Rect({
      x: 0,
      y: worldToPx(beakerHeight - heights.organic, scale),
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

  if (stageIdx === 0) {
    // Premix stage has no discrete particles
    return [];
  }
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
    const x = worldToPx(p.x, scale);
    const y = worldToPx(beakerHeight - p.y, scale);
    const r = worldToPx(p.radius, scale);

    const circle = new Konva.Circle({
      x,
      y,
      radius: r,
      fill: p.colour
    });
    group.add(circle);

    // Wiggly surfactant shell around each particle
    const shellPoints = [];
    const segs = 80;
    for (let i = 0; i <= segs; i++) {
      const theta = (i / segs) * Math.PI * 2;
      const rad = r * 1.1 + 3 * Math.sin(8 * theta);
      shellPoints.push(x + rad * Math.cos(theta), y + rad * Math.sin(theta));
    }
    group.add(new Konva.Line({
      points: shellPoints,
      closed: true,
      stroke: cfg.surfactant.colour,
      strokeWidth: 1.5
    }));
  });
}

// Generate surfactant dashes avoiding particles/each other
function createSurfactant(particles, cfg, heights) {
  const out = [];
  const boxes = [];
  const { surfactant, beakerWidth } = cfg;

  const xMargin = surfactant.length;
  const yMargin = surfactant.amplitude;

  for (let i = 0; i < surfactant.count; i++) {
    let tries = 0;
    let pos;
    let box;
    do {
      const x = randRange(xMargin, beakerWidth - xMargin);
      const y = randRange(yMargin, heights.water - yMargin);
      pos = { x, y };
      box = { x: x - surfactant.length / 2,
              y: y - surfactant.amplitude,
              width: surfactant.length,
              height: surfactant.amplitude * 2 };
      tries++;
    } while (
      tries < 20 && (
        particles.some(p => intersects(box, {
          x: p.x - p.radius * 1.2,
          y: p.y - p.radius * 1.2,
          width: p.radius * 2.4,
          height: p.radius * 2.4
        })) ||
        boxes.some(b => intersects(b, box))
      )
    );

    if (particles.some(p => intersects(box, {
          x: p.x - p.radius * 1.2,
          y: p.y - p.radius * 1.2,
          width: p.radius * 2.4,
          height: p.radius * 2.4
        })) || boxes.some(b => intersects(b, box))) {
      continue;
    }

    boxes.push(box);
    out.push(pos);
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
      const maxY = worldToPx(stageIdx === 0 ? beakerHeight - heights.organic : beakerHeight, scale);
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
    heights.water = beakerHeight - heights.organic - (waterHandle.y() + waterHandle.height() / 2) / scale;
    rebuildStage(stage, stageIdx, cfg, heights);
  });
  stage.add(waterHandle);

  if (stageIdx === 0 && liquids.organicRect) {
    const organicHandle = new Konva.Rect({
      ...handleProps,
      x: 0,
      y: liquids.organicRect.y() - 3
    });
    organicHandle.dragBoundFunc = pos => {
      const minY = 0;
      const maxY = worldToPx(beakerHeight - heights.water, scale);
      return { x: 0, y: Math.max(minY, Math.min(pos.y, maxY)) };
    };
    organicHandle.on('dragmove', () => {
      heights.organic = beakerHeight - (organicHandle.y() + organicHandle.height() / 2) / scale;
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
    const layer = new Konva.Layer({ x: idx * groupSpacing, y: worldToPx(0.25, config.scale) });
    stage.add(layer);
    const g = layer; // treat layer as group for downstream calls
    const organicInit = idx === 0 ? config.beakerHeight * 0.3 : 0;
    const waterInit = idx === config.stages.length - 1
      ? config.beakerHeight / 2
      : config.beakerHeight - organicInit;
    const heights = {
      water: waterInit,
      organic: organicInit
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
