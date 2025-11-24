# Coding Standards

## Code Style - JavaScript

- Use ES modules (import/export)
- Prefer const/let over var
- Write async code with async/await
- Enforce linting (ESLint + Prettier)
- Use strict typing (TypeScript or JSDoc)
- Avoid global state; use scoped modules
- Prefer functional patterns over side effects
- Keep dependencies minimal and updated

## Svelte Guidelines (Svelte 5 with Runes)

- **ALWAYS use Svelte 5 runes syntax**: `$state()`, `$derived()`, `$effect()`, `$props()`
- **NEVER use old Svelte 4 patterns**: `let:`, `$:`, `onMount` with `$effect`
- **Component data patterns**:
  - Use `$effect()` for reactive side effects, NOT `onMount()` + `$effect()`
  - Use `$derived()` for computed values
  - Use `$state()` for local component state
- **Async $effect guidelines**:
  - Be careful with async `$effect()` - can cause infinite loops
  - Always include dependency checks: `if (condition) { await fetch... }`
  - Prefer component-level loading over reactive fetching when possible

## Anti-Patterns to Avoid

- **NEVER add functions without checking if they already exist**
  - ALWAYS search codebase first: `grep -r "functionName" src/`
  - Check existing exports in target file before adding new ones
- **NEVER mix Svelte 4 and Svelte 5 patterns**
  - Don't use `onMount()` when `$effect()` is already present
  - Don't use legacy reactive statements `$:` with runes
- **API integration patterns**:
  - Use `makeDemandQuery()` + `fetchDemandData()` for all demand data
  - Components should accept data as props OR fetch their own data
  - Always include loading states and error handling

## Code Style - Python

- Follow PEP 8 style guide
- Use type hints (PEP 484)
- Prefer f-strings for formatting
- Manage dependencies with pip-tools or poetry
- Use virtual environments
- Apply black/ruff for formatting and linting
- Write tests with pytest
- Keep functions small and single-responsibility

## Git Commit Guidelines

- **NEVER include references to Claude Code or AI assistance in commit messages**
- Commit messages should be professional and focus on the technical changes
- Use conventional commit format: `type(scope): description`
- Keep commit message body concise and factual
- Do NOT add "Co-Authored-By: Claude" or similar attributions

## Planning Guidelines

- **NEVER include time estimates in plans or documentation**
- Time estimates are unreliable and create false expectations
- Focus on clear task descriptions and success criteria
- Track progress through completion status (pending, in progress, complete)
- Break large tasks into smaller, well-defined steps
- Document what needs to be done, not how long it will take
