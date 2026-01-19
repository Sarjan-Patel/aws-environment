# Project Demo: FinOps AI Platform

A demonstration project for an AI-powered cloud cost optimization platform.

## Repository Structure

```
project-demo/
├── aws-environment/          # Simulated AWS cloud environment (data source)
│   ├── supabase/             # Supabase configuration
│   │   ├── functions/        # Edge Functions (drift-tick)
│   │   └── migrations/       # Database schema
│   ├── scripts/              # Seed scripts
│   └── docs/                 # AWS Environment documentation
│
├── agentic-ai-platform/      # AI-powered dashboard (Next.js)
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities and services
│   └── hooks/                # React hooks
│
└── plans/                    # Implementation plans (shared)
```

## Projects

### 1. AWS Environment (`/aws-environment`)

A simulated AWS cloud environment using Supabase. Contains:
- Database schema for AWS resources (instances, S3, RDS, etc.)
- `drift-tick` Edge Function that simulates realistic cloud activity
- Seed scripts for initial data population

**Setup:**
```bash
cd aws-environment
npm install
# Configure .env with Supabase credentials
npm run seed
```

### 2. Agentic AI Platform (`/agentic-ai-platform`)

Next.js dashboard that connects to the AWS Environment to:
- Monitor cloud resources in real-time (Mode 1)
- Automatically optimize non-production resources (Mode 2)
- Provide recommendations for production resources (Mode 3)

**Setup:**
```bash
cd agentic-ai-platform
npm install
# Configure .env with connection settings
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AGENTIC AI PLATFORM                                       │
│                    (Next.js + Vercel)                                        │
│                                                                              │
│   Dashboard UI ─── Agent Brain ─── AI Reasoning (Claude)                    │
│                                                                              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ Supabase Client
                                   │ (Connection configured by user)
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AWS ENVIRONMENT                                           │
│                    (Supabase)                                                │
│                                                                              │
│   drift-tick (simulator) ─── PostgreSQL (resource data)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Connection

The Agentic AI Platform does NOT directly call the AWS Environment. Instead:

1. User provides Supabase URL and Anon Key on the setup page
2. Platform connects using the Supabase JS client
3. All data flows through this user-configured connection

## Documentation

- [Implementation Plan](./plans/agentic-ai-infrastructure.md)
- [Drift Engine Architecture](./aws-environment/docs/drift-engine-architecture.md)
- [Agent Modes Mapping](./aws-environment/docs/agent-modes-mapping.md)
- [Database Schema](./aws-environment/docs/database-schema-optimization-guide.md)

## License

Private - Demo Project
