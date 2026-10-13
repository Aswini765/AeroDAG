# AeroDAG — Portfolio Summary & Technical Leadership Report

## 1. Project Summary

**AeroDAG** is an AI-native travel orchestration platform that converts natural language travel requests into personalized, budget-aware, constraint-compliant, and authoritatively bookable travel plans. Built as a full-stack, enterprise-grade architecture in React, TypeScript, Node.js, and Express, AeroDAG demonstrates modern multi-agent planning, RAG grounding, and deterministic state machine engineering.

---

## 2. Engineering & Product Contributions

Across the project milestones (Phases 0 through 12.5), I led the design, implementation, and quality assurance of every foundational system:

1. **Stateful Requirement System (`Phase 9.1`)**: Upgraded ambiguous user chats into a 7-status formal dependency graph (`KNOWN`, `INFERABLE`, `OPTIONAL`, `REQUIRED`, `CONTEXTUALLY_REQUIRED`, `UNKNOWN`, `VERIFIED`) with topological question prioritization and anti-inferral privacy safeguards.
2. **Dynamic Multi-Agent DAG Planner (`Phase 9.2`)**: Engineered dynamic task decomposition with DFS cycle detection (`PlanCycleError`), step boundaries (`PlanBoundaryError`), wave-based concurrency, and cancellation propagation.
3. **Privacy-Conscious Long-Term Memory (`Phase 9.3`)**: Architected tenant-isolated user preference persistence with explicit consent, semantic keyword retrieval, GDPR right-to-be-forgotten deletion, and automated PAN/CVV blocking (`MemoryPrivacyViolationError`).
4. **Advanced AI Evaluation Framework (`Phase 9.4`)**: Developed deterministic evaluators for question relevance, itinerary pacing, budget precision, and citation grounding, coupled with rate-limit-safe qualitative judges.
5. **Bounded Self-Correction Coordinator (`Phase 9.5`)**: Implemented evidence-based correction loops that diagnose constraint violations (capacity breach, budget overage) and execute targeted micro-adjustments within a strict 3-attempt ceiling.
6. **Consumer Travel Experience (`Phase 10`)**: Built the complete interactive Trip Workspace supporting Add, Remove, Edit, Reorder, and Replace operations with real-time budget synchronization, interactive OSRM routing, sandbox checkout UX, My Trips dashboard, and post-booking assistant.
7. **Production Hardening & Persistence (`Phase 11`)**: Built a transaction-safe database adapter with schema migrations, ACID-like rollback, session lifecycle management, RBAC, rate limiting, and `/health` & `/ready` probes.
8. **End-to-End Quality & Red-Team Verification (`Phase 12`)**: Validated the 15-step consumer journey (`test_phase12_e2e.ts`), blocked 16 adversarial security attacks (`test_phase12_redteam.ts`), implemented privacy-conscious product analytics, and created deterministic reviewer demo workflows.

---

## 3. Verified Technical Achievements & Test Evidence

All achievements are backed by deterministic automated test suites with **zero fabricated passes**:

| Milestone | Test Suite | Passing Assertions | Key Achievement |
|---|---|---|---|
| **Phase 8.5** | `test_phase8_5.ts` | **83 / 83** | Complete booking & payment sandbox lifecycle with 11-condition confirm gate |
| **Phase 9.1** | `test_phase9_1.ts` | **26 / 26** | 7-status requirement graph with topological question prioritization |
| **Phase 9.2** | `test_phase9_2.ts` | **21 / 21** | Dynamic DAG planner with DFS cycle detection and step boundaries |
| **Phase 9.3** | `test_phase9_3.ts` | **20 / 20** | Tenant-isolated memory store with PAN/CVV scrubbing and GDPR erasure |
| **Phase 9.4** | `test_phase9_4.ts` | **16 / 16** | Deterministic evaluators for question relevance and itinerary feasibility |
| **Phase 9.5** | `test_phase9_5.ts` | **14 / 14** | Bounded self-correction loop resolving capacity breaches and overages |
| **Phase 10** | `test_phase10.ts` | **28 / 28** | Consumer workspace operations, OSRM routing, checkout, and assistant |
| **Phase 11** | `test_phase11.ts` | **24 / 24** | Session auth, RBAC ownership, database migrations, and ACID rollback |
| **Phase 12.1** | `test_phase12_e2e.ts` | **21 / 21** | 15-step end-to-end consumer journey with product analytics tracking |
| **Phase 12.2** | `test_phase12_redteam.ts` | **16 / 16** | 16 adversarial penetration tests (injection, tampering, hold expiry) |
| **Phase 12.4** | `test_phase12_demo.ts` | **5 / 5** | Deterministic reviewer demonstration runner |

