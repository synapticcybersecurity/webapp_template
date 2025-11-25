# Claude Code Global Standards

This document provides universal guidelines for AI assistants (like Claude) when contributing to software projects. These instructions are designed to work across multiple languages, frameworks, and project types.

## Core Principles

1. **Proactive Quality**: Don't wait to be asked - ensure code quality, security, and testing automatically
2. **Version Control Discipline**: Commit frequently at logical breakpoints
3. **Task Transparency**: Maintain clear TODO lists so users understand progress
4. **Security First**: Always scan for vulnerabilities and secrets before committing
5. **Test Coverage**: Write tests for new features and bug fixes
6. **Documentation**: Code should be self-documenting with clear comments where needed

---

## 1. Git Repository Management

### Initial Setup Check

Before starting any work, verify:

```bash
# Check if git repo exists
git rev-parse --git-dir 2>/dev/null

# If not, ask user if they want to initialize
# git init
```

### .gitignore Configuration

Ensure `.gitignore` exists and includes language-specific patterns:

**Python:**
```
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
ENV/
.env
*.egg-info/
dist/
build/
.pytest_cache/
.mypy_cache/
.ruff_cache/
```

**JavaScript/TypeScript:**
```
node_modules/
.npm
dist/
build/
.env
.env.local
*.log
.next/
.nuxt/
coverage/
```

**Go:**
```
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/
.env
```

**Rust:**
```
target/
Cargo.lock
*.rs.bk
.env
```

**Always exclude:**
```
# Secrets and credentials
.env
.env.*
!.env.example
*.pem
*.key
*.crt
secrets.yml
credentials.json

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# OS
Thumbs.db
```

### Commit Discipline

**When to Commit:**
- After completing a feature
- After fixing a bug
- After refactoring
- Before starting major changes
- At logical breakpoints (working state)

**Commit Message Format:**
```
<type>: <short summary>

<detailed description if needed>


```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Formatting
- `test`: Tests
- `chore`: Maintenance
- `security`: Security fixes
- `perf`: Performance improvements

### What Never to Commit

- API keys, secrets, passwords
- `.env` files (provide `.env.example` instead)
- Dependencies (`node_modules/`, `venv/`, `vendor/`)
- Build artifacts (`dist/`, `build/`, `target/`)
- IDE-specific files
- Database files
- Log files
- Temporary files

---

## 2. Task Management with TODO Lists

### When to Create TODO Lists

**Always create a TODO list for:**
- Multi-step tasks (3+ steps)
- Complex features
- Bug fixes requiring multiple changes
- User-provided task lists
- Refactoring efforts

**Skip TODO lists for:**
- Single, trivial tasks
- Simple documentation updates
- One-line fixes

### TODO List Management Rules

1. **Create proactively** at the start of complex tasks
2. **Keep ONE task as `in_progress`** at a time
3. **Mark `completed` immediately** after finishing
4. **Add new tasks** discovered during implementation
5. **Remove tasks** that become irrelevant

### TODO Task Format

Each task must have:
- `content`: Imperative form (e.g., "Fix authentication bug")
- `activeForm`: Present continuous (e.g., "Fixing authentication bug")
- `status`: `pending`, `in_progress`, or `completed`

### Completion Criteria

**ONLY mark completed when:**
- Feature fully implemented and working
- All tests passing
- No errors or blockers
- Code reviewed and cleaned up

**Do NOT mark completed if:**
- Tests failing
- Implementation partial
- Unresolved errors
- Missing dependencies

---

## 3. Code Quality & Linting

### Language Detection

Automatically detect project language by checking for:
- Python: `requirements.txt`, `pyproject.toml`, `setup.py`, `*.py` files
- JavaScript: `package.json`, `*.js` files
- TypeScript: `tsconfig.json`, `*.ts` files
- Go: `go.mod`, `*.go` files
- Rust: `Cargo.toml`, `*.rs` files
- Java: `pom.xml`, `build.gradle`, `*.java` files
- Ruby: `Gemfile`, `*.rb` files
- PHP: `composer.json`, `*.php` files

