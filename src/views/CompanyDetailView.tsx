import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Sparkles,
  Users,
  GraduationCap,
  Globe,
  ExternalLink,
  MapPin,
  Calendar,
  ShieldCheck,
  Award,
  History,
  MessageSquare,
  Briefcase,
  Send,
  CheckCircle2
} from 'lucide-react';
import { Company, Recruiter } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CompanyDetailViewProps {
  companyId: string;
  onBack: () => void;
  onSelectRecruiter: (recruiterId: string) => void;
  onOpenResearch: (companyName: string) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  companyId,
  onBack,
  onSelectRecruiter,
  onOpenResearch,
}) => {
  const { getAuthHeaders } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status updates
  const [companyStatus, setCompanyStatus] = useState('Not Researched');
  const [targetPriority, setTargetPriority] = useState('Medium');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // New Note
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to load company profile');
      }
      const data = await res.json();
      setCompany(data);
      setCompanyStatus(data.companyStatus || 'Not Researched');
      setTargetPriority(data.targetPriority || 'Medium');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading company');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const handleUpdateTarget = async (newStatus: string, newPriority: string) => {
    setIsUpdatingTarget(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/target`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyStatus: newStatus,
          targetPriority: newPriority,
        }),
      });
      if (res.ok) {
        setCompanyStatus(newStatus);
        setTargetPriority(newPriority);
      }
    } catch (err) {
      console.error('Error updating target:', err);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          entityType: 'company',
          entityId: companyId,
          note: newNote.trim(),
        }),
      });
      if (res.ok) {
        setNewNote('');
        await fetchCompany();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-2">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading company intelligence profile...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-800">{error || 'Company not found'}</p>
        <button onClick={onBack} className="text-xs text-blue-600 font-semibold hover:underline">
          ← Back to companies
        </button>
      </div>
    );
  }

  const allRecruiters = (company.recruiters || []) as any[];
  const campusHRList = allRecruiters.filter((r) => r.contactType === 'Campus Recruiter' || (!r.alumniCollege && !r.contactType?.includes('Alumni')));
  const alumniList = allRecruiters.filter((r) => r.contactType === 'College Alumni' || Boolean(r.alumniCollege && r.alumniCollege.includes('IIFT')));
  const opportunities = company.campusOpportunities || [];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Companies</span>
        </button>
      </div>

      {/* Company Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {company.name}
              </h1>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {company.industry || 'Corporate'}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Priority: {targetPriority}
              </span>
            </div>

            {company.description ? (
              <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
                {company.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Corporate description pending research extraction.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.headquarters || company.country || 'India'}</span>
              </div>

              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 hover:underline font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Careers Portal</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}

              <div className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Updated: {new Date(company.updatedAt || '').toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action CTA & Target Controls */}
          <div className="flex flex-col items-end space-y-3 shrink-0">
            <button
              onClick={() => onOpenResearch(company.name)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>RESEARCH COMPANY</span>
            </button>

            {/* Target Account Status selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={companyStatus}
                onChange={(e) => handleUpdateTarget(e.target.value, targetPriority)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="Not Researched">Not Researched</option>
                <option value="Researching">Researching</option>
                <option value="Recruiters Found">Recruiters Found</option>
                <option value="Contacted">Contacted</option>
                <option value="Meeting">Meeting</option>
                <option value="Active Relationship">Active Relationship</option>
                <option value="Closed">Closed</option>
                <option value="Not Relevant">Not Relevant</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Campus MBA Opportunities */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Campus MBA Hiring Opportunities & Programs ({opportunities.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Broad MBA campus tracks identified for {company.name}
          </span>
        </div>

        {opportunities.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {opportunities.map((opp: any) => (
              <div
                key={opp.id}
                className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800">{opp.roleName}</span>
                <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {opp.employmentType || 'Campus Track'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
            <span>Corporate hiring tracks: Management Trainee, Strategy, Operations, Leadership Programs.</span>
            <button
              onClick={() => onOpenResearch(company.name)}
              className="text-blue-600 font-semibold hover:underline text-[11px]"
            >
              Run Research to Extract Tracks →
            </button>
          </div>
        )}
      </div>

      {/* Placement Committee Outreach Matrix: Campus HR + IIFT Alumni */}
      <div className="space-y-6">
        {/* Section 1: Campus Recruiting HR */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Campus Recruiting HR & Talent Acquisition ({campusHRList.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Direct contacts responsible for campus hiring drives, university relations, and early career recruitment.
              </p>
            </div>
          </div>

          {campusHRList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {campusHRList.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRecruiter(r.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50/50 cursor-pointer transition-all flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-xs text-slate-900 flex items-center space-x-1.5">
                      <span>{r.fullName}</span>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        Campus HR
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">{r.currentTitle}</div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-1">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {r.function || 'Talent Acquisition'}
                      </span>
                      <span>{r.location || 'India'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Award className="w-3 h-3" />
                      <span>{r.confidenceScore}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 text-center space-y-2">
              <p>No direct Campus Recruiting HR is listed on public records for {company.name}.</p>
              <p className="text-amber-800 font-semibold">
                Use the IIFT Alumni Network below as internal champions to initiate contact!
              </p>
            </div>
          )}
        </div>

        {/* Section 2: IIFT Alumni Champions Working at this Company */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-amber-700" />
                <span>IIFT Alumni Network Champions ({alumniList.length})</span>
              </h3>
              <p className="text-xs text-amber-800/80">
                Alumni of IIFT (Indian Institute of Foreign Trade) currently at {company.name}. They serve as key placement champions for internal referrals and campus hiring pitches.
              </p>
            </div>
          </div>

          {alumniList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alumniList.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRecruiter(r.id)}
                  className="p-4 bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:shadow-2xs cursor-pointer transition-all flex items-start justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-slate-900">{r.fullName}</span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                        🎓 IIFT Alum
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium">{r.currentTitle}</div>
                    <div className="text-[10px] text-amber-900 font-medium flex items-center space-x-1">
                      <GraduationCap className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>{r.alumniCollege || 'IIFT Delhi'} {r.alumniDegree ? `• ${r.alumniDegree}` : ''}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Location: {r.location || 'India'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Award className="w-3 h-3" />
                      <span>{r.confidenceScore}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-lg border border-amber-200 text-xs text-slate-600 text-center space-y-2">
              <p>No IIFT alumni records captured yet for {company.name}.</p>
              <button
                onClick={() => onOpenResearch(company.name)}
                className="text-amber-800 font-semibold hover:underline text-xs"
              >
                + Run Research to Discover IIFT Alumni →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Historical College Relationships & Past Research Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* College History */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Tier-1 Placement History</span>
          </h3>

          {company.collegeHistory && company.collegeHistory.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {company.collegeHistory.map((h: any) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{h.collegeName}</div>
                    <div className="text-slate-500">{h.hiringType} • {h.role || 'Management Trainee'}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-700 font-semibold">{h.year}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-lg text-xs text-slate-400 text-center">
              No historical placement tie-ups recorded for {company.name}.
            </div>
          )}
        </div>

        {/* Research History & Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="w-4 h-4 text-slate-600" />
            <span>Research Audit History</span>
          </h3>

          {company.researchHistory && company.researchHistory.length > 0 ? (
            <div className="space-y-2 text-xs">
              {company.researchHistory.map((j: any) => (
                <div key={j.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                  <div>
                    <div className="font-medium text-slate-800">{j.query}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(j.createdAt || j.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    j.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {j.status} ({j.resultsCount} found)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-lg text-xs text-slate-400 text-center">
              No research runs on record. Click "RESEARCH COMPANY" above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
