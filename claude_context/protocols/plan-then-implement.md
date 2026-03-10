# Protocol: Plan Then Implement

<!-- ~500 tokens -->

## When to Use
- Multi-step tasks (3+ steps)
- Architectural decisions needed
- Multiple valid approaches exist
- Changes span multiple files

## When to Skip
- Single-file fixes
- Obvious bug fixes with clear solution
- Tasks with very specific instructions

## Workflow

### 1. Enter Plan Mode
Call `Skill(skill="writing-plans")` as a tool call. This is NOT optional for multi-step tasks.

### 2. Explore
- Read relevant code using Glob, Grep, Read
- Understand existing patterns and architecture
- Check `claude_context/` for relevant context

### 3. Design
- Identify affected files
- Choose approach (simplest that works)
- Consider risks and edge cases

### 4. Write Plan
Store at `docs/plans/YYYY-MM-DD-title.md` using `claude_context/templates/plan.md` format.

### 5. Get Approval
Use `ExitPlanMode` to present plan to user.

### 6. Implement
- Follow the plan step by step
- Call `Skill(skill="executing-plans")` or `Skill(skill="subagent-driven-development")` as tool calls
- For parallel tasks, call `Skill(skill="dispatching-parallel-agents")` as a tool call

### 7. Verify
- Use `superpowers:verification-before-completion`
- Run tests, check all files exist, verify cross-links

## The Superpowers Workflow Chain (each = actual `Skill` tool call)
For full implementation tasks:
```
Skill("brainstorming") → Skill("using-git-worktrees") → Skill("writing-plans") →
  Skill("subagent-driven-development") OR Skill("executing-plans") →
  Skill("requesting-code-review") → Skill("verification-before-completion") →
  Skill("finishing-a-development-branch")
```
Every arrow (→) requires the Inter-Phase Checkpoint from CLAUDE.md before proceeding.
