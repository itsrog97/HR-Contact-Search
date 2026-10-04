import React, { useState } from 'react';
import { GraduationCap, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onTriggerResearch?: (company: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onTriggerResearch,
}) => {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [committeeRole, setCommitteeRole] = useState(profile.committeeRole);
  const [country, setCountry] = useState('India');
  const [initialTarget, setInitialTarget] = useState('Maersk');

  const standardColleges = [
    'IIM Ahmedabad',
    'IIM Bangalore',
    'IIM Calcutta',
    'ISB Hyderabad/Mohali',
    'XLRI Jamshedpur',
    'FMS Delhi',
    'SPJIMR Mumbai',
    'IIFT Delhi',
    'MDI Gurgaon',
    'IIM Lucknow',
    'IIM Kozhikode',
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      college,
      committeeRole,
    });
    localStorage.setItem('has_completed_onboarding', 'true');
    onComplete();
    if (initialTarget.trim() && onTriggerResearch) {
      onTriggerResearch(initialTarget.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Welcome to Campus Recruiter Intelligence</h2>
          <p className="text-xs text-slate-300 mt-1">
            Configure your placement committee credentials to initialize verified research.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Name / Committee Member
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              B-School / Placement Institution
            </label>
            <select
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {standardColleges.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Other Tier-1 Institution">Other Tier-1 Institution</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Placement Role
              </label>
              <input
                type="text"
                value={committeeRole}
                onChange={(e) => setCommitteeRole(e.target.value)}
                placeholder="Placement Committee Lead"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Initial Target Company to Research
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={initialTarget}
                onChange={(e) => setInitialTarget(e.target.value)}
                placeholder="e.g. Maersk, Deloitte, Amazon, McKinsey..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              The pipeline will research real public sources immediately after setup.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Initialize Placement Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
