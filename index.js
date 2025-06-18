// Global demo configuration - can be replaced at runtime
export const CONFIG = {
  scale: 100, // px per world‑unit
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

// ‑‑‑ Utility helpers ‑‑‑ ------------------------------------------------------
const randRange = (a, b) => a + Math.random() * (b - a);
const distance  = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}
const worldToPx = (v, scale) => v * scale;

// ‑‑‑ Drawing primitives ‑‑‑ ---------------------------------------------------
function drawBeaker(group, cfg) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  group.add(new Konva.Rect({
    width:  worldToPx(beakerWidth,  scale),
    height: worldToPx(beakerHeight, scale),
    stroke: '#444', strokeWidth: 2
  }));
}

function drawLiquids(group, stageIdx, cfg, h) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  const W = worldToPx(beakerWidth, scale);
  const hW = worldToPx(h.water,   scale);
  const hO = worldToPx(h.organic, scale);
  const yW = worldToPx(beakerHeight - h.water - h.organic, scale);

  const waterRect = new Konva.Rect({ x:0, y:yW, width:W, height:hW, fill:'#85c1e9' });
  group.add(waterRect);

  let organicRect = null;
  if (stageIdx === 0 && h.organic) {
    organicRect = new Konva.Rect({
      x:0, y:worldToPx(beakerHeight - h.organic, scale), width:W, height:hO, fill:'#fad7a0'
    });
    group.add(organicRect);
  }
  return { waterRect, organicRect };
}

// ‑‑‑ Particles ---------------------------------------------------------------
function createParticles(stageIdx, cfg, h) {
  if (stageIdx === 0) return []; // premix → none

  const { beakerWidth, particles } = cfg;
  const radius = stageIdx <= 1 ? particles.radius.droplet : particles.radius.nanoparticle;
  const colour = stageIdx <= 1 ? particles.colour.droplet : particles.colour.nanoparticle;
  const margin = radius * 2;
  const pts    = [];

  for (let r=0; r<particles.rows; r++) {
    for (let c=0; c<particles.rows; c++) {
      let placed = false;
      for (let t=0; t<15 && !placed; t++) {
        const x = randRange(margin, beakerWidth - margin);
        const y = randRange(margin, h.water   - margin);
        if (pts.every(p => distance(p,{x,y}) > radius*2.5)) {
          pts.push({ x, y, radius, colour });
          placed = true;
        }
      }
    }
  }
  return pts;
}

function drawParticles(group, pts, cfg) {
  const { scale, beakerHeight } = cfg;
  pts.forEach(p => {
    const X = worldToPx(p.x, scale);
    const Y = worldToPx(beakerHeight - p.y, scale);
    const R = worldToPx(p.radius, scale);

    group.add(new Konva.Circle({ x:X, y:Y, radius:R, fill:p.colour }));

    // surfactant shell – decorative, so always draw even in stages w/o bulk surfactant
    const shell = [];
    for (let i=0;i<=80;i++) {
      const th = (i/80)*Math.PI*2;
      const rad = R*1.1 + 3*Math.sin(8*th);
      shell.push(X + rad*Math.cos(th), Y + rad*Math.sin(th));
    }
    group.add(new Konva.Line({ points:shell, closed:true, stroke:cfg.surfactant.colour, strokeWidth:1.5 }));
  });
}

// ‑‑‑ Surfactant --------------------------------------------------------------
function createSurfactant(pts, cfg, h) {
  const { surfactant, beakerWidth } = cfg;
  const out  = [];
  const rects= [];
  const xM   = surfactant.length;
  const yM   = surfactant.amplitude;

  for (let i=0;i<surfactant.count;i++) {
    let tries=0, ok=false, p, box;
    while (tries++<20 && !ok) {
      const x = randRange(xM, beakerWidth - xM);
      const y = randRange(yM, h.water   - yM);
      box = { x:x - surfactant.length/2, y:y - yM, width:surfactant.length, height:yM*2 };
      ok = !pts.some(pt => intersects(box,{x:pt.x-pt.radius*1.2, y:pt.y-pt.radius*1.2, width:pt.radius*2.4, height:pt.radius*2.4})) &&
           !rects.some(r=>intersects(r,box));
    }
    if (ok) { rects.push(box); out.push({x:box.x + surfactant.length/2, y:box.y + yM}); }
  }
  return out;
}

