---
description: Structures and manages Epics, Stories, and Sprints with templates. Use PROACTIVELY when user mentions "epic", "story", "sprint", "backlog", "planning", "slice", or wants to create agile artifacts. ALWAYS use templates from skills/agile-workflow/templates/.
user-invocable: false
---

Use this skill when creating or managing Epics, Stories, or Sprints in an agile workflow.

## Project Folder Structure

All agile artifacts are stored in the `claudedocs/` directory with the following structure:

```
claudedocs/
├── epics/       # Epic definitions (EPIC-XXX-description.md)
├── stories/     # User Stories (STORY-XXX-description.md)
├── sprints/     # Sprint plans (SPRINT-XX.md)
├── tasks/       # Technical tasks (TASK-XXX-description.md) - optional
└── adrs/        # Architectural Decision Records (ADR-XXX-decision.md)
```

**Important:** Always create these folders automatically if they don't exist. User should not have to create them manually.

## File Naming Conventions

**Format:** `[TYPE]-[ID]-[description].md`

- **IDs:** Zero-padded numbers (001, 002, 003, ...)
- **Description:** lowercase-with-dashes
- **Examples:**
  - Epics: `EPIC-001-kafka-integration.md`
  - Stories: `STORY-001-kafka-consumer-setup.md`
  - Sprints: `SPRINT-01.md`
  - Tasks: `TASK-001-docker-compose-setup.md`
  - ADRs: `ADR-001-database-selection.md`

**Always use forward slashes (/) in paths, even on Windows.**

## Templates

Located in `templates/` directory:
- `epic.md.j2` - Epic template
- `story.md.j2` - User Story template
- `sprint.md.j2` - Sprint plan template

**Use these templates for consistency.** Render them with Jinja2, filling in variables from context.

## Epic Creation

**When to use:** User says "create epic", "new epic", "epic for [feature]"

**Template:** `templates/epic.md.j2`

**Required fields:**
- ID (auto-increment: EPIC-001, EPIC-002, ...)
- Title (short, descriptive)
- Goal (what problem does this solve?)
- Scope (what's included)
- Out-of-Scope (what's NOT included - important!)
- Status (Draft, In Progress, Done)

**File location:** `claudedocs/epics/EPIC-[ID]-[description].md`

## Story Slicing

**When to use:** User says "slice epic", "create stories", "break down epic"

**Template:** `templates/story.md.j2`

**Required fields:**
- ID (auto-increment: STORY-001, STORY-002, ...)
- Title (short, descriptive)
- User Story (format: "As a [role], I want [feature], so that [benefit]")
- Description (details)
- Acceptance Criteria (minimum 2, testable, specific)
- Story Points (Fibonacci: 1, 2, 3, 5, 8, 13)
- Dependencies (other stories this depends on)
- Epic Reference (link to parent epic)
- Status (Draft, Ready, In Progress, Review, Done)

**INVEST Criteria (apply these):**
- **I**ndependent - can be implemented standalone (or document dependencies)
- **N**egotiable - details can be discussed
- **V**aluable - delivers value to user
- **E**stimable - can be estimated (story points)
- **S**mall - fits in one sprint
- **T**estable - has clear acceptance criteria

**File location:** `claudedocs/stories/STORY-[ID]-[description].md`

## Sprint Planning

**When to use:** User says "plan sprint", "create sprint", "sprint planning"

**Template:** `templates/sprint.md.j2`

**Required fields:**
- Sprint Number (SPRINT-01, SPRINT-02, ...)
- Goal (what's the sprint focus?)
- Stories (list of stories in this sprint)
- Capacity (total story points, typically 20-30)
- Duration (start/end dates, typically 1-2 weeks)
- Status (Planning, Active, Review, Done)

**Important:**
- Respect **dependencies** (don't plan stories before their dependencies)
- Respect **capacity** (don't overload sprint)
- Stories should sum to capacity or less

**File location:** `claudedocs/sprints/SPRINT-[XX].md`

## Dependency Management

**When slicing stories, identify dependencies:**
- **Technical dependencies** (Story A must be done before Story B)
- **Business dependencies** (Feature X depends on Feature Y)
- **Data dependencies** (Schema must exist before usage)

**Document dependencies in story files:**
- In `Dependencies` section
- Format: `[STORY-XXX](../stories/STORY-XXX-description.md) - [reason]`

**For complex dependencies:** Use the `dependency-analysis` skill for ULTRATHINK-based analysis.

## Workflow: High-Level → Epic → Stories → Sprint

**Typical flow:**

1. **User describes feature high-level**
   - Example: "Kafka Dead Letter Queue for failed messages"

2. **Create Epic** (you create this)
   - EPIC-001: Kafka Dead Letter Queue
   - Goal, Scope, Out-of-Scope

3. **Slice into Stories** (you create these)
   - STORY-001: DLQ Topic Configuration
   - STORY-002: Retry Logic Implementation
   - STORY-003: DLQ Message Writer
   - STORY-004: DLQ Monitoring
   - Each with acceptance criteria, story points, dependencies

4. **Plan Sprint** (you create this)
   - SPRINT-01: STORY-001, STORY-002 (10 points)
   - Respects dependencies and capacity

5. **Implement Stories** (iterative)
   - User implements one story at a time
   - Can add new stories/epics anytime (flexible!)

## Best Practices

**Token Optimization:**
- Keep responses concise
- No verbose prose or explanations
- Focus on facts and actionable info
- Only load `reference.md` when user needs detailed guidelines

**Flexibility:**
- User can add new epics/stories anytime
- No rigid workflow enforcement
- Epic-by-epic development, not everything at once
- Adapt to changing requirements

**Auto-Detection:**
- Auto-increment IDs (find highest existing ID + 1)
- Auto-create `claudedocs/` folders if missing
- Auto-link stories to epics
- Auto-calculate sprint capacity

**Quality:**
- Stories must have testable acceptance criteria
- Story points in Fibonacci sequence only
- Dependencies must be documented
- Epic scope must be clear (Scope vs Out-of-Scope)

## Progressive Disclosure

For detailed information about agile practices, INVEST criteria, story point estimation strategies, and dependency analysis, see `reference.md`.

Only load `reference.md` when user asks for help with:
- "How do I write good acceptance criteria?"
- "What are INVEST criteria?"
- "How do I estimate story points?"
- "How do I handle dependencies?"

Otherwise, keep context lean.

---

**This skill activates automatically when user mentions: epic, story, sprint, backlog, planning, agile, acceptance criteria, story points.**
