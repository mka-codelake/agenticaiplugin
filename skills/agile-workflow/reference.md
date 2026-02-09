# Agile Workflow Reference

This document contains detailed guidelines for agile workflow practices. It's only loaded when user needs detailed help.

---

## Workflow Overview

### High-Level → Epics → Stories → Sprints

**Philosophy:** Start broad, then drill down. Don't design everything upfront.

```
1. High-Level Description
   ↓
2. Epics (1-4 months, major features/components)
   ↓
3. Stories (1 Sprint, deliverable increments)
   ↓
4. Sprints (1-2 weeks, capacity-based planning)
   ↓
5. Implementation (iterative, story-by-story)
```

**Flexibility:** New epics/stories can be added anytime. No rigid sequencing.

---

## Epic Guidelines

### What is an Epic?

A large body of work that:
- Takes 1-4 months to complete
- Breaks down into multiple stories
- Represents a major feature or component
- Delivers significant value

### When to Create an Epic

- Major feature development (e.g., "User Authentication System")
- Component implementation (e.g., "Kafka Integration Layer")
- Large refactoring efforts (e.g., "Database Migration to PostgreSQL")
- Cross-cutting concerns (e.g., "Security Hardening")

### Epic Structure

**Goal:** What problem does this solve? (1-2 sentences, business value)

**Scope:** What's included? (bullet points, features/capabilities)

**Out-of-Scope:** What's explicitly NOT included? (prevents scope creep)

**Example:**

```markdown
## Goal
Enable users to authenticate securely using OAuth 2.0 with support for social logins.

## Scope
- OAuth 2.0 server implementation
- Google and GitHub provider integration
- User session management
- Token refresh mechanism

## Out-of-Scope
- Two-factor authentication (separate epic)
- Password reset (separate epic)
- LDAP integration (not required)
```

### Epic Sizing

- **Too large:** Takes >8 sprints → Split into multiple epics
- **Too small:** Takes <1 sprint → Might be just a story
- **Just right:** 1-4 months, 3-10 stories

---

## Story Guidelines

### INVEST Criteria

Every story should be:

**I - Independent**
- Can be implemented without other stories (or dependencies are documented)
- Doesn't block other work unnecessarily
- Can be moved between sprints if needed

**N - Negotiable**
- Details can be discussed and adjusted
- Implementation approach is flexible
- Acceptance criteria can be refined

**V - Valuable**
- Delivers value to users or stakeholders
- Has clear business benefit
- Not just "tech for tech's sake"

**E - Estimable**
- Team can estimate effort (story points)
- Scope is clear enough to understand
- Unknowns are identified

**S - Small**
- Fits within one sprint (1-2 weeks)
- Story points typically 1-8 (Fibonacci)
- If >13 points, consider splitting

**T - Testable**
- Has clear acceptance criteria
- Success is measurable
- Can be demonstrated/verified

### User Story Format

**Template:**
```
As a [role/persona],
I want [feature/capability],
so that [benefit/value].
```

**Examples:**

✅ **Good:**
```
As a customer,
I want to reset my password via email,
so that I can regain access to my account if I forget my password.
```

✅ **Good:**
```
As a system administrator,
I want to view Kafka consumer lag metrics in a dashboard,
so that I can proactively identify performance issues.
```

❌ **Bad (too technical, no user perspective):**
```
Implement password reset endpoint with email service integration.
```

❌ **Bad (no benefit):**
```
As a user, I want a button on the profile page.
```

### Acceptance Criteria Guidelines

**Rules:**
- Minimum 2 criteria per story
- Must be **testable** (can verify pass/fail)
- Must be **specific** (no vague terms like "should work well")
- Use "Given-When-Then" format when helpful

**Good Examples:**

✅ **Testable and Specific:**
```
- User receives password reset email within 60 seconds of request
- Reset link expires after 24 hours
- Invalid/expired reset links show clear error message
- Password must meet complexity requirements (8+ chars, 1 uppercase, 1 number)
```

✅ **Given-When-Then Format:**
```
Given a user with email "test@example.com" exists,
When they request a password reset,
Then they receive an email with a valid reset link.

Given a password reset link older than 24 hours,
When the user clicks the link,
Then they see an "expired link" error message.
```

❌ **Bad (too vague):**
```
- Password reset should work properly
- User should be able to reset password easily
- System should handle errors gracefully
```

### Story Splitting Techniques

**When to split:**
- Story is >13 points
- Story has multiple "and" clauses
- Story has complex dependencies

**How to split:**

1. **By CRUD Operations:**
   - Story 1: Create User
   - Story 2: Update User
   - Story 3: Delete User

2. **By User Role:**
   - Story 1: Admin can view reports
   - Story 2: Manager can view reports
   - Story 3: User can view own reports

3. **By Happy/Sad Path:**
   - Story 1: Successful password reset (happy path)
   - Story 2: Error handling (expired link, invalid email, etc.)

4. **By Priority:**
   - Story 1: Basic search (must-have)
   - Story 2: Advanced filters (nice-to-have)
   - Story 3: Search suggestions (nice-to-have)

5. **By Component:**
   - Story 1: Backend API for password reset
   - Story 2: Frontend UI for password reset
   - Story 3: Email template design

---

## Story Points

### Fibonacci Sequence

Use: **1, 2, 3, 5, 8, 13**

