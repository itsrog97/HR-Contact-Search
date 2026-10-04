import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import {
  companies,
  recruiters,
  recruiterRoles,
  recruiterCompanies,
  colleges,
  collegeCompanyHistory,
  sources,
  evidence,
  researchJobs,
  researchResults,
  outreach,
  notes,
  tags,
  auditLogs,
  users,
} from '../db/schema.ts';
import { eq, desc, ilike, and, sql, or, gte, inArray } from 'drizzle-orm';
import { executeResearchJob, researchEvents, normalizeString } from './researchEngine.ts';
import { ai, generateContentSafe } from './gemini.ts';

export const apiRouter = Router();

// ==================== DASHBOARD ====================
apiRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [totalCompaniesRes] = await db.select({ count: sql<number>`count(*)::int` }).from(companies);
    const [totalRecruitersRes] = await db.select({ count: sql<number>`count(*)::int` }).from(recruiters);
    const [verifiedRecruitersRes] = await db.select({ count: sql<number>`count(*)::int` })
      .from(recruiters).where(eq(recruiters.profileStatus, 'Verified'));
    const [campusRecruitersRes] = await db.select({ count: sql<number>`count(distinct ${recruiterRoles.recruiterId})::int` })
      .from(recruiterRoles).where(eq(recruiterRoles.campusRecruiting, true));
    const [mbaRecruitersRes] = await db.select({ count: sql<number>`count(distinct ${recruiterRoles.recruiterId})::int` })
      .from(recruiterRoles).where(eq(recruiterRoles.mbaRecruiting, true));
    const [totalAlumniRes] = await db.select({ count: sql<number>`count(*)::int` })
      .from(recruiters).where(eq(recruiters.contactType, 'College Alumni'));
    const [totalJobsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(researchJobs);
    const [targetCompaniesRes] = await db.select({ count: sql<number>`count(*)::int` })
      .from(companies).where(or(eq(companies.companyStatus, 'Researching'), eq(companies.companyStatus, 'Recruiters Found'), eq(companies.companyStatus, 'Contacted')));
    const [outreachPendingRes] = await db.select({ count: sql<number>`count(*)::int` })
      .from(outreach).where(or(eq(outreach.status, 'Contacted'), eq(outreach.status, 'Researching')));

    // Breakdown by function
    const recruitersByFunction = await db.select({
      function: sql<string>`coalesce(${recruiters.function}, 'Other')`,
      count: sql<number>`count(*)::int`,
    }).from(recruiters).groupBy(sql`coalesce(${recruiters.function}, 'Other')`).orderBy(desc(sql`count(*)`)).limit(6);

    // Breakdown by industry
    const companiesByIndustry = await db.select({
      industry: sql<string>`coalesce(${companies.industry}, 'General Management')`,
      count: sql<number>`count(*)::int`,
    }).from(companies).groupBy(sql`coalesce(${companies.industry}, 'General Management')`).orderBy(desc(sql`count(*)`)).limit(6);

    // Recent research jobs
    const recentJobs = await db.select().from(researchJobs).orderBy(desc(researchJobs.createdAt)).limit(5);

    // Recent updates / recruiters
    const recentRecruiters = await db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      currentTitle: recruiters.currentTitle,
      confidenceScore: recruiters.confidenceScore,
      lastVerifiedAt: recruiters.lastVerifiedAt,
      companyName: companies.name,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id))
    .orderBy(desc(recruiters.updatedAt))
    .limit(5);

    res.json({
      stats: {
        totalCompanies: totalCompaniesRes?.count || 0,
        totalRecruiters: totalRecruitersRes?.count || 0,
        verifiedRecruiters: verifiedRecruitersRes?.count || 0,
        campusRecruiters: campusRecruitersRes?.count || 0,
        mbaRecruiters: mbaRecruitersRes?.count || 0,
        totalAlumni: totalAlumniRes?.count || 0,
        totalJobs: totalJobsRes?.count || 0,
        targetCompanies: targetCompaniesRes?.count || 0,
        outreachPending: outreachPendingRes?.count || 0,
      },
      recruitersByFunction,
      companiesByIndustry,
      recentJobs,
      recentRecruiters,
    });
  } catch (error: any) {
    console.error('Error in /dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to load dashboard metrics' });
  }
});

