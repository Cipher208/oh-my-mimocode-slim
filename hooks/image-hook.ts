/**
 * Image hook for MiMoCode.
 *
 * Processes image attachments in chat messages:
 * - Decodes data URLs (base64) to files
 * - Sanitizes filenames
 * - Stores in session-specific directories
 * - Auto-cleanup (10-min debounce, 1hr max age)
 *
 * Adapted from oh-my-opencode-slim's image-hook.ts.
 *
 * Installation:
 *   cp hooks/image-hook.ts ~/.config/mimocode/hooks/
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";

const LOG_FILE = "/tmp/image-hook.log";

function log(msg: string): void {
  try {
    writeFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, { flag: "a" });
  } catch {}
}

log("MODULE IMPORTED");

// --- Config ---
const IMAGE_DIR = "/tmp/mimocode-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes debounce
const MAX_FILE_AGE = 60 * 60 * 1000; // 1 hour

// --- Debounce cache ---
const lastCleanupByDir = new Map<string, number>();

// --- Types ---
interface ImagePart {
  type: string;
  url?: string;
  mime?: string;
  filename?: string;
  name?: string;
  [key: string]: unknown;
}

// --- Detection ---

function isImagePart(p: ImagePart): boolean {
  if (p.type === "image") return true;
  if (p.type === "file") {
    const mime = p.mime as string | undefined;
    if (mime?.startsWith("image/")) return true;
    const filename = p.filename as string | undefined;
    const name = p.name as string | undefined;
    const fileName = filename ?? name;
    if (
      fileName &&
      /\.(png|jpg|jpeg|gif|bmp|webp|svg|ico|tiff?|heic)$/i.test(fileName)
    )
      return true;
  }
  return false;
}

// --- Decoding ---

function decodeDataUrl(url: string): { mime: string; data: Buffer } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: Buffer.from(match[2], "base64") };
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/heic": ".heic",
  };
  return map[mime] ?? ".png";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}

// --- Cleanup ---

function cleanupOldFiles(dir: string): void {
  const now = Date.now();
  const lastCleanup = lastCleanupByDir.get(dir) ?? 0;
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanupByDir.set(dir, now);

  if (!existsSync(dir)) return;

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fp = join(dir, entry.name);
      if (entry.isDirectory()) {
        cleanupOldFiles(fp);
      } else {
        try {
          if (now - statSync(fp).mtimeMs > MAX_FILE_AGE) {
            unlinkSync(fp);
          }
        } catch (err) {
          log(`file cleanup failed: ${String(err)}`);
        }
      }
    }
  } catch (err) {
    log(`directory scan failed: ${String(err)}`);
  }
}

// --- Main handlers ---
export default {
  "chat.message": async (input: { sessionID: string; message: { parts?: ImagePart[] } }, output: { message: string }) => {
    const parts = input.message?.parts || [];
    const imageParts = parts.filter(isImagePart);

    if (imageParts.length === 0) return;

    // Create session-specific directory
    const sessionDir = join(IMAGE_DIR, input.sessionID || "default");
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    log(`Processing ${imageParts.length} image(s) for session ${input.sessionID}`);

    for (let i = 0; i < imageParts.length; i++) {
      const part = imageParts[i];
      let imageData: Buffer | null = null;
      let mimeType = "image/png";

      // Decode from data URL
      if (part.url && part.url.startsWith("data:")) {
        const decoded = decodeDataUrl(part.url);
        if (decoded) {
          imageData = decoded.data;
          mimeType = decoded.mime;
        }
      }

      if (!imageData) continue;
      if (imageData.length > MAX_FILE_SIZE) {
        log(`Skipping image ${i}: too large (${imageData.length} bytes)`);
        continue;
      }

      // Build filename
      const ext = extFromMime(mimeType);
      const timestamp = Date.now();
      const filename = sanitizeFilename(`img_${timestamp}_${i}${ext}`);
      const filepath = join(sessionDir, filename);

      try {
        writeFileSync(filepath, imageData);
        log(`Saved image to ${filepath} (${imageData.length} bytes)`);
      } catch (err) {
        log(`Failed to save image: ${String(err)}`);
      }
    }

    // Cleanup old images
    cleanupOldFiles(IMAGE_DIR);

    // Inject image path into context for agent awareness
    if (output.message) {
      output.message += `\n[Image hook: ${imageParts.length} image(s) saved to ${IMAGE_DIR}/${input.sessionID}/]`;
    }
  },

  // Session cleanup
  "session.stop": async (input: { sessionID: string }, _output: {}) => {
    const sessionDir = join(IMAGE_DIR, input.sessionID || "default");
    log(`Session stop: cleaning up ${sessionDir}`);
    cleanupOldFiles(sessionDir);
  },
};
