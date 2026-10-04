import React, { useState, useEffect } from 'react';
import { Send, Users, Building2, Calendar, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { OutreachItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface OutreachViewProps {
  onSelectRecruiter: (recruiterId: string) => void;
}

export const OutreachView: React.FC<OutreachViewProps> = ({ onSelectRecruiter }) => {
  const { getAuthHeaders } = useAuth();
  const [outreachList, setOutreachList] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOutreach = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/outreach', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOutreachList(data);
      }
    } catch (err) {
      console.error('Error fetching outreach:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreach();
  }, []);

  const statuses = [
    'Not Contacted',
    'Researching',
    'Contacted',
    'Responded',
    'Meeting Scheduled',
    'Relationship Established',
    'Not Relevant',
  ];

  const filteredList = statusFilter
    ? outreachList.filter((o) => o.status === statusFilter)
    : outreachList;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Placement Outreach CRM</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track communication stages, scheduled meetings, and relationship notes with corporate hiring managers.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
        >
          <option value="">All Statuses ({outreachList.length})</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading outreach tracker...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Send className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No active outreach records</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you initiate contact with a verified recruiter from their profile page, they will appear here in the CRM pipeline.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Last Contacted</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4">Latest Notes</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRecruiter(item.recruiterId)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.recruiterName || 'Recruiter'}</div>
                      <div className="text-[10px] text-slate-500">{item.recruiterTitle}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {item.companyName}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'Relationship Established' || item.status === 'Meeting Scheduled'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'Contacted' || item.status === 'Responded'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {item.channel || 'Email'}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {item.lastContactedAt ? new Date(item.lastContactedAt).toLocaleDateString() : '-'}
                    </td>

                    <td className="py-3 px-4">
                      {item.nextFollowupAt ? (
                        <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {new Date(item.nextFollowupAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold text-blue-600 hover:underline">
                        View →
                      </span>
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
