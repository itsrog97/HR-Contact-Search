import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Building2, User, LogIn, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface TopBarProps {
  onOpenResearch: (companyName?: string) => void;
  onNavigateToRecruiter: (id: string) => void;
  onNavigateToCompany: (id: string) => void;
  onOpenAskIntelligence: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenResearch,
  onNavigateToRecruiter,
  onNavigateToCompany,
  onOpenAskIntelligence,
}) => {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ recruiters: any[]; companies: any[] }>({ recruiters: [], companies: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults({ recruiters: [], companies: [] });
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30">
      {/* Search Input Area */}
      <div className="relative w-full max-w-xl" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchTerm.trim()) setShowDropdown(true);
            }}
            placeholder='Search recruiters, companies, roles, e.g. "Maersk", "Deloitte campus", "Supply Chain"...'
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-24 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
          />
          <button
            onClick={onOpenAskIntelligence}
            className="absolute right-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded px-2 py-1 flex items-center space-x-1 transition-colors"
            title="Ask Recruiter Intelligence in Natural Language"
          >
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {showDropdown && (searchTerm.trim().length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto z-50">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching database...</div>
            ) : searchResults.recruiters.length === 0 && searchResults.companies.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching recruiters or companies found.
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenResearch(searchTerm.trim());
                  }}
                  className="mt-2 block mx-auto text-blue-600 hover:underline font-medium"
                >
                  Research "{searchTerm}" now →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {searchResults.companies.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Companies
                    </div>
                    {searchResults.companies.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setShowDropdown(false);
                          onNavigateToCompany(c.id);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-800">{c.name}</span>
                          <span className="text-[10px] text-slate-400">({c.industry || 'Corporate'})</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-medium">View Company →</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.recruiters.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Recruiters & Alumni
                    </div>
                    {searchResults.recruiters.map((r) => {
                      const isAlum = r.contactType === 'College Alumni' || Boolean(r.alumniCollege && r.alumniCollege.includes('IIFT'));
                      return (
                        <div
                          key={r.id}
                          onClick={() => {
                            setShowDropdown(false);
                            onNavigateToRecruiter(r.id);
                          }}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            isAlum ? 'hover:bg-amber-50/60 bg-amber-50/20' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                              <span>{r.fullName}</span>
                              {isAlum ? (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded">
                                  🎓 IIFT Alum
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                                  🎯 Campus HR
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {r.currentTitle} • <span className="text-slate-700 font-medium">{r.companyName}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {r.confidenceScore}% conf
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons & Profile */}
      <div className="flex items-center space-x-3">
        {/* Research CTA Button */}
        <button
          onClick={() => onOpenResearch()}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>Research Company</span>
        </button>

        {/* Placement Committee / User Badge */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-semibold flex items-center justify-center">
              {profile.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-semibold text-slate-800 leading-tight">{profile.name}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{profile.college}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-2 text-xs z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="font-medium text-slate-800">{profile.name}</div>
                <div className="text-slate-500 text-[11px]">{profile.email}</div>
                <div className="text-blue-600 text-[10px] font-medium mt-0.5">{profile.committeeRole}</div>
              </div>
              <div className="p-1">
                {user ? (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signInWithGoogle();
                    }}
                    className="w-full text-left px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded flex items-center space-x-2 font-medium"
                  >
                    <LogIn className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
