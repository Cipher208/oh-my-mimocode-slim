/**
 * Cancel-task tool for MiMoCode.
 *
 * Cancels running background tasks/subagents via session abort.
 * Adapted from oh-my-opencode-slim's cancel-task.ts.
 *
 * Usage:
 *   /cancel-task <session_id> "<reason>"
 */

import { spawnSync } from "child_process";
import { writeFileSync } from "fs";

const LOG_FILE = "/tmp/cancel-task.log";

function log(msg: string): void {
  try {
    writeFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, { flag: "a" });
  } catch {}
}

export interface CancelResult {
  success: boolean;
  task_id: string;
  message: string;
  killedProcesses: number;
  reason: string;
}

export const DEFAULT_ABORT_TIMEOUT_MS = 5_000;
export const DEFAULT_VERIFY_MS = 500;
export const DEFAULT_ABORT_RETRY_INTERVAL = 500;
export const DEFAULT_DELETE_TIMEOUT_MS = 10_000;

export interface CancelTaskOptions {
  abortTimeoutMs?: number;
  verifyMs?: number;
  abortRetryIntervalMs?: number;
}

export interface CancelTaskArgs {
  task_id: string;
  reason?: string;
}

/**
 * Cancel a running task by ID.
 *
 * Cancellation approach (simplified from openagent):
 * 1. Find processes matching the session/task ID
 * 2. Send SIGTERM gracefully
 * 3. Wait verify period
 * 4. If still running, send SIGKILL
 * 5. Verify termination with retries
 */
export async function cancelTask(
  args: CancelTaskArgs,
  options: CancelTaskOptions = {}
): Promise<CancelResult> {
  const {
    abortTimeoutMs = DEFAULT_ABORT_TIMEOUT_MS,
    verifyMs = DEFAULT_VERIFY_MS,
    abortRetryIntervalMs = DEFAULT_ABORT_RETRY_INTERVAL,
  } = options;

  const { task_id, reason = "no reason provided" } = args;

  log(`Cancelling task: ${task_id} — ${reason}`);

  let killedProcesses = 0;

  try {
    // Find and kill processes matching task ID
    // Use rtk to find processes (or pgrep/ps)
    const findResult = spawnSync("pgrep", ["-f", task_id], {
      encoding: "utf-8",
      timeout: 3000,
    });

    const pids = findResult.stdout
      ? findResult.stdout.trim().split("\n").filter(Boolean)
      : [];

    if (pids.length === 0) {
      log(`No processes found for task: ${task_id}`);
      return {
        success: false,
        task_id,
        message: `No running processes found for task '${task_id}'`,
        killedProcesses: 0,
        reason,
      };
    }

    log(`Found ${pids.length} process(es) matching ${task_id}: ${pids.join(", ")}`);

    // Send SIGTERM to all matching PIDs
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), "SIGTERM");
        killedProcesses++;
        log(`Sent SIGTERM to PID ${pid}`);
      } catch (err: any) {
        log(`Failed to kill PID ${pid}: ${err.message}`);
      }
    }

    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, abortTimeoutMs));

    // Verify termination — check if any PIDs still alive
    let stillRunning = 0;
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), 0); // signal 0 = check existence
        stillRunning++;
        log(`PID ${pid} still running — escalating to SIGKILL`);
        
        // Escalate to SIGKILL
        try {
          process.kill(parseInt(pid), "SIGKILL");
        } catch (e) {
          log(`Failed to SIGKILL PID ${pid}: ${(e as Error).message}`);
        }
      } catch (e) {
        // Process has exited — expected
      }
    }

    // Wait for forceful termination
    if (stillRunning > 0) {
      await new Promise(resolve => setTimeout(resolve, verifyMs * 3));
    }

    // Final verification
    let finalRunning = 0;
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), 0);
        finalRunning++;
      } catch (e) {
        // Exited
      }
    }

    if (finalRunning > 0) {
      return {
        success: false,
        task_id,
        message: `Killed ${killedProcesses} processes, but ${finalRunning} may still be running. Manual cleanup might be needed.`,
        killedProcesses,
        reason,
      };
    }

    return {
      success: true,
      task_id,
      message: `Successfully cancelled task '${task_id}'. Killed ${killedProcesses} process(es). Reason: ${reason}`,
      killedProcesses,
      reason,
    };

  } catch (error: any) {
    log(`Cancel task error: ${error.message}`);
    return {
      success: false,
      task_id,
      message: `Failed to cancel task: ${error.message}`,
      killedProcesses,
      reason,
    };
  }
}

// --- CLI interface ---

export default {
  name: "cancel_task",
  description:
    "Cancel a running background task or subagent. Accepts task_id (session ID or process name). Use for obsolete, wrong, or user-requested cancellations.",

  async run(args: CancelTaskArgs): Promise<string> {
    const result = await cancelTask(args);
    log(`Result: ${JSON.stringify(result)}`);
    return JSON.stringify(result, null, 2);
  },
};
