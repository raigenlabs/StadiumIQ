import { GoogleGenAI, Type } from "@google/genai";
import { PriorityLevel, IncidentType, DecisionResult, StadiumZone } from "../../src/types.js";
import { sanitizeStr, sanitizeVal } from "../../src/utils/sanitize.js";
import { DENSITY_MED, DENSITY_CRITICAL, DENSITY_DEFAULT_FALLBACK } from "../../src/utils/constants.js";

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
 * Injects or overrides the internal GoogleGenAI client (primarily used for unit testing).
 */
export function setAiClient(client: any): void {
  aiClient = client;
}

/**
 * Deterministic rule-based fallback decision processor.
 * Extremely robust, handles negative/empty/extreme inputs gracefully.
 */
export function ruleBasedDecision(
  description: string,
  zone: string,
  typeInput?: string,
  currentDensity = DENSITY_DEFAULT_FALLBACK
): DecisionResult {
  const desc = sanitizeStr(description).toLowerCase();
  const zoneStr = sanitizeStr(zone);
  const density = sanitizeVal(currentDensity, DENSITY_DEFAULT_FALLBACK);

  let type: IncidentType = "other";
  let severity: PriorityLevel = "low";
  let recommendedAction = "Monitor zone activities.";
  let targetAudience: "fan" | "volunteer" | "ops" = "ops";
  let taskTitle = "Operational Review";

  // Match incident type
  if (typeInput === "crowd" || desc.includes("crowd") || desc.includes("density") || desc.includes("congestion") || desc.includes("capacity") || desc.includes("packed")) {
    type = "crowd";
    severity = "medium";
    recommendedAction = "Redirect incoming fans to alternative exits and dispatch flow directors.";
    targetAudience = "volunteer";
    taskTitle = `Crowd Control - ${zoneStr}`;
  } else if (typeInput === "security" || desc.includes("security") || desc.includes("fight") || desc.includes("smoke") || desc.includes("theft") || desc.includes("altercation") || desc.includes("trespass")) {
    type = "security";
    severity = "high";
    recommendedAction = "Dispatch stadium security personnel immediately and alert command center.";
    targetAudience = "ops";
    taskTitle = `Security Dispatch - ${zoneStr}`;
  } else if (typeInput === "medical" || desc.includes("medical") || desc.includes("injury") || desc.includes("heart") || desc.includes("faint") || desc.includes("bleed") || desc.includes("hurt")) {
    type = "medical";
    severity = "high";
    recommendedAction = "Dispatch medical response team with emergency kit to the designated zone sector.";
    targetAudience = "ops";
    taskTitle = `Medical Response - ${zoneStr}`;
  } else if (typeInput === "sustainability" || desc.includes("trash") || desc.includes("waste") || desc.includes("overflow") || desc.includes("bin") || desc.includes("spill") || desc.includes("litter")) {
    type = "sustainability";
    severity = "low";
    recommendedAction = "Assign waste sanitation staff to empty bins and clean spillages in concourse.";
    targetAudience = "volunteer";
    taskTitle = `Sanitation Task - ${zoneStr}`;
  }

  // Adjust severity based on critical keywords or high density
  if (desc.includes("critical") || desc.includes("emergency") || desc.includes("cardiac") || desc.includes("fire") || desc.includes("stampede")) {
    severity = "critical";
  } else if (density > DENSITY_CRITICAL && type === "crowd") {
    severity = "critical";
    recommendedAction = "URGENT: Block entrance gates to this zone. Play automated PA route guidance announcements.";
  } else if (density > DENSITY_MED && severity === "low") {
    severity = "medium";
  }

  return {
    severity,
    type,
    recommendedAction,
    targetAudience,
    taskTitle,
  };
}

/**
 * Process a stadium incident/event through the AI Decision Engine.
 * Combines high-precision Gemini API analysis with absolute rule-based fallback.
 */
export async function processEventThroughDecisionEngine(
  description: string,
  zone: StadiumZone,
  typeInput: IncidentType,
  currentDensity = DENSITY_DEFAULT_FALLBACK
): Promise<DecisionResult> {
  const sanitizedDesc = sanitizeStr(description);
  const density = sanitizeVal(currentDensity, DENSITY_DEFAULT_FALLBACK);

  // 1. Check if Gemini Client is active, if not, use rules
  const ai = getGeminiClient();
  if (!ai) {
    return ruleBasedDecision(sanitizedDesc, zone, typeInput, density);
  }

  try {
    const prompt = `Analyze this operational stadium event for the FIFA World Cup 2026.
    Event details:
    - Description: "${sanitizedDesc}"
    - Zone: "${zone}"
    - Ingested Type hint: "${typeInput}"
    - Local Crowd Density: ${density}%

    Classify the event type ("crowd", "security", "medical", "sustainability", "other"),
    assess severity ("low", "medium", "high", "critical"), and create a tailored, professional recommended action.
    Route to the correct target audience:
    - "fan" (if it is route guidance, safety warning, or transport update)
    - "volunteer" (if it is a manageable operational action like waste emptying, guiding spectators, queue handling)
    - "ops" (if it requires official staff dispatch, emergency response, or infrastructure fixes)

    Generate a concise task title for volunteers or staff if applicable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["severity", "type", "recommendedAction", "targetAudience", "taskTitle"],
          properties: {
            severity: {
              type: Type.STRING,
              description: "Must be 'low', 'medium', 'high', or 'critical'",
            },
            type: {
              type: Type.STRING,
              description: "Must be 'crowd', 'security', 'medical', 'sustainability', or 'other'",
            },
            recommendedAction: {
              type: Type.STRING,
              description: "The action to display to the audience (max 200 chars)",
            },
            targetAudience: {
              type: Type.STRING,
              description: "Must be 'fan', 'volunteer', or 'ops'",
            },
            taskTitle: {
              type: Type.STRING,
              description: "Short descriptive name for the task (e.g. 'Fix Zone A Waste Bins')",
            },
          },
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(response.text.trim());

    // Validate structured response elements to protect against LLM hallucinations
    const validSeverities: PriorityLevel[] = ["low", "medium", "high", "critical"];
    const validTypes: IncidentType[] = ["crowd", "security", "medical", "sustainability", "other"];
    const validAudiences: Array<"fan" | "volunteer" | "ops"> = ["fan", "volunteer", "ops"];

    const severity: PriorityLevel = validSeverities.includes(data.severity) ? data.severity : "medium";
    const type: IncidentType = validTypes.includes(data.type) ? data.type : "other";
    const targetAudience = validAudiences.includes(data.targetAudience) ? data.targetAudience : "ops";
    const recommendedAction = sanitizeStr(data.recommendedAction || "Monitor and resolve.");
    const taskTitle = sanitizeStr(data.taskTitle || "AI Dispatch Task");

    return {
      severity,
      type,
      recommendedAction,
      targetAudience,
      taskTitle,
    };
  } catch (error) {
    // If anything fails (network error, API limit, malformed JSON), fall back to rule-based logic instantly
    return ruleBasedDecision(sanitizedDesc, zone, typeInput, density);
  }
}
