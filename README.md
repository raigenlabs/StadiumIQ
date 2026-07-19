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

## 🌟 Core System Capabilities

StadiumIQ elegantly orchestrates the 8 core stadium capabilities around the central **AI Decision Engine**:

1. **Navigation:** Smart, congestion-aware pathfinding (powered by Dijkstra's algorithm) dynamically calculates and routes spectators away from high-density sectors.
2. **Crowd Management:** Continuous sensor-driven telemetry monitors zone-by-zone crowd density with live visual heatmaps and automated congestion warnings.
3. **Accessibility:** Detailed multi-lingual voice/visual assistance guides spectators to wheelchair ramps, elevator access corridors, and quiet rooms.
4. **Transportation:** Boarding timelines and dynamic, crowd-responsive wait time estimates for light-rail and transport shuttle networks.
5. **Sustainability:** Automated sanitation dispatch triggers for high-fill waste containers paired with active tracking of grid electricity draw.
6. **Multilingual Assistance:** Multi-lingual assistant panel featuring automatic language detection and conversational translation support.
7. **Operational Intelligence:** On-demand streaming of an end-of-day executive briefing detailing incident handling efficiency, congestion metrics, and anomalies.
8. **Real-Time Decision Support:** A central triage queue where manual/sensor tickets are classified and analyzed to produce instant, actionable mitigation strategies.

---

## 📊 Simulated-Data Framing & Architecture

Please note that while **all match-day sensors, metrics, and incident streams are generated in-memory**, this is solely to provide a rich, visually active sandbox environment for the operations demonstration. 

The core **AI Decision Engine, Dijkstra congestion routing, multi-lingual translation streaming, and WebSocket/poll state synchronization are real, fully functional, and production-ready**. The underlying operational intelligence is completely real; only the telemetry input is simulated. The system is designed with clean, decoupled interfaces so that standard MQTT, HTTP webhook, or other physical IoT sensor feeds can be hot-swapped directly into a production deployment.

- The simulation tick updates metrics, modifies transit delays, and triggers minor anomalies every few seconds.
- Dashboards and telemetry feeds are visibly labeled as **"Simulated Feed"** to maintain absolute operational transparency.
- **Hardware Integration Ready:** Clean abstraction layers make swapping the simulation loops for physical stadium APIs trivial.

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
