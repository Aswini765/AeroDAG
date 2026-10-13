/**
 * AeroDAG Central Guardrail Pipeline
 * 
 * Provides unified entry points across all AI safety stages:
 * Input Guardrails -> Tool Guardrails -> Output Guardrails -> Claim Auditing.
 */

import {
  GuardrailDecision,
  GuardrailContext,
  ClaimItem,
  ClaimAuditResult
} from './types';
import { getInputGuardrailPipeline, InputPipelineResult } from './input/inputGuardrailPipeline';
import { getToolGuardrail, ToolCallInvocation } from './tool/toolGuardrail';
import { getOutputGuardrailPipeline, OutputPipelineResult } from './output/outputGuardrailPipeline';
import { ClaimAuditor } from './audit/claimAuditor';
import { RegulatoryGuardrail } from './audit/regulatoryGuardrail';
import { RagInjectionDefense } from './rag/ragInjectionDefense';
import { TripPlan } from '../../types/travelBooking';
import { KnowledgeChunk } from '../../types/travelKnowledge';

export class GuardrailPipeline {
  private readonly inputPipeline = getInputGuardrailPipeline();
  private readonly toolGuardrail = getToolGuardrail();
  private readonly outputPipeline = getOutputGuardrailPipeline();
  private readonly regulatoryGuardrail = new RegulatoryGuardrail();

  /**
   * Evaluates and sanitizes raw user input
   */
  async processInput(rawInput: string, context?: GuardrailContext): Promise<InputPipelineResult> {
    return this.inputPipeline.process(rawInput, context);
  }

  /**
   * Enforces tool execution boundary and parameter sanity
   */
  evaluateToolCall(invocation: ToolCallInvocation, context?: GuardrailContext): GuardrailDecision {
    return this.toolGuardrail.evaluate(invocation, context);
  }

  /**
   * Audits and repairs generated trip plans
   */
  async processOutput(plan: TripPlan, context?: GuardrailContext): Promise<OutputPipelineResult> {
    return this.outputPipeline.process(plan, context);
  }

  /**
   * Audits factual claims against retrieved evidence and domain models
   */
  auditClaims(
    claims: ClaimItem[],
    options: {
      retrievedKnowledge?: KnowledgeChunk[];
      tripPlan?: TripPlan;
      destination?: string;
    }
  ): ClaimAuditResult {
    return ClaimAuditor.auditClaims(claims, options);
  }

  /**
   * Audits regulatory and visa responses
   */
  evaluateRegulatory(
    destination: string,
    content: string,
    retrievedChunks: KnowledgeChunk[],
    context?: GuardrailContext
  ): GuardrailDecision {
    return this.regulatoryGuardrail.evaluate(
      {
        destination,
        responseContent: content,
        retrievedChunks
      },
      context
    );
  }

  /**
   * Sanitizes retrieved knowledge chunks before model prompt construction
   */
  wrapRetrievedKnowledge(chunks: KnowledgeChunk[]): string {
    return RagInjectionDefense.wrapKnowledgeAsData(chunks);
  }
}

let globalGuardrailPipeline: GuardrailPipeline | null = null;

export function getGuardrailPipeline(): GuardrailPipeline {
  if (!globalGuardrailPipeline) {
    globalGuardrailPipeline = new GuardrailPipeline();
  }
  return globalGuardrailPipeline;
}
