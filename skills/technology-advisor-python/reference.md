# Technology Advisor Python - Reference

## PyPI JSON API

### Endpoint

```
https://pypi.org/pypi/{package}/json
```

### Example Requests

**requests:**
```bash
curl "https://pypi.org/pypi/requests/json"
```

**fastapi:**
```bash
curl "https://pypi.org/pypi/fastapi/json"
```

**django:**
```bash
curl "https://pypi.org/pypi/django/json"
```

**numpy:**
```bash
curl "https://pypi.org/pypi/numpy/json"
```

### Response Format

```json
{
  "info": {
    "author": "Kenneth Reitz",
    "author_email": "me@kennethreitz.org",
    "classifiers": [
      "Development Status :: 5 - Production/Stable",
      "Intended Audience :: Developers",
      "License :: OSI Approved :: Apache Software License",
      "Programming Language :: Python",
      "Programming Language :: Python :: 3",
      "Programming Language :: Python :: 3.8",
      "Programming Language :: Python :: 3.9",
      "Programming Language :: Python :: 3.10",
      "Programming Language :: Python :: 3.11",
      "Programming Language :: Python :: 3.12"
    ],
    "description": "...",
    "home_page": "https://requests.readthedocs.io",
    "keywords": "http,client,requests",
    "license": "Apache 2.0",
    "name": "requests",
    "package_url": "https://pypi.org/project/requests/",
    "project_url": "https://pypi.org/project/requests/",
    "project_urls": {
      "Documentation": "https://requests.readthedocs.io",
      "Source": "https://github.com/psf/requests"
    },
    "requires_dist": [
      "charset-normalizer (<4,>=2)",
      "idna (<4,>=2.5)",
      "urllib3 (<3,>=1.21.1)",
      "certifi (>=2017.4.17)"
    ],
    "requires_python": ">=3.8",
    "summary": "Python HTTP for Humans.",
    "version": "2.31.0"
  },
  "releases": {
    "2.31.0": [...],
    "2.30.0": [...]
  },
  "urls": [...]
}
```

### Parse Version

**Using grep:**
```bash
curl "https://pypi.org/pypi/requests/json" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Expected output:**
```
2.31.0
```

### Check Python Version Compatibility

**Parse requires_python:**
```bash
curl "https://pypi.org/pypi/fastapi/json" | grep -o '"requires_python":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Example output:**
```
>=3.8
```

## Context7 MCP Server Integration

### When to Use Context7

**Use Context7 when you need:**
- ✅ Deep understanding of library features and API
- ✅ Framework-specific integration patterns (Django, Flask, FastAPI)
- ✅ Detailed comparison between multiple libraries
- ✅ Best practices for complex library usage
- ✅ Migration guides (e.g., requests → httpx)

**Do NOT use Context7 for:**
- ❌ Simple version lookup (use PyPI JSON API instead)
- ❌ Well-known libraries with obvious choices (requests, numpy, pandas)
- ❌ Quick decisions when WebSearch provides clear answer

### Context7 Tools

#### 1. mcp__context7__resolve-library-id

**Purpose:** Find the library ID in Context7's knowledge base

**Input:**
```
Query: "[library name] python"
```

**Examples:**
```
"httpx python"
"pydantic python"
"sqlalchemy python"
"celery python"
```

**Output:**
```
library_id: "httpx"
```

#### 2. mcp__context7__get-library-docs

**Purpose:** Retrieve detailed documentation and patterns

**Input:**
```
library_id: "httpx"
```

**Output:**
- Feature overview
- API reference
- Integration patterns
- Best practices
- Common use cases

### Example Workflow with Context7

**Scenario:** User needs ORM for database access, unsure between SQLAlchemy and alternatives

**Step 1: WebSearch**
```
Query: "Python ORM 2025 SQLAlchemy vs alternatives"
Results: SQLAlchemy (mature, powerful), Tortoise ORM (async-native), Peewee (simple)
```

**Step 2: Context7 (for detailed comparison)**
```
1. mcp__context7__resolve-library-id("sqlalchemy python")
   → library_id: "sqlalchemy"

2. mcp__context7__get-library-docs(library_id)
   → Features:
     - ORM and Core (SQL Expression Language)
     - Async support (SQLAlchemy 2.0+)
     - Powerful query API
     - Connection pooling, migrations support

3. Compare with Tortoise ORM (if async is priority)
```

**Step 3: Version Lookup (Web)**
```
PyPI API: sqlalchemy
→ Version: 2.0.25
```

