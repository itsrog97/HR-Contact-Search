import React, { useState, useEffect } from 'react';
import { Globe2, ShieldCheck, ExternalLink, Award, Search } from 'lucide-react';
import { SourceItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const SourcesView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sources', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const filteredSources = search
    ? sources.filter((s) => s.url.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase()) || (s.title && s.title.toLowerCase().includes(search.toLowerCase())))
    : sources;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Globe2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Permitted Public Sources Library</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every recruiter fact in the system is cryptographically hashed and linked to a verified public source.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter sources by domain, URL..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading verified source registry...</div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Globe2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No public sources recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you run research on a company, discovered career portals, university reports, and press releases are archived here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Source Title / Publisher</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Trust Score</th>
                  <th className="py-3 px-4 text-center">Evidence Claims</th>
                  <th className="py-3 px-4">Retrieved Date</th>
                  <th className="py-3 px-4 text-right">Inspect Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 truncate">
                        {s.title || s.domain}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{s.url}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {s.domain}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {s.sourceType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                        Number(s.trustScore) >= 90
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : Number(s.trustScore) >= 75
                          ? 'text-blue-700 bg-blue-50 border-blue-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{s.trustScore}%</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {s.evidenceCount || 0}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(s.retrievedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        <span>Open URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
