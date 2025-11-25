# Security Audit

Perform a comprehensive security audit of the codebase to identify vulnerabilities, exposed secrets, and security misconfigurations.

## What This Command Does

This command thoroughly scans your codebase for security issues by:

1. **Scanning for hardcoded secrets** (API keys, passwords, tokens, private keys)
2. **Checking .env file security** (ensuring .env is gitignored, checking git history)
3. **Auditing dependencies** for known vulnerabilities (CVEs)
4. **Reviewing common vulnerabilities** (SQL injection, XSS, command injection, etc.)
5. **Checking authentication/authorization** implementations
6. **Validating HTTPS and transport security**
7. **Reviewing CORS configuration**
8. **Checking file upload security**
9. **Validating logging practices** (no secrets in logs)
10. **Generating actionable security report** with severity rankings

**IMPORTANT**: This command is informative but not alarmist. It focuses on actionable issues, not theoretical risks.

## Security Checks Performed

### 1. Scan for Hardcoded Secrets

Search for patterns indicating secrets:

```bash
# Search for common secret patterns
grep -rn "API[-_]KEY\|SECRET\|PASSWORD\|TOKEN\|PRIVATE[-_]KEY" \
  --exclude-dir={venv,node_modules,vendor,target,.git,dist,build} \
  --exclude="*.{min.js,map,lock}" .
```

**Look for:**
- API keys (e.g., `API_KEY = "sk-1234567890abcdef"`)
- Passwords (e.g., `PASSWORD = "secret123"`)
- Tokens (e.g., `AUTH_TOKEN = "eyJhbG..."`)
- AWS keys (e.g., `AKIAIOSFODNN7EXAMPLE`)
- Database connection strings with credentials
- Private keys (RSA, SSH, etc.)
- OAuth secrets
- JWT secrets

**Common patterns:**
```regex
# AWS Access Key
AKIA[0-9A-Z]{16}

# Generic API Key
[aA][pP][iI][-_]?[kK][eE][yY]\s*=\s*['"]\w{20,}['"]

# Private Key Headers
-----BEGIN (RSA |EC )?PRIVATE KEY-----

# JWT tokens
eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*

# Database URLs with credentials
(postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@
```

**Exceptions (don't flag):**
- `.env.example` files (templates)
- Test files with dummy/mock credentials
- Documentation with example placeholders
- Comments explaining what secrets are needed

### 2. Check .env File Security

**Verify:**
- `.env` is in `.gitignore`
- `.env.example` exists as a template
- No actual secrets in `.env.example`

**Check git history for exposed secrets:**
```bash
# Check if .env was ever committed
git log --all --full-history -- ".env"

# Check for secrets in commit history
git log --all --full-history -S "API_KEY" -S "SECRET" -S "PASSWORD"
```

**If secrets found in history:**
- Warn user that secrets may be exposed
- Suggest using tools like `git-filter-repo` to remove them
- Recommend rotating any exposed credentials

### 3. Dependency Vulnerability Scanning

**Python:**
```bash
# Using pip-audit
pip-audit

# Or safety
safety check --json
```

**JavaScript/TypeScript:**
```bash
# Using npm
npm audit --json

# Using yarn
yarn audit --json
```

**Go:**
```bash
# Using govulncheck
govulncheck ./...
```

**Rust:**
```bash
# Using cargo-audit
cargo audit
```

### 4. Common Vulnerability Checks

#### SQL Injection

**Look for:**
- String concatenation in SQL queries
- F-strings or template literals used to build queries
- User input directly in SQL statements

**Python - Bad:**
```python
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
```

**Python - Good:**
```python
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))
```

**JavaScript - Bad:**
```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**JavaScript - Good:**
```javascript
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

#### XSS (Cross-Site Scripting)

**Look for:**
- Direct rendering of user input without escaping
- `dangerouslySetInnerHTML` in React
- `innerHTML` in vanilla JavaScript
- Unescaped template variables

**JavaScript - Bad:**
```javascript
element.innerHTML = userInput;
```

**JavaScript - Good:**
```javascript
element.textContent = userInput;
```

**React - Bad:**
```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**React - Good:**
```jsx
<div>{userInput}</div>
```

#### Command Injection

**Look for:**
- `os.system()`, `subprocess.call()` with user input
- `child_process.exec()` with unsanitized input
- Shell commands built with string concatenation

**Python - Bad:**
```python
os.system(f"ls {user_directory}")
```

**Python - Good:**
```python
subprocess.run(["ls", user_directory], check=True)
```

**JavaScript - Bad:**
```javascript
exec(`ls ${userDirectory}`);
```

**JavaScript - Good:**
```javascript
execFile('ls', [userDirectory]);
```

#### Path Traversal

**Look for:**
- File operations with user-supplied paths
- No validation of `../` in paths
- Direct path concatenation

**Python - Bad:**
```python
file_path = f"/uploads/{user_filename}"
open(file_path)
```

**Python - Good:**
```python
from pathlib import Path
base_dir = Path("/uploads")
file_path = (base_dir / user_filename).resolve()
if not str(file_path).startswith(str(base_dir)):
    raise ValueError("Invalid path")
```

#### Insecure Deserialization

**Look for:**
- `pickle.loads()` with untrusted data (Python)
- `eval()` or `exec()` with user input
- `JSON.parse()` without validation

**Python - Bad:**
```python
data = pickle.loads(user_data)
```

**Python - Good:**
```python
data = json.loads(user_data)
# Validate data structure
```

### 5. Authentication & Authorization Audit

#### Password Handling
- Passwords hashed before storage (bcrypt, Argon2, PBKDF2)
- No plain text passwords in database
- No passwords in logs
- Strong hashing algorithms (not MD5, SHA1)

**Python - Good:**
```python
from passlib.hash import bcrypt

hashed = bcrypt.hash(password)
bcrypt.verify(password, hashed)
```

#### Token Management
- JWT secrets from environment variables
- Tokens have expiration times
- Secure token storage (httpOnly cookies)
- Proper token validation

**Check JWT implementation:**
```python
# Good: secret from environment
jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")

# Good: includes expiration
payload = {
    "user_id": user_id,
    "exp": datetime.utcnow() + timedelta(hours=1)
}
```

#### Session Security
- Secure session cookies (httpOnly, secure, sameSite)
- Session expiration implemented
- Session regeneration after login
- CSRF protection enabled

#### Authorization
- Check user permissions before operations
- No missing authentication on sensitive endpoints
- Principle of least privilege enforced
- Role-based access control (if applicable)

### 6. HTTPS and Transport Security

**Check for:**
- HTTPS enforced in production
- No `verify=False` in requests (disabling SSL verification)
- Secure cookie flags set
- HSTS headers configured

**Python - Bad:**
```python
requests.get(url, verify=False)
```

**Python - Good:**
```python
requests.get(url)  # verify=True by default
```

### 7. CORS Configuration

**Check:**
- CORS is properly configured
- Not using `*` wildcard for origins in production
- Credentials allowed only for trusted origins

**Python (FastAPI) - Bad:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True
)
```

**Python (FastAPI) - Good:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True
)
```

### 8. File Upload Security

**Check for:**
- File type validation (not just extension)
- File size limits
- Sanitized file names
- Files not executable
- Files stored outside web root

**Python - Good:**
```python
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Sanitize filename
secure_filename(uploaded_file.filename)
```

### 9. Logging Security

**Check that logs don't include:**
- Passwords or tokens
- Credit card numbers
- Personal identifiable information (PII)
- API keys or secrets

**Bad:**
```python
logger.info(f"User logged in: {username} with password {password}")
```

**Good:**
```python
logger.info(f"User logged in: {username}")
```

## Security Report Format

Generate a structured report:

```markdown
# Security Audit Report

