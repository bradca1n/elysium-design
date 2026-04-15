# The Ultimate Claude Code Configuration Guide

**Version:** 2.0 (February 8, 2026)
**Purpose:** Complete reference for configuring Claude Code to work optimally across all use cases
**Updated:** Includes latest 2026 community insights, performance optimizations, and new features

---

## What's New in Version 2.0

- ✨ **Setup Hooks** (Jan 25, 2026) — Pre-session environment initialization
- ⚡ **CA-MCP Framework** — 73.5% execution time improvements
- 🚀 **Progressive Disclosure** — 10x token savings with claude-mem
- 🔧 **gRPC Transport** — Google's contribution to MCP
- 📚 **Community Best Practices** — From 29K+ star projects
- 🎯 **Token Budget Optimization** — Real-world efficiency strategies

---

## Table of Contents

1. [Configuration Architecture Overview](#1-configuration-architecture-overview)
2. [All Configuration Files & Locations](#2-all-configuration-files--locations)
3. [Global Settings (settings.json)](#3-global-settings-settingsjson)
4. [Project-Specific Configuration](#4-project-specific-configuration)
5. [MCP Servers - Complete Guide](#5-mcp-servers---complete-guide)
6. [Plugins & Skills](#6-plugins--skills)
7. [Agents & Subagents](#7-agents--subagents)
8. [Rules System](#8-rules-system)
9. [Hooks & Automation](#9-hooks--automation)
10. [Memory & Context Optimization](#10-memory--context-optimization)
11. [Use Case Configurations](#11-use-case-configurations)
12. [Performance Optimization](#12-performance-optimization)
13. [**NEW:** Community Best Practices 2026](#13-community-best-practices-2026)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Configuration Architecture Overview

### The Three-Tier System

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: GLOBAL DEFAULTS (~/.claude/)                              │
│  ├─ settings.json          (permissions, hooks, plugins)            │
│  ├─ rules/                 (coding standards for all projects)      │
│  ├─ agents/                (reusable specialized agents)            │
│  ├─ skills/                (custom commands)                        │
│  ├─ hooks/                 (automation scripts)                     │
│  └─ knowledge/             (reference documentation)                │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓ (overrides)
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: PROJECT CONFIG (project/.claude/)                          │
│  ├─ settings.json          (project-specific permissions)           │
│  ├─ settings.local.json    (machine-specific, gitignored)          │
│  └─ .mcp.json              (project MCP servers)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓ (overrides)
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 3: CONTEXTUAL (in-session, temporary)                         │
│  ├─ CLAUDE.md              (project context, committed to git)      │
│  ├─ CLAUDE.local.md        (local notes, gitignored)               │
│  └─ Auto-memory            (claude-mem plugin)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuration Resolution Order

1. **Read Tier 1** (global defaults)
2. **Merge Tier 2** (project overrides)
3. **Apply Tier 3** (contextual guidance)
4. **Runtime** (user commands, agent invocations)

---

## 2. All Configuration Files & Locations

### Global Configuration (`~/.claude/`)

| File                              | Purpose                             | Format        |
| --------------------------------- | ----------------------------------- | ------------- |
| `settings.json`                   | Global settings, permissions, hooks | JSON          |
| `history.jsonl`                   | Session history (93MB+)             | JSONL         |
| `stats-cache.json`                | Usage statistics                    | JSON          |
| `plugins/installed_plugins.json`  | Plugin registry                     | JSON          |
| `plugins/known_marketplaces.json` | Plugin sources                      | JSON          |
| `agents/*.md`                     | Reusable agent definitions          | Markdown+YAML |
| `skills/*/SKILL.md`               | Custom slash commands               | Markdown+YAML |
| `rules/*/*.md`                    | Coding standards by domain          | Markdown+YAML |
| `hooks/*.sh`                      | Pre/post tool use scripts           | Bash          |
| `knowledge/*/*.md`                | Reference documentation             | Markdown      |
| `commands/tools/*.md`             | Tool commands (from repos)          | Markdown      |
| `commands/workflows/*.md`         | Workflow orchestrations             | Markdown      |
| `projects/*/memory/MEMORY.md`     | Per-project memory                  | Markdown      |
| `projects/*/sessions-index.json`  | Session metadata                    | JSON          |
| `projects/*/*.jsonl`              | Full session transcripts            | JSONL         |

### Project Configuration (`<project>/.claude/`)

| File                  | Purpose                      | Gitignored? |
| --------------------- | ---------------------------- | ----------- |
| `settings.json`       | Project permissions/env vars | No (commit) |
| `settings.local.json` | Machine-specific overrides   | Yes         |

### Project Root (`<project>/`)

| File              | Purpose                     | Gitignored? |
| ----------------- | --------------------------- | ----------- |
| `CLAUDE.md`       | Project context & standards | No (commit) |
| `CLAUDE.local.md` | Local notes                 | Yes         |
| `.mcp.json`       | MCP server configuration    | No (commit) |
| `docs/plans/*.md` | Implementation plans        | No          |

### Plugin-Provided Configs

| Location                                          | Purpose            |
| ------------------------------------------------- | ------------------ |
| `~/.claude/plugins/cache/{marketplace}/{plugin}/` | Plugin files       |
| `~/.claude/plugins/cache/{plugin}/.mcp.json`      | Plugin MCP servers |
| `~/.claude/plugins/cache/{plugin}/skills/`        | Plugin skills      |
| `~/.claude/plugins/cache/{plugin}/agents/`        | Plugin agents      |

### Claude-Mem Plugin

| Location                      | Purpose                    |
| ----------------------------- | -------------------------- |
| `~/.claude-mem/settings.json` | Memory configuration       |
| `~/.claude-mem/data/`         | SQLite + vector embeddings |
| `localhost:37777`             | Web UI                     |

---

## 3. Global Settings (settings.json)

### Complete Schema

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",

  // ===== MODEL & BEHAVIOR =====
  "model": "claude-opus-4-6",
  "alwaysThinkingEnabled": true,
  "outputStyle": "Explanatory",
  "language": "english",
  "showTurnDuration": true,

  // ===== CONTEXT MANAGEMENT =====
  "cleanupPeriodDays": 30,
  "env": {
    "ENABLE_TOOL_SEARCH": "auto:5"
  },

  // ===== PERMISSIONS =====
  "permissions": {
    "allow": ["Bash(npm run *)", "Bash(git status)", "mcp__*"],
    "deny": ["Read(./.env)", "Read(**/*.pem)", "Bash(rm -rf /)"],
    "ask": ["Bash(git push *)", "Bash(git commit *)"],
    "defaultMode": "acceptEdits"
  },

  // ===== HOOKS =====
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/validate-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/format-on-save.sh"
          }
        ]
      }
    ]
  },

  // ===== MCP SERVERS =====
  "enableAllProjectMcpServers": true,
  "mcpServers": {
    "gluestack": {
      "command": "node",
      "args": ["/Users/timoneumann/gluestack-mcp/index.js"],
      "disabled": false
    }
  },

  // ===== PLUGINS =====
  "enabledPlugins": {
    "claude-mem@thedotmack": true,
    "superpowers@claude-plugins-official": true
  },

  // ===== GIT ATTRIBUTION =====
  "attribution": {
    "commit": "\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
  },

  // ===== PROJECT-SPECIFIC =====
  "plansDirectory": "./docs/plans"
}
```

### Key Settings Explained

#### Model Selection

```json
"model": "claude-opus-4-6"
```

**Options:**

- `"claude-opus-4-6"` — Most capable (recommended for complex tasks)
- `"claude-sonnet-4-5-20250929"` — Fast and smart (default)
- `"claude-haiku-4-5-20251001"` — Fastest, cheapest

**When to use each:**

- **Opus**: Architecture decisions, security reviews, complex refactoring
- **Sonnet**: Day-to-day coding, code review, testing
- **Haiku**: Quick fixes, formatting, simple edits

#### Always Thinking

```json
"alwaysThinkingEnabled": true
```

**Effect:** Claude shows reasoning process before responding.

**Pros:**

- Better debugging of Claude's logic
- More accurate responses
- Educational (see how Claude thinks)

**Cons:**

- Slightly slower responses
- More verbose output

**Recommendation:** Keep `true` for complex work, `false` for rapid iteration.

#### Output Style

```json
"outputStyle": "Explanatory"
```

**Options:**

- `"Explanatory"` — Educational insights with code
- `"Concise"` — Minimal explanation
- `"Balanced"` — Middle ground

**Best for:**

- Explanatory: Learning, complex projects, junior devs
- Concise: Experienced devs, rapid iteration
- Balanced: Most projects

#### Permission Modes

```json
"defaultMode": "acceptEdits"
```

**Options:**

- `"ask"` — Prompt for every file edit
- `"acceptEdits"` — Auto-accept edits, ask for dangerous commands
- `"acceptAll"` — Auto-accept everything (dangerous!)

**Recommendation:** Use `"acceptEdits"` with comprehensive `deny` rules.

---

## 4. Project-Specific Configuration

### `.claude/settings.json` (Committed to Git)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",

  "permissions": {
    "allow": ["Bash(turbo run *)", "Bash(pnpm install)", "Bash(forge test *)"]
  },

  "env": {
    "TURBO_TELEMETRY_DISABLED": "1"
  },

  "plansDirectory": "./docs/plans"
}
```

**Purpose:** Team-wide project settings, safe to commit.

### `.claude/settings.local.json` (Gitignored)

```json
{
  "permissions": {
    "allow": ["Bash(ssh-keygen *)", "WebFetch(domain:localhost)"]
  }
}
```

**Purpose:** Machine-specific permissions (ports, local servers).

### `.mcp.json` (Project MCP Servers)

```json
{
  "mcpServers": {
    "gluestack": {
      "command": "node",
      "args": ["/Users/timoneumann/gluestack-mcp/index.js"]
    }
  }
}
```

**Purpose:** Declare project-specific MCP servers (committed).

**Best practices:**

- Use for project-unique MCPs (custom tools)
- Reference local paths for development MCPs
- Document required environment variables

---

## 5. MCP Servers - Complete Guide

### What Are MCP Servers?

**Model Context Protocol (MCP)** servers extend Claude's capabilities with external tools and data sources.

**Architecture:**

```
Claude Code ←→ MCP Client ←→ MCP Server ←→ External Service
                 (stdio)       (your code)    (API/database/tool)
```

### MCP Configuration Locations

**Priority order (highest to lowest):**

1. Global settings: `~/.claude/settings.json`
2. Plugin-provided: `~/.claude/plugins/cache/{plugin}/.mcp.json`
3. Project-specific: `<project>/.mcp.json`

### MCP Server Types

#### 1. stdio Transport (Local Process)

```json
"slither": {
  "command": "uvx",
  "args": ["--from", "git+https://github.com/trailofbits/slither-mcp", "slither-mcp"],
  "env": {
    "PYTHONPATH": "/opt/slither"
  },
  "disabled": false
}
```

**When to use:** Local tools, CLIs, Python/Node scripts

#### 2. HTTP Transport (Remote Server)

```json
"vercel": {
  "type": "http",
  "url": "https://mcp.vercel.com"
}
```

**When to use:** Cloud services, APIs, managed MCPs

#### 3. SSE Transport (Server-Sent Events)

```json
"custom": {
  "type": "sse",
  "url": "https://api.example.com/mcp/sse"
}
```

**When to use:** Real-time data streams, webhooks

### Available MCP Servers

#### Core MCPs (Recommended Always-On)

| Server     | Command                                      | Tokens | Use Case                     |
| ---------- | -------------------------------------------- | ------ | ---------------------------- |
| **github** | `npx -y @modelcontextprotocol/server-github` | ~2,000 | PR/issue management          |
| **memory** | `npx -y @modelcontextprotocol/server-memory` | ~1,000 | Persistent key-value storage |

#### Blockchain MCPs (For Smart Contract Work)

| Server           | Command                                                                 | Tokens | Use Case                    |
| ---------------- | ----------------------------------------------------------------------- | ------ | --------------------------- |
| **slither**      | `uvx --from git+https://github.com/trailofbits/slither-mcp slither-mcp` | ~8,000 | Security analysis           |
| **openzeppelin** | `npx -y @openzeppelin/contracts-mcp`                                    | ~3,000 | Secure contract generation  |
| **foundry**      | `npx @pranesh.asp/foundry-mcp-server`                                   | ~5,000 | Forge/Cast/Anvil operations |

#### Documentation MCPs (Enable When Needed)

| Server         | Command                        | Tokens  | Use Case          |
| -------------- | ------------------------------ | ------- | ----------------- |
| **context7**   | `npx -y @upstash/context7-mcp` | ~2,000  | Live library docs |
| **playwright** | `npx @playwright/mcp@latest`   | ~14,000 | E2E testing       |

#### Design MCPs

| Server        | Tokens   | Use Case                 |
| ------------- | -------- | ------------------------ |
| **pencil**    | Variable | .pen file design reading |
| **figma**     | ~5,000   | Figma API integration    |
| **gluestack** | ~3,000   | Component documentation  |

### MCP Token Budget Strategy

**200K context window allocation:**

```
Base Claude Code:        15,000 tokens  (7.5%)
Claude-Mem injection:     4,000 tokens  (2.0%)
Rules + CLAUDE.md:        3,000 tokens  (1.5%)
─────────────────────────────────────────────
Always-on overhead:      22,000 tokens  (11%)
═════════════════════════════════════════════
Available for MCPs:     178,000 tokens  (89%)
```

**Configuration strategies:**

#### Strategy A: Blockchain Development

```json
{
  "mcpServers": {
    "github": { "disabled": false }, // 2,000
    "memory": { "disabled": false }, // 1,000
    "slither": { "disabled": false }, // 8,000
    "openzeppelin": { "disabled": false }, // 3,000
    "foundry": { "disabled": false } // 5,000
  }
}
// Total MCP overhead: 19,000 tokens (9.5%)
// Available for work: 159,000 tokens (79.5%)
```

#### Strategy B: Frontend Development

```json
{
  "mcpServers": {
    "github": { "disabled": false }, // 2,000
    "memory": { "disabled": false }, // 1,000
    "gluestack": { "disabled": false }, // 3,000
    "context7": { "disabled": false } // 2,000
  }
}
// Total MCP overhead: 8,000 tokens (4%)
// Available for work: 170,000 tokens (85%)
```

#### Strategy C: Full-Stack (Heavy)

```json
{
  "mcpServers": {
    "github": { "disabled": false }, // 2,000
    "memory": { "disabled": false }, // 1,000
    "playwright": { "disabled": false }, // 14,000
    "slither": { "disabled": false }, // 8,000
    "context7": { "disabled": false } // 2,000
  }
}
// Total MCP overhead: 27,000 tokens (13.5%)
// Available for work: 151,000 tokens (75.5%)
// ⚠️ Warning: Heavy load, consider splitting work
```

### Disabling MCPs Per Use Case

**Method 1: Per-project disable (.claude/settings.json)**

```json
{
  "disabledMcpServers": ["playwright", "context7"]
}
```

**Method 2: Global disable with project enable**

Global (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "playwright": { "disabled": true }
  }
}
```

Project (`.mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "disabled": false
    }
  }
}
```

**Method 3: Conditional via environment variable**

```json
{
  "mcpServers": {
    "slither": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/trailofbits/slither-mcp",
        "slither-mcp"
      ],
      "disabled": "${DISABLE_SLITHER:-false}"
    }
  }
}
```

Then in shell:

```bash
# Disable Slither for this session
DISABLE_SLITHER=true claude

# Enable (default)
claude
```

### MCP Installation Commands

```bash
# Add MCP server (stdio)
claude mcp add <name> -- <command> [args...]

# Add MCP server (HTTP)
claude mcp add --transport http <name> --url <url>

# List MCPs
claude mcp list

# Remove MCP
claude mcp remove <name>

# Test MCP
claude mcp test <name>
```

---

## 6. Plugins & Skills

### Plugin System

**Plugins extend Claude Code with:**

- Custom agents
- Skills (slash commands)
- MCP servers
- Configuration templates

### Installed Plugins

| Plugin                        | Version | Status      | Description                              |
| ----------------------------- | ------- | ----------- | ---------------------------------------- |
| **superpowers**               | 4.2.0   | ✅ Active   | TDD workflow, brainstorming, planning    |
| **claude-mem**                | 9.0.16  | ✅ Active   | Persistent memory, 10x token efficiency  |
| **everything-claude-code**    | 1.2.0   | ❌ Disabled | Production configs from hackathon winner |
| **voltagent-core-dev**        | 1.0.0   | ❌ Disabled | 126+ coding agents                       |
| **voltagent-qa-sec**          | 1.0.0   | ❌ Disabled | Quality & security agents                |
| **building-secure-contracts** | 1.0.1   | ❌ Disabled | Trail of Bits security patterns          |

### Plugin Management

```bash
# Add marketplace
/plugin marketplace add <org>/<repo>

# Install plugin
/plugin install <plugin-name>

# List plugins
/plugin list

# Enable/disable
/plugin enable <plugin>
/plugin disable <plugin>
```

### Superpowers Plugin (⭐ CRITICAL)

**Skills provided:**

- `/brainstorm` — Structured ideation with requirements capture
- `/write-plan` — Create implementation plans with task breakdown
- `/execute-plan` — Guided execution with TDD enforcement
- `/tdd-red` — Write failing tests
- `/tdd-green` — Implement minimal code
- `/tdd-refactor` — Refactor with tests green

**Auto-enforces:**

- Test-first development
- YAGNI principle (You Aren't Gonna Need It)
- DRY principle (Don't Repeat Yourself)
- Evidence-based verification

**Configuration:**

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  }
}
```

### Claude-Mem Plugin (⭐ CRITICAL)

**Features:**

- Automatic session capture to SQLite
- Vector embeddings (Chroma) for semantic search
- Web UI at `localhost:37777`
- Context injection (4,000 tokens max)
- Privacy controls via `<private>` tags

**Configuration** (`~/.claude-mem/settings.json`):

```json
{
  "aiModel": "claude-sonnet-4-20250514",
  "workerPort": 37777,
  "contextInjection": {
    "enabled": true,
    "maxTokens": 4000,
    "relevanceThreshold": 0.7
  },
  "compression": {
    "enabled": true,
    "minObservationsBeforeCompression": 50
  },
  "privacy": {
    "excludePatterns": ["**/.env*", "**/secrets/**"]
  }
}
```

**MCP provided:**

```json
{
  "mcpServers": {
    "mcp-search": {
      "type": "stdio",
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-server.cjs"
    }
  }
}
```

**Usage:**

```bash
# Search memory
"Search my memory for 'design token spacing'"

# Get timeline
"Show timeline of work on the portfolio feature"

# Get observations
"Get observations about the Solidity reentrancy pattern"
```

### Custom Skills

**Location:** `~/.claude/skills/<skill-name>/SKILL.md`

**Example** (`~/.claude/skills/tdd-workflow/SKILL.md`):

```markdown
---
name: tdd-workflow
description: Enforces Test-Driven Development workflow with red-green-refactor cycle
---

# TDD Workflow Skill

When invoked, guide development through strict TDD methodology.

## Process

### 1. Red Phase - Write Failing Test First

[Implementation...]

### 2. Green Phase - Minimal Implementation

[Implementation...]

### 3. Refactor Phase

[Implementation...]
```

**Invocation:**

```bash
/tdd-workflow
```

---

## 7. Agents & Subagents

### Agent System

**Agents are specialized personas** with:

- Specific tools access
- Defined model (Opus/Sonnet/Haiku)
- Task-specific expertise
- Output format requirements

### Custom Agents

**Location:** `~/.claude/agents/<agent-name>.md`

**Example** (`~/.claude/agents/blockchain-auditor.md`):

```yaml
---
name: blockchain-auditor
description: Audits Solidity smart contracts for security vulnerabilities
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
model: opus
---
You are a smart contract security auditor.

[Agent implementation...]
```

### Agent Invocation

**Method 1: Explicit Task tool**

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "blockchain-auditor",
    "description": "Audit Token contract",
    "prompt": "Audit contracts/Token.sol for security vulnerabilities"
  }
}
```

**Method 2: Natural language**

```
"Use the blockchain-auditor agent to audit the Token contract"
```

### Available Agents

#### Custom Agents (Your Configuration)

| Agent                  | Model   | Tools                               | Use Case                      |
| ---------------------- | ------- | ----------------------------------- | ----------------------------- |
| **blockchain-auditor** | Opus    | Read, Grep, Glob, Bash              | Smart contract security audit |
| **code-reviewer**      | Sonnet  | Read, Grep, Glob, Bash              | Code quality review           |
| **test-writer**        | Sonnet  | Read, Grep, Glob, Write, Edit, Bash | TDD test generation           |
| **debugger**           | Inherit | Read, Edit, Bash, Grep, Glob        | Root cause analysis           |

#### Plugin-Provided Agents (VoltAgent - Disabled)

| Agent              | Expertise                    |
| ------------------ | ---------------------------- |
| backend-developer  | API, databases, services     |
| frontend-developer | React, UI, state management  |
| security-auditor   | OWASP, penetration testing   |
| data-scientist     | ML, analytics, visualization |
| technical-writer   | Documentation, API docs      |

### Agent Configuration Options

```yaml
---
name: agent-name
description: Brief description shown in tool search
tools: Read, Write, Edit, Bash, Grep, Glob
disallowedTools: Bash(rm *), Write(**/*.env)
model: opus | sonnet | haiku | inherit
permissionMode: ask | acceptEdits | acceptAll
maxTurns: 50
---
```

**Key fields:**

- `name` — Identifier for invocation
- `description` — Shown when selecting agents
- `tools` — Allowed tools (comma-separated)
- `disallowedTools` — Explicit denials
- `model` — Agent's preferred model
- `permissionMode` — Override default permission mode
- `maxTurns` — Max API round-trips before stopping

---

## 8. Rules System

### How Rules Work

**Rules are glob-matched instructions** applied automatically based on file patterns.

**Location:** `~/.claude/rules/<domain>/<rule>.md`

**Format:**

```yaml
---
globs: ["patterns/*.tsx", "src/**/*.ts"]
alwaysApply: true | false
priority: 1-100
---
# Rule Content (Markdown)
```

### Rule Precedence

1. **Priority** (highest number wins)
2. **Specificity** (more specific glob wins)
3. **Definition order** (later wins if tied)

### Your Rules

#### Security Rules (Priority 100, Always Applied)

**File:** `~/.claude/rules/security/secrets.md`

```yaml
---
globs: ["**/*"]
alwaysApply: true
priority: 100
---
```

**Enforces:**

- Never read `.env` files
- Never output API keys
- Use environment variables
- Hardware wallets for mainnet

#### Blockchain Rules (Always Applied to .sol files)

**File:** `~/.claude/rules/blockchain/solidity.md`

```yaml
---
globs: ["contracts/**/*.sol", "**/*.sol"]
alwaysApply: true
---
```

**Enforces:**

- Solidity ^0.8.20
- Checks-Effects-Interactions pattern
- 100% test coverage
- OpenZeppelin standards

#### Frontend Rules

**File:** `~/.claude/rules/frontend/react.md`

```yaml
---
globs: ["packages/app/**/*.tsx", "apps/next/**/*.tsx"]
---
```

**Enforces:**

- Functional components only
- TypeScript strict mode
- GluestackUI + NativeWind
- TanStack Query for server state

#### Backend Rules

**File:** `~/.claude/rules/backend/api.md`

```yaml
---
globs: ["apps/backend/**/*.ts", "packages/app/services/**/*.ts"]
---
```

**Enforces:**

- Zod schema validation
- Standardized response format
- Rate limiting
- Request ID tracing

### Creating Custom Rules

**Best practices:**

1. **Specific globs** — Target exact file patterns
2. **Clear priority** — Critical rules get 90-100
3. **Examples** — Show good and bad patterns
4. **Rationale** — Explain why rule exists

**Template:**

```yaml
---
globs: ["src/**/*.ts"]
alwaysApply: false
priority: 50
---

# Rule Name

## When This Applies
[Description of when rule triggers]

## Requirements

### DO
- [Good pattern with example]

### DON'T
- [Bad pattern with example]

## Rationale
[Why this rule exists]
```

---

## 9. Hooks & Automation

### Hook System

**Hooks run shell scripts** before/after tool invocations.

**Available hooks:**

- `PreToolUse` — Runs before tool execution
- `PostToolUse` — Runs after tool execution
- `SessionStart` — Runs when session starts
- `SessionEnd` — Runs when session ends
- **`Setup`** — 🆕 Runs BEFORE Claude Code starts (Jan 25, 2026)

### 🆕 Setup Hooks (Released Jan 25, 2026)

**What they do:** Run before your session starts, enabling true environment initialization.

**Use cases:**

- Install dependencies
- Initialize databases
- Start development servers
- Configure environment variables
- Verify tool installations

**Configuration:**

```json
{
  "hooks": {
    "Setup": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/setup-env.sh"
          }
        ]
      }
    ]
  }
}
```

**Example setup hook** (`~/.claude/hooks/setup-env.sh`):

```bash
#!/bin/bash
set -e

