# Quickstart Guide

Get the backtesting engine running in 5 minutes.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ (running and accessible)
- Git

## 1. Clone and Navigate

```bash
cd /path/to/AITradePro/backtesting
```

## 2. Environment Setup

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## 3. Configure Database

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Minimum required:
DATABASE_URL=postgresql://user:password@localhost:5432/aitradepro
```

## 4. Run Migrations

```bash
# Initialize database schema
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade  -> abc123, initial schema
```

## 5. Verify Setup

```bash
# Run tests to verify everything works
pytest
```

All tests should pass ✓

## 6. Start Development Server (Optional)

If implementing API endpoints:

```bash
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs for interactive API documentation.

## Common Commands

```bash
# Run tests
make test

# Format code
make format

# Run all checks
make check

# Create migration
make migration MSG="add new field"

# Run migrations
make migrate
```

## Next Steps

1. **Create your first dataset:**
   ```python
   from app.models.backtest import BacktestDataset
   from app.database import AsyncSessionLocal

   async with AsyncSessionLocal() as session:
       dataset = BacktestDataset(
           name="BTC 2023",
           content_hash="a" * 64,
           start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
           end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
           symbols=["BTC"],
           timeframe="1h",
       )
       session.add(dataset)
       await session.commit()
   ```

2. **Read the full documentation:**
   - [README.md](README.md) - Complete setup and usage
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Design decisions and patterns

3. **Explore the codebase:**
   - `app/models/` - Database schema
   - `app/schemas/` - API validation
   - `tests/` - Test examples

## Troubleshooting

### "Database connection failed"

Check PostgreSQL is running:
```bash
psql -U your_user -d aitradepro -c "SELECT 1;"
```

### "ModuleNotFoundError"

Ensure virtual environment is activated:
```bash
which python  # Should show venv/bin/python
```

### "Migration already exists"

Reset database:
```bash
alembic downgrade base
alembic upgrade head
```

## Support

- GitHub Issues: https://github.com/canstralian/AITradePro/issues
- Documentation: See README.md and ARCHITECTURE.md
