import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Repeat,
  ShieldCheck,
  DollarSign,
  Users,
  FileCheck,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { Phase4JudicialReview } from '../../src/types/orchestrator';

interface Phase4Props {
  phase4: Phase4JudicialReview;
  onTriggerSimulatedLoopback?: () => void;
}

export const Phase4JudgeQAView: React.FC<Phase4Props> = ({
  phase4,
  onTriggerSimulatedLoopback
}) => {
  const isPass = phase4.decision === 'PASS';
  const hasLooped = phase4.loopbackCount > 0;

  return (
    <div className="space-y-6">
      {/* Top Judicial Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isPass
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Phase 4: LLM-As-A-Judge & QA Quality Assurance
              </h2>
              <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isPass
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {isPass ? 'JUDICIAL VERDICT: PASS (>= 85%)' : 'JUDICIAL VERDICT: FAIL (< 85%)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Independent judicial evaluation performing party capacity, budget verification, and regulatory audits.
            </p>
          </div>
        </div>

        {/* Semantic Score Meter */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2">
            <span>Semantic Confidence:</span>
            <span className={`text-base font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
              {phase4.semanticConfidenceScore}%
            </span>
            <span className="text-[10px] text-slate-500">/ Threshold 85%</span>
          </div>
        </div>
      </div>

      {/* Decision Gate Card */}
      <div className={`p-4 rounded-xl border ${
        isPass
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isPass ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider font-mono">
                {isPass
                  ? 'Semantic Confidence Gate: Cleared (Score >= 85%) -> Proceeding to Post-Processing'
                  : 'Semantic Confidence Gate: Failed (Score < 85%) -> Evaluator Critique Generated'}
              </div>
              <p className="text-xs mt-1 text-slate-300 leading-relaxed">
                {phase4.summary}
              </p>
            </div>
          </div>

          {/* Test loopback trigger button */}
          {onTriggerSimulatedLoopback && (
            <button
              onClick={onTriggerSimulatedLoopback}
              className="text-xs font-mono text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <RotateCcw className="h-3 w-3 text-cyan-400" />
              Simulate QA Loopback
            </button>
          )}
        </div>
      </div>

      {/* Evaluator Critique Box (if failed or looped) */}
      {phase4.evaluatorCritique && (
        <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-mono font-semibold text-rose-300 uppercase flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-rose-400 animate-spin" />
              Evaluator Critique & Feedback Re-Evaluation Directives
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30">
              Iteration {phase4.loopbackCount}
            </span>
          </div>
          <pre className="text-xs font-mono text-rose-200 whitespace-pre-wrap leading-relaxed">
            {phase4.evaluatorCritique}
          </pre>
        </div>
      )}

      {/* Three Quantitative / Qualitative Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Audit 1: Party Capacity */}
        <div className={`p-4 rounded-xl border space-y-3 ${
          phase4.partyCapacityPass
            ? 'bg-slate-900/40 border-slate-800'
            : 'bg-rose-950/20 border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white">Party Capacity Audit</h3>
            </div>
            {phase4.partyCapacityPass ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                VERIFIED
              </span>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                FAILED
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-[11px] text-slate-300">
              {phase4.audits[0]?.details || 'Flight tickets and room bedding strictly accommodate party size.'}
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-400">
              <div>Expected: <span className="text-slate-200">{phase4.audits[0]?.metricExpected}</span></div>
              <div>Observed: <span className="text-emerald-400">{phase4.audits[0]?.metricObserved}</span></div>
            </div>
          </div>
        </div>

        {/* Audit 2: Budget Verification */}
        <div className={`p-4 rounded-xl border space-y-3 ${
          phase4.budgetVerificationPass
            ? 'bg-slate-900/40 border-slate-800'
            : 'bg-rose-950/20 border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white">Budget Tier Verification</h3>
            </div>
            {phase4.budgetVerificationPass ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ALIGNED
              </span>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                OVER BUDGET
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-[11px] text-slate-300">
              {phase4.audits[1]?.details || 'Total aggregated sum aligns with the requested budget tier.'}
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-400">
              <div>Expected: <span className="text-slate-200">{phase4.audits[1]?.metricExpected}</span></div>
              <div>Observed: <span className="text-amber-400">{phase4.audits[1]?.metricObserved}</span></div>
            </div>
          </div>
        </div>

        {/* Audit 3: Regulatory Accuracy */}
        <div className={`p-4 rounded-xl border space-y-3 ${
          phase4.regulatoryAccuracyPass
            ? 'bg-slate-900/40 border-slate-800'
            : 'bg-rose-950/20 border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white">Regulatory Accuracy</h3>
            </div>
            {phase4.regulatoryAccuracyPass ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACCURATE
              </span>
            ) : (
              <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                DISCREPANCY
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-[11px] text-slate-300">
              {phase4.audits[2]?.details || 'Consular entry regulations cross-checked against 2026 immigration directives.'}
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-400">
              <div>Standard: <span className="text-slate-200">{phase4.audits[2]?.metricExpected}</span></div>
              <div>Observed: <span className="text-cyan-400">{phase4.audits[2]?.metricObserved}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Judicial Review Summary Table */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
            Output: Judicial Evaluation Report & Quantitative Verification
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Verdict: {phase4.decision}
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs font-mono text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-900/50 border border-slate-800">
            {phase4.summary}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Party Capacity</span>
              <strong className={phase4.partyCapacityPass ? 'text-emerald-400' : 'text-rose-400'}>
                {phase4.partyCapacityPass ? '100% PASS' : 'FAIL'}
              </strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Budget Alignment</span>
              <strong className={phase4.budgetVerificationPass ? 'text-emerald-400' : 'text-rose-400'}>
                {phase4.budgetVerificationPass ? '100% PASS' : 'FAIL'}
              </strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Regulatory Check</span>
              <strong className={phase4.regulatoryAccuracyPass ? 'text-emerald-400' : 'text-rose-400'}>
                {phase4.regulatoryAccuracyPass ? '100% PASS' : 'FAIL'}
              </strong>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Aggregate Score</span>
              <strong className={isPass ? 'text-emerald-400' : 'text-rose-400'}>
                {phase4.semanticConfidenceScore}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