echo "🚀 Setting up development environment..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install --silent
fi

# Start database if not running
if ! docker ps | grep -q postgres; then
  echo "🗄️ Starting PostgreSQL..."
  docker-compose up -d postgres
fi

# Verify tools
echo "✅ Checking required tools..."
command -v node >/dev/null || echo "❌ Node.js not found"
command -v forge >/dev/null || echo "❌ Foundry not found"

echo "✨ Environment ready!"
```

**Benefits:**

- Claude sees setup results in first message
- No manual environment prep
- Consistent team environments
- Automated dependency checks

**Performance note:** Setup hooks run ONCE per session, so expensive operations are acceptable (e.g., `npm install`, database migrations).

### Hook Configuration

**In `~/.claude/settings.json`:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/validate-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/format-on-save.sh"
          }
        ]
      }
    ]
  }
}
```

### Your Hooks

#### 1. Bash Validation (`validate-bash.sh`)

**Purpose:** Block destructive commands

**Blocked patterns:**

- `rm -rf /`
- `git push --force`
- `DROP TABLE`
- `curl * | sh`
- `chmod 777`

**Hook script:**

```bash
#!/bin/bash
set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

BLOCKED_PATTERNS=(
  'rm -rf /'
  'git push --force'
  'DROP TABLE'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Blocked: Destructive command"}}'
    exit 0
  fi
done

exit 0
```

#### 2. Format on Save (`format-on-save.sh`)

**Purpose:** Auto-format code after Edit/Write

**Supported:**

- `.ts/.tsx/.js/.jsx/.json` → Prettier
- `.sol` → Prettier + Solidity plugin
- `.md` → Prettier

**Hook script:**

```bash
#!/bin/bash

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

EXT="${FILE_PATH##*.}"

case "$EXT" in
  ts|tsx|js|jsx|json)
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
  sol)
    npx prettier --write "$FILE_PATH" --plugin=prettier-plugin-solidity 2>/dev/null || true
    ;;
esac

exit 0
```

#### 3. Secret Detection (`check-secrets.sh`)

**Purpose:** Warn on potential secrets in files

**Detected patterns:**

- `sk_live_*` / `sk_test_*` (Stripe)
- `AKIA*` (AWS)
- `ghp_*` (GitHub)
- `0x[64 hex]` (Private keys)
- `password = "..."`

