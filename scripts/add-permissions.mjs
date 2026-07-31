#!/usr/bin/env bun
/**
 * Add structured permissions to skill frontmatter.
 * Maps skill capabilities → permission templates.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SKILLS_DIR = process.argv[2] || '../skills-native';

const PERMISSION_PROFILES = {
  readonly: `
permissions:
  readonly: true
  allow: [read, grep, glob, codesearch, webfetch]
  deny: [edit, write, apply_patch, bash, task, question]
  temperature: 0.1`,
  
  research: `
permissions:
  readonly: true
  allow: [read, grep, glob, agent-reach, webfetch]
  deny: [edit, write, bash, task]
  temperature: 0.3`,
  
  implementation: `
permissions:
  readonly: false
  allow: [read, grep, glob, edit, write, bash, test]
  deny: [task, question]
  temperature: 0.1`,
  
  vision: `
permissions:
  readonly: true
  allow: [read, grep, vision, webfetch]
  deny: [edit, write, bash, task]
  temperature: 0.5`,
  
  design: `
permissions:
  readonly: false
  allow: [read, write, edit, web]
  deny: [bash, task, question]
  temperature: 0.5`,
  
  consensus: `
permissions:
  readonly: true
  allow: []
  deny: ["*"]
  temperature: 0.2`
};

const SKILL_PERMISSIONS = {
  oracle: 'readonly',
  librarian: 'research',
  explorer: 'readonly',
  fixer: 'implementation',
  observer: 'vision',
  designer: 'design',
  council: 'consensus'
};

const files = await readdir(SKILLS_DIR);
const mdFiles = files.filter(f => f.endsWith('.md'));

for (const file of mdFiles) {
  const skillName = file.replace('.md', '');
  const permissionType = SKILL_PERMISSIONS[skillName];
  
  if (!permissionType) continue;
  
  const path = join(SKILLS_DIR, file);
  const content = await readFile(path, 'utf8');
  
  // Skip if already has permissions
  if (content.includes('permissions:')) continue;
  
  const permissionBlock = PERMISSION_PROFILES[permissionType];
  if (!permissionBlock) continue;
  
  // Insert after description line
  const lines = content.split('\n');
  let insertAfter = 1;
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].startsWith('description:')) {
      insertAfter = i + 1;
      break;
    }
  }
  
  lines.splice(insertAfter, 0, permissionBlock.trim());
  await writeFile(path, lines.join('\n'), 'utf8');
  console.log(`✅ Added permissions to ${file} (${permissionType})`);
}

console.log('\nDone!');
