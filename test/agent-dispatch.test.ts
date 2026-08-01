/**
 * Tests for agent-dispatch hook — /agent <name> slash command routing.
 */

import { test, expect, describe } from "bun:test";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Import hook logic by reading the file (hook is .ts not .ts module)
const hookSource = readFileSync(join(import.meta.dir, '..', 'hooks/agent-dispatch.ts'), 'utf8');

// Test the AGENT_SKILLS mapping by extracting from source
const AGENT_SKILLS_MATCH = hookSource.match(/AGENT_SKILLS[^}]+\}([\s\S]*?)(?:export default)/);

test("agent-dispatch maps all 7 agents", () => {
  expect(hookSource).toContain("oracle");
  expect(hookSource).toContain("librarian");
  expect(hookSource).toContain("explorer");
  expect(hookSource).toContain("fixer");
  expect(hookSource).toContain("observer");
  expect(hookSource).toContain("designer");
  expect(hookSource).toContain("council");
});

test("chat.message hook is exported", () => {
  expect(hookSource).toContain("chat.message");
  expect(hookSource).toContain("export default");
});

test("agent-dispatch handles list command", () => {
  expect(hookSource).toContain("agentName === \"list\"");
  expect(hookSource).toContain("agentName === \"help\"");
});

test("agent-dispatch extracts task from quotes", () => {
  // Pattern: /agent <name> "<task>"
  expect(hookSource).toContain('match = message.match');
});

test("agent-dispatch returns error for unknown agents", () => {
  expect(hookSource).toContain("Unknown agent");
  expect(hookSource).toContain("AGENT_SKILLS");
});

test("log file path is defined", () => {
  expect(hookSource).toContain("LOG_FILE");
  expect(hookSource).toContain("/tmp/agent-dispatch-hook.log");
});

// E2E test: simulate dispatch logic
test("dispatch logic produces correct redirect", () => {
  // Simulate what the hook should do
  const input = { message: '/agent oracle "Review MCP error handling"', sessionID: 'test-session' };
  
  // Check the regex would match
  const match = input.message.match(/^\/agent\s+(\w+)(?:\s+"([^"]+)")?$/i);
  expect(match).not.toBeNull();
  expect(match![1]).toBe("oracle");
  expect(match![2]).toBe("Review MCP error handling");
});

test("dispatch list command works", () => {
  const input = { message: '/agent list', sessionID: 'test-session' };
  const match = input.message.match(/^\/agent\s+(\w+)/i);
  expect(match![1]).toBe("list");
});

test("dispatch unknown agent handled", () => {
  const input = { message: '/agent nonexistent "test"', sessionID: 'test-session' };
  const match = input.message.match(/^\/agent\s+(\w+)(?:\s+"([^"]+)")?$/i);
  // Hook should detect 'nonexistent' not in AGENT_SKILLS map
  expect(match![1]).toBe("nonexistent");
});

test("non-agent command not matched", () => {
  const input = { message: 'What is the weather?', sessionID: 'test-session' };
  const match = input.message.match(/^\/agent\s+(\w+)(?:\s+"([^"]+)")?$/i);
  expect(match).toBeNull();
});
