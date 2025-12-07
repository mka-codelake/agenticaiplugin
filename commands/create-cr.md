# Create Change Request Command

Transfers all relevant context from the current planning session into a Change Request (CR) document, ensuring a new agent in a fresh session has all information needed for implementation.

## Usage

```
/agenticaiplugin:create-cr [filename]
```

### Variants

**Without parameter - Create new CR:**
```
/agenticaiplugin:create-cr
```
Creates a new CR file at `claudedocs/crs/CR_<descriptive-name>.md` based on the current session context.

**With parameter - Update existing CR:**
```
/agenticaiplugin:create-cr CR_user-authentication.md
```
Reviews the specified CR file and updates it with any missing information from the current context.

## What It Does

### Create Mode (no parameter)

1. **Analyze Current Context:**
   - Extract all planning decisions made in this session
   - Identify implementation requirements
   - Capture technical decisions and rationale
   - Note any constraints or dependencies discussed

2. **Generate CR Document:**
   - Create `claudedocs/crs/` directory if needed
   - Generate `CR_<topic-name>.md` with descriptive name
   - Write comprehensive implementation context

3. **CR Document Structure:**
   ```markdown
   # CR: <Title>

   ## Summary
   Brief description of what needs to be implemented.

   ## Context & Background
   Why this change is needed, what problem it solves.

   ## Requirements
   - Functional requirements
   - Non-functional requirements
   - Acceptance criteria

   ## Technical Decisions
   - Architecture decisions made
   - Technology choices with rationale
   - Patterns to follow

   ## Implementation Notes
   - Key files to modify
   - Specific approaches discussed
   - Edge cases to handle

   ## Dependencies
   - External dependencies
   - Internal dependencies on other features
   - Order of implementation if relevant

   ## Out of Scope
   What was explicitly decided NOT to include.

   ## Open Questions
   Any unresolved items (should ideally be empty).
   ```

### Update Mode (with filename)

1. **Read Existing CR:**
   - Load the specified CR file from `claudedocs/crs/`

2. **Context Gap Analysis:**
   - Compare CR content against current session context
   - Identify information discussed but not documented
   - Check for outdated information that needs updating
   - Verify all decisions are captured

3. **Report & Update:**
   - Show what's missing or outdated
   - Ask for confirmation before updating
   - Update the CR with missing information
   - Preserve existing structure where possible

## Example

### Create New CR

```
User: /agenticaiplugin:create-cr

Analyzing current session context...

Found in context:
- Planning discussion about user authentication feature
- Decision to use JWT tokens
- Database schema changes discussed
- API endpoints defined
- Security considerations noted

Creating CR document...

Created: claudedocs/crs/CR_user-authentication.md

Contents:
- Summary: JWT-based authentication system
- 5 functional requirements captured
- 3 technical decisions documented
- 4 files identified for modification
- 2 dependencies noted

The CR is ready for a new session. An agent starting fresh
will have all context needed for implementation.
```

### Update Existing CR

```
User: /agenticaiplugin:create-cr CR_user-authentication.md

Reading existing CR: claudedocs/crs/CR_user-authentication.md

Comparing with current session context...

Gap Analysis:
+ Missing: Rate limiting decision (discussed at session start)
+ Missing: Password complexity requirements
+ Outdated: Token expiry changed from 1h to 24h
= Complete: Database schema section
= Complete: API endpoints section

Proposed updates:
1. Add rate limiting section under Technical Decisions
2. Add password requirements to Requirements
3. Update token expiry in Implementation Notes

Proceed with updates?
> Yes

Updated: claudedocs/crs/CR_user-authentication.md
- Added 2 new sections
- Updated 1 existing section

CR is now synchronized with session context.
```

## Execution Instructions

When this command is invoked, perform these steps:

### Step 1: Determine Mode

Check if a filename parameter was provided:
- **No parameter**: Create mode
- **With parameter**: Update mode

### Step 2: Create Mode Execution

1. **Review entire conversation context** - Go through all messages in this session
2. **Extract key information:**
   - What is being planned/built?
   - What decisions were made and why?
   - What technical approaches were discussed?
   - What files/components are involved?
   - What constraints or requirements exist?
   - What was explicitly excluded?
   - Are there open questions?

3. **Create directory if needed:**
   ```bash
   mkdir -p claudedocs/crs
   ```

4. **Generate descriptive filename:**
   - Based on the main topic discussed
   - Format: `CR_<topic-in-kebab-case>.md`
   - Example: `CR_user-authentication.md`, `CR_payment-integration.md`

5. **Write CR document** using the structure above

6. **Report what was captured** with a summary

### Step 3: Update Mode Execution

1. **Read existing CR file** from `claudedocs/crs/<filename>`

2. **Review entire conversation context** - Same as create mode

3. **Perform gap analysis:**
   - What's in context but not in CR? (Missing)
   - What's in CR but contradicted by context? (Outdated)
   - What's in both and consistent? (Complete)

4. **Report findings** to user with clear categories

5. **Ask for confirmation** before making changes

6. **Update CR** preserving structure, adding missing content

7. **Report what was updated**

## Key Principle

**The CR must be self-contained.** A new agent in a fresh session should be able to read ONLY the CR file and have complete understanding of:
- What needs to be done
- Why it needs to be done
- How it should be done
- What constraints apply

If any of this information exists only in the current session context and not in the CR, the CR is incomplete.

## Related

- **/agenticaiplugin:init** - Initialize project structure (creates claudedocs/)
- **/agenticaiplugin:create-docs** - Create project documentation
