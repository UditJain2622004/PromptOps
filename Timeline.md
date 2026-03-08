Weeks 1–2 — Architecture & Tech On-Ramp (Critical Base)
Goals
• Lock the mental model of the product
• Translate PRD into concrete system boundaries
• Learn only the minimum viable stack
• Avoid architectural rewrites later
Work
• Finalize system architecture (gateway, control plane, evaluation pipeline)
• Map domain model → DB schema strategy
• Decide:
o Backend framework
o Database (relational, migrations)
o Redis usage (queues, counters only)
• Set up:
o Monorepo / repo structure
o Linting, formatting
o CI skeleton
• Learn:
o Backend framework basics (NestJS / Fastify)
o PostgreSQL schema & migrations
o Redis fundamentals
• Deploy:
o Hello-world backend
o Basic frontend shell
Deliverables
• Architecture diagram (text or draw.io)
• Running backend + frontend skeleton
• Auth placeholder (mocked)
🧠 Learning focus: system boundaries, infra fundamentals
🛑 Do NOT build features yet

Weeks 3–4 — Core Domain & Multi-Tenancy Foundation
Goals
• Rock-solid core entities
• Product-first data modeling
• No AI logic yet
Work
• Implement:
o Workspace / Project (multi-tenant boundary)
o Basic auth (JWT)
• Core domain entities:
o Agent
o AgentVersion
o EvaluationDefinition
o EvaluationRun (minimal)
• CRUD APIs for:
o Agents
o Agent versions
• Versioning semantics (immutability, metadata)
• Learn:
o RBAC basics
o Versioned entity patterns
o Multi-tenant data isolation

Deliverables
• Agent + AgentVersion fully functional
• Workspace-scoped APIs
• Version history + metadata
🧠 Learning focus: backend architecture, data modeling
🛑 No LLM calls, no evaluation engine yet

Weeks 5–6 — LLM Gateway & Provider Adapter Layer
Goals
• Reliable, centralized LLM invocation
• Enterprise-grade flexibility
Work
• Build LLM Gateway:
o Central interception point
o Metadata injection (agent, version, env)
• Provider Adapter abstraction:
o Public LLM support
o Custom enterprise baseURL support
• Per-workspace provider configuration
• Prompt execution endpoint (via gateway)
• Request/response logging
• Learn:
o Adapter patterns
o HTTP retries & timeouts
o Secure secrets handling
Deliverables
• AgentVersion → LLM → response flow working
• One provider fully integrated via adapter
🧠 Learning focus: integration reliability
🛑 No evaluation logic yet

Weeks 7–8 — Offline Evaluation Engine (Core Reliability)
Goals
• Measure behavior before improving it
• Establish evaluation as a first-class concept
Work
• Evaluation engine (offline only):
o Dataset-based inputs
o Single-turn and simulated multi-turn
• Evaluation execution:
o AgentVersion × EvaluationDefinition
• EvaluationResult storage
• Aggregated reporting (pass/fail, metrics)
• Learn:
o Deterministic evaluation design
o Rule-based metrics
o Batch execution patterns
Deliverables
• Offline evaluation run:
o Multiple agent versions
o Multiple evaluations
• Stored evaluation history + reports
🧠 Learning focus: correctness, evaluation design
🛑 No SDK, no production traffic yet

Weeks 9–10 — Demo Readiness: Proxy Integration, Evaluation & Basic UI
Goals
• Demonstrate easy PromptOps integration in a real agent
• Show basic evaluation workflow (dataset → evaluation → report)
• Provide a minimal UI for agents and evaluation runs

Work
• Proxy integration demo:
o BaseURL proxy route working for provider-native calls
o System instruction injection via AgentVersion
o Required PromptOps headers validation

• Demo agent example:
o Create a small agent project using OpenAI/Anthropic SDK
o Show before/after PromptOps integration (BaseURL change only)

• Basic evaluation pipeline:
o Offline evaluation run (AgentVersion × Dataset × Evaluator)
o Store EvaluationResult records
o Basic evaluation summary (pass/fail counts)

• Production sample capture:
o Log request input/output from proxy traffic
o Store samples for evaluation reuse

• Minimal reporting API:
o Get evaluation run summary
o Get evaluation results per AgentVersion

• Basic UI (minimal but functional):
o Agent list + AgentVersion view
o Run evaluation from UI
o View evaluation report table

• Learn:
o Proxy architecture for BaseURL integration
o Evaluation design basics
o Building minimal product UI for developer tools

Deliverables
• Real agent integrated with PromptOps (BaseURL demo)
• Offline evaluation run across dataset
• Basic evaluation report
• Simple UI showing agents, runs, and results

🧠 Learning focus: developer UX, evaluation workflow, product demonstration
🛑 Heavy infra scaling can wait

---

Weeks 11–12 — Async Processing & Redis Infrastructure
Goals
• Scale evaluation execution safely
• Learn Redis and async processing patterns

Work
• Introduce Redis + job queue (BullMQ or equivalent)
• Move evaluation execution to background workers
• Async evaluation result aggregation
• Sliding-window counters for evaluation metrics
• Idempotent job handling for evaluation runs

• Adapter reliability improvements:
o Timeout handling
o Retry logic for provider failures

• Learn:
o Redis data structures
o Job queues and workers
o Backpressure & retry strategies

Deliverables
• Async evaluation execution pipeline
• Redis-backed job queue
• Reliable evaluation run execution

🧠 Learning focus: infra primitives, async systems
🛑 UI polish can wait

---

Weeks 13–14 — Integrated Evaluation, Canary & Observability
Goals
• Test real agent behavior under production-like traffic
• Add safe rollout mechanics for AgentVersions

Work
• Integrated evaluation mode:
o Tag proxy traffic for evaluation
o Event capture from production requests
o Replay captured requests for testing

• Canary routing:
o Percentage-based AgentVersion routing
o Safe rollout for new system instructions

• Rollback rules:
o Detect evaluation regression
o Automatic rollback trigger

• Observability:
o Request metrics
o Evaluation metrics
o Basic dashboards

• Learn:
o Traffic splitting
o Experiment design
o Rollback strategies

Deliverables
• Integrated evaluation demo using real traffic
• Canary deploy + rollback demo
• Metrics dashboard

🧠 Learning focus: system design, safety mechanisms
🛑 No auto-prompt changes yet

---

Weeks 15 — Prompt Evolution & Stochastic Optimization
Goals
• Implement your unique prompt optimization idea safely

Work
• Failure case surfacing UI
• Generate prompt variants based on failures
• Stochastic evaluation of variants

o Sample 3–5 AgentVersion variants
o Evaluate on same dataset
o Rank and suggest best variant

• Human approval step before new version activation

• Learn:
o Black-box optimization
o Bias & variance trade-offs

Deliverables
• Prompt variant comparison report
• Stochastic prompt optimization demo

🧠 Learning focus: advanced AI systems thinking

---

Week 16 — Safety, Polish & Product Readiness
Goals
• Make the system defensible, demo-ready, and product-credible

Work
• Baseline safety evaluations
• Audit logs & data export
• CI/CD polish
• End-to-end demo scenarios
• Documentation & README

Deliverables
• Final demo system
• Product-grade PRD + architecture docs
• Resume-ready, interview-ready project

🧠 Learning focus: product polish, presentation, reliability
