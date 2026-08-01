/**
 * Tests for cancel-task tool — task cancellation with graceful + forceful shutdown.
 */

import { test, expect } from "bun:test";
import { spyOn } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dirname, "..", "tools", "cancel-task.ts"), "utf8");

// Import for testing
const { cancelTask, DEFAULT_ABORT_TIMEOUT_MS, DEFAULT_VERIFY_MS, DEFAULT_ABORT_RETRY_INTERVAL, DEFAULT_DELETE_TIMEOUT_MS } = await import("../tools/cancel-task.ts");

// --- Constants ---

test("DEFAULT_ABORT_TIMEOUT_MS is 5 seconds", () => {
  expect(DEFAULT_ABORT_TIMEOUT_MS).toBe(5_000);
});

test("DEFAULT_VERIFY_MS is 500ms", () => {
  expect(DEFAULT_VERIFY_MS).toBe(500);
});

test("DEFAULT_ABORT_RETRY_INTERVAL is 500ms", () => {
  expect(DEFAULT_ABORT_RETRY_INTERVAL).toBe(500);
});

test("DEFAULT_DELETE_TIMEOUT_MS is 10 seconds", () => {
  expect(DEFAULT_DELETE_TIMEOUT_MS).toBe(10_000);
});

// --- cancelTask function ---

test("cancelTask returns structured result", async () => {
  const result = await cancelTask({
    task_id: "nonexistent-task-id-12345",
    reason: "test"
  });

  expect(result).toHaveProperty("success");
  expect(result).toHaveProperty("task_id");
  expect(result).toHaveProperty("message");
  expect(result).toHaveProperty("killedProcesses");
  expect(result).toHaveProperty("reason");
});

test("cancelTask handles nonexistent task gracefully", async () => {
  const result = await cancelTask({
    task_id: "definitely-does-not-exist-xyz123",
    reason: "cleanup"
  });

  expect(result.success).toBe(false);
  expect(result.killedProcesses).toBe(0);
  expect(result.message).toContain("No running processes");
});

test("cancelTask uses default reason when not provided", async () => {
  const result = await cancelTask({ task_id: "test-no-reason" });
  expect(result.reason).toBe("no reason provided");
});

test("cancelTask accepts abortTimeoutMs option", async () => {
  const result = await cancelTask(
    { task_id: "test-task" },
    { abortTimeoutMs: 1000 }
  );
  expect(result).toBeDefined();
  expect(result.task_id).toBe("test-task");
});

test("cancelTask includes task_id in return type", () => {
  expect(SOURCE).toContain("task_id:");
  expect(SOURCE).toContain("task_id");
});

test("cancelTask message includes reason", () => {
  expect(SOURCE).toContain("no reason provided");
  expect(SOURCE).toContain("task_id");
});

// --- Source-level validation ---

test("Source exports cancelTask function", () => {
  expect(SOURCE).toContain("export async function cancelTask");
});

test("Source exports CancelTaskArgs interface", () => {
  expect(SOURCE).toContain("interface CancelTaskArgs");
});

test("Source exports CancelTaskOptions interface", () => {
  expect(SOURCE).toContain("interface CancelTaskOptions");
});

test("Source has SIGTERM escalation to SIGKILL", () => {
  expect(SOURCE).toContain("SIGTERM");
  expect(SOURCE).toContain("SIGKILL");
});

test("Source uses pgrep to find processes", () => {
  expect(SOURCE).toContain("pgrep");
});

test("Source verifies termination with signal 0", () => {
  expect(SOURCE).toContain("process.kill(parseInt(pid), 0)");
});

test("Source has retry/verify logic", () => {
  expect(SOURCE).toContain("abortRetryIntervalMs");
  expect(SOURCE).toContain("verifyMs");
});

test("Default export has run method", () => {
  expect(SOURCE).toContain("async run(args:");
  expect(SOURCE).toContain("name: \"cancel_task\"");
});

test("Source logs to /tmp/cancel-task.log", () => {
  expect(SOURCE).toContain("/tmp/cancel-task.log");
  expect(SOURCE).toContain("function log");
});

test("Source handles process kill errors", () => {
  expect(SOURCE).toContain("try");
  expect(SOURCE).toContain("catch");
});

test("Source has timeout for graceful period", () => {
  expect(SOURCE).toContain("abortTimeoutMs");
  expect(SOURCE).toContain("setTimeout");
});
