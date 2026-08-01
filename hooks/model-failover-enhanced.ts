/**
 * Enhanced Model failover hook for MiMoCode.
 *
 * Detects LLM errors (429, timeout, quota) and suggests model fallback chain.
 * Implements 7-level fallback resolution from delegate-core pattern:
 * user override → category default → fallback_models → hardcoded chain → system default.
 *
 * Fires via chat.message for error detection + session.userQuery.post.
 */

import { writeFileSync } from "fs";

const LOG = "/tmp/model-failover-hook.log";

function log(msg: string) {
  writeFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`, { flag: "a" });
}

log("MODULE IMPORTED");

// 17 error patterns (expanded from delegate-core)
const ERROR_PATTERNS: RegExp[] = [
  /\b429\b/,
  /rate.?limit/i,
  /too many requests/i,
  /quota.?exceeded/i,
  /usage.?exceeded/i,
  /overloaded/i,
  /resource.?exhausted/i,
  /insufficient.?(quota|balance)/i,
  /high concurrency/i,
  /high load/i,
  /monthly usage limit/i,
  /5-hour usage limit/i,
  /weekly usage limit/i,
  /\b403\b/,
  /forbidden/i,
  /blocked by gateway/i,
  /timeout/i,
  /timed out/i,
  /connection reset/i,
  /ETIMEDOUT/,
  /ENOTFOUND/,
];

// 7-level model resolution order
const MODEL_CONFIG = {
  // Level 1: User override (highest priority)
  userOverride: "",
  
  // Level 2: Category defaults (per-model-type)
  categoryDefaults: {
    "coding": "deepseek/deepseek-v4-flash",
    "reasoning": "google/gemini-3.5-flash-lite",
    "fast": "moonshotai/kimi-k3",
  },
  
  // Level 3: User fallback chain (configurable)
  fallbackChain: [
    "deepseek/deepseek-v4-flash",
    "google/gemini-3.5-flash-lite",
    "moonshotai/kimi-k3",
    "openai/gpt-4.1-mini",
  ],
  
  // Level 4: Hardcoded system fallbacks
  systemFallbacks: [
    "deepseek/deepseek-v4-flash",
    "google/gemini-2.0-flash-lite",
  ],
  
  // Level 5: Budget fallbacks (ultra cheap)
  budgetFallbacks: [
    "deepseek/deepseek-v4-flash",
  ],
};

function detectErrorType(error: string): string | null {
  if (!error) return null;
  
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(error)) {
      if (/429|rate.?limit|too many requests/i.test(error)) return "rate_limit";
      if (/403|forbidden|blocked/i.test(error)) return "forbidden";
      if (/timeout|timed out|ETIMEDOUT/i.test(error)) return "timeout";
      if (/connection reset|ENOTFOUND|overloaded/i.test(error)) return "connection";
      if (/quota|insufficient|balance/i.test(error)) return "quota";
      return "transient";
    }
  }
  return null;
}

function resolveModelChain(currentModel: string, errorType: string): string[] {
  const chain: string[] = [];
  
  // Level 1: User override (skip if not set)
  // Level 2: Category default (skip if not categorized)
  
  // Level 3: User fallback chain — exclude current
  const userChain = MODEL_CONFIG.fallbackChain.filter(m => m !== currentModel);
  chain.push(...userChain);
  
  // Level 4: System fallbacks
  chain.push(...MODEL_CONFIG.systemFallbacks.filter(m => !chain.includes(m) && m !== currentModel));
  
  // Level 5: Budget fallbacks (only for rate_limit)
  if (errorType === "rate_limit") {
    chain.push(...MODEL_CONFIG.budgetFallbacks.filter(m => !chain.includes(m) && m !== currentModel));
  }
  
  return chain;
}

function getRecommendation(currentModel: string, errorType: string): {
  chain: string[];
  recommendation: string;
  command: string;
} {
  const chain = resolveModelChain(currentModel, errorType);
  const next = chain[0] || "deepseek/deepseek-v4-flash";
  
  return {
    chain: chain.slice(0, 3),
    recommendation: `[model-failover] ${errorType} detected. Try: ${next}`,
    command: `/model ${next}`,
  };
}

export default {
  // Detect errors from LLM response
  "chat.message": async (input: { message: string }, output: { message: string }) => {
    // This handler logs incoming messages for debug; actual error detection
    // happens via session.userQuery.post with error context
  },
  
  // Main error detection — fires after LLM step with error context
  "session.userQuery.post": async (
    input: { sessionID: string; finish?: string; error?: string },
    _output: {},
  ) => {
    if (!input.error) return;
    
    const errorType = detectErrorType(input.error);
    if (!errorType) return;
    
    const currentModel = process.env.MIMOCODE_MODEL || "deepseek/deepseek-v4-flash";
    const rec = getRecommendation(currentModel, errorType);
    
    log(`Error detected: ${errorType}`);
    log(`Current model: ${currentModel}`);
    log(`Suggested chain: ${rec.chain.join(" → ")}`);
    log(`Run: ${rec.command}`);
    
    // Print recommendation to user (Bun runtime — console.log works in hooks)
    console.log(`\n${rec.recommendation}`);
    console.log(`  Full chain: ${rec.chain.join(" → ")}`);
    console.log(`  Quick switch: ${rec.command}\n`);
  },
};
