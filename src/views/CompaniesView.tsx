import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Sparkles,
  Plus,
  Users,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import { Company } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CompaniesViewProps {
  onSelectCompany: (id: string) => void;
  onOpenResearch: (companyName?: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onSelectCompany,
  onOpenResearch,
}) => {
  const { getAuthHeaders } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Company Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('Management Consulting');
  const [newCompanyRoles, setNewCompanyRoles] = useState('MBA / Management Trainee / Strategy');
  const [newCompanyPriority, setNewCompanyPriority] = useState('High');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (industryFilter) params.append('industry', industryFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/companies?${params.toString()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search, industryFilter, statusFilter]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setIsSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newCompanyName.trim(),
          industry: newCompanyIndustry,
          targetRoles: newCompanyRoles,
          targetPriority: newCompanyPriority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create company');
      }

      const created = await res.json();
      setShowAddModal(false);
      setNewCompanyName('');
      await fetchCompanies();
      onSelectCompany(created.id);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add target company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Accounts & Companies</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain target recruiters, industry categorization, and re-run live research pipelines.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Target Account</span>
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name, industry, roles..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 w-full md:w-52"
        >
          <option value="">All Industries</option>
          <option value="Consulting">Management Consulting</option>
          <option value="FMCG">FMCG & Consumer Goods</option>
          <option value="Technology">Technology & Internet</option>
          <option value="Banking">Banking, Financial Services & FinTech</option>
          <option value="Logistics">Supply Chain & Logistics</option>
          <option value="Manufacturing">Automotive & Manufacturing</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 w-full md:w-44"
        >
          <option value="">All Statuses</option>
          <option value="Not Researched">Not Researched</option>
          <option value="Researching">Researching</option>
          <option value="Recruiters Found">Recruiters Found</option>
          <option value="Contacted">Contacted</option>
          <option value="Active Relationship">Active Relationship</option>
        </select>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading company directory...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No companies found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add a target company or trigger a live research pipeline to discover corporate contacts.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCompany(c.id)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600">
                      {c.name}
                    </h3>
                    <div className="text-[11px] text-slate-500">{c.industry || 'Corporate'}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.companyStatus === 'Recruiters Found' || c.companyStatus === 'Active Relationship'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : c.companyStatus === 'Researching'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.companyStatus}
                  </span>
                </div>

                {c.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                )}

                {c.targetRoles && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">Target Roles: </span>
                    {c.targetRoles}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-slate-700 font-medium">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>{c.recruiterCount || 0} recruiters found</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenResearch(c.name);
                  }}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Re-Research</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Target Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Add Target Corporate Account</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Bain & Company, Maersk, P&G..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Sector</label>
                <input
                  type="text"
                  value={newCompanyIndustry}
                  onChange={(e) => setNewCompanyIndustry(e.target.value)}
                  placeholder="Management Consulting / FMCG / Tech"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target MBA Roles</label>
                <input
                  type="text"
                  value={newCompanyRoles}
                  onChange={(e) => setNewCompanyRoles(e.target.value)}
                  placeholder="MBA / Strategy / Management Trainee"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  {isSubmitting ? 'Adding...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
