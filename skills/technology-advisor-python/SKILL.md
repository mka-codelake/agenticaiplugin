---
name: technology-advisor-python
description: Research best-practice Python libraries and latest versions for Python/pip/poetry/conda projects. Use PROACTIVELY when adding dependencies to requirements.txt, pyproject.toml, or environment.yml, choosing Python libraries, updating versions, or making Python technology decisions. ALWAYS use before adding Python packages.
allowed-tools:
  - WebSearch
  - WebFetch
  - Bash(curl:*)
  - Bash(pip:*)
  - Bash(python:*)
  - Bash(poetry:*)
  - Read
  - Glob
  - mcp__context7__*
---

# Your role

You ensure all Python library and technology decisions are based on **current best practices** and **latest stable versions**, not outdated training data.

## When to activate (PROACTIVE)

Use this skill PROACTIVELY whenever:
- ✅ Adding dependency to **requirements.txt**, **pyproject.toml**, or **environment.yml**
- ✅ Choosing Python library for specific problem
- ✅ Discussing Python package alternatives
- ✅ Updating Python package versions
- ✅ Making Python technology stack decisions
- ✅ Working with **Django**, **Flask**, **FastAPI**, or other Python frameworks

## Research Process

### 1. Detect Python Stack

Read relevant files to understand the project context:

**requirements.txt:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
```

**pyproject.toml (Poetry/setuptools):**
```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.1"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"
```

**environment.yml (Conda):**
```yaml
name: myproject
dependencies:
  - python=3.11
  - pip:
    - fastapi==0.104.1
```

**Critical information to extract:**
- Python version (3.8, 3.9, 3.10, 3.11, 3.12)
- Package manager (pip, poetry, conda, pipenv)
- Framework (Django, Flask, FastAPI)
- Existing dependencies
- Virtual environment usage

**Additional files to check:**
- `setup.py` or `setup.cfg` → Legacy package
- `Pipfile` → pipenv
- `pyproject.toml` → Modern Python packaging
- `.python-version` → Python version

### 2. Library Selection

**Step 2.1: WebSearch (Primary Source)**

Search for current best practices and library comparisons:

```
"[problem] Python 2025 best library"
"[library A] vs [library B] Python 2025 comparison"
"[library] deprecated alternative 2025"
```

**Examples:**
- "HTTP client Python async 2025 best library"
- "JSON schema validation Python 2025"
- "testing framework Python 2025 pytest vs unittest"

**Step 2.2: Context7 MCP Server (Conditional)**

**ONLY use Context7 when:**
- ✅ Deep library/framework understanding needed
- ✅ Framework integration patterns required (Django, Flask, FastAPI)
- ✅ Detailed feature comparison needed
- ✅ Complex decision with multiple alternatives

**DO NOT use Context7 for:**
- ❌ Simple version lookup (use PyPI JSON API instead)
- ❌ Straightforward library selection
- ❌ Well-known libraries (requests, numpy, pandas)

**If Context7 is available and needed:**

1. **Resolve Library ID:**
   ```
   Use mcp__context7__resolve-library-id
   Query: "[library name] python"
   Example: "httpx python" or "pydantic python"
   ```

2. **Get Library Documentation:**
   ```
   Use mcp__context7__get-library-docs with library_id
   Retrieve:
   - Feature overview
   - Integration patterns
   - Best practices
   - Common use cases
   ```

**Decision criteria:**
1. **Active maintenance** → Commits within last 6 months, regular PyPI releases
2. **Python version compatibility** → Must support project's Python version
3. **Async support** → Important for modern web frameworks (FastAPI, aiohttp)
4. **Type hints** → Modern libraries should support type hints (PEP 484)
5. **Framework compatibility** → Works with Django/Flask/FastAPI
6. **Deprecation status** → Avoid deprecated (e.g., unittest2 → pytest)

### 3. Version Lookup (PyPI JSON API)

**Primary: PyPI JSON API**

Use curl to query PyPI:

```bash
curl "https://pypi.org/pypi/{package}/json"
```

**Parse version from response:**
```bash
curl "https://pypi.org/pypi/{package}/json" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Example:**
```bash
curl "https://pypi.org/pypi/requests/json"
curl "https://pypi.org/pypi/fastapi/json"
curl "https://pypi.org/pypi/django/json"
```

**Fallback: WebSearch**

