# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Environment variables configured
- SSL certificate for production

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure all required environment variables:
   ```bash
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:password@host:5432/database
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
   SESSION_SECRET=your-session-secret-minimum-32-chars
   LOG_LEVEL=INFO
   ```

## Build Process

```bash
# Install dependencies
npm ci --production=false

# Run tests
npm run test:run

# Build the application
npm run build

# Start production server
npm start
```

## Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

USER node

CMD ["npm", "start"]
```

## Database Setup

1. Create PostgreSQL database
2. Run migrations:
   ```bash
   npm run db:push
   ```

## Security Checklist

- [ ] Environment variables are set
- [ ] Database uses secure credentials
- [ ] SSL/TLS is configured
- [ ] Firewall rules are configured
- [ ] Log monitoring is set up
- [ ] Backup strategy is implemented
- [ ] Security headers are enabled
- [ ] Rate limiting is configured

## Health Checks

The application provides these endpoints for monitoring:

- `GET /api/workers/status` - Worker queue health
- `GET /api/dashboard` - Application health

## Performance Tuning

### Database

- Configure connection pooling
- Set up read replicas if needed
- Monitor query performance
- Set up database indexing

### Application

- Enable gzip compression
- Configure caching headers
- Monitor memory usage
- Set up horizontal scaling if needed

## Monitoring

Set up monitoring for:

- Application logs
- Database performance
- API response times
- WebSocket connections
- Memory and CPU usage
- Error rates

## Backup Strategy

1. Database backups (daily/weekly)
2. Application configuration backups
3. Log file archival
4. Test restore procedures regularly

## Troubleshooting

### Common Issues

1. **JWT_SECRET not set**
   - Application will exit on startup
   - Set the JWT_SECRET environment variable

2. **Database connection failed**
   - Check DATABASE_URL format
   - Verify database is running and accessible

3. **Port already in use**
   - Change PORT environment variable
   - Check for conflicting services

4. **WebSocket connection issues**
   - Verify proxy configuration
   - Check firewall settings for WebSocket protocol
