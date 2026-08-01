/**
 * Tests for ast-grep tool — search, replace, formatting utilities.
 */

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { 
  runSg, 
  astGrepSearch, 
  astGrepReplace, 
  formatCliMatch, 
  getEmptyResultHint,
  CLI_LANGUAGES,
  DEFAULT_MAX_MATCHES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES,
} = await import("../tools/ast-grep.ts");

const SOURCE = readFileSync(join(import.meta.dirname, "..", "tools", "ast-grep.ts"), "utf8");

// --- CLI Languages ---

test("CLI_LANGUAGES includes TypeScript", () => {
  expect(CLI_LANGUAGES).toContain("typescript");
});

test("CLI_LANGUAGES includes common languages", () => {
  expect(CLI_LANGUAGES).toContain("python");
  expect(CLI_LANGUAGES).toContain("javascript");
  expect(CLI_LANGUAGES).toContain("go");
  expect(CLI_LANGUAGES).toContain("rust");
});

test("CLI_LANGUAGES includes 25+ languages", () => {
  expect(CLI_LANGUAGES.length).toBeGreaterThanOrEqual(25);
});

// --- Constants ---

test("DEFAULT_MAX_MATCHES is reasonable", () => {
  expect(DEFAULT_MAX_MATCHES).toBe(100);
});

test("DEFAULT_TIMEOUT_MS allows sufficient time", () => {
  expect(DEFAULT_TIMEOUT_MS).toBe(10000); // 10 seconds
});

test("DEFAULT_MAX_OUTPUT_BYTES is capped", () => {
  expect(DEFAULT_MAX_OUTPUT_BYTES).toBe(50000);
});

// --- Binary resolution ---

test("Binary resolution logic in source", () => {
  expect(SOURCE).toContain("function findSgCliPathSync");
  expect(SOURCE).toContain('"sg"'); // which sg
  expect(SOURCE).toContain("node_modules/.bin/sg");
});

test("Binary resolution handles platform packages", () => {
  expect(SOURCE).toContain("getPlatformPackageName");
  expect(SOURCE).toContain("@ast-grep/cli-linux-x64-gnu");
});

// --- Error handling ---

test("runSg returns error when binary unavailable", () => {
  // This should handle gracefully even if sg not installed
  const result = runSg({
    pattern: "test",
    lang: "typescript",
    paths: ["/nonexistent/path"],
    timeoutMs: 1000,
  });
  
  // Either got error or empty results (both acceptable)
  expect(result).toHaveProperty("matches");
  expect(result).toHaveProperty("totalMatches");
  expect(result).toHaveProperty("truncated");
});

// --- Formatting utilities ---

test("formatCliMatch formats file:line:column", () => {
  const match = {
    file: "src/utils.ts",
    range: {
      byteOffset: { start: 0, end: 10 },
      start: { line: 9, column: 5 },
      end: { line: 9, column: 15 },
    },
    lines: "const x = 1;",
    text: "const x = 1;",
    language: "typescript",
  };
  
  const formatted = formatCliMatch(match);
  expect(formatted).toContain("src/utils.ts");
  expect(formatted).toContain("10:6"); // line 9+1, column 5+1
});

test("formatCliMatch truncates long text", () => {
  const match = {
    file: "test.ts",
    range: { byteOffset: { start: 0, end: 0 }, start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
    lines: "x".repeat(300),
    text: "x".repeat(300),
    language: "typescript",
  };
  
  const formatted = formatCliMatch(match, 50);
  expect(formatted.length).toBeLessThan(100);
  expect(formatted).toContain("...");
});

test("getEmptyResultHint returns helpful message", () => {
  const hint = getEmptyResultHint("typescript");
  expect(hint).toContain("No matches found");
  expect(hint).toContain("typescript");
  expect(hint).toContain("$VAR");
});

test("getEmptyResultHint mentions meta-variables", () => {
  const hint = getEmptyResultHint("python");
  expect(hint).toContain("$$$");
  expect(hint).toContain("Meta-variables");
});

// --- Source-level validation ---

test("astGrepSearch function exists", () => {
  expect(SOURCE).toContain("export function astGrepSearch");
  expect(SOURCE).toContain("export function astGrepReplace");
});

test("runSg has error handling", () => {
  expect(SOURCE).toContain("ast-grep binary not found");
  expect(SOURCE).toContain("Exit code");
});

test("Meta-variables documented in help", () => {
  expect(SOURCE).toContain("$VAR");
  expect(SOURCE).toContain("$$$");
});

test("Binary resolution handles platforms", () => {
  expect(SOURCE).toContain("darwin-arm64");
  expect(SOURCE).toContain("linux-x64");
  expect(SOURCE).toContain("win32-x64");
});

test("Timeout and buffer limits configured", () => {
  expect(SOURCE).toContain("timeout:");
  expect(SOURCE).toContain("maxBuffer");
});

test("Structured results with ranges", () => {
  expect(SOURCE).toContain("byteOffset");
  expect(SOURCE).toContain("totalMatches");
  expect(SOURCE).toContain("truncatedReason");
});

test("Pattern matching with context", () => {
  expect(SOURCE).toContain("--context");
  expect(SOURCE).toContain("--pattern");
  expect(SOURCE).toContain("--lang");
});

test("Glob filtering supported", () => {
  expect(SOURCE).toContain("--glob");
});
