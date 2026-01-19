# Supabase Setup Guide

This guide walks you through setting up Supabase as your production database for the SoBol app.

## Step 1: Create a Supabase Account

1. Go to **https://supabase.com/**
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with:
   - GitHub (recommended)
   - Email
   - Google

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Name**: `sobol` (or any name you prefer)
   - **Database Password**: 
     - Generate a strong password (Supabase will suggest one)
     - ⚠️ **SAVE THIS PASSWORD** - you'll need it for the connection string
     - Store it in a password manager
   - **Region**: Choose closest to you (e.g., `US East (North Virginia)`)
   - **Pricing Plan**: Select **"Free"** (good for starting out)

3. Click **"Create new project"**
4. Wait 1-2 minutes for the database to be provisioned

## Step 3: Get Your Database Connection String

1. Once the project is ready, go to **Project Settings** (gear icon on the left sidebar)
2. Click on **"Database"** in the settings menu
3. Scroll down to **"Connection string"** section

### You'll see multiple connection strings:

#### **Option 1: Connection Pooling (Recommended for production)**
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### **Option 2: Direct Connection (For migrations)**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### To get the actual connection string:

1. Click the **"URI"** tab under "Connection string"
2. Copy the **"Connection pooling"** string (Option 1)
3. Replace `[YOUR-PASSWORD]` with the database password you created in Step 2

**Example:**
```
postgresql://postgres.abcdefghijklmnop:your-password-here@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Step 4: Test Connection Locally (Optional)

Test the connection from your local machine:

### Option A: Update local .env (for testing)

1. In `backend/.env`, temporarily update DATABASE_URL:
   ```env
   DATABASE_URL="postgresql://postgres.xxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

2. Test connection:
   ```bash
   cd backend
   npx prisma db pull  # Test connection (won't change anything)
   ```

### Option B: Use Direct Connection for Migrations

For initial migration setup, you might need the direct connection:

```env
# For migrations (direct connection)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## Step 5: Run Your Migrations

Once connected, apply your existing migrations:

### Using Connection Pooling (Recommended):
```bash
cd backend
export DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Generate Prisma Client
npx prisma generate

# Deploy migrations (applies all pending migrations)
npx prisma migrate deploy
```

### Using Direct Connection (For first-time migration):
```bash
cd backend
export DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# Generate Prisma Client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy
```

**Note:** After migrations, switch back to connection pooling for regular use.

## Step 6: Verify Your Database

1. Go back to Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. You should see your tables:
   - `User`
   - `ScheduledShift`
   - `UnavailabilityRule`
   - `_prisma_migrations` (system table)

## Step 7: Set Up for Production Deployment

### Environment Variables to Set:

In your deployment platform (Railway, Render, Vercel, etc.), set:

**Backend:**
```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
JWT_SECRET="your-jwt-secret-here"
NODE_ENV="production"
```

### Deployment Script Example:

In your deployment platform, set the build/start commands:

**Build command:**
```bash
npm install && npx prisma generate
```

**Start command:**
```bash
npx prisma migrate deploy && npm start
```

Or create a deploy script in `backend/package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "deploy": "prisma migrate deploy && npm start"
  }
}
```

## Step 8: Update Backend Package.json (Recommended)

Update your `backend/package.json` to include postinstall script:

```json
{
  "scripts": {
    "dev": "ts-node-dev src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "postinstall": "prisma generate",
    "deploy": "prisma migrate deploy && npm start"
  }
}
```

This ensures Prisma Client is generated on every deployment.

## Step 9: Security Best Practices

### 🔒 Security Settings in Supabase:

1. **API Keys**: Keep your API keys secret
   - Go to **Settings → API**
   - Never commit API keys to git
   - Use environment variables only

2. **Database Password**: 
   - Use a strong password
   - Don't commit it to git
   - Store in password manager

3. **Connection String**:
   - Use connection pooling for production (better performance)
   - Add `?sslmode=require` for extra security (optional)

4. **Row Level Security (RLS)**:
   - Supabase has RLS enabled by default
   - Your Prisma setup bypasses this (uses direct DB access)
   - This is fine for your current setup

## Troubleshooting

### Error: "connection refused" or timeout
- ✅ Check if your IP is allowed (Supabase allows all by default on free tier)
- ✅ Verify the connection string is correct
- ✅ Check if you're using the correct connection (pooling vs direct)

### Error: "password authentication failed"
- ✅ Double-check your database password
- ✅ Make sure you're using the password from Step 2 (project creation)

### Error: "database does not exist"
- ✅ The database name is `postgres` (default)
- ✅ Make sure your connection string ends with `/postgres`

### Migrations not applying
- ✅ Use direct connection for first migration: `db.xxxxx.supabase.co:5432`
- ✅ After migration succeeds, switch to pooling: `pooler.supabase.com:6543`
- ✅ Check migration files exist in `backend/prisma/migrations/`

### "Too many connections" error
- ✅ Use connection pooling URL (port 6543) instead of direct (port 5432)
- ✅ Connection pooling manages connections better

## Quick Reference Commands

```bash
# 1. Get connection string from Supabase dashboard
# Settings → Database → Connection string (URI tab)

# 2. Set environment variable (local testing)
export DATABASE_URL="postgresql://postgres.xxxxx:password@pooler.supabase.com:6543/postgres?pgbouncer=true"

# 3. Generate Prisma Client
cd backend
npx prisma generate

# 4. Apply migrations
npx prisma migrate deploy

# 5. Verify tables created
npx prisma studio  # Opens browser to view database
```

## Next Steps

After setting up Supabase:

1. ✅ Test your app locally with Supabase connection
2. ✅ Deploy backend and set DATABASE_URL in environment variables
3. ✅ Run `prisma migrate deploy` on first deployment
4. ✅ Update frontend API URL to point to deployed backend
5. ✅ Test full stack deployment

## Supabase Dashboard Features

While you're in the Supabase dashboard, check out:

- **Table Editor**: View/edit data visually
- **SQL Editor**: Run custom SQL queries
- **Database**: View connection info, backups
- **Settings**: Configure project settings
- **API Docs**: See auto-generated API documentation (not needed for Prisma)

---

## Summary

1. Create Supabase account → New project
2. Save database password securely
3. Copy connection string from Settings → Database
4. Update DATABASE_URL environment variable
5. Run `npx prisma migrate deploy` to set up tables
6. Deploy with DATABASE_URL set in hosting platform

That's it! Your database is now hosted on Supabase. 🎉
