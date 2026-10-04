import { pgTable, uuid, text, timestamp, boolean, integer, numeric, jsonb, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('placement_member'), // 'admin', 'placement_lead', 'placement_member'
  collegeId: uuid('college_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Colleges Table
export const colleges = pgTable('colleges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull().default('India'),
  city: text('city'),
  tier: text('tier').default('Tier 1'),
  website: text('website'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Companies Table
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  industry: text('industry'),
  sector: text('sector'),
  country: text('country').default('India'),
  headquarters: text('headquarters'),
  website: text('website'),
  description: text('description'),
  logoUrl: text('logo_url'),
  companyStatus: text('company_status').default('Active'),
  targetPriority: text('target_priority').default('Medium'), // 'High', 'Medium', 'Low'
  targetReason: text('target_reason'),
  targetRoles: text('target_roles'),
  ownerId: uuid('owner_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('company_name_idx').on(t.name),
  index('company_industry_idx').on(t.industry),
]);

// 4. Recruiters Table
export const recruiters = pgTable('recruiters', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  currentCompanyId: uuid('current_company_id').references(() => companies.id),
  currentTitle: text('current_title').notNull(),
  function: text('function'),
  seniority: text('seniority'),
  location: text('location'),
  country: text('country').default('India'),
  linkedinUrl: text('linkedin_url'),
  professionalUrl: text('professional_url'),
  publicEmail: text('public_email'),
  profileStatus: text('profile_status').default('Active'),
  contactType: text('contact_type').default('Campus Recruiter'), // 'Campus Recruiter' | 'College Alumni' | 'Corporate Lead'
  alumniCollege: text('alumni_college'),
  alumniDegree: text('alumni_degree'),
  alumniYear: integer('alumni_year'),
  mbaProgramsHiring: text('mba_programs_hiring'),
  confidenceScore: numeric('confidence_score').default('50'),
  lastVerifiedAt: timestamp('last_verified_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('recruiter_name_idx').on(t.fullName),
  index('recruiter_company_idx').on(t.currentCompanyId),
  index('recruiter_function_idx').on(t.function),
]);

// 5. Recruiter Companies (Career History)
export const recruiterCompanies = pgTable('recruiter_companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  recruiterId: uuid('recruiter_id').references(() => recruiters.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  relationshipType: text('relationship_type'),
  title: text('title'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isCurrent: boolean('is_current').default(true),
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Recruiter Roles
export const recruiterRoles = pgTable('recruiter_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  recruiterId: uuid('recruiter_id').references(() => recruiters.id, { onDelete: 'cascade' }).notNull(),
  roleName: text('role_name').notNull(),
  roleCategory: text('role_category'),
  mbaRecruiting: boolean('mba_recruiting').default(false),
  campusRecruiting: boolean('campus_recruiting').default(false),
  universityRecruiting: boolean('university_recruiting').default(false),
  internshipRecruiting: boolean('internship_recruiting').default(false),
  experiencedHiring: boolean('experienced_hiring').default(false),
  confidenceScore: numeric('confidence_score').default('50'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Company Roles
export const companyRoles = pgTable('company_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  roleName: text('role_name').notNull(),
  roleCategory: text('role_category'),
  employmentType: text('employment_type'),
  location: text('location'),
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. College Company History
export const collegeCompanyHistory = pgTable('college_company_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  year: integer('year').notNull(),
  hiringType: text('hiring_type'), // 'Final Placement', 'Summer Internship', 'PPO', 'Lateral'
  role: text('role'),
  sourceId: uuid('source_id'),
  confidenceScore: numeric('confidence_score').default('80'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Sources
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull().unique(),
  domain: text('domain').notNull(),
  sourceType: text('source_type').notNull(),
  title: text('title'),
  publisher: text('publisher'),
  publishedAt: timestamp('published_at'),
  retrievedAt: timestamp('retrieved_at').defaultNow().notNull(),
  contentHash: text('content_hash'),
  trustScore: numeric('trust_score').default('70'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('source_domain_idx').on(t.domain),
]);

// 10. Evidence
export const evidence = pgTable('evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  entityType: text('entity_type').notNull(), // 'recruiter', 'company', 'role'
  entityId: uuid('entity_id').notNull(),
  claim: text('claim').notNull(),
  evidenceText: text('evidence_text').notNull(),
  confidenceScore: numeric('confidence_score').notNull(),
  verified: boolean('verified').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('evidence_entity_idx').on(t.entityType, t.entityId),
]);

// 11. Research Jobs
export const researchJobs = pgTable('research_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  companyId: uuid('company_id').references(() => companies.id),
  query: text('query').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  resultsCount: integer('results_count').default(0),
  metadata: jsonb('metadata'), // structured logs, counters, queries, sources
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Research Results
export const researchResults = pgTable('research_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  researchJobId: uuid('research_job_id').references(() => researchJobs.id, { onDelete: 'cascade' }).notNull(),
  candidateName: text('candidate_name').notNull(),
  candidateTitle: text('candidate_title').notNull(),
  companyName: text('company_name').notNull(),
  location: text('location'),
  recruitingFunction: text('recruiting_function'),
  mbaRelevance: boolean('mba_relevance').default(false),
  campusRelevance: boolean('campus_relevance').default(false),
  linkedinUrl: text('linkedin_url'),
  sourceUrl: text('source_url').notNull(),
  evidence: text('evidence').notNull(),
  confidenceScore: numeric('confidence_score').notNull(),
  classification: text('classification').notNull(), // 'HIGH RELEVANCE', 'MEDIUM RELEVANCE', 'LOW RELEVANCE', 'UNVERIFIED'
  contactType: text('contact_type').default('Campus Recruiter'),
  alumniCollege: text('alumni_college'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('research_res_job_idx').on(t.researchJobId),
]);

// 13. Outreach
export const outreach = pgTable('outreach', {
  id: uuid('id').defaultRandom().primaryKey(),
  recruiterId: uuid('recruiter_id').references(() => recruiters.id, { onDelete: 'cascade' }).notNull(),
  collegeId: uuid('college_id').references(() => colleges.id),
  status: text('status').notNull().default('Not Contacted'), // 'Not Contacted', 'Researching', 'Contacted', 'Responded', 'Meeting Scheduled', 'Relationship Established', 'Not Relevant'
  lastContactedAt: timestamp('last_contacted_at'),
  nextFollowupAt: timestamp('next_followup_at'),
  channel: text('channel'), // 'Email', 'LinkedIn', 'Phone', 'Campus Event', 'Referral'
  notes: text('notes'),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('outreach_recruiter_idx').on(t.recruiterId),
  index('outreach_status_idx').on(t.status),
]);

// 14. Notes
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(), // 'recruiter', 'company', 'research_job'
  entityId: uuid('entity_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('notes_entity_idx').on(t.entityType, t.entityId),
]);

// 15. Tags
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
});

// 16. Entity Tags
export const entityTags = pgTable('entity_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
}, (t) => [
  index('entity_tags_idx').on(t.entityType, t.entityId),
]);

// 17. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('audit_entity_idx').on(t.entityType, t.entityId),
]);

// Relationships
export const companiesRelations = relations(companies, ({ many, one }) => ({
  recruiters: many(recruiters),
  roles: many(companyRoles),
  history: many(collegeCompanyHistory),
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
}));

export const recruitersRelations = relations(recruiters, ({ one, many }) => ({
  company: one(companies, {
    fields: [recruiters.currentCompanyId],
    references: [companies.id],
  }),
  roles: many(recruiterRoles),
  careerHistory: many(recruiterCompanies),
  outreach: many(outreach),
}));

export const collegesRelations = relations(colleges, ({ many }) => ({
  history: many(collegeCompanyHistory),
  users: many(users),
}));
