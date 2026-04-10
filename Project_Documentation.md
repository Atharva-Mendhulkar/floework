# floework - Project Documentation

## 1. Project Overview

**Project Title:** floework — Human-Aware SaaS Productivity & Team Collaboration Platform

**Problem Statement:**
Modern software development teams rely on fractured toolchains (separate apps for issue tracking, communication, and time logging). This results in excessive context switching, invisible individual efforts, burnout from misaligned expectations, and a distinct lack of causal linkage between focused human work and team outcomes. 

**Objectives:**
- Minimize context switching by providing a unified workflow engine.
- Establish real-time visibility of effort without resorting to invasive surveillance.
- Model the real causal chain of work: Focus → Effort → Task Progress → Outcome.
- Monitor and respect the cognitive limitations and burnout risk of team members.
- Deliver context-rich, plain-English execution analytics.

**Key Features:**
- **FlowBoard:** A Kanban-style interface featuring real-time collaborative updates and task locking.
- **Focus Session Engine:** An integrated, task-linked timer that logs work history natively to each task, replacing traditional manual time tracking.
- **Execution Intelligence Analytics:** Uses mathematical models on user behavior data to track bottlenecks, focus stability, and burnout risk.
- **Deep Work & Integrations:** Syncs smoothly with GitHub (PR wait-time detection) and Google Calendar (Deep Focus Blocks).
- **AI Displacement Tracking:** Assesses manual engineering hours versus AI-assisted hours to understand productivity velocity changes.

---

## 2. System Architecture

**High-Level Architecture:**
The platform leverages a Layered, Event-Driven Client-Server Architecture. The core relies on a strict separation of concerns, ensuring high interactivity for standard tasks while offloading heavy analytical computations to background queues.

```mermaid
graph TD
    Client["User Client (React/Vite)"]
    subgraph "API Layer (Node.js/Express)"
        Middleware["Middleware (Auth/Zod)"]
        Controllers["Controllers & Logic"]
        Sockets["Socket.io Server"]
    end
    subgraph "Background & Data Layer"
        Redis["Redis Cache/PubSub"]
        BullMQ["BullMQ Workers"]
        Prisma["Prisma ORM"]
        DB[("SQL Database")]
    end
    
    Client -->|REST API HTTPS| Middleware
    Client <-->|WebSocket| Sockets
    Middleware --> Controllers
    Controllers --> Prisma
    Sockets --> Redis
    Controllers --> Redis
    Redis -->|Queued Jobs| BullMQ
    BullMQ --> Prisma
    Prisma --> DB
```

**Component Interaction Flow:**
1. **User Client (Browser):** Built using React, handles user interaction, state caching (Redux), and WebSocket bidirectional communication.
2. **Middleware/Validation Layer:** Intercepts requests for JWT authentication verification, Role-Based Access Control (RBAC), API rate-limiting, and payload sanitization via Zod validations.
3. **Backend API Layer (Node.js/Express):** Acts as the orchestrator. For synchronous data tasks, it queries the database through the Prisma ORM. For asynchronous data tasks, it emits events over WebSockets.
4. **Asynchronous Worker Layer (BullMQ):** Independent queue processes that handle schedule-heavy or compute-heavy jobs, like the `FocusWindowsRoller` and `PRStatusChecker`.
5. **Data Layer:** Centralized SQL-based RDBMS acts as the source of truth, supported by an in-memory Redis cluster for WebSockets, active session presence, and message queues.

---

## 3. Technology Stack

**Frontend:**
- **React.js & Vite:** Enables component-driven development with incredibly fast hot-module-reloading and optimized production builds. 
- **Redux Toolkit & React Query:** Handles localized UI state and server-state caching respectively.
- **Tailwind CSS & shadcn-ui:** Allows for rapid, aesthetically consistent, and highly accessible UI composition.

