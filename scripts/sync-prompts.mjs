#!/usr/bin/env bun
/**
 * Synchronize skill files to reference centralized prompts.
 * Usage: bun scripts/sync-prompts.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOME = process.env.HOME || '/home/murat';
const SKILLS_DIR = resolve(HOME, '.local/share/mimocode/skills-native');

const AGENTS = ['librarian', 'fixer', 'observer', 'explorer', 'designer', 'council'];

for (const name of AGENTS) {
  const path = resolve(SKILLS_DIR, `${name}.md`);
  try {
    const content = readFileSync(path, 'utf8');
    
    if (!content.includes('Prompt Template') && !content.includes('## Prompt Configuration')) {
      console.log(`⏭️  ${name} — no prompt section`);
      continue;
    }
    
    // Only replace if still has inline template
    if (!content.includes('Prompt Template\n\n```')) {
      console.log(`ℹ️  ${name} — already centralized`);
      continue;
    }
    
    const newContent = content.replace(
      /## Prompt Template\n\n`[\s\S]*?`\n/,
      `## Prompt Configuration\n\nFull system prompt defined centrally in \`agent-prompts.json\`: \`agents.${name}\`.\nLoad via: \`bun scripts/prompt-loader.mjs ${name} "question"\`\n\n`
    );
    
    if (newContent !== content) {
      writeFileSync(path, newContent, 'utf8');
      console.log(`✅ ${name} — centralized prompt`);
    }
  } catch (e) {
    console.error(`❌ ${name} — ${e.message}`);
  }
}

console.log('Done!');