// ==================== RECRUITERS ====================
apiRouter.get('/recruiters', async (req: Request, res: Response) => {
  try {
    const {
      search,
      companyId,
      function: recruiterFunction,
      location,
      contactType,
      alumniOnly,
      mbaOnly,
      campusOnly,
      minConfidence,
      verifiedOnly,
      page = '1',
      limit = '20',
    } = req.query;

    const offset = (Math.max(1, parseInt(page as string, 10)) - 1) * parseInt(limit as string, 10);
    const pageLimit = Math.min(100, parseInt(limit as string, 10));

    const conditions: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(or(
        ilike(recruiters.fullName, q),
        ilike(recruiters.currentTitle, q),
        ilike(recruiters.function, q),
        ilike(recruiters.location, q),
        ilike(recruiters.alumniCollege, q),
        ilike(companies.name, q)
      ));
    }

    if (companyId && typeof companyId === 'string') {
      conditions.push(eq(recruiters.currentCompanyId, companyId));
    }

    if (contactType && typeof contactType === 'string') {
      conditions.push(eq(recruiters.contactType, contactType));
    }

    if (alumniOnly === 'true') {
      conditions.push(eq(recruiters.contactType, 'College Alumni'));
    }

    if (recruiterFunction && typeof recruiterFunction === 'string') {
      conditions.push(ilike(recruiters.function, `%${recruiterFunction}%`));
    }

    if (location && typeof location === 'string') {
      conditions.push(ilike(recruiters.location, `%${location}%`));
    }

    if (verifiedOnly === 'true') {
      conditions.push(eq(recruiters.profileStatus, 'Verified'));
    }

    if (minConfidence && !isNaN(Number(minConfidence))) {
      conditions.push(gte(recruiters.confidenceScore, minConfidence.toString()));
    }

    let query = db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      currentTitle: recruiters.currentTitle,
      function: recruiters.function,
      seniority: recruiters.seniority,
      location: recruiters.location,
      country: recruiters.country,
      linkedinUrl: recruiters.linkedinUrl,
      contactType: recruiters.contactType,
      alumniCollege: recruiters.alumniCollege,
      alumniDegree: recruiters.alumniDegree,
      alumniYear: recruiters.alumniYear,
      mbaProgramsHiring: recruiters.mbaProgramsHiring,
      confidenceScore: recruiters.confidenceScore,
      profileStatus: recruiters.profileStatus,
      lastVerifiedAt: recruiters.lastVerifiedAt,
      createdAt: recruiters.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      companyIndustry: companies.industry,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(recruiters.confidenceScore), desc(recruiters.lastVerifiedAt))
      .limit(pageLimit)
      .offset(offset);

    // Get roles tags for these recruiters
    const recruiterIds = items.map(i => i.id);
    let rolesMap: Record<string, any[]> = {};
    if (recruiterIds.length > 0) {
      const rolesList = await db.select().from(recruiterRoles).where(inArray(recruiterRoles.recruiterId, recruiterIds));
      for (const r of rolesList) {
        if (!rolesMap[r.recruiterId]) rolesMap[r.recruiterId] = [];
        rolesMap[r.recruiterId].push(r);
      }
    }

    // Attach role flags
    const enriched = items.map(item => {
      const roles = rolesMap[item.id] || [];
      const hasMba = roles.some(r => r.mbaRecruiting);
      const hasCampus = roles.some(r => r.campusRecruiting || r.universityRecruiting);
      return {
        ...item,
        roles,
        mbaRelevance: hasMba,
        campusRelevance: hasCampus,
      };
    });

    let finalItems = enriched;
    if (mbaOnly === 'true') {
      finalItems = finalItems.filter(i => i.mbaRelevance);
    }
    if (campusOnly === 'true') {
      finalItems = finalItems.filter(i => i.campusRelevance);
    }

    res.json({
      items: finalItems,
      page: parseInt(page as string, 10),
      limit: pageLimit,
      total: finalItems.length,
    });
  } catch (error: any) {
    console.error('Error fetching recruiters:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recruiters' });
  }
});

