import React from 'react';
import {
  ShieldAlert,
  Route,
  Cpu,
  Scale,
  Database,
  ArrowRight,
  Repeat,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export const ArchitectureBlueprintView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Blueprint Header */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              Autonomous Micro-Agent Travel Orchestration Architecture Blueprint
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              DAG Specification v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Architectural reference corresponding to the micro-agent DAG system specification diagram.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Service/Agent Nodes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>API Integrations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>State & Vector Stores</span>
          </div>
        </div>
      </div>

      {/* Interactive Blueprint Schematic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Phase 1 Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>1. Ingestion & Guardrails</span>
            <span className="text-emerald-400">Input Phase</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ingests raw user query string, strips malicious prompt injection patterns, redacts PII using Presidio NER/regex, and normalizes geographic entities.
          </p>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Input Sanitization & Pre-Processing
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              • PII Detection & Masking (Presidio)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Spam & Abuse Detection
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Fact-Checking & Normalization
            </div>
          </div>
        </div>

        {/* Phase 2 Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>2. Intent & Routing</span>
            <span className="text-cyan-400">Decision Gate</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deconstructs L1 intent into structured JSON. If state confidence is &lt; 0.75, asks clarifying questions. If &ge; 0.75, routes forward.
          </p>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Intent Deconstruction (L1)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Context (Budget, Dates, Party)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • User Profile Enrichment
            </div>
            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300">
              • Decision Gate: Conf &ge; 0.75
            </div>
          </div>
        </div>

        {/* Phase 3 Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>3. Puppeteer & SMEs</span>
            <span className="text-emerald-400">Orchestrator</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Puppeteer expands 1-line prompt into 10-25 line directives per domain worker, and invokes 4 domain workers in parallel.
          </p>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-semibold">
              • System Prompt Expansion (1-to-50)
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              ✈️ Flight Agent (APIs/GDS)
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              🏨 Hotel & Transit Agent
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              📋 Visa & Docs Agent (RAG)
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              🗺️ Activity & Local Agent
            </div>
          </div>
        </div>

        {/* Phase 4 Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>4. LLM Judge & QA</span>
            <span className="text-purple-400">Judicial Gate</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Independent evaluation agent checks party capacity, budget tier adherence, and consular rules. If score &lt; 85%, loops back to Puppeteer with critique.
          </p>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Evaluation Agent Judicial Check
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              • Capacity & Budget Audits
            </div>
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
              • Semantic Gate: Score &ge; 85%
            </div>
            <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              <span>Feedback Loop (if &lt; 85%)</span>
            </div>
          </div>
        </div>

        {/* Phase 5 Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>5. Post-Process & State</span>
            <span className="text-amber-400">Persistence</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Safety scrub to ensure zero credential or prompt leakage, dual-tier state persistence (Redis + Graph DB), and interactive consumer CTAs.
          </p>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-300">
              • Safety Scrub / Post-PII
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300">
              • Redis Short-Term Session Cache
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-purple-300">
              • Long-Term Graph DB / Vector
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-amber-300">
              • Celery / Temporal Push Nudges
            </div>
          </div>
        </div>
      </div>

      {/* Deep Architectural Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-400" />
            The Micro-Agent DAG Execution Advantage
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Rather than relying on a single monolithic prompt, AeroDAG deconstructs the travel problem into specialized autonomous domain workers (Flight GDS, Hotel CRS, Consular RAG, and Local Scheduler) executing strictly within explicit bounds set by The Puppeteer supervisor.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-400" />
            LLM-as-a-Judge Re-Evaluation Loop
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Phase 4 acts as an independent adversarial auditor. If the aggregated hotel capacity, ticket headcount, or price fails the hard constraints, it generates an explicit Evaluator Critique and forces the Puppeteer to re-tune directives, resolving errors before traveler delivery.
          </p>
        </div>
      </div>
    </div>
  );
};
