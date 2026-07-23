# Architecture

## How oh-my-mimocode-slim works

oh-my-mimocode-slim uses MiMoCode's file hooks system to provide multi-agent orchestration patterns.

### Hook System

MiMoCode loads `.ts` and `.js` files from `~/.config/mimocode/hooks/`. Each file exports a default object with hook handlers.

### Available Hooks

| Hook | When it fires | What it does |
|------|---------------|--------------|
| `experimental.chat.system.transform` | Before every LLM call | Injects context into system prompt |
| `tool.execute.before` | Before tool execution | Intercepts and modifies tool calls |
| `tool.execute.after` | After tool execution | Post-processes tool output |
| `session.userQuery.post` | After each LLM step | Triggers idle verification |
| `shell.env` | Before shell commands | Injects environment variables |

### Skill System

MiMoCode loads `.md` files from `~/.local/share/mimocode/skills-native/`. Each skill provides domain-specific instructions.

### File Structure

```
~/.config/mimocode/
├── hooks/
│   ├── json-recovery.ts      # Error recovery
│   ├── model-failover.ts     # Rate limit handling
│   ├── delegate-task-retry.ts # Task delegation errors
│   ├── phase-reminder.ts     # Workflow discipline
│   └── plusplus.ts           # (from mimocode-plusplus)
├── ponytail/
│   └── skills/               # (from mimocode-ponytail)
└── mimocode.json             # MiMoCode config

~/.local/share/mimocode/skills-native/
├── orchestrator-routing.md   # Task delegation rules
├── loop-engineering.md       # Execute-verify loops
├── codemap.md                # Codebase mapping
├── reflect.md                # Session reflection
├── simplify.md               # Code simplification
└── verification-planning.md  # Pre-implementation planning
```
