# Deployment Guide - Database Management

This guide explains how to deploy your app and manage the database when moving from local development to production.

## Overview

Your app uses:
- **Prisma ORM** for database management
- **PostgreSQL** database
- **Migrations** to manage schema changes

## 1. Choosing a Database Hosting Provider

### Popular PostgreSQL Hosting Options:

#### **Free Tier Options:**
1. **Supabase** (https://supabase.com/)
   - Free tier: 500MB database
   - Easy setup, includes dashboard
   - Connection string: Provided in project settings

2. **Neon** (https://neon.tech/)
   - Free tier: 0.5GB storage
   - Serverless PostgreSQL
   - Good for scaling

3. **Railway** (https://railway.app/)
   - Free tier: $5 credit/month
   - Easy PostgreSQL setup
   - Good for full-stack deployment

4. **Render** (https://render.com/)
   - Free tier available
   - PostgreSQL and backend hosting
   - Simple setup

#### **Paid Options (Recommended for Production):**
1. **AWS RDS** - More control, enterprise-grade
2. **Google Cloud SQL** - Scalable, integrates well
3. **DigitalOcean Managed Databases** - Simple pricing
4. **Heroku Postgres** - Popular, reliable

## 2. Setting Up Remote Database

### Example: Using Supabase (Free)

1. **Create a Supabase account** and project
2. **Get your connection string:**
   - Go to Project Settings → Database
   - Copy the "Connection string" under "Connection pooling"
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true`

3. **Update your production environment variable:**
   ```env
   DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true"
   ```

### Example: Using Neon (Free)

1. **Create a Neon account** and project
2. **Get your connection string:**
   - Copy from dashboard
   - Format: `postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

3. **Set production DATABASE_URL:**
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
   ```

## 3. Managing Database Migrations

### In Development (Local):

```bash
# Create a new migration after schema changes
cd backend
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy
```

### In Production:

**IMPORTANT:** Use `prisma migrate deploy` in production, NOT `prisma migrate dev`

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-connection-string"

# Deploy migrations (applies pending migrations)
npx prisma migrate deploy

# Generate Prisma Client (if needed)
npx prisma generate
```

### Migration Workflow:

1. **Develop locally** with schema changes
2. **Create migration:** `npx prisma migrate dev --name descriptive_name`
3. **Test migration locally:** The `migrate dev` command applies it automatically
4. **Commit migration files** to git (they're in `backend/prisma/migrations/`)
5. **In production:** Run `npx prisma migrate deploy` to apply pending migrations

## 4. Deploying Backend with Database

### Option A: Deploy Script (Recommended)

Create `backend/deploy.sh`:

```bash
#!/bin/bash
# Exit on error
set -e

echo "Installing dependencies..."
npm install

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
npm start
```

### Option B: Update package.json

Add a deploy script to `backend/package.json`:

```json
{
  "scripts": {
    "deploy": "prisma generate && prisma migrate deploy && npm start",
    "postinstall": "prisma generate"
  }
}
```

Then in your deployment platform, use: `npm run deploy`

## 5. Environment Variables for Deployment

### Required Environment Variables:

**Backend (.env in production):**
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
JWT_SECRET="your-jwt-secret-key-minimum-32-characters"
PORT=4000
NODE_ENV=production
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-backend-domain.com
```

### Setting Environment Variables:

#### **Railway:**
- Add variables in project settings → Variables

#### **Render:**
- Add in Environment Variables section

#### **Vercel/Netlify (Frontend):**
- Add in project settings → Environment Variables

#### **Heroku:**
```bash
heroku config:set DATABASE_URL="your-connection-string"
heroku config:set JWT_SECRET="your-secret"
```

## 6. Database Migration Best Practices

### ✅ DO:
- Always test migrations locally first
- Use descriptive migration names: `add_user_email_index`, `update_shift_status`
- Keep migration files in version control
- Run `prisma migrate deploy` in production (not `dev`)
- Backup database before major migrations in production

### ❌ DON'T:
- Don't edit existing migration files after they've been applied
- Don't use `prisma migrate dev` in production
- Don't run migrations manually in production database
- Don't delete migration files once applied to production

## 7. Database Backup & Rollback

### Backup Before Major Changes:

```bash
# Using pg_dump (if available)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use your hosting provider's backup feature
# - Supabase: Automatic daily backups
# - Neon: Point-in-time restore
# - Railway: Manual snapshots
```

### Rollback Migration (Emergency):

If you need to rollback:

```bash
# 1. Restore from backup (recommended)
# 2. Or create a new migration to undo changes
npx prisma migrate dev --name rollback_previous_change
```

## 8. Common Deployment Platforms

### Full-Stack Deployment Options:

#### **Railway** (Recommended for simplicity)
1. Connect GitHub repo
2. Create PostgreSQL service
3. Backend service will auto-detect DATABASE_URL
4. Run migrations in deployment command:
   ```
   npx prisma migrate deploy && npm start
   ```

#### **Render**
1. Create PostgreSQL database
2. Create Web Service for backend
3. Set DATABASE_URL from database connection string
4. Add build command: `npm install && npx prisma generate`
5. Add start command: `npx prisma migrate deploy && npm start`

#### **Vercel/Netlify** (Frontend only)
- Deploy frontend, connect to backend API
- Set VITE_API_URL in environment variables

## 9. Migration Checklist

Before deploying to production:

- [ ] Test all migrations locally
- [ ] Backup production database (if existing)
- [ ] Set DATABASE_URL environment variable in hosting platform
- [ ] Verify Prisma Client generation in build process
- [ ] Run `npx prisma migrate deploy` on first deployment
- [ ] Test database connection after deployment
- [ ] Monitor for errors in production logs

## 10. Troubleshooting

### "Migration failed" error:
- Check DATABASE_URL is correct
- Verify database user has migration permissions
- Check for connection issues (firewall, SSL)

### "Prisma Client not generated":
- Add `npx prisma generate` to build step
- Or use `postinstall` script in package.json

### Connection timeout:
- Use connection pooling URL if available (Supabase, Neon)
- Check database firewall settings
- Verify SSL mode if required

## Example: Complete Deployment Flow

```bash
# 1. Make schema changes locally
# Edit backend/prisma/schema.prisma

# 2. Create migration
cd backend
npx prisma migrate dev --name add_new_feature

# 3. Test locally
npm run dev

# 4. Commit changes (including migration files)
git add prisma/migrations/
git commit -m "Add new feature with migration"
git push

# 5. In production/hosting platform:
# - Environment variables are already set
# - Deployment runs: npm install
# - Then: npx prisma migrate deploy
# - Then: npm start

# Migration will be applied automatically on deployment!
```

---

## Quick Reference

```bash
# Development
npx prisma migrate dev          # Create and apply migration
npx prisma migrate dev --create-only  # Create migration only

# Production
npx prisma migrate deploy       # Apply pending migrations
npx prisma generate            # Generate Prisma Client

# Status
npx prisma migrate status      # Check migration status
```

For more details, see: https://www.prisma.io/docs/concepts/components/prisma-migrate
