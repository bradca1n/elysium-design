# Role Profile Template

Use this format when creating new role profiles in `claude_context/roles/`.

## Format

```markdown
# Role: [Name]

<!-- ~NNN tokens -->

## When to Activate
[Trigger conditions — what directories, file types, or task descriptions activate this role]

## MCP Servers
| Server | Status | Token Cost | Reason |
|--------|--------|-----------|--------|
| [name] | ENABLE/DISABLE | ~N,NNN | [why] |

## Plugins
| Plugin | Status | Reason |
|--------|--------|--------|
| [name] | ENABLE/DISABLE | [why] |

## Skills
- [skill name] — [when to use it]

## Agents
- [agent type] — [when to use it]

## Context Files to Read (in order)
1. `claude_context/[path]` — [why]
2. `claude_context/[path]` — [why]

## Error Catalog
Read `claude_context/errors/[role].md` before starting work.

## Output Expectations
- Code: [where it goes, what patterns to follow]
- Reports: [use templates/report.md, store in reports/]
- Plans: [use templates/plan.md, store in docs/plans/]

## Role-Specific Rules
1. [Rule beyond universal rules]
2. [Rule beyond universal rules]

## Token Budget
- MCP overhead: ~NNK tokens (N%)
- Plugin overhead: ~NK tokens (N%)
- Context files: ~NK tokens (N%)
- **Available for work: ~NNNK tokens (N%)**

## Self-Improvement
After completing work in this role:
1. [What to update in claude_context/]
2. [What to update in claude_context/]
```
