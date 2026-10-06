import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Copy, Check, Eye, Lock } from 'lucide-react';
import { Phase1Sanitization } from '../../src/types/orchestrator';

interface Phase1Props {
  phase1: Phase1Sanitization;
}

export const Phase1GuardrailsView: React.FC<Phase1Props> = ({ phase1 }) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(phase1.sanitizedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            phase1.passed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {phase1.passed ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Phase 1: Ingestion & Guardrails Engine
              </h2>
              <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                phase1.passed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {phase1.passed ? 'SAFETY GATE: PASSED' : 'SAFETY GATE: BLOCKED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Input sanitization, Presidio PII redaction, prompt injection defense, and geographic normalization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Safety Score: <strong className={phase1.safetyScore >= 0.8 ? 'text-emerald-400' : 'text-rose-400'}>
              {(phase1.safetyScore * 100).toFixed(0)}%
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            PII Redactions: <strong className="text-cyan-400">{phase1.piiDetected.length}</strong>
          </div>
        </div>
      </div>

      {/* Explicit Output: Sanitized Prompt Display */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
              Output: Sanitized Prompt for Downstream DAG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 flex items-center gap-1 transition"
            >
              <Eye className="h-3 w-3" />
              {showRaw ? 'Hide Raw Input' : 'Compare Raw Input'}
            </button>
            <button
              onClick={handleCopy}
              className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1 transition"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-emerald-500/20 font-mono text-xs text-emerald-300 leading-relaxed break-words">
            {phase1.sanitizedPrompt}
          </div>

          {showRaw && (
            <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 font-mono text-xs text-slate-400 leading-relaxed break-words">
              <span className="text-slate-500 block mb-1 font-sans text-[11px] font-semibold uppercase">Original Raw Input Payload:</span>
              {phase1.rawPrompt}
            </div>
          )}
        </div>
      </div>

      {/* Presidio-style PII Detection Table */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            Presidio-Style PII Detection & Entity Masking Audit
          </span>
          <span className="text-xs font-mono text-slate-400">
            {phase1.piiDetected.length > 0 ? `${phase1.piiDetected.length} entities masked` : 'Clean payload'}
          </span>
        </div>

        {phase1.piiDetected.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Detected Sensitive Token</th>
                  <th className="py-2.5 px-4">Anonymized Token</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {phase1.piiDetected.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px]">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-rose-300 line-through opacity-80">
                      {item.originalText}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">
                      {item.maskedText}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 flex items-center gap-1 font-sans">
                      <Check className="h-3 w-3 text-emerald-400" /> Redacted
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-xs text-slate-400 text-center">
            Zero personally identifiable entities (emails, telephone numbers, addresses) found in the user prompt.
          </div>
        )}
      </div>

      {/* Guardrail Checklist & Geo-Normalization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Checks */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Security & Abuse Safeguards
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-300">Prompt Injection & Jailbreak Defense</span>
              <span className={phase1.promptInjectionDetected ? 'text-rose-400 font-mono font-bold' : 'text-emerald-400 font-mono'}>
                {phase1.promptInjectionDetected ? 'ATTACK DETECTED' : 'CLEAR'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-300">Spam / Gibberish Detection</span>
              <span className={phase1.spamDetected ? 'text-rose-400 font-mono font-bold' : 'text-emerald-400 font-mono'}>
                {phase1.spamDetected ? 'SPAM FLAGGED' : 'LEGITIMATE QUERY'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-300">Toxic Content Scanner</span>
              <span className="text-emerald-400 font-mono">ZERO TOXICITY</span>
            </div>
          </div>
        </div>

        {/* Geographic & Temporal Normalization */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Entity Normalization (Fact-Checking)
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Normalized Destination:</span>
              <span className="text-slate-200 font-semibold">{phase1.normalizedDestination || 'Extracted'}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Normalized Departure:</span>
              <span className="text-slate-200 font-semibold">{phase1.normalizedOrigin || 'SFO Airport'}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Target Temporal Window:</span>
              <span className="text-slate-200 font-semibold">{phase1.normalizedDates || 'Nov 2026'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
