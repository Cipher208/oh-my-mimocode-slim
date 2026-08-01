#!/usr/bin/env bun
/**
 * Prompt loader for MiMoCode agent skills.
 * Loads centralized prompts from agent-prompts.json.
 *
 * Supports prompt inheritance: base + custom + append pattern.
 *
 * Usage:
 *   bun scripts/prompt-loader.mjs <agent-name> "<question>" [--custom="override"] [--append="extra"]
 *   bun scripts/prompt-loader.mjs --list
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROMPTS_FILE = resolve(import.meta.dirname, '..', 'agent-prompts.json');

function loadPrompts() {
  try {
    const content = readFileSync(PROMPTS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to load prompts from ${PROMPTS_FILE}:`, e.message);
    process.exit(1);
  }
}

/**
 * Prompt inheritance resolution (matches openagent resolvePrompt pattern):
 * 1. customPrompt replaces base entirely
 * 2. customAppend is appended after whichever base won
 */
function getPrompt(agentName, userQuestion, customPrompt = "", customAppend = "") {
  const prompts = loadPrompts();
  const agent = prompts.agents[agentName];

  if (!agent) {
    console.error(`Unknown agent: ${agentName}`);
    console.error(`Available: ${Object.keys(prompts.agents).join(', ')}`);
    process.exit(1);
  }

  // Resolve base: customPrompt overrides, otherwise use agent.base
  const effectiveBase = customPrompt && customPrompt.trim() !== "" ? customPrompt : agent.base;

  // Build final prompt: base + question + append
  let resolvedPrompt = effectiveBase;

  // Handle question insertion — use {question} placeholder or append
  if (resolvedPrompt.includes('{question}')) {
    resolvedPrompt = resolvedPrompt.replace(/{question}/g, userQuestion);
  } else {
    resolvedPrompt = `${resolvedPrompt}\n${userQuestion}`;
  }

  // Append custom text after base
  if (agent.append) {
    resolvedPrompt += agent.append;
  }

  if (customAppend && customAppend.trim() !== "") {
    resolvedPrompt += `\n${customAppend}`;
  }

  return {
    prompt: resolvedPrompt,
    temperature: agent.temperature,
    tools: agent.tools,
    style: agent.style
  };
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list') {
    const prompts = loadPrompts();
    console.log('Available agents:');
    for (const [name, config] of Object.entries(prompts.agents)) {
      console.log(`  ${name}: temp=${config.temperature}, tools=[${config.tools.join(',')}]`);
    }
    return;
  }

  const agentName = args[0];
  const question = args[1] || "";

  if (!agentName || !question) {
    console.log('Usage: bun scripts/prompt-loader.mjs <agent> "<question>" [--custom="..."] [--append="..."]');
    console.log('       bun scripts/prompt-loader.mjs --list');
    process.exit(1);
  }

  // Parse optional flags
  let customPrompt = "";
  let customAppend = "";
  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--custom=')) customPrompt = args[i].slice(9);
    if (args[i].startsWith('--append=')) customAppend = args[i].slice(9);
  }

  const result = getPrompt(agentName, question, customPrompt, customAppend);
  console.log(JSON.stringify(result, null, 2));
}

main();

export { getPrompt, loadPrompts };
