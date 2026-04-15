<!-- ~2000 tokens -->
# General Error Catalog

Cross-cutting mistakes common to ALL roles. These apply regardless of whether you are working on frontend, backend, or blockchain code.

## E-G01: Creating New Files Instead of Editing Existing Ones
- **Pattern:** Agent creates a brand-new file (new component, new utility, new test) when the change should be made in an existing file.
- **Fix:** Always search the codebase first. Use Glob and Grep to find existing files that already handle the relevant concern. Edit those files instead of creating new ones.

## E-G02: Wrong Import Ordering
- **Pattern:** Imports are dumped in a single block with no blank-line separators and no alphabetical ordering within groups.
- **Fix:** Separate imports into groups (external libraries, internal packages, relative imports) with a blank line between each group. Alphabetize within each group.

## E-G03: Introducing Security Vulnerabilities
- **Pattern:** Unsanitized user input passed to SQL, HTML, or shell commands. XSS via dangerouslySetInnerHTML. Injection via string concatenation.
- **Fix:** Always sanitize and validate input. Use parameterized queries, Zod schemas, and framework-provided escaping. Never trust user input.

## E-G04: Over-Engineering Beyond What Was Asked
- **Pattern:** Agent adds features, abstractions, or generalizations that were not requested. Creates utility libraries, adds configuration options, or builds framework-level patterns when a simple direct solution suffices.
- **Fix:** Do exactly what was asked. Nothing more. If a simpler approach works, use it. Ask before adding scope.

## E-G05: Not Checking Existing Components/Libraries Before Building From Scratch
- **Pattern:** Agent writes a custom date formatter, a custom button component, or a custom error handler when the project already has one (or a dependency provides it).
- **Fix:** Before writing any utility or component, search the codebase for existing implementations. Check `package.json` / installed dependencies for libraries that already solve the problem.

## E-G06: Backwards-Compatibility Hacks
- **Pattern:** Agent renames unused variables with underscores, re-exports removed functions, or adds shim layers to avoid breaking callers of code that no longer exists or is not deployed.
- **Fix:** The protocol is not deployed. There are no external consumers. Delete dead code. Do not maintain backwards compatibility unless explicitly told to.

## E-G07: Missing `as any` on Web-Only CSS Properties
- **Pattern:** Using `backgroundImage`, `boxShadow`, `backdropFilter`, or other web-only CSS properties in the `style` prop without `as any`, causing TypeScript errors because React Native's `ViewStyle` type does not include them.
- **Fix:** Always cast web-only style objects with `as any`. Example: `style={{ backgroundImage: 'linear-gradient(...)' } as any}`.

## E-G08: Not Following Role Profile When Task Matches
- **Pattern:** Agent starts "improving context" or "doing research" without reading the matching role profile first (context-improver, researcher, etc.). Jumps straight into ad-hoc work instead of following the structured workflow.
- **Fix:** When a task maps to a role (see Context Lookup in CLAUDE.md), read that role profile FIRST and follow its workflow. The role exists because ad-hoc approaches miss steps.

## E-G09: Jumping to Execution Without Brainstorming or Planning
- **Pattern:** Agent receives a complex task and immediately starts executing (reading code, launching agents, writing output) without first brainstorming the approach, selecting tools/skills, or creating a plan. Misses available skills, uses suboptimal workflow.
- **Fix:** For ANY non-trivial task: (1) Invoke `brainstorming` skill to explore approach, (2) Select tools/skills explicitly, (3) Create a plan if task has 3+ steps. The CLAUDE.md workflow chain exists for a reason.

## E-G10: Not Using claude-mem to Search Past Context
- **Pattern:** Agent starts a task without searching claude-mem for related past work, prior decisions, or similar bug fixes. Repeats mistakes or misses context that was already discovered in a previous session.
- **Fix:** Before starting complex tasks, run `search(query="relevant topic")` via claude-mem MCP. Check for past audit findings, architectural decisions, and resolved issues.

