import React, { useState, useEffect } from 'react';
import { Target, Building2, Sparkles, Plus, Users, Filter, CheckCircle2, ArrowRight } from 'lucide-react';
import { Company } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface TargetsViewProps {
  onSelectCompany: (companyId: string) => void;
  onOpenResearch: (companyName?: string) => void;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  onSelectCompany,
  onOpenResearch,
}) => {
  const { getAuthHeaders } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'pipeline'>('all');

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/companies/${id}/target`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ companyStatus: newStatus }),
      });
      await fetchTargets();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const statuses = [
    'Not Researched',
    'Researching',
    'Recruiters Found',
    'Contacted',
    'Meeting',
    'Active Relationship',
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Target Company Accounts</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track account priorities, corporate recruitment relationships, and research coverage.
          </p>
        </div>

        <button
          onClick={() => onOpenResearch()}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Research New Account</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading target accounts...</div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Target className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No target accounts configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Start by researching prospective corporate hiring partners for your placement season.
          </p>
          <button
            onClick={() => onOpenResearch('Maersk')}
            className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Research Maersk</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Company Account</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Target MBA Roles</th>
                  <th className="py-3 px-4">Recruiters Found</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCompany(c.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.country || 'India'}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {c.industry || 'Management Consulting'}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.targetPriority === 'High'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : c.targetPriority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.targetPriority || 'Medium'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {c.targetRoles || 'MBA / Management Trainee'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 font-medium text-slate-800">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{c.recruiterCount || 0}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.companyStatus}
                        onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenResearch(c.name);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 ml-auto"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Research</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
