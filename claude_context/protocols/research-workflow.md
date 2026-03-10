# Protocol: Research Workflow

<!-- ~500 tokens -->

## When to Use
- Gathering external information (regulations, competitors, technology)
- Summarizing complex topics for team reference
- Investigating solutions or approaches

## Workflow

### 1. Check Existing Research
Read `claude_context/INDEX.md` Reports table. Don't duplicate existing work.

### 2. Define Scope
- What question are we answering?
- What sources are relevant?
- What format should the output take?
- For medium/deep research, INVOKE `Skill(skill="brainstorming")` to scope before gathering. See CLAUDE.md Workflow Gate.
- **Research Depth:**
  - **Light** (1-3 sources): Confirming known facts, quick lookups
  - **Medium** (3-7 sources): Comparative analysis, feature research
  - **Deep** (7+ sources): Market research, regulatory analysis, architecture decisions

### 3. Gather Information
- Use `WebSearch` for current information
- Use `WebFetch` for specific URLs
- Use codebase search for internal context
- Cross-reference multiple sources

### 4. Synthesize
- Extract key findings (max 5 takeaways)
- Identify actionable items
- Note contradictions or uncertainties
- Include ALL source URLs

### 5. Write Report
Use `claude_context/templates/report.md` format.
Store at `claude_context/reports/YYYY-MM-DD-topic-slug.md`.

### 6. Update Index
Add entry to `claude_context/INDEX.md` Reports table:
```
| reports/YYYY-MM-DD-topic.md | YYYY-MM-DD | Topic | Key finding |
```

### 7. Cross-Reference
If findings affect existing context files:
- Update contradicted information with `<!-- Updated YYYY-MM-DD: reason -->` comment
- Add new domain knowledge to `domain/*.md` if broadly applicable

## Quality Checklist
- [ ] Executive summary is 2-3 sentences
- [ ] Key takeaways <= 5 items
- [ ] All external claims have source URLs
- [ ] Actionable items are specific checkboxes
- [ ] Report follows template format
- [ ] INDEX.md updated
