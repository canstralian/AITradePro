# Backtesting Engine Architecture

## Overview

This document describes the production-grade architecture of the AITradePro backtesting engine, focusing on database design, validation patterns, and integration strategies.

## Design Principles

### 1. PostgreSQL-First Optimization

Every design decision prioritizes PostgreSQL's strengths:

- **ENUMs over strings**: Type safety at the database level
- **JSONB over TEXT**: Structured, indexed dynamic data
- **ARRAY types**: Native list support without join tables
- **Numeric precision**: Exact decimal arithmetic for finances
- **Timezone awareness**: UTC normalization throughout

### 2. Immutability and Reproducibility

Backtests must be reproducible:

- Dataset content hashing ensures data integrity
- Strategy versioning prevents parameter drift
- All timestamps are UTC-aware and immutable
- Audit trails capture creation/update times

### 3. Type Safety at Every Layer

- **Database**: ENUMs, CHECK constraints, foreign keys
- **ORM**: SQLAlchemy 2.0 with Mapped types
- **Validation**: Pydantic with custom validators
- **API**: FastAPI with automatic OpenAPI generation

## Database Schema Design

### Core Entities

```
datasets (historical data)
    ↓ FK
runs (backtest executions) ← FK → strategies (trading logic)
    ↓ FK                               ↑ FK
    ├─→ artifacts (outputs)            │
    └─→ events (execution log)         │
                                       └─ (referenced by runs)
```

### Relationship Patterns

#### One-to-Many (Parent → Children)

- `datasets` → `runs`: One dataset used by many backtests
- `strategies` → `runs`: One strategy tested multiple times
- `runs` → `artifacts`: One run generates multiple outputs
- `runs` → `events`: One run logs many events

#### Cascade Behavior

- **RESTRICT on datasets/strategies**: Prevent deletion if runs exist
- **CASCADE on artifacts/events**: Auto-delete outputs when run deleted

