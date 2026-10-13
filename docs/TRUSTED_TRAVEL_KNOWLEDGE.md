# AeroDAG — Trusted Travel Knowledge & Visa Architecture (Phase 8.4)

## 1. Trusted-Source Architecture
AeroDAG separates general travel discovery (hotels, flights, attractions) from legal and border regulatory knowledge (visa rules, passport validity, entry permits). Travel advice allows for flexible exploration, but border regulations demand non-negotiable legal correctness.

AeroDAG implements an authoritative trust hierarchy:
- If a claim cannot be established from a trusted, verifiable, and current official source: **DO NOT GUESS**.
- The system returns `UNKNOWN` or `REQUIRES_VERIFICATION`.
- AeroDAG never fabricates immigration regulations, passport rules, processing times, or fees.

---

## 2. Source Registry
The centralized [TrustedSourceRegistry](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/regulatory/trustedSourceRegistry.ts) controls verified official jurisdictions and hostnames.
- **Server-Controlled**: The registry cannot be mutated or overridden by arbitrary user inputs (e.g. `source=https://malicious-site.example` is strictly rejected).
- **Domain Allowlisting**: Only known authoritative apex domains and specific government prefixes (e.g., `.gov`, `.gov.sg`, `.go.jp`, `.gov.in`, `.gouv.fr`, `.bund.de`, `.gc.ca`, `.gov.au`, `.gov.uk`, `.thaiembassy.org`, `.vfsglobal.com`) are considered for authoritative classification.
- **Jurisdiction Mapping**: Maps destination/transit country ISO codes (`SG`, `JP`, `VN`, `TH`, `DE`, `US`, `GB`, `IN`, `CA`, `AU`, `FR`) to official government immigration portals, foreign affairs ministries, and embassies.

---

## 3. Trust Levels
Sources are classified into deterministic trust categories:
1. `TRUSTED_OFFICIAL`: Official government immigration portals and primary sovereign statutory authorities.
2. `TRUSTED_GOVERNMENT`: Ministries of Foreign Affairs, sovereign departments of state.
3. `TRUSTED_EMBASSY`: Diplomatic missions and official consulates in foreign jurisdictions.
4. `TRUSTED_IMMIGRATION_AUTHORITY`: Border control, federal police, ICA, border security.
5. `TRUSTED_INTERNATIONAL_ORGANIZATION`: IATA Timatic, WHO, ICAO, UN.
6. `TRUSTED_AIRLINE`: Airline operational advisories (useful as secondary operational guidance, but cannot override sovereign immigration rules).
7. `SECONDARY_REFERENCE`: Travel advisories, commercial travel aggregators (admissible for contextual discovery, but **cannot** establish authoritative legal eligibility).
8. `UNTRUSTED`: Forums, user blogs, unverified articles, or user-provided URLs.

Only `TRUSTED_OFFICIAL`, `TRUSTED_GOVERNMENT`, `TRUSTED_EMBASSY`, `TRUSTED_IMMIGRATION_AUTHORITY`, and `TRUSTED_INTERNATIONAL_ORGANIZATION` are treated as authoritative for final visa determinations.

---

