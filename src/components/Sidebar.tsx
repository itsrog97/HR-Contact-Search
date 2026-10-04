import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Sparkles,
  Target,
  Send,
  Globe2,
  Activity,
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  verifiedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, verifiedCount = 0 }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recruiters', label: 'Recruiters', icon: Users, badge: verifiedCount > 0 ? `${verifiedCount}` : undefined },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'colleges', label: 'Colleges', icon: GraduationCap },
    { id: 'research', label: 'Research Engine', icon: Sparkles, highlight: true },
    { id: 'targets', label: 'Targets & Accounts', icon: Target },
    { id: 'outreach', label: 'Outreach CRM', icon: Send },
    { id: 'sources', label: 'Permitted Sources', icon: Globe2 },
    { id: 'analytics', label: 'Observability & Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="font-semibold text-white tracking-tight text-sm">Campus Recruiter</div>
          <div className="text-[11px] font-medium text-blue-400 tracking-wider uppercase">Intelligence Hub</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
          Core Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Compliance & Trust Notice */}
      <div className="p-3 m-3 rounded-lg bg-slate-800/60 border border-slate-800 text-slate-400 text-[11px] space-y-1">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Evidence-Backed Intelligence</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Zero automated scraping. All recruiter records require verified public sources.
        </p>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-300 flex justify-between items-center px-4">
        <span>Tier-1 Placement Suite</span>
        <span className="text-emerald-500 font-mono">v1.0 • Connected</span>
      </div>
    </aside>
  );
};
