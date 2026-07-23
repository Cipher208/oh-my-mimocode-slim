---
name: codemap
description: >
  Generate hierarchical codebase maps. Use when you need to understand the
  structure of a codebase before making changes.
argument-hint: "[directory]"
---

# Codemap

Generate a hierarchical codebase map showing structure, dependencies, and key files.

## Process

1. Scan the target directory (default: current working directory)
2. Identify file types and their purposes
3. Map dependencies between files
4. Generate a tree structure with annotations

## Output Format

```
project/
├── src/
│   ├── main.ts          # Entry point
│   ├── utils/
│   │   ├── helpers.ts   # Utility functions
│   │   └── types.ts     # Type definitions
│   └── core/
│       └── engine.ts    # Core logic
├── tests/
│   └── main.test.ts     # Tests
└── package.json         # Dependencies
```

## Usage

When facing a new codebase or module:
- Run this skill first to understand structure
- Use the map to identify which files to read
- Focus on high-dependency files (imported by many others)

## Anti-patterns

- Don't try to map everything at once — focus on the area you need to change
- Don't skip this for unfamiliar codebases — 30 seconds of mapping saves 30 minutes of confusion