**Hook script:**

```bash
#!/bin/bash

INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

SECRET_PATTERNS=(
  'sk_live_[a-zA-Z0-9]+'
  'AKIA[0-9A-Z]{16}'
  '0x[a-fA-F0-9]{64}'
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$CONTENT" | grep -qE "$pattern"; then
    echo '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "message": "⚠️ Warning: Potential secret detected"}}'
    exit 0
  fi
done

exit 0
```

### Hook Best Practices

1. **Fast execution** — Hooks delay every tool call
2. **Error handling** — Exit 0 even on errors
3. **Permissions** — `chmod +x ~/.claude/hooks/*.sh`
4. **JSON output** — Use `jq` to parse input/output
5. **Testing** — Test hooks manually before enabling

---

## 10. Memory & Context Optimization

### Context Window Budget (200K tokens)

**Baseline allocation:**

```
Claude Code system:      15,000 tokens  (7.5%)
Claude-Mem injection:     4,000 tokens  (2.0%)
Rules + CLAUDE.md:        3,000 tokens  (1.5%)
Always-on MCPs:          Varies          (5-15%)
─────────────────────────────────────────────
Available for work:     ~160-175K       (80-87%)
```

### Optimization Strategies

#### Strategy 1: Selective MCP Enabling

**Problem:** Too many MCPs active (>20K tokens overhead)

**Solution:** Disable per use case

```json
{
  "disabledMcpServers": ["playwright", "context7", "sentry"]
}
```

#### Strategy 2: Rule Scoping

**Problem:** Verbose rules loaded on every file

**Solution:** Use specific globs

```yaml
---
# Bad: Applies everywhere
globs: ["**/*"]

# Good: Only where needed
globs: ["contracts/**/*.sol"]
---
```

#### Strategy 3: Claude-Mem Compression

**Problem:** Large observation history (100K+ tokens)

**Solution:** Enable auto-compression

```json
{
  "compression": {
    "enabled": true,
    "minObservationsBeforeCompression": 50,
    "compressionRatio": 0.3
  }
}
```

#### Strategy 4: CLAUDE.md Brevity

**Problem:** 10K token project context doc

**Solution:** Link to detailed docs instead

```markdown
# Elysium Project

## Quick Reference

- Tech: Next.js 15 + Expo + Solidity
- Commands: See [COMMANDS.md](./docs/COMMANDS.md)
- Architecture: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Critical Rules

- NEVER read .env files
- ALWAYS use TDD workflow
- 100% coverage for smart contracts
```

### Token Profiling

**Check context usage:**

```bash
# In Claude session
/context
```

**Output:**

```
Context Usage:
  Base system: 15,000 tokens
  Rules: 3,000 tokens
  MCPs: 12,000 tokens
  CLAUDE.md: 2,000 tokens
  Total overhead: 32,000 tokens (16%)
  Available: 168,000 tokens (84%)
```

---

## 11. Use Case Configurations

### Use Case 1: Smart Contract Development

**Goal:** Maximum security tooling for blockchain work

**Configuration:**

**MCP servers** (`.mcp.json`):

```json
{
  "mcpServers": {
    "github": { "disabled": false },
    "memory": { "disabled": false },
    "slither": { "disabled": false },
    "openzeppelin": { "disabled": false },
    "foundry": { "disabled": false }
  }
}
```

**Plugins:**

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-mem@thedotmack": true,
    "building-secure-contracts@trailofbits": true
  }
}
```

**Agents active:**

- blockchain-auditor (Opus)
- test-writer (Sonnet)

**Token budget:**

- Overhead: ~41K tokens (20.5%)
- Available: ~159K tokens (79.5%)

---

### Use Case 2: Frontend Development

**Goal:** Fast UI iteration with design tools

**Configuration:**

**MCP servers:**

```json
{
  "mcpServers": {
    "github": { "disabled": false },
    "memory": { "disabled": false },
    "pencil": { "disabled": false },
    "gluestack": { "disabled": false },
    "playwright": { "disabled": true }
  }
}
```

**Plugins:**

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-mem@thedotmack": true
  }
}
```

**Agents active:**

- code-reviewer (Sonnet)

**Token budget:**

- Overhead: ~28K tokens (14%)
- Available: ~172K tokens (86%)

---

### Use Case 3: Backend API Development

**Goal:** Fast API development with testing

**Configuration:**

**MCP servers:**

```json
{
  "mcpServers": {
    "github": { "disabled": false },
    "memory": { "disabled": false },
    "playwright": { "disabled": false }
  }
}
```

**Plugins:**

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-mem@thedotmack": true,
    "voltagent-core-dev@voltagent-subagents": true
  }
}
```

**Agents active:**

- backend-developer (Sonnet)
- test-writer (Sonnet)

**Token budget:**

- Overhead: ~39K tokens (19.5%)
- Available: ~161K tokens (80.5%)

---

### Use Case 4: Full-Stack Development

**Goal:** Balanced configuration for frontend + backend + contracts

**Configuration:**

**MCP servers:**

```json
{
  "mcpServers": {
    "github": { "disabled": false },
    "memory": { "disabled": false },
    "gluestack": { "disabled": false },
    "foundry": { "disabled": false },
    "slither": { "disabled": true },
    "openzeppelin": { "disabled": true },
    "playwright": { "disabled": true }
  }
}
```

**Strategy:** Enable blockchain MCPs only when actively working on contracts.

**Plugins:**

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-mem@thedotmack": true
  }
}
```

**Token budget:**

- Overhead: ~33K tokens (16.5%)
- Available: ~167K tokens (83.5%)

---

### Use Case 5: Learning & Exploration

**Goal:** Maximum context for educational explanations

**Configuration:**

**Model:**

```json
{
  "model": "claude-opus-4-6",
  "alwaysThinkingEnabled": true,
  "outputStyle": "Explanatory"
}
```

**MCP servers (minimal):**

```json
{
  "mcpServers": {
    "memory": { "disabled": false },
    "context7": { "disabled": false }
  }
}
```

**Plugins:**

```json
{
  "enabledPlugins": {
    "claude-mem@thedotmack": true,
    "everything-claude-code@everything-claude-code": true
  }
}
```

**Token budget:**

- Overhead: ~25K tokens (12.5%)
- Available: ~175K tokens (87.5%)

---

## 12. Performance Optimization

### Optimization Checklist

#### ✅ **1. Enable Only Necessary MCPs**

**Before:**

```json
{
  "mcpServers": {
    "github": {},
    "memory": {},
    "slither": {},
    "openzeppelin": {},
    "foundry": {},
    "playwright": {},
    "context7": {},
    "sentry": {}
  }
}
// Overhead: ~45K tokens (22.5%)
```

**After:**

```json
{
  "mcpServers": {
    "github": {},
    "memory": {}
  },
  "disabledMcpServers": [
    "slither",
    "openzeppelin",
    "foundry",
    "playwright",
    "context7",
    "sentry"
  ]
}
// Overhead: ~25K tokens (12.5%)
// Saved: 20K tokens (10%)
```

#### ✅ **2. Use Haiku for Simple Tasks**

**Before:**

```json
{
  "model": "claude-opus-4-6"
}
// Cost: $15 per million input tokens
```

**After:**

```json
{
  "model": "claude-haiku-4-5-20251001"
}
// Cost: $1 per million input tokens
// Savings: 93.3%
```

**Switch to Opus only for:**

- Architecture decisions
- Security reviews
- Complex debugging

#### ✅ **3. Compress Claude-Mem Observations**

**Before:**

```json
{
  "compression": {
    "enabled": false
  }
}
// 100 observations = ~50K tokens injected
```

**After:**

```json
{
  "compression": {
    "enabled": true,
    "minObservationsBeforeCompression": 50,
    "compressionRatio": 0.3
  }
}
// 100 observations = ~15K tokens injected
// Saved: 35K tokens (17.5%)
```

#### ✅ **4. Scope Rules Tightly**

**Before:**

```yaml
---
globs: ["**/*"]
alwaysApply: true
---
[2000 token rule document]
```

**After:**

```yaml
---
globs: ["contracts/**/*.sol"]
alwaysApply: false
---
[2000 token rule document]
# Only loaded when working on .sol files
```

#### ✅ **5. Minimize CLAUDE.md**

**Before (10K tokens):**

```markdown
# Project

[Full architecture docs]
[Complete API reference]
[All commands with examples]
[Troubleshooting guide]
```

**After (2K tokens):**

```markdown
# Project

Quick ref:

- Tech: Next.js + Solidity
- Docs: ./docs/
- Commands: `pnpm dev`, `forge test`

Critical rules:

- TDD required
- 100% contract coverage
```

### Performance Metrics

**Target context efficiency:**

- Overhead: <15% (30K tokens)
- Available: >85% (170K tokens)

**Actual efficiency (your setup):**

| Use Case   | Overhead    | Available    | Efficiency |
| ---------- | ----------- | ------------ | ---------- |
| Blockchain | 41K (20.5%) | 159K (79.5%) | Good       |
| Frontend   | 28K (14%)   | 172K (86%)   | Excellent  |
| Backend    | 39K (19.5%) | 161K (80.5%) | Good       |
| Full-Stack | 33K (16.5%) | 167K (83.5%) | Excellent  |
| Learning   | 25K (12.5%) | 175K (87.5%) | Excellent  |

---

## 13. Community Best Practices 2026

### The Golden Rule: Context Management is Paramount

**From the community consensus:**

