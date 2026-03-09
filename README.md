# floework — Human-Aware SaaS Productivity & Team Collaboration Platform

![floework Hero Page](./assets/hero_page.png)

---

## 1. Introduction

### 1.1 Background
Modern software teams rely on multiple tools for managing work and collaboration. Commonly used platforms include tools for documentation and planning, team communication, task tracking, and time logging. While each tool is effective in isolation, their combined usage introduces fragmentation across focus, execution, and visibility.

Teams commonly experience:
- Excessive context switching
- Invisible individual effort
- Burnout caused by misaligned expectations
- Lack of causal linkage between work done and outcomes delivered

This project proposes a single integrated SaaS platform — **floework** — that unifies task execution, collaboration, and personal productivity, with a core focus on human cognitive limits and sustainable execution.

---

### 1.2 Problem Statement
Existing productivity systems optimize for process tracking and managerial visibility, but fail to capture:
- Focus quality
- Cognitive cost of interruptions
- Relationship between effort and task completion

As a result, teams often:
- Work harder without shipping faster
- Misinterpret delays as inefficiency
- Increase pressure, leading to burnout

**Problem Definition**
To design and implement a scalable SaaS-based web platform that directly links focused individual work with team-level task progress, providing actionable insights without invasive monitoring.

---

### 1.3 Objectives
- Reduce context switching through integrated workflows
- Make effort visible without surveillance
- Align personal productivity with team outcomes
- Respect human focus limitations
- Provide real-time, causally meaningful analytics

---

## 2. Comparative Study of Existing Systems

### 2.1 Limitations of Current Tool Stack

| Tool Category | Primary Strength | Structural Limitation |
|---|---|---|
| Documentation & Planning | Knowledge organization | Static, execution-blind |
| Team Communication | Fast coordination | High interruption, low memory |
| Task Tracking | Process visibility | Outcome-only visibility |
| Time Tracking | Effort logging | Manual, context-free |

Despite integrations, these tools do not share a unified execution state.

---

### 2.2 Identified Gap
No existing platform models the full causal chain:

**Focus → Effort → Task Progress → Team Outcome**

This gap forms the foundation of the proposed system.

---

## 3. Proposed System Overview

### 3.1 System Description
floework is a multi-tenant SaaS web platform designed for small to mid-sized technical teams, where:
- Tasks are the anchor unit
- Focus sessions are first-class entities
- Real-time visibility is non-invasive
- Analytics explain why outcomes occur

---

### 3.2 Target Users
- Remote-first development teams (3–15 members)
- Student project and hackathon teams
- Indie developers and startup engineering teams

---

## 4. System Architecture

### 4.1 Architectural Style
- Layered Architecture
- Event-Driven Backend
- Client–Server Model
- Service-Oriented Design

---

### 4.2 High-Level Architecture

**Layers**
1. Frontend Layer
2. Middleware & Validation Layer
3. Backend Services Layer
4. External Services Layer

```text
User Browser
   ↓
Frontend (React)
   ↓
Middleware (Auth, Validation, RBAC)
   ↓
Backend Services (Node.js)
   ↓
PostgreSQL / Redis / WebSockets / Cloud Services
```

---

## 5. Frontend Architecture

### 5.1 Responsibilities
- User authentication and onboarding
- Home dashboard with activity overview
- Task board (FlowBoard) with sprint management
- Focus session interface with post-session logging
- Real-time collaboration updates
- Analytics and narrative productivity insights

---

### 5.2 Technology Stack
- React (Vite, component-based UI)
- Redux Toolkit (state management)
- Tailwind CSS
- Socket.IO Client
- Recharts (data visualization)
- shadcn-ui (component primitives)
- React Router DOM (client-side routing)
- lucide-react (icon system)

---

