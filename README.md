# Detectoo v2.0 — Dark Forensic UI

A complete UI redesign of the image forgery detection system with a **dark forensic lab** aesthetic.

---

## What's New in the UI

- **Dark forensic theme** — deep black background (`#08080f`) with neon green (`#00ff88`) accents
- **Animated scan effect** — real canvas-based scan line animation during analysis
- **Glitch text** — CSS glitch effect on the hero title
- **Terminal log** — live typewriter-style system log during analysis
- **Animated verdict** — cinematic reveal with glowing borders and animated progress bars
- **Count-up numbers** — smooth animated number counters for all metrics
- **Zoom/pan overlay** — click-to-zoom on the heatmap image
- **Grid background** — subtle neon grid pattern across the entire app
- **Monospace typography** — `Courier New` for all data labels (forensic feel)
- **Neon toggle** — custom animated toggle switches

---

## Project Structure

```
detectoo_v2/
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── App.jsx          ← entire redesigned app (single file)
│   │   └── index.js
│   └── package.json
├── backend/
│   ├── main.py              ← FastAPI endpoints
│   ├── inference/
│   │   ├── pipeline.py      ← EfficientNet-B4 + UNet++ (+ demo fallback)
│   │   └── postprocess.py   ← Heatmap + region extractor
│   ├── weights/             ← drop .pth file here for real inference
│   └── requirements.txt
└── README.md
```

---

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000**

---

## UI Color System

| Variable  | Value       | Usage                      |
|-----------|-------------|----------------------------|
| `--neon`  | `#00ff88`   | Primary accent, borders, labels |
| `--red`   | `#ff3344`   | Tampered indicators, errors |
| `--bg`    | `#08080f`   | Background                 |
| `--border`| `rgba(255,255,255,0.08)` | Card borders  |
| `--muted` | `rgba(255,255,255,0.4)`  | Secondary text |

---

## Demo Mode

Without a `.pth` weights file in `backend/weights/`, the app runs in **demo mode** using three pixel-level heuristics (color uniformity, Sobel edge inconsistency, Laplacian noise variance). All UI features work identically.

---

College of Engineering, Pune — Anisha Sathe, Sneha Pawar, Shravani Sonawane
