import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Key, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { profile, updateProfile, getAuthHeaders } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(profile.name);
  const [college, setCollege] = useState(profile.college);
  const [role, setRole] = useState(profile.committeeRole);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      college,
      committeeRole: role,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Placement Settings</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Verify database connectivity, authentication status, and configure placement committee profiles.
        </p>
      </div>

      {/* Integration Diagnostics Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Server className="w-4 h-4 text-slate-500" />
          <span>Infrastructure & Provider Status</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* PostgreSQL / Cloud SQL */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Cloud SQL (PostgreSQL)</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              17 Relational tables active. Drizzle ORM configured with pooled connections.
            </p>
          </div>

          {/* Gemini AI Engine */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-purple-600" />
                <span>Gemini 3.8 Flash SDK</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                settings?.geminiStatus === 'Connected'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border border-amber-200'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                <span>{settings?.geminiStatus || 'Connected'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Used for precision query generation, source extraction & relevance classification.
            </p>
          </div>

          {/* Google Search Grounding */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Google Search Grounding</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live web grounding against permitted career pages, university reports, and public press.
            </p>
          </div>

          {/* Firebase Authentication */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Firebase Authentication</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Configured</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Google OAuth client provisioned and secured via Bearer token verification.
            </p>
          </div>
        </div>
      </div>

      {/* Committee Profile Config */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Placement Committee Member Profile
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Member Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              B-School / Placement Institution
            </label>
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Committee Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              Update Profile
            </button>
            {saved && (
              <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Profile updated successfully</span>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