### 5.3 Component Structure
- Authentication Module (`LoginPage`, `RegisterPage`)
- Onboarding Module (`OnboardingPage`)
- Landing Page (`LandingPage`, `PhilosophyPage`)
- Dashboard Module (`Index` — Home, `BoardsPage` — Task Board)
- Focus Zone (`FocusPage`)
- Analytics Module (`AnalyticsPage`)
- Supporting Pages (`StarredPage`, `MessagesPage`, `ProfilePage`, `AlertsPage`)

---

## 6. Middleware & Validation Layer

### 6.1 Responsibilities
- JWT authentication
- OAuth token validation
- Role-Based Access Control (RBAC)
- Input schema validation
- Subscription enforcement
- Rate limiting and centralized error handling

---

### 6.2 Request Processing Pipeline
1. Authentication verification
2. Role authorization
3. Request validation
4. Subscription check
5. Controller execution

---

## 7. Backend Architecture

### 7.1 Technology Stack
- Node.js
- Express.js
- Socket.IO
- Stripe API
- AWS SDK

---

### 7.2 Core Backend Services
- Authentication & RBAC Service
- Project & Task Service
- Focus Session Engine
- Real-Time Event Service (Socket.IO)
- **Execution Intelligence Service** (Signal computing)
- **Advanced Analytics Service** (Bottlenecks & Burnout)
- **Billing & Subscription Service** (Stripe via webhooks)
- **Background Worker Queue** (BullMQ for async processing)

---

### 7.3 API Design
- RESTful endpoints
- Versioned APIs
- Stateless requests
- JSON-based communication

---

## 8. Database Design

### 8.1 Database Architecture
The system adopts a dual-database architecture:
- **PostgreSQL** as the primary relational database
- **Redis** as an in-memory data store for caching and real-time state

This separation ensures strong consistency for critical data and low-latency access for live system behavior.

---

### 8.2 Primary Database — PostgreSQL
**Role**
- Source of truth for persistent data
- Supports relational integrity and analytical queries

**Stored Data**
- Users and authentication metadata
- Teams and roles
- Projects and tasks
- Historical focus sessions
- Productivity logs
- Subscriptions and payment records

---

### 8.3 In-Memory Store & Message Queue — Redis & BullMQ
**Role**
- Real-time system state
- Low-latency cache aside (15-min TTLs)
- Asynchronous job execution queue

**Used For**
- Active focus sessions and presence indicators
- WebSocket connection mappings
- Background computation of complex analytics (Execution Signals)
- Caching heavy aggregations (`/analytics/narrative`, `/analytics/stability`)

---

### 8.4 Core Entities
- User & Role (Admin / Member)
- Team & Project
- Task (effort tags, focus counts, status)
- FocusSession (duration, interrupts, timestamps)
- ExecutionSignal (effort density, resume rate, blocker risk)
- FocusStabilitySlot (time-bucketed focus scores)
- Subscription (Stripe data, renewal dates)

---

### 8.5 Key Relationships
- One team → many users
- One project → many tasks
- One task → many focus sessions
- One user → many focus sessions
- One user → one subscription

---

## 9. Core SaaS Features

### 9.1 FlowBoard (Task Board)
The FlowBoard is the primary execution interface. Features include:
- **Kanban Board View**: Drag-and-drop task columns (Backlog, In Progress, Review, Done)
- **Calendar View**: Date-anchored task scheduling
- **Task Creation Modal**: Create tasks with title, description, assignees, effort level (S/M/L), and due dates
- **Editable Sprint Name**: Click on the sprint label (e.g., "Sprint 14") to rename it inline
- **Real-time Socket Sync**: Task state changes propagate instantly via WebSocket
- **Task Locking**: Prevents concurrent edits

### 9.2 Task Cards & Detail Panel
Each task card displays:
- Title, status, and assignee avatars
- **Effort Badge** and **Focus Count** (number of sessions run)
- **Start Focus** quick-action
- **TaskExecutionPanel (Slide-over)**: Detailed view showing live *Execution Signals* (Effort Density bar, Resume Rate badge, Blocker Risk) and a real history of individual focus sessions mapped to that task.

