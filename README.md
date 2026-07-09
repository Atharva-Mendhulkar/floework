# floework

A human-aware SaaS productivity and team collaboration platform. floework aligns individual focus with team outcomes by integrating task execution, real-time collaboration, and actionable analytics—without invasive monitoring.

![floework Hero Page](./assets/hero_page.png)

## Key Features

- **FlowBoard**: Advanced Kanban board with `dnd-kit` drag-and-drop support and real-time state synchronization via Supabase.
- **Sprint Management**: Robust project scoping with automated sprint naming, custom name overrides, and backlog integration.
- **AI Execution Narrative**: Intelligent executive summaries powered by **Gemini 1.5 Flash**, with a specialized caching layer for high-performance dashboard insights.
- **Focus Engine**: Deep focus session tracking with effort analysis and real-time "In Focus" team presence indicators.
- **Analytics & Export**: 
  - **Focus Distribution**: Visual breakdown of task statuses using Recharts.
  - **Data Portability**: Integrated Excel (CSV) export and Calendar (ICS) sync for all activities and analytics.
- **Premium UX**: Modern glassmorphism design with orchestrated reveal animations and a deterministic avatar system.

## Enterprise Architecture

Floework employs robust distributed systems patterns to ensure enterprise-grade reliability and observability:

- **Observability & Telemetry**: Comprehensive `@opentelemetry/api` distributed tracing and a `prom-client` metrics endpoint for Grafana. Includes a custom frontend `NetworkDiagnostics` service tracking RTT, DNS, and TLS latency.
- **Resilience Engineering**: A custom WebSocket `ConnectionManager` with exponential backoff/heartbeats, strict `opossum` Circuit Breakers wrapping external AI calls, and event backpressure management via batched queues.
- **Distributed Consistency**: Integrated Upstash Redis for high-speed caching and `X-Idempotency-Key` validation to prevent duplicate records during network retries.
- **Backend-For-Frontend (BFF)**: An API Gateway pattern routing complex aggregated queries to a dedicated Supabase Read Replica while reserving the primary DB node for mutations.
- **Event Streaming**: Heavy background computations are decoupled into asynchronous workers orchestrated via a Kafka message broker (`kafkajs`).

## Tech Stack

- **Frontend**: React (Vite), Redux Toolkit (RTK Query), Tailwind CSS.
- **Backend**: Vercel Serverless Functions (Node.js/TypeScript), Google Gemini AI API, Kafka, Redis.
- **Database & Auth**: PostgreSQL (Supabase) with Row Level Security (RLS) and Realtime subscriptions.
- **Storage**: Supabase Storage for secure profile asset management.

## Project Structure

```text
floework/
├── api/            # Serverless functions & backend endpoints
├── apps/web/       # Main React frontend application
├── supabase/       # Database migrations, seed data, and configuration
├── docker/         # Containerization scripts and configurations
└── docs/           # Detailed project documentation
```

## Local Development

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Supabase CLI

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy the example environment file and add your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```

3. **Start local database:**
   ```bash
   supabase start
   ```

4. **Run development server:**
   
   For frontend only:
   ```bash
   cd apps/web && npm run dev
   ```
   
   For full stack (including AI features):
   ```bash
   vercel dev
   ```
   The web app will be available at `http://localhost:3000` (Vercel) or `http://localhost:8080` (Vite).

### Database & Storage Setup

Ensure your Supabase instance is correctly configured:

1. **Apply Migrations**: `supabase db push` (or run scripts in `supabase/migrations` manually).
2. **Storage Bucket**: Create a public bucket named `avatars` in the Supabase Storage dashboard to enable profile picture uploads.

## Deployment

The repository is configured for deployment on Vercel.

```bash
vercel --prod
```
*(Ensure Supabase migrations are applied to your production database.)*