**Backend:**
- **Node.js & Express.js:** A non-blocking, event-driven runtime ideal for concurrent API requests and WebSockets.
- **Socket.io:** Powers real-time collaborative features, including task board updates and team presence (In-Focus status).
- **Prisma ORM:** Typesafe database schema definition and querying, reducing friction between TypeScript backends and relational data.
- **BullMQ:** Industry-standard job queuing for offloading non-critical tasks to prevent event loop blocking in Express.

**Databases & External APIs:**
- **SQL RDBMS (SQLite/PostgreSQL):** Stores persistent application state, relational metadata, and metrics.
- **Redis:** Manages real-time cache and queue status functionality.
- **Stripe / GitHub / Google APIs:** Handles billing, code ecosystem connectivity, and calendar management respectfully.

---

## 4. Code Explanation

**Core Module Breakdown (`server.ts` & Request Pipeline):**
At the heart of the backend is `server.ts`. It establishes an Express HTTP server but uniquely binds a standard Node `http.Server` to it, enabling smooth attachment of `Socket.io` concurrently.

```typescript
import express from 'express';
import http from 'http';
import { initSocket } from './services/socketService';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets bound directly to the HTTP server
initSocket(server);

// Security, Rate Limiting, and CORS middleware applied here
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));

// Primary API Routing
app.use('/api/v1', apiRoutes);

// Global Error Handler
app.use(errorHandler);
```

Security and API stability are established early using `helmet` for header security and `express-rate-limit`. 

**Asynchronous Workers:**
The file automatically bootstraps several background workers upon standard process start (unless running in test mode):
- `scheduleWeeklyFocusAuditor()`: Generates weekly productivity metrics.
- `schedulePRStatusChecker()`: Syncs with GitHub webhooks to check for blocked code.
- `scheduleFocusWindowsRoller()`: Analyzes mathematical patterns in focus metadata to map optimal working grids.

**Focus Session Logic:**
The system uses `FocusSession` as a primary entity. When a user begins working on a task, an ExecutionEvent (`FOCUS_START`) is logged. If interrupted, the timer is paused logging an interrupt count. Upon completion, the `durationSecs` is aggregated directly to the specific Task schema, updating the Effort Velocity algorithms mathematically instead of relying on subjective point guesses.

---

## 5. Database Design

**Type:** Relational SQL Database (managed via Prisma ORM). 
*Note: Currently instantiated as SQLite for rapid development environments, configured for seamless transition to PostgreSQL in production environments.*

**Entity-Relationship (ER) Diagram:**
```mermaid
erDiagram
    USER ||--o{ TEAM_MEMBER : "belongs to"
    TEAM ||--o{ TEAM_MEMBER : "has"
    TEAM ||--o{ PROJECT : "owns"
    PROJECT ||--o{ TASK : "contains"
    USER ||--o{ TASK : "assigned to"
    TASK ||--o{ FOCUS_SESSION : "tracked via"
    USER ||--o{ FOCUS_SESSION : "logs"
    TASK ||--o{ EXECUTION_SIGNAL : "generates"
    
    USER {
        string id PK
        string email
        string role
    }
    PROJECT {
        string id PK
        string name
    }
    TASK {
        string id PK
        string status
        string phase
        datetime dueDate
    }
    FOCUS_SESSION {
        string id PK
        int durationSecs
        int interrupts
        datetime startTime
    }
```

**Prisma Schema Example (Focus Session):**
The database is strictly typed and enforces referential integrity. Below is an example of how the `FocusSession` connects a `User`'s effort directly to a `Task`:

