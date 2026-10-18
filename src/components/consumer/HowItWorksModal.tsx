import React, { useState } from 'react';
import {
  X,
  Cpu,
  BookOpen,
  ShieldCheck,
  Calculator,
  ExternalLink,
  CheckCircle2,
  Lock,
  Workflow
} from 'lucide-react';
import { SEED_KNOWLEDGE_DOCUMENTS } from '../../services/rag/knowledgeData';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'knowledge' | 'verification' | 'budget'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card-consumer max-w-4xl w-full max-h-[90vh] flex flex-col bg-[#FFFFFF] shadow-2xl animate-fade-in-slide overflow-hidden text-left">
        {/* Top Header */}
        <div className="p-5 border-b border-[#E2E6E1] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#15201D] font-heading">
              How AeroDAG Works
            </h2>
            <p className="text-xs text-[#55625E]">
              Technical architecture, official regulatory knowledge, and deterministic constraints.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#55625E] hover:text-[#15201D] hover:bg-[#F5F6F3] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#E2E6E1] flex gap-2 bg-[#F5F6F3]/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-[#0E6B59] text-[#0E6B59] bg-[#FFFFFF]'
                : 'border-transparent text-[#55625E] hover:text-[#15201D]'
            }`}
          >
            System Architecture
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'knowledge'
                ? 'border-[#0E6B59] text-[#0E6B59] bg-[#FFFFFF]'
                : 'border-transparent text-[#55625E] hover:text-[#15201D]'
            }`}
          >
            Verified Travel Knowledge ({SEED_KNOWLEDGE_DOCUMENTS.length})
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'verification'
                ? 'border-[#0E6B59] text-[#0E6B59] bg-[#FFFFFF]'
                : 'border-transparent text-[#55625E] hover:text-[#15201D]'
            }`}
          >
            Feasibility Checks
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'budget'
                ? 'border-[#0E6B59] text-[#0E6B59] bg-[#FFFFFF]'
                : 'border-transparent text-[#55625E] hover:text-[#15201D]'
            }`}
          >
            Deterministic Budget
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#15201D]">
          {/* TAB 1: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#E3F1EC]/40 border border-[#0E6B59]/20 space-y-1">
                <div className="font-bold text-[#0E6B59] flex items-center gap-1.5">
                  <Workflow className="h-4 w-4" />
                  <span>Invisible Multi-Agent DAG Execution</span>
                </div>
                <p className="text-xs text-[#55625E]">
                  AeroDAG runs an orchestration pipeline where specialized micro-agents coordinate deterministically. LLMs are never allowed to fabricate prices or arithmetic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="card-consumer p-3.5 space-y-1">
                  <div className="font-bold text-[#15201D]">1. Input Guardrail Pipeline</div>
                  <div className="text-[#55625E]">5-phase defense: length check, normalization, regex abuse scan, PII scrub, and prompt injection defense.</div>
                </div>
                <div className="card-consumer p-3.5 space-y-1">
                  <div className="font-bold text-[#15201D]">2. Requirement Dependency Graph</div>
                  <div className="text-[#55625E]">Classifies every travel parameter into Stated vs Assumed. Travel dates strictly required for pricing.</div>
                </div>
                <div className="card-consumer p-3.5 space-y-1">
                  <div className="font-bold text-[#15201D]">3. RAG Grounding Engine</div>
                  <div className="text-[#55625E]">Hybrid vector search with BM25 keyword matching over official government and authority sources.</div>
                </div>
                <div className="card-consumer p-3.5 space-y-1">
                  <div className="font-bold text-[#15201D]">4. Deterministic Constraint Engine</div>
                  <div className="text-[#55625E]">Calculates hotel night caps, food rates, cab rates, and 3% contingency buffers in integer rupees.</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KNOWLEDGE BASE */}
          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              <div className="text-xs text-[#55625E] pb-2 border-b border-[#E2E6E1]">
                All 15 documents in AeroDAG's knowledge base originate from official government, civil aviation, or consular authorities with recorded timestamps.
              </div>

              <div className="space-y-2">
                {SEED_KNOWLEDGE_DOCUMENTS.map((doc) => (
                  <div key={doc.documentId} className="card-consumer p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#15201D] text-xs">{doc.title}</div>
                      <div className="text-[11px] text-[#55625E]">{doc.sourceName} · Category: {doc.category}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      {(() => {
                        let domain = doc.sourceName;
                        if (doc.sourceUrl) {
                          try {
                            domain = new URL(doc.sourceUrl).hostname.replace('www.', '');
                          } catch {
                            domain = doc.sourceName;
                          }
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-full bg-[#E4EDF8] text-[#1E4F8A] font-semibold text-[11px]">
                            Source: {domain}
                          </span>
                        );
                      })()}
                      {doc.sourceUrl && (
                        <a
                          href={doc.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0E6B59] hover:underline flex items-center gap-0.5 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VERIFICATION CHECKS */}
          {activeTab === 'verification' && (
            <div className="space-y-3">
              <div className="text-xs text-[#55625E] pb-2 border-b border-[#E2E6E1]">
                Every generated plan passes through rigorous automated constraint verification:
              </div>

              <div className="space-y-2 text-xs">
                <div className="card-consumer p-3 space-y-1">
                  <div className="font-bold text-[#15201D]">1. Airport Transfer Pacing (&gt;90 Min Warning)</div>
                  <div className="text-[#55625E]">Drive times over 90 minutes trigger an advisory when young children or elderly travellers are present.</div>
                </div>
                <div className="card-consumer p-3 space-y-1">
                  <div className="font-bold text-[#15201D]">2. Arrival Rest & Departure Buffers</div>
                  <div className="text-[#55625E]">Guarantees ≥60 min rest after hotel arrival. Departure scheduled with mandatory 2-hour domestic check-in windows.</div>
                </div>
                <div className="card-consumer p-3 space-y-1">
                  <div className="font-bold text-[#15201D]">3. Daily Road Transit Limit (&lt;5 Hours)</div>
                  <div className="text-[#55625E]">Total daily road transit across all excursion stops cannot exceed 5 hours to prevent traveller fatigue.</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DETERMINISTIC BUDGET */}
          {activeTab === 'budget' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] space-y-2 text-xs leading-relaxed">
                <div className="font-bold text-[#15201D] text-sm font-heading">
                  Budget Allocation Invariants
                </div>
                <div>• <strong>Fixed Costs First:</strong> Flights, transfers, food, and local cabs are allocated before hotel selection.</div>
                <div>• <strong>Hotel Cap:</strong> Nightly maximum = (Remaining Budget − Activities Reserve) ÷ Nights.</div>
                <div>• <strong>7 Standard Categories:</strong> Flights, Hotel, Transfers, Local Cabs, Food, Activities, Contingency Buffer.</div>
                <div>• <strong>Buffer:</strong> Math.max(₹2,000, 3% of subtotal) with source 'reserved'. Counted in grand total.</div>
                <div>• <strong>Missing prices:</strong> Never ₹0. Sum of lineItems === totalINR.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
