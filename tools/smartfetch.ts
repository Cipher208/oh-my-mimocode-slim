/**
 * Smartfetch tool for MiMoCode — intelligent web fetching with caching.
 *
 * Adapted from oh-my-opencode-slim's smartfetch:
 * - LRU cache (50MB, 15min TTL) for repeated fetches
 * - Content type detection (HTML, JSON, binary)
 * - llms.txt probing for documentation URLs
 * - HTML → Markdown conversion with readability
 * - Redirect following (max 10)
 * - Content truncation (10MB max)
 *
 * Installation:
 *   Copy to ~/.local/share/mimocode/tools/ (or use as MCP tool)
 */

// --- Logging ---
const LOG_FILE = "/tmp/smartfetch.log";

function log(msg: string) {
  try {
    const fs = require("fs");
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

// --- Simple LRU Cache (no external deps) ---
interface CacheEntry {
  result: FetchResult;
  expiresAt: number;
  size: number;
}

class SimpleLRUCache {
  private cache = new Map<string, CacheEntry>();
  private totalSize = 0;
  public maxSize: number;
  public ttl: number;

  constructor(opts: { maxSize: number; ttl: number }) {
    this.maxSize = opts.maxSize;
    this.ttl = opts.ttl;
  }

  get(key: string): FetchResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.totalSize -= entry.size;
      return undefined;
    }
    const { result, expiresAt, size } = entry;
    this.cache.delete(key);
    this.cache.set(key, { result, expiresAt, size });
    return result;
  }

  set(key: string, value: FetchResult, size?: number): void {
    const entrySize = size ?? 1024;
    while (this.totalSize + entrySize > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value as string;
      const oldEntry = this.cache.get(firstKey)!;
      this.totalSize -= oldEntry.size;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      result: value,
      expiresAt: Date.now() + this.ttl,
      size: entrySize,
    });
    this.totalSize += entrySize;
  }
}

// --- Constants (from openagent smartfetch/constants.ts) ---
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_BINARY_DOWNLOAD_BYTES = 2 * 1024 * 1024; // 2MB
export const DEFAULT_TIMEOUT_SECONDS = 30;
export const MAX_TIMEOUT_SECONDS = 120;
export const MAX_REDIRECTS = 10;
export const MAX_LLMS_PROBE_TIMEOUT_MS = 8000;
export const DEFAULT_ACCEPT_LANGUAGE = "en;q=0.8,*;q=0.5";

export const BINARY_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
];

export const DOCS_HOST_SUFFIXES = [
  ".readthedocs.io",
  ".readthedocs.org",
  ".gitbook.io",
  ".netlify.app",
  ".vercel.app",
  "docs.rs",
];

export const DOCS_HOST_PREFIXES = ["docs.", "developer.", "dev.", "wiki."];

// --- Types ---
export interface SmartfetchOptions {
  url: string;
  extractMain?: boolean;
  preferLlmsTxt?: "auto" | "always" | "never";
  saveBinary?: boolean;
  timeout?: number;
  prompt?: string; // Optional LLM prompt for secondary processing
  secondaryModels?: SecondaryModel[]; // Fallback LLMs for content processing
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  markdown?: string;
  html?: string;
  text?: string;
  rawContent?: Buffer;
  metadata: {
    title?: string;
    description?: string;
    llmsTxtFound?: boolean;
    redirectChain: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    author?: string;
    publishedDate?: string;
    allowedOrigins?: string[];
    wordCount?: number;
    readingTime?: number;
    language?: string;
    contentLength?: number;
    secondaryProcessing?: { model: string; processed: boolean };
  };
}

// --- Cache (from openagent cache.ts, ported to SimpleLRUCache) ---
export const CACHE = new SimpleLRUCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 15 * 60 * 1000, // 15 minutes
});

export function buildCacheKey(
  url: string,
  extractMain: boolean,
  preferLlmsTxt: string,
  saveBinary: boolean,
): string {
  try {
    const parsed = new URL(url);
    return JSON.stringify({
      url: parsed.toString(),
      extractMain,
      preferLlmsTxt,
      saveBinary,
    });
  } catch {
    return url; // Fallback to raw URL
  }
}

