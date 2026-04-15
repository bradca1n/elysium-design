# Tools, Plugins & MCP Servers

<!-- ~800 tokens -->
<!-- Updated 2026-02-09: Two-layer system — aliases (toolkits) + roles (behavior). -->

## Two-Layer Architecture

```
Layer 1: Shell Alias (what tools are available)
  claude-contracts  →  loads slither, foundry, openzeppelin + building-secure-contracts plugin

Layer 2: Role Profile (how Claude behaves)
  roles/blockchain.md  →  write code, run tests, emit events
  roles/auditor.md     →  read-only, document findings, run Slither
```

**Aliases are domain toolkits** — they load everything that *might* be needed for a domain.
**Role profiles are behavioral rules** — Claude picks one based on the task, not the alias.
Multiple roles can share the same alias (e.g., blockchain dev + auditor both use `claude-contracts`).

## Pre-Session Flow

1. `cd` to the Elysium repo root
2. Run a role alias — it configures **both** MCP servers and plugins automatically:

```bash
claude-contracts    # slither, foundry, openzeppelin  + building-secure-contracts plugin
claude-frontend     # pencil, gluestack, playwright, context7
claude-backend      # context7, aws-serverless
claude-infra        # aws-serverless, aws-iac, mermaid
claude-full         # context7, design-patterns, mermaid
claude-finance      # finance plugin (no extra MCPs)
claude              # No extra MCPs or plugins (default)
```

### How It Works

The aliases call `claude-role <name>` (defined in `~/.zshrc`) which:
1. Toggles optional plugins in `~/.claude/settings.json`
2. Launches Claude with `--mcp-config ./.mcp-<domain>.json`

Config files live in the repo root: `.mcp-blockchain.json`, `.mcp-frontend.json`, etc.
**No `.mcp.json`** — renamed to `.mcp-all-reference.json` (reference only, not auto-loaded).
Settings file: `~/.claude/settings.json` (global, shared across projects).

## Global (always available, every session)

| Type | Name | What It Does |
|------|------|-------------|
| Plugin | **superpowers** | 14 workflow skills (TDD, planning, debugging, code review) |
| Plugin | **claude-mem** | Persistent cross-session memory (search, timeline, observations) |
| MCP | **sequential-thinking** | Step-by-step reasoning for complex decisions |
| Built-in | **WebSearch, WebFetch** | Web research |
| Built-in | **Read/Write/Edit/Glob/Grep** | File operations |
| Built-in | **Bash, Task, ToolSearch** | Shell, subagents, tool discovery |
| Context | **CLAUDE.md** | Project rules, role adoption, self-improvement |
| Context | **errors/GENERAL.md** | Cross-cutting mistake patterns |

## Domain Toolkits (set by aliases)

| Alias | MCP Servers | Extra Plugins |
|-------|-----------|---------------|
| `claude-contracts` | slither, foundry, openzeppelin | building-secure-contracts |
| `claude-frontend` | pencil, gluestack, playwright, context7 | — |
| `claude-backend` | context7, aws-serverless | — |
| `claude-infra` | aws-serverless, aws-iac, mermaid | — |
| `claude-full` | context7, design-patterns, mermaid | — |
| `claude-finance` | — | finance |

## Role Profiles (loaded by Claude at runtime)

Claude reads `CLAUDE.md` → matches task to role → loads the role's context files:

| Role | Alias(es) | Context Files Loaded |
|------|----------|---------------------|
| **blockchain.md** | `claude-contracts` | errors/blockchain.md, technical/SMART_CONTRACTS.md, contracts/CLAUDE.md, patterns/blockchain.md, audits/AUDIT_STATUS.md |
| **auditor.md** | `claude-contracts` | audits/AUDIT_STATUS.md, audits/SECURITY_AUDIT.md, technical/SMART_CONTRACTS.md, contracts/CLAUDE.md, errors/blockchain.md |
| **frontend.md** | `claude-frontend` | errors/frontend.md, technical/FRONTEND.md, patterns/frontend.md, protocols/design-to-code.md |
| **backend.md** | `claude-backend` | errors/backend.md, technical/BACKEND.md, technical/DATA_LAYER.md, patterns/backend.md |
| **researcher.md** | any | errors/GENERAL.md, product/OVERVIEW.md, domain/*, reports/ |
| **fullstack.md** | `claude-full` | errors/GENERAL.md, technical/ARCHITECTURE.md, + domain-specific as needed |
| **context-improver.md** | any | INDEX.md, recommendations/tool-gaps.md, all roles, all errors, all patterns |

## All MCP Servers (reference)

| Server | What It Does |
|--------|-------------|
| **slither** | Static analysis, vulnerability detection |
| **foundry** | Forge/Cast/Anvil: compile, test, deploy |
| **openzeppelin** | Contract patterns and generators |
| **pencil** | Design editor for .pen files (design-to-code) |
| **gluestack** | UI component library docs |
| **playwright** | E2E testing, visual verification |
| **context7** | Up-to-date library documentation |
| **mermaid** | Architecture diagrams, flowcharts (free, local browser) |
| **design-patterns** | 642+ software patterns, semantic search |
| **aws-serverless** | SAM, Lambda, event source mappings |
| **aws-iac** | CDK + CloudFormation assistance |
| **financial-datasets** | Stock prices, SEC/EDGAR data (needs API key from financialdatasets.ai) |

### Plugins (reference)

| Plugin | Behavior | What It Does |
|--------|----------|-------------|
| **superpowers** | Always ON | 14 workflow skills |
| **claude-mem** | Always ON | Cross-session memory |
| **building-secure-contracts** | ON with `claude-contracts` | 11 Trail of Bits blockchain security skills |
| **finance** | ON with `claude-finance` | Journal entries, reconciliation, SOX compliance |

### Security (CLI tool, not MCP)
| Tool | Run Command |
|------|-------------|
| **mcp-scan** | `uvx mcp-scan scan` |

## Discovery Resources

- **[mcpservers.org](https://mcpservers.org)** — Curated MCP server directory
- **[pulsemcp.com](https://pulsemcp.com)** — 8,250+ MCP servers, weekly newsletter
- **[smithery.ai](https://smithery.ai)** — MCP registry with CLI installer
- **[claude-plugins.dev](https://claude-plugins.dev)** — Community plugin registry
- **[GitHub: awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)** — Curated skills, hooks, plugins
