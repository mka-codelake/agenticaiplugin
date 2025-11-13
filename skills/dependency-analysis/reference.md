# Dependency Analysis Reference

This reference provides detailed guidance for complex dependency analysis scenarios, including predefined ULTRATHINK prompts, advanced graph algorithms, and comprehensive dependency rules.

---

## Table of Contents

1. [ULTRATHINK Prompts (Predefined)](#ultrathink-prompts-predefined)
2. [Custom ULTRATHINK Guidance](#custom-ultrathink-guidance)
3. [Dependency Rules](#dependency-rules)
4. [Graph Algorithms](#graph-algorithms)
5. [Complex Examples](#complex-examples)

---

## ULTRATHINK Prompts (Predefined)

Use these predefined ULTRATHINK prompts for standard complex scenarios.

### Prompt 1: Complex Interdependency Analysis

**When to use:** Dependency graph has >5 stories with >8 edges (complex cross-dependencies)

**ULTRATHINK Prompt:**

```
ULTRATHINK: Analyze this complex dependency graph to identify critical path, bottlenecks, and optimal story ordering.

**Dependency Graph:**
[Provide current dependency graph with all stories and edges]

**Context:**
- Epic: [Epic ID and title]
- Total Stories: [Count]
- Total Dependencies: [Count]
- Sprint Capacity: [SP per sprint]

**Analysis Goals:**
1. Identify critical path (longest dependency chain from start to finish)
2. Calculate critical path length in story points
3. Identify bottleneck stories (stories with most dependencies pointing TO them)
4. Identify parallel work opportunities (stories with no dependencies that can be done simultaneously)
5. Suggest optimal story ordering for minimal total time
6. Calculate minimum number of sprints required

**Reasoning Process:**
- Build full dependency tree
- Trace all paths from start (no dependencies) to end (no dependents)
- Calculate path lengths in story points
- Identify parallelizable branches
- Consider sprint capacity constraints
- Suggest story distribution across sprints

**Output:**
- Critical path visualization (STORY-A → STORY-B → ...)
- Critical path length: [X SP]
- Minimum sprints required: [Y sprints]
- Bottleneck stories: [List with dependency counts]
- Parallelization opportunities: [Groups of stories that can be done simultaneously]
- Recommended sprint plan with story assignments
```

**Example Usage:**

When analyzing Epic-001 with 8 stories and 12 dependencies:
1. Parse all story files
2. Build dependency graph
3. Run ULTRATHINK with above prompt
4. Present results to user with visual graph

---

### Prompt 2: Circular Dependency Resolution

**When to use:** Circular dependency detected and no obvious break point

**ULTRATHINK Prompt:**

```
ULTRATHINK: A circular dependency has been detected in the story graph. Analyze the cycle and suggest resolution strategies.

**Detected Cycle:**
[Provide cycle path, e.g., STORY-012 → STORY-015 → STORY-018 → STORY-012]

**Story Details:**
[For each story in cycle, provide: ID, Title, Description, Dependencies with reasons, Story Points]

**Context:**
- Epic: [Epic ID and title]
- Sprint planning status: [Not started | In progress | Blocked by this cycle]

**Analysis Goals:**
1. Understand WHY each dependency exists (technical, business, or data reason)
2. Identify weakest link (dependency that could be removed with minimal impact)
3. Identify merge opportunities (can 2+ stories be combined into single story?)
4. Identify refactoring opportunities (can intermediate story break cycle?)
5. Assess impact of each resolution strategy

**Reasoning Process:**
- Analyze each dependency in cycle: Why does Story A depend on Story B?
- Categorize dependencies: Technical (code/API), Business (feature), Data (schema)
- Identify "soft" dependencies (nice-to-have) vs. "hard" dependencies (must-have)
- Consider story sizes: Would merging create too-large story? (>13 SP)
- Consider intermediate story: Could abstraction/interface break dependency?
- Evaluate impact: Which resolution causes least rework/risk?

**Output:**
- Root cause of cycle (why it exists)
- Resolution strategies ranked by feasibility:
  1. **Remove dependency:** [Which dependency to remove, why, impact]
  2. **Merge stories:** [Which stories to merge, new story description, SP]
  3. **Introduce intermediate story:** [New story description, how it breaks cycle, SP]
- Recommended approach with justification
- Updated story descriptions if refactoring needed
```

**Example Usage:**

When cycle detected: STORY-012 → STORY-015 → STORY-018 → STORY-012
1. Read all three story files
2. Extract dependencies with reasons
3. Run ULTRATHINK with above prompt
4. Present resolution options to user
5. Implement chosen resolution

---

### Prompt 3: Sprint Feasibility Analysis

**When to use:** Sprint has capacity issues OR blocking dependencies OR complex dependency chains

**ULTRATHINK Prompt:**

```
ULTRATHINK: Analyze this sprint plan for feasibility considering capacity, dependencies, and risk. Suggest optimizations.

**Sprint Details:**
- Sprint: [SPRINT-XX]
- Sprint Goal: [Goal description]
- Capacity: [X SP]
- Duration: [Y weeks]

**Planned Stories:**
[For each story: ID, Title, Story Points, Status, Dependencies, Risks]

**Current Issues:**
- Capacity: [Over/Under/OK - by how much]
- Blocking dependencies: [List stories blocked by out-of-sprint dependencies]
- Dependency chains: [List longest chain within sprint]

**Analysis Goals:**
1. Validate sprint is achievable given capacity and dependencies
2. Identify risks (blocking dependencies, over capacity, complex chains)
3. Suggest story adjustments to make sprint feasible
4. Balance capacity utilization (target 80-90%, not 100%)
5. Ensure dependencies allow parallel work (not all sequential)

**Reasoning Process:**
- Check capacity: Total SP vs. capacity (allow 10-20% buffer for unexpected work)
- Validate dependencies: All dependencies done or in sprint?
- Analyze dependency order: Can stories be parallelized or all sequential?
- Assess risk: Are there stories with unknown complexity or external dependencies?
- Consider alternatives: Which stories could be moved to next sprint with minimal impact?
- Optimize: What changes would make sprint most achievable while meeting goal?

**Output:**
- Feasibility rating: [Feasible | Risky | Not Feasible]
- Risk factors:
  - Capacity: [Over/Under/OK with percentage]
  - Dependencies: [List blocking dependencies]
  - Complexity: [Identify high-risk stories]
- Recommended adjustments:
  1. **Stories to remove:** [List with reasons - least impact on sprint goal]
  2. **Stories to add:** [If under capacity, suggest from backlog]
  3. **Dependency resolution:** [Suggestions to resolve blocking dependencies]
- Optimized sprint plan with story adjustments
- Expected capacity utilization: [X%]
```

**Example Usage:**

When creating SPRINT-05 with capacity issues:
1. Read sprint file
2. Read all story files for sprint
3. Calculate total SP, check dependencies
4. Run ULTRATHINK with above prompt
5. Present feasibility analysis and recommendations

---

### Prompt 4: Multi-Sprint Optimization

**When to use:** Planning multiple sprints with interdependent stories across sprints

**ULTRATHINK Prompt:**

```
ULTRATHINK: Optimize story distribution across multiple sprints to minimize total time while respecting dependencies and capacity.

**Planning Context:**
- Epic: [Epic ID and title]
- Total Stories: [Count]
- Total Story Points: [Sum]
- Sprint Capacity: [SP per sprint]
- Number of Sprints: [Target number or TBD]

**All Stories:**
[For each story: ID, Title, Story Points, Dependencies]

**Dependency Graph:**
[Provide full graph]

**Constraints:**
- Sprint capacity: [X SP per sprint]
- Dependencies: Stories can only be in sprint after dependency sprints
- Parallelization: Stories without dependencies can be in same sprint
- Capacity buffer: Target 80-90% utilization per sprint (not 100%)

**Analysis Goals:**
1. Calculate minimum number of sprints required (based on critical path)
2. Distribute stories across sprints optimally
3. Maximize parallelization (do independent stories simultaneously)
4. Balance capacity across sprints (avoid very uneven distribution)
5. Minimize wait times (don't leave sprints under-utilized if stories available)

**Reasoning Process:**
- Calculate critical path length: Minimum sprints = ceiling(critical_path_SP / capacity)
- Group stories by dependency level:
  - Level 0: No dependencies (can start immediately)
  - Level 1: Depend only on Level 0 stories
  - Level 2: Depend on Level 1 stories, etc.
- For each level, distribute stories across sprints:
  - Fill sprint up to 80-90% capacity
  - Prioritize stories on critical path
  - Add parallel stories if capacity allows
- Validate: All dependencies satisfied by earlier sprints?
- Optimize: Can story order reduce total sprints?

**Output:**
- Minimum sprints required: [X]
- Recommended sprint distribution:
  - SPRINT-01: [List stories with SP, total SP, % capacity]
  - SPRINT-02: [List stories with SP, total SP, % capacity]
  - ...
- Dependency satisfaction: [Confirm all dependencies met]
- Parallelization achieved: [How many stories done in parallel]
- Total time estimate: [X sprints × Y weeks = Z weeks]
```

**Example Usage:**

When planning Epic-002 with 12 stories across 3 sprints:
1. Read all story files for epic
2. Build dependency graph
3. Calculate total SP, sprint capacity
4. Run ULTRATHINK with above prompt
5. Generate sprint files with optimized story distribution

---

## Custom ULTRATHINK Guidance

For scenarios not covered by predefined prompts, use custom ULTRATHINK prompts.

### When to Use Custom ULTRATHINK

**Scenario: Very Large Epics (>20 stories)**
- Predefined prompts may not scale well
- Custom prompt should break analysis into phases:
  1. Analyze sub-graphs (groups of related stories)
  2. Analyze inter-group dependencies
  3. Synthesize overall plan

**Scenario: External Dependencies**
- Dependencies on other teams, infrastructure, third-party APIs
- Custom prompt should:
  1. Identify external dependencies explicitly
  2. Assess risk (when will external dependency be ready?)
  3. Plan contingencies (alternative stories if blocked)

**Scenario: Architecture Decisions Affecting Dependencies**
- Major architecture choice changes dependency structure
- Custom prompt should:
  1. Analyze dependencies under different architectures
  2. Compare tradeoffs (complexity, time, risk)
  3. Recommend architecture based on dependency impact

### Structuring Custom ULTRATHINK Prompts

**Template:**

```
ULTRATHINK: [Clear goal statement]

**Context:**
[All relevant information: stories, dependencies, constraints, goals]

**Analysis Goals:**
[Numbered list of what you want ULTRATHINK to figure out]

**Reasoning Process:**
[Guide ULTRATHINK through the steps it should take]

**Output:**
[Specify format of desired output]
```

**Best Practices:**

1. **Be Specific:** Clearly state what you want analyzed
2. **Provide Complete Context:** Include all relevant story details, dependencies, constraints
3. **Guide Reasoning:** Suggest logical steps (but don't dictate exact approach)
4. **Specify Output Format:** Make it clear what format you want (graph, list, recommendations, etc.)
5. **Iterate if Needed:** For very complex scenarios, use ULTRATHINK multiple times:
   - First pass: High-level analysis
   - Second pass: Deep dive into specific issues identified in first pass

### Example: Custom ULTRATHINK for External Dependencies

```
ULTRATHINK: Analyze this epic's dependency on external infrastructure team and plan sprints with contingencies.

**Context:**
- Epic: [Epic ID and title]
- Stories: [List with dependencies]
- External Dependency: Infrastructure team must provision Kafka cluster (ETA: Sprint 3, Risk: Medium)
- Our Stories Blocked: STORY-003, STORY-005, STORY-008 (cannot start until Kafka ready)
- Our Stories Not Blocked: STORY-001 (database setup), STORY-002 (domain model)

**Analysis Goals:**
1. Identify which stories can proceed before Kafka ready
2. Calculate minimum sprints if Kafka on time (Sprint 3)
3. Calculate maximum sprints if Kafka delayed to Sprint 5
4. Suggest contingency stories (work that can be done while waiting)
5. Plan sprint distribution with best-case and worst-case scenarios

**Reasoning Process:**
- Separate stories into: Blocked by Kafka vs. Not blocked
- For not-blocked stories: Can we do them in Sprints 1-2 while waiting?
- For blocked stories: What preparation work can we do? (interfaces, mocks, tests)
- Consider contingency: If Kafka delayed, what other backlog work could we pull in?
- Plan two scenarios: Kafka on time, Kafka delayed 2 sprints

**Output:**
- Best-case plan (Kafka ready Sprint 3): Sprint distribution with timeline
- Worst-case plan (Kafka ready Sprint 5): Alternative sprint distribution
- Contingency stories: Suggestions for work if blocked
- Risk mitigation: How to minimize impact of delay
```

---

## Dependency Rules

Detailed rules for each dependency type with examples and anti-patterns.

### Technical Dependencies

**Rule:** Code/API/library must exist before it can be used.

**Examples:**

| Dependency Story | Dependent Story | Reason |
|------------------|-----------------|--------|
| STORY-001: Kafka Connection Setup | STORY-003: Kafka Consumer | Consumer needs connection configuration and client instance |
| STORY-005: User Authentication API | STORY-008: Protected Endpoints | Endpoints need auth middleware/annotations |
| STORY-010: Database Schema Migration | STORY-012: User Repository | Repository needs tables/columns to exist |
| STORY-015: Logging Framework Setup | STORY-018: Service Logging | Services need logger instance and configuration |
| STORY-020: REST Client Interface | STORY-022: External API Integration | Integration needs client contract defined |

**When to Create Technical Dependency:**

✅ **DO create when:**
- Story B uses code/API from Story A
- Story B requires infrastructure set up in Story A
- Story B extends/implements interface defined in Story A
- Story B requires library/framework configured in Story A

❌ **DON'T create when:**
- Stories work on different layers (e.g., controller vs. repository) but don't call each other
- Stories share common dependency (e.g., both use Spring Boot) but don't depend on each other
- One story is "similar" to another but doesn't use its code

**Anti-Pattern: Over-specifying Technical Dependencies**

```markdown
# Bad: Creates unnecessary sequential order
STORY-001: Setup Spring Boot project
  ↓
STORY-002: Create User entity (depends on STORY-001)
  ↓
STORY-003: Create Product entity (depends on STORY-002)

# Good: Only necessary dependency
STORY-001: Setup Spring Boot project
  ↓
STORY-002: Create User entity (depends on STORY-001)
STORY-003: Create Product entity (depends on STORY-001)

Note: STORY-002 and STORY-003 can be done in parallel
```

---

### Business Dependencies

**Rule:** Feature must be usable before extensions/enhancements to that feature.

**Examples:**

| Dependency Story | Dependent Story | Reason |
|------------------|-----------------|--------|
| STORY-025: User Registration | STORY-028: User Profile Editing | Cannot edit profile if registration doesn't exist |
| STORY-030: Product Catalog Listing | STORY-033: Product Search Filtering | Cannot filter if listing doesn't exist |
| STORY-035: Shopping Cart Add Item | STORY-038: Shopping Cart Quantity Update | Cannot update quantity if add doesn't exist |
| STORY-040: Payment Processing | STORY-043: Refund Processing | Cannot refund if payment doesn't exist |
| STORY-045: Order Creation | STORY-048: Order Tracking | Cannot track if order creation doesn't exist |

**When to Create Business Dependency:**

✅ **DO create when:**
- Story B enhances/extends feature from Story A
- Story B is "advanced version" of Story A (e.g., edit after create)
- Story B requires Story A to be user-facing/functional first
- Story B makes sense only after Story A is live

❌ **DON'T create when:**
- Stories are both part of MVP but independent features
- Order doesn't matter from business perspective (can do either first)
- Stories are in same feature area but don't build on each other

**Anti-Pattern: Treating All Stories in Same Epic as Sequential**

```markdown
# Bad: Forces unnecessary order
EPIC-002: E-Commerce Features
  STORY-050: Product Listing
    ↓
  STORY-051: Shopping Cart (depends on STORY-050???)
    ↓
  STORY-052: Checkout (depends on STORY-051)

# Good: Only necessary business dependencies
EPIC-002: E-Commerce Features
  STORY-050: Product Listing (no dependencies)
  STORY-051: Shopping Cart (no dependencies - can be done in parallel with STORY-050)
  STORY-052: Checkout (depends on STORY-051 - cannot checkout without cart)

Note: Listing and Cart can be done in parallel, both needed before Checkout
```

---

### Data Dependencies

**Rule:** Data structures/schemas must exist before they can be populated or queried.

**Examples:**

| Dependency Story | Dependent Story | Reason |
|------------------|-----------------|--------|
| STORY-060: User Table Schema | STORY-062: User Data Migration | Cannot migrate data without table |
| STORY-065: Create User Index | STORY-068: User Search Query | Query needs index for performance |
| STORY-070: Redis Cache Setup | STORY-073: Cache User Sessions | Cannot cache without cache infrastructure |
| STORY-075: Test Data Generator | STORY-078: Integration Tests | Tests need test data |
| STORY-080: Database Seed Data | STORY-083: Demo Environment | Demo needs seed data |

**When to Create Data Dependency:**

✅ **DO create when:**
- Story B populates/queries data structure created in Story A
- Story B requires index/optimization created in Story A
- Story B needs test/seed data generated in Story A
- Story B requires database migration from Story A

❌ **DON'T create when:**
- Stories work on different tables with no foreign keys
- Both stories create their own data structures
- Order doesn't affect correctness (only performance)

**Anti-Pattern: Confusing Schema Dependencies with Business Dependencies**

```markdown
# Bad: Schema dependency treated as business dependency
STORY-090: User Table Schema
  ↓
STORY-091: User Registration (business logic)
  ↓
STORY-092: User Login (business logic)

# Good: Separate data vs. business dependencies
STORY-090: User Table Schema
  ↓
  ├─→ STORY-091: User Registration (depends on schema)
  └─→ STORY-092: User Login (depends on schema)

Note: Registration and Login both need schema, but are independent business features
```

---

### Dependency Best Practices

**1. Minimize Dependencies**
- Follow YAGNI: Don't create dependencies "just in case"
- Prefer parallel work: If stories can be done simultaneously, don't force order

**2. Make Dependencies Explicit**
- Always document WHY dependency exists
- Format: `[STORY-XXX] - [Type] [Clear reason]`
- Example: `[STORY-003] - Technical: Requires Kafka connection setup from STORY-001`

**3. Break Circular Dependencies Immediately**
- Circular dependencies prevent valid ordering
- Resolve before proceeding with implementation
- Use ULTRATHINK if cycle is complex

**4. Validate Dependencies During Sprint Planning**
- Use Sprint Readiness Check automatically
- Don't plan story before its dependencies are done/in-sprint
- Prefer dependencies done in earlier sprints (more confidence)

**5. Consider Story Size When Breaking Dependencies**
- Don't create tiny stories just to break dependencies
- Combine small dependent stories if total <5 SP and logically cohesive

---

## Graph Algorithms

Detailed algorithms used for dependency analysis.

### Topological Sort

**Purpose:** Find valid ordering of stories respecting all dependencies.

**Algorithm:**

```python
def topological_sort(stories, dependencies):
    """
    Kahn's Algorithm for Topological Sort

    Input:
    - stories: List of story IDs
    - dependencies: Dict[story_id] = [list of dependencies]

    Output:
    - Ordered list of stories (valid execution order)
    - OR error if circular dependency detected
    """

    # Calculate in-degree (number of dependencies) for each story
    in_degree = {story: 0 for story in stories}
    for story in stories:
        for dep in dependencies.get(story, []):
            in_degree[story] += 1

    # Queue of stories with no dependencies (in-degree = 0)
    queue = [story for story in stories if in_degree[story] == 0]
    result = []

    while queue:
        # Remove story with no dependencies
        current = queue.pop(0)
        result.append(current)

        # For all stories that depend on current
        for story in stories:
            if current in dependencies.get(story, []):
                in_degree[story] -= 1
                if in_degree[story] == 0:
                    queue.append(story)

    # If result doesn't contain all stories, there's a cycle
    if len(result) != len(stories):
        return None  # Circular dependency detected

    return result
```

**Usage Example:**

```
Stories: [STORY-001, STORY-002, STORY-003, STORY-004]
Dependencies:
  STORY-002 depends on STORY-001
  STORY-003 depends on STORY-001
  STORY-004 depends on STORY-002, STORY-003

Topological Sort Result:
  [STORY-001, STORY-002, STORY-003, STORY-004]
  OR
  [STORY-001, STORY-003, STORY-002, STORY-004]

Both are valid orderings.
```

---

### Cycle Detection

**Purpose:** Detect circular dependencies in story graph.

**Algorithm:**

```python
def detect_cycle(stories, dependencies):
    """
    Depth-First Search (DFS) with colors for cycle detection

    Input:
    - stories: List of story IDs
    - dependencies: Dict[story_id] = [list of dependencies]

    Output:
    - None if no cycle
    - Cycle path if cycle detected: [STORY-A, STORY-B, ..., STORY-A]
    """

    # Colors: WHITE (not visited), GRAY (visiting), BLACK (done)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {story: WHITE for story in stories}
    parent = {story: None for story in stories}

    def dfs(story, path):
        color[story] = GRAY
        path.append(story)

        # Visit all dependencies
        for dep in dependencies.get(story, []):
            if color[dep] == GRAY:
                # Back edge found - cycle detected
                cycle_start = path.index(dep)
                cycle = path[cycle_start:] + [dep]
                return cycle

            if color[dep] == WHITE:
                parent[dep] = story
                result = dfs(dep, path)
                if result:
                    return result

        path.pop()
        color[story] = BLACK
        return None

    # Try DFS from each unvisited story
    for story in stories:
        if color[story] == WHITE:
            cycle = dfs(story, [])
            if cycle:
                return cycle

    return None
```

**Usage Example:**

```
Stories: [STORY-010, STORY-012, STORY-015]
Dependencies:
  STORY-012 depends on STORY-010
  STORY-015 depends on STORY-012
  STORY-010 depends on STORY-015  # Cycle!

Cycle Detection Result:
  Cycle: [STORY-010, STORY-015, STORY-012, STORY-010]
```

---

### Critical Path Calculation

**Purpose:** Find longest dependency chain (determines minimum time required).

**Algorithm:**

```python
def calculate_critical_path(stories, dependencies, story_points):
    """
    Calculate critical path using Dynamic Programming

    Input:
    - stories: List of story IDs
    - dependencies: Dict[story_id] = [list of dependencies]
    - story_points: Dict[story_id] = story points

    Output:
    - Critical path: [STORY-A, STORY-B, ...]
    - Critical path length in story points
    """

    # First, get topological order (fails if cycle exists)
    topo_order = topological_sort(stories, dependencies)
    if topo_order is None:
        return None, 0  # Cycle detected

    # DP: longest_path[story] = longest path ending at story
    longest_path = {story: story_points[story] for story in stories}
    predecessor = {story: None for story in stories}

    # Process stories in topological order
    for story in topo_order:
        # Check all dependencies
        for dep in dependencies.get(story, []):
            new_length = longest_path[dep] + story_points[story]
            if new_length > longest_path[story]:
                longest_path[story] = new_length
                predecessor[story] = dep

    # Find story with maximum path length
    end_story = max(stories, key=lambda s: longest_path[s])
    critical_length = longest_path[end_story]

    # Reconstruct path
    path = []
    current = end_story
    while current is not None:
        path.append(current)
        current = predecessor[current]
    path.reverse()

    return path, critical_length
```

**Usage Example:**

```
Stories: [STORY-001 (3 SP), STORY-002 (5 SP), STORY-003 (2 SP), STORY-004 (8 SP)]
Dependencies:
  STORY-002 depends on STORY-001
  STORY-003 depends on STORY-001
  STORY-004 depends on STORY-002

Critical Path Calculation:
  Path 1: STORY-001 (3) → STORY-002 (5) → STORY-004 (8) = 16 SP
  Path 2: STORY-001 (3) → STORY-003 (2) = 5 SP

Critical Path: [STORY-001, STORY-002, STORY-004]
Critical Path Length: 16 SP
```

---

### Dependency Depth Analysis

**Purpose:** Calculate dependency level for each story (for sprint planning).

**Algorithm:**

```python
def calculate_dependency_depth(stories, dependencies):
    """
    Calculate dependency level for each story (0 = no dependencies)

    Input:
    - stories: List of story IDs
    - dependencies: Dict[story_id] = [list of dependencies]

    Output:
    - Dict[story_id] = depth level (0, 1, 2, ...)
    """

    depth = {story: 0 for story in stories}

    # Get topological order
    topo_order = topological_sort(stories, dependencies)
    if topo_order is None:
        return None  # Cycle detected

    # Process in topological order
    for story in topo_order:
        # Depth = max(depth of all dependencies) + 1
        if dependencies.get(story):
            max_dep_depth = max(depth[dep] for dep in dependencies[story])
            depth[story] = max_dep_depth + 1

    return depth
```

**Usage Example:**

```
Stories: [STORY-001, STORY-002, STORY-003, STORY-004, STORY-005]
Dependencies:
  STORY-002 depends on STORY-001
  STORY-003 depends on STORY-001
  STORY-004 depends on STORY-002, STORY-003
  STORY-005 depends on STORY-004

Dependency Depth:
  STORY-001: Depth 0 (no dependencies)
  STORY-002: Depth 1 (depends on depth 0)
  STORY-003: Depth 1 (depends on depth 0)
  STORY-004: Depth 2 (depends on depth 1)
  STORY-005: Depth 3 (depends on depth 2)

Sprint Planning:
  Sprint 1: STORY-001 (depth 0)
  Sprint 2: STORY-002, STORY-003 (depth 1, can be parallel)
  Sprint 3: STORY-004 (depth 2)
  Sprint 4: STORY-005 (depth 3)
```

---

## Complex Examples

Real-world dependency scenarios with analysis and resolution.

### Example 1: Complex Kafka Integration Epic

**Scenario:**

```
EPIC-001: Kafka Message Processing Integration

Stories:
- STORY-001: Kafka Connection Setup (3 SP)
- STORY-003: Kafka Consumer Implementation (5 SP)
- STORY-005: Message Deserialization (Avro Schema) (3 SP)
- STORY-008: Port Interface Definition (2 SP)
- STORY-010: Business Logic Implementation (8 SP)
- STORY-012: Error Handling & Dead Letter Queue (5 SP)
- STORY-015: Monitoring & Metrics (3 SP)
- STORY-018: Integration Tests (5 SP)

Dependencies:
- STORY-003 depends on STORY-001 (Technical: needs connection)
- STORY-005 depends on STORY-003 (Technical: needs consumer to deserialize messages)
- STORY-008 depends on STORY-005 (Technical: port interface needs message schema)
- STORY-010 depends on STORY-008 (Technical: business logic uses port interface)
- STORY-012 depends on STORY-003 (Technical: error handling for consumer)
- STORY-015 depends on STORY-001 (Technical: monitoring needs connection metrics)
- STORY-018 depends on STORY-010, STORY-012 (Business: tests validate complete flow)
```

**Dependency Graph:**

```
STORY-001 (3 SP)
  ├─→ STORY-003 (5 SP)
  │     ├─→ STORY-005 (3 SP)
  │     │     └─→ STORY-008 (2 SP)
  │     │           └─→ STORY-010 (8 SP)
  │     │                 └─→ STORY-018 (5 SP)
  │     └─→ STORY-012 (5 SP)
  │           └─→ STORY-018 (5 SP)
  └─→ STORY-015 (3 SP)
```

**Analysis:**

1. **Critical Path:** STORY-001 → STORY-003 → STORY-005 → STORY-008 → STORY-010 → STORY-018 = 26 SP
2. **Parallelization:**
   - STORY-012 and STORY-005 can be done in parallel (both depend on STORY-003)
   - STORY-015 can be done anytime after STORY-001
3. **Minimum Sprints:** 26 SP / 13 SP capacity = 2 sprints minimum

**Optimized Sprint Plan:**

```
SPRINT-01 (13 SP, 100% capacity):
- STORY-001: Kafka Connection (3 SP) [Depth 0]
- STORY-003: Kafka Consumer (5 SP) [Depth 1, depends on STORY-001]
- STORY-015: Monitoring (3 SP) [Depth 1, depends on STORY-001, parallel with STORY-003]
- STORY-005: Deserialization (3 SP) [Depth 2, depends on STORY-003] (starts mid-sprint)

Total: 14 SP (over by 1, but STORY-005 can slide to Sprint 2 if needed)

SPRINT-02 (13 SP, 100% capacity):
- STORY-005: Deserialization (3 SP) [if not done in Sprint 1]
- STORY-008: Port Interface (2 SP) [Depth 3]
- STORY-012: Error Handling (5 SP) [Depth 2, parallel with STORY-008]
- STORY-010: Business Logic (8 SP) [Depth 4] (starts mid-sprint)

Total: 18 SP (need to adjust)

SPRINT-02 (Adjusted):
- STORY-008: Port Interface (2 SP)
- STORY-012: Error Handling (5 SP)
- STORY-010: Business Logic (8 SP)

Total: 15 SP (still over by 2)

SPRINT-03:
- STORY-018: Integration Tests (5 SP)

Total: 5 SP (under-utilized)

FINAL PLAN (3 sprints):
- SPRINT-01: STORY-001, STORY-003, STORY-015 (11 SP, 85%)
- SPRINT-02: STORY-005, STORY-008, STORY-012 (10 SP, 77%)
- SPRINT-03: STORY-010, STORY-018 (13 SP, 100%)
```

**Recommendations:**
- Sprint 1 and 2 are under-utilized (can pull in other backlog work)
- STORY-010 (8 SP) is large - consider splitting if possible
- STORY-018 could start in Sprint 3 as soon as STORY-010 done

---

### Example 2: Circular Dependency Resolution

**Scenario:**

```
STORY-020: User Authentication API
  - Depends on: STORY-025 (needs user service to validate credentials)

STORY-025: User Profile Service
  - Depends on: STORY-030 (needs permissions to check access)

STORY-030: Permission Management
  - Depends on: STORY-020 (needs auth to protect permission endpoints)

Cycle: STORY-020 → STORY-025 → STORY-030 → STORY-020
```

**ULTRATHINK Analysis:**

```
Root Cause:
- STORY-020 needs User entity/service (provided by STORY-025)
- STORY-025 needs Permission checks (provided by STORY-030)
- STORY-030 needs Auth protection (provided by STORY-020)

This is a classic "bootstrapping" problem.

Resolution Strategies:

1. **Remove Dependency: STORY-030 → STORY-020**
   - Make Permission Management endpoints public initially
   - Add auth protection in follow-up story
   - Impact: Security risk (temporary public endpoints)
   - Feasibility: Low (security risk too high)

2. **Remove Dependency: STORY-025 → STORY-030**
   - User Profile Service doesn't check permissions initially
   - Add permission checks in follow-up story
   - Impact: All users can access all profiles initially
   - Feasibility: Medium (acceptable if flagged for later)

3. **Merge Stories: STORY-020 + STORY-025 + STORY-030**
   - Create single story: "User Authentication & Authorization System"
   - Implement all three together
   - Impact: Very large story (likely >13 SP)
   - Feasibility: Low (story too large)

4. **Introduce Intermediate Story: Mock Permission Service**
   - STORY-024: Mock Permission Service (always returns "allowed")
   - STORY-025 depends on STORY-024 (uses mock)
   - STORY-030 replaces mock with real implementation
   - Impact: Additional story, but breaks cycle cleanly
   - Feasibility: High (standard pattern for breaking cycles)

Recommended: Option 4 (Intermediate Story)

New Dependency Graph:
STORY-020 (Auth API)
  └─→ STORY-025 (User Service, depends on STORY-024 mock)
        └─→ STORY-030 (Real Permission, replaces STORY-024)

STORY-024 (Mock Permission): No dependencies
```

**Implementation:**

```markdown
# STORY-024: Mock Permission Service

**Story Points:** 1
**Dependencies:** None

## Description
Create a mock permission service that always returns "allowed" for all permission checks.
This allows User Profile Service to be implemented with permission checks, while
Permission Management is implemented separately.

## Acceptance Criteria
- [ ] Mock service implements Permission interface
- [ ] Always returns "allowed" for any permission check
- [ ] Clearly marked as TEMPORARY/MOCK in code and logs
- [ ] Unit tests confirm mock behavior

## Implementation Notes
// STORY-024 AC: Mock permission service for bootstrapping
@Service
@Profile("!production") // Never use in production
public class MockPermissionService implements PermissionService {
    private static final Logger log = LoggerFactory.getLogger(MockPermissionService.class);

    public MockPermissionService() {
        log.warn("USING MOCK PERMISSION SERVICE - ALL CHECKS RETURN ALLOWED");
    }

    @Override
    public boolean hasPermission(User user, String resource, String action) {
        return true; // Mock: always allowed
    }
}

## Follow-up
- STORY-030 will replace this mock with real permission implementation
```

---

### Example 3: Multi-Sprint Dependency Planning

**Scenario:**

```
EPIC-003: E-Commerce Platform MVP

12 Stories, 52 total SP, Sprint capacity: 13 SP

Stories:
- STORY-035: User Registration (3 SP) [No dependencies]
- STORY-036: User Login (3 SP) [Depends on STORY-035]
- STORY-037: Product Catalog (5 SP) [No dependencies]
- STORY-038: Product Search (3 SP) [Depends on STORY-037]
- STORY-039: Shopping Cart - Add Item (5 SP) [Depends on STORY-037]
- STORY-040: Shopping Cart - Update Quantity (2 SP) [Depends on STORY-039]
- STORY-041: Shopping Cart - Remove Item (2 SP) [Depends on STORY-039]
- STORY-042: Checkout (8 SP) [Depends on STORY-039, STORY-036]
- STORY-043: Payment Processing (5 SP) [Depends on STORY-042]
- STORY-044: Order Confirmation Email (3 SP) [Depends on STORY-043]
- STORY-045: Order History (5 SP) [Depends on STORY-043]
- STORY-046: Admin Dashboard (8 SP) [Depends on STORY-036, STORY-037]
```

**ULTRATHINK Optimization:**

```
Dependency Depth Analysis:
- Depth 0: STORY-035, STORY-037 (8 SP)
- Depth 1: STORY-036, STORY-038, STORY-039 (11 SP)
- Depth 2: STORY-040, STORY-041, STORY-042, STORY-046 (20 SP)
- Depth 3: STORY-043 (5 SP)
- Depth 4: STORY-044, STORY-045 (8 SP)

Critical Path:
STORY-035 → STORY-036 → STORY-042 → STORY-043 → STORY-044 = 22 SP
OR
STORY-037 → STORY-039 → STORY-042 → STORY-043 → STORY-044 = 23 SP (longer)

Minimum Sprints: 23 SP / 13 SP = 1.77 → 2 sprints (if perfect parallelization)
Realistic: 4 sprints (due to dependency depth)

Optimized Sprint Plan:

SPRINT-01 (13 SP, 100%):
- STORY-035: User Registration (3 SP)
- STORY-037: Product Catalog (5 SP)
- STORY-036: User Login (3 SP) [depends on 035, can start mid-sprint]
- STORY-038: Product Search (3 SP) [depends on 037, can start mid-sprint]

Rationale: Start both depth-0 stories, pull in depth-1 stories that can start mid-sprint

SPRINT-02 (13 SP, 100%):
- STORY-039: Shopping Cart - Add (5 SP)
- STORY-046: Admin Dashboard (8 SP)

Rationale: STORY-039 is on critical path, STORY-046 can be done in parallel

SPRINT-03 (12 SP, 92%):
- STORY-040: Cart - Update Quantity (2 SP)
- STORY-041: Cart - Remove Item (2 SP)
- STORY-042: Checkout (8 SP)

Rationale: Complete cart stories, then critical-path checkout

SPRINT-04 (14 SP, 108% - over capacity):
- STORY-043: Payment Processing (5 SP)
- STORY-044: Order Confirmation (3 SP)
- STORY-045: Order History (5 SP)

Rationale: STORY-044 and STORY-045 can be done in parallel after STORY-043

ADJUSTED SPRINT-04 (10 SP, 77%):
- STORY-043: Payment Processing (5 SP)
- STORY-044: Order Confirmation (3 SP)
- [Pull in 2 SP from backlog to reach ~85%]

SPRINT-05 (5 SP, 38% - under capacity):
- STORY-045: Order History (5 SP)
- [Pull in 8 SP from backlog to reach ~100%]

FINAL RECOMMENDATION:
- 5 sprints total
- Sprint 1-3 focused on MVP features
- Sprint 4-5 for post-checkout features + backlog work
- Total time: 5 sprints × 2 weeks = 10 weeks
```

---

This reference provides comprehensive guidance for dependency analysis. Load specific sections as needed based on complexity of the scenario.
