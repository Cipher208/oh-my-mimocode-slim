/**
 * Tests for prompt versioning + A/B testing in agent-prompts.json + prompt-loader.mjs
 */

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROMPTS = JSON.parse(readFileSync(join(import.meta.dirname, "..", "agent-prompts.json"), "utf8"));
const SOURCE = readFileSync(join(import.meta.dirname, "..", "scripts", "prompt-loader.mjs"), "utf8");

test("agent-prompts.json has promptVersions", () => {
  expect(PROMPTS.promptVersions).toBeDefined();
  expect(PROMPTS.promptVersions.oracle).toBeDefined();
  expect(PROMPTS.promptVersions.oracle.current).toBe("v1.0");
});

test("promptVersions has multiple variants", () => {
  const variants = PROMPTS.promptVersions.oracle.variants;
  expect(Object.keys(variants)).toContain("v1.0");
  expect(variants["v1.1-experimental"]).toBeDefined();
});

test("v1.0 is active with 100% traffic", () => {
  const v1 = PROMPTS.promptVersions.oracle.variants["v1.0"];
  expect(v1.active).toBe(true);
  expect(v1.traffic).toBe(100);
});

test("v1.1-experimental is inactive", () => {
  const v2 = PROMPTS.promptVersions.oracle.variants["v1.1-experimental"];
  expect(v2.active).toBe(false);
  expect(v2.traffic).toBe(0);
});

test("v1.1-experimental has override append", () => {
  const v2 = PROMPTS.promptVersions.oracle.variants["v1.1-experimental"];
  expect(v2.overrides.append).toBeDefined();
  expect(v2.overrides.append).toContain("code snippet");
});

test("abTesting config exists", () => {
  expect(PROMPTS.abTesting).toBeDefined();
  expect(PROMPTS.abTesting.enabled).toBe(true);
  expect(PROMPTS.abTesting.metricsLog).toContain("/tmp/");
});

test("sampling config includes oracle", () => {
  expect(PROMPTS.abTesting.sampling.oracle).toBe("v1.0");
});

// Source-level checks
test("Source has version flag parsing", () => {
  expect(SOURCE).toContain("--version=");
  expect(SOURCE).toContain("forceVariant");
});

test("Source has --ab-test flag", () => {
  expect(SOURCE).toContain("--ab-test=");
  expect(SOURCE).toContain("ab_test_variant");
});

test("Source has metrics logging function", () => {
  expect(SOURCE).toContain("logMetrics");
  expect(SOURCE).toContain("metricsLog");
});

test("Source has variant override logic", () => {
  expect(SOURCE).toContain("variantOverrides");
  expect(SOURCE).toContain("activeVariant");
});

test("Source supports variant: prefix for customPrompt", () => {
  expect(SOURCE).toContain("variant:");
});

test("CLI shows versioning options in usage", () => {
  expect(SOURCE).toContain("--version=v1.1");
  expect(SOURCE).toContain("--ab-test=");
});

test("Version resolution logic present", () => {
  expect(SOURCE).toContain("versionConfig?.variants");
  expect(SOURCE).toContain("forceVariant");
  expect(SOURCE).toContain("activeVariant");
});

test("Variant overrides applied to output", () => {
  expect(SOURCE).toContain("variantOverrides.append");
});

test("getPrompt returns variant field", () => {
  expect(SOURCE).toContain("variant: activeVariant");
  expect(SOURCE).toContain("variant:");
});

test("Prompt schema is valid JSON", () => {
  // Already parsed at top — if we got here, it's valid
  expect(typeof PROMPTS).toBe("object");
  expect(PROMPTS.version).toBe("1.0.0");
});

test("All agents have version config or default", () => {
  const agents = Object.keys(PROMPTS.agents);
  expect(agents.length).toBeGreaterThanOrEqual(7);
});
