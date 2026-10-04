import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Building2,
  MapPin,
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Award,
  GraduationCap,
  Users,
  Briefcase
} from 'lucide-react';
import { Recruiter } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface RecruitersViewProps {
  onSelectRecruiter: (id: string) => void;
  onOpenResearch: (companyName?: string) => void;
}

export const RecruitersView: React.FC<RecruitersViewProps> = ({
  onSelectRecruiter,
  onOpenResearch,
}) => {
  const { getAuthHeaders } = useAuth();
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab mode
  const [activeTab, setActiveTab] = useState<'all' | 'hr' | 'alumni' | 'mba'>('all');

  // Filter States
  const [search, setSearch] = useState('');
  const [recruiterFunction, setRecruiterFunction] = useState('');
  const [location, setLocation] = useState('');
  const [mbaOnly, setMbaOnly] = useState(false);
  const [campusOnly, setCampusOnly] = useState(false);
  const [alumniOnly, setAlumniOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minConfidence, setMinConfidence] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRecruiters = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (recruiterFunction) params.append('function', recruiterFunction);
      if (location) params.append('location', location);

      // Handle tabs & filters
      if (activeTab === 'hr') {
        params.append('contactType', 'Campus Recruiter');
      } else if (activeTab === 'alumni' || alumniOnly) {
        params.append('alumniOnly', 'true');
      } else if (activeTab === 'mba' || mbaOnly) {
        params.append('mbaOnly', 'true');
      }

      if (campusOnly) params.append('campusOnly', 'true');
      if (verifiedOnly) params.append('verifiedOnly', 'true');
      if (minConfidence) params.append('minConfidence', minConfidence);
      params.append('page', page.toString());
      params.append('limit', '25');

      const res = await fetch(`/api/recruiters?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to fetch recruiters');
      }
      const data = await res.json();
      setRecruiters(data.items || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching recruiters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, [search, recruiterFunction, location, mbaOnly, campusOnly, alumniOnly, verifiedOnly, minConfidence, activeTab, page]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ format }),
      });
      if (format === 'json') {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'verified_recruiters.json';
        a.click();
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'verified_recruiters.csv';
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Recruiter & Alumni Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">
            Grounded directory of corporate talent acquisition leads and IIFT Alumni champions across Tier-1 MBA hiring firms.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onOpenResearch()}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Research Company</span>
          </button>
        </div>
      </div>

      {/* Strategic Playbook Notification Banner */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-slate-50 to-amber-50/90 border border-slate-200 rounded-xl flex items-start space-x-3 text-xs text-slate-700 shadow-2xs">
        <GraduationCap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900">Placement Committee Dual-Vector Outreach Strategy: </span>
          When corporate Campus Recruiting HR is unlisted or hard to reach, leverage the <strong>IIFT Alumni Network</strong> at that firm. Internal alumni in Manager, Lead, and Consultant roles serve as vital campus champions to refer placement brochures, sponsor campus hiring drives, and initiate recruitment dialogues.
        </div>
      </div>

      {/* Primary Category Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => {
            setActiveTab('all');
            setAlumniOnly(false);
            setMbaOnly(false);
            setPage(1);
          }}
          className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'all'
              ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Intelligence Records ({total})
        </button>

        <button
          onClick={() => {
            setActiveTab('hr');
            setAlumniOnly(false);
            setMbaOnly(false);
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'hr'
              ? 'bg-blue-50/80 text-blue-800 border-b-2 border-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>🎯 Campus Recruiting HR</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('alumni');
            setAlumniOnly(true);
            setMbaOnly(false);
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'alumni'
              ? 'bg-amber-50/80 text-amber-800 border-b-2 border-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
          <span>🎓 IIFT Alumni Champions</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('mba');
            setMbaOnly(true);
            setAlumniOnly(false);
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === 'mba'
              ? 'bg-slate-100 text-slate-900 border-b-2 border-slate-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-slate-600" />
          <span>💼 MBA Hiring Opportunities</span>
        </button>
      </div>

      {/* Sticky Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 sticky top-4 z-20">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by recruiter name, company, IIFT alum, title, function..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Quick function select */}
          <select
            value={recruiterFunction}
            onChange={(e) => {
              setRecruiterFunction(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 w-full md:w-auto"
          >
            <option value="">All Functions</option>
            <option value="Campus Recruiting">Campus Recruiting</option>
            <option value="University Relations">University Relations</option>
            <option value="Talent Acquisition">Talent Acquisition</option>
            <option value="Early Careers">Early Careers</option>
            <option value="Alumni Corporate Champion">IIFT Alumni Champion</option>
            <option value="Strategy">Strategy & Consulting</option>
            <option value="Supply Chain">Supply Chain & Operations</option>
          </select>

          {/* Location filter */}
          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(1);
            }}
            placeholder="City (e.g. Mumbai, Delhi)"
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 w-full md:w-44"
          />

          {/* Min confidence */}
          <select
            value={minConfidence}
            onChange={(e) => {
              setMinConfidence(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 w-full md:w-36"
          >
            <option value="">Confidence</option>
            <option value="90">≥ 90% (High)</option>
            <option value="80">≥ 80%</option>
            <option value="70">≥ 70%</option>
            <option value="50">≥ 50%</option>
          </select>
        </div>

        {/* Filter Checkbox Toggles */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={campusOnly}
              onChange={(e) => {
                setCampusOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">Campus TA Leads Only</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={alumniOnly}
              onChange={(e) => {
                setAlumniOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span className="font-medium text-amber-900">🎓 IIFT Alumni Network Only</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-medium text-emerald-800">Verified Evidence Only</span>
          </label>

          {(search || recruiterFunction || location || mbaOnly || campusOnly || alumniOnly || verifiedOnly || minConfidence || activeTab !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setRecruiterFunction('');
                setLocation('');
                setMbaOnly(false);
                setCampusOnly(false);
                setAlumniOnly(false);
                setVerifiedOnly(false);
                setMinConfidence('');
                setActiveTab('all');
                setPage(1);
              }}
              className="text-[11px] text-blue-600 hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Recruiter Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Querying verified recruiter & alumni intelligence records...</p>
          </div>
        ) : recruiters.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">No profiles found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching records in the database. Run a live company research job to discover and verify new talent acquisition contacts and IIFT alumni.
            </p>
            <button
              onClick={() => onOpenResearch()}
              className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Research a Company</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Contact Name & Profile</th>
                  <th className="py-3 px-4">Corporate Entity</th>
                  <th className="py-3 px-4">Professional Title</th>
                  <th className="py-3 px-4">Category & Role</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">MBA / Campus Focus</th>
                  <th className="py-3 px-4 text-center">Confidence</th>
                  <th className="py-3 px-4">Evidence Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recruiters.map((r) => {
                  const isAlum = r.contactType === 'College Alumni' || Boolean(r.alumniCollege && r.alumniCollege.includes('IIFT'));

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectRecruiter(r.id)}
                      className={`cursor-pointer transition-colors ${
                        isAlum ? 'hover:bg-amber-50/50 bg-amber-50/20' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-900">{r.fullName}</span>
                          {isAlum && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md">
                              🎓 IIFT Alum
                            </span>
                          )}
                        </div>
                        {r.linkedinUrl ? (
                          <a
                            href={r.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-blue-600 hover:underline flex items-center space-x-0.5 mt-0.5"
                          >
                            <span>Public Professional Profile</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Verified public record</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.companyName || 'Corporate'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{r.companyIndustry}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        <div className="font-medium">{r.currentTitle}</div>
                        {isAlum && r.alumniCollege && (
                          <div className="text-[10px] text-amber-700 flex items-center space-x-1 mt-0.5">
                            <GraduationCap className="w-3 h-3 shrink-0" />
                            <span>{r.alumniCollege}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isAlum
                            ? 'bg-amber-100/70 text-amber-900 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {isAlum ? 'Alumni Placement Champion' : (r.function || 'Campus Talent Acquisition')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{r.location || 'India'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {r.mbaRelevance && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              MBA
                            </span>
                          )}
                          {r.campusRelevance && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                              Campus
                            </span>
                          )}
                          {!r.mbaRelevance && !r.campusRelevance && (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                          Number(r.confidenceScore) >= 80
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : Number(r.confidenceScore) >= 60
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          <Award className="w-3 h-3" />
                          <span>{r.confidenceScore}%</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium text-slate-800">{r.profileStatus}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.lastVerifiedAt ? new Date(r.lastVerifiedAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecruiter(r.id);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Inspect Evidence →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 25 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{recruiters.length}</span> of <span className="font-semibold">{total}</span> contacts
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-800">Page {page}</span>
              <button
                disabled={page * 25 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