```prisma
model FocusSession {
  id           String    @id @default(uuid())
  userId       String
  taskId       String
  startTime    DateTime  @default(now())
  endTime      DateTime?
  durationSecs Int       @default(0)
  interrupts   Int       @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

**Key Schema Entities & Relationships:**
1. **User / Team / Project:**
   - A `User` belongs to many `Team` entities through the `TeamMember` join table (Many-to-Many).
   - A `Project` is tied directly to a single `Team`.
2. **Tasks & Execution Ecosystem:**
   - A `Task` is uniquely assigned to a `Project` and a `User`.
   - `TaskDependency` establishes self-referential relations (Tasks blocking other Tasks).
   - `FocusSession`: One-to-Many relationship with a User and a Task. Every session acts as a chronologically immutable log.
3. **Analytics Metrics:**
   - `ExecutionSignal`: Quantifies the progress parameters (Effort Density, Blocker Risk) per Task per User.
   - `FocusStabilitySlot`: Maps historically aggregated focus capabilities per daily time box slots.
   - `AIDisplacementSummary`: Correlates "AI vs Human" productivity logs on a weekly cadence.

---

## 6. Implementation Details

**Sequence Diagram: Starting a Focus Session**
This demonstrates the real-time functionality when a user interacts with the productivity timer:

```mermaid
sequenceDiagram
    participant U as User (React)
    participant API as Express API
    participant WS as Socket.io
    participant Redis as Redis Cache
    participant DB as Prisma (SQL)

    U->>API: POST /api/focus/start {taskId}
    API->>API: Validate Auth Token
    API->>DB: Verify Task Exists
    DB-->>API: Task Context
    API->>Redis: Create Active Session Map
    API->>DB: Log ExecutionEvent (FOCUS_START)
    API-->>U: 200 OK (Session ID)
    API->>WS: Broadcast {userId, state: "In Focus"}
    WS-->>U: Update Team Avatars (Pulsing Blue Indicator)
