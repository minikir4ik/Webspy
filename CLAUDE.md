# WebSpy — Competitor Monitoring for Online Sellers

## Stack
- Next.js 14+ (App Router, TypeScript)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + shadcn/ui
- Recharts (charts)
- Resend (email alerts)
- Stripe (payments)
- Trigger.dev (background jobs)

## Supabase
- Project URL: https://pbjupfewvrxozjjdklsp.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBianVwZmV3dnJ4b3pqamRrbHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDQxODgsImV4cCI6MjA4NzY4MDE4OH0.S5I3YC5QN85YQZCeAaCx5TihUkKheN9oGbKTwMn2oag

## GitHub
- Repo: https://github.com/minikir4ik/Webspy.git

## Architecture
- Next.js App Router with (auth) and (dashboard) route groups
- Supabase Auth with email/password
- RLS policies so users only see their own data
- Background workers check tracked URLs on schedule
- Scraping: Shopify /products.json (free), Keepa API (Amazon), ScraperAPI (generic)
- Alerts evaluated after each price check, sent via Resend

## Database
- Schema: supabase/migrations/001_initial_schema.sql (run manually in Supabase SQL Editor)
- Tables: profiles, projects, tracked_products, price_checks, alert_rules, alert_history
- RLS enabled on all tables — users only see their own data
- TypeScript types: src/lib/types/database.ts
- Auto-creates profile on signup via trigger on auth.users

## Key Conventions
- All components in /src/components
- All lib/utilities in /src/lib
- API routes in /src/app/api
- Use server actions for mutations where possible
- shadcn/ui for all UI components
- Always use TypeScript strict mode
