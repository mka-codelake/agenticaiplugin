# Architecture Decisions Reference

This reference provides detailed guidance for creating high-quality Architectural Decision Records (ADRs), including best practices, examples, and common pitfalls.

---

## Table of Contents

1. [ADR Best Practices](#adr-best-practices)
2. [Good ADR Examples](#good-adr-examples)
3. [Bad ADR Examples (Anti-Patterns)](#bad-adr-examples-anti-patterns)
4. [Status Lifecycle Details](#status-lifecycle-details)
5. [When to Create ADRs (Detailed)](#when-to-create-adrs-detailed)
6. [Superseding and Deprecating ADRs](#superseding-and-deprecating-adrs)
7. [Integration with Agile Workflow](#integration-with-agile-workflow)

---

## ADR Best Practices

### 1. Focus on "Why" Not "What"

**Good:** "We chose PostgreSQL because we need strong ACID guarantees for financial transactions and complex relational queries."

**Bad:** "We chose PostgreSQL. It has tables, indexes, and transactions."

**Reason:** The "what" (PostgreSQL features) can be found in documentation. The "why" (our specific reasoning) cannot.

---

### 2. Document Alternatives Honestly

**Good:**
```markdown
## Alternatives Considered

### MongoDB
**Pros:**
- Schema flexibility for evolving data models
- Horizontal scaling built-in
- Rich query language for documents

**Cons:**
- No multi-document ACID transactions (as of v4.0)
- Eventual consistency can cause data anomalies
- Our team has limited MongoDB experience

### DynamoDB
**Pros:**
- Fully managed (no operational overhead)
- Predictable performance at scale
- Pay-per-use pricing

**Cons:**
- Vendor lock-in to AWS
- Limited query capabilities (no complex joins)
- Higher cost for our workload (estimated $500/month vs $50/month for PostgreSQL)
```

**Bad:**
```markdown
## Alternatives Considered

We also looked at MongoDB and DynamoDB but PostgreSQL is better.
```

**Reason:** Showing you did due diligence builds trust. Future readers can understand tradeoffs.

---

### 3. Be Honest About Negative Consequences

**Good:**
```markdown
### Negative

- Requires PostgreSQL expertise on team (currently only 1 person knows PostgreSQL well)
- Higher operational complexity than managed services (backups, failover, monitoring)
- Migration from current MySQL database will take ~2 weeks
- Query performance may degrade if we don't properly index (risk)
```

**Bad:**
```markdown
### Negative

- None. PostgreSQL is the best choice.
```

**Reason:** Every decision has tradeoffs. Hiding them doesn't make them go away. Documenting them allows mitigation planning.

---

### 4. Keep ADRs Lightweight But Complete

**Good Length:** 200-500 lines (including examples)

**Too Short:** 50 lines (missing context or alternatives)

**Too Long:** 1000+ lines (should be broken into multiple ADRs or move details to separate docs)

**Guideline:**
- **Context:** 2-4 paragraphs (5-10 sentences)
- **Decision:** 1-2 paragraphs (clear statement)
- **Consequences:** 3-5 positive, 3-5 negative (bullet points)
- **Alternatives:** 2-3 alternatives with 3-4 pros/cons each

---

### 5. One Decision Per ADR

**Good:** Separate ADRs for:
- ADR-001: Use PostgreSQL for User Data
- ADR-002: Use Redis for Session Storage
- ADR-003: Use S3 for File Storage

**Bad:** Single ADR for:
- ADR-001: Data Storage Strategy (covers database, cache, file storage in one ADR)

**Reason:** Each decision has different context, alternatives, and may change independently.

---

### 6. Review ADRs After Implementation

**Practice:** Schedule a review 1-3 months after implementation.

**Questions to ask:**
- Did the decision work as expected?
- Were the predicted consequences accurate?
- Would we make the same decision today?
- Should this ADR be superseded or updated?

**Update ADR with:**
```markdown
## Review (3 months later)

**Date:** 2025-04-15
**Reviewer:** Team Lead

**Findings:**
- PostgreSQL has performed well for our workload
- Operational complexity was underestimated (we hired a DBA)
- Complex queries benefit significantly from PostgreSQL's query planner
- Migration took 3 weeks (not 2 weeks as estimated)

**Decision:** Keep ADR status as "Accepted". No changes needed.
```

---

### 7. Link Related ADRs

**Example:**

**ADR-003-authentication-strategy.md:**
```markdown
## Related Decisions

- [ADR-001](ADR-001-database-selection.md) - Database stores user credentials
- [ADR-005](ADR-005-api-architecture.md) - API endpoints require authentication
- [ADR-007](ADR-007-session-management.md) - Sessions managed separately from auth tokens
```

**Reason:** Architecture is interconnected. Linking ADRs shows dependencies and evolution.

---

## Good ADR Examples

### Example 1: Database Selection

```markdown
# ADR-001: Use PostgreSQL for User Data Storage

**Status:** Accepted
**Date:** 2025-01-15

---

## Context

We are building a multi-tenant SaaS application that stores user profiles, subscriptions, and usage data. Key requirements:

1. **ACID Transactions:** Financial data (subscriptions, payments) requires strong consistency
2. **Complex Queries:** Analytics features need joins across multiple tables
3. **JSON Support:** User preferences stored as flexible JSON (schema varies by tenant)
4. **Scalability:** Expect 100K users in first year, 1M users in 3 years
5. **Team Expertise:** Team has SQL experience but limited NoSQL experience

We need to choose a primary database that balances these requirements with operational complexity and cost.

## Decision

We will use **PostgreSQL 15** as our primary database for user data storage.

**Key Reasons:**
- Strong ACID compliance for financial transactions
- Excellent support for complex SQL queries (window functions, CTEs, subqueries)
- Native JSON/JSONB support for flexible user preferences
- Proven scalability to millions of rows with proper indexing
- Open-source with large community and tooling ecosystem

## Consequences

### Positive

- **Data Integrity:** ACID guarantees prevent data corruption in financial transactions
- **Query Power:** Complex analytics queries can be written in SQL without application-level joins
- **JSON Flexibility:** JSONB allows schema evolution without migrations
- **Rich Extensions:** PostGIS for geo features, pg_trgm for full-text search, pgcrypto for encryption
- **Cost Effective:** Open-source license, can run on commodity hardware or managed services (AWS RDS, Azure Database)
- **Mature Tooling:** pgAdmin, DBeaver, Flyway, Liquibase all support PostgreSQL

### Negative

- **Operational Complexity:** Requires expertise in backups, replication, failover, monitoring
- **Learning Curve:** Team needs training on PostgreSQL-specific features (JSONB, window functions, EXPLAIN)
- **Horizontal Scaling:** Sharding requires application-level logic or third-party tools (Citus)
- **Migration Cost:** ~2-3 weeks to migrate from current MySQL setup
- **Single Point of Failure:** Primary database failure impacts entire application (mitigated with replication)

### Neutral

- **Version Support:** PostgreSQL 15 supported until 2027, plan for upgrades every 2-3 years
- **Cloud Agnostic:** PostgreSQL runs on all major cloud providers (AWS RDS, Azure Database, GCP Cloud SQL)

## Alternatives Considered

### MySQL 8.0

**Description:** Popular open-source relational database, currently used in our prototype.

**Pros:**
- Team already familiar with MySQL
- Simpler replication setup (master-slave)
- Slightly faster for simple INSERT/UPDATE operations
- Larger community (more StackOverflow answers)

**Cons:**
- Weaker transaction isolation (default READ COMMITTED vs PostgreSQL's REPEATABLE READ)
- Limited JSON support compared to JSONB (no indexing on JSON fields)
- InnoDB limitations for complex queries (no FILTER clause, limited window functions)
- Less advanced optimizer (no parallel queries until v8.0.14)

**Why Not Chosen:** PostgreSQL's superior transaction guarantees and JSON support outweigh MySQL's simplicity.

### MongoDB 6.0

**Description:** Document-oriented NoSQL database with flexible schema.

**Pros:**
- Schema flexibility (no migrations needed for new fields)
- Horizontal scaling built-in (sharding)
- Native JSON storage (BSON format)
- Aggregation pipeline for complex queries

**Cons:**
- No multi-document ACID transactions across shards (consistency issues for financial data)
- Eventual consistency model can cause data anomalies
- Limited query capabilities (no JOIN equivalent, requires application-level joins)
- Team has zero MongoDB experience (3-6 month learning curve)
- Operational complexity of sharded cluster

**Why Not Chosen:** Financial data requires ACID guarantees that MongoDB cannot provide across documents.

### DynamoDB

**Description:** AWS fully-managed NoSQL database with single-digit millisecond latency.

**Pros:**
- Fully managed (no operational overhead for backups, scaling, patching)
- Predictable performance at any scale
- Pay-per-request pricing (scales to zero)
- Global tables for multi-region

**Cons:**
- **Vendor Lock-In:** Locked to AWS, difficult to migrate
- **Limited Queries:** No complex queries, joins, or aggregations (requires secondary indexes or GSIs)
- **Cost:** Estimated $500-800/month for our workload vs $50-100/month for PostgreSQL on EC2
- **Data Modeling Complexity:** Requires upfront design of access patterns (difficult to change later)
- **No ACID Across Items:** Transactions limited to single partition key

**Why Not Chosen:** Query limitations and cost outweigh benefits of managed service. We value data portability.

## Related Stories

- [STORY-005](../stories/STORY-005-user-profile-storage.md) - User Profile Storage
- [STORY-012](../stories/STORY-012-subscription-management.md) - Subscription Management
- [STORY-018](../stories/STORY-018-analytics-dashboard.md) - Analytics Dashboard

## Implementation Notes

**Database Setup:**
- PostgreSQL 15.2 on AWS RDS (db.t3.medium instance)
- Multi-AZ deployment for high availability
- Automated backups with 7-day retention
- Read replicas for analytics queries

**Migration Plan:**
1. Set up PostgreSQL RDS instance (Week 1)
2. Migrate schema from MySQL to PostgreSQL (Week 1-2)
3. Dual-write to both databases during transition (Week 2)
4. Validate data consistency (Week 2)
5. Switch reads to PostgreSQL (Week 3)
6. Decommission MySQL (Week 4)

**Team Training:**
- PostgreSQL fundamentals workshop (2 days)
- JSONB and indexing best practices (1 day)
- Query optimization and EXPLAIN (1 day)

## Review

**Scheduled Review:** 2025-04-15 (3 months after implementation)

*Review this decision after implementation to validate against actual practice.*
```

**Why This is Good:**
- ✅ Clear context explains the problem and requirements
- ✅ Decision is specific (PostgreSQL 15, not just "a database")
- ✅ Consequences are honest (6 positive, 5 negative, 1 neutral)
- ✅ Alternatives thoroughly evaluated (3 alternatives with 4+ pros/cons each)
- ✅ Related stories show impact on actual work
- ✅ Implementation notes provide actionable details
- ✅ Review scheduled for accountability

---

### Example 2: API Architecture

```markdown
# ADR-002: Use REST API with OpenAPI Specification

**Status:** Accepted
**Date:** 2025-01-20

---

## Context

We need to design an API for our SaaS application that will be consumed by:
- Web frontend (React SPA)
- Mobile apps (iOS, Android)
- Third-party integrations (customer webhooks)

Requirements:
1. **Discoverability:** Developers should understand API without extensive documentation
2. **Versioning:** API must support backward compatibility as we evolve
3. **Type Safety:** Reduce runtime errors from API contract violations
4. **Tooling:** Generate client SDKs, server stubs, and docs automatically
5. **Team Familiarity:** Most team members know REST, some know GraphQL

## Decision

We will use **RESTful API** with **OpenAPI 3.1 specification** for all backend services.

**Key Reasons:**
- REST is widely understood and supported by all HTTP clients
- OpenAPI spec enables automatic SDK generation (Java, TypeScript, Python)
- Industry-standard tooling (Swagger UI, Postman, Insomnia)
- HTTP caching works out-of-the-box (CDN, browser cache)
- Simple to reason about (resources, HTTP verbs, status codes)

## Consequences

### Positive

- **Discoverability:** OpenAPI spec serves as living documentation
- **SDK Generation:** Generate type-safe clients for web/mobile with openapi-generator
- **Validation:** Automatic request/response validation against spec
- **Mocking:** Mock servers for frontend development before backend ready
- **Backward Compatibility:** API versioning via URL path (/v1/, /v2/)
- **Caching:** HTTP caching headers reduce server load
- **Familiarity:** Team already knows REST, no learning curve

### Negative

- **Over-fetching:** Clients may fetch more data than needed (no field selection like GraphQL)
- **Under-fetching:** Multiple round-trips needed for related data (N+1 problem)
- **API Sprawl:** Tendency to create many endpoints (versioning complexity)
- **No Real-time:** Need separate WebSocket/SSE for real-time features
- **OpenAPI Maintenance:** Spec must be kept in sync with code (requires discipline)

## Alternatives Considered

### GraphQL

**Description:** Query language for APIs with client-driven data fetching.

**Pros:**
- Fetch exactly the data needed (no over-fetching)
- Single request for related data (no N+1 problem)
- Strong typing with schema introspection
- Real-time subscriptions built-in

**Cons:**
- **Learning Curve:** Team has limited GraphQL experience (3-6 months to proficiency)
- **Complexity:** Requires GraphQL server, resolvers, schema stitching
- **Caching Challenges:** HTTP caching doesn't work (all requests to same endpoint)
- **Tooling Immaturity:** Fewer tools than REST (monitoring, rate limiting, error handling)
- **Over-querying Risk:** Clients can write expensive queries that DoS the server

**Why Not Chosen:** Team familiarity and HTTP caching benefits outweigh GraphQL's advantages for our use case.

### gRPC

**Description:** High-performance RPC framework using Protocol Buffers.

**Pros:**
- Extremely fast (binary protocol, HTTP/2)
- Strongly typed with Protobuf schema
- Bi-directional streaming built-in
- Automatic SDK generation (10+ languages)

**Cons:**
- **Browser Support:** Limited browser support (requires grpc-web proxy)
- **Debugging:** Binary protocol difficult to debug (no curl, no browser DevTools)
- **Learning Curve:** Team unfamiliar with Protobuf and gRPC
- **Not RESTful:** Doesn't follow REST principles (harder for third-party integrations)

**Why Not Chosen:** Browser limitations and debugging challenges outweigh performance benefits. We don't need sub-millisecond latency.

## Related Decisions

- [ADR-001](ADR-001-database-selection.md) - Database schema influences API resource design
- [ADR-007](ADR-007-frontend-architecture.md) - Frontend consumes this API

## Implementation Notes

**Tools:**
- OpenAPI spec in `src/main/resources/openapi.yaml`
- Automatic validation with springdoc-openapi (Spring Boot)
- SDK generation with openapi-generator-maven-plugin
- Swagger UI at `/swagger-ui/index.html` for API exploration

**Versioning Strategy:**
- URL path versioning: `/api/v1/users`, `/api/v2/users`
- Maintain last 2 major versions (v1 and v2 simultaneously)
- Deprecation warnings in response headers: `Deprecated: true; sunset=2025-12-31`

**API Guidelines:**
- Use standard HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- Use plural nouns for resources (`/users`, not `/user`)
- Nest resources for relationships (`/users/{id}/subscriptions`)
- Return 2xx for success, 4xx for client errors, 5xx for server errors
- Include `Link` header for pagination (RFC 5988)
```

**Why This is Good:**
- ✅ Context explains who will use the API and why
- ✅ Decision is specific (REST + OpenAPI 3.1)
- ✅ Consequences balance positive and negative (7 positive, 5 negative)
- ✅ Alternatives (GraphQL, gRPC) analyzed with 4-5 pros/cons each
- ✅ Implementation notes actionable (tools, versioning, guidelines)

---

## Bad ADR Examples (Anti-Patterns)

### Anti-Pattern 1: Too Vague

```markdown
# ADR-001: Use a Database

**Status:** Accepted
**Date:** 2025-01-15

## Context
We need to store data.

## Decision
We will use a database for data storage.

## Consequences
- We can store data
- We can retrieve data

## Alternatives
We could use files but databases are better.
```

**Why This is Bad:**
- ❌ No specific database chosen (MySQL? PostgreSQL? MongoDB?)
- ❌ Context doesn't explain requirements or constraints
- ❌ Consequences are obvious (every database stores/retrieves data)
- ❌ Alternatives not seriously considered

**How to Fix:**
- Be specific: "Use PostgreSQL 15 for user data storage"
- Explain requirements: ACID, scalability, cost, team expertise
- Honest consequences: Operational complexity, learning curve, migration cost
- Thorough alternatives: MySQL, MongoDB, DynamoDB with pros/cons

---

### Anti-Pattern 2: No Alternatives

```markdown
# ADR-002: Use Kubernetes for Container Orchestration

**Status:** Accepted
**Date:** 2025-01-20

## Context
We need to deploy our microservices in containers.

## Decision
We will use Kubernetes.

## Consequences
- Kubernetes is industry standard
- Kubernetes is scalable
- Kubernetes is powerful

## Alternatives
None. Kubernetes is the best.
```

**Why This is Bad:**
- ❌ No alternatives considered (Docker Swarm, ECS, Nomad)
- ❌ Consequences are marketing claims, not analysis
- ❌ Doesn't explain why Kubernetes fits our specific needs
- ❌ No negative consequences (Kubernetes is complex!)

**How to Fix:**
- Consider alternatives: Docker Swarm, AWS ECS, HashiCorp Nomad
- Honest consequences: Complexity, learning curve, operational overhead
- Explain fit: "We need multi-cloud portability and have Kubernetes expertise"

---

### Anti-Pattern 3: Implementation Details Instead of Decisions

```markdown
# ADR-003: User Authentication Implementation

**Status:** Accepted
**Date:** 2025-02-01

## Context
Users need to log in.

## Decision
We will implement authentication using the following code:

[500 lines of code pasted here...]

## Consequences
Users can log in.

## Alternatives
None.
```

**Why This is Bad:**
- ❌ Code belongs in source control, not ADRs
- ❌ No architectural decision documented (JWT? Session? OAuth?)
- ❌ No rationale for chosen approach
- ❌ No alternatives considered

**How to Fix:**
- Document decision: "Use JWT tokens for stateless authentication"
- Explain rationale: Scalability, no server-side session storage
- Consider alternatives: Session-based auth, OAuth2, SAML
- Link to implementation: "See `AuthenticationService.java` for implementation"

---

### Anti-Pattern 4: Hiding Negative Consequences

```markdown
# ADR-004: Migrate from Monolith to Microservices

**Status:** Accepted
**Date:** 2025-02-10

## Context
Our monolith is too big and hard to maintain.

## Decision
We will migrate to microservices architecture.

## Consequences
- Microservices are scalable
- Microservices are maintainable
- Microservices are modern
- Microservices improve team productivity

## Alternatives
Keep the monolith, but that's old-fashioned.
```

**Why This is Bad:**
- ❌ Only positive consequences listed (every decision has tradeoffs!)
- ❌ Ignores massive complexity of microservices
- ❌ No honest assessment of costs (distributed tracing, service mesh, data consistency)
- ❌ Dismissive of alternatives ("old-fashioned")

**How to Fix:**
- Honest negatives: Operational complexity, network latency, distributed debugging, data consistency
- Quantify costs: "Migration estimated at 6 months with 4 engineers"
- Fair alternative analysis: "Modular monolith could address maintainability without microservices complexity"

---

## Status Lifecycle Details

### When to Use Each Status

| Status | When to Use | Example Scenario |
|--------|-------------|------------------|
| **Proposed** | Decision under consideration, not yet approved | Team is evaluating PostgreSQL vs. MySQL but hasn't committed |
| **Accepted** | Decision approved and being implemented | PostgreSQL chosen, implementation started |
| **Deprecated** | Decision no longer recommended but still in use | Migrating from REST to GraphQL, but REST endpoints still exist |
| **Superseded** | Decision replaced by newer ADR | ADR-005 replaces ADR-001's database choice |

### Transitioning Between Statuses

**Proposed → Accepted:**
- Team approves decision
- Update status to "Accepted"
- Begin implementation

**Accepted → Deprecated:**
- Decision no longer recommended for new code
- Existing code still uses this decision
- Update status to "Deprecated"
- Add note: "New code should use [new approach] instead"

**Accepted → Superseded:**
- Create new ADR with updated decision
- Update old ADR status to "Superseded"
- Add link to new ADR: `Superseded by: [ADR-XXX]`
- Update new ADR: `Supersedes: [ADR-YYY]`

---

## When to Create ADRs (Detailed)

### Architecture Decisions (ALWAYS create ADR)

**Database Selection:**
- ✅ PostgreSQL vs. MySQL vs. MongoDB vs. DynamoDB
- ✅ SQL vs. NoSQL
- ✅ Relational vs. Document vs. Key-Value

**Framework/Library Selection:**
- ✅ Spring Boot vs. Micronaut vs. Quarkus
- ✅ React vs. Vue vs. Angular
- ✅ JUnit vs. TestNG

**Architecture Pattern:**
- ✅ Microservices vs. Monolith vs. Modular Monolith
- ✅ Event-Driven vs. Request-Response
- ✅ CQRS vs. Traditional CRUD

**Infrastructure:**
- ✅ AWS vs. Azure vs. GCP
- ✅ Kubernetes vs. Docker Swarm vs. ECS
- ✅ Self-hosted vs. Managed Service

### Design Decisions (CONSIDER creating ADR)

**API Design:**
- ✅ REST vs. GraphQL vs. gRPC (create ADR)
- ❌ Endpoint naming convention (too trivial, use coding standards)

**Authentication/Authorization:**
- ✅ JWT vs. Session vs. OAuth2 (create ADR)
- ❌ Password hashing algorithm (use industry standard like bcrypt)

**Caching:**
- ✅ Redis vs. Memcached vs. In-Memory (create ADR)
- ❌ Cache TTL value (implementation detail, not architectural)

### Implementation Details (DON'T create ADR)

**Code Style:**
- ❌ Tabs vs. Spaces (use linter config)
- ❌ Naming conventions (use coding standards)

**Algorithms:**
- ❌ QuickSort vs. MergeSort (implementation detail)
- ❌ HashMap vs. TreeMap (use appropriate data structure)

**Temporary Workarounds:**
- ❌ "Skip email validation for demo" (temporary, not architectural)

---

## Superseding and Deprecating ADRs

### When to Supersede

**Supersede** when the original decision is completely replaced:

**Example:** Migrating from MySQL to PostgreSQL
- ADR-001: "Use MySQL" → Status: Superseded
- ADR-015: "Use PostgreSQL" → Status: Accepted, Supersedes: ADR-001

### When to Deprecate

**Deprecate** when the decision is phased out but still exists:

**Example:** Migrating from REST to GraphQL
- ADR-002: "Use REST API" → Status: Deprecated
- ADR-020: "Use GraphQL API" → Status: Accepted
- Both APIs coexist during migration

### Supersede Example

**Step 1: Create new ADR** (ADR-015-use-postgresql.md)

```markdown
# ADR-015: Migrate from MySQL to PostgreSQL

**Status:** Accepted
**Supersedes:** [ADR-001](ADR-001-use-mysql.md)
**Date:** 2025-06-01

## Context

After 6 months using MySQL (ADR-001), we've encountered limitations:
1. Complex analytics queries are slow (no window functions)
2. JSON support is limited (no JSONB indexing)
3. Transaction isolation issues (READ COMMITTED default)

PostgreSQL addresses all these issues.

## Decision

Migrate from MySQL to PostgreSQL 15 for user data storage.

[... rest of ADR ...]
```

**Step 2: Update old ADR** (ADR-001-use-mysql.md)

```markdown
# ADR-001: Use MySQL for User Data

**Status:** Superseded
**Superseded by:** [ADR-015](ADR-015-use-postgresql.md)
**Date:** 2024-12-01

## Context

[... original context ...]

## Decision

Use MySQL 8.0 for user data storage.

[... rest of original ADR ...]

---

## Superseded Notice

This ADR has been superseded by [ADR-015](ADR-015-use-postgresql.md) due to:
- Performance limitations with complex queries
- Limited JSON support
- Transaction isolation issues

All new development should use PostgreSQL. MySQL is being phased out.
```

---

## Integration with Agile Workflow

### Linking ADRs from Stories

**In Story File** (STORY-012-user-authentication.md):

```markdown
# STORY-012: User Authentication

## Description
Implement JWT-based authentication for API endpoints.

## Design Decisions

This story implements the authentication strategy defined in:
- [ADR-003](../adrs/ADR-003-authentication-strategy.md) - Use JWT for stateless authentication

## Acceptance Criteria
- [ ] POST /api/v1/auth/login returns JWT token
- [ ] GET /api/v1/users requires valid JWT in Authorization header
- [ ] JWT tokens expire after 24 hours
```

### Linking Stories from ADRs

**In ADR File** (ADR-003-authentication-strategy.md):

```markdown
# ADR-003: Use JWT for Stateless Authentication

## Related Stories

This decision affects the following stories:
- [STORY-012](../stories/STORY-012-user-authentication.md) - User Authentication
- [STORY-015](../stories/STORY-015-api-security.md) - API Security
- [STORY-018](../stories/STORY-018-token-refresh.md) - Token Refresh

## Related Epics

- [EPIC-002](../epics/EPIC-002-authentication-and-authorization.md) - Authentication and Authorization
```

### When to Create ADRs in Agile Workflow

**During Sprint Planning:**
- Architectural decision identified in story
- Create ADR during sprint (treat as part of story work)
- Link ADR from story's "Design Decisions" section

**Example:**

**Sprint Planning:**
- Team plans STORY-012: User Authentication
- Discussion reveals need to decide: JWT vs. Session-based auth
- Decision: Create ADR-003 during sprint to document decision
- Update STORY-012 to link to ADR-003

**Sprint Execution:**
- Day 1-2: Create ADR-003 (document alternatives, make decision)
- Day 3-5: Implement STORY-012 (following ADR-003 decision)
- Link ADR-003 from STORY-012's "Design Decisions" section

---

This reference provides comprehensive guidance for creating high-quality ADRs. Use it when you need detailed examples or encounter complex scenarios.
