/**
 * AeroDAG Input Guardrail Pipeline
 * 
 * Orchestrates all input stage guardrails before requests reach the
 * requirement engine, RAG pipeline, or travel agents.
 */

import { GuardrailDecision, GuardrailContext } from '../types';
import { GuardrailTelemetry } from '../telemetry';
import { getTelemetryTracer } from '../../telemetry';
import { NormalizationGuardrail } from './normalizationGuardrail';
import { OversizedInputGuardrail } from './oversizedInputGuardrail';
import { AbuseGuardrail } from './abuseGuardrail';
import { PromptInjectionGuardrail } from './promptInjectionGuardrail';
import { PIIGuardrail, PIIFinding } from './piiGuardrail';

export interface InputPipelineResult {
  allowed: boolean;
  sanitizedInput: string;
  blockedDecision?: GuardrailDecision;
  decisions: GuardrailDecision[];
  piiFindings: PIIFinding[];
}

export class InputGuardrailPipeline {
  private readonly normalizationGuardrail = new NormalizationGuardrail();
  private readonly oversizedGuardrail = new OversizedInputGuardrail();
  private readonly abuseGuardrail = new AbuseGuardrail();
  private readonly injectionGuardrail = new PromptInjectionGuardrail();
  private readonly piiGuardrail = new PIIGuardrail();

  async process(rawInput: string, context?: GuardrailContext): Promise<InputPipelineResult> {
    const startTime = Date.now();
    const decisions: GuardrailDecision[] = [];
    const requestId = context?.requestId || `req_${Date.now()}`;

    // 1. Normalization
    const normDecision = this.normalizationGuardrail.evaluate(rawInput, context);
    decisions.push(normDecision);
    const normalizedInput = (normDecision.metadata?.normalized as string) ?? rawInput;

    // 2. Oversized Input Guardrail
    const sizeDecision = this.oversizedGuardrail.evaluate(normalizedInput, context);
    decisions.push(sizeDecision);
    if (sizeDecision.decision === 'BLOCK') {
      this.recordTelemetry(sizeDecision, requestId, Date.now() - startTime, context);
      return {
        allowed: false,
        sanitizedInput: normalizedInput,
        blockedDecision: sizeDecision,
        decisions,
        piiFindings: []
      };
    }

    // 3. Abuse & Malicious Payload Guardrail
    const abuseDecision = this.abuseGuardrail.evaluate(normalizedInput, context);
    decisions.push(abuseDecision);
    if (abuseDecision.decision === 'BLOCK') {
      this.recordTelemetry(abuseDecision, requestId, Date.now() - startTime, context);
      return {
        allowed: false,
        sanitizedInput: normalizedInput,
        blockedDecision: abuseDecision,
        decisions,
        piiFindings: []
      };
    }

    // 4. Prompt Injection Guardrail
    const injectionDecision = this.injectionGuardrail.evaluate(normalizedInput, context);
    decisions.push(injectionDecision);
    if (injectionDecision.decision === 'BLOCK') {
      this.recordTelemetry(injectionDecision, requestId, Date.now() - startTime, context);
      return {
        allowed: false,
        sanitizedInput: normalizedInput,
        blockedDecision: injectionDecision,
        decisions,
        piiFindings: []
      };
    }

    // 5. PII Detection & Redaction
    const piiDecision = this.piiGuardrail.evaluate(normalizedInput, context);
    decisions.push(piiDecision);
    const piiFindings = this.piiGuardrail.detectFindings(normalizedInput);

    if (piiDecision.decision === 'BLOCK') {
      this.recordTelemetry(piiDecision, requestId, Date.now() - startTime, context);
      return {
        allowed: false,
        sanitizedInput: this.piiGuardrail.getRedactedText(normalizedInput),
        blockedDecision: piiDecision,
        decisions,
        piiFindings
      };
    }

    const sanitizedInput = this.piiGuardrail.getRedactedText(normalizedInput);

    // Record telemetry for successful input evaluation
    this.recordTelemetry(
      {
        decision: 'ALLOW',
        guardrailId: 'input-pipeline',
        severity: 'LOW',
        metadata: { piiCount: piiFindings.length }
      },
      requestId,
      Date.now() - startTime,
      context
    );

    return {
      allowed: true,
      sanitizedInput,
      decisions,
      piiFindings
    };
  }

  private recordTelemetry(
    decision: GuardrailDecision,
    requestId: string,
    latencyMs: number,
    context?: GuardrailContext
  ): void {
    const traceId = context?.traceContext?.traceId || context?.traceId;
    if (context?.traceContext) {
      try {
        const tracer = getTelemetryTracer();
        const span = tracer.startSpan(`guardrail_${decision.guardrailId}`, 'guardrail', context.traceContext, {
          decision: decision.decision,
          severity: decision.severity,
          reason: decision.reason
        });
        tracer.endSpan(span.spanId, decision.decision === 'BLOCK' ? 'ERROR' : 'SUCCESS');
      } catch {
        // Safe telemetry fallback
      }
    }

    GuardrailTelemetry.record({
      requestId,
      traceId,
      guardrailId: decision.guardrailId,
      stage: 'input',
      decision: decision.decision,
      severity: decision.severity,
      timestamp: new Date().toISOString(),
      latencyMs,
      safeMetadata: {
        reason: decision.reason
      }
    });
  }
}

let globalInputPipeline: InputGuardrailPipeline | null = null;

export function getInputGuardrailPipeline(): InputGuardrailPipeline {
  if (!globalInputPipeline) {
    globalInputPipeline = new InputGuardrailPipeline();
  }
  return globalInputPipeline;
}
