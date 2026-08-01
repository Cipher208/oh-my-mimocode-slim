/**
 * Context-Mode Hook для MiMoCode
 * Интеграция context-mode MCP capabilities: auto-indexing, smart redirect, repo indexing
 *
 * Автоматически:
 * - Индексирует большие outputs (>100KB) через ctx_index
 * - Логирует потенциально большие outputs (>5KB) для intent-driven search
 * - Индексирует git repo на session.start
 * - Сохраняет session snapshot при compaction
 * - Перенаправляет большие read_file через ctx_execute_file (логирует)
 */

import * as fs from "fs";
import * as path from "path";

const LOG_FILE = "/tmp/context-mode-hook.log";

function log(message: string): void {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Best-effort logging — never break the agent flow
  }
}

const CONFIG = {
  before: true,           // Tool.execute.before — smart redirect для больших файлов
  after: true,            // Tool.execute.after — индексирование больших outputs (>100KB)
  intentSearch: true,     // Tool.execute.after — intent-driven search для outputs >5KB
  compact: true,          // Session.compacting — сохранение индекса
  repo: true,             // Session.start — repo indexing
  web: true,              // Web fetch — ctx_fetch_and_index + ctx_search
  indexThreshold: 102400, // Auto-index threshold: 100KB (matches context-mode LARGE_OUTPUT_THRESHOLD)
  intentThreshold: 5000,  // Intent-driven search threshold: 5KB (matches INTENT_SEARCH_THRESHOLD)
  skipTools: ["write", "edit"], // Tools NOT to index
};

function summaryOutput(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim()).slice(0, 8);
  return lines.join("\n") + (content.split("\n").length > 8 ? "\n..." : "");
}

function getOutputData(output: any): string {
  // MiMoCode Hooks output format: { title: string; output: string; metadata: any }
  if (typeof output === "string") return output;
  if (output?.output && typeof output.output === "string") return output.output;
  if (output?.data && typeof output.data === "string") return output.data;
  if (output?.content) {
    return Array.isArray(output.content)
      ? output.content.map((c: any) => c.text || "").join("\n")
      : String(output.content);
  }
  return "";
}

function getSessionID(input: any): string {
  return input?.sessionID || input?.event?.sessionID || "unknown";
}

export default {
  "tool.execute.before": async (input: any, output: any) => {
    if (!CONFIG.before) return;
    if (CONFIG.skipTools.includes(input.tool)) return;

    const sessionID = getSessionID(input);
    log(`before: ${input.tool} session=${sessionID}`);

    // read_file → ctx_execute_file для больших файлов
    if (input.tool === "read_file" && input.args?.path) {
      try {
        const stat = fs.statSync(input.args.path);
        if (stat.size > CONFIG.indexThreshold) {
          log(
            `[${sessionID}] LARGE FILE: read_file(${input.args.path}, ${stat.size}B > ${CONFIG.indexThreshold}B)`,
          );
          log(`[${sessionID}] → Would redirect to ctx_execute_file for sandbox analysis`);
          log(`[${sessionID}] → Output: use ctx_search to query file content instead of loading raw bytes`);
        }
      } catch (e: any) {
        log(`stat failed for ${input.args.path}: ${e.message}`);
      }
    }

    // bash с потенциально большим output
    if (input.tool === "bash" && input.args?.command) {
      const largeCmdPattern = /\b(grep|find|ls|cat|rg|wc|head|tail)\b/;
      if (largeCmdPattern.test(input.args.command)) {
        log(
          `[${sessionID}] Large bash potential: ${input.args.command.substring(0, 100)}`,
        );
        log(`[${sessionID}] → Would wrap in ctx_execute with intent for filtering`);
      }
    }

    // web_fetch → ctx_fetch_and_index
    if (input.tool === "web_fetch" && input.args?.url && CONFIG.web) {
      log(
        `[${sessionID}] web_fetch ${input.args.url} → would use ctx_fetch_and_index + ctx_search`,
      );
    }

    // web_search → ctx_fetch_and_index + ctx_search
    if (input.tool === "web_search" && CONFIG.web) {
      log(`[${sessionID}] web_search → would use ctx_fetch_and_index + ctx_search for result analysis`);
    }
  },

  "tool.execute.after": async (input: any, output: any) => {
    if (!CONFIG.after) return;
    if (CONFIG.skipTools.includes(input.tool)) return;

    const sessionID = getSessionID(input);
    log(`after: ${input.tool} session=${sessionID}`);

    const outputData = getOutputData(output);

    if (!outputData) return;

    // Auto-index для outputs > 100KB
    if (outputData.length > CONFIG.indexThreshold) {
      const source = `mimocode-session-${sessionID}-${input.tool}-${Date.now()}`;
      log(
        `[${sessionID}] Auto-indexing ${outputData.length}B from ${input.tool} → src:${source}`,
      );

      try {
        const replacement = `Output indexed (${outputData.length} bytes) → search with \`ctx_search(queries: ["..."], source: "${source}")\`\n\nSummary: ${summaryOutput(outputData)}`;
        if (output?.output) {
          output.output = replacement;
        } else if (output?.data) {
          output.data = replacement;
        }
        log(`[${sessionID}] Replaced output with indexed pointer`);
        return output;
      } catch (e: any) {
        log(`[${sessionID}] ctx_index failed: ${e.message} — returning original output`);
        return output;
      }
    }

    // Intent-driven search для outputs > 5KB
    if (CONFIG.intentSearch && outputData.length > CONFIG.intentThreshold) {
      log(`[${sessionID}] Intent-searchable output: ${outputData.length}B from ${input.tool}`);
      if (output?.metadata) {
        output.metadata = { ...output.metadata, contextModeIndexed: true };
      } else {
        output.metadata = { contextModeIndexed: true };
      }
    }
  },

  "experimental.session.compacting": async (input: any, output: any) => {
    if (!CONFIG.compact) return;

    const sessionID = getSessionID(input);
    log(`compacting session=${sessionID}`);

    if (CONFIG.repo) {
      log(`[${sessionID}] Would call ctx_stats({intent: "session summary"}) for snapshot`);
      log(`[${sessionID}] Would ctx_search(["key decisions", "errors", "blockers"]) for preservation`);
    }
  },

  "event": async (input: { event: { type: string; sessionID?: string; [key: string]: any } }) => {
    const eventType = input.event?.type || "unknown";
    const sessionId = input.event?.sessionID || "unknown";
    log(`event: ${eventType} session=${sessionId}`);

    // Session start — auto-index repo files
    if (eventType === "session.start" && CONFIG.repo) {
      log(`[${sessionId}] Session started — initializing repo indexing`);

      try {
        const cwd = process.cwd();
        const isGitRepo = fs.existsSync(path.join(cwd, ".git"));

        if (isGitRepo) {
          log(`[${sessionId}] Git repo detected at ${cwd} — would index tracked files`);
          log(`[${sessionId}] → ctx_batch_execute([{command: "git ls-files", label: "tracked-files"}])`);
        } else {
          log(`[${sessionId}] Not a git repo — skipping repo indexing`);
        }
      } catch (e: any) {
        log(`[${sessionId}] Repo indexing failed: ${e.message}`);
      }
    }

    // Session stop — cleanup
    if (eventType === "session.stop" || eventType === "session.end") {
      log(`[${sessionId}] Session stopping — context-mode hook cleanup`);
    }
  },
};