### Python Linting

**Tools:**
- `ruff` - Fast linter (replaces flake8, isort, pyupgrade)
- `mypy` - Type checking
- `black` - Code formatting
- `bandit` - Security issues

**Before committing:**
```bash
# Format code
black .

# Run linter
ruff check .

# Type check
mypy .

# Security scan
bandit -r . -x ./venv,./tests
```

**Configuration files:**
- `pyproject.toml` or `ruff.toml` for ruff
- `mypy.ini` or `pyproject.toml` for mypy

### JavaScript/TypeScript Linting

**Tools:**
- `eslint` - Linting
- `prettier` - Formatting
- `typescript` - Type checking

**Before committing:**
```bash
# Format code
npx prettier --write .

# Lint
npx eslint .

# Type check (if TypeScript)
npx tsc --noEmit
```

**Configuration files:**
- `.eslintrc.js` or `eslint.config.js`
- `.prettierrc`
- `tsconfig.json`

### Go Linting

**Tools:**
- `gofmt` - Formatting
- `golangci-lint` - Meta-linter
- `go vet` - Built-in issues

**Before committing:**
```bash
# Format
gofmt -w .

# Lint
golangci-lint run

# Vet
go vet ./...
```

### Rust Linting

**Tools:**
- `rustfmt` - Formatting
- `clippy` - Linter

**Before committing:**
```bash
# Format
cargo fmt

# Lint
cargo clippy -- -D warnings
```

### General Code Quality Checks

- **No commented-out code** (remove it, git tracks history)
- **No debug statements** (`console.log`, `print()`, etc.) in production
- **Consistent naming** (follow language conventions)
- **No unused imports** or variables
- **Maximum function length** (~50 lines, use judgment)
- **No magic numbers** (use named constants)

---

## 4. Security Checks

### Pre-Commit Security Scan

**Always check for:**

1. **Hardcoded Secrets**
   - API keys, tokens, passwords
   - Database connection strings
   - Private keys, certificates
   - AWS/cloud credentials

2. **Common Vulnerabilities**
   - SQL injection (use parameterized queries)
   - XSS (sanitize user input)
   - CSRF (use tokens)
   - Path traversal
   - Command injection
   - Insecure deserialization

3. **Dependency Vulnerabilities**
   - Python: `pip-audit` or `safety check`
   - JavaScript: `npm audit` or `yarn audit`
   - Go: `govulncheck`
   - Rust: `cargo audit`

### Security Scanning Commands

**Python:**
```bash
# Scan for secrets
grep -r "API_KEY\|SECRET\|PASSWORD" --exclude-dir=venv .

# Check dependencies
pip-audit

# Security issues in code
bandit -r . -x ./venv
```

**JavaScript/TypeScript:**
```bash
# Check dependencies
npm audit

# Scan for secrets
grep -r "API_KEY\|SECRET\|PASSWORD" --exclude-dir=node_modules .
```

**Go:**
```bash
# Check dependencies
govulncheck ./...

# Scan for secrets
grep -r "API_KEY\|SECRET\|PASSWORD" --exclude-dir=vendor .
```

### Environment Variables

**Rules:**
- All secrets in `.env` files
- Never commit `.env`
- Provide `.env.example` template
- Document all required variables
- Use strong defaults for non-secrets

**Example `.env.example`:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# API Keys (required)
OPENAI_API_KEY=your_key_here
STRIPE_SECRET_KEY=your_key_here

# Optional
LOG_LEVEL=INFO
DEBUG=false
```

### Authentication Best Practices

- Use environment variables for secrets
- Validate tokens on every request
- Hash passwords (bcrypt, Argon2)
- Use HTTPS in production
- Implement rate limiting
- Add CORS configuration
- Use secure session management

---

## 5. Testing Requirements

### Test Coverage Goals

- **Minimum**: 70% coverage
- **Target**: 80%+ coverage
- **Critical code**: 100% coverage (auth, payments, data loss)

### What to Test

**Always test:**
- New features (unit + integration)
- Bug fixes (regression test)
- Edge cases and error conditions
- API endpoints
- Database operations
- External API integrations (mock them)

### Python Testing

**Framework:** `pytest`

```bash
# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html

