# AITradePro Backtesting Engine

Production-grade backtesting engine with PostgreSQL-specific optimizations, Pydantic validation, and comprehensive testing infrastructure.

## Architecture Highlights

### PostgreSQL-Specific Optimizations

1. **ENUMs for Constrained Inputs**
   - `run_mode`: backtest, paper, live
   - `artifact_kind`: plot, report, csv, pickle, json
   - Cast once via `CREATE TYPE`, avoiding dynamic type creation during schema introspection

2. **JSONB for Dynamic Payloads**
   - Strategy parameters in `strategies.params`
   - Runtime metadata in `runs.metadata`
   - Event payloads in `events.payload`
   - Performance-optimized with GIN indexing for fast queries

3. **Precision Financial Data**
   - `Numeric(18,4)` for monetary values (capital, portfolio value)
   - `Numeric(10,4)` for percentages (returns, drawdown, ratios)
   - Avoids floating-point precision issues in financial calculations

4. **Timezone-Aware Timestamps**
   - All `DateTime` fields use `timezone=True` (PostgreSQL `timestamptz`)
   - Normalized to UTC across the entire application
   - Pydantic validators ensure timezone awareness

5. **Comprehensive Indexing**
   - Functional indexes: `ix_datasets_timeframe`
   - Composite indexes: `ix_datasets_daterange`, `ix_runs_mode_date`
   - GIN indexes: `ix_strategies_params`, `ix_runs_metadata`, `ix_events_payload`
   - Time-series indexes: `ix_events_run_timestamp`

6. **Data Integrity Guarantees**
   - Unique constraints: `uq_datasets_hash`, `uq_strategies_name_version`
   - Check constraints: date ranges, positive values, trade count consistency
   - Foreign key cascades: `artifacts` and `events` cascade on delete

## Project Structure

```
backtesting/
├── alembic/                    # Database migrations
│   ├── versions/               # Migration scripts
│   ├── env.py                  # Alembic environment
│   └── script.py.mako          # Migration template
├── app/
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   └── backtest.py         # Core backtesting models
│   ├── schemas/                # Pydantic validation schemas
│   │   ├── __init__.py
│   │   └── backtest.py         # API request/response schemas
│   ├── api/                    # FastAPI endpoints (to be implemented)
│   ├── config.py               # Configuration management
│   └── database.py             # Database connection and session
├── tests/
│   ├── conftest.py             # Pytest fixtures
│   ├── test_models.py          # Model tests
│   └── test_schemas.py         # Schema validation tests
├── alembic.ini                 # Alembic configuration
├── pyproject.toml              # Project metadata and dependencies
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
└── README.md                   # This file
```

## Database Schema

### Tables

#### `datasets`
Historical market data snapshots for reproducible backtesting.

**Key Features:**
- Content hashing (SHA-256) for data integrity
- Array of symbols for asset universe definition
- Timeframe specification (e.g., '1m', '1h', '1d')
- Date range with validation constraints

#### `strategies`
Trading strategy configurations with versioned parameters.

**Key Features:**
- Semantic versioning (semver)
- Dynamic JSONB parameters for language-agnostic strategy definitions
- Unique name+version combinations
- GIN index for parameter queries

#### `runs`
Backtest execution results with comprehensive performance metrics.

**Key Features:**
- Financial metrics: returns, drawdown, Sharpe ratio
- Trade statistics: total, winning, losing, win rate
- Run mode: backtest, paper, live
- Extensible metadata in JSONB
- Check constraints for data consistency

#### `artifacts`
Generated outputs (plots, reports, CSV exports, etc.).

**Key Features:**
- Type classification via ENUM
- Storage path for S3/filesystem integration
- MIME type and file size tracking
- Cascade delete with parent run

#### `events`
Time-series event log for execution tracking.

**Key Features:**
- Structured JSONB payloads
- Event type classification
- Historical timestamps (for backtests)
- GIN index for fast payload queries

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- pip or uv

### Installation

1. **Clone the repository:**
   ```bash
   cd /path/to/AITradePro/backtesting
   ```

2. **Create virtual environment:**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

### Environment Variables

Required environment variables in `.env`:

