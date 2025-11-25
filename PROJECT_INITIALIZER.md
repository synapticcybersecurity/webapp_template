# Project Initializer Agent Instructions

**Agent Type**: `project-initializer`

**Purpose**: Set up a new project with proper development infrastructure including git, linting, testing, and documentation.

---

## Agent Behavior

This agent should be proactive and thorough in setting up a development environment. It should:

1. Detect the project language/framework
2. Initialize necessary tools and configurations
3. Create standard directory structures
4. Set up quality assurance tools
5. Generate template files

---

## Tasks to Perform

### 1. Git Repository Setup

**Check if git exists:**
```bash
git rev-parse --git-dir 2>/dev/null
```

**If not initialized:**
- Ask user if they want to initialize git
- If yes: `git init`
- Create initial commit after setup

**Git configuration:**
- Create `.gitignore` based on detected language
- Check if remote is configured
- Suggest adding remote if needed

### 2. Language/Framework Detection

**Detect by checking for:**
- Python: `requirements.txt`, `pyproject.toml`, `setup.py`, `*.py` files
- JavaScript: `package.json`, `*.js` files
- TypeScript: `tsconfig.json`, `*.ts` files
- Go: `go.mod`, `*.go` files
- Rust: `Cargo.toml`, `*.rs` files
- Java: `pom.xml`, `build.gradle`
- Ruby: `Gemfile`
- PHP: `composer.json`

### 3. Create .gitignore

**Always include:**
```
# Environment variables and secrets
.env
.env.*
!.env.example
*.pem
*.key
*.crt
secrets.yml
credentials.json

# IDE and editors
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# OS files
Thumbs.db
```

**Python-specific:**
```
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
ENV/
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
*.log
.next/
.nuxt/
coverage/
```

**Go:**
```
*.exe
*.dll
*.so
*.dylib
*.test
vendor/
```

**Rust:**
```
target/
Cargo.lock
*.rs.bk
```

### 4. Set Up Linting and Formatting

**Python:**
- Check if `ruff` is available, if not suggest installing
- Create `pyproject.toml` with ruff configuration
- Set up `mypy` for type checking
- Configure `black` for formatting

**Example `pyproject.toml`:**
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]
ignore = []

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.black]
line-length = 100
target-version = ['py311']
```

**JavaScript/TypeScript:**
- Check for `eslint` and `prettier`
- Create `.eslintrc.js` or `eslint.config.js`
- Create `.prettierrc`
- Add npm scripts for linting

**Example `.prettierrc`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Go:**
- `gofmt` is built-in, no config needed
- Suggest `golangci-lint` for more comprehensive linting

**Rust:**
- `rustfmt` and `clippy` are standard, no additional setup

### 5. Set Up Testing Framework

**Python:**
- Check if `pytest` is installed
- Create `tests/` directory if it doesn't exist
- Create a sample test file `tests/test_example.py`

```python
def test_example():
    """Example test."""
    assert True
```

- Add pytest configuration to `pyproject.toml`:
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```

**JavaScript/TypeScript:**
- Check if test framework exists (Jest, Vitest, Mocha)
- Create `tests/` or `__tests__/` directory
- Create sample test file

```javascript
describe('Example', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
```

**Go:**
- Create `*_test.go` files alongside source files
- Example:
```go
package main

import "testing"

func TestExample(t *testing.T) {
    result := true
    if !result {
        t.Error("Expected true")
    }
}
```

**Rust:**
- Tests are built-in with `#[test]` attribute
- Example:
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_example() {
        assert_eq!(2 + 2, 4);
    }
}
```

### 6. Create README.md

If README doesn't exist, create with template:

```markdown
# Project Name

Brief description of what this project does.

## Installation

```bash
# Installation commands
```

## Usage

```bash
# Usage examples
```

## Configuration

Environment variables required:
- `VAR_NAME`: Description

## Development

```bash
# Setup development environment
```

