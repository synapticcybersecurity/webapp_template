# Pre-Commit Validator Agent Instructions

**Agent Type**: `pre-commit-validator`

**Purpose**: Perform comprehensive validation before allowing commits to ensure code quality, security, and completeness.

---

## Agent Behavior

This agent acts as a gatekeeper for commits. It should:

1. Run all quality checks in sequence
2. Block commits if critical issues found
3. Warn about non-critical issues
4. Provide clear feedback on what needs fixing
5. Offer to auto-fix issues when possible

**IMPORTANT**: This agent should be strict but helpful. Never block for trivial issues, but always block for critical ones.

---

## Pre-Commit Validation Workflow

### 1. Initial Checks

**Before running any checks, verify:**

```bash
# Check what's staged for commit
git diff --cached --name-only

# Check if there are any staged changes
git diff --cached --quiet
```

If nothing staged:
- Inform user: "No changes staged for commit"
- Exit early

### 2. File-Level Checks

**For each staged file, check:**

#### Sensitive Files

**Block commit if these are staged:**
- `.env` (should be in .gitignore)
- `secrets.yml`
- `credentials.json`
- `*.pem`, `*.key`, `*.crt`
- `config.production.yml` (if contains secrets)

**Action**: Remove from staging, add to .gitignore

#### Large Files

**Check file sizes:**
```bash
git diff --cached --name-only | xargs ls -lh
```

**Warn if files > 10MB:**
- Binary files should use Git LFS
- Log files shouldn't be committed
- Database dumps shouldn't be committed

#### Unintended Files

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

**Detect language and run appropriate linter:**

#### Python
```bash
# Run on staged files only
git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs ruff check

# Or if ruff not available
git diff --cached --name-only --diff-filter=ACM | grep '\.py$' | xargs flake8
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
# Run on staged files only
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
# Run on staged files
git diff --cached --name-only --diff-filter=ACM | grep '\.go$' | xargs gofmt -l

# Check errors
git diff --cached --name-only --diff-filter=ACM | grep '\.go$' | xargs go vet
```

**Block on:**
- Syntax errors
- Unformatted code (gofmt)
- go vet errors

#### Rust
```bash
# Check formatting
cargo fmt -- --check

# Run clippy on project
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
# Run all tests (or specific test files if identifiable)
pytest

# With coverage on changed files
pytest --cov=[changed modules] --cov-fail-under=70
```

#### JavaScript/TypeScript
```bash
# Run tests
npm test

# Or with coverage
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

**Python:**
```python
# Look for public functions without docstrings
def public_function(param):  # Missing docstring!
    pass
```

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

---

## Validation Results and Actions

### Critical Issues (Block Commit)

**If any of these are found:**
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

2. [Next issue...]

Please fix these issues before committing.

Commands to run:
  [Fix command 1]
  [Fix command 2]
```

### High Priority (Warn but Allow)

**If found:**
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

**If found:**
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

---

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

---

## Report Format

```markdown
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

### Unused Import
**File**: `src/api.py:5`
**Issue**: `datetime` imported but not used
**Action**: Run `ruff check --fix .` to auto-fix

### Console Statement
**File**: `src/debug.js:42`
**Issue**: `console.log()` left in code
**Action**: Remove before production

---

## ❌ Blocking Issues

### Hardcoded Secret
**File**: `src/config.py:15`
**Issue**: API key hardcoded
**Evidence**:
```python
API_KEY = "sk-1234567890abcdef"
```
**Action**: Move to environment variable
```python
API_KEY = os.getenv("API_KEY")
```

### Test Failure
**File**: `tests/test_api.py::test_get_user`
**Issue**: Test failed - assertion error
**Action**: Fix test or code logic

---

## Summary

**Status**: ❌ BLOCKED (2 critical issues)

**Actions Required**:
1. Move API key to .env file
2. Fix failing test in test_api.py

**After Fixing**:
```bash
# Re-run validation
# Then commit
git commit
```

---

## Auto-fix Available

Would you like me to automatically fix these issues?
- [ ] Format code (black/prettier)
- [ ] Remove unused imports
- [ ] Fix minor linting issues

Run: [command to auto-fix]
```

---

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

---

## Performance Optimization

**For large codebases:**

1. **Only check staged files**, not entire codebase
2. **Run checks in parallel** where possible:
   ```bash
   # Run linting and tests concurrently
   (ruff check . &)
   (pytest &)
   wait
   ```
3. **Skip slow checks** if user opts out:
   - Full test suite (run only affected tests)
   - Complete coverage report
4. **Cache results** when possible:
   - Type checking (incremental)
   - Linting (only changed files)

**Estimated times to report:**
```
Running pre-commit validation...
[=====>                ] 30% (Linting complete - 2s)
[============>         ] 60% (Tests running - 15s)
[===================> ] 95% (Security scan - 1s)
[=====================] 100% Complete (18s total)
```

---

## Questions to Ask User

1. **"Should I run the full test suite or only affected tests?"** (if large test suite)
2. **"Auto-fix formatting issues?"** (if formatting problems found)
3. **"Proceed with commit despite warnings?"** (if non-critical issues)
4. **"Should I update the TODO list?"** (if task related to commit)
5. **"Skip tests to commit faster?"** (not recommended, but sometimes needed)

---

## Final Checklist

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

---

## Integration with Git Hooks

**This agent can be used as a pre-commit hook:**

**`.git/hooks/pre-commit`:**
```bash
#!/bin/bash

# Run pre-commit-validator agent
# (This would invoke Claude Code with this agent)

# Exit with error code if validation fails
if [ $? -ne 0 ]; then
    echo "❌ Pre-commit validation failed"
    echo "Fix issues and try again"
    exit 1
fi

exit 0
```

**Or using pre-commit framework:**

**`.pre-commit-config.yaml`:**
```yaml
repos:
  - repo: local
    hooks:
      - id: claude-pre-commit
        name: Claude Pre-commit Validator
        entry: claude-code validate
        language: system
        pass_filenames: false
```
