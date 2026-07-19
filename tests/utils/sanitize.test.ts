import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeStr, sanitizeVal } from "../../src/utils/sanitize.js";

describe("Sanitization Helpers", () => {
  // Case 1: Happy Path
  it("should handle happy path inputs normally", () => {
    assert.strictEqual(sanitizeStr("Hello World"), "Hello World");
    assert.strictEqual(sanitizeVal(42), 42);
    assert.strictEqual(sanitizeVal("123.45"), 123.45);
  });

  // Case 2: Negative/Invalid Inputs
  it("should sanitize control characters and invalid numbers", () => {
    // Control characters removal
    assert.strictEqual(sanitizeStr("Hello\x00World\x1FTest"), "HelloWorldTest");
    // Invalid numeric string falls back
    assert.strictEqual(sanitizeVal("not-a-number", 10), 10);
    // Negative numbers should be clamped to 0 by Max(0, num) as per the brief's spec
    assert.strictEqual(sanitizeVal(-15, 0), 0);
  });

  // Case 3: Empty/Missing Inputs
  it("should handle empty or undefined inputs gracefully", () => {
    assert.strictEqual(sanitizeStr(null), "");
    assert.strictEqual(sanitizeStr(undefined), "");
    assert.strictEqual(sanitizeVal(undefined, 5), 5);
    assert.strictEqual(sanitizeVal(null, 0), 0);
  });

  // Case 4: Extreme/Boundary Inputs
  it("should enforce maximum string length limits", () => {
    const longString = "A".repeat(1000);
    const shortSanitized = sanitizeStr(longString, 10);
    assert.strictEqual(shortSanitized.length, 10);
    assert.strictEqual(shortSanitized, "AAAAAAAAAA");

    // Extreme number parsing
    assert.strictEqual(sanitizeVal(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  });
});