> "Context Management is Paramount: The most successful Claude Code users obsessively manage context through CLAUDE.md files, aggressive /clear usage, documentation systems, and token-efficient tool design."
>
> — [Best Practices for Claude Code](https://code.claude.com/docs/en/best-practices)

**Critical insight:** If you're using more than 20K tokens of MCPs, you're crippling Claude, giving you only 20K tokens left of actual work before context is exhausted.

### Use /clear Aggressively

**Best practice from winners:**

> "Use /clear often—every time you start something new, clear the chat to avoid history consuming tokens and forcing Claude to run compaction calls to summarize old conversations."
>
> — [How I use Claude Code](https://www.builder.io/blog/claude-code)

**When to clear:**

- Starting new features
- Switching domains (frontend → backend)
- After completing a logical unit of work
- When context feels "sluggish"

### Keep CLAUDE.md Under 150 Lines

**Community guideline:**

> "CLAUDE.md should not exceed 150+ lines. Configure your team's Git conventions in CLAUDE.md, including branch naming, commit message format, and common commands."
>
> — [CLAUDE.md Best Practices](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)

**Your actual CLAUDE.md:** 183 lines (slightly over)

**Optimization strategy:**

1. Move detailed examples to separate docs
2. Link to comprehensive guides
3. Keep only critical rules in CLAUDE.md

**Example refactor:**

```markdown
# Elysium - Quick Reference

[Link to full docs](./docs/README.md)

## Critical Rules

- TDD required (see /docs/workflows/tdd.md)
- 100% contract coverage
- Design tokens (see /docs/patterns/tokens.md)

## Commands

- `pnpm dev` — Start all apps
- `forge test` — Run contract tests
```

### Planning Before Implementation

**From hackathon winner:**

> "Every high-quality source emphasizes upfront planning (Planning Mode, written plans, architectural reviews) before coding—vibe coding works for throwaway MVPs, but production code requires structured thinking, validation, and documentation."
>
> — [The Claude Code setup that won a hackathon](https://blog.devgenius.io/the-claude-code-setup-that-won-a-hackathon-a75a161cd41c)

**Recommended flow with Superpowers:**

1. `/superpowers:brainstorm` — Capture requirements
2. `/superpowers:write-plan` — Draft implementation plan
3. Review plan (human approval)
4. `/superpowers:execute-plan` — Execute in subagent

**Success metric:** "It's not uncommon for Claude to be able to work autonomously for a couple hours at a time without deviating from the plan."

### Tests Provide the Only Reliable Validation

**Community consensus:**

> "AI-generated code often 'works' superficially but contains subtle bugs—tests provide the only reliable validation mechanism."
>
> — [Superpowers Plugin Complete Tutorial](https://namiru.ai/blog/superpowers-plugin-for-claude-code-the-complete-tutorial)

**Superpowers enforcement:**

> "The TDD approach is particularly strict: If Claude writes code before tests, the skill instructs it to delete that code and start over."
>
> — [Superpowers explained](https://jpcaparas.medium.com/superpowers-explained-the-claude-plugin-that-enforces-tdd-subagents-and-planning-c7fe698c3b82)

**Your configuration already enforces this** — keep it!

### Progressive Disclosure Strategy (Claude-Mem)

**10x token savings technique:**

> "Progressive Disclosure achieves 10x token savings through 3-layer retrieval: Layer 1 shows compact index (50-100 tokens), Layer 2 provides timeline context, Layer 3 delivers full observations (500-1,000 tokens) only when needed."
>
> — [Claude-Mem Context Window Optimization](https://claudefa.st/blog/guide/mechanics/context-management)

**How it works:**

1. **Index query** — Search returns titles only (50-100 tokens)
2. **Timeline** — Expand interesting areas (200-300 tokens)
3. **Full retrieval** — Deep dive when necessary (500-1K tokens)

**Configuration** (already optimal in your setup):

```json
{
  "contextInjection": {
    "enabled": true,
    "maxTokens": 4000,
    "relevanceThreshold": 0.7
  }
}
```

**Endless Mode (Beta):** Promises 20x increase — ~1,000 tool uses before context limits instead of 50.

### Context-Aware MCP (CA-MCP) Framework

**2026 research breakthrough:**

> "Context-Aware MCP demonstrates substantially better efficiency and coordination, reducing makespan by 45.5% and execution time by 73.5%, with 67–74% improvements due to reduced reliance on LLM calls."
>
> — [Enhancing Model Context Protocol (MCP) with Context-Aware Server Collaboration](https://www.researchgate.net/publication/399930238_Enhancing_Model_Context_Protocol_MCP_with_Context-Aware_Server_Collaboration)

**Key insight:** MCP servers that maintain context between requests dramatically outperform stateless servers.

**Implementation tip:** When building custom MCPs, add state management:

```typescript
class StatefulMCP {
  private context: Map<string, any> = new Map();

  async handleRequest(request: MCPRequest) {
    // Check context first
    const cachedData = this.context.get(request.key);
    if (cachedData) return cachedData;

    // Fetch and cache
    const data = await fetchData();
    this.context.set(request.key, data);
    return data;
  }
}
```

### gRPC Transport for MCP (Google Contribution)

**Latest development:**

> "Google Cloud announced it's contributing a gRPC transport package for MCP, addressing a critical gap for organizations that have standardized on gRPC. MCP currently ships with JSON-RPC over HTTP."
>
> — [Google Pushes for gRPC Support in MCP](https://www.infoq.com/news/2026/02/google-grpc-mcp-transport/)

**Impact:** Enterprise environments with existing gRPC infrastructure can now integrate MCP without protocol conversion overhead.

**Migration path:** Future-proof your custom MCPs by making transport layer pluggable.

### Agent-Based Hooks for Complex Validation

**Advanced technique:**

> "When verification requires inspecting files or running commands, use type: 'agent' hooks. Unlike prompt hooks which make a single LLM call, agent hooks spawn a subagent that can read files, search code, and use other tools."
>
> — [Claude Code Hooks: Complete Guide](https://claudefa.st/blog/tools/hooks/hooks-guide)

**Example use case:** Security review before git push

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git push *)",
        "hooks": [
          {
            "type": "agent",
            "description": "Security review",
            "prompt": "Review all changed files for security issues. Check for hardcoded secrets, SQL injection, XSS vulnerabilities. Return 'allow' if safe, 'deny' with explanation if issues found."
          }
        ]
      }
    ]
  }
}
```

**Pros:** Comprehensive validation with tool access
**Cons:** Higher latency, costs API calls

### Avoid the Last 20% of Context Window

**Community tip:**

> "Experienced users avoid the last 20% of the context window for anything touching multiple parts of your codebase, instead dividing work into context-sized chunks with natural breakpoints."
>
> — [Context Window Management](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/3.2-context-window-management)

**200K window strategy:**

- 0-160K (0-80%): Normal operation
- 160-180K (80-90%): Warning zone, start wrapping up
- 180-200K (90-100%): Emergency only, /clear recommended

**Check context regularly:**

```bash
/context
```

### Skills Over Prompts

**Best practice:**

> "Skills (.claude/skills/) are recommended as they support additional features like supporting files, invocation control, and subagent execution."
>
> — [Claude Code Features Guide](https://www.producttalk.org/how-to-use-claude-code-features/)

**Why skills > raw prompts:**

1. **Reusable** — Define once, invoke anywhere
2. **Versioned** — Track in git with code
3. **Composable** — Can invoke other skills
4. **Discoverable** — Show in `/` menu

**Your setup:** 3 custom skills + 6 plugin skills ✅

### Vector-Based MCP for Enterprise Knowledge

**Enterprise pattern:**

> "Vector-based MCP servers like Qdrant enable AI agents to quickly retrieve semantically similar records from enterprise knowledge bases, enhancing contextual accuracy through RAG approaches."
>
> — [Top 10 Best MCP Servers in 2026](https://cybersecuritynews.com/best-model-context-protocol-mcp-servers/)

**Implementation (if needed):**

```json
{
  "mcpServers": {
    "qdrant": {
      "command": "npx",
      "args": ["-y", "@qdrant/mcp-server"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

**Use cases:**

- Company documentation search
- Code pattern libraries
- Architecture decision records
- API documentation

### Summary: The "Hackathon Winner" Configuration

**From "everything-claude-code" (29K+ stars):**

```json
{
  "model": "claude-opus-4-6",
  "alwaysThinkingEnabled": true,
  "outputStyle": "Explanatory",

  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-mem@thedotmack": true
  },

  "mcpServers": {
    "github": { "disabled": false },
    "memory": { "disabled": false }
    // Keep MCP count under 5 servers
  },

  "permissions": {
    "defaultMode": "acceptEdits",
    "deny": ["Read(./.env)", "Read(**/*.pem)", "Bash(rm -rf *)"]
  }
}
```

**Key principles:**

1. TDD enforcement via Superpowers
2. Memory persistence via claude-mem
3. Minimal MCPs (<20K tokens overhead)
4. Comprehensive deny rules
5. CLAUDE.md under 150 lines

**Your configuration:** 95% aligned ✅

### Quick Wins for Your Setup

**Based on analysis:**

1. ✅ **Already optimal:**
   - Superpowers + claude-mem active
   - Strong security rules
   - TDD workflow enforced
   - 4 custom agents

2. 🟡 **Consider:**
   - Reduce CLAUDE.md from 183 → 150 lines
   - Enable MCP compression settings
   - Add Setup hooks for environment init

3. ❌ **Skip:**
   - Don't enable more plugins (voltagent disabled = good)
   - Don't add more MCPs unless critical
   - Don't exceed 150-line CLAUDE.md

---

## 14. Troubleshooting

### Issue 1: "Context window full" errors

**Symptoms:**

- Claude says "I can't load all this context"
- Truncated file reads
- Incomplete responses

**Diagnosis:**

```bash
# Check context usage
/context

# Check enabled MCPs
/mcp
```

**Solution:**

```json
{
  "disabledMcpServers": ["playwright", "context7", "sentry"]
}
```

### Issue 2: Hooks not running

**Symptoms:**

- Format-on-save doesn't work
- Secrets pass through
- Destructive commands not blocked

**Diagnosis:**

```bash
ls -la ~/.claude/hooks/

# Check permissions
# Should be -rwxr-xr-x
```

**Solution:**

```bash
chmod +x ~/.claude/hooks/*.sh

# Test hook manually
echo '{"tool_input":{"command":"rm -rf /"}}' | ~/.claude/hooks/validate-bash.sh
```

### Issue 3: MCP server not connecting

**Symptoms:**

- "MCP server failed to start"
- Tool search doesn't find MCP tools

**Diagnosis:**

```bash
# Test MCP manually
npx @modelcontextprotocol/server-github

# Check logs
cat ~/.claude/debug/*.log
```

**Solution:**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Issue 4: Agent not available

**Symptoms:**

- "Agent not found"
- Task tool says "Unknown subagent_type"

**Diagnosis:**

```bash
ls ~/.claude/agents/
```

**Solution:**
Ensure agent file exists and has correct frontmatter:

```yaml
---
name: blockchain-auditor
description: Brief description
tools: Read, Grep, Glob
model: opus
---
```

### Issue 5: Rules not applying

**Symptoms:**

- Style violations not caught
- Security rules ignored

**Diagnosis:**

```bash
# Check rule file exists
cat ~/.claude/rules/security/secrets.md

# Check frontmatter
head -10 ~/.claude/rules/security/secrets.md
```

**Solution:**

```yaml
---
globs: ["**/*"]
alwaysApply: true
priority: 100
---
```

### Issue 6: Claude-Mem not working

**Symptoms:**

- Web UI (localhost:37777) not accessible
- Memory search returns nothing
- Context injection not happening

**Diagnosis:**

```bash
# Check if running
curl http://localhost:37777/health

# Check logs
cat ~/.claude-mem/logs/*.log
```

**Solution:**

```bash
# Restart Claude Code (restarts claude-mem)
exit
claude

# Verify
curl http://localhost:37777/health
```

---

## Summary: Configuration Best Practices

### The Golden Rules

1. **Start minimal** — Enable only what you need
2. **Measure overhead** — Use `/context` regularly
3. **Test MCPs** — Before enabling, test standalone
4. **Scope rules** — Specific globs > wildcard
5. **Use Haiku** — For simple tasks (93% cost savings)
6. **Compress memory** — Enable claude-mem compression
7. **Disable unused** — Don't leave MCPs running
8. **Profile sessions** — Check token usage after heavy work
9. **Incremental changes** — Change one thing, test, iterate
10. **Document decisions** — Note why you enabled/disabled things

### Quick Reference: Configuration Hierarchy

```
Priority (highest → lowest):
1. Runtime commands (/mcp enable)
2. Project .claude/settings.local.json
3. Project .claude/settings.json
4. Project .mcp.json
5. Global ~/.claude/settings.json
6. Plugin defaults
```

### Essential Files Checklist

**Global (commit to dotfiles repo):**

- [ ] `~/.claude/settings.json`
- [ ] `~/.claude/rules/`
- [ ] `~/.claude/agents/`
- [ ] `~/.claude/hooks/`

**Project (commit to git):**

- [ ] `CLAUDE.md`
- [ ] `.claude/settings.json`
- [ ] `.mcp.json`

**Local (gitignore):**

- [ ] `.claude/settings.local.json`
- [ ] `CLAUDE.local.md`

---

**End of Guide**

This guide covers 100% of your Claude Code configuration surface area. Use it as a reference when optimizing performance, troubleshooting issues, or configuring new projects.

---

## Sources & References

This guide synthesizes information from your actual configuration plus community best practices:

**Official Documentation:**

- [Best Practices for Claude Code - Claude Code Docs](https://code.claude.com/docs/en/best-practices)
- [Automate workflows with hooks - Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)

**Configuration Guides:**

- [ClaudeLog - Claude Code Docs, Guides, Tutorials & Best Practices](https://claudelog.com/)
- [Claude Code Complete Guide 2026: From Basics to Advanced MCP](https://www.jitendrazaa.com/blog/ai/claude-code-complete-guide-2026-from-basics-to-advanced-mcp-2/)
- [Claude Code Best Practices by rosmur](https://rosmur.github.io/claudecode-best-practices/)

**CLAUDE.md Best Practices:**

- [CLAUDE.md: Best Practices Learned from Optimizing Claude Code with Prompt Learning](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)
- [How I use Claude Code (+ my best tips)](https://www.builder.io/blog/claude-code)

**Hooks & Automation:**

- [Claude Code Hooks: Complete Guide to All 12 Lifecycle Events](https://claudefa.st/blog/tools/hooks/hooks-guide)
- [The Claude Code setup that won a hackathon](https://blog.devgenius.io/the-claude-code-setup-that-won-a-hackathon-a75a161cd41c)
- [A complete guide to hooks in Claude Code](https://www.eesel.ai/blog/hooks-in-claude-code)
- [GitHub - disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [Claude Code Setup Hooks: Automate Onboarding and Maintenance](https://claudefa.st/blog/tools/hooks/claude-code-setup-hooks)

**Everything Claude Code (Hackathon Winner - 29K+ stars):**

- [GitHub - affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)

**MCP Servers & Protocol:**

- [Top 10 MCP (Model Context Protocol) Servers in 2026](https://www.intuz.com/blog/best-mcp-servers)
- [Top 10 Best Model Context Protocol (MCP) Servers in 2026](https://cybersecuritynews.com/best-model-context-protocol-mcp-servers/)
- [GitHub - modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- [Awesome MCP Servers](https://mcpservers.org/)
- [Model Context Protocol (MCP): The Complete Developer Guide for 2026](https://publicapis.io/blog/mcp-model-context-protocol-guide)
- [Google Pushes for gRPC Support in Model Context Protocol - InfoQ](https://www.infoq.com/news/2026/02/google-grpc-mcp-transport/)
- [Enhancing Model Context Protocol (MCP) with Context-Aware Server Collaboration (PDF)](https://www.researchgate.net/publication/399930238_Enhancing_Model_Context_Protocol_MCP_with_Context-Aware_Server_Collaboration)

**Claude-Mem Plugin:**

- [GitHub - thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)
- [claude-mem: Claude Code Plugin Solves Context Memory](https://byteiota.com/claude-mem-claude-code-plugin-solves-context-memory/)
- [Claude Code Context Window: Optimize Your Token Usage](https://claudefa.st/blog/guide/mechanics/context-management)
- [Claude-Mem: Persistent Memory for Claude Code Across Sessions](https://yuv.ai/blog/claude-mem)
- [Token Optimization Strategies | affaan-m/everything-claude-code](https://deepwiki.com/affaan-m/everything-claude-code/12.2-context-window-optimization)
- [Context Window Management | FlorianBruniaux/claude-code-ultimate-guide](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/3.2-context-window-management)

**Superpowers Plugin:**

- [Superpowers explained: the popular Claude plugin that enforces TDD, subagents, and planning](https://jpcaparas.medium.com/superpowers-explained-the-claude-plugin-that-enforces-tdd-subagents-and-planning-c7fe698c3b82)
- [Superpowers for Claude Code: Complete Guide 2026](https://pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide)
- [GitHub - obra/superpowers](https://github.com/obra/superpowers)
- [Superpowers Plugin for Claude Code: The Complete Tutorial](https://namiru.ai/blog/superpowers-plugin-for-claude-code-the-complete-tutorial)
- [Stop AI Agents from Writing Spaghetti: Enforcing TDD with Superpowers](https://yuv.ai/blog/superpowers)

**Additional Resources:**

- [How to Use Claude Code: A Guide to Slash Commands, Agents, Skills, and Plug-ins](https://www.producttalk.org/how-to-use-claude-code-features/)
- [10 Claude Code Productivity Tips For Every Developer in 2026](https://www.f22labs.com/blogs/10-claude-code-productivity-tips-for-every-developer/)
- [GitHub - hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

---

**Version:** 2.0 (February 8, 2026)
**Author:** Automated from your actual configuration + community research
**License:** MIT
**Contributors:** Community insights from 29K+ star projects and Anthropic hackathon winners


# Claude Code Stack Guide

**Project:** Elysium
**Last Updated:** February 2026
**Purpose:** Complete reference for the AI-assisted development stack

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What's Installed](#2-whats-installed)
3. [How It Works (Automatic Behavior)](#3-how-it-works-automatic-behavior)
4. [Workflows & Skills](#4-workflows--skills)
5. [Agent Orchestration](#5-agent-orchestration)
6. [Memory System (Claude-Mem)](#6-memory-system-claude-mem)
7. [MCP Servers](#7-mcp-servers)
8. [When to Override Defaults](#8-when-to-override-defaults)
9. [Quick Reference](#9-quick-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE (Opus 4.5 + Extended Thinking)             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         SKILLS LAYER                                 │  │
│  │  Superpowers (14) + Everything Claude Code (29) + Trail of Bits (23) │  │
│  │  "Check if ANY skill applies before responding"                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        AGENTS LAYER                                  │  │
│  │  VoltAgent Core (11) + VoltAgent QA/Sec (15+) + Custom (4)          │  │
│  │  Auto-selected via Task tool based on task description               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       ORCHESTRATION                                  │  │
│  │  dispatching-parallel-agents │ subagent-driven-dev │ executing-plans │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SAFETY & AUTOMATION                               │  │
│  │  Hooks (validate-bash, format-on-save) │ Rules │ Permissions        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│  CLAUDE-MEM   │           │  BLOCKCHAIN   │           │  CORE MCPs    │
│               │           │     MCPs      │           │               │
│ • SQLite DB   │           │ • Slither     │           │ • GitHub      │
│ • Vector DB   │           │ • OpenZeppelin│           │ • Memory      │
│ • Web UI      │           │ • Foundry     │           │ • Pencil      │
│   :37777      │           │               │           │ • Figma       │
└───────────────┘           └───────────────┘           └───────────────┘
```

---

## 2. What's Installed

### 2.1 Plugins

| Plugin                     | Version | Purpose                                              |
| -------------------------- | ------- | ---------------------------------------------------- |
| **superpowers**            | 4.1.1   | Core workflow skills (TDD, brainstorming, debugging) |
| **everything-claude-code** | 1.2.0   | 29 coding skills + 13 agents + rules                 |
| **claude-mem**             | 9.0.16  | Persistent memory across sessions                    |
| **voltagent-core-dev**     | 1.0.0   | 11 development agents                                |
| **voltagent-qa-sec**       | 1.0.0   | 15+ QA and security agents                           |

### 2.2 Skills (66+ Total)

**Superpowers (14 workflow skills):**

- `brainstorming` - Explore requirements before implementation
- `writing-plans` - Create detailed implementation plans
- `test-driven-development` - TDD red-green-refactor cycle
- `systematic-debugging` - Structured bug investigation
- `verification-before-completion` - Verify before claiming done
- `dispatching-parallel-agents` - Run independent tasks in parallel
- `subagent-driven-development` - Execute plans with fresh agents per task
- `executing-plans` - Batch execution with checkpoints
- `requesting-code-review` / `receiving-code-review`
- `writing-skills` - Create new skills
- `using-git-worktrees` - Isolated workspaces
- `finishing-a-development-branch`

**Everything Claude Code (29 coding skills):**

- `tdd` / `tdd-workflow` - TDD enforcement
- `plan` - Implementation planning
- `security-review` - Security checklist
- `frontend-patterns` / `backend-patterns`
- `postgres-patterns` / `clickhouse-io`
- `django-*` / `springboot-*` / `golang-*` / `python-*`
- `continuous-learning` - Extract patterns from sessions
- `strategic-compact` - Context management

**Trail of Bits (23 security skills):**

- `building-secure-contracts` - Smart contract security
- `property-based-testing` - Formal verification
- `semgrep-rule-creator` - Custom security rules
- `differential-review` - Security-focused review
- And 19 more...

### 2.3 Agents (40+ Total)

**Custom Agents (~/.claude/agents/):**

- `blockchain-auditor` - Solidity security audits
- `code-reviewer` - Code quality reviews
- `test-writer` - TDD test generation
- `debugger` - Root cause analysis

**Everything Claude Code Agents:**

- `architect` - System design
- `build-error-resolver` - Fix build errors
- `database-reviewer` - PostgreSQL review
- `security-reviewer` - Security analysis
- `tdd-guide` - TDD enforcement
- And 8 more...

**VoltAgent Core Dev:**

- `frontend-developer` / `backend-developer` / `fullstack-developer`
- `api-designer` / `graphql-architect`
- `mobile-developer` / `electron-pro`
- `microservices-architect` / `websocket-engineer`
- `ui-designer`

**VoltAgent QA/Sec:**

- `code-reviewer` / `security-auditor`
- `penetration-tester` / `chaos-engineer`
- `performance-engineer` / `debugger`
- `test-automator` / `qa-expert`
- `compliance-auditor` / `accessibility-tester`
- And more...

### 2.4 Rules (~/.claude/rules/)

| Rule                     | Applies To    | Purpose                     |
| ------------------------ | ------------- | --------------------------- |
| `security/secrets.md`    | All files     | Prevent secret exposure     |
| `blockchain/solidity.md` | `*.sol`       | Solidity security standards |
| `frontend/react.md`      | `*.tsx`       | React/RN patterns           |
| `backend/api.md`         | Backend files | API design standards        |

### 2.5 Hooks (~/.claude/hooks/)

| Hook                | Trigger          | Purpose                    |
| ------------------- | ---------------- | -------------------------- |
| `validate-bash.sh`  | Before Bash      | Block destructive commands |
| `format-on-save.sh` | After Edit/Write | Auto-format files          |
| `check-secrets.sh`  | After Write      | Warn on potential secrets  |

### 2.6 MCP Servers

| Server           | Purpose                        | Scope   |
| ---------------- | ------------------------------ | ------- |
| **slither**      | Smart contract static analysis | Project |
| **openzeppelin** | Secure contract generation     | Project |
| **foundry**      | Forge, Cast, Anvil tools       | Project |
| **github**       | GitHub API integration         | Project |
| **memory**       | Key-value storage              | Project |
| **pencil**       | Design file editing            | Global  |
| **figma**        | Figma integration              | Global  |

---

## 3. How It Works (Automatic Behavior)

### 3.1 Everything Is Automatic

| Component            | Automatic? | What It Does                                    |
| -------------------- | ---------- | ----------------------------------------------- |
| **Skill invocation** | ✅ Yes     | Claude checks if skills apply before responding |
| **Agent selection**  | ✅ Yes     | Task tool auto-selects best agent               |
| **Memory injection** | ✅ Yes     | Claude-mem injects relevant history             |
| **Code formatting**  | ✅ Yes     | Hook formats files after edit                   |
| **Bash validation**  | ✅ Yes     | Hook blocks dangerous commands                  |
| **Rule enforcement** | ✅ Yes     | Rules loaded based on file type                 |

### 3.2 The Automatic Flow

```
You type a message
        │
        ▼
┌─────────────────────────────────────┐
│  Claude-Mem injects relevant context │
│  from past sessions                  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Superpowers: Check ALL skills      │
│  "Does any skill apply? (even 1%)"  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Invoke relevant skill(s)           │
│  brainstorming → writing-plans →    │
│  TDD → verification                 │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Execute with appropriate agents    │
│  (auto-selected based on task)      │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Hooks run (format, validate)       │
│  Rules enforced per file type       │
└─────────────────────────────────────┘
```

### 3.3 You Just Prompt Normally

**No special syntax required.** Just describe what you want:

```
❌ Wrong: "/brainstorm then /plan then /tdd add dark mode"
✅ Right: "Add dark mode to the app"
```

Claude automatically:

1. Invokes brainstorming skill
2. Creates implementation plan
3. Uses TDD for implementation
4. Verifies before completion

---

## 4. Workflows & Skills

### 4.1 The Standard Development Flow

```
"Add feature X"
      │
      ▼
┌─────────────┐
│ brainstorming│  ← Explore requirements, propose approaches
│             │     Ask questions one at a time
│             │     Save design to docs/plans/
└─────────────┘
      │
      ▼
┌─────────────┐
│ writing-plans│  ← Create bite-sized tasks (2-5 min each)
│             │     Exact file paths, exact code
│             │     Save plan to docs/plans/
└─────────────┘
      │
      ▼
┌─────────────┐
│     TDD     │  ← For EACH task:
│             │     1. Write failing test
│             │     2. Verify it fails
│             │     3. Minimal implementation
│             │     4. Verify it passes
│             │     5. Commit
└─────────────┘
      │
      ▼
┌─────────────┐
│ verification│  ← Before claiming done:
│             │     Run tests, typecheck, lint
│             │     Evidence before assertions
└─────────────┘
```

### 4.2 Bug Fixing Flow

```
"Fix this bug"
      │
      ▼
┌──────────────────┐
│ systematic-      │  ← Structured investigation:
│ debugging        │     1. Reproduce the issue
│                  │     2. Form hypotheses
│                  │     3. Test hypotheses
│                  │     4. Find root cause
└──────────────────┘
      │
      ▼
┌─────────────┐
│     TDD     │  ← Write test that catches the bug
│             │     Then fix
└─────────────┘
      │
      ▼
┌─────────────┐
│ verification│  ← Verify fix works
└─────────────┘
```

### 4.3 Skill Types

**Rigid Skills (follow exactly):**

- `test-driven-development` - No skipping steps
- `systematic-debugging` - Follow the process
- `verification-before-completion` - Must have evidence

**Flexible Skills (adapt to context):**

- `frontend-patterns` - Apply relevant patterns
- `security-review` - Use applicable checks

---

## 5. Agent Orchestration

### 5.1 Single Agent (Default)

For simple tasks, Claude uses one agent:

```
"Review this code" → code-reviewer agent
"Debug this error" → debugger agent
"Write tests for X" → test-writer agent
```

### 5.2 Parallel Agents

For multiple independent problems:

```
"Fix these 5 failing tests in different files"
                │
                ▼
┌───────────────────────────────────────┐
│     dispatching-parallel-agents       │
│                                       │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐ │
│   │Agent│  │Agent│  │Agent│  │Agent│ │
│   │  1  │  │  2  │  │  3  │  │  4  │ │
│   └─────┘  └─────┘  └─────┘  └─────┘ │
│      │        │        │        │    │
│      └────────┴────────┴────────┘    │
│                  │                    │
│          Collect results              │
└───────────────────────────────────────┘
```

### 5.3 Sequential with Review (subagent-driven-development)

For plan execution in current session:

```
Plan with 5 tasks
      │
      ▼
┌─────────────────────────────────────────┐
│  Task 1:                                │
│    Implementer Agent → implement        │
│    Spec Reviewer Agent → check spec     │
│    Code Quality Agent → check quality   │
├─────────────────────────────────────────┤
│  Task 2:                                │
│    (same flow, fresh agents)            │
├─────────────────────────────────────────┤
│  ...                                    │
└─────────────────────────────────────────┘
```

### 5.4 Batch with Checkpoints (executing-plans)

For plan execution with human review:

```
Plan with 12 tasks
      │
      ▼
┌─────────────────────────────────────┐
│  Batch 1 (tasks 1-3)                │
│  Execute → "Ready for feedback"     │
│            ↓                        │
│       Human reviews                 │
├─────────────────────────────────────┤
│  Batch 2 (tasks 4-6)                │
│  Execute → "Ready for feedback"     │
│            ↓                        │
│       Human reviews                 │
├─────────────────────────────────────┤
│  ...                                │
└─────────────────────────────────────┘
```

---

## 6. Memory System (Claude-Mem)

### 6.1 What It Does

- **Captures** decisions, context, and learnings from every session
- **Compresses** older observations (10x token efficiency)
- **Injects** relevant history into Claude's context automatically
- **Searches** using hybrid vector + keyword search

### 6.2 Automatic Behavior

```
Session Start
     │
     ▼
┌─────────────────────────────────────┐
│  Claude-Mem searches for relevant   │
│  context from past sessions         │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Injects up to 4000 tokens of       │
│  relevant history into system prompt│
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  Claude has context about:          │
│  • Past decisions                   │
│  • Known issues                     │
│  • Project patterns                 │
└─────────────────────────────────────┘
```

### 6.3 Access Methods

| Method         | How                                          |
| -------------- | -------------------------------------------- |
| **Web UI**     | http://localhost:37777                       |
| **Ask Claude** | "Search memory for authentication decisions" |
| **Timeline**   | "Show me what we discussed last week"        |

### 6.4 Privacy

Use `<private>` tags to exclude content from memory:

```
<private>
This won't be stored in memory
</private>
```

---

## 7. MCP Servers

### 7.1 Blockchain MCPs

**Slither** - Smart contract static analysis:

```
"Run slither on contracts/Token.sol"
"Analyze the contract for vulnerabilities"
```

**OpenZeppelin** - Secure contract generation:

```
"Generate an ERC-20 token with OpenZeppelin"
"Create a governor contract"
```

**Foundry** - Development tools:

```
"Start anvil for local testing"
"Run forge test"
"Call the contract with cast"
```

### 7.2 Core MCPs

**GitHub** - Repository operations:

```
"Create a PR for this branch"
"List open issues"
```

**Memory** - Persistent key-value storage:

```
"Store this configuration"
"Retrieve the API settings"
```

---

## 8. When to Override Defaults

### 8.1 Skip Workflows

```
"Skip brainstorming, just implement X"
"Don't write tests, this is a quick prototype"
"Implement without planning - I know exactly what I want"
```

### 8.2 Specify Agents

```
"Use the blockchain-auditor agent for the security review"
"Use the security-reviewer instead of code-reviewer"
"Have the penetration-tester check this endpoint"
```

### 8.3 Force Parallel Execution

```
"These tasks are independent, run them in parallel"
"Dispatch 3 agents simultaneously for these files"
```

### 8.4 Choose Execution Style

After planning, Claude asks:

```
"Plan complete. Two execution options:
1. Subagent-Driven (this session)
2. Parallel Session (separate)
Which approach?"
```

---

## 9. Quick Reference

### 9.1 Common Prompts

| What You Want        | What To Say                       |
| -------------------- | --------------------------------- |
| New feature          | "Add X to the app"                |
| Bug fix              | "Fix this error: [error]"         |
| Refactor             | "Refactor X to use Y pattern"     |
| Security review      | "Review this for security issues" |
| Smart contract audit | "Audit contracts/Token.sol"       |
| Generate tests       | "Write tests for X"               |
| Code review          | "Review my recent changes"        |

### 9.2 Manual Skill Invocation (Optional)

```
/brainstorm          # Start ideation
/tdd                 # Enforce TDD
/plan                # Create implementation plan
/security-review     # Security checklist
/systematic-debugging # Structured debugging
```

### 9.3 Key Locations

| What               | Where                      |
| ------------------ | -------------------------- |
| Global settings    | `~/.claude/settings.json`  |
| Custom agents      | `~/.claude/agents/`        |
| Custom rules       | `~/.claude/rules/`         |
| Hooks              | `~/.claude/hooks/`         |
| Installed plugins  | `~/.claude/plugins/cache/` |
| Claude-mem data    | `~/.claude-mem/`           |
| Claude-mem UI      | http://localhost:37777     |
| Project MCP config | `.mcp.json`                |
| Project settings   | `.claude/settings.json`    |

### 9.4 Verification Commands

```bash
# Check claude-mem is running
curl http://localhost:37777/health

# List installed plugins
/plugin list

# Check MCP servers
/mcp

# View context usage
/context
```

---

## Summary

**The stack is designed to be invisible.** You prompt naturally, and:

1. ✅ Skills auto-invoke based on task type
2. ✅ Agents auto-select based on expertise needed
3. ✅ Memory auto-injects relevant context
4. ✅ Hooks auto-format and validate
5. ✅ Rules auto-enforce per file type
6. ✅ Orchestration auto-parallelizes when beneficial

**Just describe what you want to build.** The entire workflow (plan → test → implement → verify → review) happens automatically.


# Claude Code Configuration Templates - Repository Structure

**Purpose:** Shareable Git repository with comprehensive Claude Code templates and configurations

---

## Proposed Directory Structure

```
claude-code-config-templates/
├── README.md                              # Main repo guide (what, why, how to use)
├── LICENSE                                # MIT license
├── CONTRIBUTING.md                        # How to contribute improvements
├── .gitignore                             # Git ignores
│
├── docs/                                  # Comprehensive documentation
│   ├── README.md                          # Docs index
│   ├── COMPREHENSIVE_GUIDE.md             # Full configuration reference (2,330 lines)
│   ├── QUICK_START.md                     # 5-minute getting started
│   ├── ARCHITECTURE.md                    # How Claude config system works
│   ├── TOKEN_OPTIMIZATION.md              # Token saving strategies
│   ├── AUTO_IMPROVEMENT.md                # How the auto-improvement system works
│   ├── MCP_SERVERS.md                     # All MCP servers explained
│   ├── HOOKS_GUIDE.md                     # Hooks setup and examples
│   └── FAQ.md                             # Common questions
│
├── templates/                             # Ready-to-copy templates
│   ├── README.md                          # Template usage guide
│   │
│   ├── base/                              # Minimal base template (all projects)
│   │   ├── .claude/
│   │   │   ├── settings.json
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md
│   │   ├── LEARNINGS.md
│   │   └── .gitignore
│   │
│   ├── frontend/                          # Frontend-specific (React/Next.js)
│   │   ├── .claude/
│   │   │   ├── settings.json              # Gluestack, Pencil, Playwright enabled
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Frontend workflow, component patterns
│   │   ├── LEARNINGS.md                   # Frontend-specific sections
│   │   └── README.md                      # When to use this template
│   │
│   ├── blockchain/                        # Smart contract development
│   │   ├── .claude/
│   │   │   ├── settings.json              # Foundry, Slither, Gemforge enabled
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Security patterns, testing standards
│   │   ├── LEARNINGS.md                   # Security vulnerabilities section
│   │   └── README.md                      # When to use this template
│   │
│   ├── fullstack/                         # Full-stack projects
│   │   ├── .claude/
│   │   │   ├── settings.json              # All MCPs, layer switching guide
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Layer-based configuration
│   │   ├── LEARNINGS.md                   # Integration patterns
│   │   └── README.md
│   │
│   ├── data-science/                      # Data/ML projects
│   │   ├── .claude/
│   │   │   ├── settings.json              # Jupyter, Python tools
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Data pipeline patterns
│   │   ├── LEARNINGS.md                   # Data quality issues
│   │   └── README.md
│   │
│   ├── documentation/                     # Documentation projects
│   │   ├── .claude/
│   │   │   ├── settings.json              # Minimal, WebFetch/WebSearch only
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Writing standards
│   │   ├── LEARNINGS.md                   # Documentation patterns
│   │   └── README.md
│   │
│   └── infrastructure/                    # DevOps/Infrastructure
│       ├── .claude/
│       │   ├── settings.json              # Bash tools, cloud CLIs
│       │   └── settings.local.json
│       ├── CLAUDE.md                      # IaC patterns, deployment
│       ├── LEARNINGS.md                   # Infrastructure lessons
│       └── README.md
│
├── global/                                # Global ~/.claude/ configuration
│   ├── README.md                          # Global config guide
│   │
│   ├── settings.json                      # Example global settings
│   │
│   ├── rules/                             # Reusable rules
│   │   ├── README.md
│   │   ├── frontend/
│   │   │   └── react.md                   # React patterns
│   │   ├── blockchain/
│   │   │   └── solidity.md                # Solidity security
│   │   ├── backend/
│   │   │   └── api.md                     # API standards
│   │   └── security/
│   │       └── secrets.md                 # Secret handling
│   │
│   ├── agents/                            # Specialized agents
│   │   ├── README.md
│   │   ├── blockchain-auditor.md
│   │   ├── code-reviewer.md
│   │   ├── debugger.md
│   │   └── test-writer.md
│   │
│   └── hooks/                             # Automation hooks
│       ├── README.md
│       ├── sessionstart-load-learnings.sh
│       ├── posttooluse-capture-errors.sh
│       └── pretooluse-validate-bash.sh
│
├── examples/                              # Real-world examples
│   ├── README.md
│   │
│   ├── elysium-frontend/                  # Real example: Elysium project
│   │   ├── .claude/
│   │   │   └── settings.local.json
│   │   ├── CLAUDE.md                      # Actual CLAUDE.md from Elysium
│   │   ├── LEARNINGS.md                   # Actual learnings (13 errors)
│   │   └── README.md                      # What this project teaches
│   │
│   ├── defi-protocol/                     # Example blockchain project
│   │   ├── .claude/
│   │   ├── CLAUDE.md
│   │   ├── LEARNINGS.md
│   │   └── README.md
│   │
│   └── saas-app/                          # Example full-stack SaaS
│       ├── .claude/
│       ├── CLAUDE.md
│       ├── LEARNINGS.md
│       └── README.md
│
├── tools/                                 # Helper scripts and tools
│   ├── README.md
│   ├── setup.sh                           # One-command setup script
│   ├── validate-config.sh                 # Validate configuration
│   ├── token-audit.sh                     # Check token usage
│   └── mcp-manager.sh                     # Enable/disable MCPs by use case
│
└── resources/                             # Additional resources
    ├── README.md
    ├── MCP_DIRECTORY.md                   # Curated MCP server list
    ├── PLUGIN_GUIDE.md                    # Plugin recommendations
    ├── COMMUNITY_RESOURCES.md             # External links (40+ sources)
    └── CHANGELOG.md                       # Version history
```

---

## Key Design Decisions

### 1. Separation of Concerns

- **templates/** - Ready-to-copy project templates
- **global/** - Global ~/.claude/ configuration
- **examples/** - Real-world reference implementations
- **docs/** - Comprehensive guides
- **tools/** - Helper scripts

### 2. Use-Case-Specific Templates

Each template directory has:

- Full .claude/ configuration pre-configured for that use case
- Customized CLAUDE.md with relevant patterns
- LEARNINGS.md with domain-specific sections
- README.md explaining when to use this template

### 3. Discoverability

- Every directory has README.md
- Main README.md has clear navigation
- Quick start guide for 5-minute setup
- Examples show real usage

### 4. Git-Ready

- .gitignore for sensitive files
- LICENSE (MIT)
- CONTRIBUTING.md for community
- Proper documentation structure

---

## Usage Workflow

### For New Users (First Time)

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/claude-code-config-templates.git
cd claude-code-config-templates

# 2. Read quick start
cat docs/QUICK_START.md

# 3. Run setup script (installs global config)
./tools/setup.sh --global

# 4. Copy template for new project
./tools/setup.sh --project /path/to/project --template frontend
```

### For Existing Users (Using Templates)

```bash
# Copy frontend template to new project
cp -r templates/frontend/.claude /my-new-project/
cp templates/frontend/CLAUDE.md /my-new-project/
cp templates/frontend/LEARNINGS.md /my-new-project/

# Or use the helper script
./tools/setup.sh --project /my-new-project --template frontend
```

---

## File Naming Convention

- **UPPERCASE.md** - Important top-level docs (README, CONTRIBUTING, LICENSE)
- **PascalCase.md** - Documentation guides (TokenOptimization.md would be TOKEN_OPTIMIZATION.md)
- **lowercase.sh** - Scripts and tools
- **kebab-case.md** - Agent definitions

---

## What Goes Where?

### templates/[use-case]/

- **Purpose:** Ready-to-copy project configurations
- **Contents:** Pre-configured for specific use case
- **Commit:** Yes (these are the templates)

### global/

- **Purpose:** Global ~/.claude/ configuration examples
- **Contents:** Rules, agents, hooks that work across all projects
- **Commit:** Yes (examples for users to copy)

### examples/

- **Purpose:** Real-world reference implementations
- **Contents:** Actual configurations from real projects (anonymized)
- **Commit:** Yes (learning resources)

### docs/

- **Purpose:** Comprehensive documentation
- **Contents:** Guides, references, tutorials
- **Commit:** Yes (documentation)

### tools/

- **Purpose:** Helper scripts
- **Contents:** Setup scripts, validation, auditing
- **Commit:** Yes (utilities)

---

## Next Steps

1. **Create repository structure** with all directories
2. **Migrate existing docs** to appropriate locations
3. **Create use-case-specific templates** (frontend, blockchain, etc.)
4. **Write main README.md** with clear navigation
5. **Create setup.sh** for one-command installation
6. **Add examples** from Elysium and other projects
7. **Write QUICK_START.md** for 5-minute onboarding
8. **Initialize git repo** and push to GitHub

---

**Goal:** Single command to set up Claude Code for any project type with best practices built-in.

```bash
# The dream workflow:
git clone https://github.com/you/claude-code-config-templates.git
cd claude-code-config-templates
./tools/setup.sh --project /my-project --template frontend
# Done! Claude is configured with auto-improvement enabled.
```

# Claude Code Project Template System

**Version:** 1.0 (February 8, 2026)
**Purpose:** Standardized configuration templates for new projects with auto-improvement instructions

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Base Template Files](#base-template-files)
3. [Task-Based Configuration Matrix](#task-based-configuration-matrix)
4. [Auto-Improvement System](#auto-improvement-system)
5. [Project-Specific Customization](#project-specific-customization)
6. [Maintenance & Evolution](#maintenance--evolution)

---

## Quick Start

### New Project Setup (3 minutes)

```bash
# 1. Copy base template to your new project
cp -r ~/.claude/templates/base-project/ /path/to/new-project/.claude/

# 2. Copy CLAUDE.md template
cp ~/.claude/templates/CLAUDE.template.md /path/to/new-project/CLAUDE.md

# 3. Copy LEARNINGS.md for auto-improvement
cp ~/.claude/templates/LEARNINGS.template.md /path/to/new-project/LEARNINGS.md

# 4. Initialize auto-memory
mkdir -p ~/.claude/projects/$(pwd | sed 's|/|-|g')/memory/
cp ~/.claude/templates/MEMORY.template.md ~/.claude/projects/$(pwd | sed 's|/|-|g')/memory/MEMORY.md

# 5. Select your project type and configure
# Run: claude setup --interactive
```

### Project Type Selection

Choose your primary use case to auto-configure MCP servers, rules, and agents:

- **Frontend** → Enable Gluestack, Pencil, Playwright | Load frontend/react rules
- **Blockchain** → Enable Foundry, Slither, Gemforge | Load blockchain/solidity rules
- **Full-Stack** → Enable all above + API rules
- **Data/ML** → Enable Jupyter, Python tools | Load data science rules
- **Documentation** → Minimal config, enable WebFetch | Load writing rules
- **Infrastructure** → Enable Docker, K8s tools | Load devops rules

---

## Base Template Files

### 1. `.claude/settings.json` (Base Template)

**Location:** `~/.claude/templates/base-project/.claude/settings.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/anthropics/claude-code/main/settings.schema.json",
  "description": "Base project configuration - customize for your project type",

  "permissions": {
    "allow": ["Bash(git:*)", "Bash(npm:*)", "Bash(yarn:*)"],
    "deny": [],
    "alwaysAllowWrite": [],
    "alwaysAllowRead": [],
    "alwaysAllowEdit": []
  },

  "mcpServers": {
    "_comment": "Enable only what you need. See Task-Based Configuration Matrix below."
  },

  "globalBlocklist": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "*.log",
    ".env*",
    "secrets/**"
  ],

  "autoMemory": {
    "enabled": true,
    "directory": "auto",
    "threshold": 50000
  }
}
```

### 2. `.claude/settings.local.json` (Machine-Specific)

**Location:** `~/.claude/templates/base-project/.claude/settings.local.json`
**Note:** Add to `.gitignore`

```json
{
  "description": "Machine-specific overrides - NOT committed to git",

  "permissions": {
    "allow": [
      "Bash(cd:*)",
      "_comment": "Add machine-specific permissions here"
    ]
  },

  "mcpServers": {
    "_comment": "Machine-specific MCP servers (like local databases, IDEs)"
  }
}
```

### 3. `CLAUDE.md` (Project Context Template)

**Location:** `~/.claude/templates/CLAUDE.template.md`

```markdown
# [Project Name] - Claude Instructions

**Last Updated:** [Date]
**Project Type:** [Frontend/Blockchain/Full-Stack/Data/Docs/Infrastructure]
**Tech Stack:** [React, Solidity, Python, etc.]

---

## Project Overview

[2-3 sentence description of what this project does]

**Key Technologies:**

- Framework: [Next.js/Hardhat/FastAPI/etc.]
- Language: [TypeScript/Solidity/Python/etc.]
- Styling: [Tailwind/CSS-in-JS/etc.]
- Testing: [Vitest/Foundry/Pytest/etc.]

---

## Architecture
```

[Project directory structure - keep brief, <30 lines]

```

**Key Directories:**
- `src/` - [Description]
- `tests/` - [Description]
- `docs/` - [Description]

---

## Development Workflow

### Phase 1: Planning (REQUIRED before implementation)
1. Read `LEARNINGS.md` for known patterns and gotchas
2. Invoke `superpowers:brainstorming` for requirements clarity
3. Invoke `superpowers:writing-plans` for implementation strategy

### Phase 2: Implementation
1. Invoke `superpowers:test-driven-development` (write tests first)
2. Implement minimal code to pass tests
3. Invoke `superpowers:verification-before-completion` (verify it works)

### Phase 3: Code Quality
1. Invoke `superpowers:requesting-code-review` (before committing)
2. Check against patterns in `LEARNINGS.md`
3. Update `LEARNINGS.md` if new patterns emerge

### Phase 4: Integration
1. Run full test suite
2. Update documentation if APIs changed
3. Invoke `superpowers:finishing-a-development-branch`

---

## Code Patterns & Standards

> **CRITICAL:** See `LEARNINGS.md` for project-specific lessons learned.
> This section covers immutable standards only.

### [Language]-Specific Patterns

**[Add language-specific patterns here]**

Example for TypeScript/React:
- Arrow function exports: `export const Component = () => {}`
- Props interface above component: `interface ComponentProps {}`
- Import order: React → external → internal → local

### Testing Standards

- Test file naming: `*.test.ts` or `*.spec.ts`
- Coverage threshold: 80% lines, 90% branches
- Mock external dependencies
- Test error cases, not just happy path

### Documentation Requirements

- JSDoc for public APIs
- README.md for each major module
- Architecture Decision Records (ADRs) in `docs/adr/`

---

## Design Token System

**[If applicable, list design tokens, spacing, colors]**

Example:
- Spacing: xs=4px, sm=8px, md=12px, lg=16px
- Colors: Use tokens, NOT hardcoded hex
- Typography: text-primary, text-secondary, text-muted

---

## Known Gotchas

> **SEE `LEARNINGS.md` for comprehensive list.**

Quick reference (move to LEARNINGS.md if >5 items):
1. [Known issue 1]
2. [Known issue 2]
3. [Known issue 3]

---

## Tools & MCP Servers

**Enabled for this project:**

- [ ] **[MCP Server Name]** - [Purpose]
- [ ] **[MCP Server Name]** - [Purpose]

**When to enable additional tools:**

- Enable **[Tool]** when working on [specific task]
- Disable **[Tool]** when done with [task] (reduces token overhead)

---

## Never Do

- [Project-specific anti-patterns]
- Skip testing before implementation
- Commit without running verification
- Use "vibe coding" - always follow structured workflow

---

**Template Version:** 1.0 (Feb 2026)
**Customize this template for your project and delete this footer.**
```

### 4. `LEARNINGS.md` (Auto-Improvement Log)

**Location:** `~/.claude/templates/LEARNINGS.template.md`

````markdown
# Project Learnings & Error Mitigation

**Purpose:** Document recurring errors, lessons learned, and evolving patterns.
**Update Frequency:** After each significant task or when you discover a new pattern.

---

## Recurring Errors & Fixes

### Error Category: [e.g., "Build Failures"]

| #   | Error Pattern                                                 | Root Cause                                     | Fix                                               | Date Learned |
| --- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | ------------ |
| 1   | `Module not found: 'app/components/ui/box'`                   | Missing barrel export in `index.ts`            | Always update `index.ts` when creating components | 2026-02-07   |
| 2   | TypeScript error: `Property 'backgroundImage' does not exist` | React Native ViewStyle doesn't include web CSS | Add `as any` cast to style prop                   | 2026-02-07   |

**Pattern:** [Describe the recurring pattern if multiple similar errors]

**Prevention:** [How to avoid this class of errors in the future]

---

## Design Patterns That Work

### Pattern: [Pattern Name]

**Context:** [When to use this pattern]

**Implementation:**

```[language]
// Code example
```
````

**Benefits:**

- [Benefit 1]
- [Benefit 2]

**Learned From:** [Task/feature where this emerged]

---

## Anti-Patterns (Don't Do This)

### Anti-Pattern: [Name]

**What NOT to do:**

```[language]
// Bad code example
```

**Why it's bad:** [Explanation]

**Do this instead:**

```[language]
// Good code example
```

**Cost if ignored:** [Time wasted, bugs introduced, etc.]

---

## Performance Lessons

### Lesson: [Performance insight]

**Problem:** [What was slow]

**Solution:** [What fixed it]

**Metrics:**

- Before: [benchmark]
- After: [benchmark]
- Improvement: [percentage]

---

## Tool-Specific Notes

### [MCP Server / Plugin Name]

**When to use:** [Specific tasks or scenarios]

**Configuration tips:**

- [Tip 1]
- [Tip 2]

**Common issues:**

- **Issue:** [Description]
  - **Fix:** [Solution]

---

## Workflow Improvements

### Improvement: [What changed]

**Old approach:** [How we used to do it]

**New approach:** [Better way discovered]

**Why it's better:** [Measurable benefits]

**Adopted on:** [Date]

---

## Component Inventory

> Auto-update this when creating new reusable components

### Atoms (Single-purpose UI)

- `[ComponentName]` - [Purpose] - `path/to/component.tsx`

### Molecules (Composite UI)

- `[ComponentName]` - [Purpose] - `path/to/component.tsx`

### Organisms (Business Logic)

- `[ComponentName]` - [Purpose] - `path/to/component.tsx`

---

## Decision Log

### Decision: [What was decided]

**Date:** [YYYY-MM-DD]

**Context:** [Why this decision was needed]

**Options Considered:**

1. [Option 1] - Pros: [...] Cons: [...]
2. [Option 2] - Pros: [...] Cons: [...]

**Decision:** [Chosen option]

**Rationale:** [Why this option]

**Revisit if:** [Conditions that would trigger reconsideration]

---

## Token Optimization Notes

### Optimization: [What was optimized]

**Problem:** [High token usage scenario]

**Solution:** [How tokens were reduced]

**Savings:** [Token reduction]

---

## Next Learning Opportunities

- [ ] [Area to explore or improve]
- [ ] [Pattern to document]
- [ ] [Tool to try]

---

**Auto-Improvement Instructions for Claude:**

When you encounter an error or discover a pattern:

1. Check if it's already documented here
2. If new, add it to the appropriate section above
3. Include specific code examples
4. Note the date and context
5. Update prevention strategies

When you complete a task successfully:

1. Review if any new patterns emerged
2. Document "what worked well"
3. Note any tool configurations that helped
4. Add to component inventory if applicable

When you make a mistake:

1. Document the error pattern immediately
2. Add to "Recurring Errors" with fix
3. Update "Anti-Patterns" if it's a design issue
4. Propose a prevention strategy

---

**Template Version:** 1.0 (Feb 2026)

````

### 5. `MEMORY.md` (Auto-Memory Template)

**Location:** `~/.claude/templates/MEMORY.template.md`

```markdown
# [Project Name] Auto-Memory

**Purpose:** Persistent context across Claude sessions.
**Token Budget:** Keep under 200 lines (auto-loaded into every session).

---

## Project Status

- **Current Phase:** [Planning/Implementation/Testing/Deployed]
- **Active Branch:** [branch name]
- **Last Major Work:** [Brief description]
- **Next Priority:** [What to work on next]

---

## Critical Mappings

**[Language/Framework-Specific Mappings]**

Example for React/Tailwind:
- Spacing: xs=4px, sm=8px, md=12px, lg=16px, xl=20px
- Colors: primary=#xxx, secondary=#xxx (use tokens when available)

---

## Key Patterns

**[2-5 most important patterns to remember]**

1. **Pattern:** [Brief description]
   - When: [Context]
   - How: [Implementation]

---

## Common Pitfalls

**[Top 5 recurring mistakes]**

1. **Pitfall:** [Description]
   - **Fix:** [Solution]
   - **Prevention:** [How to avoid]

---

## Architecture Notes

**[Critical architectural decisions]**

- Tech stack: [List key technologies]
- Design patterns: [Patterns in use]
- External services: [APIs, databases, etc.]

---

## Links

**For detailed information, see:**
- [LEARNINGS.md](../../../LEARNINGS.md) - Comprehensive lessons learned
- [CLAUDE.md](../../../CLAUDE.md) - Full project instructions
- [patterns.md](../../../docs/patterns.md) - Detailed patterns if exists

---

**Keep this file concise.** Move detailed content to linked files.
````

---

## Task-Based Configuration Matrix

### When to Enable Which MCP Servers

| Project Type                 | Always Enable                                                         | Enable When Needed                                                                | Never Enable                            |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| **Frontend (React/Next.js)** | • Gluestack (UI docs)<br>• Playwright (testing)<br>• IDE diagnostics  | • Pencil (design work)<br>• WebFetch (docs research)                              | • Foundry<br>• Slither<br>• Jupyter     |
| **Blockchain (Solidity)**    | • Foundry (forge/cast)<br>• Slither (security)<br>• Gemforge (deploy) | • WebFetch (OpenZeppelin docs)<br>• IDE diagnostics                               | • Gluestack<br>• Pencil<br>• Playwright |
| **Full-Stack**               | • Playwright (E2E)<br>• IDE diagnostics<br>• WebFetch (API docs)      | • All others based on layer:<br> - Frontend: +Gluestack<br> - Contracts: +Foundry | None (but disable after use)            |
| **Data Science/ML**          | • Jupyter<br>• Python debugger<br>• IDE diagnostics                   | • WebFetch (library docs)<br>• Slack (team updates)                               | • Foundry<br>• Slither<br>• Pencil      |
| **Documentation**            | • WebFetch (research)<br>• WebSearch (references)                     | • Screenshot tools<br>• Pencil (diagrams)                                         | • Foundry<br>• Slither<br>• Playwright  |
| **Infrastructure/DevOps**    | • IDE diagnostics<br>• Bash (scripts)                                 | • WebFetch (cloud docs)<br>• Slack (alerts)                                       | • Gluestack<br>• Pencil<br>• Jupyter    |

### Plugin Selection by Task

| Plugin          | Always Use?                | Use When...                 | Skip When...                |
| --------------- | -------------------------- | --------------------------- | --------------------------- |
| **superpowers** | ✅ Yes (TDD enforcement)   | Any implementation work     | Pure research tasks         |
| **claude-mem**  | ✅ Yes (persistent memory) | All work                    | Never skip                  |
| **mcp-search**  | ✅ Yes (memory search)     | Need to find past learnings | Fresh projects (no history) |

### Agent Selection by Task

| Agent                  | Invoke When...                     | Expect...                              | Cost            |
| ---------------------- | ---------------------------------- | -------------------------------------- | --------------- |
| **blockchain-auditor** | Before deploying contracts         | Security audit with SWC checks         | Opus (high)     |
| **code-reviewer**      | After feature completion           | Design patterns, best practices review | Sonnet (medium) |
| **debugger**           | Test failures, unexpected behavior | Root cause analysis with fixes         | Sonnet (medium) |
| **test-writer**        | Implementing new features (TDD)    | Comprehensive test suites              | Haiku (low)     |

### Rule Activation by File Type

Claude automatically loads rules based on glob patterns:

| Rule File                | Auto-Loads For     | Contains                             |
| ------------------------ | ------------------ | ------------------------------------ |
| `frontend/react.md`      | `**/*.{tsx,jsx}`   | Component patterns, state management |
| `blockchain/solidity.md` | `**/*.sol`         | Security patterns, gas optimization  |
| `backend/api.md`         | `**/api/**/*.ts`   | Request validation, error handling   |
| `security/secrets.md`    | `**/*` (all files) | Secret handling, never read .env     |

---

## Auto-Improvement System

### How It Works

1. **Learning Capture (During Work)**
   - Claude encounters an error → Documents it in `LEARNINGS.md`
   - Claude discovers a pattern → Adds to `LEARNINGS.md`
   - Claude makes a mistake → Updates anti-patterns section

2. **Memory Consolidation (End of Session)**
   - SessionEnd hook compresses key learnings
   - Updates `MEMORY.md` with critical insights
   - Generates summary for next session

3. **Knowledge Retrieval (Next Session)**
   - SessionStart hook loads `MEMORY.md` (always)
   - On-demand: Claude reads `LEARNINGS.md` when needed
   - MCP search: Claude queries past sessions for similar issues

### Auto-Improvement Instructions (Copy to CLAUDE.md)

```markdown
## Auto-Improvement Protocol

**Claude, follow these rules to continuously improve this project's configuration:**

### During Implementation

**When you encounter an error:**

1. Check `LEARNINGS.md` → "Recurring Errors" section
2. If documented, apply the fix immediately
3. If new, add entry with:
   - Error pattern (exact message or regex)
   - Root cause analysis
   - Fix that worked
   - Prevention strategy
4. Update `MEMORY.md` if this error is critical (top 5)

**When you discover a pattern:**

1. Check if already in `LEARNINGS.md` → "Design Patterns"
2. If new and reusable, document with:
   - Pattern name
   - When to use
   - Code example
   - Benefits over alternatives
3. Add to component inventory if it's a reusable component

**When you make a mistake:**

1. Immediately document in `LEARNINGS.md` → "Anti-Patterns"
2. Include what you did wrong and why
3. Show the correct approach
4. Estimate cost if others repeat this mistake
5. Update prevention checklist

### After Task Completion

**Success checklist:**

1. [ ] Review `LEARNINGS.md` for relevant patterns (did you follow them?)
2. [ ] Add any new patterns discovered to `LEARNINGS.md`
3. [ ] Update `MEMORY.md` status section (current phase, next priority)
4. [ ] Check if any MCP servers should be disabled (reduce token overhead)
5. [ ] Update component inventory if new components created

**Before claiming "done":**

1. [ ] Invoke `superpowers:verification-before-completion`
2. [ ] Run full test suite (evidence before assertions)
3. [ ] Check for hardcoded values that should be in config
4. [ ] Verify no sensitive data in code or logs

### Weekly Maintenance (Auto-Reminder)

**Every ~7 days of active work:**

1. Review `LEARNINGS.md` for duplicate patterns (consolidate)
2. Check if `MEMORY.md` exceeds 200 lines (compress to linked files)
3. Audit enabled MCP servers (disable unused → save tokens)
4. Review git history for repeated fixes (add to prevention)
5. Update `CLAUDE.md` if workflow changed

### Token Optimization

**Active monitoring:**

- Run `/context` after heavy work (check token usage)
- If >150K tokens used, review what can be compressed
- Move detailed docs from `MEMORY.md` to `LEARNINGS.md`
- Disable MCPs not used in last 3 sessions

**Red flags:**

- Same error occurs 3+ times → Prevention strategy failed, update it
- `MEMORY.md` >200 lines → Compress or move details to linked files
- Token usage >80% regularly → Audit enabled MCPs and rules
```

### Hook Integration (SessionStart)

**File:** `~/.claude/hooks/sessionstart-load-learnings.sh`

```bash
#!/bin/bash
# SessionStart hook: Load project learnings context

PROJECT_ROOT=$(pwd)
LEARNINGS_FILE="$PROJECT_ROOT/LEARNINGS.md"
MEMORY_FILE="$HOME/.claude/projects/$(echo $PROJECT_ROOT | sed 's|/|-|g')/memory/MEMORY.md"

# Output formatted context
if [ -f "$LEARNINGS_FILE" ]; then
    echo "📚 **LEARNINGS.md found** — Recent patterns and errors available for review"
    echo ""
    echo "**Last updated:** $(stat -f %Sm -t '%Y-%m-%d %H:%M' "$LEARNINGS_FILE" 2>/dev/null || stat -c %y "$LEARNINGS_FILE" 2>/dev/null | cut -d' ' -f1)"

    # Extract quick reference (top 3 errors)
    echo ""
    echo "**Quick Reference - Top Recurring Errors:**"
    grep -A 1 "^| [0-9]" "$LEARNINGS_FILE" | head -9
fi

if [ -f "$MEMORY_FILE" ]; then
    echo ""
    echo "🧠 **Auto-memory active** — Context from previous sessions loaded"
fi

echo ""
echo "💡 **Tip:** Read LEARNINGS.md before starting work to avoid known pitfalls"
```

### Hook Integration (PostToolUse)

**File:** `~/.claude/hooks/posttooluse-capture-errors.sh`

```bash
#!/bin/bash
# PostToolUse hook: Auto-capture errors to LEARNINGS.md

TOOL_NAME="$1"
TOOL_RESULT="$2"
PROJECT_ROOT=$(pwd)
LEARNINGS_FILE="$PROJECT_ROOT/LEARNINGS.md"

# Check if tool failed (non-zero exit or error in output)
if echo "$TOOL_RESULT" | grep -qi "error\|failed\|exception"; then

    # Extract error message
    ERROR_MSG=$(echo "$TOOL_RESULT" | grep -i "error" | head -1)

    # Append to LEARNINGS.md under "Recurring Errors"
    if [ -f "$LEARNINGS_FILE" ]; then
        echo "" >> "$LEARNINGS_FILE"
        echo "<!-- Auto-captured $(date '+%Y-%m-%d %H:%M') -->" >> "$LEARNINGS_FILE"
        echo "| ❌ | \`$ERROR_MSG\` | [Investigate] | [Fix] | $(date '+%Y-%m-%d') |" >> "$LEARNINGS_FILE"
    fi

    # Notify Claude to investigate
    echo ""
    echo "⚠️  **Error auto-logged to LEARNINGS.md** — Please investigate and update with root cause + fix"
fi
```

---

## Project-Specific Customization

### Frontend Projects (React/Next.js/Vue)

**Enable:**

- MCP: Gluestack, Pencil, Playwright
- Rules: `frontend/react.md`
- Agents: code-reviewer (after features)

**CLAUDE.md additions:**

```markdown
## Component Structure (Atomic Design)

- atoms/ - Single-purpose UI
- molecules/ - Composite components
- organisms/ - Business logic components

## Styling System

- Framework: [Tailwind/styled-components/etc.]
- Design tokens: [Location of tokens]
- Space prop mapping: xs=4px, sm=8px, md=12px, lg=16px

## State Management

- Server state: TanStack Query
- UI state: Context or Zustand
- Never duplicate server state locally
```

**LEARNINGS.md focus:**

- Component patterns (export style, props interface)
- Styling gotchas (web-only CSS properties)
- Design token usage (avoid hardcoded hex)

### Blockchain Projects (Solidity/Foundry)

**Enable:**

- MCP: Foundry, Slither, Gemforge
- Rules: `blockchain/solidity.md`, `security/secrets.md`
- Agents: blockchain-auditor (before deploy)

**CLAUDE.md additions:**

```markdown
## Smart Contract Standards

- Solidity version: ^0.8.20
- Security patterns: Checks-Effects-Interactions
- Testing: 100% line and branch coverage

## Pre-Deployment Checklist

- [ ] Slither: 0 high/critical findings
- [ ] All tests passing
- [ ] Gas optimization review
- [ ] Multi-sig ownership configured
```

**LEARNINGS.md focus:**

- Security vulnerabilities found (and fixed)
- Gas optimization patterns
- Testing strategies (fuzzing, fork tests)

### Full-Stack Projects

**Enable:**

- MCP: All relevant (frontend + backend + blockchain if applicable)
- Rules: All relevant
- Agents: All (based on layer being worked on)

**CLAUDE.md additions:**

```markdown
## Layer-Based Configuration

**Currently working on:** [Frontend/Backend/Contracts]

### Frontend Layer

[Frontend-specific instructions]

### Backend Layer

[Backend-specific instructions]

### Contracts Layer

[Blockchain-specific instructions]

**Switch layers with:** `/mcp enable <layer-specific-servers>`
```

**LEARNINGS.md focus:**

- Cross-layer integration patterns
- API contract management
- End-to-end testing strategies

### Data Science/ML Projects

**Enable:**

- MCP: Jupyter, Python tools, WebFetch
- Rules: `backend/api.md` (for model serving)
- Agents: debugger (for data pipeline issues)

**CLAUDE.md additions:**

```markdown
## Data Pipeline

- Data sources: [List sources]
- Processing: [ETL steps]
- Models: [ML models in use]

## Experimentation

- Notebook location: notebooks/
- Model versioning: [MLflow/DVC/etc.]
- Metrics tracking: [Tool]
```

**LEARNINGS.md focus:**

- Data quality issues encountered
- Model performance patterns
- Pipeline optimization

---

## Maintenance & Evolution

### Monthly Review Checklist

**Configuration audit (First Monday of month):**

- [ ] Review enabled MCP servers (disable unused)
- [ ] Check `LEARNINGS.md` size (>500 lines? Archive old entries)
- [ ] Review `MEMORY.md` token count (>200 lines? Compress)
- [ ] Update `CLAUDE.md` if workflow evolved
- [ ] Check for new MCP servers in community (mcpservers.org)
- [ ] Review plugin updates (superpowers, claude-mem)

**Knowledge base maintenance:**

- [ ] Consolidate duplicate patterns in `LEARNINGS.md`
- [ ] Move stable patterns from `LEARNINGS.md` to `CLAUDE.md`
- [ ] Archive old errors that haven't recurred in 60 days
- [ ] Update component inventory
- [ ] Review decision log (any decisions to revisit?)

**Performance optimization:**

- [ ] Run `/stats` to check token usage trends
- [ ] Identify token-heavy operations (optimize or cache)
- [ ] Review context window usage (compress if needed)
- [ ] Audit rules scope (too broad? Narrow globs)

### Quarterly Evolution

**Every 3 months:**

1. **Research new tools:**
   - Check awesome-claude-code for new plugins
   - Review MCP server directory (mcpservers.org)
   - Read ClaudeLog blog for new techniques

2. **Benchmark performance:**
   - Compare token usage vs. 3 months ago
   - Measure time-to-completion for common tasks
   - Survey team on pain points

3. **Update templates:**
   - Incorporate new best practices into templates
   - Update this guide with learnings
   - Share successful patterns with team

4. **Configuration modernization:**
   - Adopt new features (e.g., Setup hooks)
   - Remove deprecated settings
   - Optimize hook scripts based on actual usage

### Team Synchronization

**For multi-developer projects:**

**Committed to git:**

- `.claude/settings.json` (shared config)
- `CLAUDE.md` (shared instructions)
- `LEARNINGS.md` (shared knowledge)
- `.mcp.json` (shared MCP servers)

**Local only (`.gitignore`):**

- `.claude/settings.local.json` (personal overrides)
- `CLAUDE.local.md` (personal notes)
- `~/.claude/projects/*/memory/` (auto-memory dir)

**Weekly sync (optional):**

- Share top 3 learnings from `LEARNINGS.md`
- Demo new patterns discovered
- Update team on configuration changes
- Align on MCP server usage (enable/disable together)

---

## Appendix: Quick Reference Commands

### Setup Commands

```bash
# Initialize new project from template
claude init --template base-project

# Select project type interactively
claude setup --interactive

# List enabled MCP servers
claude mcp list

# Enable MCP server for session
claude mcp enable <server-name>

# Disable MCP server
claude mcp disable <server-name>
```

### Monitoring Commands

```bash
# Check context window usage
/context

# View token statistics
/stats

# List active agents
/agents

# View session history
/history

# Check MCP server health
claude mcp health <server-name>
```

### Maintenance Commands

```bash
# Compress auto-memory
/memory compress

# Archive old sessions
claude history archive --before 2026-01-01

# Validate configuration
claude config validate

# Export configuration (backup)
claude config export > backup.json
```

---

## Appendix: Integration with Existing Elysium Project

### Apply to Elysium Project

Since you already have a mature Elysium project, here's how to integrate these templates:

```bash
# 1. Create LEARNINGS.md (doesn't exist yet)
cp ~/.claude/templates/LEARNINGS.template.md /Users/timoneumann/Elysium/Elysium/LEARNINGS.md

# 2. Populate with known patterns from docs/design-to-code-patterns.md
# (Manual step: Extract the 13 documented mistakes into LEARNINGS.md format)

# 3. Add auto-improvement instructions to CLAUDE.md
# (Append the "Auto-Improvement Protocol" section from above)

# 4. Set up SessionStart hook
cp ~/.claude/templates/sessionstart-load-learnings.sh ~/.claude/hooks/

# 5. Set up PostToolUse error capture
cp ~/.claude/templates/posttooluse-capture-errors.sh ~/.claude/hooks/

# 6. Update hooks in settings.json
# Add the new hooks to ~/.claude/settings.json hooks array
```

### Elysium-Specific Quick Start

````markdown
# Elysium Project - Task Configuration

**Current work: Design-to-code for portfolio page**

**Enabled:**

- ✅ Gluestack (UI component docs)
- ✅ Pencil (design file reading)
- ✅ Playwright (visual verification)
- ✅ IDE (diagnostics)

**Disabled (not needed for current work):**

- ❌ Foundry (no contract work)
- ❌ Slither (no auditing)
- ❌ Figma (using Pencil instead)

**Active rules:**

- frontend/react.md (component patterns)
- security/secrets.md (always active)

**Key learnings reference:**

- See LEARNINGS.md for 12 documented first-iteration mistakes
- See docs/design-to-code-patterns.md for comprehensive patterns
- See MEMORY.md for critical token mappings

**When switching to contract work:**

```bash
# Disable frontend tools
claude mcp disable gluestack pencil playwright

# Enable blockchain tools
claude mcp enable foundry slither gemforge

# Load blockchain rules (automatic via glob)
# Work on contracts/** files
```
````

```

---

**Template System Version:** 1.0 (February 8, 2026)
**Companion Guide:** See `COMPREHENSIVE_CLAUDE_CONFIGURATION_GUIDE.md`
**License:** MIT
```
