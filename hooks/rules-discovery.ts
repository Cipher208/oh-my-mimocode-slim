/**
 * Rules discovery hook for MiMoCode.
 *
 * Implements openagent rules-engine patterns:
 * - Walk-up AGENTS.md discovery (find agents.md up dir tree)
 * - Rule file discovery (.omo/rules, .claude/rules, .cursor/rules, .github/instructions)
 * - Skill matching with picomatch-style globs
 *
 * Fires on session.start to build active context from rule files.
 */

import { readFileSync, existsSync, statSync } from "fs";
import { dirname, join, resolve } from "path";

const LOG_FILE = "/tmp/rules-discovery-hook.log";

function log(msg: string): void {
  try {
    readFileSync(LOG_FILE, "utf8"); // ensure exists
    const fs = require("fs");
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    // first run — create file
    try {
      const fs = require("fs");
      fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch {}
  }
}

function safeReadFile(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// Directories searched for rule files (from openagent rules-engine)
const RULE_DIRECTORIES = [
  ".omo/rules",
  ".claude/rules",
  ".cursor/rules",
  ".github/instructions",
];

// Single-file rule names
const SINGLE_FILE_RULES = [
  "copilot-instructions.md",
  "CONTEXT.md",
  "AGENTS.md",
];

// Project root markers (stop walking up when found)
const PROJECT_ROOT_MARKERS = [
  ".git",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  ".hg",
];

// Global distance limit (max dirs to walk up)
const GLOBAL_DISTANCE = 3;

function isProjectRoot(dir: string): boolean {
  for (const marker of PROJECT_ROOT_MARKERS) {
    if (existsSync(join(dir, marker))) return true;
  }
  return false;
}

function findAgentsMdUp(startDir: string, maxDistance = GLOBAL_DISTANCE): string | null {
  let currentDir = resolve(startDir);
  let distance = 0;

  while (distance <= maxDistance) {
    // Check for AGENTS.md in current directory
    const agentsPath = join(currentDir, "AGENTS.md");
    if (existsSync(agentsPath)) return agentsPath;

    // Check for CLAUDE.md as fallback
    const claudePath = join(currentDir, "CLAUDE.md");
    if (existsSync(claudePath) && statSync(claudePath).size > 100) return claudePath;

    // Stop if we hit project root
    if (isProjectRoot(currentDir)) {
      // One final check at project root
      const rootAgents = join(currentDir, "AGENTS.md");
      if (existsSync(rootAgents)) return rootAgents;
      break;
    }

    const parent = dirname(currentDir);
    if (parent === currentDir) break; // reached filesystem root
    currentDir = parent;
    distance++;
  }

  return null;
}

function findRuleFiles(startDir: string, maxDistance = GLOBAL_DISTANCE): string[] {
  const results: string[] = [];
  let currentDir = resolve(startDir);
  let distance = 0;

  while (distance <= maxDistance) {
    // Check rule directories
    for (const ruleDir of RULE_DIRECTORIES) {
      const rulePath = join(currentDir, ruleDir);
      if (existsSync(rulePath)) {
        try {
          const entries = readFileSync(rulePath, "utf8");
          if (entries) results.push(rulePath);
        } catch {}
      }
    }

    // Check single-file rules
    for (const fileName of SINGLE_FILE_RULES) {
      const filePath = join(currentDir, fileName);
      if (existsSync(filePath)) {
        // Skip AGENTS.md — handled by findAgentsMdUp separately
        if (fileName !== "AGENTS.md" && fileName !== "CLAUDE.md") {
          results.push(filePath);
        }
      }
    }

    if (isProjectRoot(currentDir) && distance > 0) break;

    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
    distance++;
  }

  return [...new Set(results)];
}

function getFileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

// Simple glob matching for rule files (subset of picomatch)
function matchGlob(pattern: string, path: string): boolean {
  // Support *, **, ?, [abc] simplified
  if (pattern === "*") return true;
  if (pattern.includes("**")) {
    const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]+").replace(/\?/g, "[^/]").replace(/\[([^\]]+)\]/g, "($1)") + "$");
    return regex.test(path);
  }
  const regex = new RegExp("^" + pattern.replace(/\*/g, "[^/]+").replace(/\?/g, ".") + "$");
  return regex.test(path);
}

export default {
  "session.start": async (input: { sessionID: string; cwd?: string }, output: { context?: string; rules?: string[] }) => {
    const cwd = input.cwd || process.cwd();
    log(`session.start: discovering rules for ${cwd} session=${input.sessionID}`);

    // Find AGENTS.md via walk-up
    const agentsMd = findAgentsMdUp(cwd);
    if (agentsMd) {
      const size = getFileSize(agentsMd);
      log(`AGENTS.md found: ${agentsMd} (${size}B)`);

      if (size > 0) {
        if (!output.context) output.context = "";
        output.context += `\n\n## Active AGENTS.md\nFrom: ${agentsMd}`;
      }
    } else {
      log(`No AGENTS.md found in ${cwd} (walked up ${GLOBAL_DISTANCE} levels)`);
    }

    // Find rule files
    const ruleFiles = findRuleFiles(cwd);
    if (ruleFiles.length > 0) {
      log(`Rule files found: ${ruleFiles.length}`);
      
      if (!output.rules) output.rules = [];
      output.rules.push(...ruleFiles);

      for (const rf of ruleFiles) {
        const size = getFileSize(rf);
        if (size > 1000) { // only index substantial rule files
          log(`  Indexing: ${rf} (${size}B)`);
        }
      }
    } else {
      log("No rule files found");
    }

    // Return discovered paths for indexing
    log(`Total discovery: AGENTS.md=${agentsMd ? "found" : "not found"}, rules=${ruleFiles.length}`);
  },
};
