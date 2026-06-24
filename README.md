# AI Trading Platform

[![GitHub forks](https://img.shields.io/github/forks/canstralian/AITradePro.svg?style=social&label=Fork)](https://github.com/canstralian/AITradePro/fork)
[![GitHub stars](https://img.shields.io/github/stars/canstralian/AITradePro.svg?style=social&label=Stars)](https://github.com/canstralian/AITradePro/stargazers)
[![CI Pipeline](https://github.com/canstralian/AITradePro/actions/workflows/ci_pipeline.yml/badge.svg)](https://github.com/canstralian/AITradePro/actions/workflows/ci_pipeline.yml)
[![codecov](https://codecov.io/gh/canstralian/AITradePro/branch/main/graph/badge.svg)](https://codecov.io/gh/canstralian/AITradePro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

A sophisticated AI-Enhanced trading analysis platform built with modern full-stack architecture. Features real-time market data processing, AI-powered analysis with RAG technology, and Bloomberg Terminal-inspired interface.

## 🚀 Features

- **Real-time Market Data**: Live price updates with WebSocket connections
- **AI-Powered Insights**: Sentiment analysis, pattern matching, and news impact analysis
- **RAG Technology**: Vector-based contextual analysis for enhanced decision making
- **Async Worker System**: Multi-threaded analysis processing with priority queuing
- **Portfolio Management**: Real-time position tracking and P&L calculations
- **Trading Interface**: Bloomberg Terminal-inspired dark theme design

## 🛠️ Tech Stack

**Frontend:**

- React 18 with TypeScript
- Tailwind CSS + Shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- Recharts for data visualization

**Backend:**

- Node.js with Express.js
- TypeScript with ES modules
- WebSocket server for real-time data
- PostgreSQL with Drizzle ORM

**Testing & Quality:**

- Vitest for unit testing
- Testing Library for React components
- ESLint + Prettier for code quality
- Husky + lint-staged for pre-commit hooks
- GitHub Actions CI/CD pipeline

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/ai-trading-platform.git
   cd ai-trading-platform
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   # Required: PostgreSQL connection string
   DATABASE_URL=postgresql://username:password@localhost:5432/trading_db
   ```

4. **Setup database**

   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once (for CI)
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:yaml` - Validate YAML files
- `npm run format` - Format code with Prettier
- `npm run check` - TypeScript type checking
- `npm run audit` - Security audit of dependencies
- `npm run db:push` - Push database schema changes

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Structure

- `client/src/test/` - Frontend component tests
- `server/test/` - Backend API and service tests
- `vitest.config.ts` - Test configuration
- Coverage reports generated in `coverage/` directory

## 🚀 CI/CD Pipeline

Automated GitHub Actions workflow includes:

- ✅ **YAML Validation**: Workflow configuration linting
- ✅ **Code Quality**: ESLint + Prettier checks
- ✅ **Type Safety**: TypeScript compilation
- ✅ **Testing**: Unit tests with coverage reporting
- ✅ **Security**: Dependency vulnerability scanning with npm audit
- ✅ **Build Verification**: Production build testing
- ✅ **Integration Testing**: SQLite and PostgreSQL testing

For detailed information about our CI/CD workflows, YAML configuration guidelines, and troubleshooting, see [CI/CD Workflows Documentation](docs/CI_CD_WORKFLOWS.md).

## 📊 Architecture

### Real-time Data Flow

1. Market data service generates realistic price movements
2. Data stored in PostgreSQL with timestamp indexing
3. WebSocket server broadcasts updates to connected clients
4. React components receive and display live updates

### AI Analysis Pipeline

1. Automated analysis triggers based on market conditions
2. AI service creates sentiment, pattern, and news-based insights
3. Vector store performs RAG analysis for contextual responses
4. Real-time delivery via WebSocket to connected clients

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Development workflow and branching strategy
- Coding standards and best practices
- Testing requirements
- Security practices and dependency management
- YAML configuration management
- CI/CD pipeline usage
- Pull request process

### Quick Start for Contributors

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our [Contributing Guidelines](CONTRIBUTING.md)
4. Ensure all tests pass (`npm run test:run`)
5. Run security audit (`npm run audit`)
6. Commit your changes using conventional commits
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration (`npm run lint`)
- Format with Prettier (`npm run format`)
- Write tests for new features
- Update documentation as needed
- Follow security best practices in [SECURITY.md](SECURITY.md)

## 📚 Documentation

- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](SECURITY.md) - Security practices and vulnerability reporting
- [Testing Guide](TESTING.md) - Comprehensive testing documentation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [CI/CD Workflows](docs/CI_CD_WORKFLOWS.md) - CI/CD pipeline and YAML configuration guide

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Bloomberg Terminal interface design
- Built with modern React and Node.js ecosystem
- Powered by advanced AI analysis capabilities
