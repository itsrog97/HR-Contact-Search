import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  MapPin,
  ExternalLink,
  Award,
  Calendar,
  Send,
  MessageSquare,
  History,
  CheckCircle2,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Recruiter } from '../types/index.ts';
import { EvidenceCard } from '../components/EvidenceCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface RecruiterDetailViewProps {
  recruiterId: string;
  onBack: () => void;
  onNavigateToCompany: (companyId: string) => void;
}

export const RecruiterDetailView: React.FC<RecruiterDetailViewProps> = ({
  recruiterId,
  onBack,
  onNavigateToCompany,
}) => {
  const { getAuthHeaders, profile } = useAuth();
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outreach update state
  const [outreachStatus, setOutreachStatus] = useState<string>('Not Contacted');
  const [channel, setChannel] = useState<string>('Email');
  const [followupDate, setFollowupDate] = useState<string>('');
  const [outreachNotes, setOutreachNotes] = useState<string>('');
  const [isUpdatingOutreach, setIsUpdatingOutreach] = useState(false);

  // New Note state
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchRecruiter = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recruiters/${recruiterId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        throw new Error('Failed to load recruiter profile');
      }
      const data = await res.json();
      setRecruiter(data);
      if (data.outreach) {
        setOutreachStatus(data.outreach.status || 'Not Contacted');
        setChannel(data.outreach.channel || 'Email');
        setFollowupDate(data.outreach.nextFollowupAt ? data.outreach.nextFollowupAt.split('T')[0] : '');
        setOutreachNotes(data.outreach.notes || '');
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiter();
  }, [recruiterId]);

  const handleUpdateOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingOutreach(true);
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recruiterId,
          status: outreachStatus,
          channel,
          nextFollowupAt: followupDate ? new Date(followupDate).toISOString() : null,
          notes: outreachNotes,
        }),
      });
      if (res.ok) {
        await fetchRecruiter();
      }
    } catch (err) {
      console.error('Failed to update outreach:', err);
    } finally {
      setIsUpdatingOutreach(false);
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
          entityType: 'recruiter',
          entityId: recruiterId,
          note: newNote.trim(),
        }),
      });
      if (res.ok) {
        setNewNote('');
        await fetchRecruiter();
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
        <p>Loading verified recruiter profile and evidence chain...</p>
      </div>
    );
  }

  if (error || !recruiter) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-800">{error || 'Recruiter not found'}</p>
        <button
          onClick={onBack}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          ← Back to directory
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Recruiters</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {recruiter.fullName}
              </h1>
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{recruiter.profileStatus}</span>
              </span>
            </div>

            <div className="text-sm font-medium text-slate-700">
              {recruiter.currentTitle}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              {recruiter.companyName && (
                <button
                  onClick={() => recruiter.currentCompanyId && onNavigateToCompany(recruiter.currentCompanyId)}
                  className="flex items-center space-x-1.5 text-blue-600 hover:underline font-semibold"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{recruiter.companyName}</span>
                </button>
              )}

              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{recruiter.location || recruiter.country || 'India'}</span>
              </div>

              <div className="flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{recruiter.function || 'Talent Acquisition'}</span>
              </div>

              <div className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Last verified: {recruiter.lastVerifiedAt ? new Date(recruiter.lastVerifiedAt).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>

            {/* LinkedIn Compliance Note */}
            <div className="pt-2">
              {recruiter.linkedinUrl ? (
                <a
                  href={recruiter.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:underline font-semibold bg-blue-50 px-2.5 py-1 rounded border border-blue-200"
                >
                  <span>Discovered Public Professional URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  LinkedIn profile not available from permitted sources.
                </div>
              )}
            </div>
          </div>

          {/* Confidence Score Pill */}
          <div className="text-right shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Research Confidence
            </div>
            <div className="text-3xl font-extrabold text-blue-600 mt-1">
              {recruiter.confidenceScore}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1 max-w-[140px] leading-tight">
              Calibrated from public sources, domain trust & relevance.
            </div>
          </div>
        </div>

        {/* Categories & Relevance Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-2">Relevance Assessment:</span>
          {recruiter.contactType === 'College Alumni' || recruiter.alumniCollege ? (
            <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center space-x-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
              <span>🎓 IIFT Alumni Champion • Internal Strategic Contact</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-3 py-1 rounded-full flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>🎯 Corporate Campus Recruiting HR</span>
            </span>
          )}

          {recruiter.mbaRelevance ? (
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              ✓ MBA Hiring Relevance
            </span>
          ) : null}

          {recruiter.campusRelevance ? (
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
              ✓ Campus & University Hiring
            </span>
          ) : null}

          {recruiter.seniority && (
            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              Seniority: {recruiter.seniority}
            </span>
          )}
        </div>
      </div>

      {/* IIFT Alumni Champion Dedicated Strategic Card */}
      {(recruiter.contactType === 'College Alumni' || recruiter.alumniCollege) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-600 rounded-lg text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  IIFT Alumni Strategic Placement Conduit
                </h3>
                <p className="text-xs text-amber-800">
                  {recruiter.alumniCollege || 'IIFT Delhi (Indian Institute of Foreign Trade)'} • {recruiter.alumniDegree || 'MBA (International Business)'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const template = `Dear ${recruiter.fullName.split(' ')[0]},\n\nWarm greetings from the Placement Committee at IIFT (Indian Institute of Foreign Trade)!\n\nAs a proud alumnus of IIFT currently leading as ${recruiter.currentTitle} at ${recruiter.companyName || 'your esteemed organization'}, we would be honored to connect with you regarding our upcoming MBA campus recruitment season.\n\nCould we request a brief 10-minute introductory call or your guidance in connecting our placement team with your campus recruitment coordinators?\n\nWarm regards,\nPlacement Committee\nIndian Institute of Foreign Trade (IIFT), New Delhi`;
                navigator.clipboard.writeText(template);
                alert('Copied personalized IIFT Alum warm outreach template to clipboard!');
              }}
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              📋 Copy Alum Outreach Pitch
            </button>
          </div>

          <div className="p-3 bg-white/80 rounded-lg border border-amber-200/80 text-xs text-amber-950">
            <strong>Placement Playbook:</strong> Alumni working as Senior Managers, Leads, and Consultants at target companies act as primary sponsors to introduce placement brochures to internal HR, refer student batches, and advocate for campus recruitment slots.
          </div>
        </div>
      )}

      {/* Grid: Left Column (Evidence & Career) | Right Column (Outreach CRM & Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Evidence Chain & Roles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evidence Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Verifiable Evidence Chain ({recruiter.evidence?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supporting public documents, corporate reports & quotes proving recruiter responsibilities.
                </p>
              </div>
            </div>

            {recruiter.evidence && recruiter.evidence.length > 0 ? (
              <div className="space-y-3">
                {recruiter.evidence.map((ev, index) => (
                  <EvidenceCard key={ev.id} evidence={ev} index={index} />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                No direct evidence quotes recorded yet. Run a deep research cycle on the company to attach citations.
              </div>
            )}
          </div>

          {/* Career & Company Associations */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Career & Corporate History
            </h3>
            {recruiter.careerHistory && recruiter.careerHistory.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recruiter.careerHistory.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{c.companyName}</div>
                      <div className="text-slate-500">{c.title} • {c.relationshipType || 'Employer'}</div>
                    </div>
                    {c.isCurrent && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Current Role
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Current position: <span className="font-semibold">{recruiter.currentTitle}</span> at <span className="font-semibold">{recruiter.companyName}</span>
              </div>
            )}
          </div>

          {/* Audit History */}
          {recruiter.auditHistory && recruiter.auditHistory.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Verification Audit Trail</span>
              </h3>
              <div className="space-y-2 text-xs">
                {recruiter.auditHistory.map((a: any) => (
                  <div key={a.id} className="p-2 bg-slate-50 rounded text-slate-600 flex justify-between">
                    <span>{a.action}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Outreach CRM & Committee Notes */}
        <div className="space-y-6">
          {/* Outreach Status Manager */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Outreach & Engagement Status
              </h3>
            </div>

            <form onSubmit={handleUpdateOutreach} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Relationship Stage
                </label>
                <select
                  value={outreachStatus}
                  onChange={(e) => setOutreachStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Not Contacted">Not Contacted</option>
                  <option value="Researching">Researching</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Responded">Responded</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                  <option value="Relationship Established">Relationship Established</option>
                  <option value="Not Relevant">Not Relevant</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Contact Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Email">Official Corporate Email</option>
                  <option value="LinkedIn">LinkedIn Professional InMail</option>
                  <option value="Campus Event">Campus Placement Event</option>
                  <option value="Alumni Referral">Alumni / Dean Referral</option>
                  <option value="Phone">Direct Professional Contact</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Outreach Notes / Strategy
                </label>
                <textarea
                  rows={2}
                  value={outreachNotes}
                  onChange={(e) => setOutreachNotes(e.target.value)}
                  placeholder="e.g. Sent invitation brochure for Summer Internship placement season..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingOutreach}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
              >
                {isUpdatingOutreach ? 'Saving Status...' : 'Save Outreach Stage'}
              </button>
            </form>
          </div>

          {/* Internal Committee Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Committee Member Notes
              </h3>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add confidential placement committee note..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSavingNote || !newNote.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {isSavingNote ? 'Saving...' : 'Post Note'}
              </button>
            </form>

            <div className="space-y-2 pt-2 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {recruiter.notes && recruiter.notes.length > 0 ? (
                recruiter.notes.map((n) => (
                  <div key={n.id} className="pt-2 text-xs">
                    <p className="text-slate-800 leading-relaxed">{n.note}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic text-center py-2">
                  No committee notes posted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
