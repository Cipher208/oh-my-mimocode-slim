# oh-my-mimocode-slim

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MiMoCode](https://img.shields.io/badge/MiMoCode-%3E%3D0.38.0-blue.svg)](https://github.com/nicepkg/mimocode)

> Multi-agent orchestration patterns for MiMoCode — adapted from oh-my-opencode-slim (7.3k ⭐).

Delegation rules, loop engineering, model failover, and error recovery — all via MiMoCode file hooks and compose skills.

## Quick Start

```bash
git clone https://github.com/Cipher208/oh-my-mimocode-slim.git /tmp/oh-my-mimocode-slim
cp /tmp/oh-my-mimocode-slim/hooks/*.ts ~/.config/mimocode/hooks/
cp /tmp/oh-my-mimocode-slim/skills/*.md ~/.local/share/mimocode/skills-native/
```

Restart MiMoCode. Done.

## Features

### Skills (6)

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **orchestrator-routing** | Task delegation rules | Complex tasks needing specialization |
| **loop-engineering** | Execute-verify loops | Iterative tasks with success criteria |
| **codemap** | Codebase structure mapping | Understanding new codebases |
| **reflect** | Session review | After complex tasks |
| **simplify** | Code simplification | Code is too complex |
| **verification-planning** | Pre-implementation planning | Before any implementation |

### Hooks (4)

| Hook | Purpose | When it fires |
|------|---------|---------------|
| **json-recovery** | Error recovery hints | After tool execution |
| **model-failover** | Rate-limit suggestions | After LLM step |
| **delegate-task-retry** | Delegation error recovery | After actor/subagent |
| **phase-reminder** | Workflow discipline | Before every LLM call |

## Orchestrator Routing

Automatic task delegation based on what the task needs:

| Task Type | Delegate To | When |
|-----------|-------------|------|
| Codebase search | `fan-method` skill | Need to discover what exists |
| External docs | `deep-research`, `agent-reach` | Library APIs, version-specific |
| Architecture review | `software-architect` | Major decisions, debugging |
| UI/UX work | `frontend-design`, `product-design` | User-facing interfaces |
| Implementation | `senior-python`, `senior-systems` | Bounded, well-defined tasks |

## Loop Engineering

Execute-verify loops with configurable success criteria:

```
1. Execute: Run the task
2. Verify: Check success criteria
3. If pass: Done
4. If fail: Analyze, fix, retry
5. Max attempts reached: Escalate
```

## Installation Options

### Full install (all features)

```bash
cp /tmp/oh-my-mimocode-slim/hooks/*.ts ~/.config/mimocode/hooks/
cp /tmp/oh-my-mimocode-slim/skills/*.md ~/.local/share/mimocode/skills-native/
```

### Selective install

Pick what you need:
- `hooks/orchestrator-routing.md` — delegation rules
- `hooks/loop-engineering.md` — iterative tasks
- `hooks/json-recovery.ts` — error hints
- `hooks/model-failover.ts` — rate limit handling

## Architecture

See [docs/architecture.md](docs/architecture.md) for details on how hooks and skills work.

## Based on

- [alvinunreal/oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) (7.3k ⭐) — orchestrator, agents, tools
- [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) (66.5k ⭐) — ultrawork, team mode concepts
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — YAGNI lazy coding

## License

MIT
