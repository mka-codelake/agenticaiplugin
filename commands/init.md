# AgenticAI Plugin - Project Setup

Initialize your project with the AgenticAI Plugin by setting up required files and recommended directory structure.

## Your Task

Perform an interactive project setup for the AgenticAI Plugin with the following steps:

---

## Step 1: Status Check

Check the current setup status and display it visually:

**Check for these items:**
1. `CLAUDE.md` in project root (REQUIRED for agents)
2. `claudedocs/guidelines/` directory (RECOMMENDED - project-specific coding rules)
3. `claudedocs/testspecs/` directory (RECOMMENDED - test specifications)
4. `claudedocs/epics/` directory (OPTIONAL - auto-created by agile-workflow skill)
5. `claudedocs/stories/` directory (OPTIONAL - auto-created by agile-workflow skill)
6. `claudedocs/sprints/` directory (OPTIONAL - auto-created by agile-workflow skill)
7. `claudedocs/adrs/` directory (OPTIONAL - architectural decision records)

**Display format:**
```
🚀 AgenticAI Plugin - Project Setup

Current Status:
✅ CLAUDE.md - Already exists
❌ claudedocs/guidelines/ - Not found (recommended)
✅ claudedocs/testspecs/ - Already exists
❌ claudedocs/epics/ - Not found (auto-created by skills)
❌ claudedocs/stories/ - Not found (auto-created by skills)
❌ claudedocs/sprints/ - Not found (auto-created by skills)
❌ claudedocs/adrs/ - Not found (optional)
```

Use ✅ for existing items, ❌ for missing items.

---

## Step 2: Show What Will Be Done

Based on the status check, list what the setup will do:

**Example output:**
```
Setup will perform these actions:
- Merge CLAUDE.md with plugin template (backup created as CLAUDE.md.backup)
- Create claudedocs/guidelines/
- Create claudedocs/epics/
- Create claudedocs/stories/
- Create claudedocs/sprints/
- Create claudedocs/adrs/
```

---

## Step 3: Ask for Confirmation

Use the AskUserQuestion tool to ask:
- Question: "Proceed with AgenticAI Plugin setup?"
- Options: "Yes, set up now" / "No, cancel"

If user chooses "No, cancel" → Stop and inform them they can run `/cc-init` again later.

---

## Step 4: Handle CLAUDE.md (if user confirmed)

### Case A: CLAUDE.md does NOT exist

Simply copy the plugin template:
1. Use Read tool to read CLAUDE.template.md from plugin directory
2. Use Write tool to create CLAUDE.md in project root with that content
3. Report: "✓ Created CLAUDE.md from plugin template"

### Case B: CLAUDE.md ALREADY exists

Offer merge option using AskUserQuestion:
- Question: "CLAUDE.md already exists. How should we proceed?"
- Options:
  - "Merge with plugin template (creates backup)"
  - "Skip - I'll merge manually"

**If user chooses "Skip":**
- Report: "⊘ Skipped CLAUDE.md merge (user will merge manually)"
- Continue with directory creation

**If user chooses "Merge":**

Perform intelligent merge:

1. **Create backup:**
   - Read existing CLAUDE.md
   - Write to CLAUDE.md.backup
   - Report: "✓ Backed up existing CLAUDE.md → CLAUDE.md.backup"

2. **Read both files:**
   - Read existing CLAUDE.md (user version)
   - Read CLAUDE.template.md from plugin (template version)

3. **Merge strategy:**

   **Plugin sections that MUST be at the top (in this order):**
   - Title: "# Project Instructions for Claude Code"
   - Introduction paragraph
   - "## 🚨 CRITICAL: Never Make Assumptions - Always Ask for Clarification" (ALWAYS first!)
   - "## Automatic Code Review After Task Completion"
   - "## Protected Directories and Files"
   - Any other sections from CLAUDE.template.md

   **User sections:**
   - Extract sections from existing CLAUDE.md that are NOT in the plugin template
   - Add these AFTER all plugin sections
   - Avoid duplicates (skip if section title matches plugin section)

4. **Write merged file:**
   - Use Write tool to create new CLAUDE.md with merged content
   - Report: "✓ Merged CLAUDE.md (plugin sections on top, user sections preserved)"

---

## Step 5: Create Missing Directories

For each missing directory from the status check, create it:

**Directories to create (if missing):**
- `claudedocs/guidelines/` (recommended)
- `claudedocs/testspecs/` (recommended)
- `claudedocs/epics/` (optional)
- `claudedocs/stories/` (optional)
- `claudedocs/sprints/` (optional)
- `claudedocs/adrs/` (optional)

**Use Bash tool:**
```bash
mkdir -p claudedocs/guidelines
mkdir -p claudedocs/testspecs
mkdir -p claudedocs/epics
mkdir -p claudedocs/stories
mkdir -p claudedocs/sprints
mkdir -p claudedocs/adrs
```

**Report each created directory:**
```
✓ Created claudedocs/guidelines/
✓ Created claudedocs/testspecs/
✓ Created claudedocs/epics/
✓ Created claudedocs/stories/
✓ Created claudedocs/sprints/
✓ Created claudedocs/adrs/
```

Skip directories that already exist (don't report them).

---

## Step 6: Final Summary

Display a completion message:

```
✅ Setup complete! Your project is ready for AgenticAI Plugin.

Summary:
- CLAUDE.md: [Created/Merged/Skipped]
- Directories created: [count]

Next steps:
1. Add project-specific coding rules to claudedocs/guidelines/
2. Add test scenarios to claudedocs/testspecs/
3. Start using plugin features:
   - /cc-code-review - Review code quality
   - /cc-gitme - Smart git commits
   - /cc-test - Run tests

Happy coding with AgenticAI!
```

---

## Important Notes

**CLAUDE.template.md Location:**
The plugin template is located at:
- In plugin directory: `<plugin-path>/CLAUDE.template.md`
- You may need to determine the plugin installation path
- Common location: Check where the agenticaiplugin is installed

**Directory Paths:**
- All paths are relative to the current working directory (project root)
- Use forward slashes (/) even on Windows
- Create parent directories automatically with `mkdir -p`

**Error Handling:**
- If CLAUDE.template.md cannot be found, ask user for plugin installation path
- If Write operations fail, report errors clearly
- If Bash commands fail, report which directories couldn't be created

**Merge Quality:**
- Plugin's critical sections MUST stay at the top
- User's custom content should be preserved
- Avoid duplicate sections (prefer plugin version for duplicates)
- The "Never Make Assumptions" section is CRITICAL and MUST be first