# Specific test
pytest tests/test_feature.py -v
```

**Test structure:**
```python
def test_feature_success():
    """Test that feature works correctly."""
    result = my_function(valid_input)
    assert result == expected_output

def test_feature_error_handling():
    """Test that feature handles errors properly."""
    with pytest.raises(ValueError):
        my_function(invalid_input)
```

### JavaScript/TypeScript Testing

**Frameworks:** Jest, Vitest, Mocha

```bash
# Run tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**Test structure:**
```javascript
describe('Feature', () => {
  it('should work correctly', () => {
    const result = myFunction(validInput);
    expect(result).toBe(expectedOutput);
  });

  it('should handle errors', () => {
    expect(() => myFunction(invalidInput)).toThrow();
  });
});
```

### Go Testing

```bash
# Run tests
go test ./...

# With coverage
go test -cover ./...

# With race detector
go test -race ./...
```

**Test structure:**
```go
func TestFeature(t *testing.T) {
    result := MyFunction(validInput)
    if result != expected {
        t.Errorf("got %v, want %v", result, expected)
    }
}
```

### Rust Testing

```bash
# Run tests
cargo test

# With output
cargo test -- --nocapture
```

**Test structure:**
```rust
#[test]
fn test_feature() {
    let result = my_function(valid_input);
    assert_eq!(result, expected);
}
```

### Mocking External APIs

**Always mock:**
- Third-party APIs (OpenAI, Stripe, etc.)
- Database calls in unit tests
- File system operations
- Network requests

**Don't mock:**
- Your own internal functions (test them directly)
- Simple data transformations

---

## 6. Documentation Standards

### Code Documentation

**Functions/Methods:**
```python
def calculate_total(items: List[Item], tax_rate: float) -> float:
    """
    Calculate the total cost including tax.

    Args:
        items: List of items to calculate total for
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)

    Returns:
        Total cost with tax applied

    Raises:
        ValueError: If tax_rate is negative
    """
```

**Classes:**
```python
class PaymentProcessor:
    """
    Handles payment processing with external payment gateway.

    Attributes:
        api_key: API key for payment gateway
        sandbox: Whether to use sandbox mode

    Example:
        processor = PaymentProcessor(api_key="...", sandbox=True)
        result = processor.charge(amount=100.00, currency="USD")
    """
```

### README Requirements

Every project should have a `README.md` with:

1. **Project Title and Description**
2. **Installation Instructions**
3. **Usage Examples**
4. **Configuration** (environment variables)
5. **Development Setup**
6. **Testing Instructions**
7. **Deployment** (if applicable)
8. **Contributing Guidelines** (if open source)
9. **License**

### API Documentation

**For web APIs:**
- Document all endpoints
- Include request/response examples
- List required authentication
- Specify rate limits
- Document error codes

**Tools:**
- FastAPI: Auto-generated at `/docs`
- Express: Use Swagger/OpenAPI
- Go: Use swaggo
- Spring Boot: Use SpringDoc

### Inline Comments

**When to comment:**
- Complex algorithms
- Non-obvious business logic
- Workarounds for bugs/limitations
- Performance optimizations
- Security considerations

**When NOT to comment:**
- Obvious code (`// increment counter`)
- Code that should be self-documenting

---

## 7. Performance Considerations

### Backend Performance

- **Database queries**: Add indexes, avoid N+1 queries
- **API calls**: Cache responses, use timeouts
- **Large datasets**: Implement pagination
- **Long operations**: Use background tasks/queues
- **Memory**: Profile memory usage, avoid leaks

### Frontend Performance

- **Bundle size**: Code split, lazy load
- **Rendering**: Memoize expensive calculations
- **API calls**: Debounce user input, cache responses
- **Images**: Optimize, lazy load
- **Lists**: Virtualize long lists

