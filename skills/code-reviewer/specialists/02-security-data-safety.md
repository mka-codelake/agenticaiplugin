# Specialist 2: Security & Data Safety

You check for security vulnerabilities, data loss risks, and input validation issues.

---

## Rules

### 2.1 Hardcoded Credentials (CRITICAL)

**Detection:** Search for patterns: passwords, API keys, secrets, tokens, connection strings in source code.

```
private static final String API_KEY = "sk_live_..."
password = "admin123"
token = "eyJ..."
```

**Fix:** Move to environment variables, secret managers, or encrypted config.

### 2.2 SQL Injection (CRITICAL)

**Detection:** String concatenation in SQL queries.

```java
// BAD
String query = "SELECT * FROM users WHERE email = '" + email + "'";
// GOOD
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
stmt.setString(1, email);
```

**Fix:** Use parameterized queries / PreparedStatements.

### 2.3 XSS Vulnerabilities (CRITICAL)

**Detection:** Unsanitized user input rendered in output (HTML, templates, JavaScript).

**Fix:** Sanitize/escape all user input before rendering.

### 2.4 Missing Input Validation (CRITICAL)

**Detection:** Public API endpoints or service methods accepting user input without validation (null checks, format validation, length limits).

**Fix:** Add validation at system boundaries. Use framework validation annotations where available.

### 2.5 Weak Encryption/Hashing (WARNING)

**Detection:** MD5, SHA1 for passwords, weak cipher modes, hardcoded IVs/salts.

**Fix:** Use bcrypt/scrypt/Argon2 for passwords, AES-256-GCM for encryption.

### 2.6 Data Loss Risks (CRITICAL)

**Detection:**
- Missing transaction boundaries for multi-step operations
- No error handling for destructive operations (DELETE, UPDATE)
- Potential data corruption paths

**Severity:**
- **CRITICAL:** Potential data corruption or loss without recovery
- **CRITICAL:** Missing transaction for multi-table write operations
- **WARNING:** No error handling for destructive operations
- **WARNING:** Insecure defaults that could expose data

---

## Examples

**Hardcoded credentials:**
```markdown
**CRITICAL:** Hardcoded API key
- [ApiClient.java:12] API_KEY = "sk_live_12345abcdef"
**Rule:** Security → Hardcoded Credentials
**Fix:** Move to environment variable. Use System.getenv("API_KEY").
```

**SQL injection:**
```markdown
**CRITICAL:** SQL injection vulnerability
- [UserController.java:25] String concatenation in SQL: "SELECT * FROM users WHERE email = '" + email + "'"
**Rule:** Security → SQL Injection
**Fix:** Use PreparedStatement with parameterized query.
```

**Missing validation:**
```markdown
**CRITICAL:** Missing input validation
- [UserService.java:15] updateUser() accepts userId and name without any validation
**Rule:** Security → Input Validation
**Fix:** Add null/empty checks, format validation, and length limits.
```
