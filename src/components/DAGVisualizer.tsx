import React from 'react';
import {
  ShieldAlert,
  Search,
  Cpu,
  Plane,
  Building,
  FileText,
  Compass,
  Scale,
  Database,
  ArrowRight,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { PipelineExecutionResult } from '../types/orchestrator';

interface DAGVisualizerProps {
  result: PipelineExecutionResult | null;
  activePhase: number;
  setActivePhase: (phase: number) => void;
  isRunning?: boolean;
}

export const DAGVisualizer: React.FC<DAGVisualizerProps> = ({
  result,
  activePhase,
  setActivePhase,
  isRunning = false
}) => {
  const p1Passed = result?.phase1?.passed;
  const p2Gate = result?.phase2?.decisionGateVerdict;
  const p3Done = !!result?.phase3;
  const p4Decision = result?.phase4?.decision;
  const p4Looped = (result?.phase4?.loopbackCount || 0) > 0;
  const p5Done = !!result?.phase5;

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Header & Legend */}
      <div className="relative z-10 flex flex-wrap items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
              Live Micro-Agent Execution Graph
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              DAG Flow v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any phase box to inspect deep telemetry, prompt expansions, and execution directives.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
            <span>Completed / Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Clarification / Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>Security Block / Loop</span>
          </div>
        </div>
      </div>

      {/* 5-Phase Horizontal DAG Diagram */}
      <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-5 gap-3.5 items-stretch">
        {/* Phase 1: Ingestion & Guardrails */}
        <div
          onClick={() => setActivePhase(1)}
          className={`cursor-pointer rounded-xl p-3.5 transition-all relative flex flex-col justify-between border ${
            activePhase === 1
              ? 'ring-2 ring-emerald-400 bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <span className="font-bold text-white">1.</span> Ingestion & Guardrails
              </span>
              {p1Passed === true ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : p1Passed === false ? (
                <ShieldAlert className="h-4 w-4 text-rose-400" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-600" />
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Input Sanitization</span>
                <span className="text-emerald-400 font-mono text-[10px]">Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Presidio PII Masking</span>
                <span className="text-cyan-400 font-mono text-[10px]">
                  {result?.phase1?.piiDetected?.length || 0} Redacted
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Spam & Abuse Scrub</span>
                <span className="text-emerald-400 font-mono text-[10px]">Verified</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Fact-Check / Geo-Norm</span>
                <span className="text-slate-400 font-mono text-[10px]">2026 DB</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Safety Gate</span>
            <span className={p1Passed ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {p1Passed ? 'CLEARED' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Phase 2: Intent Parsing & Routing */}
        <div
          onClick={() => setActivePhase(2)}
          className={`cursor-pointer rounded-xl p-3.5 transition-all relative flex flex-col justify-between border ${
            activePhase === 2
              ? 'ring-2 ring-emerald-400 bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <span className="font-bold text-white">2.</span> Intent & Routing
              </span>
              {p2Gate === 'ROUTE_FORWARD' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : p2Gate === 'ASK_CLARIFYING' ? (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-600" />
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Intent Deconstruct (L1)</span>
                <span className="text-cyan-400 font-mono text-[10px]">Extracted</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Budget & Party Size</span>
                <span className="text-slate-200 font-mono text-[10px]">
                  {result?.phase2?.parameters ? `${result.phase2.parameters.partySize}p / ${result.phase2.parameters.budgetTier}` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Persona Enrichment</span>
                <span className="text-emerald-400 font-mono text-[10px]">Classified</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Confidence Score</span>
                <span className="font-mono text-[10px] font-bold text-emerald-300">
                  {result?.phase2?.confidenceScore !== undefined ? result.phase2.confidenceScore.toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">Decision Gate</span>
            <span className={p2Gate === 'ROUTE_FORWARD' ? 'text-emerald-400 font-bold' : p2Gate === 'ASK_CLARIFYING' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {p2Gate === 'ROUTE_FORWARD' ? '&ge; 0.75 FORWARD' : p2Gate === 'ASK_CLARIFYING' ? '&lt; 0.75 CLARIFY' : 'WAITING'}
            </span>
          </div>
        </div>

        {/* Phase 3: Central Orchestrator & Supervisor ("Puppeteer") + SMEs */}
        <div
          onClick={() => setActivePhase(3)}
          className={`cursor-pointer rounded-xl p-3.5 transition-all relative flex flex-col justify-between border ${
            activePhase === 3
              ? 'ring-2 ring-emerald-400 bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <span className="font-bold text-white">3.</span> Puppeteer & SMEs
              </span>
              {p3Done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Cpu className="h-4 w-4 text-slate-500" />
              )}
            </div>

            <div className="text-[10px] font-mono text-cyan-400/90 mb-1.5 flex items-center justify-between bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              <span>DAG Execution Planning</span>
              <span>1-to-50 Line Exp</span>
            </div>

            {/* 4 Parallel Worker Pills */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center gap-1 text-slate-300">
                <Plane className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                <span className="truncate">Flight GDS</span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center gap-1 text-slate-300">
                <Building className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">Hotel/Bed</span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center gap-1 text-slate-300">
                <FileText className="h-3 w-3 text-amber-400 flex-shrink-0" />
                <span className="truncate">Visa RAG</span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center gap-1 text-slate-300">
                <Compass className="h-3 w-3 text-purple-400 flex-shrink-0" />
                <span className="truncate">Activity/Eat</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>SME Invocation</span>
            <span className={p3Done ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {p3Done ? '4 PARALLEL DONE' : 'QUEUED'}
            </span>
          </div>
        </div>

        {/* Phase 4: LLM-As-A-Judge & QA */}
        <div
          onClick={() => setActivePhase(4)}
          className={`cursor-pointer rounded-xl p-3.5 transition-all relative flex flex-col justify-between border ${
            activePhase === 4
              ? 'ring-2 ring-emerald-400 bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
          }`}
        >
          {/* Re-evaluation loop badge */}
          {p4Looped && (
            <div className="absolute -top-2 -right-2 bg-rose-500/90 text-white text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-rose-500/30">
              <Repeat className="h-2.5 w-2.5 animate-spin" />
              Feedback Loopback
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <span className="font-bold text-white">4.</span> LLM Judge & QA
              </span>
              {p4Decision === 'PASS' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : p4Decision === 'FAIL' ? (
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              ) : (
                <Scale className="h-4 w-4 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Party Capacity Audit</span>
                <span className={result?.phase4?.partyCapacityPass ? 'text-emerald-400 font-mono text-[10px]' : 'text-slate-400 text-[10px]'}>
                  {result?.phase4 ? (result.phase4.partyCapacityPass ? 'Exact Match' : 'Mismatch') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Budget Tier Verify</span>
                <span className={result?.phase4?.budgetVerificationPass ? 'text-emerald-400 font-mono text-[10px]' : 'text-slate-400 text-[10px]'}>
                  {result?.phase4 ? (result.phase4.budgetVerificationPass ? 'Within Tier' : 'Over budget') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Regulatory Check</span>
                <span className="text-emerald-400 font-mono text-[10px]">
                  {result?.phase4 ? 'Timatic Valid' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Semantic Score</span>
                <span className="font-mono text-[10px] font-bold text-emerald-300">
                  {result?.phase4?.semanticConfidenceScore !== undefined ? `${result.phase4.semanticConfidenceScore}%` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">Judicial Gate</span>
            <span className={p4Decision === 'PASS' ? 'text-emerald-400 font-bold' : p4Decision === 'FAIL' ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              {p4Decision === 'PASS' ? '&ge; 85% PASS' : p4Decision === 'FAIL' ? '&lt; 85% LOOPBACK' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Phase 5: Post-Processing & State Update */}
        <div
          onClick={() => setActivePhase(5)}
          className={`cursor-pointer rounded-xl p-3.5 transition-all relative flex flex-col justify-between border ${
            activePhase === 5
              ? 'ring-2 ring-emerald-400 bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <span className="font-bold text-white">5.</span> Post-Process & State
              </span>
              {p5Done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Database className="h-4 w-4 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Post-PII Scrub</span>
                <span className="text-emerald-400 font-mono text-[10px]">Certified</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Short-Term (Redis)</span>
                <span className="text-cyan-400 font-mono text-[10px]">Session Cached</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Long-Term (Graph DB)</span>
                <span className="text-purple-400 font-mono text-[10px]">6 Triples</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <span>Celery/Temporal Push</span>
                <span className="text-amber-400 font-mono text-[10px]">4 Nudges</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Persistence</span>
            <span className={p5Done ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {p5Done ? 'COMMITTED' : 'AWAITING'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Feedback Loop Arrow Notice if re-evaluation occurred */}
      {p4Looped && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-rose-400 animate-spin" />
            <span>
              <strong>Judicial Feedback Loop Triggered:</strong> Candidate iteration 1 had financial variance exceeding budget ceiling. Puppeteer executed re-evaluation directive to SME workers, re-tuned fare classes, and passed on iteration 2!
            </span>
          </div>
          <span className="font-mono text-[10px] bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 text-rose-200">
            Loopback Resolved
          </span>
        </div>
      )}
    </div>
  );
};
