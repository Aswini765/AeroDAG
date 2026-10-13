/**
 * AeroDAG Agent Execution Layer Types
 * 
 * Defines typed contracts for Agents, Capabilities, Schemas, Retries, and Execution Context.
 * Ensures strict typing without using `any`.
 */

import { TripContext } from '../requirementEngine';
import { TripPlan, VerificationCheck } from '../../types/travelBooking';
import { TraceContext } from '../telemetry/types';

export type AgentId =
  | 'flight-agent'
  | 'hotel-agent'
  | 'activity-agent'
  | 'transport-agent'
  | 'itinerary-agent'
  | 'budget-agent'
  | 'verification-agent';

export interface AgentCapability {
  name: string;
  description: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryOnErrors?: string[];
}

export interface AgentSchema<T> {
  validate: (input: unknown) => { valid: boolean; errors?: string[]; data?: T };
}

export interface AgentContext {
  correlationId: string;
  tripContext: TripContext;
  timestamp: string;
  timeoutMs?: number;
  traceContext?: TraceContext;
}

export interface ToolCallLog {
  toolName: string;
  agentId: AgentId;
  durationMs: number;
  success: boolean;
  error?: string;
  retryCount?: number;
}

export interface AgentExecutionResult<TOutput> {
  agentId: AgentId;
  success: boolean;
  data?: TOutput;
  error?: string;
  durationMs: number;
  retriesAttempted: number;
  toolCalls: ToolCallLog[];
}

export interface Agent<TInput, TOutput> {
  readonly id: AgentId;
  readonly name: string;
  readonly description: string;
  readonly capabilities: AgentCapability[];
  readonly allowedTools: readonly string[];
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;

  validateInput(input: unknown): input is TInput;
  validateOutput(output: unknown): output is TOutput;

  execute(input: TInput, context: AgentContext): Promise<AgentExecutionResult<TOutput>>;
}
