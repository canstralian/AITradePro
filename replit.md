# AEI Trading Platform

## Overview

This is a sophisticated AI-Enhanced trading analysis platform built with a modern full-stack architecture. The system combines real-time market data processing, AI-powered analysis with RAG (Retrieval-Augmented Generation) technology, asynchronous worker processing, and an intuitive Bloomberg Terminal-inspired trading interface to provide comprehensive trading insights and portfolio management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: Shadcn/ui with Radix UI primitives for consistent, accessible components
- **Styling**: Tailwind CSS with a custom dark theme optimized for trading interfaces
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live market data and AI insights

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **WebSocket Server**: ws library for real-time bidirectional communication
- **API Design**: RESTful endpoints with WebSocket enhancements for live data
- **Error Handling**: Centralized error middleware with request logging
- **Development**: Hot reload with Vite integration

### Database Layer
- **ORM**: Drizzle ORM for type-safe database interactions
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Design**: Comprehensive trading-focused schema including users, assets, positions, trades, AI insights, news, and market data
- **Migration Strategy**: Drizzle Kit for schema management and migrations

## Key Components

### Real-time Market Data System
- **Market Data Service**: Generates realistic price movements with asset-specific volatility
- **WebSocket Broadcasting**: Pushes live price updates to all connected clients
- **Data Storage**: Historical market data tracking with efficient indexing
- **Price Simulation**: Sophisticated price generation mimicking real market behavior

### AI Analysis Engine
- **AI Analysis Service**: Generates sentiment analysis, pattern matching, and news impact insights
- **RAG Technology**: Vector-based contextual analysis correlating market movements with news, social media, and on-chain data
- **Natural Language Processing**: Handles user queries and provides contextual responses with enhanced RAG analysis
- **Asynchronous Worker System**: Multi-threaded analysis processing with priority queuing for simultaneous multi-asset analysis
- **Vector Store Service**: Manages embeddings and performs similarity searches for historical pattern matching
- **Insight Generation**: Automated creation of trading insights with confidence scores and supporting evidence
- **Real-time Distribution**: WebSocket delivery of AI insights and worker results to connected clients

### Trading Interface
- **Dashboard**: Comprehensive trading dashboard with portfolio overview, price charts, and market data
- **Portfolio Management**: Real-time position tracking, P&L calculations, and asset allocation visualization
- **Order Book**: Live order book display with bid/ask spreads
- **Trade History**: Complete trade execution history with filtering and analysis

### UI Component System
- **Design System**: Consistent trading-themed components using Shadcn/ui with Bloomberg Terminal-inspired dark theme
- **Chart Integration**: Recharts for data visualization including price charts and portfolio allocation
- **Enhanced Components**: RAG Analysis interface for contextual queries and Worker Queue management panel
- **Real-time Updates**: Live worker status monitoring and task result visualization
- **Security Features**: Rate limiting displays, API protection indicators, and secure authentication flows
- **Responsive Design**: Mobile-first approach with trading-optimized layouts
- **Accessibility**: Full keyboard navigation and screen reader support

## Data Flow

### Real-time Data Pipeline
1. **Data Generation**: Market data service simulates realistic price movements
2. **Storage**: New data points stored in PostgreSQL with timestamp indexing
3. **Broadcasting**: WebSocket server pushes updates to all connected clients
4. **Client Processing**: React components receive and display live updates
5. **State Management**: TanStack Query manages caching and synchronization

### AI Insight Pipeline
1. **Analysis Triggers**: Automated analysis based on market conditions and time intervals
2. **Insight Generation**: AI service creates sentiment, pattern, and news-based insights
3. **Storage**: Insights stored with confidence scores and metadata
4. **Real-time Delivery**: WebSocket broadcasting to connected clients
5. **UI Integration**: Insights displayed in dedicated components with confidence indicators

### User Interaction Flow
1. **Authentication**: User session management with secure token handling
2. **Dashboard Loading**: Initial data fetch via REST APIs with caching
3. **WebSocket Connection**: Establishes real-time connection for live updates
4. **Interactive Queries**: AI chat interface for natural language market queries
5. **Trade Execution**: Order placement through secure API endpoints

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless connection
- **drizzle-orm & drizzle-zod**: Type-safe ORM with Zod validation
- **@tanstack/react-query**: Server state management and caching
- **recharts**: Data visualization and charting library
- **ws**: WebSocket server implementation
- **express-rate-limit**: API protection and rate limiting
- **jsonwebtoken**: Secure authentication and authorization

### Security & Performance
- **express-rate-limit**: Protection against API abuse and DDoS
- **Security middleware**: XSS protection, CSRF prevention, secure headers
- **Input validation**: Symbol validation and SQL injection prevention
- **Async processing**: Worker queue system for heavy computational tasks

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives for complex components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Modern icon library

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds
- **vite**: Development server and build tool

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot reload and error overlay
- **Database**: Neon PostgreSQL with connection pooling
- **Environment Variables**: DATABASE_URL for database connection
- **WebSocket**: Development WebSocket server integrated with Vite

### Production Build
- **Client Build**: Vite production build with optimized bundling
- **Server Build**: esbuild compilation to ES modules
- **Static Assets**: Client build served from Express static middleware
- **Process Management**: Single Node.js process handling both HTTP and WebSocket

### Database Management
- **Schema Migrations**: Drizzle Kit push strategy for schema updates
- **Connection Management**: Serverless PostgreSQL with automatic scaling
- **Data Persistence**: Full ACID compliance with PostgreSQL
- **Backup Strategy**: Handled by Neon's managed service

The architecture prioritizes real-time performance, type safety, and maintainable code while providing a comprehensive trading platform experience. The system is designed to handle multiple concurrent users with real-time data synchronization and AI-powered insights.