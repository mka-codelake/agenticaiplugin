---
name: dependency-analysis
description: Analyzes story dependencies with ULTRATHINK for complex interdependencies. Use PROACTIVELY when planning sprints, slicing epics into stories, or when user mentions "dependencies", "blocked by", or "depends on". Detects circular dependencies automatically.
---

Use this skill when:
- Planning sprints (automatically validates dependencies before sprint start)
- Slicing epics into stories (identifies and classifies dependencies)
- Detecting circular dependencies (warns automatically when cycles found)
- Visualizing dependency graphs (generates ASCII graphs)
- Analyzing complex interdependencies (uses ULTRATHINK for multi-level dependencies)

---

## Core Features

This skill provides **fully automatic dependency analysis** with four core capabilities:

### 1. Dependency Classification

**Automatically classifies dependencies into three types:**

**Technical Dependencies:**
- API contracts must exist before consumers
- Database schemas before queries/migrations
- Authentication/authorization before protected endpoints
- Libraries/frameworks before usage
- Infrastructure (Kafka, Redis) before service logic

**Business Dependencies:**
- User management before user-specific features
- Payment setup before transactions
- Configuration/settings before feature usage
- Core workflows before extensions

**Data Dependencies:**
- Database migrations before new columns
- Indexes before complex queries
- Cache setup before high-load features
- Test data before integration tests

**When creating/slicing stories:**
- Automatically identify dependency type
- Document in story's `Dependencies` section
- Format: `[STORY-XXX](../stories/STORY-XXX-description.md) - [Type] [Reason]`
- Example: `[STORY-003](STORY-003-kafka-consumer.md) - Technical: Requires Kafka connection setup`

---

### 2. Circular Dependency Detection

**Automatically detects cycles in story dependencies:**

**Detection Algorithm:**
1. Parse all story files in `claudedocs/stories/`
2. Build dependency graph: `STORY-A → STORY-B → STORY-C`
3. Run cycle detection (Depth-First Search)
4. Warn immediately if cycles found

**Warning Format:**
```
⚠️ CIRCULAR DEPENDENCY DETECTED:

STORY-012 → STORY-015 → STORY-018 → STORY-012

This cycle prevents valid story ordering. Please resolve by:
1. Breaking the cycle (remove one dependency)
2. Merging stories into single story
3. Introducing intermediate story to break cycle
```

**When to activate:**
- Automatically when new story dependencies added
- Automatically during sprint planning
- On demand when user mentions "circular" or "dependency cycle"

---

### 3. Sprint Readiness Check

**Automatically validates sprint plans before sprint start:**

**Validation Rules:**
1. **Dependency Completeness:** All dependencies of sprint stories must be:
   - ✅ Status: "Done" (completed in previous sprint)
   - ✅ Status: "In Progress" in earlier story within same sprint
   - ❌ Status: "Not Started" or in later sprint → **Blocking**

2. **Capacity Check:** Total story points ≤ sprint capacity

3. **No Circular Dependencies:** No cycles involving sprint stories

**Validation Output:**
```markdown
## Sprint Readiness: SPRINT-05

### Dependency Status
✅ STORY-012: All dependencies satisfied (STORY-008, STORY-010 done)
✅ STORY-015: No dependencies
⚠️ STORY-018: Depends on STORY-020 (Status: Not Started, Not in sprint)

### Capacity
- Total Story Points: 21
- Sprint Capacity: 25
- Utilization: 84%
✅ Capacity OK

### Circular Dependencies
✅ No circular dependencies detected

### Overall Readiness
⚠️ Sprint NOT READY - 1 blocking dependency (STORY-018 → STORY-020)

**Recommendation:**
- Option A: Add STORY-020 to sprint (increases SP to 26, over capacity)
- Option B: Remove STORY-018 from sprint
- Option C: Mark STORY-020 as "Done" if already completed
```

**When to activate:**
- Automatically when creating sprint file
- Automatically when adding stories to sprint
- On demand when user mentions "sprint readiness" or "validate sprint"

---

### 4. Dependency Graph Visualization

**Automatically generates ASCII dependency graphs:**

**Single-Level Graph (Story Dependencies):**
```
STORY-001: Kafka Connection Setup
    ↓
STORY-003: Kafka Consumer Implementation
    ↓
STORY-005: Message Deserialization
    ↓
STORY-008: Port Interface
    ↓
STORY-012: Business Logic Integration
```

**Multi-Level Graph (Epic → Stories → Dependencies):**
```
EPIC-001: Kafka Integration
│
├── STORY-001: Kafka Connection (3 SP) [Done]
│   └── No dependencies
│
├── STORY-003: Kafka Consumer (5 SP) [In Progress]
│   └── Depends on: STORY-001
│
├── STORY-005: Message Deserialization (3 SP) [Not Started]
│   └── Depends on: STORY-003
│
└── STORY-008: Port Interface (5 SP) [Not Started]
    └── Depends on: STORY-005
```

