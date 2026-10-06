import React, { useState } from 'react';
import { Route, CheckCircle, AlertTriangle, Copy, Check, Users, DollarSign, Calendar, Compass, ArrowRight } from 'lucide-react';
import { Phase2Intent } from '../../src/types/orchestrator';

interface Phase2Props {
  phase2: Phase2Intent;
  onProvideClarifications?: (answers: { destination?: string; origin?: string; partySize?: number; budgetTier?: string }) => void;
}

export const Phase2IntentRoutingView: React.FC<Phase2Props> = ({ phase2, onProvideClarifications }) => {
  const [copied, setCopied] = useState(false);
  const [clarifyDest, setClarifyDest] = useState('Vietnam (Hanoi & Halong Bay)');
  const [clarifyParty, setClarifyParty] = useState('4');
  const [clarifyBudget, setClarifyBudget] = useState('Frugal');

  const handleCopy = () => {
    navigator.clipboard.writeText(phase2.jsonBlock);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPassed = phase2.decisionGateVerdict === 'ROUTE_FORWARD';

  return (
    <div className="space-y-6">
      {/* Top Status Header & Decision Gate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isPassed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isPassed ? <Route className="h-6 w-6 text-emerald-400" /> : <AlertTriangle className="h-6 w-6 text-amber-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Phase 2: Intent Parsing & Routing
              </h2>
              <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isPassed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {isPassed ? 'DECISION GATE: ROUTE FORWARD (>= 0.75)' : 'DECISION GATE: CLARIFICATION REQUIRED (< 0.75)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              L1 semantic deconstruction, party headcount, budget tier constraints, and persona enrichment.
            </p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2">
            <span>Confidence Score:</span>
            <span className={`text-sm font-bold ${phase2.confidenceScore >= 0.75 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {phase2.confidenceScore.toFixed(2)} / 1.00
            </span>
          </div>
        </div>
      </div>

      {/* Decision Gate Explanation */}
      <div className={`p-4 rounded-xl border ${
        isPassed
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-start gap-3">
          {isPassed ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider font-mono">
              Decision Gate Logic: {isPassed ? 'Confidence >= 0.75 -> Routing to Puppeteer Orchestrator' : 'Confidence < 0.75 -> Clarification Questions Triggered'}
            </div>
            <p className="text-xs mt-1 text-slate-300 leading-relaxed">
              {isPassed
                ? 'All foundational constraints (destination territory, origin, headcount, budget tier, duration) were extracted with high semantic certitude. Forwarding downstream to Central Orchestrator & Supervisor.'
                : 'The input lacked critical constraints required to safely invoke GDS flight and hotel APIs without generating arbitrary guesses. Active clarification required below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Clarification Responder if Confidence < 0.75 */}
      {!isPassed && phase2.clarifyingQuestions && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-amber-300 uppercase font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Clarifying Questions Posed to Traveler
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Decision Gate Triggered</span>
          </div>

          <div className="space-y-2 text-xs">
            {phase2.clarifyingQuestions.map((q, idx) => (
              <div key={idx} className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-slate-200 flex items-start gap-2">
                <span className="text-amber-400 font-mono font-bold">Q{idx + 1}:</span>
                <span>{q}</span>
              </div>
            ))}
          </div>

          {onProvideClarifications && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <span className="text-xs text-slate-300 font-medium block">
                Provide Clarifications to Advance Decision Gate:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Destination</label>
                  <input
                    type="text"
                    value={clarifyDest}
                    onChange={(e) => setClarifyDest(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Party Size</label>
                  <input
                    type="number"
                    value={clarifyParty}
                    onChange={(e) => setClarifyParty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono">Budget Tier</label>
                  <select
                    value={clarifyBudget}
                    onChange={(e) => setClarifyBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Frugal">Frugal (Value-Conscious)</option>
                    <option value="Moderate">Moderate (Comfort)</option>
                    <option value="Luxury">Luxury (Premium)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() =>
                  onProvideClarifications({
                    destination: clarifyDest,
                    partySize: parseInt(clarifyParty, 10) || 4,
                    budgetTier: clarifyBudget
                  })
                }
                className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition"
              >
                <span>Submit Clarifications & Advance to Orchestrator</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visual Parsed Parameters Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>Destination & Origin</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {phase2.parameters.destination}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            From: {phase2.parameters.origin}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>Dates & Duration</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {phase2.parameters.durationDays} Days / {phase2.parameters.durationDays - 1} Nights
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Window: {phase2.parameters.targetDates}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>Party Size & Cohort</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {phase2.parameters.partySize} Travelers
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {phase2.parameters.adultsCount} Adults, {phase2.parameters.childrenCount} Children
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            <span>Budget Tier & Ceiling</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {phase2.parameters.budgetTier} Tier
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Ceiling: ${phase2.parameters.exactBudgetCeilingUSD.toLocaleString()} USD
          </div>
        </div>
      </div>

      {/* Behavioral Persona Enrichment */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Behavioral Persona:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium">
            {phase2.parameters.behavioralPersona}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Purpose: {phase2.parameters.travelPurpose}
        </div>
      </div>

      {/* Explicit Output: Structured JSON Block */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
            Output: Structured Intent JSON Payload (L1 Schema)
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1 transition"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed bg-slate-950 max-h-96">
          {phase2.jsonBlock}
        </pre>
      </div>
    </div>
  );
};