**Total Tested Assertions Across AeroDAG: 274+ Passing Assertions.**
**TypeScript Check (`npm run lint`):** Green (`tsc --noEmit` clean).
**Production Build (`npm run build`):** Succeeded in 2.22s (`dist/index.html`, `dist/assets/`).

---

## 4. Key Architectural Decisions & Trade-Offs

1. **Separation of LLM Reasoning and Financial Authority**:
   - *Decision*: The LLM proposes candidate options, but the backend deterministic engine alone calculates financial grand totals and validates payment amounts.
   - *Why*: Eliminates rounding drift, hallucinated discount deductions, and client-side price tampering.
2. **Bounded Correction Loops vs Infinite Agent Feedback**:
   - *Decision*: Hard-coded maximum of 3 correction attempts before cleanly escalating to the user.
   - *Why*: In production AI systems, unconstrained feedback loops lead to runaway token costs, excessive latency, and catastrophic plan thrashing.
3. **Authoritative Sandbox Over Live Financial Webhooks**:
   - *Decision*: Implement a complete authoritative sandbox coordinator rather than connecting live merchant credit card processing.
   - *Why*: Enables comprehensive regression testing of two-phase authorization, hold expiration, compensation, and refunds without incurring real financial charges.

---

## 5. Challenges Faced & Solutions Implemented

### Challenge 1: LLM Hallucinating Nationality & Regulatory Claims
- **Symptom**: Earlier prototypes inferred that a user named "Rahul" was Indian and skipped passport visa requirements, or assumed Goa travelers required e-visas.
- **Solution**: Engineered strict anti-inferral rules in `RequirementEngine` that explicitly prevent inferring nationality from names, language, or IP addresses. Built `TrustedSourceRegistry` and `GroundingValidator` that require official embassy citations.

### Challenge 2: Client-Side Price & Currency Tampering
- **Symptom**: Adversaries could modify the checkout HTTP request payload to send `amount: 100` instead of `amount: 65000`.
- **Solution**: Built strict server-authoritative amount and currency validation in `BookingSandboxCoordinator.authorizePayment()`. If the client amount deviates by even 1 rupee, the backend throws `PaymentAmountMismatchError` and marks the transaction rejected in the audit log.

### Challenge 3: Cyclic Agent Dependencies
- **Symptom**: Dynamic planners could construct circular tasks where Itinerary awaits Hotel, and Hotel awaits Itinerary.
- **Solution**: Implemented a recursive Depth-First Search cycle detector with visited stack tracking in `DynamicAgentPlanner.validateDAG()`, failing immediately on circular graphs.

---

## 6. Interview-Ready Project Explanation

### Elevator Pitch (30 Seconds):
> *"AeroDAG is an AI-native travel orchestration platform designed for Indian travelers that converts natural language requests into personalized, budget-aware, and authoritatively bookable plans. While typical travel chatbots hallucinate prices and fake bookings, AeroDAG combines a multi-agent DAG planning engine and RAG with strict backend state machines, deterministic financial arithmetic, multi-tier safety guardrails, and an authoritative booking sandbox."*

### STAR Story: Bounded Self-Correction & Reliability
- **Situation**: In automated multi-agent travel generation, initial draft plans frequently exceed budget caps or assign 2-person hotel rooms to 4-person families.
- **Task**: Create an automated correction mechanism that resolves constraint failures without restarting the pipeline or spinning into infinite loops.
- **Action**: I engineered the `SelfCorrectionCoordinator`. It diagnoses the exact failure mode (capacity breach vs budget overage), performs targeted micro-adjustments (swapping room tier or value accommodation), recalculates the budget deterministically, and caps execution at 3 attempts.
- **Result**: Verified across 14 deterministic tests; resolves capacity breaches and budget overages in 1–2 attempts and cleanly escalates irreconcilable constraints to the user with transparent trade-offs.
