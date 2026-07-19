import { GoogleGenAI } from "@google/genai";
import { getSimulationState } from "./simulation.js";
import { sanitizeStr } from "../../src/utils/sanitize.js";

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

/**
 * Compiles aggregated real-time operational statistics from the live simulation state.
 */
export function compileOperationalStats() {
  const simState = getSimulationState();

  // Metrics aggregates
  const totalZones = simState.metrics.length;
  const avgCrowdDensity = Math.round(simState.metrics.reduce((acc, m) => acc + m.crowdDensity, 0) / totalZones);
  const avgWasteLevel = Math.round(simState.metrics.reduce((acc, m) => acc + m.wasteFillLevel, 0) / totalZones);
  const totalEnergyKw = simState.metrics.reduce((acc, m) => acc + m.energyUsageKw, 0);

  // Highest density zone
  const highestDensityZone = [...simState.metrics].sort((a, b) => b.crowdDensity - a.crowdDensity)[0];
  const highestWasteZone = [...simState.metrics].sort((a, b) => b.wasteFillLevel - a.wasteFillLevel)[0];

  // Incidents stats
  const totalIncidents = simState.incidents.length;
  const resolvedIncidents = simState.incidents.filter((i) => i.status === "resolved").length;
  const activeIncidents = totalIncidents - resolvedIncidents;
  const criticalIncidents = simState.incidents.filter((i) => i.severity === "critical" && i.status !== "resolved").length;

  return {
    avgCrowdDensity,
    avgWasteLevel,
    totalEnergyKw,
    highestDensityZone,
    highestWasteZone,
    totalIncidents,
    resolvedIncidents,
    activeIncidents,
    criticalIncidents,
    rawIncidents: simState.incidents,
  };
}

/**
 * Local fallback operational digest generator in markdown.
 */
export function generateLocalDigest(stats: ReturnType<typeof compileOperationalStats>): string {
  return `# StadiumIQ Operational Digest — FIFA World Cup 2026
**Report Timestamp:** ${new Date().toLocaleString()}
**Overall Status:** ${stats.criticalIncidents > 0 ? "⚠️ ATTENTION REQUIRED" : "🟢 STABLE MATCH-DAY OPERATIONS"}

---

### 📊 Operational Summary Metrics
* **Average Arena Crowd Density:** ${stats.avgCrowdDensity}% capacity
* **Average Trash Bin Fill Level:** ${stats.avgWasteLevel}% capacity
* **Total Stadium Power Grid Draw:** ${stats.totalEnergyKw} kW
* **Match-day Incident Tickets:** ${stats.totalIncidents} logged (${stats.resolvedIncidents} resolved, ${stats.activeIncidents} active)

---

### 📍 Hotspot & Infrastructure Insights
* **Crowd Management:** Peak crowd density detected at **${stats.highestDensityZone.zone}** (${stats.highestDensityZone.crowdDensity}% occupancy). Flow-control measures are active.
* **Sustainability & Cleaning:** Bins in **${stats.highestWasteZone.zone}** are currently at **${stats.highestWasteZone.wasteFillLevel}%** capacity. Dispatching sanitation volunteers immediately is recommended to avoid overflow.
* **Incident Metrics:** There are currently **${stats.activeIncidents}** active unresolved incidents, of which **${stats.criticalIncidents}** require urgent staff attention.

---

### 📋 Recommended AI Action Plan
1. **Zone Crowd Dissipation:** Play synchronized directional exit advice on public screens near **${stats.highestDensityZone.zone}**.
2. **Targeted Waste Disposal:** Route a task to nearby volunteers to clear the waste disposal bins in **${stats.highestWasteZone.zone}** before they breach capacity limits.
3. **Transport Optimization:** Due to crowds in Zone F, instruct Metro Line 1 drivers to increase frequency to reduce wait times below the current estimated wait of 4 minutes.
`;
}

/**
 * Streams the End-of-Day AI Digest report.
 * Dynamically aggregates real-time metrics and prompts Gemini 3.5 Flash to generate a unified tactical analysis.
 */
export async function streamDigestReport(
  writeChunk: (data: string) => void,
  onDone: () => void
): Promise<void> {
  const stats = compileOperationalStats();
  const ai = getGeminiClient();

  if (!ai) {
    // Stream local markdown chunk by chunk
    const digestText = generateLocalDigest(stats);
    const paragraphs = digestText.split("\n");
    let i = 0;

    const interval = setInterval(() => {
      if (i < paragraphs.length) {
        writeChunk(paragraphs[i] + "\n");
        i++;
      } else {
        clearInterval(interval);
        onDone();
      }
    }, 100);
    return;
  }

  try {
    const prompt = `You are the Lead Operations Director AI for the FIFA World Cup 2026 at StadiumIQ.
    Write an analytical, highly professional Operations Digest report based on the following real-time stadium metrics:
    - Average Arena Crowd Density: ${stats.avgCrowdDensity}%
    - Average Waste Bin Fill Level: ${stats.avgWasteLevel}%
    - Peak Congestion Zone: ${stats.highestDensityZone.zone} at ${stats.highestDensityZone.crowdDensity}% occupancy
    - Peak Waste Build-up Zone: ${stats.highestWasteZone.zone} at ${stats.highestWasteZone.wasteFillLevel}% waste fill
    - Total Electricity Power Draw: ${stats.totalEnergyKw} kW
    - Total Incident Tickets Logged: ${stats.totalIncidents} (${stats.resolvedIncidents} resolved, ${stats.activeIncidents} currently unresolved)
    - Active Critical Severity Events: ${stats.criticalIncidents}
    - Details of current incidents: ${JSON.stringify(stats.rawIncidents)}

    Write a fully polished, beautiful markdown report containing:
    1. A strategic "Executive Summary" evaluating stadium health.
    2. A "Crowd Management Insight" referencing peak zones and shuttle transit load times.
    3. A "Sustainability and Energy Audit" highlighting trash bin clearing schedules and power efficiency.
    4. An "AI Action Plan" outlining 3-4 concrete tactical items to dispatch immediately.

    Do not include any placeholders. Ensure the tone is calm, highly technical, authoritative, and focused on safety, efficiency, and sustainability.`;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        writeChunk(chunk.text);
      }
    }
    onDone();
  } catch (error) {
    // Fallback if the Gemini API fails during streaming
    const digestText = generateLocalDigest(stats);
    writeChunk(`(Network mode fallback)\n\n` + digestText);
    onDone();
  }
}