**Output:**
```markdown
### Recommendation: SQLAlchemy

**Why:**
- WebSearch: Most mature Python ORM, industry standard
- Context7: Powerful ORM + Core SQL Expression Language
- Context7: SQLAlchemy 2.0+ has excellent async support
- 30M+ monthly downloads, actively maintained

**Latest Version:** 2.0.25 (verified via PyPI)

**Installation:**
``bash
pip install sqlalchemy==2.0.25
``

**requirements.txt:**
``txt
sqlalchemy==2.0.25
``

**Type Hints:** Supported ✅ (SQLAlchemy 2.0+ has excellent type support)
**Async Support:** Yes ✅ (SQLAlchemy 2.0+ asyncio support)
**Python Compatibility:** Python 3.8+
**Framework Integration:** Works with Django, Flask, FastAPI
**Context7 Used:** Yes (for feature comparison)
**Alternative:** Tortoise ORM (if you only need async ORM), Peewee (if you need simpler API)
```

## Common Scenarios

### Scenario 1: HTTP Client for Async Project

**User:** "I need an HTTP client for FastAPI project"

**Process:**

1. **Read pyproject.toml:**
   ```toml
   [tool.poetry.dependencies]
   python = "^3.11"
   fastapi = "^0.104.1"
   ```
   → Python 3.11, FastAPI (async framework)

2. **WebSearch:**
   ```
   "HTTP client Python async 2025"
   ```
   → Result: httpx (async + sync), aiohttp (async-only), requests (sync-only)

3. **PyPI API:**
   ```bash
   curl "https://pypi.org/pypi/httpx/json"
   ```
   → Version: 0.27.0

4. **Check async support:**
   → httpx supports async/await ✅

**Output:**
```markdown
### Recommendation: httpx

**Why:**
- Modern HTTP client with async/await support (perfect for FastAPI)
- Full HTTP/2 and HTTP/1.1 support
- Both sync and async APIs (flexibility)
- Excellent type hint support
- 13M+ monthly downloads

**Latest Version:** 0.27.0 (verified via PyPI)

**Installation:**
``bash
pip install httpx==0.27.0
``

**requirements.txt:**
``txt
httpx==0.27.0
``

**Usage with FastAPI:**
``python
import httpx
from fastapi import FastAPI

app = FastAPI()

@app.get("/external")
async def call_external():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()
``

**Type Hints:** Supported ✅ (native)
**Async Support:** Yes ✅ (async/await)
**Python Compatibility:** Python 3.8+
**Framework Integration:** Perfect for FastAPI
**Context7 Used:** No
**Alternative:** aiohttp (async-only), requests (sync-only, not recommended for async)
```

### Scenario 2: JSON Schema Validation

**User:** "Need JSON schema validation for API requests"

**Process:**

1. **Read requirements.txt:**
   ```txt
   fastapi==0.104.1
   pydantic==2.5.0
   ```
   → FastAPI project with Pydantic v2

2. **WebSearch:**
   ```
   "JSON schema validation Python 2025"
   ```
   → Result: jsonschema (pure validation), pydantic (validation + modeling)

3. **PyPI API:**
   ```bash
   curl "https://pypi.org/pypi/jsonschema/json"
   ```
   → Version: 4.21.1

4. **Consider context:**
   → Pydantic already in use (FastAPI uses it)
   → Recommend using existing Pydantic

**Output:**
```markdown
### Recommendation: Use existing Pydantic (already in project)

**Why:**
- FastAPI already uses Pydantic for validation
- Pydantic v2 has excellent performance
- Type-safe validation with Python type hints
- Better DX than pure JSON schema
- No additional dependency needed

**Current Version:** 2.5.0

**Usage Example:**
``python
from pydantic import BaseModel, Field, EmailStr
from fastapi import FastAPI

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(ge=18)

app = FastAPI()

@app.post("/users")
async def create_user(user: UserCreate):
    # Pydantic automatically validates
    return {"user": user}
``

**Alternative: jsonschema (if you need pure JSON Schema validation)**

**Latest Version:** 4.21.1 (verified via PyPI)

**Installation:**
``bash
pip install jsonschema==4.21.1
``

**Type Hints:** Supported (jsonschema 4.x has type stubs)
**Async Support:** N/A (synchronous validation)
**Python Compatibility:** Python 3.8+
**Context7 Used:** No
**Use Case:** Use jsonschema only if you need Draft 7/2019-09/2020-12 JSON Schema compliance. For FastAPI, stick with Pydantic.
```

### Scenario 3: Testing Framework

