import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Target,
  Send,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardViewProps {
  onOpenResearch: (companyName?: string) => void;
  onNavigateToRecruiter: (id: string) => void;
  onNavigateToCompany: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenResearch,
  onNavigateToRecruiter,
  onNavigateToCompany,
  onNavigateToTab,
}) => {
  const { getAuthHeaders, profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard', { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying live PostgreSQL metrics...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalCompanies: 0,
    totalRecruiters: 0,
    verifiedRecruiters: 0,
    campusRecruiters: 0,
    mbaRecruiters: 0,
    totalJobs: 0,
    targetCompanies: 0,
    outreachPending: 0,
  };

  const isEmpty = stats.totalRecruiters === 0 && stats.totalCompanies === 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Placement Dashboard
            </h1>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {profile.college}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time verified talent acquisition intelligence for Tier-1 MBA campus recruitment.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenResearch()}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Research Company</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner (if database has 0 records) */}
      {isEmpty && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">No recruiter data yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Start by researching your first target corporate recruiter. The pipeline will search public web sources, analyze job postings, and verify recruiter evidence in PostgreSQL.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onOpenResearch('Maersk')}
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Research Your First Company (e.g. Maersk)</span>
            </button>
            <div className="text-[11px] text-slate-400 mt-2">
              Try researching Maersk, Deloitte, Accenture, Amazon, McKinsey...
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div
          onClick={() => onNavigateToTab('companies')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Companies</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats.totalCompanies}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <span>{stats.targetCompanies} active targets</span>
          </div>
        </div>

        {/* Total Recruiters */}
        <div
          onClick={() => onNavigateToTab('recruiters')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Recruiters</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats.totalRecruiters}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>{stats.verifiedRecruiters} verified profiles</span>
          </div>
        </div>

        {/* MBA Recruiters */}
        <div
          onClick={() => onNavigateToTab('recruiters')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>MBA Recruiters</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {stats.mbaRecruiters}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Explicit MBA hiring context
          </div>
        </div>

        {/* Campus Recruiters */}
        <div
          onClick={() => onNavigateToTab('recruiters')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Campus & University Leads</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">
            {stats.campusRecruiters}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            University relations & early careers
          </div>
        </div>
      </div>

      {/* Breakdowns & Analytical Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Breakdown by Function */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recruiters by Hiring Function
              </h3>
              <p className="text-[11px] text-slate-400">Aggregated from verified candidate records</p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Live DB</span>
          </div>

          {data?.recruitersByFunction?.length > 0 ? (
            <div className="space-y-3">
              {data.recruitersByFunction.map((f: any, i: number) => {
                const total = stats.totalRecruiters || 1;
                const percentage = Math.round((f.count / total) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{f.function}</span>
                      <span className="text-slate-500 font-mono">{f.count} ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No recruiter records available to chart.
            </div>
          )}
        </div>

        {/* Breakdown by Industry */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Target Companies by Industry
              </h3>
              <p className="text-[11px] text-slate-400">Corporate sectors in committee scope</p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Live DB</span>
          </div>

          {data?.companiesByIndustry?.length > 0 ? (
            <div className="space-y-3">
              {data.companiesByIndustry.map((ind: any, i: number) => {
                const total = stats.totalCompanies || 1;
                const percentage = Math.round((ind.count / total) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{ind.industry}</span>
                      <span className="text-slate-500 font-mono">{ind.count} ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No company records available to chart.
            </div>
          )}
        </div>
      </div>

      {/* Recent Updates: Recent Recruiters & Recent Research Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Recruiter Profiles */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recently Verified Recruiters
              </h3>
              <p className="text-[11px] text-slate-400">Latest discovered talent acquisition contacts</p>
            </div>
            <button
              onClick={() => onNavigateToTab('recruiters')}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>

          {data?.recentRecruiters?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.recentRecruiters.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => onNavigateToRecruiter(r.id)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{r.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.currentTitle} • <span className="font-medium text-slate-700">{r.companyName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {r.confidenceScore}% conf
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No recruiter records found.
            </div>
          )}
        </div>

        {/* Recent Research Jobs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Research Pipelines
              </h3>
              <p className="text-[11px] text-slate-400">Observability of automated investigations</p>
            </div>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Research Logs →
            </button>
          </div>

          {data?.recentJobs?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.recentJobs.map((j: any) => (
                <div key={j.id} className="py-2.5 flex items-center justify-between px-2">
                  <div>
                    <div className="text-xs font-medium text-slate-800">{j.query}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(j.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      j.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : j.status === 'running'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {j.status} ({j.resultsCount} found)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No research runs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