// --- URL utilities ---
export function normalizeUrl(url: string): { url: string; fallbackUrl: string } {
  // Ensure https
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = "https://" + url;
  }

  // Normalize trailing slash (except for root)
  try {
    const parsed = new URL(url);
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
      url = parsed.toString();
    }
  } catch {}

  // Fallback URL for llms.txt probe
  let fallbackUrl = "";
  try {
    const parsed = new URL(url);
    fallbackUrl = `${parsed.protocol}//${parsed.host}/llms.txt`;
  } catch {}

  return { url, fallbackUrl };
}

export function isDocsLikeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    return (
      DOCS_HOST_SUFFIXES.some((s) => host.endsWith(s)) ||
      DOCS_HOST_PREFIXES.some((p) => host.startsWith(p))
    );
  } catch {
    return false;
  }
}

// --- Content detection ---
export function getBinaryKind(contentType: string): string | null {
  if (!contentType) return null;
  return BINARY_PREFIXES.find((prefix) => contentType.startsWith(prefix)) || null;
}

export function isBinaryContentType(contentType: string): boolean {
  return getBinaryKind(contentType) !== null;
}

export function isHtmlLikeContentType(contentType: string): boolean {
  if (!contentType) return false;
  return contentType.includes("text/html") || 
         contentType.includes("application/xhtml") ||
         contentType.includes("application/rss") ||
         contentType.includes("application/atom");
}

// --- HTML to Markdown (simplified from openagent) ---
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "") // Remove navs
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "") // Remove headers
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "") // Remove footers
    .replace(/<[^>]+>/g, "") // Remove tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}

export function extractMainContent(html: string): string {
  // Simplified main content extraction
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  
  // Try to find main/article/content
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*(?:class|id)=["'][^"']*(?:content|main|article)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  
  for (const pattern of mainPatterns) {
    const match = bodyContent.match(pattern);
    if (match && match[1].length > 100) {
      return htmlToMarkdown(match[1]);
    }
  }
  
  // Fallback to body
  return htmlToMarkdown(bodyContent);
}

// --- Core fetch function ---
export async function smartFetch(
  url: string,
  options: SmartfetchOptions = {},
): Promise<FetchResult> {
  const {
    extractMain = true,
    preferLlmsTxt = "auto",
    saveBinary = false,
    timeout = DEFAULT_TIMEOUT_SECONDS,
  } = options;

  const normalized = normalizeUrl(url);
  const cacheKey = buildCacheKey(normalized.url, extractMain, preferLlmsTxt, saveBinary);
  
  // Check cache
  const cached = CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const timeoutMs = Math.min(timeout * 1000, MAX_TIMEOUT_SECONDS * 1000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let lastError: Error | null = null;
  const redirectChain: string[] = [];

  // Follow redirects
  let currentUrl = normalized.url;
  for (let redirectCount = 0; redirectCount < MAX_REDIRECTS; redirectCount++) {
    try {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "Accept-Language": DEFAULT_ACCEPT_LANGUAGE,
          "User-Agent": "MiMoCode-SmartFetch/1.0",
        },
      });

      // Handle redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (location) {
          redirectChain.push(currentUrl);
          const newUrl = new URL(location, currentUrl).toString();
          currentUrl = newUrl;
          continue;
        }
      }

      const contentType = response.headers.get("content-type") || "";
      const isBinary = isBinaryContentType(contentType);

      const result: FetchResult = {
        url: normalized.url,
        finalUrl: currentUrl,
        status: response.status,
        contentType,
        metadata: {
          redirectChain,
          llmsTxtFound: false,
        },
      };

      if (isBinary) {
        if (saveBinary) {
          const buffer = await response.arrayBuffer();
          result.rawContent = Buffer.from(buffer);
          const binaryKind = getBinaryKind(contentType);
          if (binaryKind) {
            result.metadata; // Store binary kind
          }
        } else {
          result.text = `[Binary content: ${contentType}, ${response.headers.get("content-length") || "?"} bytes]`;
        }
      } else if (isHtmlLikeContentType(contentType) || contentType.includes("text/")) {
        let content = await response.text();
        
        // Check size limit
        if (Buffer.byteLength(content) > MAX_RESPONSE_BYTES) {
          content = content.substring(0, MAX_RESPONSE_BYTES) + "\n[...truncated]";
        }

        result.html = content;
        result.markdown = extractMain ? extractMainContent(content) : htmlToMarkdown(content);
        result.text = result.markdown;

        // Extract metadata
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) result.metadata.title = titleMatch[1].trim();

        const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch) result.metadata.description = descMatch[1].trim();

        // --- Metadata enrichment from openagent extractHeaderMetadata ---
        const metadata = extractMetadata(content);
        Object.assign(result.metadata, metadata);

        // --- Text metrics (word count + reading time) ---
        const markdown = result.markdown || result.text || "";
        const metrics = calculateTextMetrics(markdown);
        result.metadata.wordCount = metrics.wordCount;
        result.metadata.readingTime = metrics.readingTime;
        result.metadata.language = metrics.language;
        result.metadata.contentLength = Buffer.byteLength(markdown, "utf8");

        // --- Permission patterns for URL allowlist ---
        const permissionPatterns = buildPermissionPatterns(normalized.url, normalized.fallbackUrl);
        result.metadata.allowedOrigins = [...buildAllowedOrigins(permissionPatterns)];

        // Probe for llms.txt on docs sites
        if (preferLlmsTxt === "auto" && isDocsLikeUrl(normalized.url)) {
          result.metadata.llmsTxtFound = await probeLlmsTxt(normalized.fallbackUrl);
        }
      } else {
        // Other content types (JSON, XML, etc.)
        result.text = await response.text();
      }

      // Secondary model fallback — process content with LLM
      if (options.prompt && options.secondaryModels && options.secondaryModels.length > 0) {
        const decision = decideSecondaryModelUse(
          result.markdown || result.text || "",
          options.prompt,
          options.secondaryModels
        );

        if (decision.use) {
          try {
            const secondaryResult = await runSecondaryModelWithFallback(
              result,
              options.secondaryModels,
              options.prompt
            );
            result.metadata.secondaryProcessing = {
              model: secondaryResult.model,
              processed: true,
            };
            log(`Secondary model ${secondaryResult.model} processed content`);
          } catch (e: any) {
            log(`Secondary model failed: ${e.message}`);
            // Continue with original content — don't fail the fetch
          }
        }
      }

      CACHE.set(cacheKey, result);
      return result;

    } catch (error: any) {
      lastError = error;
      if (error.name === "AbortError") {
        throw new Error(`Timeout fetching ${currentUrl} (${timeoutMs}ms)`);
      }
      
      // Try https if http failed
      if (redirectCount === 0 && currentUrl.startsWith("http://")) {
        redirectChain.push(currentUrl);
        currentUrl = currentUrl.replace("http://", "https://");
        continue;
      }
      
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new Error(`Max redirects (${MAX_REDIRECTS}) exceeded for ${url}`);
}

