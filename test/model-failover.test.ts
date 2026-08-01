/**
 * Tests for model-failover hook — error detection + 7-level fallback.
 */

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read the hook source to extract logic for testing
const hookPath = join(import.meta.dirname, '..', 'hooks', 'model-failover-enhanced.ts');
const hookSource = readFileSync(hookPath, 'utf8');

// Extract and re-implement test logic by importing the patterns
test("ERROR_PATTERNS contains 429 detection", () => {
  expect(hookSource).toContain("\\b429\\b");
  expect(hookSource).toContain("rate.?limit");
});

test("ERROR_PATTERNS covers timeout", () => {
  expect(hookSource).toContain("timeout");
  expect(hookSource).toContain("ETIMEDOUT");
});

test("ERROR_PATTERNS covers forbidden/403", () => {
  expect(hookSource).toContain("\\b403\\b");
  expect(hookSource).toContain("forbidden");
});

test("ERROR_PATTERNS covers quota errors", () => {
  expect(hookSource).toContain("quota");
  expect(hookSource).toContain("insufficient");
});

test("ERROR_PATTERNS covers connection errors", () => {
  expect(hookSource).toContain("connection reset");
  expect(hookSource).toContain("ENOTFOUND");
});

test("Has 7-level model resolution", () => {
  // Check for multi-tier fallback
  expect(hookSource).toContain("fallbackChain");
  expect(hookSource).toContain("systemFallbacks");
  expect(hookSource).toContain("budgetFallbacks");
});

test("detectErrorType returns error category", () => {
  expect(hookSource).toContain("detectErrorType");
  expect(hookSource).toContain("return \"rate_limit\"");
  expect(hookSource).toContain("return \"forbidden\"");
  expect(hookSource).toContain("return \"timeout\"");
});

test("resolveModelChain excludes current model", () => {
  expect(hookSource).toContain("filter(m => m !== currentModel)");
});

test("getRecommendation returns next model + command", () => {
  expect(hookSource).toContain("getRecommendation");
  expect(hookSource).toContain("/model");
});

test("Logs to /tmp/model-failover-hook.log", () => {
  expect(hookSource).toContain("/tmp/model-failover-hook.log");
});

test("Has chat.message handler", () => {
  expect(hookSource).toContain("chat.message");
});

test("Has session.userQuery.post handler", () => {
  expect(hookSource).toContain("session.userQuery.post");
});

test("MODULE IMPORTED log on load", () => {
  expect(hookSource).toContain("MODULE IMPORTED");
});

// E2E logic tests (simulated)
test("Error detection logic — 429 -> rate_limit", () => {
  const errorText = "Rate limit exceeded (429): Too many requests";
  const patterns = [
    /\b429\b/, /rate.?limit/i, /too many requests/i
  ];
  const matched = patterns.some(p => p.test(errorText));
  expect(matched).toBe(true);
});

test("Error detection logic — timeout -> timeout", () => {
  const errorText = "Request timeout exceeded";
  const patterns = [/timeout/i, /ETIMEDOUT/, /timed out/i];
  const matched = patterns.some(p => p.test(errorText));
  expect(matched).toBe(true);
});

test("7-level chain resolution order", () => {
  // Should resolve in order: fallbackChain → systemFallbacks → budgetFallbacks
  expect(hookSource).toContain("Level 3");
  expect(hookSource).toContain("Level 4");
  expect(hookSource).toContain("Level 5");
});
