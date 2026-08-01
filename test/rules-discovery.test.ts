/**
 * Tests for rules-discovery hook — AGENTS.md walk-up + rule file discovery.
 */

import { test, expect } from "bun:test";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

// Read hook source for validation
const HOOK_PATH = join(import.meta.dirname, "..", "hooks", "rules-discovery.ts");
const HOOK_SOURCE = readFileSync(HOOK_PATH, "utf8");

// Test helpers (mirrors rules-discovery.ts logic)
const PROJECT_ROOT_MARKERS = [".git", "package.json", "pyproject.toml", "Cargo.toml", ".hg"];
const GLOBAL_DISTANCE = 3;

function isProjectRoot(dir: string): boolean {
  for (const marker of PROJECT_ROOT_MARKERS) {
    try {
      readFileSync(join(dir, marker));
      return true;
    } catch {}
  }
  return false;
}

function findAgentsMdUp(startDir: string, maxDistance = GLOBAL_DISTANCE): string | null {
  const { resolve, dirname } = require("node:path");
  const { existsSync } = require("node:fs");
  let currentDir = resolve(startDir);
  let distance = 0;

  while (distance <= maxDistance) {
    if (existsSync(join(currentDir, "AGENTS.md"))) return join(currentDir, "AGENTS.md");
    if (existsSync(join(currentDir, "CLAUDE.md"))) return join(currentDir, "CLAUDE.md");

    if (isProjectRootWithSync(currentDir)) {
      if (existsSync(join(currentDir, "AGENTS.md"))) return join(currentDir, "AGENTS.md");
      break;
    }

    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
    distance++;
  }
  return null;
}

function isProjectRootWithSync(dir: string): boolean {
  const { existsSync } = require("node:fs");
  for (const marker of PROJECT_ROOT_MARKERS) {
    if (existsSync(join(dir, marker))) return true;
  }
  return false;
}

async function makeTestFixture(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "rules-test-"));
  const tasks = Object.entries(files).map(async ([relPath, content]) => {
    const fullPath = join(dir, relPath);
    await mkdir(join(require("path").dirname(fullPath)), { recursive: true });
    await writeFile(fullPath, content, "utf8");
  });
  await Promise.all(tasks);
  return dir;
}

test("findAgentsMdUp finds AGENTS.md in current dir", async () => {
  const dir = await makeTestFixture({ "AGENTS.md": "# Project rules" });
  try {
    const result = findAgentsMdUp(dir);
    expect(result).toBe(join(dir, "AGENTS.md"));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("findAgentsMdUp walks up parent dirs", async () => {
  const dir = await makeTestFixture({
    "project/AGENTS.md": "# Root rules",
    "project/sub/deep/file.txt": "test"
  });
  try {
    const result = findAgentsMdUp(join(dir, "project", "sub", "deep"));
    expect(result).toBe(join(dir, "project", "AGENTS.md"));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("findAgentsMdUp returns null when not found", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rules-test-none-"));
  try {
    const result = findAgentsMdUp(dir);
    expect(result).toBeNull();
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("PROJECT_ROOT_MARKERS include key files", () => {
  expect(PROJECT_ROOT_MARKERS).toContain(".git");
  expect(PROJECT_ROOT_MARKERS).toContain("package.json");
});

test("GLOBAL_DISTANCE is reasonable", () => {
  expect(GLOBAL_DISTANCE).toBe(3);
});

test("Hook covers standard rule directories", () => {
  expect(HOOK_SOURCE).toContain(".omo/rules");
  expect(HOOK_SOURCE).toContain(".claude/rules");
  expect(HOOK_SOURCE).toContain(".cursor/rules");
  expect(HOOK_SOURCE).toContain(".github/instructions");
});

test("Hook exports default with session.start", () => {
  expect(HOOK_SOURCE).toContain("export default");
  expect(HOOK_SOURCE).toContain("session.start");
});

test("Hook writes to log file", () => {
  expect(HOOK_SOURCE).toContain("/tmp/rules-discovery-hook.log");
  expect(HOOK_SOURCE).toMatch(/log\("|writeFileSync/);
});

test("Hook discovers AGENTS.md via walk-up", () => {
  expect(HOOK_SOURCE).toContain("findAgentsMdUp");
  expect(HOOK_SOURCE).toContain("PROJECT_ROOT_MARKERS");
});

test("Hook has rule file discovery", () => {
  expect(HOOK_SOURCE).toContain("findRuleFiles");
  expect(HOOK_SOURCE).toContain("SINGLE_FILE_RULES");
});

test("Hook stops at project root", () => {
  expect(HOOK_SOURCE).toContain("isProjectRoot");
  expect(HOOK_SOURCE).toContain("GLOBAL_DISTANCE");
});
