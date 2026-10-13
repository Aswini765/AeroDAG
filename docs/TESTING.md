# AeroDAG — Testing & Quality Assurance Methodology

This document outlines the testing strategy, test inventory, regression procedures, evaluation rubrics, and red-team security verification for AeroDAG.

---

## 1. Testing Philosophy & Invariants

AeroDAG adheres to strict engineering verification standards:
1. **Zero Fabricated Results**: Tests assert real execution results, exact mathematical values, and authoritative state transitions.
2. **Deterministic Baseline**: Core security boundaries, financial totals, state machines, and constraint validators operate deterministically without relying on probabilistic LLM outputs.
3. **Graceful Fallbacks**: When live third-party network APIs or Gemini quota limits are unavailable, tests fall back to recorded deterministic catalogs rather than failing unpredictably.
4. **Non-Negotiable Boundaries**: Backend state machines and database constraints must fail closed upon any unauthorized attempt.

---

## 2. Test Inventory Across Milestones

| Suite File | Milestone / Focus | Assertion Count | Key Verified Behaviors |
|---|---|---|---|
| `test_phase8_5.ts` | Booking & Payment Sandbox | **83 Assertions** | Complete sandbox lifecycle, 11-condition confirm gate, holds, refunds, compensation |
| `test_phase9_1.ts` | Adaptive Requirement Engine | **26 Assertions** | 7-status formal classification, topological priority, nationality anti-inferral |
| `test_phase9_2.ts` | Dynamic Agent Planning | **21 Assertions** | Task decomposition, DFS cycle detection, wave execution, budget boundaries |
| `test_phase9_3.ts` | Persistent Memory | **20 Assertions** | Tenant isolation, explicit consent, PAN/CVV blocking, GDPR erasure |
| `test_phase9_4.ts` | Advanced AI Evaluation | **16 Assertions** | Question relevance evaluator, itinerary feasibility evaluator, golden dataset |
| `test_phase9_5.ts` | Self-Correction & Recovery | **14 Assertions** | Bounded recovery loop (max 3), hotel capacity repair, budget overage swap |
| `test_phase10.ts` | Consumer Travel Experience | **28 Assertions** | Workspace operations (Add/Remove/Edit/Reorder/Replace), maps, booking bridge, assistant |
| `test_phase11.ts` | Production Readiness | **24 Assertions** | Session auth, RBAC ownership, database migrations, ACID rollback, rate limiting |
| `test_phase12_e2e.ts` | End-to-End Primary Journey | **21 Assertions** | 15-step consumer journey, hold expiry, double cancel blocking, product analytics |
| `test_phase12_redteam.ts` | Red-Team Adversarial Tests | **16 Assertions** | Prompt injection, RAG poisoning, tool escalation, client amount tampering, hold expiry gate |
| `test_phase12_demo.ts` | Reviewer Demo Runner | **5 Assertions** | Out-of-the-box reviewer demonstration workflow verification |

**Total Tested Assertions Across Project: 274+ Passing Deterministic Assertions.**

---

## 3. Running Regression Suites

Run all milestone tests in sequence:
```bash
# Phase 8.5 Baseline Regression
npx tsx test_phase8_5.ts

# Phase 9 Intelligence Suite
npx tsx test_phase9_1.ts
npx tsx test_phase9_2.ts
npx tsx test_phase9_3.ts
npx tsx test_phase9_4.ts
npx tsx test_phase9_5.ts

# Phase 10 Consumer Experience Suite
npx tsx test_phase10.ts

# Phase 11 Production Readiness Suite
npx tsx test_phase11.ts

# Phase 12 Final E2E, Red-Team & Demo Suites
npx tsx test_phase12_e2e.ts
npx tsx test_phase12_redteam.ts
npx tsx test_phase12_demo.ts

# Type Check & Production Bundle Build
npm run lint
npm run build
```

---

## 4. Evaluation Methodology (Phase 9.4)

AeroDAG implements a hybrid evaluation framework:

### Deterministic Evaluators:
- **`QuestionRelevanceEvaluator`**: Measures precision of clarification questions. Flags unnecessary questions or illegal inferences of nationality from names or language.
- **`ItineraryFeasibilityEvaluator`**: Asserts non-overlapping time slots, reasonable transit buffers between stops, and walking intensity adherence for seniors.
- **`BudgetEvaluator`**: Verifies exact mathematical equality between component item prices and summary cards.
- **`GroundingEvaluator`**: Validates that regulatory visa claims match trusted document citations.

### Qualitative LLM Judge:
- Structured judge output format: `{ score: 1-5, pass: boolean, reasoning: string }`.
- Candidate outputs are treated as untrusted data.
- The judge is rate-limit aware and skips gracefully when API quotas are constrained.

---

## 5. Red-Team Methodology (Phase 12.2)

The red-team test suite executes adversarial penetration vectors across 16 attack categories:
1. **Prompt Injections & Jailbreaks**: Direct instruction override attempts, DAN personas, developer mode prompts.
2. **Malicious Retrieved Knowledge**: Adversarial instructions embedded inside fake consular documents.
3. **Privilege Escalation**: Standard users attempting to invoke SYSTEM-level tools (`createPayment`, `refundPayment`).
4. **Data Leakage & PII**: Submitting card numbers (PAN), CVVs, and database credentials to storage and logs.
5. **Cross-Tenant Access**: Querying trips or bookings belonging to different users or tenants.
6. **Financial Tampering**: Submitting client-modified amounts (e.g. ₹100 instead of ₹65,000) or tampered currencies.
7. **State Machine Bypasses**: Forging direct confirmation from `SELECTED` state without valid holds or payment authorization.
8. **Expired Inventory Manipulation**: Confirming bookings against holds that have expired past their 15-minute TTL.
9. **Cycle & Recursive Loop DoS**: Generating cyclic task dependencies or exceeding step boundaries.

---

## 6. Known Skipped Tests & Safe Limitations

1. **Live Payment Acquirer Webhook Tests**: Live merchant bank settlement webhooks (e.g. Razorpay capture webhooks) require active external merchant credentials and are safely simulated in the authoritative sandbox coordinator.
2. **Live Third-Party Airline GDS Calls**: Real-world NDC/Amadeus live ticket booking calls require corporate production contracts; tests operate via `MockFlightBookingProvider` to prevent unintended ticket charges.
3. **Live Geocoding Under Rate Limiting**: If OpenStreetMap Nominatim exceeds free rate limits, `RealMapProvider` gracefully falls back to deterministic geographic coordinates.
