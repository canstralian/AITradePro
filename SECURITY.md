# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

### Authentication & Authorization

- JWT-based authentication with secure token generation
- Rate limiting on API endpoints (100 requests/15min)
- Enhanced rate limiting for trading endpoints (10 requests/min)
- Token expiration (24 hours)

### Input Validation & Sanitization

- Comprehensive input validation using Zod schemas
- XSS protection through input sanitization
- SQL injection prevention through parameterized queries
- File upload restrictions and validation

### Security Headers

- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict Transport Security (HSTS) in production
- Referrer Policy: strict-origin-when-cross-origin

### CORS Configuration

- Whitelist-based origin validation
- Secure credential handling
- Preflight request support

### Environment Security

- Required environment variables validation
- No hardcoded secrets in codebase
- Separate development/production configurations

### Logging & Monitoring

- Structured logging with different levels
- Error tracking and monitoring
- Request/response logging for audit trails

## Managing Sensitive Data

### Using Environment Variables (.env Files)

**CRITICAL: Never commit sensitive data to version control!**

#### Setting Up Environment Variables

1. **Use `.env` files for local development**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your actual values
   nano .env
   ```

2. **Required environment variables**:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/aitradepro
   
   # Security Keys (minimum 32 characters)
   JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
   SESSION_SECRET=your-session-secret-key-change-this-too
   
   # Application Configuration
   NODE_ENV=production
   PORT=5000
   LOG_LEVEL=INFO
   ```

3. **Best practices for secrets**:
   - Use strong, randomly generated secrets (minimum 32 characters)
   - Use different secrets for development and production
   - Rotate secrets periodically (every 90 days recommended)
   - Never share secrets via email, chat, or documentation
   - Use a secure password manager for team secret sharing

#### .env File Security

- ✅ **DO**: Keep `.env` in `.gitignore` (already configured)
- ✅ **DO**: Use `.env.example` as a template with dummy values
- ✅ **DO**: Document all required variables in README.md
- ✅ **DO**: Use environment-specific files (`.env.production`, `.env.development`)
- ❌ **DON'T**: Commit `.env` files to version control
- ❌ **DON'T**: Include real secrets in code comments or documentation
- ❌ **DON'T**: Log sensitive environment variables
- ❌ **DON'T**: Expose environment variables in error messages

#### Production Deployment

For production environments, use secure secret management:

- **Cloud Providers**: Use AWS Secrets Manager, Azure Key Vault, or Google Secret Manager
- **Container Orchestration**: Use Kubernetes Secrets or Docker Secrets
- **CI/CD Platforms**: Use GitHub Secrets, GitLab CI/CD Variables, etc.
- **Environment Variables**: Set directly in hosting platform (Heroku, Vercel, etc.)

### Dependency Security Scanning

#### Overview

We use multiple tools to ensure dependency security:

1. **npm audit**: Built-in vulnerability scanner
2. **audit-ci**: CI-friendly audit tool with configurable thresholds
3. **GitHub Dependabot**: Automated dependency updates and security alerts

#### Running Security Scans

##### Local Development

```bash
# Run basic npm audit
npm audit

# Run audit with production dependencies only
npm audit --production

# Run audit with CI configuration
npm run audit

# Attempt automatic fixes
npm audit fix

# Force fixes (may include breaking changes)
npm audit fix --force
```

##### Understanding audit-ci Configuration

Our `audit-ci.json` configuration:

```json
{
  "moderate": true,
  "high": true,
  "critical": true,
  "allowlist": []
}
```

This configuration:
- Fails on moderate, high, and critical vulnerabilities
- Allows you to allowlist specific advisories (use sparingly)
- Runs automatically in CI/CD pipeline

#### Reviewing Security Scan Results

When vulnerabilities are detected:

1. **Assess Severity**:
   - **Critical**: Drop everything and fix immediately
   - **High**: Fix within 24-48 hours
   - **Moderate**: Fix within 1 week
   - **Low**: Fix when convenient or with next dependency update

2. **Understand the Vulnerability**:
   ```bash
   # Get detailed information
   npm audit
   
   # Check specific package
   npm audit --json | jq '.vulnerabilities.PACKAGE_NAME'
   ```

3. **Fix Process**:
   
   **Option A - Automatic Fix**:
   ```bash
   npm audit fix
   ```
   
   **Option B - Manual Update**:
   ```bash
   # Update specific package
   npm update package-name
   
   # Update to specific version
   npm install package-name@version
   ```
   
   **Option C - Alternative Package**:
   - Research alternative packages
   - Evaluate security, maintenance, and features
   - Replace the vulnerable dependency