**User:** "Set up testing for Python project"

**Process:**

1. **Read pyproject.toml:**
   ```toml
   [tool.poetry.dependencies]
   python = "^3.11"
   fastapi = "^0.104.1"
   ```

2. **WebSearch:**
   ```
   "Python testing framework 2025"
   ```
   → Result: pytest (de-facto standard), unittest (built-in)

3. **PyPI API:**
   ```bash
   curl "https://pypi.org/pypi/pytest/json"
   ```
   → Version: 8.0.0

**Output:**
```markdown
### Recommendation: pytest

**Why:**
- De-facto standard Python testing framework
- Simple syntax (no classes required)
- Rich plugin ecosystem (pytest-asyncio, pytest-cov)
- Excellent fixture system
- 50M+ monthly downloads

**Latest Version:** 8.0.0 (verified via PyPI)

**Installation:**
``bash
pip install pytest==8.0.0 pytest-asyncio==0.23.3
``

**requirements.txt:**
``txt
# Testing
pytest==8.0.0
pytest-asyncio==0.23.3  # For async test support
pytest-cov==4.1.0       # Coverage reporting
``

**pyproject.toml (Poetry):**
``toml
[tool.poetry.dev-dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.3"
pytest-cov = "^4.1.0"
``

**Usage Example:**
``python
# test_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users", json={
            "name": "John",
            "email": "john@example.com",
            "age": 30
        })
        assert response.status_code == 200
``

**Type Hints:** Supported ✅
**Async Support:** Yes ✅ (with pytest-asyncio)
**Python Compatibility:** Python 3.8+
**Framework Integration:** Works perfectly with FastAPI, Django, Flask
**Context7 Used:** No
**Alternative:** unittest (built-in, more verbose)
```

### Scenario 4: Update Outdated Dependency

**User:** "Update requests to latest version"

**Process:**

1. **Read requirements.txt:**
   ```txt
   requests==2.28.0
   ```
   → Currently on 2.28.0

2. **PyPI API:**
   ```bash
   curl "https://pypi.org/pypi/requests/json"
   ```
   → Latest: 2.31.0

3. **Check changelog:**
   - WebSearch: "requests 2.31.0 changelog"
   - Check for breaking changes

**Output:**
```markdown
### Recommendation: Update requests to 2.31.0

**Why:**
- Latest stable version
- Security fixes (CVE patches)
- Bug fixes and improvements
- No breaking changes from 2.28.0 to 2.31.0

**Current Version:** 2.28.0
**Latest Version:** 2.31.0 (verified via PyPI)

**Installation:**
``bash
pip install --upgrade requests==2.31.0
``

**requirements.txt (update):**
``txt
requests==2.31.0
``

**Important:**
- Review changelog: https://github.com/psf/requests/blob/main/HISTORY.md
- Test thoroughly after upgrade
- Check for deprecation warnings

**Type Hints:** Type stubs via @types/requests
**Python Compatibility:** Python 3.8+
**Context7 Used:** No
```

### Scenario 5: Database Migrations

**User:** "Need database migrations for Django project"

**Process:**

1. **Read requirements.txt:**
   ```txt
   django==5.0.0
   ```
   → Django project

2. **WebSearch:**
   ```
   "Django database migrations 2025"
   ```
   → Result: Django built-in migrations (default), Alembic (for SQLAlchemy)

**Output:**
```markdown
### Recommendation: Use Django's built-in migrations

**Why:**
- Django includes excellent migration system out-of-the-box
- No additional dependency needed
- Well-integrated with Django ORM
- Automatic migration generation

**No Installation Needed** (included with Django)

**Usage:**
``bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations
``

**Example Migration:**
``python
# myapp/migrations/0001_initial.py
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('name', models.CharField(max_length=100)),
                ('email', models.EmailField(unique=True)),
            ],
        ),
    ]
``

**Type Hints:** Django 5.0+ has improved type support
**Python Compatibility:** Python 3.10+ (Django 5.0 requirement)
**Context7 Used:** No

**Alternative: Alembic (if using SQLAlchemy instead of Django ORM)**

**Latest Version:** 1.13.1 (verified via PyPI)

**Installation:**
``bash
pip install alembic==1.13.1
``

**Use Case:** Use Alembic only if you're using SQLAlchemy ORM directly (not Django ORM).
```

## Decision Heuristics

### Priority Order

When choosing between multiple libraries:

1. **Active Maintenance** (highest priority)
   - Recent commits (within 6 months)
   - Regular PyPI releases
   - Active issue/PR handling
   - Security updates

