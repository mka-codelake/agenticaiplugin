# Project Initialization Command

Interactive project setup for AgenticAI Plugin.

## Usage

```
/agenticaiplugin:init [--only-claudemd]
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--only-claudemd` | Only create/merge CLAUDE.md, skip claudedocs directories |

## Examples

```bash
# Full setup (default) - creates CLAUDE.md + claudedocs directories
/agenticaiplugin:init

# Only CLAUDE.md, no claudedocs directories
/agenticaiplugin:init --only-claudemd
```

## What It Does

Creates CLAUDE.md and recommended directory structure for using AgenticAI Plugin features.

Invokes the `project-initializer` agent which guides you through:

1. **Status Check:**
   - Check for existing CLAUDE.md
   - Check for claudedocs/ directories

2. **Confirmation:**
   - Show what will be created/modified
   - Ask for user confirmation

3. **Setup:**
   - Create or merge CLAUDE.md with plugin template
   - Create `claudedocs/guidelines/` directory
   - Create `claudedocs/testspecs/` directory

4. **Summary:**
   - Report what was created
   - Show next steps

## Example

```
User: /agenticaiplugin:init

🚀 AgenticAI Plugin - Project Setup

Current Status:
❌ CLAUDE.md - Not found (required)
❌ claudedocs/guidelines/ - Not found (recommended)
❌ claudedocs/testspecs/ - Not found (recommended)

Setup will perform these actions:
- Create CLAUDE.md from plugin template
- Create claudedocs/guidelines/
- Create claudedocs/testspecs/

Proceed with AgenticAI Plugin setup?
> Yes, set up now

✓ Created CLAUDE.md from plugin template
✓ Created claudedocs/guidelines/
✓ Created claudedocs/testspecs/

✅ Setup complete! Your project is ready for AgenticAI Plugin.

Next steps:
1. Add project-specific coding rules to claudedocs/guidelines/
2. Add test scenarios to claudedocs/testspecs/
3. Start using plugin features:
   - /agenticaiplugin:code-review - Review code quality
   - /agenticaiplugin:gitme - Smart git commits
   - /agenticaiplugin:test - Run tests
```

## Related

- **/agenticaiplugin:config** - Configure plugin settings
- **/agenticaiplugin:code-review** - Review code quality
- **/agenticaiplugin:test** - Write integration tests
