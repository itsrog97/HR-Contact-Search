import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Users,
  Search,
  ArrowRight,
  Globe,
  Loader2,
  Briefcase,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ResearchModalProps {
  isOpen: boolean;
  initialCompany?: string;
  onClose: () => void;
  onComplete?: (jobId: string) => void;
}

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  isOpen,
  initialCompany = '',
  onClose,
  onComplete,
}) => {
  const { getAuthHeaders, profile } = useAuth();
  const [companyName, setCompanyName] = useState(initialCompany);
  const [country, setCountry] = useState('India');
  const [targetRoles, setTargetRoles] = useState('All MBA Campus Opportunities / Management Trainee / Leadership / Strategy / Supply Chain');
  const [targetCollege, setTargetCollege] = useState('IIFT Delhi');
  const [includeAlumni, setIncludeAlumni] = useState(true);
  const [researchDepth, setResearchDepth] = useState<'Quick' | 'Standard' | 'Deep'>('Standard');

  const [jobId, setJobId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [discoveredResults, setDiscoveredResults] = useState<any[]>([]);
  const [discoveredSources, setDiscoveredSources] = useState<any[]>([]);
  const [discoveredRoles, setDiscoveredRoles] = useState<string[]>([]);
  const [liveLogs, setLiveLogs] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [resultFilter, setResultFilter] = useState<'all' | 'hr' | 'alumni'>('all');

  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: 'query_gen', label: 'Multi-Vector Query Generation (Campus HR + MBA Programs + IIFT Alumni)', status: 'pending' },
    { id: 'web_search', label: 'Searching Permitted Public Sources & Careers Portals', status: 'pending' },
    { id: 'source_collection', label: 'Collecting & Verifying Grounded Sources', status: 'pending' },
    { id: 'candidate_extract', label: 'Extracting Campus Recruiting HR & IIFT Alumni Contacts', status: 'pending' },
    { id: 'relevance_classify', label: 'Classifying Campus Relevance & Calibrating Trust Score', status: 'pending' },
    { id: 'deduplication', label: 'Deduplicating Against Existing PostgreSQL Records', status: 'pending' },
    { id: 'persistence', label: 'Persisting Verified Evidence & Profiles to Database', status: 'pending' },
  ]);

  useEffect(() => {
    if (initialCompany) {
      setCompanyName(initialCompany);
    }
  }, [initialCompany]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const updateStepStatus = (id: string, status: PipelineStep['status'], detail?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, status, ...(detail ? { detail } : {}) } : step
      )
    );
  };

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsRunning(true);
    setError(null);
    setStats(null);
    setDiscoveredResults([]);
    setDiscoveredSources([]);
    setDiscoveredRoles([]);
    setLiveLogs([]);
    setResultFilter('all');

    // Reset steps
    setSteps([
      { id: 'query_gen', label: 'Multi-Vector Query Generation (Campus HR + MBA Programs + IIFT Alumni)', status: 'in_progress' },
      { id: 'web_search', label: 'Searching Permitted Public Sources & Careers Portals', status: 'pending' },
      { id: 'source_collection', label: 'Collecting & Verifying Grounded Sources', status: 'pending' },
      { id: 'candidate_extract', label: 'Extracting Campus Recruiting HR & IIFT Alumni Contacts', status: 'pending' },
      { id: 'relevance_classify', label: 'Classifying Campus Relevance & Calibrating Trust Score', status: 'pending' },
      { id: 'deduplication', label: 'Deduplicating Against Existing PostgreSQL Records', status: 'pending' },
      { id: 'persistence', label: 'Persisting Verified Evidence & Profiles to Database', status: 'pending' },
    ]);

    try {
      const res = await fetch('/api/research/company', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyName: companyName.trim(),
          country,
          targetRoles,
          targetCollege,
          includeAlumni,
          researchDepth,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start research');
      }

      const { jobId: newJobId } = await res.json();
      setJobId(newJobId);

      // Open live SSE stream
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const sse = new EventSource(`/api/research/${newJobId}/stream`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data, timestamp } = payload;

          if (data?.message) {
            setLiveLogs((prev) => [...prev, { timestamp: new Date(timestamp).toLocaleTimeString(), message: data.message, type }]);
          }

          switch (type) {
            case 'research_started':
              updateStepStatus('query_gen', 'in_progress', `Generating queries for ${companyName}`);
              break;

            case 'search_started':
              updateStepStatus('query_gen', 'completed');
              updateStepStatus('web_search', 'in_progress', 'Multi-vector public intelligence query dispatched');
              break;

            case 'sources_found':
              updateStepStatus('web_search', 'completed');
              updateStepStatus('source_collection', 'completed', `${data.count || 0} grounded public sources collected`);
              if (data.sources) {
                setDiscoveredSources(data.sources);
              }
              updateStepStatus('candidate_extract', 'in_progress');
              break;

            case 'source_processed':
              updateStepStatus('candidate_extract', 'completed', `${data.candidateCount || 0} profiles extracted`);
              updateStepStatus('relevance_classify', 'in_progress');
              break;

            case 'candidate_classified':
              updateStepStatus('relevance_classify', 'in_progress', `Analyzing ${data.candidateName} (${data.contactType})`);
              break;

            case 'duplicate_detected':
              updateStepStatus('deduplication', 'in_progress', data.status);
              break;

            case 'database_updated':
              updateStepStatus('deduplication', 'completed');
              updateStepStatus('persistence', 'completed', `${data.newCount} new, ${data.updatedCount} updated`);
              break;

            case 'research_completed':
              setIsRunning(false);
              setStats(data.stats);
              if (data.results) {
                setDiscoveredResults(data.results);
              }
              if (data.stats?.campusRoles) {
                setDiscoveredRoles(data.stats.campusRoles);
              }
              sse.close();
              if (onComplete && newJobId) {
                onComplete(newJobId);
              }
              break;

            case 'research_failed':
              setIsRunning(false);
              setError(data.message || 'Research pipeline encountered an error');
              sse.close();
              break;
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      sse.onerror = (e) => {
        console.warn('SSE stream state event:', e);
      };
    } catch (err: any) {
      console.error('Error starting research:', err);
      setIsRunning(false);
      setError(err.message || 'Failed to initiate research pipeline');
    }
  };

  const hrCandidates = discoveredResults.filter((r) => r.contactType === 'Campus Recruiter');
  const alumniCandidates = discoveredResults.filter((r) => r.contactType === 'College Alumni' || r.alumniCollege);

  const displayedCandidates =
    resultFilter === 'hr'
      ? hrCandidates
      : resultFilter === 'alumni'
      ? alumniCandidates
      : discoveredResults;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Corporate Recruiter & Alumni Intelligence Pipeline</h2>
              <p className="text-[11px] text-slate-400">Discover Campus HR, MBA Opportunities, and IIFT Alumni Champions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          {!jobId && !isRunning ? (
            /* Parameter Configuration Form */
            <form onSubmit={handleStartResearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Corporate Entity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Maersk, Deloitte, Hindustan Unilever..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Official corporate or subsidiary name</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Geographic Focus / Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default is India campus recruiting</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target B-School Context
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={targetCollege}
                    onChange={(e) => setTargetCollege(e.target.value)}
                    placeholder="IIFT Delhi"
                    className="w-full bg-amber-50/50 border border-amber-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used to discover internal alumni working at the company as corporate champions and placement conduits.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus MBA Hiring Scope (Broad Discovery)
                </label>
                <input
                  type="text"
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  placeholder="All MBA campus opportunities / Management Trainee / Leadership tracks"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Searches for ANY campus opportunities (Management Trainee, Leadership programs, Summer Internships, Strategy, Supply Chain, Consulting)
                </p>
              </div>

              {/* Dual-Vector Discovery Feature Highlights */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-amber-50/80 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Dual-Vector Tier-1 Placement Discovery</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-start space-x-1.5 bg-white p-2 rounded border border-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Vector 1:</strong> Campus Talent Acquisition leads, University Relations managers & campus hiring panels.</span>
                  </div>
                  <div className="flex items-start space-x-1.5 bg-white p-2 rounded border border-amber-200">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Vector 2:</strong> {targetCollege} Alumni currently at company for warm referrals and internal championing.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Research Depth</label>
                  <div className="flex space-x-2">
                    {(['Quick', 'Standard', 'Deep'] as const).map((depth) => (
                      <button
                        type="button"
                        key={depth}
                        onClick={() => setResearchDepth(depth)}
                        className={`text-xs px-3 py-1.5 rounded border transition-all ${
                          researchDepth === depth
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {depth}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RESEARCH COMPANY</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Strict Data Compliance Guarantee: </span>
                  No private email harvesting, zero unauthorized LinkedIn scraping, no simulated records. Every recruiter profile is extracted directly from verified public sources and stored with evidence in PostgreSQL.
                </div>
              </div>
            </form>
          ) : (
            /* Execution & Live Pipeline Status */
            <div className="space-y-6">
              {/* Overall Progress Banner */}
              <div className={`p-4 rounded-lg border ${
                error
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : stats
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isRunning ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : error ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    <div>
                      <div className="font-semibold text-xs">
                        {isRunning
                          ? `Researching ${companyName}...`
                          : error
                          ? `Research Error: ${error}`
                          : `Intelligence Pipeline Complete for ${companyName}`}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {isRunning
                          ? 'Searching public sources for Campus HR, MBA Programs, and IIFT Alumni...'
                          : stats
                          ? `Discovered ${stats.sourcesCount} sources • ${stats.hrCount || 0} Campus HR • ${stats.alumniCount || 0} ${targetCollege} Alumni • ${stats.newCount} new records saved`
                          : 'Execution finalized'}
                      </div>
                    </div>
                  </div>
                  {stats && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-emerald-700 bg-white/80 border border-emerald-300 px-2 py-1 rounded">
                        100% Persisted
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline Steps Tracker */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Verification & Processing Pipeline
                </div>
                <div className="space-y-2">
                  {steps.map((step) => {
                    const isDone = step.status === 'completed';
                    const isInProgress = step.status === 'in_progress';

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center justify-between p-2 rounded text-xs transition-colors ${
                          isInProgress
                            ? 'bg-blue-100/70 text-blue-900 font-medium'
                            : isDone
                            ? 'bg-white text-slate-800 border border-slate-100 shadow-2xs'
                            : 'text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isInProgress ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span>{step.label}</span>
                        </div>
                        {step.detail && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {step.detail}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Campus MBA Opportunities Discovered */}
              {discoveredRoles.length > 0 && (
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Campus MBA Hiring Opportunities Discovered ({discoveredRoles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discoveredRoles.map((role, idx) => (
                      <span key={idx} className="bg-white border border-blue-200 text-blue-800 text-[11px] font-medium px-2 py-0.5 rounded shadow-2xs">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Candidates Cards */}
              {discoveredResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-800">
                      Discovered Profiles ({discoveredResults.length})
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setResultFilter('all')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          resultFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({discoveredResults.length})
                      </button>
                      <button
                        onClick={() => setResultFilter('hr')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          resultFilter === 'hr'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🎯 Campus HR ({hrCandidates.length})
                      </button>
                      <button
                        onClick={() => setResultFilter('alumni')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          resultFilter === 'alumni'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🎓 {targetCollege} Alumni ({alumniCandidates.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                    {displayedCandidates.map((r, i) => {
                      const isAlum = r.contactType === 'College Alumni' || r.alumniCollege;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg p-3 transition-colors shadow-2xs border ${
                            isAlum
                              ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                              : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-xs text-slate-900 flex items-center space-x-1">
                                <span>{r.fullName}</span>
                                {isAlum ? (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                    🎓 IIFT Alum
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    🎯 Campus HR
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5">{r.jobTitle}</div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {r.confidence}%
                            </span>
                          </div>

                          {isAlum && (
                            <div className="mt-2 text-[10px] text-amber-900 bg-amber-100/60 p-1.5 rounded font-medium flex items-center space-x-1">
                              <GraduationCap className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>{r.alumniCollege || targetCollege} • Internal Placement Champion</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                            <span>{r.location || country}</span>
                            {r.sourceUrl && (
                              <a
                                href={r.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center space-x-0.5"
                              >
                                <span>Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Streaming Logs Console */}
              <div>
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Execution Event Stream</span>
                  <span className="text-[10px] text-slate-400 font-mono">Job #{jobId?.slice(0, 8)}</span>
                </div>
                <div className="bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-lg h-32 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
                  {liveLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={
                        log.type === 'research_completed'
                          ? 'text-emerald-400 font-bold'
                          : log.type === 'candidate_found'
                          ? 'text-blue-300'
                          : log.type === 'duplicate_detected'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setJobId(null);
                    setIsRunning(false);
                  }}
                  disabled={isRunning}
                  className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40"
                >
                  ← Research Another Company
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Close & View Database Records
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
