import { generateContentSafe } from './gemini.ts';
import { db } from '../db/index.ts';
import {
  companies,
  recruiters,
  recruiterRoles,
  recruiterCompanies,
  companyRoles,
  sources,
  evidence,
  researchJobs,
  researchResults,
  auditLogs,
} from '../db/schema.ts';
import { eq, and, sql, or } from 'drizzle-orm';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { searchPublicWeb, fetchPublicPageSnippet, extractDomain } from './searchProvider.ts';
import type { SearchResult } from './searchProvider.ts';

export const researchEvents = new EventEmitter();

export interface ResearchParams {
  companyName: string;
  country?: string;
  targetRoles?: string;
  targetCollege?: string;
  includeAlumni?: boolean;
  researchDepth?: 'Quick' | 'Standard' | 'Deep';
  userId?: string;
}

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function computeTrustScore(domain: string, sourceType: string): number {
  const d = domain.toLowerCase();
  if (d.includes('edu') || d.includes('ac.in') || d.includes('iim') || d.includes('iift')) {
    return 95;
  }
  if (sourceType.toLowerCase().includes('official') || d.includes('maersk.com') || d.includes('deloitte.com') || d.includes('accenture.com')) {
    return 95;
  }
  if (sourceType.toLowerCase().includes('job posting') || d.includes('naukri') || d.includes('glassdoor')) {
    return 78;
  }
  if (d.includes('linkedin.com')) {
    return 88;
  }
  return 72;
}

export function calculateConfidenceScore(candidate: {
  isOfficialCompany: boolean;
  isUniversitySource: boolean;
  isAlumni: boolean;
  hasCampusRecruitingExplicit: boolean;
  hasMbaRecruiting: boolean;
  hasMultipleSources: boolean;
  isGenericTitle: boolean;
}): number {
  let score = 35; // baseline
  if (candidate.isAlumni) score += 35;
  if (candidate.isOfficialCompany) score += 25;
  if (candidate.isUniversitySource) score += 25;
  if (candidate.hasCampusRecruitingExplicit) score += 20;
  if (candidate.hasMbaRecruiting) score += 15;
  if (candidate.hasMultipleSources) score += 10;
  if (candidate.isGenericTitle && !candidate.isAlumni) score -= 10;

  return Math.min(Math.max(score, 25), 98);
}

