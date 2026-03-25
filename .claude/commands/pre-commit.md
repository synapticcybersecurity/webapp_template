# Pre-Commit Validation

Perform comprehensive validation before allowing commits to ensure code quality, security, and completeness.

## What This Command Does

This command acts as a gatekeeper for commits. It:

1. **Checks what's staged** for commit
2. **Scans for sensitive files** (.env, secrets, keys)
3. **Detects hardcoded secrets** in staged code
4. **Runs linting** on changed files
5. **Checks formatting** (offers auto-fix)
6. **Runs type checking** (if applicable)
7. **Executes tests** (all or affected tests)
8. **Validates test coverage** (maintains or improves)
9. **Checks for debug statements** (console.log, print, etc.)
10. **Validates commit message** quality
11. **Updates TODO list** (if used)
12. **Provides clear pass/fail** with actionable feedback

**IMPORTANT**: This command is strict but helpful. It blocks for critical issues but warns for non-critical ones. Auto-fix is offered when possible.

## Pre-Commit Validation Workflow

### 1. Initial Checks

**Check what's staged:**

```bash
# Get staged files
git diff --cached --name-only

# Check if there are any staged changes
git diff --cached --quiet
```

If nothing staged:

- Inform user: "No changes staged for commit"
- Exit early

### 2. File-Level Checks

#### Sensitive Files (BLOCK)

**Block commit if these are staged:**

- `.env` (should be in .gitignore)
- `secrets.yml`
- `credentials.json`
- `*.pem`, `*.key`, `*.crt`
- `config.production.yml` (if contains secrets)

**Action**: Remove from staging, add to .gitignore

#### Large Files (WARN)

**Check file sizes:**

```bash
git diff --cached --name-only | xargs ls -lh
```

**Warn if files > 10MB:**

- Binary files should use Git LFS
- Log files shouldn't be committed
- Database dumps shouldn't be committed

#### Unintended Files (BLOCK)

**Common mistakes:**

- `node_modules/` files
- `__pycache__/` or `.pyc` files
- Build artifacts (`dist/`, `build/`)
- `.DS_Store`, `Thumbs.db`
- Editor temp files (`.swp`, `.swo`)

**Action**: Remove from staging, update .gitignore

### 3. Security Scan

**Run secret detection on staged files only:**

```bash
# Get staged files
git diff --cached --name-only

# Scan each for secrets
grep -n "API[-_]KEY\|SECRET\|PASSWORD\|TOKEN\|PRIVATE[-_]KEY" [files]
```

**Look for patterns:**

```regex
# API Keys (20+ characters)
[aA][pP][iI][-_]?[kK][eE][yY]\s*=\s*['"]\w{20,}['"]

# AWS Access Keys
AKIA[0-9A-Z]{16}

# Private Keys
-----BEGIN (RSA |EC )?PRIVATE KEY-----

# JWT tokens
eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+

# Database URLs with credentials
(postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@
```

