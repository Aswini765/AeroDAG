/**
 * AeroDAG Deterministic Mock Travel Knowledge Provider
 * 
 * Provides destination guidelines, best time to visit, visa criteria,
 * and safety advisories for Indian domestic and outbound international travel.
 * Decoupled from Wikipedia, Lonely Planet, or Wikivoyage scrapers.
 */

import {
  TravelKnowledgeProvider,
  TravelKnowledgeItem,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';

export class MockTravelKnowledgeProvider implements TravelKnowledgeProvider {
  public readonly providerName = 'MockTravelKnowledgeProvider';
  public readonly category = 'travelKnowledge' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    domestic: true,
    international: true
  };

  private knowledgeBase: Record<string, TravelKnowledgeItem> = {
    goa: {
      destination: 'Goa',
      highlights: ['Calangute & Baga Beaches', 'Old Goa UNESCO Churches', 'Spice Plantations', 'Mandovi River Cruises'],
      bestTimeToVisit: 'November to February (Pleasant coastal winter)',
      visaInfo: 'Domestic India: No visa or permits needed for Indian citizens.',
      safetyAdvisory: 'Safe coastal destination. Avoid swimming during monsoon season and respect beach safety flags.',
      budgetTiers: { Frugal: 25000, Comfortable: 45000, Premium: 85000, Luxury: 180000 },
      providerMetadata: sanitizeProviderMetadata('MockTravelKnowledgeProvider', true)
    },
    vietnam: {
      destination: 'Vietnam',
      highlights: ['Hanoi Old Quarter', 'Ha Long Bay Cruise', 'Hoi An Ancient Town', 'Da Nang Golden Bridge'],
      bestTimeToVisit: 'October to April (Mild weather, low rainfall)',
      visaInfo: 'E-Visa available online for Indian passport holders (30-day single/multiple entry).',
      safetyAdvisory: 'Very safe destination. Take standard precautions with street traffic and crossing busy roads.',
      budgetTiers: { Frugal: 45000, Comfortable: 80000, Premium: 140000, Luxury: 250000 },
      providerMetadata: sanitizeProviderMetadata('MockTravelKnowledgeProvider', true)
    },
    japan: {
      destination: 'Japan',
      highlights: ['Tokyo Shibuya & Shinjuku', 'Kyoto Fushimi Inari Shrine', 'Mount Fuji Scenic Area', 'Osaka Dotonbori'],
      bestTimeToVisit: 'March to May (Cherry Blossoms) or September to November (Autumn foliage)',
      visaInfo: 'E-Visa or standard tourist visa required before departure for Indian citizens.',
      safetyAdvisory: 'Extremely safe country. High level of public hygiene and stellar public transport network.',
      budgetTiers: { Frugal: 95000, Comfortable: 160000, Premium: 280000, Luxury: 500000 },
      providerMetadata: sanitizeProviderMetadata('MockTravelKnowledgeProvider', true)
    }
  };

  async getDestinationKnowledge(destination: string): Promise<TravelKnowledgeItem | null> {
    const key = (destination || '').toLowerCase().trim();
    for (const [destKey, item] of Object.entries(this.knowledgeBase)) {
      if (key.includes(destKey)) {
        return item;
      }
    }

    // Dynamic fallback knowledge
    return {
      destination,
      highlights: [`Historic City Center of ${destination}`, `Scenic Viewpoints in ${destination}`, `Local Artisan Markets`],
      bestTimeToVisit: 'October to March (Mild seasonal weather)',
      visaInfo: 'Check official embassy portal for destination visa entry requirements.',
      safetyAdvisory: 'Follow general travel safety precautions and keep emergency contacts handy.',
      budgetTiers: { Frugal: 35000, Comfortable: 65000, Premium: 120000, Luxury: 220000 },
      providerMetadata: sanitizeProviderMetadata(this.providerName, true)
    };
  }

  async searchKnowledge(query: string): Promise<TravelKnowledgeItem[]> {
    const item = await this.getDestinationKnowledge(query);
    return item ? [item] : [];
  }

  async getVisaRequirements(
    nationality: string,
    destination: string,
    passportType: string = 'ORDINARY'
  ): Promise<any | null> {
    const nat = (nationality || 'IN').toUpperCase().trim();
    const dest = (destination || '').toLowerCase().trim();

    // Domestic trip
    if (dest.includes('goa') || dest.includes('kerala') || dest.includes('rajasthan') || (dest.includes('india') && nat === 'IN')) {
      return {
        travelerNationality: nat,
        destinationCountry: 'India',
        passportType: passportType as any,
        visaType: 'VISA_FREE',
        requirement: 'NOT_REQUIRED',
        eligibility: 'Domestic travel within India. Government Photo ID required.',
        durationDays: 365,
        passportValidity: { minMonthsBeyondStay: 0, description: 'Valid government ID or passport', rule: 'VALID_ID' },
        onwardTravel: false,
        proofOfFunds: { required: false },
        source: 'Bureau of Immigration India',
        sourceUrl: 'https://boi.gov.in/',
        trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
        sourceFreshness: 'CURRENT',
        lastVerifiedAt: '2026-10-01',
        confidence: 'HIGH',
        status: 'KNOWN'
      };
    }

    // Vietnam
    if (dest.includes('vietnam')) {
      if (nat === 'IN') {
        return {
          travelerNationality: 'IN',
          destinationCountry: 'Vietnam',
          passportType: passportType as any,
          visaType: 'E_VISA',
          requirement: 'REQUIRED',
          eligibility: 'Indian citizens are eligible for 30 or 90 day single/multiple entry e-Visa.',
          durationDays: 30,
          applicationMethod: 'ONLINE',
          processingTime: { minimumDays: 3, typicalDays: 4, maximumDays: 7, description: '3-5 business days' },
          fee: { amount: 25, currency: 'USD', source: 'Vietnam Immigration Portal' },
          passportValidity: { minMonthsBeyondStay: 6, description: '6 months validity beyond intended stay', rule: '6_MONTHS' },
          blankPages: 2,
          onwardTravel: true,
          proofOfFunds: { required: false },
          source: 'Vietnam National Portal on Immigration',
          sourceUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
          trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
          sourceFreshness: 'CURRENT',
          lastVerifiedAt: '2026-09-15',
          confidence: 'HIGH',
          status: 'KNOWN'
        };
      }
    }

    // Singapore
    if (dest.includes('singapore')) {
      return {
        travelerNationality: nat,
        destinationCountry: 'Singapore',
        passportType: passportType as any,
        visaType: nat === 'US' || nat === 'GB' ? 'VISA_FREE' : 'E_VISA',
        requirement: nat === 'US' || nat === 'GB' ? 'NOT_REQUIRED' : 'REQUIRED',
        eligibility: nat === 'US' ? 'Visa-free entry for up to 90 days.' : 'Indian tourists must apply for e-Visa via authorized agents. Digital SGAC submission mandatory.',
        durationDays: 30,
        applicationMethod: nat === 'US' ? 'NOT_APPLICABLE' : 'ONLINE',
        passportValidity: { minMonthsBeyondStay: 6, description: '6 months validity beyond intended stay', rule: '6_MONTHS' },
        blankPages: 2,
        onwardTravel: true,
        proofOfFunds: { required: true, description: 'Sufficient funds for duration of visit' },
        source: 'Immigration & Checkpoints Authority (ICA) Singapore',
        sourceUrl: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore',
        trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
        sourceFreshness: 'CURRENT',
        lastVerifiedAt: '2026-09-20',
        confidence: 'HIGH',
        status: 'KNOWN'
      };
    }

    // Japan
    if (dest.includes('japan')) {
      return {
        travelerNationality: nat,
        destinationCountry: 'Japan',
        passportType: passportType as any,
        visaType: nat === 'US' ? 'VISA_FREE' : 'E_VISA',
        requirement: nat === 'US' ? 'NOT_REQUIRED' : 'REQUIRED',
        eligibility: nat === 'US' ? 'Visa-free entry for up to 90 days for tourism.' : 'Short-term tourist e-Visa or consular sticker visa required prior to departure.',
        durationDays: nat === 'US' ? 90 : 15,
        applicationMethod: nat === 'US' ? 'NOT_APPLICABLE' : 'ONLINE',
        passportValidity: { minMonthsBeyondStay: 0, description: 'Passport must be valid during duration of stay', rule: 'VALID_FOR_STAY' },
        blankPages: 2,
        onwardTravel: true,
        proofOfFunds: { required: true },
        source: 'Ministry of Foreign Affairs of Japan (MOFA)',
        sourceUrl: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
        trustLevel: 'TRUSTED_GOVERNMENT',
        sourceFreshness: 'CURRENT',
        lastVerifiedAt: '2026-09-18',
        confidence: 'HIGH',
        status: 'KNOWN'
      };
    }

    // Generic fallback
    return {
      travelerNationality: nat,
      destinationCountry: destination,
      passportType: passportType as any,
      visaType: 'UNKNOWN',
      requirement: 'UNKNOWN',
      eligibility: 'Verify with destination embassy prior to travel.',
      passportValidity: { minMonthsBeyondStay: 6, description: 'Standard 6-month validity recommended', rule: '6_MONTHS' },
      onwardTravel: 'UNKNOWN',
      proofOfFunds: { required: 'UNKNOWN' },
      source: 'Consular General Information',
      sourceUrl: 'https://example.com/consulate',
      trustLevel: 'SECONDARY_REFERENCE',
      sourceFreshness: 'UNKNOWN',
      lastVerifiedAt: '2026-01-01',
      confidence: 'UNCERTAIN',
      status: 'REQUIRES_VERIFICATION'
    };
  }

  async getEntryRequirements(nationality: string, destination: string): Promise<any | null> {
    return this.getVisaRequirements(nationality, destination);
  }

  async getTransitRequirements(
    nationality: string,
    transitCountry: string,
    destinationCountry: string
  ): Promise<any | null> {
    const nat = (nationality || 'IN').toUpperCase().trim();
    const transit = (transitCountry || '').toLowerCase().trim();

    // Germany Airport Transit Visa (ATV) for Indian passport
    if (transit.includes('germany') || transit.includes('frankfurt') || transit.includes('munich')) {
      if (nat === 'IN') {
        return {
          travelerNationality: 'IN',
          destinationCountry: destinationCountry,
          passportType: 'ORDINARY',
          visaType: 'TRANSIT_VISA',
          requirement: 'REQUIRED',
          eligibility: 'Airport Transit Visa (ATV) required for Indian citizens unless holding valid US/Schengen/UK visa.',
          transitRequirement: {
            required: true,
            maxTransitHours: 24,
            stayInTransitArea: true,
            description: 'Direct airside transit only. Must not leave international transit area.'
          },
          source: 'Federal Foreign Office Germany',
          sourceUrl: 'https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/01-transit-visa',
          trustLevel: 'TRUSTED_GOVERNMENT',
          sourceFreshness: 'CURRENT',
          lastVerifiedAt: '2026-09-10',
          confidence: 'HIGH',
          status: 'KNOWN'
        };
      }
    }

    // Singapore airside transit
    if (transit.includes('singapore') || transit.includes('changi')) {
      return {
        travelerNationality: nat,
        destinationCountry: destinationCountry,
        passportType: 'ORDINARY',
        visaType: 'VISA_FREE',
        requirement: 'NOT_REQUIRED',
        eligibility: 'Airside transit within Changi Airport Terminals does not require a transit visa if remaining in transit area.',
        transitRequirement: {
          required: false,
          maxTransitHours: 24,
          stayInTransitArea: true,
          description: 'Airside transit between terminals via Skytrain without passing immigration.'
        },
        source: 'Immigration & Checkpoints Authority (ICA) Singapore',
        sourceUrl: 'https://www.ica.gov.sg/enter-transit-depart/transiting-singapore',
        trustLevel: 'TRUSTED_IMMIGRATION_AUTHORITY',
        sourceFreshness: 'CURRENT',
        lastVerifiedAt: '2026-09-12',
        confidence: 'HIGH',
        status: 'KNOWN'
      };
    }

    return null;
  }

  async getTravelAdvisory(destination: string): Promise<any | null> {
    const dest = (destination || '').toLowerCase();
    return {
      destination,
      level: dest.includes('war') || dest.includes('conflict') ? 'DO_NOT_TRAVEL' : 'NORMAL',
      summary: `Standard travel precautions apply for ${destination}. Check local guidance upon arrival.`,
      source: 'Ministry of External Affairs / Official Travel Advisory',
      sourceUrl: 'https://mea.gov.in/',
      lastUpdated: '2026-09-01'
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 5,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic travel knowledge base online'
    };
  }
}