4. **Testing After Fixes**:
   ```bash
   # Run all tests
   npm run test:run
   
   # Run linting
   npm run lint
   
   # Build the project
   npm run build
   
   # Test in development
   npm run dev
   ```

5. **Document Exceptions**:
   
   If a vulnerability cannot be fixed immediately:
   
   - Document the reason in your PR or issue
   - Add to allowlist in `audit-ci.json` with justification
   - Create a follow-up issue to track
   - Set a reminder to revisit
   
   Example allowlist entry:
   ```json
   {
     "allowlist": [
       "GHSA-xxxx-xxxx-xxxx"  // Waiting for upstream fix, low impact
     ]
   }
   ```

#### CI/CD Integration

Our CI pipeline automatically:

1. Runs `npm audit` during lint_typecheck job
2. Fails the build on moderate+ vulnerabilities
3. Reports security issues in PR checks
4. Blocks merge if security checks fail

**Handling CI Security Failures**:

```bash
# Reproduce locally
npm run audit

# Fix vulnerabilities
npm audit fix

# Verify fix
npm run audit

# Commit and push
git add package*.json
git commit -m "fix: resolve security vulnerabilities"
git push
```

#### GitHub Dependabot

Dependabot automatically:

- Scans dependencies daily
- Creates PRs for security updates
- Creates PRs for version updates (if configured)
- Provides detailed security advisories

**Responding to Dependabot PRs**:

1. Review the PR description and changelog
2. Check for breaking changes
3. Test locally if needed
4. Approve and merge if safe
5. Close and document if not applicable

#### Preventive Measures

1. **Before Adding Dependencies**:
   ```bash
   # Check package health
   npm view package-name
   
   # Check for known vulnerabilities
   npm install package-name
   npm audit
   ```

2. **Regular Maintenance**:
   - Run `npm audit` weekly
   - Review Dependabot PRs within 48 hours
   - Update dependencies monthly
   - Monitor security advisories

3. **Development Practices**:
   - Minimize dependencies
   - Prefer well-maintained packages
   - Check package licenses
   - Review package source code for critical dependencies

#### Security Scanning Workflow

```mermaid
graph TD
    A[Dependency Change] --> B[Local npm audit]
    B --> C{Vulnerabilities?}
    C -->|Yes| D[Attempt npm audit fix]
    C -->|No| H[Commit Changes]
    D --> E{Fixed?}
    E -->|Yes| F[Test Thoroughly]
    E -->|No| G[Manual Update/Replace]
    G --> F
    F --> H
    H --> I[Push to GitHub]
    I --> J[CI Security Check]
    J --> K{Passed?}
    K -->|Yes| L[Merge Approved]
    K -->|No| M[Fix and Retry]
    M --> B
```

### Security Checklist for Contributors

Before submitting a PR:

- [ ] No sensitive data (API keys, passwords, tokens) in code
- [ ] Environment variables used for all secrets
- [ ] `.env` file not committed
- [ ] `npm audit` passes with no critical/high vulnerabilities
- [ ] New dependencies scanned for vulnerabilities
- [ ] Security-related changes reviewed for best practices
- [ ] No credentials in logs or error messages
- [ ] Input validation implemented for new endpoints
- [ ] SQL queries use parameterized statements
- [ ] XSS prevention in place for user input

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do not** create a public GitHub issue for the vulnerability
2. Email security details to: [security@yourcompany.com] (replace with actual email)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Best Practices for Deployment

### Environment Variables

- Set strong, unique JWT_SECRET in production
- Use secure database credentials
- Configure proper LOG_LEVEL for production
- Set secure SESSION_SECRET

### Database Security

- Use connection pooling with proper limits
- Enable database-level encryption
- Regular backups with encryption
- Principle of least privilege for database users

### Network Security

- Use HTTPS in production
- Configure proper firewall rules
- Use secure WebSocket connections (WSS)
- Consider using a reverse proxy (nginx, etc.)

### Monitoring

- Set up log aggregation and monitoring
- Configure alerts for suspicious activities
- Regular security audits and dependency updates
- Monitor for failed authentication attempts

### Regular Maintenance

- Keep dependencies updated
- Regular security audits using `npm audit`
- Code reviews for security issues
- Automated security testing in CI/CD
