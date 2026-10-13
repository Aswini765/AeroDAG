/**
 * AeroDAG Tool Definition & Registry Types
 * 
 * Defines structured tool contracts, permissions, category boundaries,
 * and execution context for strict tool invocation.
 */

import { AgentId } from '../types';
import { McpJsonSchema } from '../mcp/types';
import { TraceContext } from '../../telemetry/types';

export type ToolCategory =
  | 'flight'
  | 'hotel'
  | 'activity'
  | 'transport'
  | 'budget'
  | 'verification'
  | 'knowledge'
  | 'payment'; // Included to test negative permission boundary!

export type ToolOperationType = 'READ' | 'WRITE';
export type ToolRole = 'USER' | 'ADMIN' | 'SYSTEM';
export type FinancialSensitivity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type DataSensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface ToolRetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface ToolExecutionContext {
  agentId: AgentId;
  correlationId: string;
  timestamp: string;
  timeoutMs?: number;
  traceContext?: TraceContext;
  callerRole?: ToolRole;
}

export interface ToolValidationResult<T> {
  valid: boolean;
  errors?: string[];
  data?: T;
}

export interface ToolDefinition<TArgs, TResult> {
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly inputSchema: McpJsonSchema;
  readonly timeoutMs: number;
  readonly operationType?: ToolOperationType;
  readonly requiredRole?: ToolRole;
  readonly allowedCallers?: readonly string[];
  readonly retryPolicy?: ToolRetryPolicy;
  readonly financialSensitivity?: FinancialSensitivity;
  readonly dataSensitivity?: DataSensitivity;

  validateInput(input: unknown): ToolValidationResult<TArgs>;
  validateOutput(output: unknown): ToolValidationResult<TResult>;

  execute(args: TArgs, context: ToolExecutionContext): Promise<TResult>;
}

export interface ToolCallRequest {
  agentId: AgentId;
  toolName: string;
  arguments: Record<string, unknown>;
  correlationId?: string;
}

export interface ToolCallResponse<TResult> {
  toolName: string;
  success: boolean;
  data?: TResult;
  error?: string;
  durationMs: number;
  retriesAttempted: number;
}

export class ToolPermissionError extends Error {
  constructor(
    public readonly agentId: AgentId,
    public readonly toolName: string,
    public readonly allowedTools: readonly string[]
  ) {
    super(
      `Permission Denied: Agent '${agentId}' is not authorized to execute tool '${toolName}'. Authorized tools: [${allowedTools.join(', ')}]`
    );
    this.name = 'ToolPermissionError';
  }
}

export class ToolValidationError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly phase: 'input' | 'output',
    public readonly validationErrors: string[]
  ) {
    super(
      `Tool Validation Failure (${phase}) on '${toolName}': ${validationErrors.join('; ')}`
    );
    this.name = 'ToolValidationError';
  }
}

export class ToolTimeoutError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly timeoutMs: number
  ) {
    super(`Tool '${toolName}' timed out after ${timeoutMs}ms.`);
    this.name = 'ToolTimeoutError';
  }
}