## E-G11: Context Crash from Unmanaged Parallel Subagents
- **Pattern:** Parent session launches 5+ parallel subagents (e.g., audit agents, build agents). All agents return large results simultaneously. Parent context exceeds limit. `/compact` fails because there is no headroom to generate the summary. Session becomes unrecoverable — all unsaved work is lost.
- **Real incident:** V3 audit — 9 simultaneous subagent returns overflowed context; `/compact` failed, session lost.
- **Fix:**
  1. Instruct each subagent to **write detailed output to files** and return only a concise summary (max 2000 chars)
  2. Use `run_in_background: true` and collect results one at a time via `TaskOutput`
  3. Run `/compact` at ~90% context usage — BEFORE it's too late
  4. Save intermediate progress to claude-mem and disk at ~80% context usage
  5. Never launch new agents past 80% context — their return values will overflow
  6. Before launching parallel agents, estimate: `agent_count × ~3000 tokens` must fit in remaining context

## E-G12: Not Writing Intermediate Results to Disk
- **Pattern:** Agent accumulates findings, analysis, or decisions only in conversation context without writing to files. When context crashes or `/compact` runs, all intermediate work is lost.
- **Fix:** Write findings incrementally to files during long tasks. For audits, write each facet's findings as they complete. For research, write summaries after each major discovery. Disk persists across context crashes — conversation does not.

## E-G13: Performative Compliance — Describing Tool Use Without Invoking
- **Pattern:** Agent writes "Now let me invoke Skill('brainstorming')" or "I'll use the writing-plans skill" in its response text, but never actually calls the `Skill` tool. The workflow appears followed in the output but no skill was loaded or executed. This also applies to ToolSearch, MCP tools, and EnterPlanMode.
- **Real incident:** V3 audit mentioned skills 130+ times in text; `Skill` tool called 0 times.
- **Why this happens:** Claude treats "Invoke Skill('X')" in instructions as text to echo rather than as a tool call to make. The word "invoke" in natural language doesn't reliably trigger tool use.
- **Fix:**
  1. Instructions must use explicit syntax: `Skill(skill="name")` with the note "this means a tool call, not text"
  2. After completing a phase, verify: "Did I CALL the Skill tool, or did I just WRITE about it?"
  3. If you catch yourself writing a skill name in your response without a corresponding tool call, STOP and make the tool call

## E-G14: Skipping Plan Re-Read Between Phases
- **Pattern:** Agent executes phases sequentially without re-reading the plan file between them. Relies on memory of the plan, which drifts as context accumulates and compaction occurs. Details get forgotten or distorted after 50k+ tokens of intervening work.
- **Real incident:** V3 audit ran 6 phases without re-reading plan; missed openzeppelin tools and SECURITY_AUDIT.md.
- **Fix:** Between EVERY phase, call `Read("docs/plans/YYYY-MM-DD-*.md")` as an actual tool call. Do NOT rely on your memory of the plan — it was written hours ago and may have details you've forgotten. This is a Read tool call, not a claim in text.

## E-G15: Not Saving to claude-mem During Long Sessions
- **Pattern:** Agent runs a multi-phase task spanning 50k+ tokens without ever saving progress to claude-mem. When context crashes or compaction runs, recovery depends entirely on files written to disk. If any work existed only in conversation, it is permanently lost.
- **Real incident:** V3 audit had zero claude-mem saves; Phase 4 analysis lost on context crash. V4 audit had only 1 save (at the very end).
- **Fix:** After EVERY phase, save a 2-sentence summary to claude-mem. Format: "[Phase N] completed. [Key results]. [Finding count] findings written to [file path]." This creates recovery points that survive context crashes and compaction.

