# AeroDAG — Reviewer & Evaluator Demonstration Guide

Welcome to the AeroDAG demonstration guide. This document provides clear, step-by-step instructions to experience the complete platform capabilities as a reviewer, evaluator, or technical interviewer.

---

## 1. Fast Track: Automated CLI Demo Runner (< 2 seconds)

To run the complete golden path demonstration programmatically without opening a browser:

```bash
npm run test:demo
# or: npx tsx test_phase12_demo.ts
```

### What This Executes:
1. **Natural Language Input**: "Plan a 4-day family trip to Goa for 2 adults and 2 kids with budget 70,000 INR".
2. **Adaptive Clarification**: Extracts destination, date window, party members, and budget ceiling.
3. **Multi-Agent DAG Generation**: Dispatches flight, hotel, and activity planning in parallel.
4. **Constraint Verification**: Verifies family accommodation capacity (accommodates 4 guests).
5. **Interactive Itinerary Edit**: Modifies Day 2 theme to *Heritage & Spice Plantation Excursion*.
6. **Authoritative Sandbox Booking**: Places a 15-minute hold, authorizes payment, and confirms with booking ID and PNR.
7. **Post-Booking AI Assistance**: Queries schedule for tomorrow with grounded response.

---

## 2. Interactive Browser Journey Guide

### 2.1 Launching the Application
Start the development server:
```bash
npm run dev
# or for full production server: npm run start
```
Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

### 2.2 Golden Path Walkthrough (Family Trip to Goa)

#### Step 1: Natural Language Trip Request
On the home screen hero banner:
- Enter: *"Plan a 4-day family trip to Goa for 2 adults and 2 kids under 70,000 INR"*
- Or click any of the preset cards (e.g., *Family Weekend in Goa*, *Romantic Kerala Backwaters*).

#### Step 2: Adaptive Clarification
- If any required information is missing, the conversational agent asks a single prioritized question.
- Notice: The agent never asks redundant questions about fields you already mentioned!
- Notice: The agent never infers nationality from your IP or currency.

#### Step 3: Interactive Trip Workspace
Review the generated trip dashboard:
- **Overview Card**: Flight timing, selected resort, and total price breakdown.
- **Day-by-Day Itinerary Tab**: Morning, afternoon, and evening slots with local dining tips.
- **Map Tab**: View the geocoded interactive route connecting the airport, resort, and daily attractions.
- **Interactive Editing**: Click on an itinerary day to edit the activity or adjust pacing. Watch the budget update deterministically!

#### Step 4: Sandbox Booking & Hold Creation
- Click **"Book Trip (Sandbox)"**.
- Review the itemized pricing: flights, resort accommodation, airport transfer, and activity passes.
- Notice the clear label: **"Simulated Sandbox Environment — No Real Charges"**.
- Click **"Create 15-Minute Hold"**: An authoritative server-side inventory hold is generated.

#### Step 5: Sandbox Payment Authorization & Confirmation
- Select payment method: **UPI**, **Net Banking**, or **Sandbox Card**.
- Click **"Authorize Payment"**: The transaction is verified against the authoritative server state.
- Upon completion, receive an official **Confirmation Code (CONF-*)** and **Flight PNR**.

#### Step 6: Post-Booking Assistant & My Trips
- Switch to the **"My Trips"** view from the navigation bar to see your confirmed trip in **Upcoming Trips**.
- Click **"Ask AI Assistant"** and test queries:
  - *"What is planned for tomorrow?"*
  - *"How do I get to the hotel?"*
  - *"What is my current booking status?"*
  - *"What documents do I need before departure?"*
- Test consequential action protection: Ask *"Cancel my trip"*. The assistant clearly requires your explicit confirmation before initiating the authoritative backend cancellation and refund.

---

## 3. Testing Self-Correction & Adversarial Protection

### Scenario A: Budget Overage Self-Correction
1. In the chat, request: *"Plan a trip to Goa with 5-star luxury hotel on a tight budget of 35,000 INR"*.
2. The Self-Correction Coordinator detects the budget overage constraint violation.
3. It automatically swaps the luxury hotel for a high-quality value accommodation to fit within your budget ceiling.

### Scenario B: Hotel Room Capacity Enforcement
1. Request a trip for 4 adults.
2. The verification engine ensures standard 2-person rooms are rejected and automatically upgrades to a 2-bedroom suite or connecting rooms with `maxCapacity >= 4`.

### Scenario C: Red-Team Attack Verification
To verify that prompt injections, price manipulations, and cross-user snooping are completely blocked:
```bash
npm run test:redteam
```
All 16 adversarial attacks are blocked and verified green.