2. **Python Version Compatibility**
   - Must support project's Python version
   - Check `requires_python` in PyPI metadata
   - Prefer libraries supporting Python 3.8+

3. **Type Hint Support**
   - Native type hints preferred (PEP 484)
   - Type stubs via typeshed acceptable
   - Better IDE support, fewer bugs

4. **Async Support** (if needed)
   - Critical for FastAPI, aiohttp
   - Check if library has async APIs
   - `asyncio` compatibility

5. **Framework Compatibility**
   - Django/Flask/FastAPI specific libraries
   - Check framework version compatibility
   - Integration examples available

6. **Community Support**
   - Monthly PyPI downloads
   - GitHub stars
   - StackOverflow questions/answers
   - Corporate backing (Pallets, Encode, etc.)

### Red Flags

**Avoid packages with these characteristics:**

- ❌ **No updates >1 year** (unless extremely stable like standard library ports)
- ❌ **Deprecated** (e.g., unittest2 → pytest)
- ❌ **Replaced by newer package** (e.g., urllib2 → requests)
- ❌ **Known security vulnerabilities** (check `pip audit`)
- ❌ **Incompatible with current Python version**
- ❌ **No type hints** (for modern projects)
- ❌ **Poor documentation** (hard to use)
- ❌ **Abandoned by maintainer**

### Framework-Specific Patterns

**Django:**
- Prefer Django apps (django-rest-framework, django-filter)
- Check Django version compatibility
- Follow Django conventions (apps, middleware)

**Flask:**
- Prefer Flask extensions (Flask-SQLAlchemy, Flask-Login)
- Check Flask version compatibility
- Flask 3.0+ requires Python 3.8+

**FastAPI:**
- Prefer async libraries (httpx, asyncpg)
- Pydantic integration (Pydantic v2 for FastAPI 0.100+)
- Type hints critical (FastAPI relies on them)

## Package Manager Comparison

### pip (Standard)

**Install:**
```bash
pip install {package}
pip install -r requirements.txt
```

**requirements.txt (exact versions):**
```txt
fastapi==0.104.1
uvicorn==0.24.0
```

**Pros:**
- Standard, works everywhere
- Simple workflow

**Cons:**
- No dependency resolution
- Manual version management

### Poetry (Modern)

**Install:**
```bash
poetry add {package}
poetry install
```

**pyproject.toml (flexible versions):**
```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.1"
```

**Pros:**
- Dependency resolution
- Lock file (poetry.lock)
- Virtual environment management

**Cons:**
- Additional tool to learn

### pipenv

**Install:**
```bash
pipenv install {package}
pipenv install
```

**Pipfile:**
```toml
[packages]
fastapi = "==0.104.1"
```

**Pros:**
- Dependency resolution
- Lock file (Pipfile.lock)

**Cons:**
- Slower than Poetry
- Less active development

### Conda

**Install:**
```bash
conda install {package}
pip install {package}  # If not available in conda
```

**environment.yml:**
```yaml
name: myproject
dependencies:
  - python=3.11
  - pip:
    - fastapi==0.104.1
```

**Pros:**
- Manages Python version + packages
- Great for data science (numpy, scipy)

**Cons:**
- Slower than pip
- Separate ecosystem

## Quick Reference: Common Libraries

### HTTP Clients
- **httpx** ✅ (Async + sync, HTTP/2, modern)
- **requests** ✅ (Sync-only, most popular, 50M+ monthly downloads)
- **aiohttp** (Async-only, client + server)
- ❌ **urllib2** (deprecated, use requests/httpx)

### Web Frameworks
- **FastAPI** ✅ (Modern, async, type hints, 15M+ monthly)
- **Django** ✅ (Full-featured, batteries included, 10M+ monthly)
- **Flask** ✅ (Lightweight, flexible, 20M+ monthly)
- **Sanic** (Async, fast)

### ORM / Database
- **SQLAlchemy** ✅ (Powerful ORM + Core, async support 2.0+)
- **Django ORM** ✅ (Built-in Django)
- **Tortoise ORM** (Async-native, Django-like API)
- **Peewee** (Simple, lightweight)

### Validation
- **Pydantic** ✅ (Type-based validation, FastAPI default)
- **jsonschema** (Pure JSON Schema validation)
- **marshmallow** (Serialization + validation)

### Testing
- **pytest** ✅ (De-facto standard, 50M+ monthly)
- **unittest** (Built-in, more verbose)
- **pytest-asyncio** (Async test support)
- **pytest-cov** (Coverage reporting)

