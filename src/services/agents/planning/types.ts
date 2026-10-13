/**
 * AeroDAG Dynamic Agent Planning & DAG Execution Types
 * 
 * Defines contracts for dynamic task decomposition, dependency validation,
 * cycle detection, execution budgets, and cancellation propagation.
 */

import { TripContext } from '../../requirementEngine';
import { TraceContext } from '../../telemetry';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export interface ExecutionBudget {
  maxDurationMs: number;
  maxRetries: number;
  maxTokens?: number;
}

export interface PlanTaskNode {
  id: string;
  name: string;
  agentId: string;
  description: string;
  dependencies: string[];
  isCritical: boolean; // If true, downstream tasks fail if this fails; if false, partial fallback
  allowedTools: string[];
  budget: ExecutionBudget;
}

export interface DynamicDAGPlan {
  id: string;
  correlationId: string;
  goal: string;
  tasks: PlanTaskNode[];
  overallTimeoutMs: number;
  maxAllowedSteps: number;
  createdAt: string;
}

export interface TaskExecutionRecord {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  output?: any;
  error?: string;
  retryCount: number;
}

export interface DynamicPlanExecutionResult {
  planId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  taskResults: Map<string, TaskExecutionRecord>;
  totalDurationMs: number;
  allCriticalPassed: boolean;
  finalPlan?: any;
  errors: Array<{ taskId: string; message: string }>;
  fallbackInvoked: boolean;
}
