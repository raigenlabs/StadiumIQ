import { describe, it } from "node:test";
import assert from "node:assert";
import { ruleBasedDecision, processEventThroughDecisionEngine, setAiClient } from "../../server/logic/decisionEngine.js";
import { StadiumZone } from "../../src/types.js";

describe("AI Decision Engine", () => {
  // Case 1: Happy Path
  it("should classify standard medical incidents properly", () => {
    const result = ruleBasedDecision("Fan experiencing severe chest pain in North Stand", "Zone A", "medical", 40);
    assert.strictEqual(result.type, "medical");
    assert.strictEqual(result.severity, "high");
    assert.strictEqual(result.targetAudience, "ops");
    assert.match(result.recommendedAction, /medical response team/i);
  });

  it("should classify sanitation / waste incidents properly", () => {
    const result = ruleBasedDecision("Trash bins are overflowing near food stalls", "Zone B", "sustainability", 50);
    assert.strictEqual(result.type, "sustainability");
    assert.strictEqual(result.severity, "low");
    assert.strictEqual(result.targetAudience, "volunteer");
    assert.match(result.recommendedAction, /waste/i);
  });

  it("should classify security incidents properly", () => {
    const result = ruleBasedDecision("Suspicious package spotted near Gate A", "Zone B", "security", 50);
    assert.strictEqual(result.type, "security");
    assert.strictEqual(result.severity, "high");
    assert.strictEqual(result.targetAudience, "ops");
  });

  it("should escalate low severity to medium if density is > 70", () => {
    const result = ruleBasedDecision("Litter spill in walkway", "Zone A", "sustainability", 75);
    assert.strictEqual(result.severity, "medium");
  });

  it("should handle critical medical keywords properly", () => {
    const result = ruleBasedDecision("Fan had cardiac arrest", "Zone B", "medical", 60);
    assert.strictEqual(result.type, "medical");
    assert.strictEqual(result.severity, "critical");
  });

  // Case 2: Negative/Invalid Input
  it("should handle weird strings and invalid density values", () => {
    // Negative density is clamped, non-numerical returns fallback
    const result = ruleBasedDecision("Stray cat in concourse", "Zone E", undefined, -20);
    assert.strictEqual(result.type, "other");
    assert.strictEqual(result.severity, "low");
    assert.strictEqual(result.targetAudience, "ops");
  });

  // Case 3: Empty/Missing Inputs
  it("should handle blank description and zone gracefully", () => {
    const result = ruleBasedDecision("", "", undefined, NaN);
    assert.strictEqual(result.type, "other");
    assert.strictEqual(result.severity, "low");
    assert.strictEqual(result.targetAudience, "ops");
  });

  // Case 4: Extreme/Boundary Inputs
  it("should escalate to critical for stampedes or fire emergency", () => {
    const result = ruleBasedDecision("STAMPEDE hazard at West Entrance Gate!", "Zone D", "crowd", 90);
    assert.strictEqual(result.severity, "critical");
    assert.strictEqual(result.type, "crowd");
  });

  it("should escalate crowd severity if density reaches critical threshold (>85%)", () => {
    const result = ruleBasedDecision("Heavy crowd accumulation", "Zone C", "crowd", 95);
    assert.strictEqual(result.severity, "critical");
    assert.strictEqual(result.targetAudience, "volunteer");
    assert.match(result.recommendedAction, /Block entrance gates/i);
  });

  // Fallback testing for Gemini call
  it("should successfully run processEventThroughDecisionEngine falling back to rule-based logic", async () => {
    // Calling processEventThroughDecisionEngine without an active Gemini key should fall back to rule-based cleanly
    const result = await processEventThroughDecisionEngine(
      "Medical emergency: unconscious child",
      StadiumZone.ZONE_A,
      "medical",
      35
    );
    assert.strictEqual(result.type, "medical");
    assert.strictEqual(result.severity, "critical");
    assert.strictEqual(result.targetAudience, "ops");
  });

  it("should successfully run processEventThroughDecisionEngine using mocked Gemini client", async () => {
    const mockClient = {
      models: {
        generateContent: async (args: any) => {
          return {
            text: JSON.stringify({
              severity: "critical",
              type: "medical",
              recommendedAction: "Mocked action from Gemini API",
              targetAudience: "ops",
              taskTitle: "Mocked Task Title"
            })
          };
        }
      }
    };

    // Inject mock client
    setAiClient(mockClient);

    try {
      const result = await processEventThroughDecisionEngine(
        "Unconscious spectator in North Stand",
        StadiumZone.ZONE_A,
        "medical",
        40
      );

      assert.strictEqual(result.type, "medical");
      assert.strictEqual(result.severity, "critical");
      assert.strictEqual(result.recommendedAction, "Mocked action from Gemini API");
      assert.strictEqual(result.targetAudience, "ops");
    } finally {
      // Reset client to null
      setAiClient(null);
    }
  });
});