## E-G16: Subagent Instruction Chain Break
- **Pattern:** Parent delegates a phase to a subagent but forgets to include mandatory requirements (skill invocations, MCP tool calls, output format) in the subagent prompt. The subagent doesn't have the role profile or plan in its context, so requirements not explicitly stated are silently skipped.
- **Real incident:** V4 audit Phase 5 — subagent was told to "apply Trail of Bits methodology" but not instructed to call `Skill("building-secure-contracts:code-maturity-assessor")` or `mcp__openzeppelin__solidity-erc1155`. Both were skipped. No Echidna contract was created.
- **Why this happens:** The parent assumes the subagent "knows" the requirements from auditor.md or the plan. It doesn't — subagents start with zero context beyond their prompt.
- **Fix:**
  1. BEFORE writing any subagent prompt, read `claude_context/templates/audit-subagent-prompt.md`
  2. Include ALL mandatory requirements (file output, return limits, finding format)
  3. Include ALL phase-specific requirements (skills, MCP tools, deliverables)
  4. Do NOT assume the subagent "knows" what to do — it has zero context from your role profile

## E-G17: Batching Edits Without Intermediate Testing
- **Pattern:** Agent implements 5+ code changes across multiple files in a single pass, then runs tests only at the very end. When tests fail, it's unclear which edit caused the failure. Debugging takes longer than running tests between edits would have.
- **Real incident:** Critical findings remediation — Tasks 4-13 (10 edits across 8 source files) were applied sequentially without running `forge test` between them. 11 test failures at the end required a separate debug agent to untangle.
- **Why this happens:** Speed pressure ("Why are you so slow?") incentivizes batch editing. Each `forge test` run takes 30s, so 10 intermediate runs = 5 min overhead. But debugging 11 failures at the end took the agent 12 min.
- **Fix:**
  1. Test after each **cluster** of related edits (not each individual edit, but not all at once)
  2. Use `forge test --match-path` to run only affected test files (faster than full suite)
  3. Commit after each passing cluster — this creates safe rollback points
  4. If user requests speed: parallelize clusters via subagents, but still test within each

## E-G18: Role Context Lost After Compaction
- **Pattern:** Agent loads a role profile at session start. After context grows and `/compact` or session continuation runs, the role instructions are stripped from working memory. Agent continues execution but reverts to ad-hoc behavior — skipping gates, quality checks, and mandatory tool invocations that were in the role.
- **Real incident:** Critical findings remediation loaded fullstack role at session start. After compaction, compliance dropped from structured cluster-by-cluster execution to batch editing without testing. Overall compliance: 30%.
- **Why this happens:** Role profiles are loaded into conversation context, not persistent memory. Compaction preserves task summaries but not role instructions. The agent doesn't "know" it forgot the role.
- **Fix:**
  1. Roles with multi-phase workflows MUST include a POST-COMPACTION GATE section
  2. The gate instructs the agent to re-read the role file after any compaction
  3. Session continuation summaries should note which role was active and link to its file path
  4. Before starting work after compaction: `Read("claude_context/roles/[active-role].md")`

## E-G19: Repeated Structural Failure Across Sessions
- **Pattern:** The same compliance failure (e.g., "ToolSearch not called", "no git commits") occurs in 2+ separate sessions despite being documented as a requirement. Adding more warning text ("REQUIRED", "MUST", "CRITICAL") doesn't fix it.
- **Real incidents:** ToolSearch (0% in V1 and V2 remediation), git commits (0% in V1 and V2), verification-before-completion (0% in V1 and V2).
- **Why this happens:** Text-based requirements are processed once when read, then forgotten during execution. The agent's attention shifts to code implementation, and declarative requirements can't compete with procedural momentum.
- **Fix:**
  1. If a requirement fails in 2+ sessions, it MUST become a ⛔ GATE — not stronger text
  2. Gates work because they're encountered inline during workflow, not read once at the top
  3. Gate format: require the agent to PRODUCE EVIDENCE (paste output, list tools, show git log) rather than ASSERT COMPLIANCE (check a box)
  4. Delete the original text-based requirement to avoid the illusion that it's been addressed
