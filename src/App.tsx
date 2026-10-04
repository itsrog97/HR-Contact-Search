import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { ResearchModal } from './components/ResearchModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';

import { DashboardView } from './views/DashboardView.tsx';
import { RecruitersView } from './views/RecruitersView.tsx';
import { RecruiterDetailView } from './views/RecruiterDetailView.tsx';
import { CompaniesView } from './views/CompaniesView.tsx';
import { CompanyDetailView } from './views/CompanyDetailView.tsx';
import { TargetsView } from './views/TargetsView.tsx';
import { OutreachView } from './views/OutreachView.tsx';
import { CollegesView } from './views/CollegesView.tsx';
import { SourcesView } from './views/SourcesView.tsx';
import { AskIntelligenceView } from './views/AskIntelligenceView.tsx';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Modals
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [researchCompany, setResearchCompany] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem('has_completed_onboarding');
    if (!hasCompleted) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const handleOpenResearch = (companyName?: string) => {
    setResearchCompany(companyName || '');
    setIsResearchModalOpen(true);
  };

  const handleNavigateToRecruiter = (id: string) => {
    setSelectedRecruiterId(id);
    setCurrentTab('recruiter-detail');
  };

  const handleNavigateToCompany = (id: string) => {
    setSelectedCompanyId(id);
    setCurrentTab('company-detail');
  };

  const handleResearchCompleted = () => {
    // If on dashboard, let it refresh or switch to recruiters
  };

  return (
    <AuthProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'research') {
              handleOpenResearch();
            } else {
              setCurrentTab(tab);
            }
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <TopBar
            onOpenResearch={(comp) => handleOpenResearch(comp)}
            onNavigateToRecruiter={handleNavigateToRecruiter}
            onNavigateToCompany={handleNavigateToCompany}
            onOpenAskIntelligence={() => setCurrentTab('ask-ai')}
          />

          {/* View Body */}
          <main className="flex-1 overflow-y-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                onOpenResearch={handleOpenResearch}
                onNavigateToRecruiter={handleNavigateToRecruiter}
                onNavigateToCompany={handleNavigateToCompany}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'recruiters' && (
              <RecruitersView
                onSelectRecruiter={handleNavigateToRecruiter}
                onOpenResearch={handleOpenResearch}
              />
            )}

            {currentTab === 'recruiter-detail' && selectedRecruiterId && (
              <RecruiterDetailView
                recruiterId={selectedRecruiterId}
                onBack={() => setCurrentTab('recruiters')}
                onNavigateToCompany={handleNavigateToCompany}
              />
            )}

            {currentTab === 'companies' && (
              <CompaniesView
                onSelectCompany={handleNavigateToCompany}
                onOpenResearch={handleOpenResearch}
              />
            )}

            {currentTab === 'company-detail' && selectedCompanyId && (
              <CompanyDetailView
                companyId={selectedCompanyId}
                onBack={() => setCurrentTab('companies')}
                onSelectRecruiter={handleNavigateToRecruiter}
                onOpenResearch={handleOpenResearch}
              />
            )}

            {currentTab === 'targets' && (
              <TargetsView
                onSelectCompany={handleNavigateToCompany}
                onOpenResearch={handleOpenResearch}
              />
            )}

            {currentTab === 'outreach' && (
              <OutreachView
                onSelectRecruiter={handleNavigateToRecruiter}
              />
            )}

            {currentTab === 'colleges' && (
              <CollegesView />
            )}

            {currentTab === 'sources' && (
              <SourcesView />
            )}

            {currentTab === 'ask-ai' && (
              <AskIntelligenceView
                onSelectRecruiter={handleNavigateToRecruiter}
                onOpenResearch={handleOpenResearch}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView />
            )}

            {currentTab === 'settings' && (
              <SettingsView />
            )}
          </main>
        </div>

        {/* Research Pipeline Modal */}
        <ResearchModal
          isOpen={isResearchModalOpen}
          initialCompany={researchCompany}
          onClose={() => setIsResearchModalOpen(false)}
          onComplete={handleResearchCompleted}
        />

        {/* First-time Onboarding Modal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={() => setIsOnboardingOpen(false)}
          onTriggerResearch={(comp) => handleOpenResearch(comp)}
        />
      </div>
    </AuthProvider>
  );
}