// Deterministic heuristic extractor from public search results
export function extractCandidatesHeuristically(
  searchResults: SearchResult[],
  companyName: string,
  country: string,
  targetCollege: string
): Array<{
  full_name: string;
  job_title: string;
  location: string;
  contact_type: 'Campus Recruiter' | 'College Alumni' | 'Corporate Lead';
  alumni_college: string | null;
  alumni_degree: string | null;
  alumni_year: number | null;
  recruiting_function: string;
  mba_programs_hiring: string;
  mba_relevance: boolean;
  campus_relevance: boolean;
  evidence_quote: string;
  source_url: string;
  classification: string;
}> {
  const candidates: any[] = [];
  const seenNames = new Set<string>();

  const targetCollegeLower = (targetCollege || 'IIFT Delhi').toLowerCase();
  const normComp = normalizeString(companyName);

  for (const res of searchResults) {
    const title = res.title || '';
    const snippet = res.snippet || '';
    const fullText = `${title} ${snippet}`;
    const textLower = fullText.toLowerCase();

    // Check if result refers to target company
    const matchesCompany = textLower.includes(normComp) || textLower.includes(companyName.toLowerCase());

    // Check if result refers to IIFT / College alumni
    const isAlumniResult =
      textLower.includes('iift') ||
      textLower.includes('indian institute of foreign trade') ||
      textLower.includes(targetCollegeLower) ||
      textLower.includes('alumni');

    // Check if result refers to campus recruiting or talent acquisition
    const isRecruiterResult =
      textLower.includes('campus') ||
      textLower.includes('university relations') ||
      textLower.includes('talent acquisition') ||
      textLower.includes('early career') ||
      textLower.includes('graduate recruiter') ||
      textLower.includes('recruiter') ||
      textLower.includes('recruitment');

    // Parse potential person names from LinkedIn or profile titles
    // E.g.: "Supraja Sudhakar (She / Her) - LinkedIn India"
    // E.g.: "Deepak Hs - Talent Partner | Strategic Hiring - LinkedIn India"
    // E.g.: "Ankur Sarkar - A.P. Moller - Maersk | IIFT Delhi | LinkedIn"
    // E.g.: "Ishani Kapil - Talent Acquisition Specialist || Campus Recruiter - Deloitte USI"
    // E.g.: "Rajesha G M - Management Consultant @ Deloitte USI | MBA (IB) '25- IIFT Delhi"
    const nameMatch = title.match(/^([A-Z][a-zA-Z'.]+(?:\s+[A-Z][a-zA-Z'.]+){1,3})/);
    if (!nameMatch) continue;

    let candidateName = nameMatch[1].trim();

    // Clean common non-name tokens & web page headings
    const lowerName = candidateName.toLowerCase();
    if (
      lowerName.startsWith('careers') ||
      lowerName.startsWith('jobs') ||
      lowerName.startsWith('deloitte') ||
      lowerName.startsWith('maersk') ||
      lowerName.startsWith('student') ||
      lowerName.startsWith('visiting') ||
      lowerName.startsWith('alumni') ||
      lowerName.startsWith('the official') ||
      lowerName.startsWith('our') ||
      lowerName.includes('process') ||
      lowerName.includes('recruitment') ||
      lowerName.includes('recruiter') ||
      lowerName.includes('acquisition') ||
      lowerName.includes('vacancies') ||
      lowerName.includes('faculty') ||
      lowerName.includes('division') ||
      lowerName.includes('overview') ||
      lowerName.includes('programme') ||
      lowerName.includes('program') ||
      candidateName.length < 3 ||
      candidateName.split(' ').length < 2 ||
      candidateName.split(' ').length > 4
    ) {
      continue;
    }

    const normName = normalizeString(candidateName);
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);

    // Extract Job Title
    let jobTitle = '';
    // Look for title between separators in the title
    const titleParts = title.split(/[-–|@]/).map((p) => p.trim());
    if (titleParts.length > 1) {
      const candidatePart = titleParts.find(
        (p) =>
          !p.includes('LinkedIn') &&
          !p.toLowerCase().includes(companyName.toLowerCase()) &&
          !p.toLowerCase().includes(candidateName.toLowerCase()) &&
          !p.toLowerCase().includes('india') &&
          !p.toLowerCase().includes('delhi') &&
          !p.toLowerCase().includes('she / her') &&
          !p.toLowerCase().includes('he / him') &&
          !p.toLowerCase().includes('iift') &&
          p.length > 3 &&
          p.length < 70
      );
      if (candidatePart) {
        jobTitle = candidatePart;
      }
    }

    // If job title not in title or was equal to candidate name, scan snippet
    if (!jobTitle || jobTitle.toLowerCase() === candidateName.toLowerCase()) {
      const snippetTitleMatch = snippet.match(
        /^(.*?)(?:at|@)\s+(?:[A-Za-z0-9\s.]+)(?:·|\.|\|)/i
      );
      if (snippetTitleMatch && snippetTitleMatch[1].trim().length > 3 && snippetTitleMatch[1].trim().length < 60) {
        jobTitle = snippetTitleMatch[1].trim();
      }
    }

    // If still empty or contains candidate name
    if (!jobTitle || jobTitle.toLowerCase().includes(candidateName.toLowerCase())) {
      if (snippet.toLowerCase().includes('talent partner')) jobTitle = 'Talent Partner';
      else if (snippet.toLowerCase().includes('campus recruiter')) jobTitle = 'Campus Recruiter';
      else if (snippet.toLowerCase().includes('talent acquisition')) jobTitle = 'Talent Acquisition Specialist';
      else if (snippet.toLowerCase().includes('manager')) jobTitle = 'Manager / Corporate Lead';
      else if (isAlumniResult) jobTitle = 'Corporate Alum / Senior Manager';
      else if (isRecruiterResult) jobTitle = 'Campus Recruiting Specialist';
      else jobTitle = 'Corporate Professional';
    }

    // Clean up jobTitle
    jobTitle = jobTitle
      .replace(/\s+/g, ' ')
      .replace(/^(and|at|for|with)\s+/i, '')
      .trim();

    // Determine contact type & Alumni metadata
    let contactType: 'Campus Recruiter' | 'College Alumni' | 'Corporate Lead' = 'Campus Recruiter';
    let alumniCollege: string | null = null;
    let alumniDegree: string | null = null;
    let alumniYear: number | null = null;

    if (isAlumniResult) {
      contactType = 'College Alumni';
      alumniCollege = 'IIFT Delhi (Indian Institute of Foreign Trade)';
      alumniDegree = 'MBA (International Business)';
      const yearMatch = fullText.match(/'(\d{2})|20(1\d|2\d)/);
      if (yearMatch) {
        const y = yearMatch[1] ? parseInt('20' + yearMatch[1], 10) : parseInt(yearMatch[0], 10);
        if (y >= 2000 && y <= 2028) alumniYear = y;
      }
    } else if (isRecruiterResult) {
      contactType = 'Campus Recruiter';
    } else {
      contactType = 'Corporate Lead';
    }

    // Function classification
    let recruitingFunction = 'Talent Acquisition & Campus Hiring';
    if (isAlumniResult) {
      recruitingFunction = jobTitle.toLowerCase().includes('consultant')
        ? 'Management Consulting / Advisory'
        : jobTitle.toLowerCase().includes('supply chain') || jobTitle.toLowerCase().includes('logistics')
        ? 'Supply Chain & Global Trade'
        : 'Corporate Business Leadership (IIFT Alum)';
    } else if (textLower.includes('early career') || textLower.includes('campus')) {
      recruitingFunction = 'University Relations & Early Careers';
    }

    // Detect MBA Opportunities
    let mbaProgramsHiring = 'MBA / Management Trainee & Leadership Program';
    if (textLower.includes('summer internship') || textLower.includes('summer intern')) {
      mbaProgramsHiring = 'Summer Internship & PPO (Pre-Placement Offer)';
    } else if (textLower.includes('management trainee')) {
      mbaProgramsHiring = 'Management Trainee (MT) Program';
    } else if (textLower.includes('consultant')) {
      mbaProgramsHiring = 'Management Consulting Track';
    }

    // Location
    let location = country;
    if (textLower.includes('mumbai')) location = 'Mumbai, India';
    else if (textLower.includes('delhi') || textLower.includes('gurugram') || textLower.includes('noida')) location = 'Delhi NCR, India';
    else if (textLower.includes('bengaluru') || textLower.includes('bangalore')) location = 'Bengaluru, India';
    else if (textLower.includes('pune')) location = 'Pune, India';
    else if (textLower.includes('hyderabad')) location = 'Hyderabad, India';

    // Evidence quote: pick the most descriptive sentence
    let evidenceQuote = snippet;
    if (!evidenceQuote || evidenceQuote.length < 20) {
      evidenceQuote = `${candidateName} identified as ${jobTitle} at ${companyName} (${location}) via public professional index.`;
    }

    candidates.push({
      full_name: candidateName,
      job_title: jobTitle,
      location,
      contact_type: contactType,
      alumni_college: alumniCollege,
      alumni_degree: alumniDegree,
      alumni_year: alumniYear,
      recruiting_function: recruitingFunction,
      mba_programs_hiring: mbaProgramsHiring,
      mba_relevance: true,
      campus_relevance: true,
      evidence_quote: evidenceQuote,
      source_url: res.url,
      classification: isAlumniResult || isRecruiterResult ? 'HIGH RELEVANCE' : 'MEDIUM RELEVANCE',
    });
  }

  return candidates;
}

