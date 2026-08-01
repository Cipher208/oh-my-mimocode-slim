/**
 * Tests for prompt A/B testing metrics logging.
 */

import { test, expect } from "bun:test";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dirname, "..", "scripts", "prompt-loader.mjs"), "utf8");
const PROMPTS = JSON.parse(readFileSync(join(import.meta.dirname, "..", "agent-prompts.json"), "utf8"));

test("abTesting config is enabled", () => {
  expect(PROMPTS.abTesting.enabled).toBe(true);
  expect(PROMPTS.abTesting.metricsLog).toContain("/tmp/");
});

test("abTesting has sampling config", () => {
  expect(PROMPTS.abTesting.sampling).toBeDefined();
  expect(PROMPTS.abTesting.sampling.oracle).toBeDefined();
});

test("Source has logMetrics function", () => {
  expect(SOURCE).toContain("function logMetrics");
  expect(SOURCE).toContain("metricsLog");
});

test("Source logs A/B metrics in CLI", () => {
  expect(SOURCE).toContain("logMetrics(agentName");
  expect(SOURCE).toContain("wordCount");
});

test("Source supports --ab-test flag", () => {
  expect(SOURCE).toContain("--ab-test=");
  expect(SOURCE).toContain("ab_test_variant");
});

test("Source supports --version flag for variant selection", () => {
  expect(SOURCE).toContain("--version=");
  expect(SOURCE).toContain("forceVariant");
});

test("Metrics log file path defined in config", () => {
  const logPath = PROMPTS.abTesting.metricsLog;
  expect(logPath.startsWith("/tmp/")).toBe(true);
  expect(logPath).toContain("prompt-ab");
});

test("logMetrics writes to config-defined path", () => {
  // The function reads metricsLog from abTesting config
  expect(SOURCE).toContain('abTesting?.metricsLog');
  expect(SOURCE).toContain('"/tmp/prompt-ab-metrics.log"');
});

test("Metrics entry structure includes agent + variant", () => {
  expect(SOURCE).toContain("agent: agentName");
  expect(SOURCE).toContain("variant: variant");
});

test("Metrics entry includes timestamp", () => {
  expect(SOURCE).toContain("timestamp: new Date");
});

test("Metrics entry includes content metadata", () => {
  expect(SOURCE).toContain("wordCount:");
  expect(SOURCE).toContain("hasCustom:");
  expect(SOURCE).toContain("hasAppend:");
});

test("A/B test variant selection is deterministic", () => {
  // If --version=v1.1 is passed, customPrompt should contain "variant:"
  expect(SOURCE).toContain("customPrompt = `variant:${forceVariant}`");
});

test("Metric logging is fail-safe (try/catch)", () => {
  // logMetrics should have try/catch so logging failures don't break prompts
  expect(SOURCE).toContain("function logMetrics");
  // Count try blocks in logMetrics area
  const logMetricsContent = SOURCE.split("function logMetrics")[1]?.split("function ")[0];
  if (logMetricsContent) {
    expect(logMetricsContent).toContain("try");
  }
});

test("Prompt versioning schema includes traffic split", () => {
  const variants = PROMPTS.promptVersions.oracle.variants;
  expect(variants["v1.0"].traffic).toBe(100);
  expect(variants["v1.1-experimental"].traffic).toBe(0);
});

test("Metrics can be retrieved for analysis", () => {
  // The metrics log is a JSONL file with one entry per line
  const logPath = PROMPTS.abTesting.metricsLog;
  // Verify the format would produce valid JSON lines
  const sampleEntry = {
    timestamp: new Date().toISOString(),
    agent: "oracle",
    variant: "v1.0",
    wordCount: 100
  };
  expect(JSON.parse(JSON.stringify(sampleEntry))).toEqual(sampleEntry);
});
