# Load Agentic Command

Loads and processes the `agentic.md` file to quickly understand the project context.

## Usage

```
/load-agentic
```

No parameters required.

## What It Does

1. **Check for agentic.md:**
   - Look for `agentic.md` in the project root

2. **If NOT found:**
   - Inform user that no context file exists
   - Suggest running `/create-agentic` first

3. **If found:**
   - Read the entire `agentic.md` file
   - Process and internalize the project context
   - Confirm understanding with a brief summary

## Execution Steps

### Step 1: Check Existence

```bash
ls agentic.md 2>/dev/null
```

### Step 2: Handle Missing File

If `agentic.md` does not exist, respond:

```
No agentic.md found in this project.

To create one, run:
  /create-agentic

This will analyze your project and create a context-optimized
overview for AI sessions.
```

**STOP here if file doesn't exist.**

### Step 3: Load and Process

If `agentic.md` exists:

1. Read the file using the Read tool
2. Parse the key sections:
   - Project purpose
   - Technology stack
   - Critical rules
   - Key file references
3. Internalize the context for the current session

### Step 4: Confirm Understanding

After processing, output a brief confirmation:

```
Project context loaded: [Project Name]

Understood:
- [Tech stack summary]
- [X] critical rules
- [Key focus areas]

Ready to work on this project.
```

## Example

```
User: /load-agentic

AI: Project context loaded: MyWebApp

Understood:
- Spring Boot 3.2 / Java 21 / Maven
- 5 critical rules (no mocking repositories, test containers required)
- Focus: REST API with Kafka integration

Ready to work on this project.
```

## When to Use

- **Start of new session:** First thing when starting work on a project
- **After switching projects:** Re-orient yourself quickly
- **Before complex tasks:** Ensure you have current context

## Related

- **/create-agentic** - Create or update the agentic.md file
- **CLAUDE.md** - Project-specific instructions (loaded separately)
