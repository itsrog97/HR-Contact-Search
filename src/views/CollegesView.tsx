import React, { useState, useEffect } from 'react';
import { GraduationCap, Building2, Calendar, Plus, ExternalLink, X } from 'lucide-react';
import { College, CollegeCompanyHistoryItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const CollegesView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [history, setHistory] = useState<CollegeCompanyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Placement record state
  const [showAddModal, setShowAddModal] = useState(false);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [year, setYear] = useState('2026');
  const [hiringType, setHiringType] = useState('Final Placement');
  const [role, setRole] = useState('Management Trainee / Leadership Program');

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/colleges', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setColleges(data);
        if (data.length > 0 && !selectedCollege) {
          setSelectedCollege(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollegeHistory = async (collegeId: string) => {
    try {
      const res = await fetch(`/api/colleges/${collegeId}/history`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching college history:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompaniesList(data);
        if (data.length > 0) setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  useEffect(() => {
    fetchColleges();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCollege) {
      fetchCollegeHistory(selectedCollege.id);
    }
  }, [selectedCollege]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege || !selectedCompanyId) return;

    try {
      const res = await fetch(`/api/colleges/${selectedCollege.id}/history`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: selectedCompanyId,
          year: parseInt(year, 10),
          hiringType,
          role,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchCollegeHistory(selectedCollege.id);
      }
    } catch (err) {
      console.error('Error adding history:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tier-1 B-School Intelligence</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain campus recruitment history, placement records, and corporate relationships for top Indian MBA colleges.
          </p>
        </div>

        {selectedCollege && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Placement Tie-up Record</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colleges List Sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">
            Tier-1 Institutions ({colleges.length})
          </div>
          <div className="space-y-1">
            {colleges.map((c) => {
              const isSelected = selectedCollege?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCollege(c)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800 border border-blue-200 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.tier}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{c.city}, {c.country}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected College Placement History */}
        <div className="md:col-span-2 space-y-6">
          {selectedCollege && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedCollege.name}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedCollege.city}, {selectedCollege.country} • {selectedCollege.tier}
                  </div>
                </div>
                {selectedCollege.website && (
                  <a
                    href={selectedCollege.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:underline font-medium"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verified Hiring & Placement History ({history.length})
                  </h3>
                </div>

                {history.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-lg text-center space-y-2 text-xs text-slate-400">
                    <p>No verified campus recruitment records recorded for this institution yet.</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      + Record historical recruitment data
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {history.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center space-x-2">
                            <span>{item.companyName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({item.companyIndustry || 'Corporate'})</span>
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            {item.hiringType} • <span className="font-medium text-slate-800">{item.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {item.year}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Placement Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Record Campus Recruitment History</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  {companiesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hiring Format</label>
                <select
                  value={hiringType}
                  onChange={(e) => setHiringType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Final Placement">Final Placement (MBA Finals)</option>
                  <option value="Summer Internship">Summer Internship (MBA Year 1)</option>
                  <option value="PPO">Pre-Placement Offer (PPO)</option>
                  <option value="Lateral Placement">Lateral Placement (Experienced MBA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offered Role / Program</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Management Trainee - Supply Chain"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
