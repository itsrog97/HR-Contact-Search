export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export function extractDomain(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '--');
}

export function cleanQueryForSearch(query: string): string {
  return query
    .replace(/[“”]/g, '"')
    .replace(/(\w+)"(\w+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

let uaIndex = 0;

export async function searchPublicWeb(query: string, maxResults = 8): Promise<SearchResult[]> {
  const cleanedQuery = cleanQueryForSearch(query);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ua = USER_AGENTS[(uaIndex++) % USER_AGENTS.length];
      const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(cleanedQuery);

      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Referer': 'https://html.duckduckgo.com/html/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(7500),
      });

      if (res.status === 202) {
        // If DDG gives 202 challenge, back off 1.8s and retry once with fresh UA
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 1800));
          continue;
        }
        return [];
      }

      if (!res.ok) {
        return [];
      }

      const html = await res.text();
      const results: SearchResult[] = [];
      const regex = /<a rel=\"nofollow\" class=\"result__a\" href=\"([^\"]+)\">([\s\S]*?)<\/a>[\s\S]*?<a class=\"result__snippet\"[^>]*>([\s\S]*?)<\/a>/g;

      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null && results.length < maxResults) {
        let rawUrl = match[1];
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            rawUrl = decodeURIComponent(uddgMatch[1]);
          }
        }

        if (rawUrl.startsWith('//')) {
          rawUrl = 'https:' + rawUrl;
        }

        const rawTitle = match[2].replace(/<[^>]+>/g, '');
        const rawSnippet = match[3].replace(/<[^>]+>/g, '');

        const title = decodeHtmlEntities(rawTitle).trim();
        const snippet = decodeHtmlEntities(rawSnippet).trim();

        if (rawUrl && title && !rawUrl.includes('duckduckgo.com')) {
          results.push({
            title,
            url: rawUrl,
            snippet,
            domain: extractDomain(rawUrl),
          });
        }
      }

      if (results.length > 0) {
        return results;
      }
    } catch (err: any) {
      console.warn(`Search attempt ${attempt} warning for query "${cleanedQuery}":`, err.message);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  return [];
}

export async function fetchPublicPageSnippet(url: string, maxLength = 2500): Promise<string> {
  try {
    if (url.includes('linkedin.com')) {
      return '';
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,text/plain',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return '';
    const text = await res.text();

    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return decodeHtmlEntities(cleaned.slice(0, maxLength));
  } catch {
    return '';
  }
}
