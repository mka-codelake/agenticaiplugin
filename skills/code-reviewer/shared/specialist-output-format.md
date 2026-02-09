# Specialist Output Format

All review specialists MUST return findings in this exact format. This enables automated consolidation by the orchestrator.

---

## Output Structure

```markdown
## Findings: {Specialist Name}

### Critical
- [{File}:{Line}] {Description}
  **Rule:** {Rule reference}
  **Fix:** {Fix direction}

### Warning
- [{File}:{Line}] {Description}
  **Rule:** {Rule reference}
  **Impact:** {Why it matters}
  **Fix:** {Fix direction}

### Suggestion
- [{File}:{Line}] {Description}
  **Benefit:** {What would improve}

### Summary
- Critical: {count}
- Warning: {count}
- Suggestion: {count}
```

---

## Format Rules

1. **File references:** Always use `[FileName.ext:LineNumber]` format
2. **Rule references:** Use `{Specialist Category} → {Specific Rule}` format
3. **One finding per bullet:** Do not combine multiple issues into one finding
4. **Group related findings:** If same issue appears in multiple files, list all locations under one finding
5. **Empty sections:** If no findings for a severity, write `None`
6. **Summary counts:** Always include the summary with exact counts
7. **No code fixes:** Describe the fix direction, do not provide implementation code
8. **No findings:** If no issues found, return exactly: `No findings.`

---

## Example Output

```markdown
## Findings: Security & Data Safety

### Critical
- [ApiClient.java:12] Hardcoded API key in source code
  **Rule:** Security → Hardcoded Credentials
  **Fix:** Move to environment variable or secret manager.

- [UserController.java:25] SQL injection via string concatenation
  **Rule:** Security → SQL Injection
  **Fix:** Use parameterized queries / PreparedStatement.

### Warning
- [PaymentService.java:45] Weak hashing algorithm (MD5) for password storage
  **Rule:** Security → Weak Encryption
  **Impact:** MD5 is vulnerable to collision attacks and rainbow tables
  **Fix:** Migrate to bcrypt or Argon2 for password hashing.

### Suggestion
None

### Summary
- Critical: 2
- Warning: 1
- Suggestion: 0
```

---

## Important Notes

- Be precise with line numbers — verify they are correct
- Cite the specific rule from your specialist rules file
- Keep descriptions concise (one sentence)
- Fix directions should be actionable but brief
- When in doubt about severity, check issue-classification.md definitions