**Exceptions (don't flag):**

- Lines in `.env.example` (template file)
- Comments explaining what keys are needed
- Variable names without values
- Test fixtures with obvious fake data

**If secrets found:**

- **BLOCK COMMIT**
- Show exact location
- Explain why it's dangerous
- Suggest moving to environment variables

### 4. Linting

**Detect language and run appropriate linter on staged files:**

#### Python

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs ruff check
```

**Block on:**

- Syntax errors
- Undefined variables
- Import errors

**Warn on:**

- Style violations
- Unused imports
- Line length

#### JavaScript/TypeScript

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.\(js\|jsx\|ts\|tsx\)$' | xargs npx eslint
```

**Block on:**

- Syntax errors
- Undefined variables
- Type errors (TypeScript)

**Warn on:**

- Console.log statements
- Style violations
- Unused variables

#### Go

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.go$' | xargs gofmt -l
git diff --cached --name-only --diff-filter=ACM | grep '\.go$' | xargs go vet
```

**Block on:**

- Syntax errors
- Unformatted code (gofmt)
- go vet errors

#### Rust

```bash
cargo fmt -- --check
cargo clippy -- -D warnings
```

**Block on:**

- Syntax errors
- Clippy errors
- Unformatted code

### 5. Formatting

**Check if files are properly formatted:**

#### Python

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs black --check
```

#### JavaScript/TypeScript

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.\(js\|jsx\|ts\|tsx\)$' | xargs npx prettier --check
```

#### Go

```bash
git diff --cached --name-only --diff-filter=ACM | grep '\.go$' | xargs gofmt -l
```

#### Rust

```bash
cargo fmt -- --check
```

**If formatting issues found:**

- **Offer to auto-fix**
- Don't block, but strongly recommend fixing

### 6. Type Checking

**For statically typed or type-hinted code:**

#### Python (with type hints)

```bash
mypy [staged .py files]
```

#### TypeScript

```bash
npx tsc --noEmit
```

**Block on:**

- Type errors
- Missing required type annotations (if strict mode)

**Warn on:**

- Use of `any` type
- Implicit any

### 7. Tests

**Run tests related to changed code:**

#### Python

```bash
# Run all tests
pytest

# With coverage on changed files
pytest --cov=[changed modules] --cov-fail-under=70
```

#### JavaScript/TypeScript

```bash
# Run tests
npm test

# With coverage
npm test -- --coverage --changedSince=HEAD
```

#### Go

```bash
# Run all tests
go test ./...

# Or specific packages
go test [changed packages]
```

#### Rust

```bash
cargo test
```

**Block on:**

- Test failures
- Newly failing tests
- Critical code without tests

**Warn on:**

- Coverage decrease
- Skipped tests
- Slow tests (> 1 minute total)

**Performance consideration:**

- For large test suites, only run affected tests
- Offer to skip tests if user is in a hurry (but warn!)

### 8. Documentation

**Check for documentation updates:**

#### New functions/classes without docstrings

**Warn if:**

- New public functions lack docstrings
- New classes lack docstrings
- Complex logic lacks comments

#### README updates

**If code changes affect:**

- API endpoints (check if README/docs updated)
- Configuration (check if .env.example updated)
- Installation (check if setup docs updated)

**Prompt user:**
"I noticed you added a new API endpoint. Should the README be updated?"

### 9. Git Message Validation

**Check commit message quality:**

**Good format:**

```
<type>: <short summary>

<optional detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**

- feat, fix, docs, style, refactor, test, chore, security, perf

**Validate:**

- Message is not empty
- Message is descriptive (not "fix" or "wip")
- First line is < 72 characters (recommended)
- Type prefix present (recommended)

**If poor message:**

- Suggest improvements
- Don't block (user's choice)

### 10. TODO List Check

**Verify TODO list is up-to-date:**

**Check if:**

- TODO list was used during session
- Current task marked as completed
- No tasks still marked as in_progress

**If TODO list exists and task not completed:**

- **Ask**: "Should I mark the current task as completed?"
- **Update** TODO list if user confirms

### 11. Dependency Updates

**If dependency files changed:**

#### Python

- `requirements.txt` or `pyproject.toml` changed
- Check if `pip install` needed
- Check for security vulnerabilities: `pip-audit`

#### JavaScript

- `package.json` or `package-lock.json` changed
- Check if `npm install` needed
- Run `npm audit`

#### Go

- `go.mod` or `go.sum` changed
- Run `go mod download` if needed
- Run `govulncheck`

#### Rust

- `Cargo.toml` changed
- Run `cargo build` if needed
- Run `cargo audit`

**Warn if vulnerabilities found.**

## Validation Results and Actions

### Critical Issues (Block Commit)

**Block if any of these found:**

1. Secrets/credentials in code
2. Sensitive files staged (.env, keys)
3. Syntax errors
4. Failing tests
5. Undefined variables/imports
6. Type errors (if type checking enabled)

**Action:**

```
❌ COMMIT BLOCKED

Critical issues found:
1. [Issue type]: [Description]
   Location: [file:line]
   Fix: [Suggestion]

Please fix these issues before committing.

Commands to run:
  [Fix command 1]
  [Fix command 2]
```

