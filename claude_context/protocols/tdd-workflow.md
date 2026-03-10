# Protocol: Test-Driven Development

<!-- ~600 tokens -->

## When to Use
- Implementing new features (any domain)
- Fixing bugs with reproducible test cases
- Adding to existing test suites

## The Cycle

### 1. Red — Write Failing Tests First
- Write tests that describe the desired behavior
- Run tests to confirm they FAIL (this proves the test is testing something)
- INVOKE via tool call: `Skill(skill="test-driven-development")` — do NOT just describe in text (see E-G13)

### 2. Green — Minimal Implementation
- Write the minimum code to make tests pass
- Do NOT optimize or refactor yet
- Run tests to confirm they PASS

### 3. Refactor — Clean Up
- Improve code quality while keeping tests green
- Extract shared logic, improve naming, simplify
- Run tests after each refactor step

## Domain-Specific Testing

### Smart Contracts
- 100% line coverage, 100% branch coverage required
- Fuzz testing for math operations
- Fork testing for mainnet integrations
- Run: `forge test -vv` (verbose), `forge coverage -vv`
- See `contracts/CLAUDE.md` for test helpers cheat sheet

### Frontend
- Component tests with reasonable coverage
- Visual verification for UI changes
- Run: `npx vitest` or `yarn turbo test`

### Backend
- API endpoint tests with all status codes
- Database transaction tests
- Run: `npx vitest` or `yarn turbo test`

## Skills to INVOKE (via Skill tool — see E-G13)
- `Skill(skill="test-driven-development")` — Enforces the red-green-refactor cycle
- `Skill(skill="tools:tdd-red")` — Write comprehensive failing tests
- `Skill(skill="tools:tdd-green")` — Implement minimal passing code
- `Skill(skill="tools:tdd-refactor")` — Refactor with test safety net
- `Skill(skill="workflows:tdd-cycle")` — Full orchestrated TDD workflow
