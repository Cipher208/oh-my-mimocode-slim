/**
 * AST-based code search/replace tool for MiMoCode.
 *
 * Adapted from oh-my-opencode-slim's ast-grep integration.
 * Uses system `sg` binary or npm @ast-grep/cli package.
 *
 * Features:
 * - AST-aware pattern matching (not just regex)
 * - 25 language support
 * - Meta-variables: $VAR (single node), $$$ (multiple nodes)
 * - Structured results with file/line/column ranges
 * - Search + replace capability
 *
 * Installation:
 *   npm install -g @ast-grep/cli
 *   OR: npx @ast-grep/cli
 */

import { spawnSync } from "child_process";
import { existsSync } from "fs";

// --- Types (from openagent types.ts) ---

export const CLI_LANGUAGES = [
  "bash", "c", "cpp", "csharp", "css", "elixir", "go", "haskell", "html",
  "java", "javascript", "json", "kotlin", "lua", "nix", "php", "python",
  "ruby", "rust", "scala", "solidity", "swift", "typescript", "tsx", "yaml",
] as const;

export type CliLanguage = (typeof CLI_LANGUAGES)[number];

export interface CliMatch {
  file: string;
  range: {
    byteOffset: { start: number; end: number };
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  lines: string;
  text: string;
  replacement?: string;
  language: string;
}

export interface SgResult {
  matches: CliMatch[];
  totalMatches: number;
  truncated: boolean;
  truncatedReason?: "timeout" | "max_output_bytes" | "max_matches";
  error?: string;
}

// --- Constants ---

export const DEFAULT_MAX_MATCHES = 100;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 50_000;

const MIN_BINARY_SIZE = 10000;

// --- Binary resolution ---

function getPlatformPackageName(): string | null {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap: Record<string, string> = {
    "darwin-arm64": "@ast-grep/cli-darwin-arm64",
    "darwin-x64": "@ast-grep/cli-darwin-x64",
    "linux-arm64": "@ast-grep/cli-linux-arm64-gnu",
    "linux-x64": "@ast-grep/cli-linux-x64-gnu",
    "win32-x64": "@ast-grep/cli-win32-x64-msvc",
  };

  const key = `${platform}-${arch}`;
  return platformMap[key] || platformMap["linux-x64"]; // fallback
}

function findSgCliPathSync(): string | null {
  // Check system PATH first
  try {
    const result = spawnSync("which", ["sg"], { encoding: "utf-8" });
    if (result.stdout && result.stdout.trim()) {
      const path = result.stdout.trim();
      if (existsSync(path)) return path;
    }
  } catch {}

  // Check local node_modules
  const localPath = "./node_modules/.bin/sg";
  if (existsSync(localPath)) return localPath;

  return null;
}

function ensureAstGrepBinary(): string | null {
  const systemPath = findSgCliPathSync();
  if (systemPath) return systemPath;

  // Try npx
  return "npx";
}

// --- Core run function ---

export interface RunOptions {
  pattern: string;
  lang: CliLanguage;
  paths?: string[];
  globs?: string[];
  rewrite?: string;
  context?: number;
  maxMatches?: number;
  timeoutMs?: number;
}

export function runSg(options: RunOptions): SgResult {
  const binary = ensureAstGrepBinary();
  if (!binary) {
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
      error: "ast-grep binary not found. Install: npm install -g @ast-grep/cli",
    };
  }

  const args: string[] = ["run", "--json"];

  if (binary === "npx") {
    args.unshift("@ast-grep/cli");
  }

  args.push("--pattern", options.pattern);
  args.push("--lang", options.lang as string);

  if (options.paths && options.paths.length > 0) {
    args.push(...options.paths);
  } else {
    args.push(".");
  }

  if (options.globs && options.globs.length > 0) {
    for (const glob of options.globs) {
      args.push("--glob", glob);
    }
  }

  if (options.rewrite) {
    args.push("--rewrite", options.rewrite);
  }

  if (options.context) {
    args.push("--context", String(options.context));
  }

  const maxMatches = options.maxMatches || DEFAULT_MAX_MATCHES;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    const result = spawnSync(binary, args, {
      encoding: "utf-8",
      timeout: timeoutMs,
      maxBuffer: 100 * 1024 * 1024, // 100MB
    });

    if (result.error) {
      return { matches: [], totalMatches: 0, truncated: false, error: result.error.message };
    }

    if (result.status !== 0) {
      return {
        matches: [],
        totalMatches: 0,
        truncated: false,
        error: result.stderr || `Exit code ${result.status}`,
      };
    }

    const jsonResult = JSON.parse(result.stdout);

    const matches: CliMatch[] = (jsonResult.matches || []).map((m: any) => ({
      file: m.file || m.path || "unknown",
      range: {
        byteOffset: { start: m.byteOffset?.start || 0, end: m.byteOffset?.end || 0 },
        start: { line: m.range?.start?.line || 0, column: m.range?.start?.column || 0 },
        end: { line: m.range?.end?.line || 0, column: m.range?.end?.column || 0 },
      },
      lines: m.lines || m.text || "",
      text: m.text || m.lines || "",
      language: m.language || options.lang,
    }));

    const truncated = matches.length >= maxMatches;
    return {
      matches,
      totalMatches: jsonResult.totalMatches || matches.length,
      truncated,
      truncatedReason: truncated ? "max_matches" : undefined,
    };
  } catch (error: any) {
    if (error.message?.includes("timeout")) {
      return { matches: [], totalMatches: 0, truncated: true, truncatedReason: "timeout", error: "Operation timed out" };
    }
    return { matches: [], totalMatches: 0, truncated: false, error: error.message };
  }
}

// --- Search tool ---

export function astGrepSearch(pattern: string, lang: CliLanguage, paths?: string[], opts?: Partial<RunOptions>): SgResult {
  return runSg({
    pattern,
    lang,
    paths: paths || ["."],
    context: opts?.context || 2,
    maxMatches: opts?.maxMatches || DEFAULT_MAX_MATCHES,
    timeoutMs: opts?.timeoutMs || DEFAULT_TIMEOUT_MS,
  });
}

// --- Replace tool ---

export function astGrepReplace(
  pattern: string,
  rewrite: string,
  lang: CliLanguage,
  paths?: string[],
  opts?: Partial<RunOptions>,
): SgResult {
  return runSg({
    pattern,
    lang,
    paths: paths || ["."],
    rewrite,
    maxMatches: opts?.maxMatches || DEFAULT_MAX_MATCHES,
    timeoutMs: opts?.timeoutMs || DEFAULT_TIMEOUT_MS,
  });
}

// --- Utility functions ---

export function formatCliMatch(match: CliMatch, maxTextLength = 200): string {
  const text = match.text.length > maxTextLength 
    ? match.text.substring(0, maxTextLength) + "..."
    : match.text;
  return `${match.file}:${match.range.start.line + 1}:${match.range.start.column + 1}: ${text}`;
}

export function getEmptyResultHint(lang: CliLanguage): string {
  return `No matches found for pattern in ${lang}. Check pattern syntax, try simpler pattern, or verify language support. Meta-variables: $VAR (single node), $$$ (multiple nodes).`;
}

// --- Default export ---

export default {
  runSg,
  astGrepSearch,
  astGrepReplace,
  formatCliMatch,
  getEmptyResultHint,
  ensureAstGrepBinary,
  CLI_LANGUAGES,
  DEFAULT_MAX_MATCHES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_OUTPUT_BYTES,
};
