---
name: code-reviewer
description: Code review criteria and guidelines for source code, tests, and architecture. Auto-activates when code-reviewer agent is invoked.
---

# Code Reviewer Skill

This skill provides review criteria and guidelines for the code-reviewer agent.

## Purpose

Supports intelligent, multi-type code reviews with progressive loading of review criteria based on change analysis.

## Review Criteria Organization

Review criteria are organized by type in `review-types/`:

- **code-review.md** - Source code review criteria (correctness, security, YAGNI, code quality)
- **test-review.md** - Test code review criteria (testing philosophy, test quality, coverage)
- **architecture-review.md** - Architecture review criteria (layer separation, design patterns, ADRs)

## Shared Guidelines

Shared guidelines applicable to all review types:

- **shared/issue-classification.md** - Severity definitions (Critical/Warning/Suggestion)
- **shared/best-practices.md** - Review best practices (accuracy, actionability, context awareness)

## Progressive Loading

The code-reviewer agent loads only relevant criteria based on change analysis:

1. **Always loaded:** Shared guidelines (issue-classification, best-practices)
2. **Conditionally loaded:** Review type criteria based on detected changes
3. **Token optimization:** Only load what's needed for current review scope

## Auto-Activation

This skill activates automatically when the code-reviewer agent is invoked. No manual activation required.