apiRouter.get('/recruiters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [recruiter] = await db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      normalizedName: recruiters.normalizedName,
      currentCompanyId: recruiters.currentCompanyId,
      currentTitle: recruiters.currentTitle,
      function: recruiters.function,
      seniority: recruiters.seniority,
      location: recruiters.location,
      country: recruiters.country,
      linkedinUrl: recruiters.linkedinUrl,
      professionalUrl: recruiters.professionalUrl,
      publicEmail: recruiters.publicEmail,
      profileStatus: recruiters.profileStatus,
      contactType: recruiters.contactType,
      alumniCollege: recruiters.alumniCollege,
      alumniDegree: recruiters.alumniDegree,
      alumniYear: recruiters.alumniYear,
      mbaProgramsHiring: recruiters.mbaProgramsHiring,
      confidenceScore: recruiters.confidenceScore,
      lastVerifiedAt: recruiters.lastVerifiedAt,
      createdAt: recruiters.createdAt,
      updatedAt: recruiters.updatedAt,
      companyName: companies.name,
      companyIndustry: companies.industry,
      companyWebsite: companies.website,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id))
    .where(eq(recruiters.id, id))
    .limit(1);

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found in verified database' });
    }

    const roles = await db.select().from(recruiterRoles).where(eq(recruiterRoles.recruiterId, id));
    const careerHistory = await db.select({
      id: recruiterCompanies.id,
      relationshipType: recruiterCompanies.relationshipType,
      title: recruiterCompanies.title,
      startDate: recruiterCompanies.startDate,
      endDate: recruiterCompanies.endDate,
      isCurrent: recruiterCompanies.isCurrent,
      companyName: companies.name,
    })
    .from(recruiterCompanies)
    .leftJoin(companies, eq(recruiterCompanies.companyId, companies.id))
    .where(eq(recruiterCompanies.recruiterId, id));

    const evidenceList = await db.select({
      id: evidence.id,
      claim: evidence.claim,
      evidenceText: evidence.evidenceText,
      confidenceScore: evidence.confidenceScore,
      verified: evidence.verified,
      createdAt: evidence.createdAt,
      sourceUrl: sources.url,
      sourceDomain: sources.domain,
      sourceType: sources.sourceType,
      sourceTitle: sources.title,
      sourceTrustScore: sources.trustScore,
    })
    .from(evidence)
    .leftJoin(sources, eq(evidence.sourceId, sources.id))
    .where(and(eq(evidence.entityType, 'recruiter'), eq(evidence.entityId, id)))
    .orderBy(desc(evidence.confidenceScore));

    const outreachRecords = await db.select().from(outreach).where(eq(outreach.recruiterId, id));
    const recruiterNotes = await db.select().from(notes)
      .where(and(eq(notes.entityType, 'recruiter'), eq(notes.entityId, id)))
      .orderBy(desc(notes.createdAt));

    const auditHistory = await db.select().from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'recruiter'), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt));

    res.json({
      ...recruiter,
      roles,
      careerHistory,
      evidence: evidenceList,
      outreach: outreachRecords[0] || null,
      notes: recruiterNotes,
      auditHistory,
      mbaRelevance: roles.some(r => r.mbaRecruiting),
      campusRelevance: roles.some(r => r.campusRecruiting || r.universityRecruiting),
    });
  } catch (error: any) {
    console.error('Error fetching recruiter profile:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch recruiter profile' });
  }
});

// ==================== COMPANIES ====================
apiRouter.get('/companies', async (req: Request, res: Response) => {
  try {
    const { search, industry, status } = req.query;
    const conditions: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(or(
        ilike(companies.name, `%${search.trim()}%`),
        ilike(companies.industry, `%${search.trim()}%`),
        ilike(companies.targetRoles, `%${search.trim()}%`)
      ));
    }

    if (industry && typeof industry === 'string') {
      conditions.push(ilike(companies.industry, `%${industry}%`));
    }

    if (status && typeof status === 'string') {
      conditions.push(eq(companies.companyStatus, status));
    }

    let query = db.select({
      id: companies.id,
      name: companies.name,
      normalizedName: companies.normalizedName,
      industry: companies.industry,
      sector: companies.sector,
      country: companies.country,
      headquarters: companies.headquarters,
      website: companies.website,
      description: companies.description,
      companyStatus: companies.companyStatus,
      targetPriority: companies.targetPriority,
      targetReason: companies.targetReason,
      targetRoles: companies.targetRoles,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
      recruiterCount: sql<number>`(select count(*)::int from recruiters where recruiters.current_company_id = companies.id)`,
    }).from(companies);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(companies.updatedAt));
    res.json(items);
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch companies' });
  }
});