### Database Optimization

- **Indexes**: Add to frequently queried columns
- **Queries**: Use EXPLAIN to analyze
- **Connection pooling**: Configure properly
- **Transactions**: Keep short
- **Full-text search**: Use database features

---

## 8. Error Handling

### General Principles

- **Fail gracefully**: Never crash without informative error
- **Log errors**: Include context (user, operation, timestamp)
- **User-friendly messages**: Don't expose internals
- **Retry logic**: For transient failures (network, rate limits)
- **Fallbacks**: Provide defaults when possible

### Python Error Handling

```python
import logging

logger = logging.getLogger(__name__)

def fetch_data(url: str) -> dict:
    """Fetch data from API with proper error handling."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        logger.error(f"Timeout fetching {url}")
        raise ServiceUnavailableError("API request timed out")
    except requests.HTTPError as e:
        logger.error(f"HTTP error {e.response.status_code}: {url}")
        raise
    except Exception as e:
        logger.exception(f"Unexpected error fetching {url}")
        raise
```

### JavaScript Error Handling

```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw new ServiceError('Failed to fetch data');
  }
}
```

### HTTP Status Codes

Use appropriate codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success with no response body
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid auth
- `403 Forbidden`: Authenticated but not allowed
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource conflict (duplicate)
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Temporary outage

---

## 9. Pre-Commit Checklist

Before any commit, verify:

### Code Quality
- [ ] Linter passes (no warnings)
- [ ] Formatter applied
- [ ] Type checker passes (if applicable)
- [ ] No commented-out code
- [ ] No debug statements

### Testing
- [ ] All tests pass
- [ ] New tests written for new features
- [ ] Test coverage maintained/improved

### Security
- [ ] No hardcoded secrets
- [ ] No sensitive data in logs
- [ ] Dependencies have no known vulnerabilities
- [ ] Input validation present
- [ ] Authentication/authorization correct

### Documentation
- [ ] Functions have docstrings
- [ ] README updated (if needed)
- [ ] API docs updated (if needed)
- [ ] Comments added for complex logic

### Git
- [ ] `.gitignore` configured properly
- [ ] Commit message follows format
- [ ] Changes are atomic (one logical change)
- [ ] No unintended files staged

### TODO List
- [ ] TODO list updated
- [ ] Current task marked completed
- [ ] New tasks added if discovered

---

## 10. Project Initialization Checklist

When starting work on a new project:

### Git Setup
- [ ] Git repository initialized
- [ ] `.gitignore` created with language-specific patterns
- [ ] Remote repository configured (if applicable)
- [ ] Initial commit made

### Development Environment
- [ ] Language version specified (`.python-version`, `.nvmrc`, etc.)
- [ ] Dependencies managed (`requirements.txt`, `package.json`, etc.)
- [ ] Virtual environment created (Python, Node, etc.)
- [ ] Environment variables documented (`.env.example`)

### Code Quality Tools
- [ ] Linter configured
- [ ] Formatter configured
- [ ] Type checker configured (if applicable)
- [ ] Pre-commit hooks set up (optional)

### Testing
- [ ] Testing framework installed
- [ ] Test directory structure created
- [ ] Sample test written
- [ ] Coverage tool configured

### Documentation
- [ ] `README.md` created with sections outlined
- [ ] License specified (if applicable)
- [ ] Contributing guidelines (if open source)

### Security
- [ ] Secrets management strategy defined
- [ ] `.env` in `.gitignore`
- [ ] Security scanning tool identified

---

## 11. Language-Specific Best Practices

### Python

**Style:**
- Follow PEP 8
- Use type hints
- Max line length: 88 (Black default) or 100
- Use f-strings for formatting
- Prefer pathlib over os.path

**Imports:**
```python
# Standard library
import os
import sys

# Third-party
import requests
from fastapi import FastAPI

# Local
from .models import User
from .utils import helper
```