**Date**: [Date]
**Scanned**: [Project name/path]
**Command**: /security-audit

---

## Executive Summary

- **Critical Issues**: [count]
- **High Priority**: [count]
- **Medium Priority**: [count]
- **Low Priority**: [count]

**Overall Risk Level**: [Critical/High/Medium/Low]

---

## 1. Exposed Secrets

[Details of any hardcoded secrets found]

---

## 2. Dependency Vulnerabilities

[Details of vulnerable dependencies]

---

## 3. Code Vulnerabilities

[Details of SQL injection, XSS, etc.]

---

## 4. Configuration Issues

[Details of CORS, HTTPS, etc.]

---

## 5. Best Practice Violations

[Details of missing rate limiting, etc.]

---

## Summary of Recommendations

### Immediate Actions (Critical/High)
1. [ ] Action 1
2. [ ] Action 2

### Short-term Actions (Medium)
1. [ ] Action 1
2. [ ] Action 2

### Long-term Improvements (Low)
1. [ ] Action 1
2. [ ] Action 2
```

## Risk Levels

**Critical**:
- Exposed API keys, passwords, tokens in code or git history
- SQL injection vulnerabilities in production endpoints
- Authentication bypass vulnerabilities
- Remote code execution risks

**High**:
- Known CVEs in dependencies (CVSS 7.0+)
- XSS vulnerabilities
- Missing authentication on sensitive endpoints
- Insecure password storage

**Medium**:
- Known CVEs in dependencies (CVSS 4.0-6.9)
- CORS misconfigurations
- Missing input validation
- Insecure session management
- Path traversal vulnerabilities

**Low**:
- Missing rate limiting
- Weak CORS policies
- Insufficient logging
- Missing security headers
- Minor configuration issues

## Questions to Ask User

1. **"Should I check git history for exposed secrets?"** (can be slow for large repos)
2. **"Do you want detailed or summary vulnerability reports?"**
3. **"Should I scan dependencies for vulnerabilities?"**
4. **"Are there any files/directories I should exclude from scanning?"**

## Success Criteria

Before completing the audit:
- [ ] Scanned for hardcoded secrets
- [ ] Checked .env security
- [ ] Scanned dependencies
- [ ] Checked for SQL injection
- [ ] Checked for XSS vulnerabilities
- [ ] Reviewed authentication/authorization
- [ ] Checked CORS configuration
- [ ] Reviewed file upload security (if applicable)
- [ ] Generated comprehensive report
- [ ] Prioritized findings by severity
- [ ] Provided actionable recommendations
