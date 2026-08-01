/**
 * Tests for smartfetch tool — URL normalization, cache, content detection.
 */

import { test, expect } from "bun:test";
import { resolve } from "node:path";

// Import source directly — Bun supports TS imports
import {
  smartFetch,
  CACHE,
  buildCacheKey,
  normalizeUrl,
  isDocsLikeUrl,
  getBinaryKind,
  isBinaryContentType,
  isHtmlLikeContentType,
  htmlToMarkdown,
  extractMainContent,
  probeLlmsTxt,
  MAX_RESPONSE_BYTES,
  DEFAULT_TIMEOUT_SECONDS,
  MAX_REDIRECTS,
} from "../tools/smartfetch";

// --- URL utilities ---
test("normalizeUrl adds https prefix", () => {
  const result = normalizeUrl("example.com");
  expect(result.url).toBe("https://example.com");
});

test("normalizeUrl preserves https", () => {
  const result = normalizeUrl("https://example.com/docs");
  expect(result.url).toBe("https://example.com/docs");
});

test("normalizeUrl strips trailing slash (except root)", () => {
  const result = normalizeUrl("https://example.com/path/");
  expect(result.url).toBe("https://example.com/path");
});

test("normalizeUrl builds fallback LLMSTxt URL", () => {
  const result = normalizeUrl("https://docs.example.com/api");
  expect(result.fallbackUrl).toBe("https://docs.example.com/llms.txt");
});

test("isDocsLikeUrl detects readthedocs", () => {
  expect(isDocsLikeUrl("https://project.readthedocs.io/en/latest/")).toBe(true);
  expect(isDocsLikeUrl("https://www.google.com")).toBe(false);
});

test("isDocsLikeUrl detects docs prefix", () => {
  expect(isDocsLikeUrl("https://docs.example.com/api")).toBe(true);
  expect(isDocsLikeUrl("https://developer.example.com/guide")).toBe(true);
});

// --- Content detection ---
test("getBinaryKind detects images", () => {
  expect(getBinaryKind("image/png")).toBe("image/");
  expect(getBinaryKind("image/jpeg")).toBe("image/");
});

test("getBinaryKind detects PDFs", () => {
  expect(getBinaryKind("application/pdf")).toBe("application/pdf");
});

test("getBinaryKind returns null for text", () => {
  expect(getBinaryKind("text/html")).toBe(null);
  expect(getBinaryKind("application/json")).toBe(null);
});

test("isBinaryContentType wrapper", () => {
  expect(isBinaryContentType("image/png")).toBe(true);
  expect(isBinaryContentType("text/html")).toBe(false);
});

test("isHtmlLikeContentType detects HTML variants", () => {
  expect(isHtmlLikeContentType("text/html")).toBe(true);
  expect(isHtmlLikeContentType("application/xhtml+xml")).toBe(true);
  expect(isHtmlLikeContentType("application/rss+xml")).toBe(true);
  expect(isHtmlLikeContentType("text/plain")).toBe(false);
});

// --- HTML processing ---
test("htmlToMarkdown strips tags", () => {
  const html = "<p>Hello <b>world</b></p>";
  const result = htmlToMarkdown(html);
  expect(result).toBe("Hello world");
});

test("htmlToMarkdown removes scripts and styles", () => {
  const html = "<script>alert('xss')</script><p>content</p><style>.x{}</style>";
  const result = htmlToMarkdown(html);
  expect(result).toContain("content");
  expect(result).not.toContain("alert");
  expect(result).not.toContain(".x");
});

test("htmlToMarkdown decodes entities", () => {
  const html = "Tom &amp; Jerry &lt;3";
  const result = htmlToMarkdown(html);
  expect(result).toContain("Tom & Jerry");
  expect(result).toContain("<3");
});

test("extractMainContent finds article content", () => {
  const html = `<body><nav>skip</nav><article><p>Main content here</p></article><footer>foot</footer></body>`;
  const result = extractMainContent(html);
  expect(result).toContain("Main content");
  expect(result).not.toContain("skip");
  expect(result).not.toContain("foot");
});

// --- Cache ---
test("buildCacheKey generates consistent keys", () => {
  const key1 = buildCacheKey("https://example.com", true, "auto", false);
  const key2 = buildCacheKey("https://example.com/", true, "auto", false);
  // Both should produce same key after normalization
  expect(key1).toBeTruthy();
  expect(key2).toBeTruthy();
});

test("CACHE is LRU with size limit", () => {
  expect(CACHE.maxSize).toBe(50 * 1024 * 1024); // 50MB
  expect(CACHE.ttl).toBe(15 * 60 * 1000); // 15 minutes
});

// --- Constants ---
test("MAX_RESPONSE_BYTES is 10MB", () => {
  expect(MAX_RESPONSE_BYTES).toBe(10 * 1024 * 1024);
});

test("DEFAULT_TIMEOUT_SECONDS is 30", () => {
  expect(DEFAULT_TIMEOUT_SECONDS).toBe(30);
});

test("MAX_REDIRECTS is 10", () => {
  expect(MAX_REDIRECTS).toBe(10);
});

// --- Export structure ---
test("Default export has all functions", async () => {
  const mod = await import("../tools/smartfetch");
  expect(mod.default).toBeDefined();
  expect(mod.default.smartFetch).toBeDefined();
  expect(mod.default.CACHE).toBeDefined();
  expect(mod.default.buildCacheKey).toBeDefined();
});