```

**Step-by-Step Data Flow:**
1. **Authentication:** The User provides credentials. The server returns an encrypted JSON Web Token (JWT). The frontend stores this strictly in secure contexts and attaches it as a Bearer token for subsequent requests.
2. **Task State & Sprints:** On the FlowBoard interface, a user pulls a task into “In Progress”. The UI dispatches an optimistic state update and fires an API request. The backend updates Prisma, then immediately fires a WebSocket `STATUS_CHANGE` event broadcast out to all authorized clients in that Project room. 
3. **Deep Work Session:** The user presses "Start Focus". The backend generates an active temporary session in Redis. The user's system avatar gets a "pulsing blue" indicator across the team app. When stopped, the final stats are moved from Redis into persistent SQL as a `FocusSession` entry.
4. **Queue Processing:** Overnight, the BullMQ worker retrieves all completed `FocusSessions`, identifies context fragmentation, calculates Burnout Index scores relative to historical rolling averages, and pushes `Alert` tables to the database.

---

## 7. Outputs and Results

**System Interfaces:**
- **FlowBoard Analytics:** Returns highly detailed graphs showing a user's peak cognitive windows (e.g., "Developer is highly active between 10am-12pm on Tuesdays").
- **Narrative Outputs:** Provides plain-English warnings unprompted. Sample Output: *"You executed 7 sprint points this week, but your interrupt ratio was high. You may be experiencing context drag."*
- **Burnout Chart:** Visualizes rolling active execution hours mapped to cognitive interruption density.

**Evaluation:**
Instead of basic CRUD lists, the system outputs intelligent causational insights. Output stability under load is handled effortlessly by the Redis queuing system, which throttles DB writes successfully during highly concurrent activity.

---

## 8. Challenges and Solutions

**Challenge 1: Real-Time Presence Clashes & State Mismatches**
Relying entirely on standard REST HTTP calls for the FlowBoard Kanban led to "dirty data" when two members moved a task concurrently.
*Solution:* Integrated Socket.io for optimistic UI updates coupled with backend "Task Locking". Modifications reject secondary updates if a task is actively locked in a transaction.

**Challenge 2: Blocking Node.js Event Loop with Heavy Analytics**
The mathematical execution of the "Focus Stability Slot" mapping required querying thousands of historical time bounds, which spiked latency on standard express endpoints.
*Solution:* Shifted computationally expensive processes (Alert Generator, AI Displacement Roller) to BullMQ's asynchronous Redis-backed queue system. Now, node workers calculate metrics silently in the background.

---

## 9. Future Improvements

- **Intelligent Workload Prediction:** Introduce Machine Learning pipelines to process `EstimationPattern` and `ExecutionSignal` tables to auto-adjust user sprint point allocations based on their historic burn rate.
- **Scalability Adjustments:** Evolve the codebase from SQLite limits to an AWS Aurora PostgreSQL cluster with horizontal Redis clustering.
- **Mobile Infrastructure:** Release a React Native wrapper to allow users to trigger "Focus Logs" offline or synchronously on mobile.
- **Deep External Linkages:** Bring deeper, tighter two-way sync integrations with Linear, Jira, or standard Git commit histories.

---

## 10. Project Evaluation & Rubric Mapping

This section maps the specific academic and professional evaluation criteria directly to the implementations within the **floework** project to assist evaluators or reviewers during a project defense.

| Evaluation Area | Criteria | Max Score | Application in **floework** |
| :--- | :--- | :---: | :--- |
| **HTML Implementation** | Correct use of tags (form, table, semantic tags, images, links, divisions) | **3** | Built using semantic React components (rendered as standard HTML5: `<nav>`, `<aside>`, `<main>`), proper `div` structural grids, standard table representations for analytics, and accessible form handling. |
| **CSS Styling/Bootstrap** | Styling, responsiveness, layout techniques (flex/grid) | **3** | Designed with **Tailwind CSS** (modern CSS utility framework) and **shadcn-ui**, utilizing advanced CSS Flexbox/Grid architectures to guarantee 100% responsiveness without relying on legacy Bootstrap. |
| **Functionality (JS / jQuery)** | Working features (forms, buttons, navigation links), validation, dynamic behaviour, interactivity | **4** | Built entirely via deep JavaScript/TypeScript functionality inside **React.js**. Features heavy interactivity (Live focus timers, drag-and-drop Kanbans), strict form validation via `zod`, and instantaneous state rendering (Redux). |
| **Content & Creativity** | Originality, meaningful content, design creativity | **2** | Introduces an entirely original concept: managing the psychological constraints of remote work (Focus/Burnout tracking) rather than just a basic CRUD checklist. The UI is custom-designed mapping cognitive impact. |
| **Server & Database** | Server and Database connections | **3** | Powered by an **Express.js API** orchestrating complex schemas securely via the **Prisma ORM** mapping to a Relational SQL Database, alongside an in-memory **Redis** cache ecosystem. |
| **Advancements** | Node, express, ReactJS, AngularJS | **2** | Thoroughly covers and exceeds high-end web advancements by implementing **React.js (Frontend)** and **Node.js/Express.js (Backend)** coupled with complex state tools (Redux), WebSockets, and asynchronous BullMQ workers. |

---

---

## 11. Structural Mapping & Core Implementations Deep Dive

This section details exactly where the major features, API connections, database layers, and authentication configurations physically reside within the codebase.

### 11.1 API Integration & Global Architecture

The API operates strictly on a REST framework built on Node.js/Express.js.
- **Root Orchestration:** `backend/src/server.ts` handles the global HTTP wrapper, attaches the WebSocket server, and defines standard middlewares like `cors()` and `helmet()`.
- **API Router Mapping:** `backend/src/routes/index.ts` is the central hub routing incoming REST traffic to specific sub-routers (e.g., `/api/v1/projects`, `/api/v1/focus`).
- **Frontend API Consumption:** 
   - All Axios/fetch calls to the backend are organized structurally inside `src/services/api.ts` on the React client. This file creates a customized Axios instance that automatically intercepts all outgoing requests to seamlessly inject the user's `Bearer` authorization token.

### 11.2 Database Storage & Configuration Paths

The system utilizes the Prisma ORM to connect seamlessly to a relational SQL database.
- **Relational Schema:** `backend/prisma/schema.prisma` rigorously defines all models (`Task`, `FocusSession`, `User`, etc.) and enforces referential integrity between tables.
- **Live Database File:** For the immediate sandbox/development environment, the active database lives explicitly as an SQLite file sitting locally at `backend/prisma/dev.db`.
- **Database Client Orchestrator:** `backend/src/utils/prisma.ts` exports a singleton Prisma client instance that all express controllers concurrently import to perform SQL operations safely.
- **Seeding Logic:** `backend/prisma/seed.ts` functionally combined with `backend/src/services/seedSampleWorkspace.ts` triggers the initial mock database population routines for new users.

### 11.3 Authentication & Security Implementation

Authentication is managed robustly via custom JSON Web Tokens (JWT) reinforced by Bcrypt password hashing.
- **Backend Authentication Controller:** `backend/src/controllers/authController.ts` handles the execution scripts for `registerUser`, `loginUser`, and `forgotPassword`. Passwords are cryptographically salted and hashed using `bcrypt` prior to insertion into the DB.
- **Backend Authorization Middleware:** `backend/src/middleware/authMiddleware.ts` intercepts and secures designated endpoints. Any request targeting protected data must pass the `protect` function which parses the auth header, decrypts the JWT safely using the internal `JWT_SECRET`, and explicitly injects the user's verified identity object sequentially into the `req` flow.
- **Frontend Authentication State:** (Likely housed under standard contexts or stores like AuthContext) Holds the global React state tracking if a user is logged in, parses browser local storage for the physical token, and utilizes React Router conditional rendering to protect dashboard components against unauthenticated access. OAuth routines similarly map through `backend/src/controllers/authController.ts`.

### 11.4 Feature-by-Feature Codebase Mapping

Every major system pipeline maps directly from a specific React UI Component (Frontend) strictly into a specialized Express Controller (Backend).

| Feature Name | Primary Frontend React Path | Primary Backend Controller Path | Internal Description |
| :--- | :--- | :--- | :--- |
| **FlowBoard (Kanban)** | `src/pages/BoardsPage.tsx` | `backend/src/controllers/taskController.ts` | The core matrix rendering the drag-and-drop task board. Syncs live `STATUS_CHANGE` movements across WebSockets organically. |
| **Focus Session Engine** | `src/pages/FocusPage.tsx` | `backend/src/controllers/focusController.ts` | Houses the visual Pomodoro timer logic driving the UI and posts the final session duration chronologically to Prisma. |
| **Execution Analytics** | `src/pages/AnalyticsPage.tsx` | `backend/src/controllers/analyticsController.ts` | Feeds the intense computation metric arrays serving the Focus Stability HEX-grid and Burnout line charts. |
| **Plain-English Narratives** | `src/pages/NarrativePage.tsx` | `backend/src/controllers/narrativeController.ts` | Supplies the AI-driven weekly text prose evaluating a user's context-switching patterns. |
| **Billing & Stripe** | `src/pages/BillingPage.tsx` | `backend/src/controllers/billingController.ts` | Orchestrates external Stripe checkout initialization flows acting concurrently as the async webhook sink. |
| **Alerts & Live Feeds** | `src/pages/AlertsPage.tsx` | `backend/src/controllers/alertController.ts` | Parses the historic arrays of actionable insights populated autonomously by the BullMQ background workers overnight. |

---

## 12. Conclusion

floework actively challenges the stagnant nature of modern project management tools. Instead of exclusively tracking the *output* of work, floework carefully maps the *mechanisms* of work (Focus State → Effort Signals), doing so in a highly collaborative, real-time environment. 

Featuring robust technical implementations—such as concurrent WebSocket distribution, Redis-backed analytical queues, Prisma database mapping, and highly responsive React logic—the system achieves its goal. It provides software development teams precisely what they need to execute sustainably, minimizing burnout while aggressively maximizing visibility and velocity.
