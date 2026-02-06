
Weeks 1–2 — Architecture & Tech On-Ramp (Critical Base)
Goals
•	Lock the mental model of the product
•	Translate PRD into concrete system boundaries
•	Learn only the minimum viable stack
•	Avoid architectural rewrites later
Work
•	Finalize system architecture (gateway, control plane, evaluation pipeline)
•	Map domain model → DB schema strategy
•	Decide:
o	Backend framework
o	Database (relational, migrations)
o	Redis usage (queues, counters only)
•	Set up:
o	Monorepo / repo structure
o	Linting, formatting
o	CI skeleton
•	Learn:
o	Backend framework basics (NestJS / Fastify)
o	PostgreSQL schema & migrations
o	Redis fundamentals
•	Deploy:
o	Hello-world backend
o	Basic frontend shell
Deliverables
•	Architecture diagram (text or draw.io)
•	Running backend + frontend skeleton
•	Auth placeholder (mocked)
🧠 Learning focus: system boundaries, infra fundamentals
🛑 Do NOT build features yet


Weeks 3–4 — Core Domain & Multi-Tenancy Foundation
Goals
•	Rock-solid core entities
•	Product-first data modeling
•	No AI logic yet
Work
•	Implement:
o	Workspace / Project (multi-tenant boundary)
o	Basic auth (JWT)
•	Core domain entities:
o	Agent
o	AgentVersion
o	EvaluationDefinition
o	EvaluationRun (minimal)
•	CRUD APIs for:
o	Agents
o	Agent versions
•	Versioning semantics (immutability, metadata)
•	Learn:
o	RBAC basics
o	Versioned entity patterns
o	Multi-tenant data isolation

Deliverables
•	Agent + AgentVersion fully functional
•	Workspace-scoped APIs
•	Version history + metadata
🧠 Learning focus: backend architecture, data modeling
🛑 No LLM calls, no evaluation engine yet

Weeks 5–6 — LLM Gateway & Provider Adapter Layer
Goals
•	Reliable, centralized LLM invocation
•	Enterprise-grade flexibility
Work
•	Build LLM Gateway:
o	Central interception point
o	Metadata injection (agent, version, env)
•	Provider Adapter abstraction:
o	Public LLM support
o	Custom enterprise baseURL support
•	Per-workspace provider configuration
•	Prompt execution endpoint (via gateway)
•	Request/response logging
•	Learn:
o	Adapter patterns
o	HTTP retries & timeouts
o	Secure secrets handling
Deliverables
•	AgentVersion → LLM → response flow working
•	One provider fully integrated via adapter
🧠 Learning focus: integration reliability
🛑 No evaluation logic yet

Weeks 7–8 — Offline Evaluation Engine (Core Reliability)
Goals
•	Measure behavior before improving it
•	Establish evaluation as a first-class concept
Work
•	Evaluation engine (offline only):
o	Dataset-based inputs
o	Single-turn and simulated multi-turn
•	Evaluation execution:
o	AgentVersion × EvaluationDefinition
•	EvaluationResult storage
•	Aggregated reporting (pass/fail, metrics)
•	Learn:
o	Deterministic evaluation design
o	Rule-based metrics
o	Batch execution patterns
Deliverables
•	Offline evaluation run:
o	Multiple agent versions
o	Multiple evaluations
•	Stored evaluation history + reports
🧠 Learning focus: correctness, evaluation design
🛑 No SDK, no production traffic yet


Weeks 9–10 — Async Processing & Redis
Goals
•	Scale evaluations safely
•	Learn Redis properly (infra primitives)
Work
•	Introduce Redis + job queue (BullMQ or equivalent)
•	Move offline evaluations to background workers
•	Sliding-window counters for metrics
•	Rate limiting (gateway level)
•	Idempotent job handling
•	Learn:
o	Redis data structures
o	Job queues
o	Backpressure & retries
Deliverables
•	Async evaluation pipeline
•	Redis-backed metrics & counters
🧠 Learning focus: infra primitives, async systems
🛑 UI polish can wait

Weeks 11–12 — Integrated Evaluation, Canary & Observability
Goals
•	Test real multi-turn + tool-calling behavior
•	Enable safe rollout mechanics
Work
•	Integrated evaluation mode:
o	Minimal SDK
o	Test session tagging
o	Event emission only (no execution)
•	Canary routing:
o	Percentage-based AgentVersion routing
•	Rollback rules on evaluation regression
•	Observability:
o	Request metrics
o	Evaluation metrics
o	Basic dashboards
•	Learn:
o	Traffic splitting
o	Experiment design
o	Rollback strategies
Deliverables
•	Integrated evaluation demo (multi-turn, tools)
•	Canary deploy + rollback demo
•	Metrics dashboard
🧠 Learning focus: system design, safety
🛑 No auto-prompt changes yet

Weeks 13–14 — Prompt Evolution (Human-in-the-Loop)
Goals
•	Controlled improvement, not blind automation
Work
•	Failure case surfacing UI
•	Manual prompt suggestion generation
•	Approval workflow:
o	New AgentVersion
o	Canary → rollout
•	Learn:
o	Human-in-loop design
o	Change management patterns
Deliverables
•	Manual prompt improvement loop
•	Versioned, auditable evolution flow
🧠 Learning focus: reliability > automation
🛑 No auto-deploy

Week 15 — Stochastic Optimization (Minimal & Safe)
Goals
•	Implement your unique idea safely
Work
•	Sample 3–5 AgentVersion variants
•	Evaluate on same dataset
•	Rank and suggest best variant
•	One-step optimization only
•	Learn:
o	Black-box optimization
o	Bias & variance trade-offs
Deliverables
•	Stochastic prompt optimization demo
🧠 Learning focus: advanced AI systems thinking

Week 16 — Safety, Polish & Product Readiness
Goals
•	Make it defensible, demo-ready, and product-credible

Work
•	Baseline safety evaluations
•	Audit logs & data export
•	CI/CD polish
•	End-to-end demo scenarios
•	Documentation & README
Deliverables
•	Final demo
•	Product-grade PRD + architecture docs
•	Resume-ready, interview-ready system

