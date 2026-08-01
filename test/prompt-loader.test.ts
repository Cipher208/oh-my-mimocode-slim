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