apiRouter.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Company recruiters & alumni
    const companyRecruiters = await db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      currentTitle: recruiters.currentTitle,
      function: recruiters.function,
      seniority: recruiters.seniority,
      location: recruiters.location,
      contactType: recruiters.contactType,
      alumniCollege: recruiters.alumniCollege,
      alumniDegree: recruiters.alumniDegree,
      alumniYear: recruiters.alumniYear,
      mbaProgramsHiring: recruiters.mbaProgramsHiring,
      confidenceScore: recruiters.confidenceScore,
      lastVerifiedAt: recruiters.lastVerifiedAt,
      linkedinUrl: recruiters.linkedinUrl,
    }).from(recruiters).where(eq(recruiters.currentCompanyId, id)).orderBy(desc(recruiters.confidenceScore));

    // Campus MBA hiring roles & programs
    const campusOpportunities = await db.select().from(companyRoles)
      .where(eq(companyRoles.companyId, id))
      .orderBy(desc(companyRoles.createdAt));

    // Historical college relationships
    const collegeHistory = await db.select({
      id: collegeCompanyHistory.id,
      year: collegeCompanyHistory.year,
      hiringType: collegeCompanyHistory.hiringType,
      role: collegeCompanyHistory.role,
      confidenceScore: collegeCompanyHistory.confidenceScore,
      collegeName: colleges.name,
      collegeCity: colleges.city,
      collegeTier: colleges.tier,
    })
    .from(collegeCompanyHistory)
    .leftJoin(colleges, eq(collegeCompanyHistory.collegeId, colleges.id))
    .where(eq(collegeCompanyHistory.companyId, id))
    .orderBy(desc(collegeCompanyHistory.year));

    // Research jobs for this company
    const researchHistory = await db.select().from(researchJobs)
      .where(eq(researchJobs.companyId, id))
      .orderBy(desc(researchJobs.createdAt));

    // Company notes
    const companyNotes = await db.select().from(notes)
      .where(and(eq(notes.entityType, 'company'), eq(notes.entityId, id)))
      .orderBy(desc(notes.createdAt));

    res.json({
      ...company,
      recruiters: companyRecruiters,
      campusOpportunities,
      collegeHistory,
      researchHistory,
      notes: companyNotes,
    });
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch company details' });
  }
});

apiRouter.post('/companies', async (req: Request, res: Response) => {
  try {
    const { name, industry, sector, country = 'India', headquarters, website, description, targetPriority, targetReason, targetRoles } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const normName = normalizeString(name);
    const existing = (await db.select().from(companies).where(eq(companies.normalizedName, normName)).limit(1))[0];
    if (existing) {
      return res.status(400).json({ error: 'Company already exists in the database', existingId: existing.id });
    }

    const [newComp] = await db.insert(companies).values({
      name: name.trim(),
      normalizedName: normName,
      industry: industry || 'Management Consulting / Corporate',
      sector: sector || null,
      country,
      headquarters: headquarters || null,
      website: website || null,
      description: description || null,
      companyStatus: 'Not Researched',
      targetPriority: targetPriority || 'Medium',
      targetReason: targetReason || null,
      targetRoles: targetRoles || 'MBA / Management Trainee',
    }).returning();

    res.status(201).json(newComp);
  } catch (error: any) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: error.message || 'Failed to create company' });
  }
});

apiRouter.patch('/companies/:id/target', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyStatus, targetPriority, targetReason, targetRoles } = req.body;

    const [updated] = await db.update(companies).set({
      ...(companyStatus !== undefined && { companyStatus }),
      ...(targetPriority !== undefined && { targetPriority }),
      ...(targetReason !== undefined && { targetReason }),
      ...(targetRoles !== undefined && { targetRoles }),
      updatedAt: new Date(),
    }).where(eq(companies.id, id)).returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating company target status:', error);
    res.status(500).json({ error: error.message || 'Failed to update target' });
  }
});

// ==================== RESEARCH PIPELINE ====================
apiRouter.post('/research/company', async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      country = 'India',
      targetRoles = 'MBA / Management Trainee / Leadership Program / Strategy / Supply Chain',
      targetColleges,
      targetCollege = 'IIFT Delhi',
      includeAlumni = true,
      researchDepth = 'Standard',
    } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required for research' });
    }

    const query = `${companyName} (${country}) - ${targetRoles} [Campus HR & ${targetCollege} Alumni]`;

    // Create research job
    const [job] = await db.insert(researchJobs).values({
      query,
      status: 'pending',
      startedAt: new Date(),
      resultsCount: 0,
    }).returning();

    // Trigger asynchronous research execution in background
    setImmediate(async () => {
      try {
        await executeResearchJob(job.id, {
          companyName: companyName.trim(),
          country,
          targetRoles,
          targetColleges,
          targetCollege,
          includeAlumni,
          researchDepth,
        });
      } catch (err) {
        console.error('Asynchronous research failure:', err);
      }
    });

    res.status(202).json({
      jobId: job.id,
      status: 'pending',
      message: `Research pipeline started for ${companyName}`,
    });
  } catch (error: any) {
    console.error('Error initiating research job:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate research' });
  }
});