This ensures:
- Historical data preservation (datasets can't be accidentally deleted)
- Clean orphan prevention (artifacts don't survive without parent runs)

### Index Strategy

#### B-Tree Indexes (Default)

For equality, range, and sorting queries:

```sql
CREATE INDEX ix_runs_executed_at ON runs (executed_at);
CREATE INDEX ix_datasets_daterange ON datasets (start_date, end_date);
```

**Use cases:**
- Filtering by date ranges
- Sorting by timestamp
- Unique constraint enforcement

#### GIN Indexes (Generalized Inverted Index)

For JSONB containment and array operations:

```sql
CREATE INDEX ix_strategies_params ON strategies USING gin (params);
CREATE INDEX ix_events_payload ON events USING gin (payload);
```

**Use cases:**
- Query strategies with specific parameters: `WHERE params @> '{"fast_period": 10}'`
- Search events by payload content: `WHERE payload @> '{"symbol": "BTC"}'`
- Array containment: `WHERE symbols @> ARRAY['BTC']`

#### Functional Indexes

For case-insensitive or computed values:

```sql
CREATE INDEX ix_datasets_timeframe ON datasets (lower(timeframe));
```

**Use cases:**
- Case-insensitive searches
- Normalized value lookups

### Constraint Philosophy

#### Unique Constraints

Prevent logical duplicates:

- `uq_datasets_hash`: Same data shouldn't exist twice
- `uq_strategies_name_version`: Version control enforcement

#### Check Constraints

Business logic validation:

```sql
CHECK (start_date < end_date)
CHECK (initial_capital > 0)
CHECK (total_trades = winning_trades + losing_trades)
```

**Advantages:**
- Database-level enforcement (can't be bypassed)
- Automatic validation on every write
- Self-documenting business rules

## Pydantic Validation Architecture

### Three-Layer Validation

1. **Field-level validators**: Individual field rules
2. **Model-level validators**: Cross-field logic
3. **Database constraints**: Final enforcement

Example:

```python
class BacktestDatasetCreate(BaseSchema):
    start_date: datetime
    end_date: datetime

    @field_validator("start_date", "end_date")  # Layer 1
    @classmethod
    def validate_timezone_aware(cls, v: datetime) -> datetime:
        return ensure_utc_aware(v)

    @model_validator(mode="after")  # Layer 2
    def validate_date_range(self) -> "BacktestDatasetCreate":
        if self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        return self

    # Layer 3: Database CHECK (start_date < end_date)
```

### Timezone Normalization

All datetime handling goes through `ensure_utc_aware()`:

```python
def ensure_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
```

**Benefits:**
- No naive datetime bugs
- Consistent storage format
- Client timezone conversion happens at API boundary

### Decimal Precision

Financial values use `Decimal` types:

```python
initial_capital: Decimal = Field(
    ...,
    gt=0,
    max_digits=18,
    decimal_places=4,
)
```

**Why not float?**

```python
# Float precision issues
0.1 + 0.2 == 0.3  # False!

# Decimal precision
Decimal("0.1") + Decimal("0.2") == Decimal("0.3")  # True
```

## SQLAlchemy 2.0 Patterns

### Mapped Column Declarations

New SQLAlchemy 2.0 style with type hints:

```python
class BacktestRun(Base):
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    initial_capital: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
```

**Benefits:**
- Type checker integration (MyPy, Pyright)
- Automatic nullability inference
- Better IDE autocomplete

### Relationship Loading

Lazy loading by default, explicit eager loading when needed:

```python
# Lazy (default) - N+1 query problem
runs = session.query(BacktestRun).all()
for run in runs:
    print(run.dataset.name)  # Separate query for each dataset!

# Eager loading - single query
from sqlalchemy.orm import selectinload

runs = session.query(BacktestRun).options(
    selectinload(BacktestRun.dataset),
    selectinload(BacktestRun.strategy),
).all()
```

### Async Session Pattern

```python
async def create_run(db: AsyncSession, data: BacktestRunCreate) -> BacktestRun:
    run = BacktestRun(**data.model_dump())
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run
```

## Integration Patterns

### Microservice Communication

#### REST API (Synchronous)

Node.js → Python:

```typescript
// Node.js: Trigger backtest
const response = await fetch('http://backtesting:8000/api/v1/runs', {
  method: 'POST',
  body: JSON.stringify({ dataset_id, strategy_id, initial_capital })
});
const run = await response.json();
```

Python → Node.js:

```python
# Python: Notify completion
async with httpx.AsyncClient() as client:
    await client.post(
        'http://api:5000/webhooks/backtest-complete',
        json={'run_id': str(run.id), 'status': 'completed'}
    )
```

#### Message Queue (Asynchronous)

For long-running operations:

```
Node.js → RabbitMQ/Redis → Python Worker
                ↓
         PostgreSQL (shared)
                ↓
         Node.js (polling or webhook)
```

**Advantages:**
- Decoupled services
- Retry logic
- Load balancing

### Shared Database Strategy

Both services share PostgreSQL:

**Node.js (Drizzle):**
- `users`, `assets`, `trades`, `positions`
- Real-time operations

**Python (SQLAlchemy):**
- `datasets`, `strategies`, `runs`, `artifacts`, `events`
- Batch operations

**Isolation:**
- Separate table prefixes or schemas
- Row-level security (RLS) if needed
- Transaction isolation levels

## Performance Optimization

### Query Patterns

#### Pagination

```python
from sqlalchemy import select

# Offset pagination (simple but slow for large offsets)
stmt = select(BacktestRun).offset(100).limit(20)

# Cursor pagination (fast, stateless)
stmt = select(BacktestRun).where(
    BacktestRun.executed_at < cursor_timestamp
).order_by(BacktestRun.executed_at.desc()).limit(20)
```

#### Aggregations

```python
from sqlalchemy import func, select

# Count runs per strategy
stmt = select(
    StrategyConfig.name,
    func.count(BacktestRun.id).label('run_count'),
    func.avg(BacktestRun.total_return).label('avg_return')
).join(BacktestRun).group_by(StrategyConfig.id)
```

#### JSONB Queries

```python
from sqlalchemy import cast
from sqlalchemy.dialects.postgresql import JSONB

# Find strategies with specific parameter
stmt = select(StrategyConfig).where(
    StrategyConfig.params['fast_period'].astext.cast(Integer) == 10
)

# Containment query (uses GIN index)
stmt = select(StrategyConfig).where(
    StrategyConfig.params.contains({'fast_period': 10})
)
```

### Connection Pooling

```python
engine = create_async_engine(
    database_url,
    pool_size=20,          # Connections kept open
    max_overflow=10,       # Additional connections allowed
    pool_pre_ping=True,    # Verify connection before use
    pool_recycle=3600,     # Recycle connections after 1 hour
)
```

**Monitoring:**

```python
# Get pool statistics
print(f"Pool size: {engine.pool.size()}")
print(f"Checked in: {engine.pool.checkedin()}")
print(f"Checked out: {engine.pool.checkedout()}")
```

### Bulk Operations

```python
# Inefficient: Individual inserts
for event_data in events:
    event = BacktestEvent(**event_data)
    session.add(event)
    await session.commit()  # 1000 commits!

# Efficient: Bulk insert
events = [BacktestEvent(**data) for data in events]
session.add_all(events)
await session.commit()  # 1 commit
```

## Testing Strategy

### Test Pyramid

```
     /\
    /E2E\        ← Few (API integration tests)
   /------\
  /Unit    \     ← Many (schema validation, utils)
 /----------\
/Integration \   ← Some (database CRUD, relationships)
--------------
```

### Test Database Isolation

Each test gets a fresh database state:

```python
@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    # Create tables
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

    # Drop tables
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

### Test Factories

```python
# Factory pattern for test data
def make_dataset(**overrides):
    defaults = {
        "name": "Test Dataset",
        "content_hash": "a" * 64,
        "start_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
        "end_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
        "symbols": ["BTC"],
        "timeframe": "1h",
    }
    return BacktestDataset(**{**defaults, **overrides})
```

## Monitoring and Observability

### Logging

```python
import logging

logger = logging.getLogger(__name__)

# Structured logging
logger.info(
    "Backtest completed",
    extra={
        "run_id": str(run.id),
        "strategy": strategy.name,
        "total_return": float(run.total_return),
        "duration_seconds": duration,
    }
)
```

### Metrics

```python
from prometheus_client import Counter, Histogram

# Track backtest executions
backtest_counter = Counter(
    'backtests_total',
    'Total number of backtests run',
    ['strategy', 'status']
)

# Track execution time
backtest_duration = Histogram(
    'backtest_duration_seconds',
    'Time taken to execute backtest',
    ['strategy']
)
```

### Health Checks

```python
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_session)):
    try:
        await db.execute(select(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
```

## Security Considerations

### SQL Injection Prevention

SQLAlchemy parameterizes queries automatically:

```python
# Safe - parameterized
user_id = request.params.get('user_id')
stmt = select(BacktestRun).where(BacktestRun.id == user_id)

# Unsafe - string concatenation
stmt = text(f"SELECT * FROM runs WHERE id = '{user_id}'")  # DON'T DO THIS
```

### Input Validation

Pydantic prevents malicious inputs:

```python
class StrategyConfigCreate(BaseSchema):
    name: str = Field(max_length=255)  # Prevents overly long strings
    version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+")  # Only semver
```

### Rate Limiting

```python
from slowapi import Limiter

limiter = Limiter(key_func=lambda: request.client.host)

@app.post("/runs")
@limiter.limit("10/minute")
async def create_run(data: BacktestRunCreate):
    ...
```

## Future Enhancements

### Horizontal Scaling

- Read replicas for query load distribution
- Connection pooling with PgBouncer
- Caching layer (Redis) for frequent queries

### Advanced Features

- Time-travel queries (temporal tables)
- Partitioning for `events` table (by date)
- Materialized views for aggregate metrics
- Full-text search with `tsvector`

### Observability

- Distributed tracing (OpenTelemetry)
- Query performance monitoring (pg_stat_statements)
- Alerting on slow queries and errors

## Conclusion

This architecture prioritizes:

1. **Correctness**: Strong typing, validation, constraints
2. **Performance**: Indexes, connection pooling, bulk operations
3. **Maintainability**: Clear patterns, comprehensive tests, documentation
4. **Scalability**: Async operations, microservice design, horizontal scaling

Every design choice serves production readiness and long-term system health.
