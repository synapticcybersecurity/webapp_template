# Code Quality Check

Ensure code meets quality standards including linting, formatting, test coverage, documentation, and best practices.

## What This Command Does

This command performs a thorough but practical quality assessment by:

1. **Detecting project language** and framework automatically
2. **Running appropriate linters** and formatters for the detected language
3. **Checking test coverage** and identifying untested code
4. **Validating documentation** (docstrings, README, API docs)
5. **Reviewing code complexity** and maintainability
6. **Identifying code smells** (duplication, magic numbers, etc.)
7. **Checking naming conventions** and import organization
8. **Providing actionable improvement suggestions** with priority rankings

**Focus**: Prioritize issues that impact maintainability, readability, and correctness.

## Quality Checks Performed

### 1. Language Detection

Auto-detect by checking for:

- **Python**: `requirements.txt`, `pyproject.toml`, `*.py` files
- **JavaScript**: `package.json`, `*.js` files
- **TypeScript**: `tsconfig.json`, `*.ts` files
- **Go**: `go.mod`, `*.go` files
- **Rust**: `Cargo.toml`, `*.rs` files

Once detected, proceed with language-specific checks.

## Language-Specific Quality Checks

### Python Quality Checks

#### Linting

```bash
# Run ruff (preferred)
ruff check . --output-format=json

# Or flake8 if ruff not available
flake8 . --max-line-length=100
```

**Check for:**

- Syntax errors
- Unused imports and variables
- Undefined names
- Code complexity (cyclomatic complexity)
- Line length violations
- Import sorting

#### Type Checking

```bash
mypy . --show-error-codes --pretty
```

**Check for:**

- Missing type hints
- Type mismatches
- Incorrect return types
- Any types that should be specific

#### Formatting

```bash
black --check --diff .
```

#### Code Complexity

**Check for:**

- Functions longer than 50 lines
- Deep nesting (> 4 levels)
- High cyclomatic complexity (> 10)
- Too many parameters (> 5)

**Use radon (if available):**

```bash
radon cc . --min B --show-complexity
```

#### Python-Specific Issues

**Look for:**

- Mutable default arguments: `def func(items=[])`
- Bare except clauses: `except:`
- Use of `eval()` or `exec()`
- String concatenation in loops
- Not using context managers for files
- Using `==` for None checks (should be `is None`)

### JavaScript/TypeScript Quality Checks

#### Linting

```bash
npx eslint . --format=json
```

**Check for:**

- Syntax errors
- Unused variables
- Missing semicolons (if configured)
- Improper use of `var`
- Console statements in production code
- Debugger statements

#### Type Checking (TypeScript)

```bash
npx tsc --noEmit
```

**Check for:**

- Type errors
- Missing type definitions
- Implicit any types
- Incorrect type assignments

#### Formatting

```bash
npx prettier --check .
```

#### JavaScript-Specific Issues

**Look for:**

- Using `==` instead of `===`
- Not handling promise rejections
- Modifying function parameters
- Using `var` instead of `const`/`let`
- Not using arrow functions for callbacks

### Go Quality Checks

#### Formatting

```bash
gofmt -l .
```

Should return empty (all files formatted).

#### Linting

```bash
# Run golangci-lint (if available)
golangci-lint run --out-format=json

# Or use go vet
go vet ./...
```

**Check for:**

- Unused variables
- Unreachable code
- Incorrect struct tags
- Printf formatting issues
- Shadow variables

#### Go-Specific Issues

**Look for:**

- Not checking errors: `result, _ := function()`
- Using panic in libraries (should return errors)
- Not closing resources (defer missing)
- Goroutine leaks (contexts not used)

### Rust Quality Checks

#### Formatting

```bash
cargo fmt -- --check
```

#### Linting

```bash
cargo clippy -- -D warnings
```

**Check for:**

- Inefficient code patterns
- Unnecessary clones
- Incorrect error handling
- Style violations

#### Rust-Specific Issues

**Look for:**

- Use of `unwrap()` in production code
- Not using `?` operator for error propagation
- Unnecessary `clone()`
- Not using iterators

## Test Coverage Analysis

### Python

```bash
pytest --cov=. --cov-report=json --cov-report=term
```

**Parse coverage.json and report:**

- Overall coverage percentage
- Files with < 70% coverage
- Uncovered lines of critical code

**Critical code includes:**

- Authentication/authorization logic
- Payment processing
- Data modification operations
- API endpoints

### JavaScript/TypeScript

```bash
# Jest
npm test -- --coverage --json

# Vitest
npx vitest --coverage
```

**Report:**

- Statement coverage
- Branch coverage
- Function coverage
- Files below threshold

### Go

```bash
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
```

### Rust

```bash
# Using cargo-tarpaulin
cargo tarpaulin --out Json
```

### Coverage Goals

- **Minimum acceptable**: 70%
- **Target**: 80%
- **Critical code**: 100%

**Flag:**

- Decreasing coverage compared to baseline
- Critical functions without tests
- New code without tests

## Documentation Quality

### Code Documentation

#### Python - Check for docstrings

All public functions, classes, and modules should have docstrings.

**Use pydocstyle (if available):**

```bash
pydocstyle .
```

#### JavaScript/TypeScript - Check for JSDoc

```javascript
/**
 * Function description
 * @param {string} param - Parameter description
 * @returns {number} Return value description
 */
```

**Check for:**

- Missing docstrings/JSDoc on public functions
- Undocumented parameters
- Undocumented return values
- Missing examples for complex functions

### README.md Quality

**Check README includes:**

