import React, { useState } from 'react';
import { Sparkles, Search, ShieldCheck, ExternalLink, Award, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AskIntelligenceViewProps {
  onSelectRecruiter: (id: string) => void;
  onOpenResearch: (companyName?: string) => void;
}

export const AskIntelligenceView: React.FC<AskIntelligenceViewProps> = ({
  onSelectRecruiter,
  onOpenResearch,
}) => {
  const { getAuthHeaders } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'Find high-confidence campus recruiters for consulting companies in India',
    'Who are the campus talent acquisition leads at Maersk?',
    'Show recruiters with MBA recruiting relevance in supply chain or logistics',
    'Recruiters in Mumbai with confidence >= 80%',
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/search/ask', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: q.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to query Recruiter Intelligence');
      }

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Failed to process natural language inquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ask Recruiter Intelligence</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Query your verified PostgreSQL recruiter database using natural language. The AI translates questions into structured filters and grounds answers strictly on verified evidence.
        </p>
      </div>

      {/* Query Input Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Find high-confidence campus recruiters for consulting companies in India..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing...' : 'Ask Intelligence'}</span>
          </button>
        </form>

        {/* Sample queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400">Suggested queries:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuestion(sq);
                handleAsk(sq);
              }}
              className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md px-2.5 py-1 transition-colors text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-slate-800">
            Translating natural language into SQL filters & querying PostgreSQL...
          </div>
          <div className="text-[11px] text-slate-400">
            Strict anti-hallucination constraint: only confirmed database records will be referenced.
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Results and Synthesized Answer */}
      {response && (
        <div className="space-y-6">
          {/* Grounded Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Verified Intelligence Answer
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {response.results?.length || 0} database matches
              </span>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {response.answer}
            </div>

            {/* Parsed SQL Filters Badge */}
            {response.parsedFilters && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span className="font-semibold text-slate-600">Generated Query Filters:</span>
                {Object.entries(response.parsedFilters).map(([k, v]) => (
                  v !== null && v !== false ? (
                    <span key={k} className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {k}: {String(v)}
                    </span>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {/* Actual Matched Database Records */}
          {response.results && response.results.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Referenced Database Records ({response.results.length})
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.results.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecruiter(r.id)}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-slate-900">{r.fullName}</div>
                      <div className="text-[11px] text-slate-600">{r.currentTitle}</div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-2 pt-1">
                        <span className="font-medium text-slate-700">{r.companyName}</span>
                        <span>•</span>
                        <span>{r.location || 'India'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Award className="w-3 h-3" />
                        <span>{r.confidenceScore}%</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {response.results?.length === 0 && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                Insufficient verified data in the database matching this query.
              </div>
              <p className="text-[11px] text-slate-500">
                To populate records, run a research pipeline on the desired company.
              </p>
              <button
                onClick={() => onOpenResearch()}
                className="inline-flex items-center space-x-1.5 text-xs text-blue-600 font-semibold hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Company Research →</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
