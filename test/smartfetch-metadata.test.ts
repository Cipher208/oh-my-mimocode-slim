/**
 * Tests for smartfetch metadata enrichment + permission patterns.
 */

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dirname, "..", "tools", "smartfetch.ts"), "utf8");

// Import functions for testing
const { extractMetadata, calculateTextMetrics, buildPermissionPatterns, buildAllowedOrigins } = await import("../tools/smartfetch.ts");

// --- extractMetadata tests ---
test("extractMetadata finds title", () => {
  const html = `<html><head><title>Test Page</title></head></html>`;
  const result = extractMetadata(html);
  expect(result.title).toBe("Test Page");
});

test("extractMetadata finds meta description", () => {
  const html = `<meta name="description" content="A great page">`;
  const result = extractMetadata(html);
  expect(result.description).toBe("A great page");
});

test("extractMetadata extracts OpenGraph tags", () => {
  const html = `
    <meta property="og:title" content="OG Title">
    <meta property="og:description" content="OG Desc">
    <meta property="og:image" content="https://img.com/og.png">
    <meta property="og:url" content="https://example.com/page">
  `;
  const result = extractMetadata(html);
  expect(result.ogTitle).toBe("OG Title");
  expect(result.ogDescription).toBe("OG Desc");
  expect(result.ogImage).toBe("https://img.com/og.png");
  expect(result.ogUrl).toBe("https://example.com/page");
});

test("extractMetadata finds author", () => {
  const html = `<meta name="author" content="John Doe">`;
  const result = extractMetadata(html);
  expect(result.author).toBe("John Doe");
});

test("extractMetadata handles article:author", () => {
  const html = `<meta property="article:author" content="Jane Smith">`;
  const result = extractMetadata(html);
  expect(result.author).toBe("Jane Smith");
});

test("extractMetadata handles published date", () => {
  const html = `<meta property="article:published_time" content="2026-07-31T10:00:00Z">`;
  const result = extractMetadata(html);
  expect(result.publishedDate).toBe("2026-07-31T10:00:00Z");
});

test("extractMetadata returns empty object for no matches", () => {
  const html = `<div>no metadata</div>`;
  const result = extractMetadata(html);
  expect(Object.keys(result).length).toBe(0);
});

// --- calculateTextMetrics tests ---
test("calculateTextMetrics counts words correctly", () => {
  const text = "one two three four five";
  const result = calculateTextMetrics(text);
  expect(result.wordCount).toBe(5);
});

test("calculateTextMetrics calculates reading time", () => {
  const text = Array(450).fill("word").join(" "); // 450 words
  const result = calculateTextMetrics(text);
  expect(result.readingTime).toBe(2); // 450 / 225 = 2
});

test("calculateTextMetrics detects Latin text", () => {
  const text = "This is English text with many Latin words for detection";
  const result = calculateTextMetrics(text);
  expect(result.language).toBe("latin");
});

test("calculateTextMetrics detects Cyrillic text", () => {
  const text = "Это русский текст с кириллицы для теста определения языка";
  const result = calculateTextMetrics(text);
  expect(result.language).toBe("cyrillic");
});

test("calculateTextMetrics handles empty text", () => {
  const result = calculateTextMetrics("");
  expect(result.wordCount).toBe(0);
  expect(result.language).toBe("empty");
});

test("calculateTextMetrics ignores extra whitespace", () => {
  const text = "  one\n\n\ntwo  \nthree  ";
  const result = calculateTextMetrics(text);
  expect(result.wordCount).toBe(3);
});

// --- Permission patterns tests ---
test("buildPermissionPatterns includes URL and llms variants", () => {
  const patterns = buildPermissionPatterns("https://docs.example.com/api", "https://docs.example.com/llms.txt");
  expect(patterns).toContain("https://docs.example.com/api");
  expect(patterns).toContain("https://docs.example.com/llms.txt");
  expect(patterns).toContain("https://docs.example.com/llms-full.txt");
});

test("buildPermissionPatterns handles no fallback", () => {
  const patterns = buildPermissionPatterns("https://example.com/page");
  expect(patterns).toContain("https://example.com/page");
  expect(patterns).toContain("https://example.com/llms.txt");
});

test("buildAllowedOrigins extracts origins", () => {
  const origins = buildAllowedOrigins([
    "https://example.com/page",
    "https://docs.test.com/guide",
    "https://example.com/llms.txt"
  ]);
  expect(origins.has("https://example.com")).toBe(true);
  expect(origins.has("https://docs.test.com")).toBe(true);
  expect(origins.size).toBe(2); // deduplicated
});

test("buildAllowedOrigins handles invalid URLs", () => {
  const origins = buildAllowedOrigins(["not-a-url", "https://example.com/page"]);
  expect(origins.size).toBe(1);
  expect(origins.has("https://example.com")).toBe(true);
});

// --- Source-level tests ---
test("extractMetadata function exists in source", () => {
  expect(SOURCE).toContain("extractMetadata");
});

test("calculateTextMetrics function exists in source", () => {
  expect(SOURCE).toContain("calculateTextMetrics");
});

test("buildPermissionPatterns function exists in source", () => {
  expect(SOURCE).toContain("buildPermissionPatterns");
});

test("buildAllowedOrigins function exists in source", () => {
  expect(SOURCE).toContain("buildAllowedOrigins");
});

test("Metadata enrichment integrated into smartFetch", () => {
  expect(SOURCE).toContain("extractMetadata(content)");
  expect(SOURCE).toContain("calculateTextMetrics");
  expect(SOURCE).toContain("result.metadata.wordCount");
  expect(SOURCE).toContain("result.metadata.readingTime");
  expect(SOURCE).toContain("result.metadata.allowedOrigins");
});