- [ ] Project title and description
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Configuration documentation
- [ ] Testing instructions
- [ ] Contributing guidelines (if open source)
- [ ] License information

**Flag if missing:**

- Critical sections (Installation, Usage)
- Outdated information
- Broken links

### API Documentation

**For web APIs, check:**

- Endpoint documentation exists
- Request/response schemas documented
- Authentication requirements documented
- Error responses documented

**Python (FastAPI):**

- Check that endpoints have descriptions
- Verify `/docs` endpoint works

**JavaScript (Express):**

- Check for Swagger/OpenAPI spec

## Code Smell Detection

### General Code Smells

**Duplicated Code:**

- Look for similar code blocks
- Suggest extracting to functions
- DRY principle violations

**Long Functions:**

- Functions > 50 lines
- Suggest breaking into smaller functions
- Single Responsibility Principle

**Too Many Parameters:**

- Functions with > 5 parameters
- Suggest using config objects or classes

**Magic Numbers:**

- Hardcoded numbers without explanation
- Suggest named constants

**Commented-Out Code:**

- Dead code that should be removed
- Git tracks history

**Debug Statements:**

- `console.log` in JavaScript
- `print()` in Python
- `fmt.Println()` in Go
- Should be removed before production

### Deep Nesting

**Example of problematic nesting:**

```python
def process_data(data):
    if data:
        if data.valid:
            if data.user:
                if data.user.active:
                    # Too deep!
                    return process(data)
```

**Suggest early returns:**

```python
def process_data(data):
    if not data:
        return None
    if not data.valid:
        return None
    if not data.user or not data.user.active:
        return None
    return process(data)
```

## Naming Conventions

### Python

- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_leading_underscore`

### JavaScript/TypeScript

- Functions/variables: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: `#privateField` or `_convention`

### Go

- Exported: `PascalCase`
- Unexported: `camelCase`

### Rust

- Functions/variables: `snake_case`
- Types/traits: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

**Flag:**

- Inconsistent naming
- Single-letter variables (except loop counters)
- Ambiguous names (`data`, `temp`, `x`)
- Names that don't describe purpose

## Import/Dependency Organization

### Python

**Check import order:**

```python
# Standard library
import os
import sys

# Third-party
import requests
from fastapi import FastAPI

# Local
from .models import User
```

### JavaScript/TypeScript

**Check import organization:**

```javascript
// External libraries
import React from 'react';
import axios from 'axios';

// Internal modules
import { helper } from './utils';
import Component from './Component';
```

### Unused Imports

**Flag and suggest removing:**

- Imports that are never used
- Wildcard imports (`from module import *`)

## Performance Anti-Patterns

### Database Queries

**Look for:**

- N+1 query problems
- SELECT \* instead of specific columns
- Missing indexes on foreign keys
- Queries in loops

### API Calls

**Look for:**

- API calls in loops (should batch)
- No timeout specified
- No error handling
- No caching for repeated calls

### Memory Issues

**Look for:**

- Loading large files into memory
- Not closing file handles
- Accumulating data in loops without limits
- Memory leaks (event listeners not removed)

## Quality Report Format

```markdown
# Code Quality Report

**Date**: [Date]
**Project**: [Name]
**Language**: [Python/JavaScript/etc.]
**Command**: /quality-check

---

## Overall Score: [Grade A-F]

- **Linting**: [Pass/Fail] ([X] issues)
- **Formatting**: [Pass/Fail] ([X] files need formatting)
- **Type Checking**: [Pass/Fail] ([X] errors)
- **Test Coverage**: [X]% ([Pass/Fail])
- **Documentation**: [Good/Needs Improvement]

---

## 1. Linting Issues

### High Priority (Errors)

[Details]

### Medium Priority (Warnings)

[Details]

### Low Priority (Style)

[Details]

---

## 2. Test Coverage

**Overall Coverage**: [X]%

- **Target**: 80%
- **Status**: [✓ Pass / ✗ Fail]

### Low Coverage Files

[Details]

---

## 3. Code Complexity

### Functions Needing Refactoring

[Details]

---

## 4. Code Smells

[Details]

---

## 5. Documentation

[Details]

---

## Action Items

### Critical (Fix Now)

1. [ ] Item 1
2. [ ] Item 2

### High Priority (Fix Soon)

1. [ ] Item 1
2. [ ] Item 2

### Medium Priority (Improvements)

1. [ ] Item 1
2. [ ] Item 2

### Low Priority (Nice to Have)

1. [ ] Item 1
2. [ ] Item 2
```

## Auto-fixable Issues

**Can be automatically fixed:**

- Formatting (black, prettier, gofmt, rustfmt)
- Import sorting (ruff, eslint)
- Some linting issues (ruff --fix, eslint --fix)

**Offer to fix:**

```
Found X auto-fixable issues. Would you like me to fix them?
- Run black to format code
- Run ruff --fix to fix linting issues
- Remove unused imports
```

## Questions to Ask User

1. **"What test coverage threshold should I enforce?"** (default: 80%)
2. **"Should I auto-fix formatting issues?"**
3. **"Do you want detailed or summary reports?"**
4. **"Should I check documentation completeness?"**
5. **"Are there any files/directories to exclude from checks?"**

## Success Criteria

Before completing:

- [ ] Detected project language
- [ ] Ran appropriate linter
- [ ] Checked formatting
- [ ] Ran type checker (if applicable)
- [ ] Analyzed test coverage
- [ ] Checked documentation
- [ ] Identified code smells
- [ ] Generated prioritized report
- [ ] Provided actionable recommendations
- [ ] Offered auto-fix options