- **1 point:** Trivial (30 min - 2 hours)
  - Example: Update label text, fix typo, add logging

- **2 points:** Simple (2-4 hours)
  - Example: Add new field to form, create simple REST endpoint

- **3 points:** Straightforward (4-8 hours, ~1 day)
  - Example: Implement CRUD for simple entity, add basic validation

- **5 points:** Moderate (1-2 days)
  - Example: Integrate with external API, implement complex validation

- **8 points:** Complex (2-4 days)
  - Example: Design and implement caching layer, add authentication

- **13 points:** Very complex (should be split!)
  - Example: Refactor major component, migrate database

### Estimation Guidelines

**Consider:**
- **Complexity:** How difficult is the logic?
- **Uncertainty:** How well do we understand requirements?
- **Dependencies:** How many external systems/teams involved?
- **Testing:** How complex is test coverage?

**Don't consider:**
- **Who** will implement it (story points are team-relative, not person-specific)
- **When** it will be done (time comes from velocity, not points)

**Best Practice:** Use Planning Poker or team consensus to estimate.

---

## Sprint Planning

### Sprint Duration

**Recommended:** 1-2 weeks

- **1 week:** Fast feedback, less planning overhead, good for small teams
- **2 weeks:** Standard, balances planning and execution
- **>2 weeks:** Too long, reduces agility

### Sprint Capacity

**Typical:** 20-30 story points per sprint (varies by team)

**Factors:**
- Team size
- Team velocity (historical data)
- Availability (vacations, meetings, etc.)
- Support/maintenance overhead

**Example:**
- Team of 3 developers
- 2-week sprint
- Historical velocity: 25 points
- Current sprint: 1 person on vacation
- Adjusted capacity: 20 points (25 * 2/3)

### Dependency Management

**Rule:** Don't plan a story before its dependencies are done.

**Dependency Types:**

1. **Technical Dependencies**
   - "Story B needs API from Story A"
   - Solution: Plan Story A in earlier sprint

2. **Business Dependencies**
   - "Feature Y requires Feature X to be live"
   - Solution: Prioritize Feature X

3. **Data Dependencies**
   - "Service needs database schema from another team"
   - Solution: Coordinate with other team, or create stub

**Visualize Dependencies:**
```markdown
## Dependency Graph

```
STORY-001 (Kafka Consumer)
    ↓
STORY-002 (Message Deserialization)
    ↓
STORY-003 (Port Interface)
    ↓
STORY-004 (Business Logic)
```

**Sprint Planning:**
- Sprint 1: STORY-001, STORY-002 (10 points)
- Sprint 2: STORY-003, STORY-004 (12 points)
```

**For complex dependency analysis, use ULTRATHINK-based analysis for circular dependency detection and sprint readiness validation.**

---

## Common Anti-Patterns

### ❌ Epic Scope Creep

**Problem:** Epic keeps growing, never finishes.

**Solution:** Define clear "Out-of-Scope". Create new epic for additional features.

### ❌ Stories Without Acceptance Criteria

**Problem:** No clear definition of done, endless rework.

**Solution:** Require minimum 2 testable acceptance criteria per story.

### ❌ Technical Stories Without User Value

**Problem:** "Refactor database layer" - no clear user benefit.

**Solution:** Frame as "Improve query performance by 50%" or split into user-facing features.

### ❌ Over-Committing Sprints

**Problem:** Planning 40 points when velocity is 25.

**Solution:** Use historical velocity, leave buffer for unknowns.

### ❌ Ignoring Dependencies

**Problem:** Planning dependent stories out of order.

**Solution:** Document dependencies, validate before sprint start.

---

## Best Practices

### ✅ Start High-Level

Don't design everything upfront. Start with system overview, identify epics, then drill down.

### ✅ Epic-by-Epic Development

Complete one epic before starting another (when possible). Reduces context switching.

### ✅ Flexible Planning

New requirements? Add new stories/epics. Don't force into existing structure.

### ✅ Regular Refinement

Review and refine stories before sprint planning. Clarify acceptance criteria, update estimates.

### ✅ Retrospective Learnings

After each sprint, identify improvements. Adjust velocity, process, or tools.

### ✅ Cross-Functional Stories

Include all aspects (backend, frontend, tests, docs) in one story when feasible.

### ✅ Definition of Done

Establish clear DoD for stories:
- Code implemented
- Tests written for all acceptance criteria and business logic
- Code reviewed
- Docs updated
- Integrated to main branch

---

## Quick Reference

### Epic Checklist
- [ ] Clear goal (1-2 sentences)
- [ ] Scope defined (what's included)
- [ ] Out-of-Scope defined (what's NOT included)
- [ ] Realistic size (1-4 months)

### Story Checklist
- [ ] INVEST criteria met
- [ ] User story format ("As a..., I want..., so that...")
- [ ] Minimum 2 testable acceptance criteria
- [ ] Story points assigned (Fibonacci)
- [ ] Dependencies documented
- [ ] Epic reference linked

### Sprint Checklist
- [ ] Sprint goal defined
- [ ] Capacity calculated (based on velocity)
- [ ] Stories selected (sum <= capacity)
- [ ] Dependencies validated (no blocking issues)
- [ ] Team committed

---

**When in doubt, keep it simple. Agile is about flexibility and delivering value, not perfect documentation.**
