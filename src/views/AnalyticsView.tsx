import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertCircle, CheckCircle2, Terminal, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const AnalyticsView: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [logsData, setLogsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/research-logs', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogsData(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Pipeline Observability & Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System diagnostics, execution runtimes, query generations, and database audit logs.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={refreshing}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading audit records...</div>
      ) : (
        <div className="space-y-6">
          {/* Research Jobs Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Research Pipeline Execution History ({logsData?.jobs?.length || 0})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Cloud SQL / PostgreSQL</span>
            </div>

            {logsData?.jobs?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No research runs executed yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-mono">Job ID</th>
                      <th className="py-3 px-4">Entity & Target</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Sources Found</th>
                      <th className="py-3 px-4">Candidates Parsed</th>
                      <th className="py-3 px-4">Database Updates</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logsData?.jobs?.map((job: any) => {
                      const meta = job.metadata || {};
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            #{job.id.slice(0, 8)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{job.query}</div>
                            {meta.queries && meta.queries.length > 0 && (
                              <div className="text-[10px] text-slate-400 truncate max-w-sm mt-0.5">
                                Q1: {meta.queries[0]}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              job.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : job.status === 'running'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {job.status}
                            </span>
                            {job.errorMessage && (
                              <div className="text-[10px] text-red-600 mt-1 max-w-xs truncate">
                                {job.errorMessage}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {meta.sourcesCount || 0}
                          </td>

                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {meta.candidatesExtracted || job.resultsCount || 0}
                          </td>

                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            {meta.newRecordsCount !== undefined ? (
                              <span>
                                <strong className="text-emerald-700">{meta.newRecordsCount} new</strong>, {meta.updatedRecordsCount} updated
                              </span>
                            ) : (
                              <span>{job.resultsCount} persisted</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(job.startedAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Events Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Platform Audit Trail</span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {logsData?.auditEvents?.map((evt: any) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{evt.action}</span>
                    <span className="text-slate-400 ml-2">[{evt.entityType}]</span>
                    {evt.metadata && (
                      <span className="text-[11px] text-slate-500 ml-2 font-mono">
                        {JSON.stringify(evt.metadata)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