**Async:**
```python
# Use async for I/O operations
async def fetch_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()
```

### JavaScript/TypeScript

**Style:**
- Use `const` by default, `let` when reassignment needed
- Avoid `var`
- Use template literals for strings
- Use arrow functions for callbacks
- Destructure objects and arrays

**Imports:**
```javascript
// Prefer named imports
import { useState, useEffect } from 'react';

// Default imports
import axios from 'axios';

// Relative imports
import { helper } from './utils';
```

**Async:**
```javascript
// Use async/await
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### Go

**Style:**
- Use `gofmt` formatting
- Error handling: return errors, don't panic
- Use interfaces for abstraction
- Prefer table-driven tests

**Error Handling:**
```go
func fetchData(url string) (*Data, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch: %w", err)
    }
    defer resp.Body.Close()

    // Process response
    return data, nil
}
```

### Rust

**Style:**
- Use `rustfmt` formatting
- Use `Result` and `Option` types
- Avoid `unwrap()` in production code
- Use `?` operator for error propagation

**Error Handling:**
```rust
fn fetch_data(url: &str) -> Result<Data, Error> {
    let response = reqwest::blocking::get(url)?;
    let data = response.json::<Data>()?;
    Ok(data)
}
```

---

## 12. Common Anti-Patterns to Avoid

### General

- **God objects**: Classes that do too much
- **Duplicate code**: DRY principle
- **Magic numbers**: Use named constants
- **Premature optimization**: Profile first
- **Not handling errors**: Always handle errors
- **Ignoring warnings**: Fix linter warnings
- **Commit commented code**: Remove it
- **Large functions**: Break into smaller pieces
- **Deep nesting**: Extract functions, use early returns

### Python

- Using mutable default arguments
- Bare `except:` clauses (use specific exceptions)
- Not closing resources (use context managers)
- String concatenation in loops (use join)

### JavaScript

- Using `==` instead of `===`
- Not handling promise rejections
- Modifying function arguments
- Using `eval()`

### Database

- N+1 query problem
- Missing indexes on foreign keys
- Not using transactions
- SELECT * instead of specific columns
- Not using connection pooling

---

## 13. Deployment Considerations

### Environment-Specific Configuration

- Use environment variables for config
- Never hardcode production values
- Provide defaults for development
- Document all required variables

### Logging

- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Include context: timestamp, user, operation
- Log to stdout in containers
- Don't log sensitive data (passwords, tokens)
- Use structured logging (JSON)

### Monitoring

- Health check endpoints
- Metrics (response time, error rate)
- Alerts for critical errors
- Performance monitoring
- Resource usage (CPU, memory)

### Docker Best Practices

- Use official base images
- Multi-stage builds to reduce size
- Don't run as root
- Use `.dockerignore`
- Pin versions of dependencies
- Health checks in Dockerfile

---

## 14. Resources by Language

### Python
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Django Docs](https://docs.djangoproject.com/)
- [pytest Docs](https://docs.pytest.org/)

### JavaScript/TypeScript
- [Airbnb Style Guide](https://github.com/airbnb/javascript)
- [React Docs](https://react.dev/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Go
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Testing](https://go.dev/doc/tutorial/add-a-test)

### Rust
- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)

---

## 15. Asking Questions

When uncertain about:
- Project requirements
- Architecture decisions
- Trade-offs between approaches
- User preferences

**Use the AskUserQuestion tool** to clarify before implementing.

Better to ask than assume incorrectly.

---

## Version

**Version:** 1.0.0
**Last Updated:** 2025-11-23
**Compatibility:** Claude Code v1.x

---

## Usage

To use this in a project, reference it in your project-specific `CLAUDE.md`:

```markdown
# Project-Specific Instructions

<!-- Include global standards -->
See [CLAUDE_GLOBAL.md](./claude-code-standards/CLAUDE_GLOBAL.md) for universal coding standards.

## Project-Specific Guidelines
[Your project-specific instructions here]
```

Or copy relevant sections into your project's `CLAUDE.md` file.
