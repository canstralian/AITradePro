# Gemini Code Assist configuration for autonomous reviews

# Add some personality if desired (set to false if you want strict, no-fun mode)
have_fun: false

# Patterns of files to skip during review
ignore_patterns:
  - "tests/data/*"       # Skip test fixture data
  - "docs/*"             # Skip docs from review
  - "*.md"               # Skip markdown files (except styleguide.md)
  - "*.png"
  - "*.jpg"
  - "*.gif"
  - "*.svg"

# Code review settings
code_review:
  disable: false                     # Keep reviews enabled
  comment_severity_threshold: MEDIUM # Flag issues Medium severity or higher
  max_review_comments: 15             # Prevent excessive comments

# Actions to take when a pull request opens
pull_request_opened:
  help: false                         # Don't post generic help messages
  summary: true                       # Post a summary of the PR
  code_review: true                   # Run a full code review automatically