apiRouter.get('/research/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [job] = await db.select().from(researchJobs).where(eq(researchJobs.id, id)).limit(1);
    if (!job) {
      return res.status(404).json({ error: 'Research job not found' });
    }

    const results = await db.select().from(researchResults).where(eq(researchResults.researchJobId, id));

    res.json({
      ...job,
      results,
    });
  } catch (error: any) {
    console.error('Error fetching research job:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch research job' });
  }
});

// Server-Sent Events stream for live research status
apiRouter.get('/research/:id/stream', (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (eventData: any) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  // Immediate handshake event
  sendEvent({ type: 'stream_connected', jobId: id, timestamp: new Date().toISOString() });

  const eventListener = (data: any) => {
    sendEvent(data);
    if (data.type === 'research_completed' || data.type === 'research_failed') {
      setTimeout(() => {
        researchEvents.off(`job-${id}`, eventListener);
        res.end();
      }, 500);
    }
  };

  researchEvents.on(`job-${id}`, eventListener);

  req.on('close', () => {
    researchEvents.off(`job-${id}`, eventListener);
  });
});

apiRouter.get('/research-jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await db.select({
      id: researchJobs.id,
      query: researchJobs.query,
      status: researchJobs.status,
      startedAt: researchJobs.startedAt,
      completedAt: researchJobs.completedAt,
      resultsCount: researchJobs.resultsCount,
      errorMessage: researchJobs.errorMessage,
      metadata: researchJobs.metadata,
      companyId: researchJobs.companyId,
      companyName: companies.name,
    })
    .from(researchJobs)
    .leftJoin(companies, eq(researchJobs.companyId, companies.id))
    .orderBy(desc(researchJobs.createdAt))
    .limit(50);

    res.json(jobs);
  } catch (error: any) {
    console.error('Error fetching research jobs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch research jobs' });
  }
});

// ==================== UNIVERSAL SEARCH & ASK INTELLIGENCE ====================
apiRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q = '' } = req.query;
    const queryStr = (q as string).trim();
    if (!queryStr) {
      return res.json({ recruiters: [], companies: [], roles: [] });
    }

    const likeTerm = `%${queryStr}%`;

    const recruiterResults = await db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      currentTitle: recruiters.currentTitle,
      function: recruiters.function,
      location: recruiters.location,
      confidenceScore: recruiters.confidenceScore,
      companyName: companies.name,
      companyId: companies.id,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id))
    .where(or(
      ilike(recruiters.fullName, likeTerm),
      ilike(recruiters.currentTitle, likeTerm),
      ilike(recruiters.function, likeTerm),
      ilike(recruiters.location, likeTerm),
      ilike(companies.name, likeTerm)
    ))
    .limit(15);

    const companyResults = await db.select().from(companies)
      .where(or(
        ilike(companies.name, likeTerm),
        ilike(companies.industry, likeTerm),
        ilike(companies.targetRoles, likeTerm)
      ))
      .limit(10);

    res.json({
      recruiters: recruiterResults,
      companies: companyResults,
    });
  } catch (error: any) {
    console.error('Error in search:', error);
    res.status(500).json({ error: error.message || 'Search execution failed' });
  }
});