### 9.3 Focus Session Engine
- Task-linked focus sessions (each session is anchored to a task)
- Live countdown timer with pause/resume
- **Post-Session Confirmation Screen**: After stopping a session, a confirmation overlay appears showing:
  - Total time elapsed
  - Optional mental offload note ("What did you ship?")
  - "Log Session & Return" CTA
- Session metadata logged to the backend (duration, task ID, user ID, note)

### 9.4 Home Page (Dashboard Overview)
A dedicated Home view (`/dashboard`) separate from the Board:
- Personalized welcome message with the user's first name
- **Recent Activity Table**: Displays team activities with Subject, Status, Start/End dates, and Assigned User
  - Supports **live search filtering** from the top navigation search bar
- **Productivity Chart**: Visual representation of focus time distribution across the week

### 9.5 Execution Intelligence Analytics (`/analytics`)
The platform replaces standard "time tracking" with behavioral signal analysis:
- **Focus Stability Heatmap**: A 7×24 grid showing user's peak focus windows across the week based on historical effort density mapping.
- **Bottleneck Report**: Ranks tasks by composite bottleneck scores (high effort + low progress) and generates plain-English recommendations to unblock them.
- **Burnout Risk Trend**: A 4-week rolling line chart tracking real burnout signals, calculated via average interrupts and daily focus hours.
- **Narrative Insights Panel**: Rule-based (non-LLM) plain-English summaries generating targeted Highlights and Warnings about recent productivity behavior.

