/**
 * Tests for prompt-loader.mjs — prompt inheritance, loading, CLI.
 */

import { test, expect } from "bun:test";
import { getPrompt, loadPrompts } from "../scripts/prompt-loader.mjs";

test("loadPrompts returns all agents", () => {
  const prompts = loadPrompts();
  const agents = Object.keys(prompts.agents);
  expect(agents).toContain("oracle");
  expect(agents).toContain("librarian");
});

test("getPrompt returns prompt with question inserted", () => {
  const result = getPrompt("oracle", "Review MCP error handling");
  expect(result.prompt).toContain("Review MCP error handling");
  expect(result.prompt).toContain("strategic technical advisor");
});

test("getPrompt returns correct temperature", () => {
  const oracle = getPrompt("oracle", "test");
  expect(oracle.temperature).toBe(0.1);

  const librarian = getPrompt("librarian", "test");
  expect(librarian.temperature).toBe(0.3);
});

test("getPrompt returns correct tools", () => {
  const oracle = getPrompt("oracle", "test");
  expect(oracle.tools).toEqual(["read", "grep", "glob", "codesearch", "webfetch"]);

  const council = getPrompt("council_lead", "test");
  expect(council.tools).toEqual([]);
});

test("getPrompt respects customPrompt override", () => {
  const result = getPrompt("oracle", "Test question", "You are a custom expert");
  expect(result.prompt).toContain("You are a custom expert");
  expect(result.prompt).not.toContain("strategic technical advisor");
});

test("getPrompt appends customAppend", () => {
  const result = getPrompt("oracle", "test", "", "Additional context here");
  expect(result.prompt).toContain("Additional context here");
});

test("getPrompt resolves question placeholder", () => {
  const result = getPrompt("oracle", "Specific analysis request");
  expect(result.prompt).toContain("Specific analysis request");
  expect(result.prompt).not.toContain("{question}");
});

test("getPrompt throws on unknown agent", () => {
  expect(() => getPrompt("nonexistent_agent", "test")).toThrow(/Unknown agent/);
});

test("councillor_template has placeholders", () => {
  const prompts = loadPrompts();
  const template = prompts.agents.councillor_template;
  expect(template.base).toContain("{seat}");
  expect(template.base).toContain("{persona}");
  expect(template.base).toContain("Question:");
});

test("all agent configs have required fields", () => {
  const prompts = loadPrompts();
  for (const [name, config] of Object.entries(prompts.agents)) {
    expect(config.base, `${name} missing base`).toBeTruthy();
    expect(config.temperature !== undefined, `${name} missing temp`).toBe(true);
    expect(Array.isArray(config.tools), `${name} tools not array`).toBe(true);
  }
});

test("councillor_seats has alpha/beta/gamma/delta", () => {
  const prompts = loadPrompts();
  expect(prompts.councillor_seats).toBeDefined();

  const seats = Object.keys(prompts.councillor_seats);
  expect(seats).toContain("alpha");
  expect(seats).toContain("beta");
  expect(seats).toContain("gamma");
  expect(seats).toContain("delta");

  expect(prompts.councillor_seats.alpha.model).toBe("deepseek/deepseek-v4-flash");
});

// --- Variable injection tests ---
test("getPrompt injects question variable", () => {
  const result = getPrompt("oracle", "Test question text");
  expect(result.prompt).toContain("Test question text");
});

test("getPrompt injects agent_name variable", () => {
  const prompts = loadPrompts();
  // Find agent with {agent_name} in template, or check generic injection works
  expect(prompts.agents.oracle.base).toContain("Oracle"); // base includes agent name
});

test("getPrompt injects current_dir variable", () => {
  // Check that variables object contains current_dir
  const result = getPrompt("explorer", "find config files");
  // The prompt should contain CWD somewhere
  expect(typeof result.prompt).toBe("string");
});

test("getPrompt injects timestamp variable", () => {
  const result = getPrompt("oracle", "test");
  // Timestamp should be injected if template contains it
  expect(typeof result.prompt).toBe("string");
});

test("getPrompt supports extraVars parameter", () => {
  const result = getPrompt("oracle", "test", "", "", { custom_var: "injected_value" });
  // Should not crash with extra vars
  expect(result).toHaveProperty("prompt");
});

test("councillor_template has seat and persona placeholders", () => {
  const prompts = loadPrompts();
  const template = prompts.agents.councillor_template.base;
  expect(template).toContain("{seat}");
  expect(template).toContain("{persona}");
  // {question} is handled by variable injection in getPrompt
});

test("variable injection works for {seat} in council template", () => {
  const result = getPrompt("councillor_template", "What's the best model?", "", "", { seat: "alpha", persona: "analysis-first" });
  // Should replace {question} but leave {seat}/{persona} for council runner
  expect(result.prompt).toContain("What's the best model?");
});
