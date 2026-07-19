import { describe, it } from "node:test";
import assert from "node:assert";
import { findCongestionAwarePath } from "../../src/utils/routing.js";
import { StadiumZone } from "../../src/types.js";

describe("Smart Navigation Routing Logic", () => {
  const mockDensities: Record<StadiumZone, number> = {
    [StadiumZone.ZONE_A]: 20, // Clean
    [StadiumZone.ZONE_B]: 90, // CRITICAL CROWD
    [StadiumZone.ZONE_C]: 30, // Clean
    [StadiumZone.ZONE_D]: 15, // Clean
    [StadiumZone.ZONE_E]: 40, // Moderate
    [StadiumZone.ZONE_F]: 25, // Clean
  };

  // Case 1: Happy Path
  it("should find the shortest path between adjacent clear zones", () => {
    // A to D should go directly: [A, D] since they are connected and clean
    const { path } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_D, mockDensities);
    assert.deepStrictEqual(path, [StadiumZone.ZONE_A, StadiumZone.ZONE_D]);
  });

  // Case 2: Congestion Avoidance (Dynamic rerouting)
  it("should bypass high density zones (Zone B) when calculating path", () => {
    // Navigating from Zone A to Zone C.
    // Standard path through Zone B is 90% crowded.
    // Path should detour through Zone E (concourse, 40%) to get to Zone C (30%).
    // Path: [A, E, C] or [A, D, C]. Let's verify it detours away from B!
    const { path } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_C, mockDensities);
    assert.ok(!path.includes(StadiumZone.ZONE_B), "Path should detour around highly congested Zone B!");
  });

  // Case 3: Empty/Missing inputs fallback
  it("should handle identical source and destination gracefully", () => {
    const { path } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_A, mockDensities);
    assert.deepStrictEqual(path, [StadiumZone.ZONE_A]);
  });

  // Case 4: Extreme/Boundary Inputs
  it("should find a path even if all connected zones are crowded", () => {
    const hyperCongested: Record<StadiumZone, number> = {
      [StadiumZone.ZONE_A]: 95,
      [StadiumZone.ZONE_B]: 95,
      [StadiumZone.ZONE_C]: 95,
      [StadiumZone.ZONE_D]: 95,
      [StadiumZone.ZONE_E]: 95,
      [StadiumZone.ZONE_F]: 95,
    };
    const { path } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_F, hyperCongested);
    assert.ok(path.length > 1);
    assert.strictEqual(path[0], StadiumZone.ZONE_A);
    assert.strictEqual(path[path.length - 1], StadiumZone.ZONE_F);
  });

  it("should recommend alternative route if there is highly crowded zone along the path", () => {
    const densities: Record<StadiumZone, number> = {
      [StadiumZone.ZONE_A]: 10,
      [StadiumZone.ZONE_B]: 85, // Crowded
      [StadiumZone.ZONE_C]: 10,
      [StadiumZone.ZONE_D]: 10,
      [StadiumZone.ZONE_E]: 10,
      [StadiumZone.ZONE_F]: 10,
    };
    // Direct path A -> B -> F goes through B (density 85), which sets alternativeRouteRecommended = true
    const { path, alternativeRouteRecommended } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_B, densities);
    assert.deepStrictEqual(path, [StadiumZone.ZONE_A, StadiumZone.ZONE_B]);
    assert.strictEqual(alternativeRouteRecommended, true);
  });

  it("should handle missing density keys gracefully", () => {
    // Empty record should default densities to 0
    const emptyDensities = {} as any; // specifically casting as any here in the test for testing malformed input bypass
    const { path, alternativeRouteRecommended } = findCongestionAwarePath(StadiumZone.ZONE_A, StadiumZone.ZONE_B, emptyDensities);
    assert.deepStrictEqual(path, [StadiumZone.ZONE_A, StadiumZone.ZONE_B]);
    assert.strictEqual(alternativeRouteRecommended, false);
  });
});