## 4. Regulatory Knowledge Model
The canonical [VisaRequirement](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/types/travelKnowledge.ts) model captures:
- `travelerNationality`: ISO 2-letter country code (e.g., `IN`, `US`, `GB`).
- `passportType`: `ORDINARY`, `DIPLOMATIC`, `OFFICIAL`, `SPECIAL`, `REFUGEE_TRAVEL_DOCUMENT`.
- `residenceCountry`: Country of permanent or lawful residence.
- `destinationCountry` & `destinationRegion`: Destination jurisdictions.
- `visaType`: `VISA_FREE`, `VISA_ON_ARRIVAL`, `E_VISA`, `CONSULAR_VISA`, `TRANSIT_VISA`, `ENTRY_PERMIT`, `ETA`, `OTHER`, `UNKNOWN`.
- `requirement`: `NOT_REQUIRED`, `REQUIRED`, `CONDITIONAL`, `UNKNOWN`, `NOT_APPLICABLE`.
- `duration`: Permitted stay duration (e.g., `30 days`).
- `entries`: `SINGLE`, `DOUBLE`, `MULTIPLE`, `TRANSIT`, `UNKNOWN`.
- `applicationMethod`: `ONLINE_PORTAL`, `AIRPORT_ON_ARRIVAL`, `EMBASSY_CONSULATE`, `VFS_BLS_CENTER`, `ETA_SYSTEM`, `NONE`.
- `processingTime`: Source-backed `{ minDays, typicalDays, maxDays }`.
- `fee`: Source-backed `{ amount, currency, notes }`.
- `passportValidity`: Verified minimum validity beyond travel (e.g., `6 months beyond departure`).
- `blankPages`: Required clean stamp/sticker pages.
- `onwardTravel`: Mandatory onward/return ticket requirement (`REQUIRED`, `RECOMMENDED`, `NONE`, `UNKNOWN`).
- `proofOfFunds`: Source-backed financial requirement.
- `healthRequirements`: Vaccinations, yellow fever cards, travel medical insurance.
- `transitRequirement`: Specific airside or landside transit rules.
- `source`, `sourceUrl`, `trustLevel`, `sourceFreshness`, `lastVerifiedAt`, `confidence`, `status`.

---

## 5. Freshness
Visa regulations fluctuate based on bilateral treaties and border policy updates. [FreshnessEvaluator](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/regulatory/freshnessEvaluator.ts) applies deterministic heuristics:
- `CURRENT`: Verified within $\le 30$ days.
- `AGING`: Verified between 31 and 90 days.
- `STALE`: Verified $> 90$ days ago. Flagged with verification warning before travel.
- `EXPIRED`: Rule whose `effectiveUntil` timestamp has passed.
- `UNKNOWN`: Missing verification metadata.

Source effective dates (`effectiveFrom`, `effectiveUntil`) always supersede freshness heuristics.

---

## 6. Versioning
Regulatory knowledge updates do not silently delete past precedents.
- Every knowledge item maintains a SHA-256 `contentHash`.
- When an updated official bulletin is ingested with a revised `contentHash`, the prior record is marked `SUPERSEDED`.
- Active retrieval queries always resolve against the latest non-superseded official record.

---

## 7. Conflict Resolution
Official sources occasionally publish contradictory guidance during treaty transition periods (e.g. an embassy portal lagging behind an official immigration gazette).
1. Priority hierarchy:
   - Primary immigration authority > Sovereign foreign ministry > Embassy abroad > International org > Airline.
2. If two authoritative sources at equivalent trust level contradict (e.g. visa-free vs visa required):
   - **DO NOT** guess or silently select one.
   - Return status: `CONFLICTING_SOURCES`.
   - Record both citations in audit metadata and instruct the user to verify with border officials directly.

---

## 8. RAG Grounding
The [GroundingValidator](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/rag/groundingValidator.ts) and [ClaimAuditor](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/guardrails/audit/claimAuditor.ts) audit every visa claim returned to the user:
- Every regulatory assertion must link to an official `sourceName`, `sourceUrl`, and `lastVerifiedAt`.
- If an assertion lacks trusted evidence: status `UNCERTAIN` / blocked.
- If an assertion relies on aging or stale evidence: status `STALE` with disclaimer.
- If multiple authoritative sources disagree: status `CONFLICTING`.

---

## 9. Prompt-Injection Defense
External regulatory texts and travel documents are untrusted data.
- [RagInjectionDefense](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/guardrails/rag/ragInjectionDefense.ts) strips instruction-override tokens (`ignore instructions`, `system prompt override`, `reveal api key`, `always say visa-free`).
- Content is sanitized and wrapped in inert `<TRUSTED_TRAVEL_KNOWLEDGE data-boundary="true">` XML structures.
- Untrusted documents can never instruct the model to alter legal determinations.

