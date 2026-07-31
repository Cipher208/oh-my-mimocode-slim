#!/usr/bin/env bun
/**
 * Add centralized prompt config reference to skill files that don't have it.
 * Inserts before "## Integration" section.
 */

const HOME = process.env.HOME || '/home/murat';
const SKILLS_DIR = `${HOME}/.local/share/mimocode/skills-native`;

const SKILLS = ['librarian', 'fixer', 'observer', 'explorer', 'designer', 'council'];
let added = 0;

for (const skill of SKILLS) {
  const path = `${SKILLS_DIR}/${skill}.md`;
  const fs = await import('node:fs');
  const content = fs.readFileSync(path, 'utf8');
  
  if (content.includes('Prompt Configuration')) {
    console.log(`⏭️  ${skill} — already has config`);
    continue;
  }
  
  // Insert before ## Integration section
  const newContent = content.replace(
    '## Integration',
    `## Prompt Configuration\n\nFull system prompt defined centrally in \`agent-prompts.json\`: \`agents.${skill}\`.\nLoad via: \`bun scripts/prompt-loader.mjs ${skill} "question"\`\n\n## Integration`
  );
  
  if (newContent !== content) {
    fs.writeFileSync(path, newContent, 'utf8');
    console.log(`✅ ${skill} — added prompt config reference`);
    added++;
  }
}

console.log(`\nDone! Added to ${added} skills.`);
