#!/bin/bash
# Database Migration Script for Render
# This script pushes the Drizzle schema to the PostgreSQL database

echo "🚀 Starting database migration..."
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Run Drizzle migration
echo "📦 Running pnpm db:push..."
pnpm db:push

if [ $? -eq 0 ]; then
  echo ""
  echo "=================================="
  echo "✅ Database migration completed successfully!"
  echo "=================================="
else
  echo ""
  echo "=================================="
  echo "❌ Database migration failed!"
  echo "=================================="
  exit 1
fi
