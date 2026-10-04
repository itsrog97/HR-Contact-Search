import React from 'react';
import { ShieldCheck, ExternalLink, Globe, Award } from 'lucide-react';
import { EvidenceItem } from '../types/index.ts';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  index: number;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, index }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5">
      {/* Evidence Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
            Evidence #{index + 1}
          </span>
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Public Claim</span>
          </span>
        </div>

        <div className="flex items-center space-x-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          <Award className="w-3.5 h-3.5" />
          <span>Research Confidence: {evidence.confidenceScore}%</span>
        </div>
      </div>

      {/* Claim */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Claimed Responsibility
        </div>
        <div className="text-xs font-semibold text-slate-900 mt-0.5">
          "{evidence.claim}"
        </div>
      </div>

      {/* Verbatim Supporting Evidence Quote */}
      <div className="bg-slate-50 border-l-2 border-blue-500 p-2.5 rounded-r text-xs text-slate-700 italic leading-relaxed">
        "{evidence.evidenceText}"
      </div>

      {/* Source Provenance */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5 truncate max-w-md">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700">{evidence.sourcePublisher || evidence.sourceDomain || 'Public Web Source'}</span>
          {evidence.sourceType && (
            <span className="text-slate-400">• {evidence.sourceType}</span>
          )}
        </div>

        {evidence.sourceUrl && (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium hover:underline shrink-0"
          >
            <span>Inspect Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
