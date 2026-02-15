---
name: knowledge
description: Search, store, or list knowledge entries in the local knowledge database
disable-model-invocation: true
argument-hint: "search <query> | store | list"
---

# /knowledge — Knowledge Database Skill

Parse the user's argument to determine the subcommand and execute the corresponding CLI command.

## Usage

- `/knowledge search <query>` — Search for knowledge entries
- `/knowledge store` — Store new knowledge (will prompt for details)
- `/knowledge list` — List recent entries

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **No argument provided** → Default to `search` and ask the user what to search for.

## Subcommand: search

Run via Bash:
```
aiknowledgedb search "<query>" --json
```

Parse the JSON output. Present results as a formatted list:
- For each entry: show `#id`, `title`, `similarity score`, and a content preview (first 200 chars).
- If no results: say "No results found."

## Subcommand: store

Ask the user for:
1. **Title** (optional but recommended)
2. **Content** (required)

Then run via Bash:
```
echo "<content>" | aiknowledgedb store --title "<title>" --json
```

Confirm success with the returned entry ID.

## Subcommand: list

Run via Bash:
```
aiknowledgedb list --json
```

Present entries as a formatted list with `#id`, `title`, and `created_at`.

## Prerequisites

The `aiknowledgedb` CLI must be installed and available in PATH. Verify with:
```
aiknowledgedb --version
```

## Error Handling

If `aiknowledgedb` is not found in PATH, suggest:
```
Install: npm install -g aiknowledgedb
```

If Ollama is not running (search fails with hybrid/vector mode), retry with `--mode text`:
```
aiknowledgedb search "<query>" --mode text --json
```