// --- llms.txt probing ---
export async function probeLlmsTxt(llmsTxtUrl: string, timeoutMs = MAX_LLMS_PROBE_TIMEOUT_MS): Promise<boolean> {
  if (!llmsTxtUrl) return false;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(llmsTxtUrl, {
      signal: controller.signal,
      headers: { "Accept-Language": DEFAULT_ACCEPT_LANGUAGE }
    });
    
    clearTimeout(timeout);
    
    if (response.ok && response.headers.get("content-type")?.includes("text/plain")) {
      const text = await response.text();
      return text.length > 0 && !text.includes("404") && !text.includes("Not Found");
    }
    
    return false;
  } catch {
    return false;
  }
}

// --- Main export for MiMoCode integration ---
export default {
  smartFetch,
  CACHE,
  buildCacheKey,
  normalizeUrl,
  isDocsLikeUrl,
  extractMainContent,
  htmlToMarkdown,
  probeLlmsTxt,
  decideSecondaryModelUse,
  runSecondaryModelWithFallback,
  MAX_RESPONSE_BYTES,
  DEFAULT_TIMEOUT_SECONDS,
};

// --- Metadata enrichment (from openagent extractHeaderMetadata pattern) ---

/**
 * Extract OpenGraph and meta tags from HTML content.
 */
