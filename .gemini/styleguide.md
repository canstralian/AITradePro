# Python Style Guide – HackerHardware.net

This style guide extends PEP 8 and adds rules specific to our workflows.

---

## General Principles

- Code must be readable, maintainable, and consistent.
- Follow PEP 8 for Python unless explicitly overridden here.
- Optimize for clarity over brevity.

---

## Naming Conventions

- **Private helpers** (internal functions, methods, and variables) must be prefixed with a single underscore `_`.
  Example:
  def \_normalize_path(path):
  """Internal helper to standardize file paths."""
  ...
- Constants should be UPPER_CASE with underscores.
- Function and variable names should be snake_case.
- Class names should use PascalCase.

---

## Imports

- Standard library imports first, then third-party packages, then local modules.
- Group imports and separate with a blank line between groups.
- Avoid wildcard imports (`from module import *`).

---

## Functions and Methods

- Keep functions small and focused on one responsibility.
- Always include docstrings for public functions and classes.
- Use type hints for function parameters and return types.

---

## Error Handling

- Prefer explicit exception handling with `try/except` over catching broad exceptions.
- Never use bare `except:` — catch specific exceptions.
- Include an error message when raising exceptions.

---

## Formatting

- Limit all lines to 88 characters (Black formatter default).
- Indentation: 4 spaces per level, no tabs.
- Use a single blank line to separate functions and class definitions.

---

## Testing

- Tests should follow the `test_*.py` naming convention.
- Use pytest-style asserts rather than unittest assertions when possible.
- Mock external dependencies to keep tests fast and deterministic.