function drawSurfactant(group, segs, cfg, h) {
  const { surfactant, beakerHeight, scale } = cfg;
  segs.forEach(p => {
    const pts = [];
    const dx  = surfactant.length / surfactant.segments;
    for (let i=0;i<=surfactant.segments;i++) {
      const off = Math.sin((i/surfactant.segments)*Math.PI*2) * surfactant.amplitude; // full sine wave ⇢ matches original demo
      pts.push(worldToPx(p.x - surfactant.length/2 + i*dx, scale));
      pts.push(worldToPx(beakerHeight - (p.y + off),        scale));
    }
    group.add(new Konva.Line({ points:pts, stroke:surfactant.colour, strokeWidth:1, lineCap:'round', lineJoin:'round' }));
  });
}

// ‑‑‑ Rebuild one stage -------------------------------------------------------
function rebuildStage(layer, idx, cfg, h) {
  layer.destroyChildren();
  drawBeaker(layer, cfg);
  const liq = drawLiquids(layer, idx, cfg, h);
  const pts = createParticles(idx, cfg, h);
  drawParticles(layer, pts, cfg);
  if (cfg.stages[idx].showSurfactant) drawSurfactant(layer, createSurfactant(pts,cfg,h), cfg, h);
  makeHandles(layer, idx, cfg, h, liq);
}

// ‑‑‑ Handles -----------------------------------------------------------------
function makeHandles(layer, idx, cfg, h, liq) {
  const { scale, beakerHeight, beakerWidth } = cfg;
  const W = worldToPx(beakerWidth, scale);
  const baseProps = { width:W, height:6, fill:'#888', draggable:true };

  const waterH = new Konva.Rect({ ...baseProps, y:liq.waterRect.y()-3 });
  waterH.dragBoundFunc = p => ({ x:0, y:Math.max(0, Math.min(p.y, worldToPx(beakerHeight-h.organic, scale))) });
  waterH.on('dragmove', ()=>{ h.water = beakerHeight - h.organic - (waterH.y()+3)/scale; rebuildStage(layer,idx,cfg,h); });
  layer.add(waterH);

  if (idx===0 && liq.organicRect) {
    const orgH = new Konva.Rect({ ...baseProps, y:liq.organicRect.y()-3 });
    orgH.dragBoundFunc = p => ({x:0, y:Math.max(0, Math.min(p.y, worldToPx(beakerHeight-h.water, scale)))});
    orgH.on('dragmove',()=>{ h.organic = beakerHeight - (orgH.y()+3)/scale; rebuildStage(layer,idx,cfg,h); });
    layer.add(orgH);
  }
}

// ‑‑‑ Legend (DOM) ------------------------------------------------------------
export function buildLegend(el, cfg) {
  el.innerHTML='';
  const items = [
    {txt:'Water',         col:'#85c1e9'},
    {txt:'Organic',       col:'#fad7a0'},
    {txt:'Droplet',       col:cfg.particles.colour.droplet},
    {txt:'Nanoparticle',  col:cfg.particles.colour.nanoparticle},
    {txt:'Surfactant',    col:cfg.surfactant.colour}
  ];
  items.forEach(i=>{
    const d=document.createElement('div');
    d.className='legend-item';
    d.innerHTML=`<span class="legend-swatch" style="background:${i.col}"></span>${i.txt}`;
    el.appendChild(d);
  });
}

// ‑‑‑ Main render -------------------------------------------------------------
export function renderVisualiser(root,cfg=CONFIG){
  root.innerHTML='';
  const gSpace = worldToPx(cfg.beakerWidth + 1, cfg.scale); // 1‑unit gap ⇒ matches legacy demo
  const stageW = gSpace * cfg.stages.length;
  const stageH = worldToPx(cfg.beakerHeight + 1, cfg.scale);

  const stage = new Konva.Stage({ container:root, width:stageW, height:stageH });

  cfg.stages.forEach((s,idx)=>{
    const layer = new Konva.Layer({ x:idx*gSpace, y:worldToPx(1, cfg.scale) }); // drop by 1‑unit
    stage.add(layer);

    const orgInit = idx===0 ? cfg.beakerHeight*0.3 : 0;
    const watInit = idx===cfg.stages.length-1 ? cfg.beakerHeight/2 : cfg.beakerHeight - orgInit;
    const h = { water:watInit, organic:orgInit };

    rebuildStage(layer, idx, cfg, h);
  });
}

// Auto‑render default config if an element with id="app" exists
if (typeof window!=='undefined'){
  const app=document.getElementById('app');
  if(app) renderVisualiser(app, CONFIG);
}
