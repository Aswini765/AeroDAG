import React, { useState } from 'react';
import {
  X,
  Cpu,
  ShieldCheck,
  Scale,
  Database,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Repeat
} from 'lucide-react';

interface SystemObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemObservabilityModal: React.FC<SystemObservabilityModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'agents' | 'pipeline'>('metrics');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-mono">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  AeroDAG &bull; Internal System Observability & Portfolio Architecture
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Invisible Layer 2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Admin & Reviewer Telemetry: Tracks guardrails, agent success rates, and constraint checks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 px-4 border-b-2 font-medium transition ${
              activeTab === 'metrics'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Operational Metrics
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-3 px-4 border-b-2 font-medium transition ${
              activeTab === 'agents'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Agent Registry & MCP Tools
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`py-3 px-4 border-b-2 font-medium transition ${
              activeTab === 'pipeline'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            DAG Architecture Trace
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* TAB 1: METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Guardrail Pass Rate</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">98.4%</div>
                  <div className="text-[10px] text-slate-500">Presidio & Jailbreak</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Agent Success Rate</span>
                  <div className="text-xl font-bold font-mono text-teal-400">94.8%</div>
                  <div className="text-[10px] text-slate-500">4 Worker Nodes</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Judge Pass Rate</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">95.0%</div>
                  <div className="text-[10px] text-slate-500">Qualitative & Quant</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Budget Constraint Check</span>
                  <div className="text-xl font-bold font-mono text-sky-400">100%</div>
                  <div className="text-[10px] text-slate-500">Deterministic Engine</div>
                </div>
              </div>

              {/* Telemetry Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live System Latency Breakdown
                </h3>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span>Input Sanitization & Presidio PII Masking:</span>
                    <span className="text-emerald-400">12ms (100% scrubbed)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span>L1 Intent Extraction & Confidence Gate:</span>
                    <span className="text-teal-400">48ms (Score 0.95 &ge; 0.75)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span>Parallel SME Worker Dispatch (Flight, Hotel, Visa, Activity):</span>
                    <span className="text-sky-400">388ms concurrent</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span>Independent LLM-as-a-Judge Capacity & Budget Audit:</span>
                    <span className="text-emerald-400">65ms (Verdict: PASS)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AGENTS & TOOLS */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase font-mono">
                Registered Domain Specialist Worker Agents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">1. Flight Agent (GDS/APIs)</span>
                  <p className="text-slate-400 text-[11px]">
                    Enforces layover caps (&lt;3.5h), guaranteed baggage, adjacent family seats, and price ceilings.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">2. Hotel & Transit Agent</span>
                  <p className="text-slate-400 text-[11px]">
                    Validates room capacity strictly matching party size (4 guests = 2 Queen beds or Connecting Suite).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">3. Consular Visa Agent (RAG)</span>
                  <p className="text-slate-400 text-[11px]">
                    Verifies official government e-Visa fees ($25/traveler), 3-5 days turnaround, and 6-month passport validity.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs">4. Activity & Itinerary Agent</span>
                  <p className="text-slate-400 text-[11px]">
                    Schedules kid-friendly pacing, avoids mid-day transit fatigue, and maps local authentic dining.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PIPELINE TRACE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-xs font-bold text-slate-200 uppercase">
                Underlying 5-Stage Micro-Agent DAG Flow
              </h3>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 leading-relaxed text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">Phase 1:</span>
                  <span>Input Scrubbing & Presidio PII Masking ([REDACTED_EMAIL], [REDACTED_PHONE]).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">Phase 2:</span>
                  <span>Intent Parsing & Decision Gate (Confidence 0.95 &ge; 0.75 &rarr; Route Forward).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">Phase 3:</span>
                  <span>Puppeteer Supervisor Prompt Expansion & Parallel SME Worker Execution.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">Phase 4:</span>
                  <span>LLM-as-a-Judge Capacity Audit (4 seats, 4 beds) & Budget Check (Score 95% &ge; 85% PASS).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-teal-400 font-bold">Phase 5:</span>
                  <span>Post-PII Scrub, Redis Session & Graph DB State Update, Consumer Booking CTAs.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>AeroDAG Layer 2 Architecture Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Observability Panel
          </button>
        </div>
      </div>
    </div>
  );
};
