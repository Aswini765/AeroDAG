/**
 * AeroDAG Trusted Source Registry & Classification
 * 
 * Manages official regulatory source allowlists, trust classifications,
 * URL security validation, HTTPS enforcement, and SSRF prevention.
 * Ensures only server-controlled, authoritative sources can establish visa eligibility.
 */

import { TrustLevel } from '../../types/travelKnowledge';

export interface TrustedSourceEntry {
  country: string;
  sourceName: string;
  sourceUrl: string;
  trustLevel: TrustLevel;
  sourceType: 'IMMIGRATION_AUTHORITY' | 'MINISTRY_FOREIGN_AFFAIRS' | 'EMBASSY' | 'INTERNATIONAL_ORG' | 'AIRLINE';
  jurisdiction: string;
  description: string;
}

export class TrustedSourceRegistry {
  private static readonly PRIVATE_IP_PATTERNS = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^0\./,
    /^localhost$/i,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i
  ];

  // Official authoritative domains allowlist
  private static readonly AUTHORITATIVE_DOMAINS: Array<{
    domainPattern: RegExp;
    trustLevel: TrustLevel;
    jurisdiction?: string;
  }> = [
    // Singapore
    { domainPattern: /(?:^|\.)ica\.gov\.sg$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Singapore' },
    { domainPattern: /(?:^|\.)mfa\.gov\.sg$/i, trustLevel: 'TRUSTED_GOVERNMENT', jurisdiction: 'Singapore' },
    { domainPattern: /(?:^|\.)visitsingapore\.com$/i, trustLevel: 'SECONDARY_REFERENCE', jurisdiction: 'Singapore' },
    { domainPattern: /(?:^|\.)singaporeair\.com$/i, trustLevel: 'TRUSTED_AIRLINE', jurisdiction: 'Global' },

    // Vietnam
    { domainPattern: /(?:^|\.)evisa\.xuatnhapcanh\.gov\.vn$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Vietnam' },
    { domainPattern: /(?:^|\.)mofa\.gov\.vn$/i, trustLevel: 'TRUSTED_GOVERNMENT', jurisdiction: 'Vietnam' },
    { domainPattern: /(?:^|\.)vietnamembassy-india\.in$/i, trustLevel: 'TRUSTED_EMBASSY', jurisdiction: 'Vietnam' },

    // Thailand
    { domainPattern: /(?:^|\.)immigration\.go\.th$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Thailand' },
    { domainPattern: /(?:^|\.)thaievisa\.go\.th$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Thailand' },
    { domainPattern: /(?:^|\.)mfa\.go\.th$/i, trustLevel: 'TRUSTED_GOVERNMENT', jurisdiction: 'Thailand' },
    { domainPattern: /(?:^|\.)thaiemb.org\.in$/i, trustLevel: 'TRUSTED_EMBASSY', jurisdiction: 'Thailand' },

    // Japan
    { domainPattern: /(?:^|\.)mofa\.go\.jp$/i, trustLevel: 'TRUSTED_GOVERNMENT', jurisdiction: 'Japan' },
    { domainPattern: /(?:^|\.)isa\.go\.jp$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Japan' },
    { domainPattern: /(?:^|\.)evisa\.mofa\.go\.jp$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'Japan' },
    { domainPattern: /(?:^|\.)vfs-japan\.in$/i, trustLevel: 'SECONDARY_REFERENCE', jurisdiction: 'Japan' },

    // India
    { domainPattern: /(?:^|\.)indianvisaonline\.gov\.in$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'India' },
    { domainPattern: /(?:^|\.)boi\.gov\.in$/i, trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY', jurisdiction: 'India' },
    { domainPattern: /(?:^|\.)mea\.gov\.in$/i, trustLevel: 'TRUSTED_GOVERNMENT', jurisdiction: 'India' },
    { domainPattern: /(?:^|\.)airindia\.com$/i, trustLevel: 'TRUSTED_AIRLINE', jurisdiction: 'India' },

    // International Organizations
    { domainPattern: /(?:^|\.)iatatravelcentre\.com$/i, trustLevel: 'TRUSTED_INTERNATIONAL_ORGANIZATION', jurisdiction: 'Global' },
    { domainPattern: /(?:^|\.)iata\.org$/i, trustLevel: 'TRUSTED_INTERNATIONAL_ORGANIZATION', jurisdiction: 'Global' },
    { domainPattern: /(?:^|\.)who\.int$/i, trustLevel: 'TRUSTED_INTERNATIONAL_ORGANIZATION', jurisdiction: 'Global' },
    { domainPattern: /(?:^|\.)unwto\.org$/i, trustLevel: 'TRUSTED_INTERNATIONAL_ORGANIZATION', jurisdiction: 'Global' }
  ];

  private static readonly OFFICIAL_REGISTRY_ENTRIES: TrustedSourceEntry[] = [
    {
      country: 'Singapore',
      sourceName: 'Immigration & Checkpoints Authority (ICA) Singapore',
      sourceUrl: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore',
      trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
      sourceType: 'IMMIGRATION_AUTHORITY',
      jurisdiction: 'Singapore',
      description: 'Official portal for Singapore entry requirements, visa protocols, and SG Arrival Card'
    },
    {
      country: 'Vietnam',
      sourceName: 'Vietnam National Portal on Immigration (Ministry of Public Security)',
      sourceUrl: 'https://evisa.xuatnhapcanh.gov.vn/en_US/web/guest/trang-chu-ttdt',
      trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
      sourceType: 'IMMIGRATION_AUTHORITY',
      jurisdiction: 'Vietnam',
      description: 'Official National E-Visa issuance and immigration portal of the Socialist Republic of Vietnam'
    },
    {
      country: 'Thailand',
      sourceName: 'Royal Thai Immigration Bureau & Ministry of Foreign Affairs',
      sourceUrl: 'https://www.thaievisa.go.th/',
      trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
      sourceType: 'IMMIGRATION_AUTHORITY',
      jurisdiction: 'Thailand',
      description: 'Official Royal Thai Government electronic visa system'
    },
    {
      country: 'Japan',
      sourceName: 'Ministry of Foreign Affairs of Japan (MOFA)',
      sourceUrl: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
      trustLevel: 'TRUSTED_GOVERNMENT',
      sourceType: 'MINISTRY_FOREIGN_AFFAIRS',
      jurisdiction: 'Japan',
      description: 'Official consular and immigration guidelines published by the Government of Japan'
    },
    {
      country: 'India',
      sourceName: 'Bureau of Immigration (BOI) & Ministry of External Affairs, India',
      sourceUrl: 'https://indianvisaonline.gov.in/',
      trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
      sourceType: 'IMMIGRATION_AUTHORITY',
      jurisdiction: 'India',
      description: 'Official Government of India portal for e-Visa and immigration clearances'
    }
  ];

  /**
   * Evaluates if a given URL meets strict security and allowlist standards
   */
  static validateUrl(urlStr: string): {
    isValid: boolean;
    error?: string;
    hostname?: string;
    isHttps?: boolean;
    isAllowlisted?: boolean;
  } {
    if (!urlStr || typeof urlStr !== 'string') {
      return { isValid: false, error: 'URL must be a non-empty string' };
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // 1. HTTPS Protocol Enforcement
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        error: `Insecure protocol: '${parsed.protocol}'. Official regulatory sources MUST use HTTPS.`,
        hostname: parsed.hostname,
        isHttps: false
      };
    }

    // 2. SSRF Protection: Deny private IPs, loopbacks, link-local, and internal endpoints
    const hostname = parsed.hostname.toLowerCase();
    for (const pattern of this.PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          isValid: false,
          error: `Blocked SSRF target: Hostname '${hostname}' resolves to private/internal network.`,
          hostname,
          isHttps: true
        };
      }
    }

    // 3. Domain Allowlist Check
    const allowlisted = this.isDomainAllowlisted(hostname);
    if (!allowlisted) {
      return {
        isValid: false,
        error: `Arbitrary URL '${hostname}' is not in the server-controlled trusted source allowlist.`,
        hostname,
        isHttps: true,
        isAllowlisted: false
      };
    }

    return {
      isValid: true,
      hostname,
      isHttps: true,
      isAllowlisted: true
    };
  }

  /**
   * Checks if a hostname matches any allowlisted official domain
   */
  static isDomainAllowlisted(hostname: string): boolean {
    const cleanHost = hostname.toLowerCase().trim();
    return this.AUTHORITATIVE_DOMAINS.some((entry) => entry.domainPattern.test(cleanHost));
  }

  /**
   * Classifies source trust level and checks whether it is authoritative for final legal eligibility
   */
  static classifySource(
    urlStr: string,
    declaredTrust?: TrustLevel
  ): {
    trustLevel: TrustLevel;
    isAuthoritative: boolean;
    jurisdiction?: string;
    sourceType?: string;
  } {
    const validation = this.validateUrl(urlStr);
    if (!validation.isValid) {
      return {
        trustLevel: 'UNTRUSTED',
        isAuthoritative: false
      };
    }

    const host = validation.hostname || '';
    const match = this.AUTHORITATIVE_DOMAINS.find((entry) => entry.domainPattern.test(host));
    if (match) {
      const trustLevel = match.trustLevel;
      return {
        trustLevel,
        isAuthoritative: this.isTrustLevelAuthoritative(trustLevel),
        jurisdiction: match.jurisdiction
      };
    }

    // If declared trust is specified and conforms to strict official levels
    if (declaredTrust && this.isTrustLevelAuthoritative(declaredTrust)) {
      return {
        trustLevel: declaredTrust,
        isAuthoritative: true
      };
    }

    return {
      trustLevel: 'SECONDARY_REFERENCE',
      isAuthoritative: false
    };
  }

  /**
   * Determines if a trust level is authoritative for final visa claims
   * (Per Section 2: Only official government, embassy, immigration authority, or international org)
   */
  static isTrustLevelAuthoritative(trustLevel: TrustLevel): boolean {
    const authoritativeLevels: TrustLevel[] = [
      'TRUSTED_OFFICIAL',
      'TRUSTED_GOVERNMENT',
      'TRUSTED_EMBASSY',
      'TRUSTED_IMMIGRATION_AUTHORITY',
      'TRUSTED_INTERNATIONAL_ORGANIZATION',
      'OFFICIAL_GOVERNMENT',
      'CONSULAR_AUTHORITY'
    ];
    return authoritativeLevels.includes(trustLevel);
  }

  /**
   * Retrieves official sources registered for a destination country
   */
  static getOfficialSourcesForCountry(country: string): TrustedSourceEntry[] {
    const normalized = country.toLowerCase().trim();
    return this.OFFICIAL_REGISTRY_ENTRIES.filter(
      (entry) => entry.country.toLowerCase() === normalized || entry.jurisdiction.toLowerCase() === normalized
    );
  }
}