### 9.6 Billing & Subscriptions (`/billing`)
Fully integrated Stripe SaaS architecture:
- 3-Tier Plan selection (Free, Pro, Team)
- Create Stripe Checkout Sessions for upgrades.
- Stripe Customer Portal integration for standard subscription management.
- Webhook handling (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`) keeping local database state precisely in sync with Stripe.

### 9.6 Team Presence Avatars
The FlowBoard header displays team member presence with:
- **In Focus** (pulsing blue ring) — actively running a focus session
- **Available** (green dot) — online but not in focus
- **Offline** (grey dot) — not connected

### 9.7 Top Navigation Bar
The `TopHeader` component contains:
- **Global Search**: Filters both FlowBoard tasks and ActivityTable entries in real-time (powered by Redux state)
- **Notifications Bell**: Opens a dropdown with recent alerts and a "View all" link to `/alerts`
- **Profile Chip**: Opens a dropdown with Profile, Settings, and Log Out actions
- Sprint breadcrumb display

### 9.8 Sidebar Navigation
The collapsible icon sidebar links to:
- **Home** (`/dashboard`) — Overview & activity
- **Boards** (`/boards`) — FlowBoard task management
- **Starred** (`/starred`) — Bookmarked items
- **Focus** (`/focus`) — Focus session timer
- **Analytics** (`/analytics`) — Productivity insights
- **Messages** (`/messages`) — Team communication
- **Alerts** (`/alerts`) — Notifications panel (with unread badge)
- **Settings / Profile** (`/profile`)

### 9.9 Starred, Messages, Profile & Alerts Pages
Fully routed support pages:
- **StarredPage**: Bookmarked items
- **MessagesPage**: In-app messaging
- **ProfilePage**: User profile and preferences
- **AlertsPage**: Notification history

---

## 10. Landing Page & Marketing Site

### 10.1 Landing Page (`/`)
A full marketing landing page with:
- **Hero Section**: "Human-Aware Productivity." headline with animated floating team avatars
- **ExecutionCausalityStrip**: An auto-progressing systems diagram illustrating the causal model: Focus State → Effort Signals → Task Progress → Team Outcomes
- **Causal Model Section**: "The Causal Model of Work" — title and explanatory intro
- **Features Bento Grid**: Cards highlighting Deep Work, Async Context, Task Linkage, and Non-Invasive Visibility with mock UI screenshots
- **Competitor Comparison Section** ("Not just another tool. A completely new layer."): Interactive hover cards comparing floework against Jira, Slack, and Notion
- **Pricing Section**: Free plan highlighted, with a "Start Now" CTA
- **Navigation Bar**: Links to Philosophy, Features, Pricing (smooth scroll), Log In, and Start Now

### 10.2 Philosophy Page (`/philosophy`)
A blog-style page derived from the project's origin story and core design philosophy:
- Background on the cognitive cost of context switching
- floework's causal model of work explanation
- System design principles (privacy-first, async-friendly, task-anchored)

---

## 11. Onboarding Flow (`/onboarding`)

A 3-step animated onboarding experience:
1. **How will you execute?** — Select use case: Individual Contributor, Technical Team, or Student Project (with contextual sub-copy)
2. **Got a crew?** — Option to join an existing workspace or start fresh
3. **Name your space** — Create a workspace with a centered, large-format input

Each step features staggered `animate-in` slide-up transitions, border-highlight selection states, and context-aware marketing copy that reinforces floework's value proposition.

---

## 12. Authentication

### 12.1 Supported Auth Methods
- Email/Password registration and login
- JWT-based session management
- Role-based access control

### 12.2 Route Protection
- `ProtectedRoute` guards all `/dashboard`, `/boards`, `/focus`, and other app routes
- Unprotected routes: `/`, `/login`, `/register`, `/philosophy`

---

## 13. Real-Time Collaboration

### 13.1 WebSocket-Based Updates
- Task state changes broadcast via Socket.IO
- Focus session presence sync
- Project activity feeds

### 13.2 Team Awareness Features
- "In focus" indicators on team avatars
- Non-intrusive status visibility
- Async-friendly collaboration model

---

## 14. Security Design

### 14.1 Authentication & Authorization
- JWT-based authentication with expiration
- Secure refresh token handling
- Role-based permission enforcement

### 14.2 Data Protection
- HTTPS enforced across all services
- Encryption of sensitive fields at rest
- Secure cloud storage access policies

---

## 15. Deployment & DevOps

### 15.1 Cloud Infrastructure
The platform is deployed on AWS, initially leveraging free-tier resources for development and evaluation.

### 15.2 Deployment Strategy
- **Frontend**: Static build hosted on object storage and CDN
- **Backend**: Containerized Node.js services
- **Database**: Managed PostgreSQL instance
- **Cache**: Redis hosted on compute instance

### 15.3 CI/CD Pipeline
- Source control–triggered builds
- Automated testing and linting
- Container image creation
- Continuous deployment to cloud infrastructure

### 15.4 Scalability Path
- Redis → Managed in-memory cache service
- Single-instance backend → Container orchestration
- Database → Multi-AZ PostgreSQL with read replicas

---

## 16. Testing Strategy

| Test Type | Scope |
|---|---|
| Unit Testing | Business logic |
| Integration Testing | API and database |
| End-to-End Testing | User workflows |
| Load Testing | Concurrent usage scenarios |

---

## 17. Limitations
- Not designed for large enterprise organizations
- Focused primarily on technical teams
- Relies on user honesty for focus session usage

---

## 18. Future Enhancements
- AI-based task summarization and smart scheduling
- Intelligent workload prediction
- Team productivity benchmarking
- Mobile application support
- GitHub/Linear integration for commit-to-task linking
- Calendar integrations (Google Calendar, Outlook)

---

## 19. Conclusion
floework addresses a structural gap in modern productivity systems by integrating:
- Task execution
- Human focus awareness
- Real-time collaboration
- Outcome-driven analytics

Unlike fragmented toolchains, the system models causality between effort and delivery, enabling healthier, more predictable team performance.

The project demonstrates strong system design capability, real-world problem understanding, and beyond-syllabus engineering depth suitable for academic evaluation, technical interviews, and portfolio presentation.
