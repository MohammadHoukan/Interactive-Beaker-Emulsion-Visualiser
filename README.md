# Interactive Beaker‑Emulsion Visualiser

A tiny **Konva.js** demo that illustrates each step of a nanoparticle miniemulsion workflow.  Drag the grey handles to change liquid levels, watch droplets and surfactant lines rearrange in real‑time, and tweak the constants to create completely new experiments.

<p align="center">
  <!-- Replace with an actual GIF/screenshot once you record it -->
  <img src="docs/demo.gif" alt="Live demo of interactive beakers" width="700" />
</p>

---

## ✨ What’s inside

| Feature                        | Description                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Multi‑Stage Beakers**        | Four independent beaker groups showing premix, droplet formation, solvent removal and purification.              |
| **Physics‑Free Interactivity** | Drag handles to resize phases; visual elements redraw instantly without heavy physics engines.                   |
| **Collision‑Aware Surfactant** | Surfactant dashes are generated at random but avoid droplets and each other.                                     |
| **Config‑Driven**              | Beaker count, colours, particle radius, surfactant density & more live in one `config` block for quick remixing. |
| **Vanilla Stack**              | Pure HTML + ES modules + Konva.js – no build step required (but can be added).                                   |

---

## 🚀 Quick start

```bash
# 1  Clone
$ git clone https://github.com/<your‑user>/beaker‑emulsion‑viz.git
$ cd beaker‑emulsion‑viz

# 2  Serve (any static server works)
$ npx serve .        # or python -m http.server, or live‑server, etc.

# 3  Open the browser
#    http://localhost:5000 (or the port your server prints)
```

> **No build tools needed.** If you prefer a modern setup, feel free to drop the files into Vite, Parcel, Webpack, etc.

---

## 🔧 Configuration & Extensibility

All tweakables sit at the top of **`index.js`**:

```js
const CONFIG = {
  scale:            100,      // px per world‑unit
  beakerHeight:     3,        // world‑units
  beakerWidth:      2,
  stages: [
    { label: 'Premix',          showSurfactant: true  },
    { label: 'Droplet Form',    showSurfactant: true  },
    { label: 'Solidification',  showSurfactant: true  },
    { label: 'Purification',    showSurfactant: false }  // last beaker → no surfactant
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
```

Add your own stages, adjust colours, or swap Konva shapes for images — the helper functions (`drawBeaker`, `drawLiquids`, `drawParticles`, etc.) automatically adapt.

### Ideas for further interactivity

* **Sliders** for particle size and surfactant density.
* **Theme toggle** (dark / light) bound to CSS variables and colour config.
* **Simulation hooks** – feed real‑world concentration data and animate over time.
* **Export to PNG/SVG** via Konva’s built‑in `toDataURL()`.

---

## 🖥  Live demo on GitHub Pages

Once you’re happy:

```bash
$ npm run deploy     # if you add gh‑pages script
```

Or push a branch named **`gh-pages`** with your static files and enable Pages in repo settings.

---

## 🤝 Contributing

Pull requests and feature ideas are welcome!

1. Fork → Create branch → Commit → PR.
2. Please keep coding style consistent with the existing project (2‑space indent, semicolons).
3. Add a short demo or screenshot if you introduce new UI elements.

---

## 📄 License

MIT © 2025 Your Name – do what you like, just leave a credit.