If PyPI API fails:
```
"{package} pypi latest version"
"{package} pip install version"
```

### 4. Framework-Specific Checks

**Django:**
- Check Django version compatibility
- Prefer Django-specific packages (django-rest-framework vs generic API framework)
- Check for Django integration (middleware, apps)

**Flask:**
- Check Flask extensions (Flask-XXX naming)
- Verify Flask version compatibility

**FastAPI:**
- Check async support (critical for FastAPI)
- Pydantic v2 compatibility (FastAPI uses Pydantic)
- Type hint support (FastAPI relies on type hints)

### 5. Virtual Environment Check

**Detect virtual environment:**
- `venv/` → Python venv
- `.venv/` → Common venv location
- `env/` → Another common venv location
- `conda` → Conda environment

**Recommend using virtual environment if not detected.**

## Output Format

Provide a clear, structured recommendation:

```markdown
### Recommendation: [Package Name]

**Why:** [Research-based reasoning from WebSearch and/or Context7]

**Latest Version:** [X.Y.Z] (as of [date], verified via PyPI)

**Installation:**
``bash
pip install {package}=={version}
``

**requirements.txt:**
``txt
{package}=={version}
``

**pyproject.toml (Poetry):**
``toml
[tool.poetry.dependencies]
{package} = "^{version}"
``

**Type Hints:** [Supported ✅ / Stub package needed / Not available]
**Async Support:** [Yes ✅ / No / N/A]
**Python Compatibility:** [Python version requirements]
**Framework Integration:** [Django/Flask/FastAPI specific notes]
**Context7 Used:** [Yes/No - only if Context7 was consulted]
**Alternative:** [If applicable, mention alternative packages]
```

## Example: HTTP Client

```markdown
### Recommendation: httpx

**Why:**
- Modern async HTTP client (successor to requests)
- Full HTTP/2 and HTTP/1.1 support
- Async and sync APIs (flexibility)
- Excellent type hint support
- Active maintenance, 13M+ monthly downloads

**Latest Version:** 0.27.0 (as of 2025-11-13, verified via PyPI)

**Installation:**
``bash
pip install httpx==0.27.0
``

**requirements.txt:**
``txt
httpx==0.27.0
``

**pyproject.toml (Poetry):**
``toml
[tool.poetry.dependencies]
httpx = "^0.27.0"
``

**Type Hints:** Supported ✅ (native)
**Async Support:** Yes ✅ (async/await)
**Python Compatibility:** Python 3.8+
**Framework Integration:** Works seamlessly with FastAPI, Django, Flask
**Context7 Used:** No
**Alternative:** requests (if you don't need async), aiohttp (if you only need async)
```

## Important Notes

1. **Always read requirements.txt/pyproject.toml first** to understand project context
2. **Check Python version compatibility** - newer libraries may require Python 3.9+
3. **Prefer libraries with type hints** - better IDE support, fewer bugs
4. **Check async support** - critical for FastAPI, aiohttp
5. **Use virtual environment** - isolate dependencies
6. **Exact versions in requirements.txt** - `requests==2.31.0` (reproducible builds)
7. **Flexible versions in pyproject.toml** - `requests = "^2.31.0"` (Poetry)
8. **Avoid deprecated packages** - unittest2 → pytest, urllib2 → requests
9. **Use Context7 sparingly** - only for deep understanding, not simple version lookup

## Python Version Syntax

**requirements.txt (exact versions):**
```txt
requests==2.31.0
fastapi==0.104.1
```

**pyproject.toml (Poetry - flexible versions):**
```toml
requests = "^2.31.0"  # >=2.31.0, <3.0.0
fastapi = "~0.104.1"  # >=0.104.1, <0.105.0
```

**Recommendation:**
- Use **exact versions** in requirements.txt (reproducibility)
- Use **flexible versions** in pyproject.toml (Poetry handles locking)

## Package Manager Detection

**Check for:**
- `requirements.txt` → pip
- `pyproject.toml` with `[tool.poetry]` → Poetry
- `Pipfile` → pipenv
- `environment.yml` → Conda

**Installation commands:**
- pip: `pip install {package}`
- Poetry: `poetry add {package}`
- pipenv: `pipenv install {package}`
- Conda: `conda install {package}` or `pip install {package}`

Adjust installation command based on detected package manager.

See `reference.md` for detailed PyPI JSON API documentation, Context7 integration examples, common scenarios, and decision heuristics.
