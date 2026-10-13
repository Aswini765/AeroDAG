/**
 * AeroDAG Central Tool Registry
 * 
 * Provides centralized tool registration, schema validation, permission checks,
 * bounded retry handling, timeouts, and MCP tool interface mapping.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolPermissionError,
  ToolValidationError,
  ToolTimeoutError,
  ToolCallResponse
} from './types';
import { Agent, AgentId } from '../types';
import { McpToolDefinition, McpToolCall, McpToolResult } from '../mcp/types';
import { McpToolAdapter } from '../mcp/mcpToolAdapter';

import { searchFlightsTool, getFlightDetailsTool, checkFlightAvailabilityTool } from './flightTools';
import { searchHotelsTool, getHotelDetailsTool, checkHotelAvailabilityTool } from './hotelTools';
import { searchActivitiesTool, getActivityDetailsTool } from './activityTools';
import { searchTransportTool, estimateTransferTool } from './transportTools';
import { calculateBudgetTool } from './budgetTools';
import { verifyTripConstraintsTool } from './verificationTools';
import { createPaymentTool, confirmBookingTool, refundPaymentTool } from './paymentTools';
import { getToolGuardrail } from '../../guardrails/tool/toolGuardrail';
import { defaultTracer } from '../../telemetry/telemetryTracer';
import { getFailureInjector } from '../../reliability/failureInjector';
import { ErrorTaxonomy } from '../../reliability/errorTaxonomy';
import { getToolCallOptimizer } from '../../optimization/toolCallOptimizer';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition<any, any>> = new Map();
  // Optional test hooks for failure simulation
  private simulatedFailures: Map<string, { count: number; error: Error }> = new Map();
  private simulatedMalformedOutputs: Map<string, unknown> = new Map();

  constructor() {
    this.registerStandardTools();
  }

  private registerStandardTools(): void {
    // Flight Tools
    this.register(searchFlightsTool);
    this.register(getFlightDetailsTool);
    this.register(checkFlightAvailabilityTool);

    // Hotel Tools
    this.register(searchHotelsTool);
    this.register(getHotelDetailsTool);
    this.register(checkHotelAvailabilityTool);

    // Activity Tools
    this.register(searchActivitiesTool);
    this.register(getActivityDetailsTool);

    // Transport Tools
    this.register(searchTransportTool);
    this.register(estimateTransferTool);

    // Budget Tools
    this.register(calculateBudgetTool);

    // Verification Tools
    this.register(verifyTripConstraintsTool);

    // Payment & Confirmation Tools (Protected boundary)
    this.register(createPaymentTool);
    this.register(confirmBookingTool);
    this.register(refundPaymentTool);
  }

  register<TArgs, TResult>(tool: ToolDefinition<TArgs, TResult>): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition<any, any> | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition<any, any>[] {
    return Array.from(this.tools.values());
  }

  /**
   * MCP Tool Listing
   */
  listMcpTools(): McpToolDefinition[] {
    return this.listTools().map((t) => McpToolAdapter.toMcpDefinition(t));
  }

  /**
   * Helper that executes a tool with default permissions or specific agent context
   */
  async executeTool<TArgs = any, TResult = any>(
    toolName: string,
    rawArgs: unknown,
    context: ToolExecutionContext,
    agent?: { id: AgentId; allowedTools: readonly string[] }
  ): Promise<ToolCallResponse<TResult>> {
    const callingAgent = agent || { id: context.agentId, allowedTools: [toolName] };
    return this.invokeTool(callingAgent, toolName, rawArgs, context);
  }

  /**
   * Primary Tool Execution Pipeline with Schema & Permission Boundaries
   */
  async invokeTool<TArgs, TResult>(
    agent: { id: AgentId; allowedTools: readonly string[]; retryPolicy?: { maxRetries: number; backoffMs: number } },
    toolName: string,
    rawArgs: unknown,
    context: ToolExecutionContext
  ): Promise<ToolCallResponse<TResult>> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    // Start Tool Telemetry Span
    const toolSpanInfo = context.traceContext
      ? defaultTracer.startSpan(`${toolName}_tool`, 'tool', context.traceContext, {
          toolName,
          toolCategory: tool?.category || 'unknown',
          requestingAgent: agent.id,
          correlationId: context.correlationId
        })
      : null;

    if (!tool) {
      if (toolSpanInfo) {
        defaultTracer.endSpan(toolSpanInfo.span, 'ERROR', {
          errorCategory: 'TOOL_ERROR',
          errorMessage: `Tool '${toolName}' not found in registry.`
        });
      }
      return {
        toolName,
        success: false,
        error: `Tool '${toolName}' not found in registry.`,
        durationMs: Date.now() - startTime,
        retriesAttempted: 0
      };
    }

    // 1. Tool Guardrail Check (Permission, Role Boundaries, & Parameter Sanity)
    const toolGuardrail = getToolGuardrail();
    const guardDecision = toolGuardrail.evaluate(
      {
        agentId: agent.id,
        toolName,
        args: rawArgs && typeof rawArgs === 'object' ? (rawArgs as Record<string, unknown>) : {},
        allowedTools: agent.allowedTools
      },
      context
    );

    if (guardDecision.decision === 'BLOCK') {
      if (toolSpanInfo) {
        defaultTracer.endSpan(toolSpanInfo.span, 'ERROR', {
          errorCategory: 'AUTHORIZATION_ERROR',
          errorMessage: `Agent '${agent.id}' unauthorized to execute '${toolName}'`,
          additionalMetadata: { permissionAllowed: false, toolCategory: tool.category }
        });
      }
      throw new ToolPermissionError(agent.id, toolName, agent.allowedTools);
    }

    // 1.5 Role-Based Tool Boundary Check
    if (tool.requiredRole && context.callerRole) {
      const isSystemRequired = tool.requiredRole === 'SYSTEM' && context.callerRole !== 'SYSTEM';
      const isAdminRequired = tool.requiredRole === 'ADMIN' && context.callerRole === 'USER';
      if (isSystemRequired || isAdminRequired) {
        if (toolSpanInfo) {
          defaultTracer.endSpan(toolSpanInfo.span, 'ERROR', {
            errorCategory: 'AUTHORIZATION_ERROR',
            errorMessage: `Caller role '${context.callerRole}' is unauthorized to execute tool '${toolName}'. Requires '${tool.requiredRole}' role.`,
            additionalMetadata: { permissionAllowed: false, toolCategory: tool.category }
          });
        }
        throw new ToolPermissionError(agent.id, toolName, agent.allowedTools);
      }
    }

    // 2. Input Schema Validation
    const inputValidation = tool.validateInput(rawArgs);
    if (!inputValidation.valid) {
      if (toolSpanInfo) {
        defaultTracer.endSpan(toolSpanInfo.span, 'ERROR', {
          errorCategory: 'VALIDATION_ERROR',
          errorMessage: `Input schema validation failed for tool '${toolName}'`,
          additionalMetadata: { inputValid: false, toolCategory: tool.category }
        });
      }
      throw new ToolValidationError(toolName, 'input', inputValidation.errors || ['Invalid input schema']);
    }

    // 2.5 Tool Call Deduplication Check (Safe read-only caching)
    const injector = getFailureInjector();
    const toolOptimizer = getToolCallOptimizer();
    if (!injector.isEnabled()) {
      const cachedResult = toolOptimizer.getCachedResult<TResult>(toolName, inputValidation.data);
      if (cachedResult !== undefined) {
        if (toolSpanInfo) {
          defaultTracer.endSpan(toolSpanInfo.span, 'SUCCESS', {
            retryCount: 0,
            additionalMetadata: {
              cached: true,
              toolCategory: tool.category
            }
          });
        }
        return {
          toolName,
          success: true,
          data: cachedResult,
          durationMs: Date.now() - startTime,
          retriesAttempted: 0
        };
      }
    }

    // 3. Execution with Bounded Retries & Timeouts
    const maxRetries = agent.retryPolicy?.maxRetries ?? 2;
    const backoffMs = agent.retryPolicy?.backoffMs ?? 100;
    let attempts = 0;
    let lastError: Error | null = null;
    let rawResult: unknown = null;

    while (attempts <= maxRetries) {
      try {
        attempts++;

        // 1. Check FailureInjector
        const injector = getFailureInjector();
        if (injector.isEnabled() && injector.shouldFail('TOOL', toolName)) {
          await injector.inject('TOOL', toolName, context.traceContext?.traceId);
        }

        // 2. Check legacy test hook simulated failure
        const sim = this.simulatedFailures.get(toolName);
        if (sim && sim.count > 0) {
          sim.count--;
          throw sim.error;
        }

        // 3. Execute with timeout
        rawResult = await this.executeWithTimeout(
          tool,
          inputValidation.data,
          context,
          tool.timeoutMs
        );

        // 4. Check FailureInjector malformed output
        if (injector.isEnabled()) {
          const malformed = injector.getMalformedOutput('TOOL', toolName);
          if (malformed !== undefined) {
            rawResult = malformed;
          }
        }

        // 5. Check legacy test hook simulated malformed output
        if (this.simulatedMalformedOutputs.has(toolName)) {
          rawResult = this.simulatedMalformedOutputs.get(toolName);
        }

        // Success - exit retry loop
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        const isRetryable = ErrorTaxonomy.isRetryable(err);
        if (attempts <= maxRetries && isRetryable) {
          // Bounded backoff
          await new Promise((r) => setTimeout(r, backoffMs * attempts));
        } else {
          // Non-retryable error or retries exhausted: break immediately
          break;
        }
      }
    }

    if (lastError) {
      const classification = ErrorTaxonomy.classify(lastError);
      if (toolSpanInfo) {
        defaultTracer.endSpan(toolSpanInfo.span, classification.category === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR', {
          errorCategory: classification.category,
          errorMessage: lastError.message,
          retryCount: attempts - 1,
          additionalMetadata: {
            toolCategory: tool.category,
            attempts,
            isRetryable: classification.isRetryable,
            errorSeverity: classification.severity
          }
        });
      }
      return {
        toolName,
        success: false,
        error: lastError.message,
        durationMs: Date.now() - startTime,
        retriesAttempted: attempts - 1
      };
    }

    // 4. Output Schema Validation
    const outputValidation = tool.validateOutput(rawResult);
    if (!outputValidation.valid) {
      if (toolSpanInfo) {
        defaultTracer.endSpan(toolSpanInfo.span, 'ERROR', {
          errorCategory: 'VALIDATION_ERROR',
          errorMessage: `Output schema validation failed for tool '${toolName}'`,
          retryCount: attempts - 1,
          additionalMetadata: { outputValid: false, toolCategory: tool.category }
        });
      }
      throw new ToolValidationError(toolName, 'output', outputValidation.errors || ['Malformed output from provider']);
    }

    if (outputValidation.valid && !injector.isEnabled()) {
      toolOptimizer.cacheResult(toolName, inputValidation.data, outputValidation.data);
    }

    if (toolSpanInfo) {
      defaultTracer.endSpan(toolSpanInfo.span, 'SUCCESS', {
        retryCount: attempts - 1,
        additionalMetadata: { permissionAllowed: true, inputValid: true, outputValid: true, toolCategory: tool.category }
      });
    }

    return {
      toolName,
      success: true,
      data: outputValidation.data as TResult,
      durationMs: Date.now() - startTime,
      retriesAttempted: attempts - 1
    };
  }

  private async executeWithTimeout<TArgs, TResult>(
    tool: ToolDefinition<TArgs, TResult>,
    args: TArgs,
    context: ToolExecutionContext,
    timeoutMs: number
  ): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new ToolTimeoutError(tool.name, timeoutMs));
        }
      }, timeoutMs);

      tool
        .execute(args, context)
        .then((res) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  // =========================================================================
  // Test Hook Methods (For CASE 5 and CASE 6 verification)
  // =========================================================================

  simulateFailure(toolName: string, times: number, error: Error): void {
    this.simulatedFailures.set(toolName, { count: times, error });
  }

  clearSimulatedFailure(toolName: string): void {
    this.simulatedFailures.delete(toolName);
  }

  simulateMalformedOutput(toolName: string, malformedData: unknown): void {
    this.simulatedMalformedOutputs.set(toolName, malformedData);
  }

  clearSimulatedMalformedOutput(toolName: string): void {
    this.simulatedMalformedOutputs.delete(toolName);
  }
}

// Global registry instance
let globalRegistryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalRegistryInstance) {
    globalRegistryInstance = new ToolRegistry();
  }
  return globalRegistryInstance;
}