### Async
- **asyncio** ✅ (Built-in, standard async library)
- **trio** (Alternative async framework)
- **aiohttp** (Async HTTP client/server)
- **httpx** (Async/sync HTTP client)

### Data Science
- **numpy** ✅ (Arrays, scientific computing)
- **pandas** ✅ (Data analysis, dataframes)
- **matplotlib** (Plotting)
- **scikit-learn** (Machine learning)

### Task Queues
- **Celery** ✅ (Distributed task queue)
- **RQ** (Simple task queue, Redis-backed)
- **Dramatiq** (Alternative to Celery)

### Logging
- **logging** ✅ (Built-in)
- **loguru** (Simpler API, better formatting)
- **structlog** (Structured logging)

### Date/Time
- **datetime** ✅ (Built-in, prefer this)
- **arrow** (Friendlier API)
- **pendulum** (Timezone-aware, human-friendly)

### Configuration
- **pydantic-settings** ✅ (Type-safe config with Pydantic)
- **python-dotenv** (Load .env files)
- **dynaconf** (Multi-environment config)

## Type Hints Support

### Native Type Hints (Preferred)

**Libraries with native type hints:**
```python
from fastapi import FastAPI  # Native type hints
from pydantic import BaseModel  # Native type hints
from httpx import AsyncClient  # Native type hints
```

**Benefits:**
- First-class type support
- Better IDE experience
- Maintained by library authors

### Type Stubs via typeshed

**Libraries requiring type stubs:**
```python
import requests  # No native types
# Install: pip install types-requests

from redis import Redis  # No native types
# Install: pip install types-redis
```

**Search for type stubs:**
```bash
pip search types-{package}
```

### Check Type Support

**In PyPI response:**
```json
{
  "info": {
    "classifiers": [
      "Typing :: Typed"
    ]
  }
}
```

## Python Version Compatibility

### Python 3.8+ (Recommended Minimum)

**Features:**
- Walrus operator (`:=`)
- Positional-only parameters
- f-string `=` debugging

### Python 3.9+

**Features:**
- Type hints improvements (PEP 585)
- Dictionary merge operator (`|`)
- String methods improvements

### Python 3.10+

**Features:**
- Structural pattern matching
- Better error messages
- Type hints improvements (PEP 604, PEP 612)

### Python 3.11+

**Features:**
- 10-60% faster than 3.10
- Better error messages
- Exception groups

### Python 3.12+

**Features:**
- Even faster (PEP 659)
- Type parameter syntax (PEP 695)
- `f-string` improvements

**Recommendation:**
- Minimum: Python 3.8
- Recommended: Python 3.11+ (best performance)

## Common Pitfalls

### Pitfall 1: Mixing pip and Conda

**Problem:**
```bash
conda install numpy
pip install scipy  # May cause conflicts!
```

**Solution:**
Stick to one package manager:
```bash
# Prefer conda for data science packages
conda install numpy scipy pandas

# Or use pip for everything
pip install numpy scipy pandas
```

### Pitfall 2: No Virtual Environment

**Problem:**
```bash
pip install fastapi  # Installs globally!
```

**Solution:**
Always use virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows
pip install fastapi
```

### Pitfall 3: Outdated Type Stubs

**Problem:**
```python
import requests  # Version 2.31.0
# types-requests is outdated (version 2.28.x)
# Type errors!
```

**Solution:**
Keep type stubs in sync:
```bash
pip install requests==2.31.0
pip install types-requests==2.31.*
```

### Pitfall 4: Async/Sync Mismatch

**Problem:**
```python
import asyncio
import requests  # Sync library!

async def fetch_data():
    response = requests.get("https://api.example.com")  # Blocks event loop!
    return response.json()
```

**Solution:**
Use async library:
```python
import asyncio
import httpx

async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com")
        return response.json()
```

## Additional Resources

### Official Documentation
- PyPI: https://pypi.org/
- Python Packaging: https://packaging.python.org/
- Python.org: https://www.python.org/

### Package Quality Checks
- PyPI Stats: https://pypistats.org/
- Libraries.io: https://libraries.io/pypi
- Snyk Advisor: https://snyk.io/advisor/python

### Security
- pip audit: `pip install pip-audit && pip-audit`
- Safety: `pip install safety && safety check`
- Snyk: https://snyk.io/

### Version Management
- pip-review: `pip install pip-review && pip-review`
- Poetry update: `poetry update`
- Dependabot: GitHub's dependency updater
