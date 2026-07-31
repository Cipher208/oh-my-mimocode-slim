#!/usr/bin/env bun
/**
 * Prompt loader for MiMoCode agent skills.
 * Loads centralized prompts from agent-prompts.json.
 * 
 * Usage:
 *   bun scripts/prompt-loader.mjs oracle "What is the meaning of life?"
 *   bun scripts/prompt-loader.mjs --list
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROMPTS_FILE = resolve(process.argv[1] ? resolve(__dirname, '..', 'agent-prompts.json') : 'agent-prompts.json');

function loadPrompts() {
  try {
    const content = readFileSync(PROMPTS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to load prompts from ${PROMPTS_FILE}:`, e.message);
    process.exit(1);
  }
}

function getPrompt(agentName, userQuestion, style = 'default') {
  const prompts = loadPrompts();
  const agent = prompts.agents[agentName];
  
  if (!agent) {
    console.error(`Unknown agent: ${agentName}`);
    console.error(`Available: ${Object.keys(prompts.agents).join(', ')}`);
    process.exit(1);
  }
  
  // Build full prompt: base + user question + append
  let fullPrompt = agent.base + userQuestion;
  
  if (agent.append) {
    fullPrompt += agent.append;
  }
  
  return {
    prompt: fullPrompt,
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
  const question = args.slice(1).join(' ');
  
  if (!agentName || !question) {
    console.log('Usage: bun scripts/prompt-loader.mjs <agent-name> "<question>"');
    console.log('       bun scripts/prompt-loader.mjs --list');
    process.exit(1);
  }
  
  const result = getPrompt(agentName, question);
  console.log(JSON.stringify(result, null, 2));
}

main();