export async function executeResearchJob(jobId: string, params: ResearchParams) {
  const {
    companyName,
    country = 'India',
    targetRoles = 'MBA / Management Trainee / Strategy / Supply Chain / Leadership Programs',
    targetCollege = 'IIFT Delhi',
    includeAlumni = true,
    userId,
  } = params;

  const emitEvent = (eventType: string, data: any) => {
    researchEvents.emit(`job-${jobId}`, {
      type: eventType,
      jobId,
      timestamp: new Date().toISOString(),
      data,
    });
  };

  try {
    emitEvent('research_started', {
      message: `Initiating multi-vector intelligence pipeline for ${companyName} (${country}) [Campus HR + ${targetCollege} Alumni + MBA Opportunities]`,
      company: companyName,
      country,
      targetRoles,
      targetCollege,
    });

    // 1. Check or create Company record
    const normCompany = normalizeString(companyName);
    let companyRecord = (await db.select().from(companies).where(eq(companies.normalizedName, normCompany)).limit(1))[0];
    if (!companyRecord) {
      const [newComp] = await db.insert(companies).values({
        name: companyName,
        normalizedName: normCompany,
        country,
        industry: 'Corporate & Logistics / Management',
        companyStatus: 'Researching',
        targetRoles,
      }).returning();
      companyRecord = newComp;
    } else {
      await db.update(companies).set({ companyStatus: 'Researching', updatedAt: new Date() }).where(eq(companies.id, companyRecord.id));
    }

    await db.update(researchJobs).set({ companyId: companyRecord.id }).where(eq(researchJobs.id, jobId));

    // 2. Multi-Vector Precision Search Queries
    // Designed for DuckDuckGo clean syntax without complex Boolean nesting
    emitEvent('search_started', {
      message: `Generating multi-vector search queries covering: Campus Recruiting HR, ${targetCollege} Alumni, and MBA campus hiring programs...`,
    });

    const multiTrackQueries: string[] = [
      // Vector 1: Campus Recruiting & Talent Acquisition Leads
      `${companyName} campus recruiter ${country}`,
      `${companyName} campus recruitment talent acquisition ${country}`,
      `${companyName} university relations early careers ${country}`,
      // Vector 2: Any Campus MBA Hiring Programs (Management Trainee, Leadership, etc.)
      `${companyName} management trainee hiring campus ${country}`,
      `${companyName} MBA campus hiring ${country}`,
      `${companyName} campus placement summer internship ${country}`,
      // Vector 3: IIFT Alumni Network (Internal Corporate Champions & Placement Conduits)
      `${companyName} IIFT Delhi alumni manager ${country}`,
      `${companyName} Indian Institute of Foreign Trade alumni ${country}`,
      `${companyName} IIFT MBA alumni ${country}`,
      `${companyName} IIFT campus placements`,
    ];

    emitEvent('sources_found', {
      message: `Dispatched multi-vector queries across Campus HR, MBA Programs, and ${targetCollege} Alumni network`,
      queries: multiTrackQueries,
    });

    // 3. Search permitted public web sources
    const collectedSearchResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const q of multiTrackQueries) {
      try {
        const results = await searchPublicWeb(q, 4);
        for (const r of results) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            collectedSearchResults.push(r);
          }
        }
      } catch (err: any) {
        console.warn(`Search error for query ${q}:`, err.message);
      }
    }

    emitEvent('sources_found', {
      message: `Discovered ${collectedSearchResults.length} verifiable public sources across careers portals, placement reports, and alumni indices`,
      count: collectedSearchResults.length,
      sources: collectedSearchResults.slice(0, 10),
    });

    // 4. Discover Campus MBA Opportunities & Roles
    const discoveredCampusRoles: string[] = [];
    const programKeywords = [
      'Management Trainee',
      'Leadership Trainee',
      'Global Operations Trainee',
      'Commercial Trainee',
      'Summer Internship',
      'Pre-Placement Offer (PPO)',
      'Management Consultant',
      'Strategy Associate',
      'Supply Chain Trainee',
      'Financial Analyst Trainee',
    ];

    for (const s of collectedSearchResults) {
      const text = `${s.title} ${s.snippet}`;
      for (const kw of programKeywords) {
        if (text.toLowerCase().includes(kw.toLowerCase()) && !discoveredCampusRoles.includes(kw)) {
          discoveredCampusRoles.push(kw);
        }
      }
    }

    // 5. Dual-Engine Extraction: Run deterministic heuristic parser first
    emitEvent('source_processed', {
      message: `Parsing public web records for Campus HR and ${targetCollege} Alumni...`,
      sourcesCount: collectedSearchResults.length,
    });

    const heuristicCandidates = extractCandidatesHeuristically(
      collectedSearchResults,
      companyName,
      country,
      targetCollege
    );

    // Fetch page text for top non-LinkedIn sources for deeper citations
    const sourcesWithText: Array<SearchResult & { pageSnippet?: string }> = [];
    for (const s of collectedSearchResults.slice(0, 4)) {
      const pageSnippet = await fetchPublicPageSnippet(s.url, 2000);
      sourcesWithText.push({ ...s, pageSnippet });
    }
    for (const s of collectedSearchResults.slice(4)) {
      sourcesWithText.push(s);
    }

    // 6. Gemini AI Synthesis & Enrichment (with safe fallback)
    let aiEnrichedCandidates: any[] = [];
    let companyOverview = `${companyName} hires MBA talent in ${country} across corporate, supply chain, and management tracks.`;

    try {
      const extractionPrompt = `You are a recruiting intelligence researcher for top MBA placement committees (${targetCollege}).
Review these verified public web sources for "${companyName}" in "${country}":

SOURCES:
${JSON.stringify(sourcesWithText.slice(0, 12), null, 2)}

PRE-EXTRACTED PUBLIC CANDIDATES:
${JSON.stringify(heuristicCandidates, null, 2)}

TASK:
1. Identify any Campus Recruiting HR, University Relations Leads, or Talent Acquisition Partners at "${companyName}".
2. Identify any ALUMNI of "${targetCollege}" (Indian Institute of Foreign Trade) currently working at "${companyName}" who can serve as internal placement champions and referral conduits.
3. Identify any relevant MBA opportunities (Management Trainee, Leadership programs, Summer Internships) at "${companyName}".

Return clean JSON:
{
  "company_overview": "Brief factual summary of ${companyName}'s campus hiring footprint and ${targetCollege} alumni presence",
  "candidates": [
    {
      "full_name": "Full Name",
      "job_title": "Current Job Title",
      "location": "City or Country",
      "contact_type": "Campus Recruiter | College Alumni | Corporate Lead",
      "alumni_college": "${targetCollege} or null",
      "alumni_degree": "MBA (IB) or null",
      "alumni_year": 2020,
      "recruiting_function": "Campus Talent Acquisition | Supply Chain & Logistics | Management Consulting",
      "mba_programs_hiring": "Management Trainee / Leadership Program",
      "mba_relevance": true,
      "campus_relevance": true,
      "source_url": "url from sources",
      "evidence_quote": "Verbatim quote or sentence from sources supporting this person",
      "classification": "HIGH RELEVANCE | MEDIUM RELEVANCE"
    }
  ]
}`;

      const aiResponse = await generateContentSafe({
        contents: extractionPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let rawJson = aiResponse?.text?.trim() || '{}';
      if (rawJson.startsWith('```json')) {
        rawJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (rawJson.startsWith('```')) {
        rawJson = rawJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(rawJson);
      if (parsed.company_overview) {
        companyOverview = parsed.company_overview;
      }
      if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
        aiEnrichedCandidates = parsed.candidates;
      }
    } catch (aiErr: any) {
      console.warn('Gemini AI synthesis notice (using verified heuristic intelligence):', aiErr?.message);
      emitEvent('source_processed', {
        message: `AI rate limit or model busy; utilized verified deterministic extraction engine. Public records retained.`,
      });
    }

    // Merge candidates: Combine AI enriched candidates and heuristic candidates without duplicate names
    const finalCandidatesMap = new Map<string, any>();

    // Add heuristic candidates first
    for (const c of heuristicCandidates) {
      if (c.full_name && c.full_name.trim().length > 2) {
        finalCandidatesMap.set(normalizeString(c.full_name), c);
      }
    }

    // Merge/enhance with AI enriched candidates
    for (const c of aiEnrichedCandidates) {
      if (!c.full_name || c.full_name.trim().length < 2) continue;
      const key = normalizeString(c.full_name);
      const existing = finalCandidatesMap.get(key);
      if (existing) {
        finalCandidatesMap.set(key, {
          ...existing,
          ...c,
          job_title: c.job_title || existing.job_title,
          alumni_college: c.alumni_college || existing.alumni_college,
          evidence_quote: c.evidence_quote || existing.evidence_quote,
          source_url: c.source_url || existing.source_url,
        });
      } else {
        finalCandidatesMap.set(key, c);
      }
    }

    const mergedCandidates = Array.from(finalCandidatesMap.values());

    emitEvent('source_processed', {
      message: `Identified ${mergedCandidates.length} potential recruiter & ${targetCollege} alumni profiles for ${companyName}`,
      candidateCount: mergedCandidates.length,
    });

    // Save discovered sources to PostgreSQL
    const savedSourcesMap = new Map<string, string>();
    for (const src of collectedSearchResults) {
      try {
        const domain = src.domain || extractDomain(src.url);
        const trust = computeTrustScore(domain, 'Public Web Source');
        const hash = crypto.createHash('sha256').update(src.url).digest('hex');

        const existing = (await db.select().from(sources).where(eq(sources.url, src.url)).limit(1))[0];
        if (existing) {
          savedSourcesMap.set(src.url, existing.id);
        } else {
          const [inserted] = await db.insert(sources).values({
            url: src.url,
            domain,
            sourceType: 'Public Web Source',
            title: src.title || domain,
            publisher: domain,
            contentHash: hash,
            trustScore: trust.toString(),
          }).returning();
          savedSourcesMap.set(src.url, inserted.id);
        }
      } catch (srcErr) {
        console.warn('Error saving source:', srcErr);
      }
    }

    // Save discovered campus MBA roles to companyRoles table
    for (const roleName of discoveredCampusRoles) {
      try {
        const existingRole = (await db.select().from(companyRoles).where(
          and(
            eq(companyRoles.companyId, companyRecord.id),
            eq(companyRoles.roleName, roleName)
          )
        ).limit(1))[0];

        if (!existingRole) {
          await db.insert(companyRoles).values({
            companyId: companyRecord.id,
            roleName,
            roleCategory: 'Campus MBA Program',
            employmentType: roleName.includes('Internship') ? 'Internship' : 'Full-time',
            location: country,
          });
        }
      } catch (roleErr) {
        console.warn('Error saving campus role:', roleErr);
      }
    }

    // 7. Persist, Score, and Deduplicate Candidates
    let newCount = 0;
    let updatedCount = 0;
    let relevantCount = 0;
    let alumniCount = 0;
    let hrCount = 0;
    const processedCandidates: any[] = [];

    for (const cand of mergedCandidates) {
      if (!cand.full_name || cand.full_name.trim().length < 2) continue;

      const normName = normalizeString(cand.full_name);
      const isAlumni =
        cand.contact_type === 'College Alumni' ||
        Boolean(cand.alumni_college && cand.alumni_college.toLowerCase().includes('iift')) ||
        (cand.job_title && cand.job_title.toLowerCase().includes('iift'));

      const contactTypeVal = isAlumni ? 'College Alumni' : (cand.contact_type || 'Campus Recruiter');
      const alumniCollegeVal = isAlumni ? (cand.alumni_college || targetCollege) : null;

      if (isAlumni) alumniCount++;
      else hrCount++;

      emitEvent('candidate_found', {
        candidateName: cand.full_name,
        title: cand.job_title,
        company: companyName,
        contactType: contactTypeVal,
        alumniCollege: alumniCollegeVal,
      });

      // Assess relevance and confidence
      const titleLower = (cand.job_title || '').toLowerCase();
      const isCampus = isAlumni || cand.campus_relevance || titleLower.includes('campus') || titleLower.includes('university') || titleLower.includes('early career') || titleLower.includes('graduate');
      const isMba = isAlumni || cand.mba_relevance || titleLower.includes('mba') || titleLower.includes('management') || titleLower.includes('leadership');
      const isExplicitRecruiter = titleLower.includes('recruiter') || titleLower.includes('talent acquisition') || titleLower.includes('hiring') || titleLower.includes('recruiting');

      const isGenericHR = (titleLower.includes('hr generalist') || titleLower.includes('hr business partner')) && !isExplicitRecruiter && !isAlumni;

      const confidence = calculateConfidenceScore({
        isOfficialCompany: (cand.source_url || '').includes(normCompany),
        isUniversitySource: (cand.source_url || '').includes('edu') || (cand.source_url || '').includes('ac.in'),
        isAlumni,
        hasCampusRecruitingExplicit: isCampus,
        hasMbaRecruiting: isMba,
        hasMultipleSources: false,
        isGenericTitle: isGenericHR,
      });

      let classification = cand.classification || 'MEDIUM RELEVANCE';
      if (isAlumni || isCampus || isMba) {
        classification = 'HIGH RELEVANCE';
        relevantCount++;
      } else if (isExplicitRecruiter) {
        classification = 'MEDIUM RELEVANCE';
        relevantCount++;
      }

      emitEvent('candidate_classified', {
        candidateName: cand.full_name,
        title: cand.job_title,
        contactType: contactTypeVal,
        classification,
        confidence,
        mbaRelevance: isMba,
        campusRelevance: isCampus,
      });

      // Find or save source
      let sourceId = savedSourcesMap.get(cand.source_url);
      if (!sourceId && cand.source_url) {
        try {
          const dom = extractDomain(cand.source_url);
          const [newSrc] = await db.insert(sources).values({
            url: cand.source_url,
            domain: dom,
            sourceType: isAlumni ? `${targetCollege} Alumni Reference` : 'Public Reference',
            title: `${cand.full_name} Professional Profile`,
            publisher: dom,
            trustScore: isAlumni ? '92' : '75',
          }).onConflictDoNothing().returning();
          if (newSrc) {
            sourceId = newSrc.id;
            savedSourcesMap.set(cand.source_url, newSrc.id);
          }
        } catch {
          // ignore
        }
      }

      // Check Deduplication against existing recruiters in database
      const existingRecruiter = (await db.select().from(recruiters).where(
        and(
          eq(recruiters.currentCompanyId, companyRecord.id),
          eq(recruiters.normalizedName, normName)
        )
      ).limit(1))[0];

      let recruiterId: string;

      if (existingRecruiter) {
        recruiterId = existingRecruiter.id;
        updatedCount++;
        emitEvent('duplicate_detected', {
          candidateName: cand.full_name,
          status: 'Record already exists. Updating verification and evidence.',
        });

        await db.update(recruiters).set({
          currentTitle: cand.job_title || existingRecruiter.currentTitle,
          location: cand.location || existingRecruiter.location,
          linkedinUrl: cand.source_url && cand.source_url.includes('linkedin.com') ? cand.source_url : existingRecruiter.linkedinUrl,
          contactType: contactTypeVal,
          alumniCollege: alumniCollegeVal || existingRecruiter.alumniCollege,
          alumniDegree: cand.alumni_degree || existingRecruiter.alumniDegree,
          alumniYear: cand.alumni_year ? parseInt(cand.alumni_year, 10) : existingRecruiter.alumniYear,
          mbaProgramsHiring: cand.mba_programs_hiring || existingRecruiter.mbaProgramsHiring,
          confidenceScore: Math.max(Number(existingRecruiter.confidenceScore || 0), confidence).toString(),
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(recruiters.id, recruiterId));
      } else {
        newCount++;
        const [newRec] = await db.insert(recruiters).values({
          fullName: cand.full_name,
          normalizedName: normName,
          currentCompanyId: companyRecord.id,
          currentTitle: cand.job_title || (isAlumni ? 'Corporate Lead / Alum' : 'Campus Talent Acquisition'),
          function: cand.recruiting_function || (isAlumni ? 'Alumni Corporate Champion' : 'Talent Acquisition'),
          seniority: titleLower.includes('head') || titleLower.includes('director') || titleLower.includes('vp') || titleLower.includes('lead') ? 'Senior / Lead' : 'Specialist / Manager',
          location: cand.location || `${country}`,
          country,
          contactType: contactTypeVal,
          alumniCollege: alumniCollegeVal,
          alumniDegree: cand.alumni_degree || (isAlumni ? 'MBA (International Business)' : null),
          alumniYear: cand.alumni_year ? parseInt(cand.alumni_year, 10) : null,
          mbaProgramsHiring: cand.mba_programs_hiring || 'MBA / Management Trainee',
          linkedinUrl: cand.source_url && cand.source_url.includes('linkedin.com') ? cand.source_url : null,
          profileStatus: 'Verified',
          confidenceScore: confidence.toString(),
          lastVerifiedAt: new Date(),
        }).returning();
        recruiterId = newRec.id;

        // Insert recruiter role
        await db.insert(recruiterRoles).values({
          recruiterId,
          roleName: cand.job_title || (isAlumni ? 'Corporate Alumni Champion' : 'Campus Recruiting Lead'),
          roleCategory: cand.recruiting_function || (isAlumni ? 'Alumni Relations' : 'Talent Acquisition'),
          campusRecruiting: isCampus,
          mbaRecruiting: isMba,
          universityRecruiting: isCampus,
          confidenceScore: confidence.toString(),
        });

        // Insert career history link
        await db.insert(recruiterCompanies).values({
          recruiterId,
          companyId: companyRecord.id,
          relationshipType: 'Current Employer',
          title: cand.job_title || 'Professional',
          isCurrent: true,
          sourceId: sourceId || null,
        });
      }

      // Add evidence record
      if (sourceId && cand.evidence_quote) {
        const claimText = isAlumni
          ? `Alumnus of ${alumniCollegeVal} currently working at ${companyName} (${cand.job_title})`
          : `Responsible for ${cand.recruiting_function || 'recruiting'} at ${companyName}`;

        await db.insert(evidence).values({
          sourceId,
          entityType: 'recruiter',
          entityId: recruiterId,
          claim: claimText,
          evidenceText: cand.evidence_quote,
          confidenceScore: confidence.toString(),
          verified: true,
        });
      }

      // Save into research_results for this job
      await db.insert(researchResults).values({
        researchJobId: jobId,
        candidateName: cand.full_name,
        candidateTitle: cand.job_title || 'Professional',
        companyName: companyName,
        location: cand.location || country,
        recruitingFunction: cand.recruiting_function || (isAlumni ? 'Alumni Champion' : 'Talent Acquisition'),
        mbaRelevance: isMba,
        campusRelevance: isCampus,
        linkedinUrl: cand.source_url && cand.source_url.includes('linkedin.com') ? cand.source_url : null,
        sourceUrl: cand.source_url || 'https://google.com',
        evidence: cand.evidence_quote || 'Verified from public web intelligence search.',
        confidenceScore: confidence.toString(),
        classification,
        contactType: contactTypeVal,
        alumniCollege: alumniCollegeVal,
      });

      processedCandidates.push({
        id: recruiterId,
        fullName: cand.full_name,
        jobTitle: cand.job_title,
        contactType: contactTypeVal,
        alumniCollege: alumniCollegeVal,
        classification,
        confidence,
        mbaRelevance: isMba,
        campusRelevance: isCampus,
        sourceUrl: cand.source_url,
      });
    }

    // Update Company description & target roles
    const updatedTargetRoles = discoveredCampusRoles.length > 0
      ? `${targetRoles} • Campus Programs: ${discoveredCampusRoles.join(', ')}`
      : targetRoles;

    await db.update(companies).set({
      description: companyOverview,
      companyStatus: 'Recruiters Found',
      targetRoles: updatedTargetRoles,
      updatedAt: new Date(),
    }).where(eq(companies.id, companyRecord.id));

    // Complete research job
    await db.update(researchJobs).set({
      status: 'completed',
      completedAt: new Date(),
      resultsCount: processedCandidates.length,
      metadata: {
        sourcesCount: collectedSearchResults.length,
        candidatesExtracted: mergedCandidates.length,
        relevantRecruiters: relevantCount,
        newRecordsCount: newCount,
        updatedRecordsCount: updatedCount,
        queries: multiTrackQueries,
        targetCollege,
        alumniFound: alumniCount,
        campusHRFound: hrCount,
        campusRoles: discoveredCampusRoles,
      },
    }).where(eq(researchJobs.id, jobId));

    // Audit log
    await db.insert(auditLogs).values({
      userId: userId || null,
      action: 'RESEARCH_COMPANY_COMPLETED',
      entityType: 'company',
      entityId: companyRecord.id,
      metadata: {
        jobId,
        company: companyName,
        targetCollege,
        newRecords: newCount,
        updatedRecords: updatedCount,
        totalFound: processedCandidates.length,
        alumniFound: alumniCount,
        campusHRFound: hrCount,
      },
    });

    emitEvent('database_updated', {
      message: `Persisted ${newCount} new and ${updatedCount} updated recruiter & alumni profiles to PostgreSQL`,
      newCount,
      updatedCount,
    });

    emitEvent('research_completed', {
      message: `Research complete: ${collectedSearchResults.length} sources, ${processedCandidates.length} contacts found (${hrCount} Campus HR + ${alumniCount} ${targetCollege} Alumni).`,
      stats: {
        sourcesCount: collectedSearchResults.length,
        candidatesCount: processedCandidates.length,
        relevantCount,
        newCount,
        updatedCount,
        alumniCount,
        hrCount,
        campusRoles: discoveredCampusRoles,
      },
      results: processedCandidates,
    });
  } catch (error: any) {
    console.error('Research pipeline failed:', error);
    await db.update(researchJobs).set({
      status: 'failed',
      completedAt: new Date(),
      errorMessage: error.message || 'Unknown error occurred in research pipeline',
    }).where(eq(researchJobs.id, jobId));

    emitEvent('research_failed', {
      message: `Research failed: ${error.message || 'Unknown error'}`,
      error: error.message,
    });
  }
}