```env
# Database Configuration (required)
DATABASE_URL=postgresql://user:password@localhost:5432/aitradepro

# Application Settings
ENV=development              # development, staging, production
DEBUG=true                   # Enable debug mode
LOG_LEVEL=INFO              # DEBUG, INFO, WARNING, ERROR, CRITICAL

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
```

## Database Migrations

### Creating a New Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration in alembic/versions/
# Edit if necessary, then apply:
alembic upgrade head
```

### Common Migration Commands

```bash
# Show current revision
alembic current

# Show migration history
alembic history --verbose

# Upgrade to latest
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_models.py

# Run with verbose output
pytest -v

# Run in watch mode
pytest-watch
```

### Test Configuration

Tests use a separate test database (configured in `tests/conftest.py`):

```env
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/aitradepro_test
```

**Important:** Tests will automatically create and drop tables for each test function.

## Code Quality

### Formatting

```bash
# Format code with Black
black .

# Check formatting without modifying
black --check .
```

### Linting

```bash
# Run Ruff linter
ruff check .

# Auto-fix issues
ruff check --fix .
```

### Type Checking

```bash
# Run MyPy type checker
mypy app/
```

### Pre-commit Hook (Recommended)

```bash
pip install pre-commit
pre-commit install
```

## Integration with Node.js Backend

The Python backtesting engine shares the same PostgreSQL database with the Node.js trading platform. Here's how they integrate:

### Shared Database

Both backends connect to the same PostgreSQL instance:

- **Node.js** (Drizzle ORM): Handles real-time trading, user management, market data
- **Python** (SQLAlchemy): Handles backtesting, strategy simulation, performance analysis

### Data Flow

1. **User creates strategy** in Node.js frontend → Saved to `strategies` table
2. **User requests backtest** → Python backend picks up job
3. **Python runs backtest** → Writes results to `runs`, `events`, `artifacts` tables
4. **Node.js fetches results** → Displays in React frontend

### API Integration

The Python backend exposes FastAPI endpoints that the Node.js backend can call:

```typescript
// Example Node.js integration
const response = await fetch('http://localhost:8000/api/v1/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dataset_id: 'uuid',
    strategy_id: 'uuid',
    initial_capital: 10000.00
  })
});
```

### WebSocket Integration (Future)

For real-time backtest progress updates:

- Python backend broadcasts progress via WebSocket
- Node.js frontend receives updates and displays progress bar

## Performance Considerations

### Database Optimization

1. **Connection Pooling**
   - Production: Pool size 20, max overflow 10
   - Development: NullPool for debugging

2. **Query Optimization**
   - Use indexes for filtering and sorting
   - Leverage GIN indexes for JSONB queries
   - Use `EXPLAIN ANALYZE` for slow queries

3. **Batch Operations**
   - Use `executemany()` for bulk inserts
   - Consider `COPY` for large datasets

### Monitoring

```python
# Enable query logging in development
DATABASE_ECHO=true

# Use connection events for timing
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, params, context, executemany):
    context._query_start_time = time.time()
```

## Deployment

### Docker Support (Recommended)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.9'
services:
  backtesting:
    build: ./backtesting
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/aitradepro
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aitradepro
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong passwords** for database connections
3. **Enable SSL/TLS** for database connections in production
4. **Validate all inputs** with Pydantic schemas
5. **Use parameterized queries** (SQLAlchemy does this by default)
6. **Implement rate limiting** on API endpoints
7. **Enable CORS** only for trusted origins

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server
```
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `pg_isready`
- Check firewall/network settings

**2. Migration Conflicts**
```
alembic.util.exc.CommandError: Target database is not up to date.
```
- Run: `alembic upgrade head`
- If issues persist: `alembic downgrade base && alembic upgrade head`

**3. Test Database Issues**
```
asyncpg.exceptions.InvalidCatalogNameError: database "aitradepro_test" does not exist
```
- Create test database: `createdb aitradepro_test`
- Or update `TEST_DATABASE_URL` in `tests/conftest.py`

## Contributing

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and add tests
3. Run code quality checks: `black . && ruff check . && mypy app/`
4. Run tests: `pytest`
5. Commit changes: `git commit -m "Description"`
6. Push and create PR

## License

Proprietary - AITradePro

## Support

For issues and questions:
- GitHub Issues: https://github.com/canstralian/AITradePro/issues
- Documentation: https://docs.aitradepro.com (coming soon)