// Section 22: AI Natural-Language Search ("Ask Recruiter Intelligence")
apiRouter.post('/search/ask', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Step 1: Parse the user's natural language question into structured filter parameters with Gemini
    const parsePrompt = `You are a database filter generator for an MBA campus recruiter database.
The user question is: "${question}"

Extract the structured search criteria from the user's question into this exact JSON schema:
{
  "companyName": "string or null",
  "industry": "string or null",
  "recruiterFunction": "string or null",
  "location": "string or null",
  "campusRecruitingOnly": true or false,
  "mbaRecruitingOnly": true or false,
  "minConfidence": number or null
}
Return only valid JSON.`;

    let filters: any = {
      companyName: null,
      industry: null,
      recruiterFunction: null,
      location: null,
      campusRecruitingOnly: false,
      mbaRecruitingOnly: false,
      minConfidence: null,
    };

    try {
      const parseRes = await generateContentSafe({
        contents: parsePrompt,
        config: { responseMimeType: 'application/json' },
      });
      if (parseRes.text) {
        filters = JSON.parse(parseRes.text);
      }
    } catch (parseErr) {
      console.warn('AI filter extraction fallback:', parseErr);
    }

    // Step 2: Query actual PostgreSQL records matching these criteria
    const conditions: any[] = [];
    if (filters.companyName) {
      conditions.push(ilike(companies.name, `%${filters.companyName}%`));
    }
    if (filters.industry) {
      conditions.push(ilike(companies.industry, `%${filters.industry}%`));
    }
    if (filters.recruiterFunction) {
      conditions.push(ilike(recruiters.function, `%${filters.recruiterFunction}%`));
    }
    if (filters.location) {
      conditions.push(ilike(recruiters.location, `%${filters.location}%`));
    }
    if (filters.minConfidence && typeof filters.minConfidence === 'number') {
      conditions.push(gte(recruiters.confidenceScore, filters.minConfidence.toString()));
    }

    let query = db.select({
      id: recruiters.id,
      fullName: recruiters.fullName,
      currentTitle: recruiters.currentTitle,
      function: recruiters.function,
      location: recruiters.location,
      confidenceScore: recruiters.confidenceScore,
      profileStatus: recruiters.profileStatus,
      lastVerifiedAt: recruiters.lastVerifiedAt,
      linkedinUrl: recruiters.linkedinUrl,
      companyId: companies.id,
      companyName: companies.name,
      companyIndustry: companies.industry,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const matches = await query.orderBy(desc(recruiters.confidenceScore)).limit(20);

    if (matches.length === 0) {
      return res.json({
        answer: 'Insufficient verified data in the database matching your criteria. Try running a research job for relevant companies first.',
        parsedFilters: filters,
        results: [],
      });
    }

    // Synthesize response grounded exclusively on the actual database records found
    const summaryPrompt = `You are the Campus Recruiter Intelligence assistant for Tier-1 MBA placement committees.
The user asked: "${question}"
Here are the ACTUAL verified database records retrieved from PostgreSQL:
${JSON.stringify(matches, null, 2)}

Provide a concise, executive summary answering the question.
CRITICAL RULES:
- Only reference the people and companies listed above in the database records.
- Do NOT invent or assume any extra facts, emails, or people not present in the records.
- State confidence scores and verified status.`;

    const summaryRes = await generateContentSafe({
      contents: summaryPrompt,
    });

    res.json({
      answer: summaryRes.text || 'Found verified database matches.',
      parsedFilters: filters,
      results: matches,
    });
  } catch (error: any) {
    console.error('Error in Ask Intelligence:', error);
    res.status(500).json({ error: error.message || 'Natural language search failed' });
  }
});

// ==================== OUTREACH CRM ====================
apiRouter.get('/outreach', async (req: Request, res: Response) => {
  try {
    const list = await db.select({
      id: outreach.id,
      status: outreach.status,
      lastContactedAt: outreach.lastContactedAt,
      nextFollowupAt: outreach.nextFollowupAt,
      channel: outreach.channel,
      notes: outreach.notes,
      updatedAt: outreach.updatedAt,
      recruiterId: recruiters.id,
      recruiterName: recruiters.fullName,
      recruiterTitle: recruiters.currentTitle,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(outreach)
    .leftJoin(recruiters, eq(outreach.recruiterId, recruiters.id))
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id))
    .orderBy(desc(outreach.updatedAt));

    res.json(list);
  } catch (error: any) {
    console.error('Error fetching outreach records:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch outreach records' });
  }
});