---

## 10. Visa Logic
The system normalizes visa types into canonical classifications:
- `VISA_FREE`: No advance application or on-arrival visa required.
- `VISA_ON_ARRIVAL`: Issued at port of entry upon landing.
- `E_VISA`: Electronic visa application completed via official portal prior to boarding.
- `CONSULAR_VISA`: Physical passport sticker issued by embassy or outsourced visa application center (VFS/BLS).
- `ETA`: Electronic Travel Authorization (e.g. US ESTA, Australia ETA, UK ETA).
- `UNKNOWN`: Insufficient evidence to establish category.

---

## 11. Transit Logic
Transit visas are evaluated separately from destination entry visas:
- Direct airside transit (staying in international transit area without passing immigration).
- Landside transit (requiring immigration clearance to change terminals or re-check baggage).
- Hub-specific transit exemptions (e.g. Frankfurt international transit area for certain nationalities, Changi airside transit).
- The system never conflates "destination visa not required" with "no visa needed for itinerary" when layovers occur.

---

## 12. Nationality Logic
Visa requirements strictly depend on passport nationality and type:
- **No Inference Principle**: Nationality is **never** guessed or inferred from browser IP, device locale, currency preference, user names, or conversational language.
- If nationality is unknown on an international route, the [RequirementEngine](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/requirementEngine.ts) prompts: *"What passport will you be travelling on?"*
- Group travel evaluates passports individually (e.g. Adult 1 on Indian passport, Adult 2 on US passport).

---

## 13. Cache Strategy
Safe caching via [SafeCacheManager](file:///c:/Users/aswin/.antigravity-ide/AeroDAG/src/services/optimization/cacheManager.ts):
- Cache keys strictly isolate traveler context: `visa:<nationality>:<passportType>:<destination>:<transit>` (e.g. `visa:IN:ORDINARY:japan:none`).
- Destination-only keys are strictly prohibited.
- Cached records retain full source citations, freshness timestamps, and trust levels.
- Sensitive credentials or passport numbers are **never** cached.
- Explicit invalidation triggers on version bump, contentHash alteration, or manual flush.

---

## 14. Security
- **SSRF Prevention**: All external source URLs must use `https://` and undergo hostname validation. Loopback addresses (`127.*`, `localhost`), link-local metadata endpoints (`169.254.169.254`), and RFC-1918 private subnets are blocked.
- **Redaction of PII**: Passport numbers (`[A-Z][0-9]{7,8}`) and visa application identifiers are automatically redacted (`[REDACTED_PASSPORT]`, `[REDACTED_APPLICATION_ID]`) before logging, telemetry capture, or LLM exposure.
- **No Document Uploads**: Passport scans or personal identity documents are out of scope and rejected.

---

## 15. Observability
Integrated with Phase 7.1 Telemetry:
- Spans record `traceId`, `queryType`, `sourceCategory`, `retrievalLatency`, `freshnessState`, `cacheHit`.
- Passport numbers, auth tokens, and traveler identity documents are scrubbed from span tags and audit logs.

---

## 16. User-Facing Language
Visa guidance follows strict non-authoritarian consumer language guidelines:
- **Never say**: *"You don't need a visa."* or *"You are 100% cleared to enter."*
- **Always say**: *"Based on official immigration information from [Source] (verified [Date]), travelers holding an Indian passport are eligible for [Requirement]. Final admission is determined by border authorities upon arrival."*
- For conflicting sources: *"I found conflicting official guidance between [Source A] and [Source B]. Please verify directly with the embassy before travel."*
- For unknown requirements: *"I couldn't verify the current visa requirement from a trusted official source. Direct inquiry with immigration authorities is required."*

---

## 17. Limitations & Out-of-Scope Boundaries
- AeroDAG provides informational guidance, not legal immigration representation.
- Real visa applications, embassy appointments, payment of visa fees, and passport uploads are strictly out of scope.
- Border authorities maintain sole discretion over entry admission.