**Critical Path Visualization:**
```
Critical Path (Longest Dependency Chain):
STORY-001 (3 SP) → STORY-003 (5 SP) → STORY-005 (3 SP) → STORY-008 (5 SP)

Total Critical Path: 16 SP (minimum 2 sprints with 13 SP capacity)
```

**When to activate:**
- Automatically when user requests "dependency graph" or "visualize dependencies"
- On demand during sprint planning
- When analyzing epic complexity

---

## ULTRATHINK Integration

This skill uses **ULTRATHINK** for complex dependency scenarios that require deep reasoning.

### When to Use ULTRATHINK Automatically

**Scenario 1: Complex Interdependencies (>5 stories with cross-dependencies)**
- Trigger: When dependency graph has >5 nodes with >8 edges
- Action: Use ULTRATHINK to analyze critical path, identify bottlenecks, suggest optimal story ordering

**Scenario 2: Circular Dependency Resolution**
- Trigger: When cycle detected and no obvious break point
- Action: Use ULTRATHINK to analyze cycle, suggest refactoring (merge stories, introduce intermediate, break dependency)

**Scenario 3: Sprint Feasibility Analysis**
- Trigger: When sprint has capacity issues OR blocking dependencies OR complex dependency chains
- Action: Use ULTRATHINK to analyze tradeoffs, suggest sprint adjustments (add/remove stories, reorder, split stories)

**Scenario 4: Multi-Sprint Dependency Planning**
- Trigger: When planning multiple sprints with interdependent stories across sprints
- Action: Use ULTRATHINK to optimize story distribution across sprints, minimize wait times, balance capacity

### Predefined ULTRATHINK Prompts

For standard scenarios (1-4 above), use **predefined ULTRATHINK prompts** in `reference.md`:
- **Prompt 1:** Complex Interdependency Analysis
- **Prompt 2:** Circular Dependency Resolution
- **Prompt 3:** Sprint Feasibility Analysis
- **Prompt 4:** Multi-Sprint Optimization

### Custom ULTRATHINK Usage

For non-standard scenarios, use ULTRATHINK with custom prompts. See `reference.md` for guidance on:
- Structuring ULTRATHINK prompts for dependency analysis
- Combining multiple dependency analysis techniques
- Iterative ULTRATHINK for very complex scenarios (>20 stories)

---

## Automatic Activation Behavior

This skill activates **fully automatically** in these scenarios:

### During Story Creation/Slicing
1. **Identify dependencies** based on story description and acceptance criteria
2. **Classify dependency type** (Technical/Business/Data)
3. **Check for circular dependencies** when adding new dependency
4. **Update dependency graph** in story file

### During Sprint Planning
1. **Run Sprint Readiness Check** automatically when sprint file created
2. **Validate all dependencies** of sprint stories
3. **Check capacity** (total SP vs. sprint capacity)
4. **Detect circular dependencies** involving sprint stories
5. **Generate warnings** for blocking dependencies
6. **Suggest actions** to resolve issues

### When User Mentions Dependencies
- Keywords: "dependency", "dependencies", "depends on", "blocked by", "prerequisite"
- Action: Analyze mentioned dependencies, classify, validate

### When User Requests Visualization
- Keywords: "dependency graph", "visualize dependencies", "show dependencies", "critical path"
- Action: Generate ASCII graph based on requested scope (story, epic, sprint)

### When Circular Dependencies Suspected
- Keywords: "circular", "cycle", "dependency loop"
- Action: Run cycle detection, report results, suggest resolution (use ULTRATHINK if complex)

---

## Progressive Disclosure

**For detailed guidance, see `reference.md`:**

- **ULTRATHINK Prompts:** Load `reference.md` when complex scenarios require ULTRATHINK
- **Advanced Graph Algorithms:** Load when user asks about "topological sort", "critical path calculation", or "dependency depth"
- **Dependency Rules:** Load when user asks for "dependency best practices" or "when to create dependencies"
- **Complex Examples:** Load when analyzing very complex dependency scenarios (>10 stories, >15 edges)

**Only load `reference.md` when:**
- User explicitly asks for detailed dependency rules
- ULTRATHINK prompts needed for complex analysis
- User requests advanced graph algorithms
- Complex scenario requires detailed examples

---

## Integration with Other Skills

**agile-workflow:**
- Uses agile-workflow's story/sprint templates
- Reads `claudedocs/stories/` and `claudedocs/sprints/` for dependency data
- Updates story files with dependency classifications

**development-principles:**
- Aligns with YAGNI: Don't create unnecessary dependencies
- Aligns with KISS: Simplest dependency structure first

**testing-philosophy:**
- Dependencies affect test order: Test depended-on stories first
- Integration tests validate dependency contracts

---

**This skill activates automatically when user mentions: dependency, dependencies, depends on, blocked by, prerequisite, circular dependency, dependency cycle, dependency loop, sprint planning, sprint readiness, validate sprint, dependency graph, visualize dependencies, show dependencies, critical path.**
