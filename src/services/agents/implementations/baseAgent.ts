/**
 * AeroDAG Base Agent Implementation
 * 
 * Provides standard input/output validation, timeout boundaries, tool invocation
 * logging, and bounded retry orchestration for all concrete agents.
 */

import { Agent, AgentId, AgentCapability, RetryPolicy, AgentContext, AgentExecutionResult, ToolCallLog } from '../types';
import { getToolRegistry, ToolRegistry } from '../tools/toolRegistry';
import { ToolCallResponse, ToolExecutionContext } from '../tools/types';
import { defaultTracer } from '../../telemetry/telemetryTracer';
import { getFailureInjector } from '../../reliability/failureInjector';
import { ErrorTaxonomy } from '../../reliability/errorTaxonomy';

export abstract class BaseAgent<TInput, TOutput> implements Agent<TInput, TOutput> {
  abstract readonly id: AgentId;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: AgentCapability[];
  abstract readonly allowedTools: readonly string[];

  readonly timeoutMs: number = 15000;
  readonly retryPolicy: RetryPolicy = {
    maxRetries: 2,
    backoffMs: 200
  };

  protected toolRegistry: ToolRegistry = getToolRegistry();

  abstract validateInput(input: unknown): input is TInput;
  abstract validateOutput(output: unknown): output is TOutput;

  /**
   * Main execution harness with validation and telemetry
   */
  async execute(input: TInput, context: AgentContext): Promise<AgentExecutionResult<TOutput>> {
    const startTime = Date.now();
    const toolCalls: ToolCallLog[] = [];

    // Start Agent Telemetry Span if traceContext is present
    const agentSpanInfo = context.traceContext
      ? defaultTracer.startSpan(`${this.id}_execute`, 'agent', context.traceContext, {
          agentId: this.id,
          agentName: this.name,
          timeoutMs: this.timeoutMs,
          maxRetries: this.retryPolicy.maxRetries
        })
      : null;

    const childAgentContext: AgentContext = agentSpanInfo
      ? { ...context, traceContext: agentSpanInfo.context }
      : context;

    // 1. Validate Input
    if (!this.validateInput(input)) {
      if (agentSpanInfo) {
        defaultTracer.endSpan(agentSpanInfo.span, 'ERROR', {
          errorCategory: 'VALIDATION_ERROR',
          errorMessage: `Input validation failed for agent '${this.name}' (${this.id}).`,
          additionalMetadata: { inputValid: false, outputValid: false }
        });
      }
      return {
        agentId: this.id,
        success: false,
        error: `Input validation failed for agent '${this.name}' (${this.id}).`,
        durationMs: Date.now() - startTime,
        retriesAttempted: 0,
        toolCalls
      };
    }

    // 2. Execute with timeout
    try {
      // Failure Injection hook for Agent level
      const injector = getFailureInjector();
      if (injector.isEnabled() && injector.shouldFail('AGENT', this.id)) {
        await injector.inject('AGENT', this.id, context.traceContext?.traceId);
      }

      let data: any = await this.runWithTimeout(input, childAgentContext, toolCalls);

      if (injector.isEnabled()) {
        const malformed = injector.getMalformedOutput('AGENT', this.id);
        if (malformed !== undefined) {
          data = malformed;
        }
      }

      // 3. Validate Output
      if (!this.validateOutput(data)) {
        if (agentSpanInfo) {
          defaultTracer.endSpan(agentSpanInfo.span, 'ERROR', {
            errorCategory: 'VALIDATION_ERROR',
            errorMessage: `Output validation failed for agent '${this.name}' (${this.id}).`,
            additionalMetadata: { inputValid: true, outputValid: false }
          });
        }
        return {
          agentId: this.id,
          success: false,
          error: `Output validation failed for agent '${this.name}' (${this.id}).`,
          durationMs: Date.now() - startTime,
          retriesAttempted: 0,
          toolCalls
        };
      }

      if (agentSpanInfo) {
        defaultTracer.endSpan(agentSpanInfo.span, 'SUCCESS', {
          additionalMetadata: { inputValid: true, outputValid: true, toolCallsCount: toolCalls.length }
        });
      }

      return {
        agentId: this.id,
        success: true,
        data,
        durationMs: Date.now() - startTime,
        retriesAttempted: 0,
        toolCalls
      };
    } catch (err: any) {
      const classification = ErrorTaxonomy.classify(err);
      if (agentSpanInfo) {
        defaultTracer.endSpan(agentSpanInfo.span, classification.category === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR', {
          errorCategory: classification.category,
          errorMessage: err?.message || String(err),
          additionalMetadata: { inputValid: true, outputValid: false, isRetryable: classification.isRetryable }
        });
      }
      return {
        agentId: this.id,
        success: false,
        error: err?.message || String(err),
        durationMs: Date.now() - startTime,
        retriesAttempted: 0,
        toolCalls
      };
    }
  }

  /**
   * Protected tool execution helper with automatic logging and permission enforcement
   */
  protected async callTool<TArgs, TResult>(
    toolName: string,
    args: TArgs,
    context: AgentContext,
    toolCallsCollector?: ToolCallLog[]
  ): Promise<TResult> {
    const res: ToolCallResponse<TResult> = await this.toolRegistry.invokeTool(
      this,
      toolName,
      args,
      {
        agentId: this.id,
        correlationId: context.correlationId,
        timestamp: context.timestamp,
        timeoutMs: context.timeoutMs,
        traceContext: context.traceContext
      }
    );

    if (toolCallsCollector) {
      toolCallsCollector.push({
        toolName,
        agentId: this.id,
        durationMs: res.durationMs,
        success: res.success,
        error: res.error,
        retryCount: res.retriesAttempted
      });
    }

    if (!res.success) {
      throw new Error(`Tool '${toolName}' failed: ${res.error}`);
    }

    return res.data as TResult;
  }

  protected abstract run(
    input: TInput,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<TOutput>;

  private async runWithTimeout(
    input: TInput,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<TOutput> {
    const limitMs = context.timeoutMs || this.timeoutMs;

    return new Promise<TOutput>((resolve, reject) => {
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`Agent '${this.name}' timed out after ${limitMs}ms.`));
        }
      }, limitMs);

      this.run(input, context, toolCalls)
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
}