apiRouter.post('/outreach', async (req: Request, res: Response) => {
  try {
    const { recruiterId, status, lastContactedAt, nextFollowupAt, channel, notes: outreachNotes, collegeId } = req.body;
    if (!recruiterId) {
      return res.status(400).json({ error: 'Recruiter ID is required' });
    }

    const existing = (await db.select().from(outreach).where(eq(outreach.recruiterId, recruiterId)).limit(1))[0];
    let result;

    if (existing) {
      const [updated] = await db.update(outreach).set({
        status: status || existing.status,
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : existing.lastContactedAt,
        nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : existing.nextFollowupAt,
        channel: channel || existing.channel,
        notes: outreachNotes !== undefined ? outreachNotes : existing.notes,
        updatedAt: new Date(),
      }).where(eq(outreach.id, existing.id)).returning();
      result = updated;
    } else {
      const [created] = await db.insert(outreach).values({
        recruiterId,
        collegeId: collegeId || null,
        status: status || 'Contacted',
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : new Date(),
        nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null,
        channel: channel || 'Email',
        notes: outreachNotes || null,
      }).returning();
      result = created;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error updating outreach:', error);
    res.status(500).json({ error: error.message || 'Failed to update outreach record' });
  }
});

// ==================== NOTES ====================
apiRouter.get('/notes', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const list = await db.select().from(notes)
      .where(and(eq(notes.entityType, entityType as string), eq(notes.entityId, entityId as string)))
      .orderBy(desc(notes.createdAt));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notes' });
  }
});

apiRouter.post('/notes', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, note } = req.body;
    if (!entityType || !entityId || !note || !note.trim()) {
      return res.status(400).json({ error: 'entityType, entityId, and note content are required' });
    }

    const [newNote] = await db.insert(notes).values({
      entityType,
      entityId,
      note: note.trim(),
    }).returning();

    res.status(201).json(newNote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create note' });
  }
});

// ==================== COLLEGES ====================
apiRouter.get('/colleges', async (req: Request, res: Response) => {
  try {
    const collegeList = await db.select().from(colleges).orderBy(colleges.name);
    // If empty on first startup, seed the standard Tier-1 MBA colleges
    if (collegeList.length === 0) {
      const defaultTier1Colleges = [
        { name: 'IIM Ahmedabad', city: 'Ahmedabad', tier: 'Tier 1', country: 'India', website: 'https://iima.ac.in' },
        { name: 'IIM Bangalore', city: 'Bengaluru', tier: 'Tier 1', country: 'India', website: 'https://iimb.ac.in' },
        { name: 'IIM Calcutta', city: 'Kolkata', tier: 'Tier 1', country: 'India', website: 'https://iimcal.ac.in' },
        { name: 'ISB Hyderabad/Mohali', city: 'Hyderabad', tier: 'Tier 1', country: 'India', website: 'https://isb.edu' },
        { name: 'XLRI Jamshedpur', city: 'Jamshedpur', tier: 'Tier 1', country: 'India', website: 'https://xlri.ac.in' },
        { name: 'FMS Delhi', city: 'New Delhi', tier: 'Tier 1', country: 'India', website: 'https://fms.edu' },
        { name: 'SPJIMR Mumbai', city: 'Mumbai', tier: 'Tier 1', country: 'India', website: 'https://spjimr.org' },
        { name: 'IIFT Delhi', city: 'New Delhi', tier: 'Tier 1', country: 'India', website: 'https://iift.ac.in' },
        { name: 'MDI Gurgaon', city: 'Gurugram', tier: 'Tier 1', country: 'India', website: 'https://mdi.ac.in' },
        { name: 'IIM Lucknow', city: 'Lucknow', tier: 'Tier 1', country: 'India', website: 'https://iiml.ac.in' },
        { name: 'IIM Kozhikode', city: 'Kozhikode', tier: 'Tier 1', country: 'India', website: 'https://iimk.ac.in' },
      ];
      await db.insert(colleges).values(defaultTier1Colleges);
      const reseeded = await db.select().from(colleges).orderBy(colleges.name);
      return res.json(reseeded);
    }

    res.json(collegeList);
  } catch (error: any) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch colleges' });
  }
});

apiRouter.post('/colleges', async (req: Request, res: Response) => {
  try {
    const { name, city, tier = 'Tier 1', website, country = 'India' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const [created] = await db.insert(colleges).values({
      name: name.trim(),
      city: city || null,
      tier,
      website: website || null,
      country,
    }).returning();

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create college' });
  }
});

apiRouter.get('/colleges/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await db.select({
      id: collegeCompanyHistory.id,
      year: collegeCompanyHistory.year,
      hiringType: collegeCompanyHistory.hiringType,
      role: collegeCompanyHistory.role,
      confidenceScore: collegeCompanyHistory.confidenceScore,
      createdAt: collegeCompanyHistory.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      companyIndustry: companies.industry,
    })
    .from(collegeCompanyHistory)
    .leftJoin(companies, eq(collegeCompanyHistory.companyId, companies.id))
    .where(eq(collegeCompanyHistory.collegeId, id))
    .orderBy(desc(collegeCompanyHistory.year));

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch college history' });
  }
});

