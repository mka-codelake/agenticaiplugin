Perform a comprehensive code review on the specified file using the code-reviewer agent.

## Usage

```
cc-code-review <file>
```

**Required Parameter:**
- `<file>`: Path to the code file to review (must be exactly one file)

## Examples

```bash
cc-code-review src/main/java/com/example/UserService.java
cc-code-review UserController.java
cc-code-review src/test/java/UserServiceTest.java
```

## Validation

**You MUST validate the parameter:**

1. If NO parameter provided:
   ```
   Usage: cc-code-review <file>

   Performs code review on the specified file.

   Examples:
     cc-code-review src/main/java/UserService.java
     cc-code-review UserController.java
   ```
   STOP execution, do NOT proceed with review.

2. If parameter provided:
   - Extract the file path
   - Verify file exists (if not, report error)
   - Proceed with review

## Execution

Once validated, invoke the code-reviewer agent:

1. **Start the code-reviewer agent** using the Task tool:
   - subagent_type: "code-reviewer"
   - description: "Review code file"
   - prompt: Detailed prompt specifying the file to review

2. **Agent prompt should include:**
   - The specific file path to review
   - Instruction to load claudedocs/guidelines/*.md
   - Instruction to apply relevant skills
   - Request for structured finding report

3. **Example prompt structure:**
   ```
   Review the following file for code quality issues:

   File: {file_path}

   Instructions:
   1. Load all project guidelines from claudedocs/guidelines/*.md
   2. Activate relevant development skills (development-principles, java-best-practices, etc.)
   3. Review the file against all applicable rules
   4. Remember: Project guidelines override skill guidelines when conflicts occur
   5. Generate a structured finding report with:
      - Critical issues (must fix)
      - Warnings (should address)
      - Suggestions (optional improvements)
   6. Include specific line numbers and rule references for each finding

   Provide only the finding report, no code fixes.
   ```

4. **After agent completes:**
   - Display the finding report to the user
   - Do NOT automatically fix issues
   - Let user decide next steps

## Important Notes

- This command is for **manual** code review on a **single file**
- For automatic review after task completion, set up your project with `/agenticaiplugin:init` (creates CLAUDE.md)
- The code-reviewer agent will check both project guidelines and skills
- Project-specific guidelines (claudedocs/guidelines/*.md) take precedence over skill guidelines

## Error Handling

If the file doesn't exist:
```
Error: File not found: {file_path}

Please verify the file path and try again.
```

If the file is not a code file (.java, .kt, .scala, .py, .js, .ts, etc.):
```
Warning: {file_path} may not be a code file.

Proceeding with review anyway...
```
