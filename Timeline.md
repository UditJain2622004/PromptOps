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

Weeks 11–12 — Product Features: Proxy Evaluation & Conversation Support
Goals
• Make PromptOps useful during real agent development
• Enable evaluations directly from proxy traffic
• Support realistic agent conversations

Work

• Proxy-triggered evaluation runs:
o Allow triggering evaluation through proxy calls
o Add headers:

x-promptops-eval-run-id

x-promptops-eval-run=true
o When present → attach request/response to evaluation run


• Attach evaluators to agents (always-on evaluation):
o Allow Agent → EvaluationDefinition relationship
o Evaluators automatically run on proxy traffic
o Store EvaluationResult records

• Multi-message conversation support:
o Store conversation history with request samples
o Capture conversation_id from headers or request metadata
o Allow evaluation of multi-turn agent responses

• User-provided provider configuration for evaluation runs:
o Allow passing provider API key and model config when triggering evaluation
o Stop relying on server env variables for evaluation provider calls

• Sample replay for evaluation:
o Allow evaluation runs to reuse captured proxy samples as dataset items

• Evaluation execution abstraction (async-ready design):
o Introduce an EvaluationExecutor layer instead of calling evaluators directly
o Current implementation runs evaluations synchronously
o Future versions can switch executor to queue-based workers without refactoring evaluation services

• Learn:
o Designing developer-facing APIs
o Conversation-aware evaluation design
o Evaluation orchestration patterns

Deliverables
• Proxy-triggered evaluation run working
• Evaluators attached to agents and running automatically
• Multi-message conversation support in proxy and evaluation
• Evaluation runs configurable with user provider credentials

🧠 Learning focus: developer tooling, AI evaluation design
🛑 Heavy infra scaling can wait

Note
• Evaluation execution should be implemented behind an abstraction (e.g., EvaluationExecutor).
• In V1 it runs synchronously, but the abstraction allows later migration to Redis/BullMQ background workers without large refactors.


---

Weeks 13–14 — Product UX: Evaluation Management & Custom Evaluators
Goals
• Make evaluation a first-class product feature
• Allow developers to define their own evaluation logic

Work

• Custom evaluation creation from UI:
o Create EvaluationDefinition via frontend
o Support types:

ContainsString

RegexMatch

JSONSchema

LLM-as-Judge


• Evaluation management features:
o Attach/detach evaluators from agents
o Configure evaluation parameters from UI
o Run evaluation runs from UI

• Dataset management improvements:
o Create datasets from proxy samples
o Import/export dataset JSON
o Attach datasets to agents

• Evaluation reporting improvements:
o Aggregated metrics per AgentVersion
o Failure case listing
o View input/output pair for failed tests

• Prompt version comparison:
o Compare evaluation performance between AgentVersions
o Show pass-rate and failure differences

• Learn:
o Designing developer productivity tools
o Evaluation visualization patterns

Deliverables
• Custom evaluator creation UI
• Evaluation runs triggerable from UI
• Dataset management + sample reuse
• AgentVersion comparison reports

🧠 Learning focus: developer experience, evaluation workflows
🛑 No automated prompt mutation yet


---

Weeks 15 — Prompt Optimization & Evolution
Goals
• Demonstrate automated prompt improvement ideas
• Implement your stochastic optimization concept

Work

• Prompt variant generation:
o Generate multiple AgentVersion variants
o Use prompt perturbations or LLM suggestions

• Stochastic prompt optimization:
o Evaluate variants on the same dataset
o Rank variants by evaluation score

• Failure-case-driven prompt suggestions:
o Identify worst failing samples
o Suggest prompt modifications

• Human approval workflow:
o Allow developer to approve best variant
o Create new AgentVersion from chosen variant

• Learn:
o Prompt optimization strategies
o Reliability vs automation trade-offs

Deliverables
• Stochastic prompt optimization demo
• Prompt variant comparison report
• Human-approved prompt evolution flow

🧠 Learning focus: advanced AI systems thinking


---

Week 16 — Product Polish & Final Demo
Goals
• Make the system feel like a real developer tool
• Deliver a strong demo narrative

Work

• UI polish:
o Agent dashboard
o Evaluation run dashboard
o Sample explorer

• Developer experience improvements:
o Clear integration documentation
o Example agent repositories
o Quick-start scripts

• Demo scenario preparation:
o Agent integration demo
o Evaluation comparison demo
o Prompt improvement demo

• Documentation:
o Final PRD
o Architecture diagrams
o Developer guide

Deliverables
• Fully working PromptOps prototype
• Polished demo with real agent integration
• Product-grade documentation
• Resume-ready, interview-ready project

🧠 Learning focus: product thinking, developer tooling

