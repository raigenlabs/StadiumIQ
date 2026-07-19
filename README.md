# StadiumIQ: FIFA World Cup 2026 Core

StadiumIQ is a highly polished, GenAI-enabled operations and fan-experience platform designed for the FIFA World Cup 2026. Rather than presenting a checklist of independent features, the entire application revolves around a single unifying concept: **The StadiumIQ Neural Decision Engine**.

---

## ⚽ The Connective Idea

At the center of StadiumIQ sits an in-memory **Stadium Event Simulator** and an intelligent **AI Decision Engine**. 

1. **Simulated Telemetry Ingestion:** Continuous background sensor loops track sector-specific crowd density, sanitation fill levels, and power load metrics. Staff and spectators can also submit manual incident tickets.
2. **AI Triage & Classification:** The AI Decision Engine (powered by Gemini with a deterministic rule-based fallback) classifies each event, determines its critical priority level, and devises strategic mitigation recommendations.
3. **Closed-Loop Dispatch Routing:** The resulting outputs are routed simultaneously to:
   - **Spectator Portal:** Guides fans through smart, crowd-avoiding routes (via Dijkstra pathfinding), surfaces accessibility notes, and updates shuttle wait times.
   - **Operations Command:** Feeds live sector heatmaps, organizes an incident triage queue, tracks waste/power metrics, and populates a Kanban dispatch board for volunteers.
   - **Operational Intelligence:** Streams a comprehensive markdown briefing (End-of-day operations summary) of handle rates and anomalies.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, and `@google/genai` (via server proxy).
- **Backend:** Express, Node.js.
- **AI Middleware:** `@google/genai` (Gemini 2.5 Flash / Gemini 1.5 Flash models).
- **Compilation/Bundling:** `Vite` (static assets) and `esbuild` (standalone production server bundle inside `dist/server.cjs`).
- **Testing:** Native Node.js Test Runner (`node:test` + assertions).

---

## 📊 Honest Disclosure: Live Data Simulation

To maintain operational integrity, **all match-day sensors, metrics, and incident streams are fully simulated in-memory**. Crowd, transport, and sustainability data are simulated for this demo via a deterministic generator, architected so real IoT/sensor feeds could be substituted through the same data interface.

- The system runs on a 5-second background interval loop on the server, automatically updating metrics, adjusting transit shuttle delays, and triggering minor simulated anomalies.
- All dashboards, charts, and maps are clearly labeled as **"Simulated Feed"** to differentiate from real telemetry.
- **Hardware Integration Ready:** The entire architecture is built to easily swap the simulation loop with standard MQTT or HTTP webhook bindings to real physical stadium sensor feeds.

---

## 🚀 Commands

### 1. Run Development Server
```bash
npm run dev
```
Starts Express on port `3000` with hot-reloading asset compilation handled automatically by Vite middleware.

### 2. Execute Test Suites
```bash
npm test
```
Runs the native, dependency-free test runner, validating sanitizers, Dijkstra congestion detours, and AI engine fallbacks.

### 3. Production Compilation
```bash
npm run build
```
Compiles client-side bundles and compiles server code to a standalone CommonJS bundle.
