/**
 * AeroDAG MCP Tool Adapter
 * 
 * Maps internal ToolDefinitions to standard Model Context Protocol (MCP) tool schemas
 * and translates MCP tool calls into typed registry invocations.
 */

import { McpToolDefinition, McpToolCall, McpToolResult, McpServerAdapter } from './types';
import { ToolDefinition, ToolCallResponse, ToolExecutionContext } from '../tools/types';
import { AgentId } from '../types';
import { defaultTracer } from '../../telemetry/telemetryTracer';
import { getFailureInjector } from '../../reliability/failureInjector';
import { ToolRegistry } from '../tools/toolRegistry';

import { SecretScanner } from '../../security/secretScanner';

export class McpToolAdapter {
  /**
   * Converts internal ToolDefinition to MCP Tool Definition schema
   */
  static toMcpDefinition(tool: ToolDefinition<any, any>): McpToolDefinition {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    };
  }

  /**
   * Encapsulates a tool output into an MCP-compliant result structure,
   * guaranteeing that no secrets or raw credentials enter model-visible text.
   */
  static toMcpResult(data: unknown, isError = false): McpToolResult {
    const rawString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const sanitizedString = SecretScanner.redact(rawString);

    if (isError) {
      return {
        content: [
          {
            type: 'text',
            text: sanitizedString
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: sanitizedString,
          data
        }
      ],
      isError: false
    };
  }

  /**
   * Observability-instrumented MCP tool execution helper
   */
  static async executeMcpToolCall(
    call: McpToolCall,
    agent: { id: AgentId; allowedTools: readonly string[] },
    registry: ToolRegistry,
    context: ToolExecutionContext
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    const mcpSpanInfo = context.traceContext
      ? defaultTracer.startSpan(`mcp_${call?.name || 'unknown'}_execution`, 'mcp', context.traceContext, {
          mcpToolName: call?.name || 'unknown',
          adapterName: 'McpToolAdapter',
          agentId: agent.id
        })
      : null;

    try {
      // 1. Unknown Tool Check
      if (!call || !call.name || !registry.getTool(call.name)) {
        const errorMsg = `Unknown MCP tool: '${call?.name}'`;
        if (mcpSpanInfo) {
          defaultTracer.endSpan(mcpSpanInfo.span, 'ERROR', {
            errorCategory: 'TOOL_ERROR',
            errorMessage: errorMsg
          });
        }
        return this.toMcpResult(errorMsg, true);
      }

      // 2. Unauthorized Tool Check (Agent Permission Boundary)
      if (!agent.allowedTools.includes(call.name)) {
        const errorMsg = `Unauthorized MCP tool: Agent '${agent.id}' is not authorized to invoke '${call.name}'`;
        if (mcpSpanInfo) {
          defaultTracer.endSpan(mcpSpanInfo.span, 'ERROR', {
            errorCategory: 'AUTHORIZATION_ERROR',
            errorMessage: errorMsg,
            additionalMetadata: { permissionAllowed: false }
          });
        }
        return this.toMcpResult(errorMsg, true);
      }

      // 3. Tool Input Argument Schema Validation
      const toolDef = registry.getTool(call.name)!;
      const inputValidation = toolDef.validateInput(call.arguments);
      if (!inputValidation.valid) {
        const validationErrorMsg = `Malformed arguments for tool '${call.name}': ${inputValidation.errors?.join('; ')}`;
        if (mcpSpanInfo) {
          defaultTracer.endSpan(mcpSpanInfo.span, 'ERROR', {
            errorCategory: 'VALIDATION_ERROR',
            errorMessage: validationErrorMsg,
            additionalMetadata: { schemaValid: false }
          });
        }
        return this.toMcpResult(validationErrorMsg, true);
      }

      // Failure Injection hook for MCP layer
      const injector = getFailureInjector();
      if (injector.isEnabled()) {
        const malformed = injector.getMalformedOutput('MCP', call.name);
        if (malformed !== undefined) {
          if (mcpSpanInfo) {
            defaultTracer.endSpan(mcpSpanInfo.span, 'SUCCESS', {
              retryCount: 0,
              additionalMetadata: { schemaValid: false, simulatedMalformed: true }
            });
          }
          return this.toMcpResult(malformed, false);
        }

        if (injector.shouldFail('MCP', call.name)) {
          await injector.inject('MCP', call.name, context.traceContext?.traceId);
        }
      }

      const response: ToolCallResponse<unknown> = await registry.invokeTool(
        agent,
        call.name,
        call.arguments,
        {
          ...context,
          traceContext: mcpSpanInfo ? mcpSpanInfo.context : context.traceContext
        }
      );

      if (!response.success) {
        if (mcpSpanInfo) {
          defaultTracer.endSpan(mcpSpanInfo.span, 'ERROR', {
            errorCategory: 'TOOL_ERROR',
            errorMessage: response.error,
            retryCount: response.retriesAttempted
          });
        }
        return this.toMcpResult(response.error, true);
      }

      if (mcpSpanInfo) {
        defaultTracer.endSpan(mcpSpanInfo.span, 'SUCCESS', {
          retryCount: response.retriesAttempted,
          additionalMetadata: { schemaValid: true, permissionAllowed: true }
        });
      }

      return this.toMcpResult(response.data, false);
    } catch (err: any) {
      const isTimeout = String(err?.message || '').toLowerCase().includes('timeout');
      const isPerm = String(err?.message || '').toLowerCase().includes('permission') || String(err?.message || '').toLowerCase().includes('unauthorized');
      const rawErrorMsg = err?.message || String(err);
      const safeErrorMsg = SecretScanner.redact(rawErrorMsg);

      if (mcpSpanInfo) {
        defaultTracer.endSpan(mcpSpanInfo.span, isTimeout ? 'TIMEOUT' : 'ERROR', {
          errorCategory: isPerm ? 'AUTHORIZATION_ERROR' : isTimeout ? 'TIMEOUT' : 'TOOL_ERROR',
          errorMessage: safeErrorMsg,
          additionalMetadata: { permissionAllowed: !isPerm }
        });
      }
      return this.toMcpResult(safeErrorMsg, true);
    }
  }
}
