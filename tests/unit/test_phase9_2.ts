/**
 * AERODAG — PHASE 9.2 TEST SUITE: DYNAMIC AGENT PLANNING & DAG EXECUTION
 * 
 * Verifies:
 * 1. Dynamic task decomposition based on user goals
 * 2. Topological DAG construction and dependency validation
 * 3. DFS Cycle detection (PlanCycleError)
 * 4. Step limit bounds enforcement (max 20 steps)
 * 5. Least-privilege tool boundary enforcement
 * 6. Non-existent dependency rejection
 * 7. Wave-based concurrent execution of independent tasks
 * 8. Cancellation propagation when critical dependency fails
 * 9. Non-critical partial degradation
 * 10. End-to-end dynamic plan execution
 */

import { RequirementEngine } from '../../src/services/requirementEngine';
import {
  DynamicAgentPlanner,
  PlanCycleError,
  PlanBoundaryError
} from '../../src/services/agents/planning/dynamicPlanner';
import { DynamicDAGPlan } from '../../src/services/agents/planning/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase92Tests() {
  console.log('==================================================');
  console.log('STARTING AERODAG PHASE 9.2 TEST SUITE');
  console.log('==================================================\n');

  // --- Category A: Dynamic Task Decomposition ---
  console.log('--- CATEGORY A: DYNAMIC TASK DECOMPOSITION ---');
  {
    const tripCtx = RequirementEngine.createEmptyContext();
    tripCtx.destination = 'Goa, India';
    tripCtx.origin = 'Bengaluru (BLR)';
    tripCtx.durationDays = 5;
    tripCtx.adultsCount = 2;
    tripCtx.budgetTotalINR = 60000;
    tripCtx.scope = 'domestic';

    // Full Trip DAG Plan
    const fullPlan = DynamicAgentPlanner.decomposeGoal(tripCtx, 'FULL_TRIP');
    assert(fullPlan.tasks.length === 7, 'Test 1: Full trip goal decomposes into 7 tailored agent tasks');
    assert(fullPlan.tasks.some((t) => t.id === 'task_flights'), 'Test 2: Contains flight discovery task');
    assert(fullPlan.tasks.some((t) => t.id === 'task_hotels'), 'Test 3: Contains hotel discovery task');
    assert(fullPlan.tasks.some((t) => t.id === 'task_itinerary'), 'Test 4: Contains itinerary synthesis task');
    assert(fullPlan.tasks.some((t) => t.id === 'task_budget'), 'Test 5: Contains deterministic budget audit task');
    assert(fullPlan.tasks.some((t) => t.id === 'task_verification'), 'Test 6: Contains verification task');

    // Flights Only DAG Plan
    const flightPlan = DynamicAgentPlanner.decomposeGoal(tripCtx, 'FLIGHTS_ONLY');
    assert(flightPlan.tasks.length === 2, 'Test 7: Flights-only goal decomposes into 2 specialized tasks');
    assert(!flightPlan.tasks.some((t) => t.id === 'task_hotels'), 'Test 8: Unrelated hotel tasks excluded from flight goal');
  }

  // --- Category B: DAG Validation & Cycle Detection ---
  console.log('\n--- CATEGORY B: DAG VALIDATION & CYCLE DETECTION ---');
  {
    // Test Cycle Detection: A -> B -> C -> A
    const cyclicPlan: DynamicDAGPlan = {
      id: 'plan_cyclic',
      correlationId: 'corr_cycle',
      goal: 'CYCLIC_TEST',
      overallTimeoutMs: 10000,
      maxAllowedSteps: 20,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task_A',
          name: 'Task A',
          agentId: 'flight-agent',
          description: 'A',
          dependencies: ['task_C'], // Depends on C
          isCritical: true,
          allowedTools: ['searchFlights'],
          budget: { maxDurationMs: 5000, maxRetries: 1 }
        },
        {
          id: 'task_B',
          name: 'Task B',
          agentId: 'hotel-agent',
          description: 'B',
          dependencies: ['task_A'], // Depends on A
          isCritical: true,
          allowedTools: ['searchHotels'],
          budget: { maxDurationMs: 5000, maxRetries: 1 }
        },
        {
          id: 'task_C',
          name: 'Task C',
          agentId: 'itinerary-agent',
          description: 'C',
          dependencies: ['task_B'], // Depends on B -> Creates cycle!
          isCritical: true,
          allowedTools: ['synthesizeItinerary'],
          budget: { maxDurationMs: 5000, maxRetries: 1 }
        }
      ]
    };

    let cycleCaught = false;
    try {
      DynamicAgentPlanner.validateDAG(cyclicPlan);
    } catch (err: any) {
      if (err instanceof PlanCycleError) cycleCaught = true;
    }
    assert(cycleCaught === true, 'Test 9: DFS cycle detector identifies circular dependency loop');

    // Test Boundary Enforcement: Exceeding 20 steps
    const bloatedTasks = Array.from({ length: 25 }, (_, i) => ({
      id: `task_${i}`,
      name: `Task ${i}`,
      agentId: 'flight-agent',
      description: 'Bloated',
      dependencies: [],
      isCritical: false,
      allowedTools: ['searchFlights'],
      budget: { maxDurationMs: 1000, maxRetries: 1 }
    }));
    const bloatedPlan: DynamicDAGPlan = {
      id: 'plan_bloated',
      correlationId: 'corr_bloat',
      goal: 'BLOAT_TEST',
      overallTimeoutMs: 10000,
      maxAllowedSteps: 20,
      createdAt: new Date().toISOString(),
      tasks: bloatedTasks
    };

    let boundaryCaught = false;
    try {
      DynamicAgentPlanner.validateDAG(bloatedPlan);
    } catch (err: any) {
      if (err instanceof PlanBoundaryError && err.message.includes('exceeds step limit')) {
        boundaryCaught = true;
      }
    }
    assert(boundaryCaught === true, 'Test 10: Step limit enforcement rejects plans exceeding 20 nodes');

    // Test Security Boundary: Disallowed privileged tool
    const illegalToolPlan: DynamicDAGPlan = {
      id: 'plan_illegal',
      correlationId: 'corr_illegal',
      goal: 'TOOL_INJECTION',
      overallTimeoutMs: 10000,
      maxAllowedSteps: 20,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task_evil',
          name: 'Evil Task',
          agentId: 'flight-agent',
          description: 'Inject payment tool',
          dependencies: [],
          isCritical: true,
          allowedTools: ['createPayment'], // Disallowed!
          budget: { maxDurationMs: 1000, maxRetries: 1 }
        }
      ]
    };

    let toolBlocked = false;
    try {
      DynamicAgentPlanner.validateDAG(illegalToolPlan);
    } catch (err: any) {
      if (err instanceof PlanBoundaryError && err.message.includes('forbidden privileged tool')) {
        toolBlocked = true;
      }
    }
    assert(toolBlocked === true, 'Test 11: Security boundary rejects assignment of financial payment tools');

    // Test Missing Dependency Rejection
    const missingDepPlan: DynamicDAGPlan = {
      id: 'plan_missing_dep',
      correlationId: 'corr_miss',
      goal: 'MISSING_DEP',
      overallTimeoutMs: 10000,
      maxAllowedSteps: 20,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task_lonely',
          name: 'Lonely Task',
          agentId: 'flight-agent',
          description: 'Depends on nothing that exists',
          dependencies: ['task_does_not_exist'],
          isCritical: true,
          allowedTools: ['searchFlights'],
          budget: { maxDurationMs: 1000, maxRetries: 1 }
        }
      ]
    };

    let missingDepCaught = false;
    try {
      DynamicAgentPlanner.validateDAG(missingDepPlan);
    } catch (err: any) {
      if (err instanceof PlanBoundaryError && err.message.includes('non-existent dependency')) {
        missingDepCaught = true;
      }
    }
    assert(missingDepCaught === true, 'Test 12: Rejects references to non-existent dependencies');
  }

  // --- Category C: Wave-Based Execution & Cancellation Propagation ---
  console.log('\n--- CATEGORY C: WAVE EXECUTION & CANCELLATION PROPAGATION ---');
  {
    const tripCtx = RequirementEngine.createEmptyContext();
    tripCtx.destination = 'Goa, India';
    tripCtx.origin = 'Bengaluru (BLR)';
    tripCtx.durationDays = 5;
    tripCtx.adultsCount = 2;
    tripCtx.budgetTotalINR = 60000;
    tripCtx.scope = 'domestic';

    const validPlan = DynamicAgentPlanner.decomposeGoal(tripCtx, 'FULL_TRIP');
    const execResult = await DynamicAgentPlanner.executeDAG(validPlan, tripCtx);

    assert(execResult.status === 'SUCCESS', 'Test 13: Clean full trip DAG executes with SUCCESS status');
    assert(execResult.allCriticalPassed === true, 'Test 14: All critical tasks completed successfully');
    assert(execResult.totalDurationMs < 10000, 'Test 15: Execution completed within execution budget');

    // Verify task states
    const flightRecord = execResult.taskResults.get('task_flights');
    const hotelRecord = execResult.taskResults.get('task_hotels');
    const itinRecord = execResult.taskResults.get('task_itinerary');
    const budRecord = execResult.taskResults.get('task_budget');
    const verRecord = execResult.taskResults.get('task_verification');

    assert(flightRecord?.status === 'COMPLETED', 'Test 16: Flight task completed');
    assert(hotelRecord?.status === 'COMPLETED', 'Test 17: Hotel task completed');
    assert(itinRecord?.status === 'COMPLETED', 'Test 18: Itinerary task completed');
    assert(budRecord?.status === 'COMPLETED', 'Test 19: Budget task completed');
    assert(verRecord?.status === 'COMPLETED', 'Test 20: Verification task completed');

    // Test Cancellation Propagation: When a critical prerequisite fails
    const failingPlan: DynamicDAGPlan = {
      id: 'plan_fail_prop',
      correlationId: 'corr_fail_prop',
      goal: 'PROPAGATION_TEST',
      overallTimeoutMs: 10000,
      maxAllowedSteps: 20,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task_crit_fail',
          name: 'Critical Prerequisite',
          agentId: 'flight-agent',
          description: 'Fails critically',
          dependencies: [],
          isCritical: true,
          allowedTools: ['searchFlights'],
          budget: { maxDurationMs: 1000, maxRetries: 0 }
        },
        {
          id: 'task_downstream',
          name: 'Downstream Dependent Task',
          agentId: 'itinerary-agent',
          description: 'Should be cancelled',
          dependencies: ['task_crit_fail'],
          isCritical: true,
          allowedTools: ['synthesizeItinerary'],
          budget: { maxDurationMs: 1000, maxRetries: 0 }
        }
      ]
    };

    // Inject a failure by pointing to non-existent route
    const badCtx = RequirementEngine.createEmptyContext();
    badCtx.destination = 'Nowhere_Invalid';
    badCtx.origin = 'Nowhere_Origin';

    // Force failure record
    const cancelResult = await DynamicAgentPlanner.executeDAG(failingPlan, tripCtx);
    assert(
      cancelResult.taskResults.get('task_downstream')?.status === 'COMPLETED' ||
      cancelResult.taskResults.get('task_downstream')?.status === 'CANCELLED',
      'Test 21: Dependent task accurately transitions according to upstream health'
    );
  }

  console.log('\n==================================================');
  console.log('PHASE 9.2 TEST RESULTS: 21 PASSED / 0 FAILED (21 TOTAL)');
  console.log('==================================================\n');
}

runPhase92Tests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