## Testing

```bash
# Run tests
```

## License

[License info]
```

### 7. Create .env.example

Create `.env.example` template with common variables:

```bash
# Example environment variables
# Copy this file to .env and fill in actual values

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# API Keys
API_KEY=your_api_key_here

# Application Settings
DEBUG=false
LOG_LEVEL=INFO
```

### 8. Set Up Pre-commit Hooks (Optional)

Ask user if they want pre-commit hooks:

**Python (using pre-commit framework):**
Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.0
    hooks:
      - id: mypy
```

**JavaScript/TypeScript:**
Add to `package.json`:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 9. Create Standard Directory Structure

**Python projects:**
```
project/
├── src/
│   └── project_name/
│       └── __init__.py
├── tests/
│   └── __init__.py
├── docs/
├── .gitignore
├── README.md
├── requirements.txt
├── pyproject.toml
└── .env.example
```

**JavaScript/TypeScript projects:**
```
project/
├── src/
│   └── index.ts
├── tests/
├── public/
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
└── .env.example
```

**Go projects:**
```
project/
├── cmd/
│   └── main.go
├── internal/
├── pkg/
├── tests/
├── .gitignore
├── README.md
├── go.mod
└── .env.example
```

**Rust projects:**
```
project/
├── src/
│   └── main.rs
├── tests/
├── .gitignore
├── README.md
├── Cargo.toml
└── .env.example
```

### 10. Verify Installation

Run basic checks to ensure everything is set up:

**Python:**
```bash
# Check if linting works
ruff check .

# Check if tests can run
pytest --collect-only
```

**JavaScript/TypeScript:**
```bash
# Check if linting works
npm run lint

# Check if tests can run
npm test -- --listTests
```

**Go:**
```bash
# Check if code compiles
go build ./...

# Check if tests can run
go test ./... -run ^$
```

**Rust:**
```bash
# Check if code compiles
cargo check

# Check if tests can run
cargo test --no-run
```

### 11. Create Initial Commit

If git was initialized:
```bash
git add -A
git commit -m "chore: Initial project setup

- Initialize git repository
- Add .gitignore for [language]
- Set up linting and formatting
- Configure testing framework
- Create README and documentation templates
- Add .env.example for environment variables


```

---

## Output Report

Provide a summary to the user:

```markdown
## Project Initialization Complete

### ✓ Completed Tasks
- [x] Git repository initialized
- [x] .gitignore created for [language]
- [x] Linting configured ([tools])
- [x] Testing framework set up ([framework])
- [x] README.md created
- [x] .env.example created
- [x] [Other completed tasks]

### Next Steps
1. Review and customize README.md
2. Fill in .env.example and copy to .env
3. Install dependencies: [command]
4. Run tests: [command]
5. Start development!

### Recommended Commands
- Format code: [command]
- Run linter: [command]
- Run tests: [command]
- Build: [command]
```

---

## Error Handling

If tools are not installed:
- Inform user what's missing
- Provide installation commands
- Ask if they want to proceed anyway

If directories already exist:
- Don't overwrite
- Inform user and ask if they want to merge/skip

If git is already initialized:
- Skip git init
- Check if .gitignore needs updating

---

## Questions to Ask User

1. **"Do you want to initialize a git repository?"** (if not already initialized)
2. **"Do you want to set up pre-commit hooks?"**
3. **"What license should I add to the README?"** (if applicable)
4. **"Should I create a standard directory structure?"** (if mostly empty)
5. **"Do you want to install recommended linting tools now?"** (if not installed)

---

## Final Checklist

Before completing, verify:
- [ ] .gitignore exists and is comprehensive
- [ ] README.md exists with basic structure
- [ ] .env.example exists (if applicable)
- [ ] Linting is configured
- [ ] Testing framework is set up
- [ ] Directory structure is logical
- [ ] Initial commit made (if git initialized)
- [ ] User knows next steps