### High Priority (Warn but Allow)

**Warn if found:**

1. Formatting issues
2. Unused imports/variables
3. Console.log or debug statements
4. Missing documentation
5. Coverage decrease
6. Code complexity issues

**Action:**

```
⚠️  WARNING

High-priority issues found (commit allowed but not recommended):
1. [Issue type]: [Description]
   Location: [file:line]
   Fix: [Suggestion]

Proceed with commit? (yes/no)
```

### Medium Priority (Inform)

**Inform if found:**

1. Style violations (minor)
2. Long lines
3. Minor linting warnings

**Action:**

```
ℹ️  INFO

Minor issues found (FYI):
- [X] formatting issues
- [X] style warnings

These can be fixed later.
```

## Auto-fix Options

**Offer to automatically fix:**

### Formatting

```
Found [X] formatting issues. Auto-fix?
  black .               # Python
  prettier --write .    # JavaScript
  gofmt -w .           # Go
  cargo fmt            # Rust
```

### Unused Imports

```
Found [X] unused imports. Auto-fix?
  ruff check --fix .           # Python
  eslint --fix .               # JavaScript
```

### Add to .gitignore

```
.env is staged but shouldn't be committed. Auto-fix?
  git reset .env
  echo ".env" >> .gitignore
  git add .gitignore
```

## Report Format

````markdown
# Pre-Commit Validation Report

**Date**: [Date]
**Branch**: [branch name]
**Files Changed**: [count]

---

## ✓ Passed Checks

- [✓] No sensitive files staged
- [✓] No secrets detected
- [✓] Linting passed
- [✓] Formatting correct
- [✓] Type checking passed
- [✓] All tests passed (32/32)
- [✓] Test coverage maintained (85%)
- [✓] Documentation updated

---

## ⚠ Warnings

[Details if any]

---

## ❌ Blocking Issues

[Details if any]

---

## Summary

**Status**: [✓ PASSED / ⚠ WARNINGS / ❌ BLOCKED]

**Actions Required**:
[List if blocked]

**After Fixing**:

```bash
git commit
```
````

```

## Decision Logic

### When to Block

**Always block if:**
- Secrets detected in code
- .env or sensitive files staged
- Syntax errors
- Tests failing
- Undefined variables
- Critical security issues

### When to Warn

**Warn but allow if:**
- Formatting not perfect
- Minor linting warnings
- Unused imports
- Missing docstrings
- Debug statements
- Coverage decrease (< 5%)

### When to Inform

**Just inform if:**
- Very minor style issues
- Line length (slightly over)
- Successful auto-fixes applied
- All checks passed

## Performance Optimization

**For large codebases:**

1. **Only check staged files**, not entire codebase
2. **Run checks in parallel** where possible
3. **Skip slow checks** if user opts out
4. **Cache results** when possible

**Estimated times to report:**
```

Running pre-commit validation...
[=====> ] 30% (Linting complete - 2s)
[============> ] 60% (Tests running - 15s)
[===================> ] 95% (Security scan - 1s)
[=====================] 100% Complete (18s total)

```

## Questions to Ask User

1. **"Should I run the full test suite or only affected tests?"** (if large test suite)
2. **"Auto-fix formatting issues?"** (if formatting problems found)
3. **"Proceed with commit despite warnings?"** (if non-critical issues)
4. **"Should I update the TODO list?"** (if task related to commit)
5. **"Skip tests to commit faster?"** (not recommended, but sometimes needed)

## Success Criteria

Before allowing commit:
- [ ] No sensitive files staged
- [ ] No secrets detected
- [ ] No syntax errors
- [ ] Linting passed or only minor warnings
- [ ] Formatting checked
- [ ] Type checking passed (if applicable)
- [ ] Tests passed
- [ ] Coverage maintained
- [ ] Documentation updated (if needed)
- [ ] TODO list updated (if used)
- [ ] Commit message validated
- [ ] User informed of any warnings
- [ ] Auto-fix options offered
```
