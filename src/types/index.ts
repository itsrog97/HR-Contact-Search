export interface Recruiter {
  id: string;
  fullName: string;
  normalizedName?: string;
  currentCompanyId?: string;
  companyId?: string;
  companyName?: string;
  companyIndustry?: string;
  companyWebsite?: string;
  currentTitle: string;
  function?: string;
  seniority?: string;
  location?: string;
  country?: string;
  linkedinUrl?: string | null;
  professionalUrl?: string | null;
  publicEmail?: string | null;
  profileStatus: 'Verified' | 'Active' | 'Unverified';
  contactType?: 'Campus Recruiter' | 'College Alumni' | 'Corporate Lead';
  alumniCollege?: string;
  alumniDegree?: string;
  alumniYear?: number;
  mbaProgramsHiring?: string;
  confidenceScore: string | number;
  lastVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  mbaRelevance?: boolean;
  campusRelevance?: boolean;
  roles?: RecruiterRole[];
  careerHistory?: CareerHistory[];
  evidence?: EvidenceItem[];
  outreach?: OutreachItem | null;
  notes?: NoteItem[];
  auditHistory?: any[];
}

export interface RecruiterRole {
  id: string;
  roleName: string;
  roleCategory?: string;
  mbaRecruiting: boolean;
  campusRecruiting: boolean;
  universityRecruiting: boolean;
  internshipRecruiting?: boolean;
  confidenceScore?: string | number;
}

export interface CareerHistory {
  id: string;
  companyName: string;
  title: string;
  relationshipType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface EvidenceItem {
  id: string;
  claim: string;
  evidenceText: string;
  confidenceScore: string | number;
  verified: boolean;
  createdAt: string;
  sourceUrl?: string;
  sourceDomain?: string;
  sourceType?: string;
  sourceTitle?: string;
  sourcePublisher?: string;
  sourceTrustScore?: string | number;
}

export interface Company {
  id: string;
  name: string;
  normalizedName: string;
  industry?: string;
  sector?: string;
  country?: string;
  headquarters?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  companyStatus: string;
  targetPriority?: string;
  targetReason?: string;
  targetRoles?: string;
  recruiterCount?: number;
  createdAt?: string;
  updatedAt?: string;
  recruiters?: Recruiter[];
  collegeHistory?: CollegeCompanyHistoryItem[];
  researchHistory?: ResearchJob[];
  notes?: NoteItem[];
}

export interface College {
  id: string;
  name: string;
  country: string;
  city?: string;
  tier: string;
  website?: string;
  createdAt: string;
}

export interface CollegeCompanyHistoryItem {
  id: string;
  year: number;
  hiringType?: string;
  role?: string;
  confidenceScore?: string | number;
  collegeName?: string;
  collegeCity?: string;
  collegeTier?: string;
  companyName?: string;
  companyIndustry?: string;
}

export interface ResearchJob {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  resultsCount: number;
  errorMessage?: string;
  metadata?: any;
  companyId?: string;
  companyName?: string;
  results?: ResearchResultItem[];
}

export interface ResearchResultItem {
  id: string;
  candidateName: string;
  candidateTitle: string;
  companyName: string;
  location?: string;
  recruitingFunction?: string;
  mbaRelevance: boolean;
  campusRelevance: boolean;
  linkedinUrl?: string | null;
  sourceUrl: string;
  evidence: string;
  confidenceScore: string | number;
  classification: string;
  contactType?: string;
  alumniCollege?: string;
}

export interface OutreachItem {
  id: string;
  recruiterId: string;
  recruiterName?: string;
  recruiterTitle?: string;
  companyId?: string;
  companyName?: string;
  collegeId?: string;
  status: 'Not Contacted' | 'Researching' | 'Contacted' | 'Responded' | 'Meeting Scheduled' | 'Relationship Established' | 'Not Relevant';
  lastContactedAt?: string | null;
  nextFollowupAt?: string | null;
  channel?: string;
  notes?: string;
  updatedAt?: string;
}

export interface NoteItem {
  id: string;
  entityType: string;
  entityId: string;
  note: string;
  createdAt: string;
}

export interface SourceItem {
  id: string;
  url: string;
  domain: string;
  sourceType: string;
  title?: string;
  publisher?: string;
  trustScore: string | number;
  retrievedAt: string;
  evidenceCount?: number;
}