apiRouter.post('/colleges/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId, year, hiringType, role, confidenceScore = 85 } = req.body;
    if (!companyId || !year) {
      return res.status(400).json({ error: 'companyId and year are required' });
    }

    const [created] = await db.insert(collegeCompanyHistory).values({
      collegeId: id,
      companyId,
      year: parseInt(year, 10),
      hiringType: hiringType || 'Final Placement',
      role: role || 'Management Trainee',
      confidenceScore: confidenceScore.toString(),
    }).returning();

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save college history' });
  }
});

// ==================== SOURCES ====================
apiRouter.get('/sources', async (req: Request, res: Response) => {
  try {
    const sourceList = await db.select({
      id: sources.id,
      url: sources.url,
      domain: sources.domain,
      sourceType: sources.sourceType,
      title: sources.title,
      publisher: sources.publisher,
      trustScore: sources.trustScore,
      retrievedAt: sources.retrievedAt,
      evidenceCount: sql<number>`(select count(*)::int from evidence where evidence.source_id = sources.id)`,
    }).from(sources).orderBy(desc(sources.retrievedAt)).limit(100);

    res.json(sourceList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch sources' });
  }
});

// ==================== EXPORT ====================
apiRouter.post('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'csv', companyId, verifiedOnly = false } = req.body;

    const conditions: any[] = [];
    if (companyId) conditions.push(eq(recruiters.currentCompanyId, companyId));
    if (verifiedOnly) conditions.push(eq(recruiters.profileStatus, 'Verified'));

    let query = db.select({
      name: recruiters.fullName,
      company: companies.name,
      title: recruiters.currentTitle,
      function: recruiters.function,
      location: recruiters.location,
      country: recruiters.country,
      linkedinUrl: recruiters.linkedinUrl,
      confidence: recruiters.confidenceScore,
      status: recruiters.profileStatus,
      lastVerified: recruiters.lastVerifiedAt,
    })
    .from(recruiters)
    .leftJoin(companies, eq(recruiters.currentCompanyId, companies.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const records = await query.orderBy(desc(recruiters.confidenceScore));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="recruiter_intelligence_export.json"');
      return res.json(records);
    }

    // CSV format
    const headers = ['Name', 'Company', 'Title', 'Function', 'Location', 'Country', 'Confidence Score', 'Status', 'Last Verified', 'LinkedIn URL'];
    const rows = records.map(r => [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.company || '').replace(/"/g, '""')}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.function || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${(r.country || '').replace(/"/g, '""')}"`,
      `"${r.confidence || ''}%"`,
      `"${r.status || ''}"`,
      `"${r.lastVerified ? new Date(r.lastVerified).toISOString().split('T')[0] : ''}"`,
      `"${r.linkedinUrl || 'Not available from permitted sources'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="recruiter_intelligence_export.csv"');
    res.send(csvContent);
  } catch (error: any) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

// ==================== OBSERVABILITY & RESEARCH LOGS ====================
apiRouter.get('/admin/research-logs', async (req: Request, res: Response) => {
  try {
    const logs = await db.select({
      id: researchJobs.id,
      query: researchJobs.query,
      status: researchJobs.status,
      startedAt: researchJobs.startedAt,
      completedAt: researchJobs.completedAt,
      resultsCount: researchJobs.resultsCount,
      errorMessage: researchJobs.errorMessage,
      metadata: researchJobs.metadata,
      companyName: companies.name,
    })
    .from(researchJobs)
    .leftJoin(companies, eq(researchJobs.companyId, companies.id))
    .orderBy(desc(researchJobs.createdAt))
    .limit(50);

    const auditEvents = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(30);

    res.json({
      jobs: logs,
      auditEvents,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch observability logs' });
  }
});

// ==================== SETTINGS & STATUS ====================
apiRouter.get('/settings', async (req: Request, res: Response) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const cloudSqlConfigured = Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);

  res.json({
    geminiStatus: geminiConfigured ? 'Connected' : 'Missing API Key in Secrets',
    databaseStatus: cloudSqlConfigured ? 'Connected (PostgreSQL / Cloud SQL)' : 'Not connected',
    searchGrounding: 'Active (Google Search Grounding via Gemini)',
    authProvider: 'Firebase Authentication / Google OAuth',
  });
});
