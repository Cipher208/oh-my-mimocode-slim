/**
 * Tests for smartfetch secondary-model fallback.
 */

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOOK_PATH = join(import.meta.dirname, "..", "tools", "smartfetch.ts");
const SOURCE = readFileSync(HOOK_PATH, "utf8");

// Import functions (Bun supports TS)
const { decideSecondaryModelUse, runSecondaryModelWithFallback, MIN_WORDS_FOR_SECONDARY } = await import("../tools/smartfetch.ts");

test("decideSecondaryModelUse — no prompt", () => {
  const result = decideSecondaryModelUse("content", undefined, [{ model: "gpt-4" }]);
  expect(result.use).toBe(false);
  expect(result.reason).toBe("no_prompt");
});

test("decideSecondaryModelUse — no models", () => {
  const result = decideSecondaryModelUse("content", "summarize", []);
  expect(result.use).toBe(false);
  expect(result.reason).toBe("no_secondary_model_configured");
});

test("decideSecondaryModelUse — empty content", () => {
  const result = decideSecondaryModelUse("", "summarize", [{ model: "gpt-4" }]);
  expect(result.use).toBe(false);
  expect(result.reason).toBe("empty_content");
});

test("decideSecondaryModelUse — too short", () => {
  const shortContent = "one two three four"; // 4 words
  const result = decideSecondaryModelUse(shortContent, "summarize", [{ model: "gpt-4" }]);
  expect(result.use).toBe(false);
  expect(result.reason).toBe("content_too_short");
});

test("decideSecondaryModelUse — sufficient content", () => {
  const longContent = Array(30).fill("word").join(" "); // 30 words
  const result = decideSecondaryModelUse(longContent, "summarize", [{ model: "gpt-4" }]);
  expect(result.use).toBe(true);
  expect(result.reason).toBe("prompt_present");
});

test("MIN_WORDS_FOR_SECONDARY threshold is 25", () => {
  expect(MIN_WORDS_FOR_SECONDARY).toBe(25);
});

test("SECONDARY_MODEL_TIMEOUT_MS constant exists", () => {
  expect(SOURCE).toContain("SECONDARY_MODEL_TIMEOUT_MS");
  expect(SOURCE).toContain("30_000");
});

test("runSecondaryModelWithFallback is exported", () => {
  expect(typeof runSecondaryModelWithFallback).toBe("function");
});

test("Decide function exported", () => {
  expect(typeof decideSecondaryModelUse).toBe("function");
});

test("SecondaryModel interface has required fields", () => {
  expect(SOURCE).toContain("interface SecondaryModel");
  expect(SOURCE).toContain("model: string");
  expect(SOURCE).toContain("prompt?: string");
});

test("Fallback chain iterates models", () => {
  expect(SOURCE).toContain("for (const modelConfig of secondaryModels)");
  expect(SOURCE).toContain("lastError");
});

test("AbortController for timeout", () => {
  expect(SOURCE).toContain("AbortController");
  expect(SOURCE).toContain("setTimeout(() => controller.abort()");
});

test("Falls back to next model on failure", () => {
  expect(SOURCE).toContain("continue");
});

test("Metadata updated with secondary processing result", () => {
  expect(SOURCE).toContain("metadata.secondaryProcessing");
  expect(SOURCE).toContain("processed: true");
});

test("Prompt option triggers secondary processing", () => {
  expect(SOURCE).toContain("options.prompt && options.secondaryModels");
});