export function extractMetadata(html: string): {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  author?: string;
  publishedDate?: string;
} {
  const result: any = {};

  // Standard meta tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) result.description = descMatch[1].trim();

  // OpenGraph tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle) result.ogTitle = ogTitle[1].trim();

  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDesc) result.ogDescription = ogDesc[1].trim();

  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage) result.ogImage = ogImage[1].trim();

  const ogUrl = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  if (ogUrl) result.ogUrl = ogUrl[1].trim();

  // Author (meta[name=author], article:author, etc.)
  const authorMatch = html.match(
    /<meta[^>]+(?:name=["']author["']|property=["']article:author["'])[^>]*content=["']([^"']+)["']/i
  );
  if (authorMatch) result.author = authorMatch[1].trim();

  // Published date
  const dateMatch = html.match(
    /<meta[^>]+(?:name=["']date=["']|property=["']article:published_time["'])[^>]*content=["']([^"']+)["']/i
  );
  if (dateMatch) result.publishedDate = dateMatch[1].trim();

  return result;
}

/**
 * Calculate word count and estimated reading time.
 * Standard reading speed: 200-250 words/minute.
 */
export function calculateTextMetrics(text: string): {
  wordCount: number;
  readingTime: number;
  language: string;
} {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 225); // avg reading speed

  // Basic language detection (Latin vs Cyrillic vs other)
  const latinRatio = words.filter(w => /[a-zA-Z]/.test(w)).length / wordCount;
  const cyrillicRatio = words.filter(w => /[а-яА-ЯёЁ]/.test(w)).length / wordCount;
  
  let language = "unknown";
  if (latinRatio > 0.5) language = "latin";
  else if (cyrillicRatio > 0.3) language = "cyrillic";
  else if (wordCount > 0) language = "other";

  return { wordCount, readingTime, language: wordCount > 0 ? language : "empty" };
}

// --- Permission patterns (from openagent network.ts buildPermissionPatterns) ---

export interface PermissionPattern {
  url: string;
  origin: string;
  allowed: boolean;
}

/**
 * Build permission patterns for URL and fallback.
 * Returns URLs that are safe to fetch — helps with allowlist checks.
 */
export function buildPermissionPatterns(url: string, fallbackUrl?: string): string[] {
  const patterns = new Set<string>([url]);
  
  if (fallbackUrl) patterns.add(fallbackUrl);

  try {
    const origin = new URL(url).origin;
    patterns.add(`${origin}/llms.txt`);
    patterns.add(`${origin}/llms-full.txt`);
  } catch {}

  return [...patterns];
}

/**
 * Check if URL origin is in allowed origins set.
 */
export function buildAllowedOrigins(patterns: string[]): Set<string> {
  const origins = new Set<string>();
  for (const pattern of patterns) {
    try {
      origins.add(new URL(pattern).origin);
    } catch {
      // ignore invalid patterns
    }
  }
  return origins;
}

// --- Secondary model fallback (from openagent) ---

export interface SecondaryModel {
  model: string;
  prompt?: string;
  description?: string;
}

export const SECONDARY_MODEL_TIMEOUT_MS = 30_000;
export const MIN_WORDS_FOR_SECONDARY = 25;

/**
 * Decide whether to use secondary model for content processing.
 */
export function decideSecondaryModelUse(
  content: string,
  prompt: string | undefined,
  secondaryModels: SecondaryModel[],
) {
  if (!prompt?.trim()) return { use: false, reason: "no_prompt" };
  if (!secondaryModels.length) return { use: false, reason: "no_secondary_model_configured" };
  if (!content.trim()) return { use: false, reason: "empty_content" };
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount < MIN_WORDS_FOR_SECONDARY) return { use: false, reason: "content_too_short" };
  return { use: true, reason: "prompt_present" };
}

/**
 * Run content through secondary model with fallback across models.
 */
export async function runSecondaryModelWithFallback(
  fetchResult: FetchResult,
  secondaryModels: SecondaryModel[],
  defaultPrompt: string,
  timeoutMs = SECONDARY_MODEL_TIMEOUT_MS,
): Promise<{ text: string; model: string; success: boolean }> {
  let lastError: Error | null = null;
  const content = fetchResult.markdown || fetchResult.text || "";

  for (const modelConfig of secondaryModels) {
    const model = modelConfig.model;
    const prompt = modelConfig.prompt || defaultPrompt;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch("http://localhost:8787/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content },
          ],
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Model ${model} failed: ${response.status}`);

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const trimmed = text.trim();

      if (!trimmed || /^no response from secondary model\.?$/i.test(trimmed)) {
        lastError = new Error(`Model ${model} returned no usable text`);
        continue;
      }

      return { text: trimmed, model, success: true };
    } catch (error: any) {
      lastError = error;
      log(`Secondary model ${model} failed: ${error.message}`);
    }
  }

  throw lastError || new Error("All secondary models failed");
}
