# Analyzer Output Format

All architecture audit analyzers MUST return findings in this exact format. This enables automated consolidation by the orchestrator.

---

## Output Structure

```markdown
## Analysis: {Analyzer Name}

### Summary
{1-3 sentences describing what was found in this dimension}

### Rating: {A|B|C|D|E}
{One sentence justifying the rating}

### Findings

#### What Works Well
- {Positive observation with evidence (file paths, directory names, patterns)}

#### Deviations & Concerns
- {Observation} — {Evidence: file/directory/pattern reference}

#### Notable Patterns
- {Neutral, relevant observation worth mentioning}

### Evidence
{File paths, directory structures, import chains, or naming examples that support the findings}
```

---

## Format Rules

1. **Always include all sections.** If no deviations found, write `None` under Deviations & Concerns.
2. **Evidence is mandatory.** Every observation must cite specific files, directories, or patterns.
3. **Rating must match findings.** An A rating with multiple concerns, or an E rating with "What Works Well" items, signals inconsistency.
4. **Be descriptive, not prescriptive.** Describe what IS, not what SHOULD BE. This is an audit, not a code review.
5. **One observation per bullet.** Do not combine unrelated observations.
6. **Use relative paths.** Reference files relative to project root (e.g., `src/main/java/com/example/`).
7. **No code fixes.** Do not suggest specific code changes. Describe the architectural observation.
8. **No findings.** If the dimension is not applicable, return: `N/A — {reason}`

---

## Example Output

```markdown
## Analysis: Naming Consistency

### Summary
The project uses a consistent suffix scheme for service-layer types (Service, Repository, Controller) but shows mixed verb conventions across similar operations (get/find/fetch used interchangeably).

### Rating: B
Suffix naming is exemplary; verb inconsistency is a minor deviation that doesn't undermine overall readability.

### Findings

#### What Works Well
- Consistent Controller/Service/Repository suffixes across all modules
- Domain entity names match database table names (User, Order, Product)
- Package names follow lowercase convention throughout

#### Deviations & Concerns
- Mixed verb prefixes for retrieval operations — `getUserById` (UserService), `findOrder` (OrderService), `fetchProduct` (ProductService)
- Test class naming inconsistent — some use `*Test`, others `*Tests`, others `*Spec`

#### Notable Patterns
- Builder pattern classes consistently use `*Builder` suffix
- DTO classes use `*Response` / `*Request` suffix (not `*DTO`)

### Evidence
- src/main/java/com/example/service/UserService.java — `getUserById()`
- src/main/java/com/example/service/OrderService.java — `findOrder()`
- src/main/java/com/example/service/ProductService.java — `fetchProduct()`
- src/test/java/ — mixed *Test, *Tests, *Spec suffixes
```
