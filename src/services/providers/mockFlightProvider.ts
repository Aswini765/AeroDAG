/**
 * AeroDAG Deterministic Mock Flight Provider
 * 
 * Generates realistic flight schedules and prices based on origin, destination,
 * travel dates, and traveller count.
 * Accurately calculates 'Cheapest', 'Fastest', and 'Best value' labels
 * by evaluating the comparative metrics across all candidates.
 */

import { FlightItem } from '../../types/travelBooking';
import {
  FlightProvider,
  FlightSearchParams,
  FlightOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { normalizeFlight } from './normalizers';
import {
  MOCK_FLIGHTS_GOA,
  MOCK_FLIGHTS_SINGAPORE,
  MOCK_FLIGHTS_THAILAND,
  MOCK_FLIGHTS_JAPAN
} from '../destinationsData';
import { MOCK_FLIGHTS_VIETNAM } from '../travelCatalog';

export class MockFlightProvider implements FlightProvider {
  public readonly providerName = 'MockFlightProvider';
  public readonly category = 'flights' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: false,
    domestic: true,
    international: true,
    baggageData: true
  };

  async searchFlightOptions(params: FlightSearchParams): Promise<FlightOption[]> {
    const flights = await this.searchFlights(params);
    return flights.map(f => normalizeFlight(f, this.providerName, true));
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock flight inventory active'
    };
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightItem[]> {
    const dest = (params.destination || '').toLowerCase();
    const count = Math.max(1, params.travellerCount || 1);

    // Non-airport destinations or road-only corridors (e.g. Coorg, Mysuru, or Kochi -> Munnar)
    if (dest.includes('coorg') || dest.includes('mysuru') || dest.includes('mysore') || (dest.includes('kerala') && (params.origin || '').toLowerCase().includes('kochi'))) {
      return [];
    }

    let baseOptions: FlightItem[] = [];

    if (dest.includes('goa')) {
      baseOptions = MOCK_FLIGHTS_GOA;
    } else if (dest.includes('singapore')) {
      baseOptions = MOCK_FLIGHTS_SINGAPORE;
    } else if (dest.includes('thailand') || dest.includes('bangkok') || dest.includes('phuket')) {
      baseOptions = MOCK_FLIGHTS_THAILAND;
    } else if (dest.includes('japan') || dest.includes('tokyo') || dest.includes('kyoto')) {
      baseOptions = MOCK_FLIGHTS_JAPAN;
    } else if (dest.includes('vietnam') || dest.includes('hanoi') || dest.includes('danang')) {
      baseOptions = MOCK_FLIGHTS_VIETNAM;
    } else {
      // Dynamic fallback for any other destination (e.g. Kerala via Kochi airport)
      const fallbackOriginCode = (params.origin || '').match(/\(([A-Z]{3})\)/)?.[1] || 'BLR';
      const fallbackDestCode = dest.includes('kerala') ? 'COK' : 'DST';
      const fallbackDestCity = dest.includes('kerala') ? 'Kochi' : params.destination;
      baseOptions = [
        {
          id: `fl-dyn-1`,
          airline: 'IndiGo',
          airlineCode: '6E',
          flightNumber: '6E 521',
          originCode: fallbackOriginCode,
          originCity: params.origin.replace(/\s*\(.*\)/, '').trim() || 'Bengaluru',
          destinationCode: fallbackDestCode,
          destinationCity: fallbackDestCity,
          departureTime: '06:30 AM',
          arrivalTime: '08:45 AM',
          duration: '2h 15m',
          stops: 'Non-stop Direct',
          isRoundTrip: true,
          outboundFarePerPersonINR: 2600,
          returnFarePerPersonINR: 2600,
          pricePerPersonINR: 5200,
          totalPriceINR: 5200 * count,
          pricePerPersonUSD: 62,
          totalPriceUSD: 62 * count,
          baggage: '15 kg Checked + 7 kg Cabin per passenger',
          cabinClass: 'Economy Standard',
          refundable: true,
          seatAvailability: 9,
          tag: 'Recommended',
          adjacentFamilySeatsGuaranteed: true,
          source: 'sample',
          sourceLabel: 'Sample data'
        },
        {
          id: `fl-dyn-2`,
          airline: 'Air India',
          airlineCode: 'AI',
          flightNumber: 'AI 804',
          originCode: fallbackOriginCode,
          originCity: params.origin.replace(/\s*\(.*\)/, '').trim() || 'Bengaluru',
          destinationCode: fallbackDestCode,
          destinationCity: fallbackDestCity,
          departureTime: '01:15 PM',
          arrivalTime: '04:00 PM',
          duration: '2h 45m',
          stops: 'Non-stop Direct',
          isRoundTrip: true,
          outboundFarePerPersonINR: 3200,
          returnFarePerPersonINR: 3200,
          pricePerPersonINR: 6400,
          totalPriceINR: 6400 * count,
          pricePerPersonUSD: 76,
          totalPriceUSD: 76 * count,
          baggage: '25 kg Checked + 7 kg Cabin per passenger',
          cabinClass: 'Economy Flex',
          refundable: true,
          seatAvailability: 6,
          tag: 'Best for Families',
          adjacentFamilySeatsGuaranteed: true,
          source: 'sample',
          sourceLabel: 'Sample data'
        },
        {
          id: `fl-dyn-3`,
          airline: 'Akasa Air',
          airlineCode: 'QP',
          flightNumber: 'QP 1342',
          originCode: fallbackOriginCode,
          originCity: params.origin.replace(/\s*\(.*\)/, '').trim() || 'Bengaluru',
          destinationCode: fallbackDestCode,
          destinationCity: fallbackDestCity,
          departureTime: '08:45 PM',
          arrivalTime: '11:15 PM',
          duration: '2h 30m',
          stops: 'Non-stop Direct',
          isRoundTrip: true,
          outboundFarePerPersonINR: 2400,
          returnFarePerPersonINR: 2400,
          pricePerPersonINR: 4800,
          totalPriceINR: 4800 * count,
          pricePerPersonUSD: 57,
          totalPriceUSD: 57 * count,
          baggage: '15 kg Checked + 7 kg Cabin per passenger',
          cabinClass: 'Saver',
          refundable: false,
          seatAvailability: 4,
          tag: 'Lowest Fare',
          adjacentFamilySeatsGuaranteed: false,
          source: 'sample',
          sourceLabel: 'Sample data'
        }
      ];
    }

    // Scale prices to the exact traveller count and price each leg separately
    const scaledFlights: FlightItem[] = baseOptions.map((f, idx) => {
      const isRoundTrip = f.isRoundTrip !== false;
      const outboundFare = f.outboundFarePerPersonINR || (isRoundTrip ? Math.round((f.pricePerPersonINR || 6400) / 2) : (f.pricePerPersonINR || 3200));
      const returnFare = isRoundTrip ? (f.returnFarePerPersonINR || outboundFare) : 0;

      const outboundTotal = outboundFare * count;
      const returnTotal = returnFare * count;
      const totalINR = outboundTotal + returnTotal;
      const pricePerPerson = outboundFare + returnFare;
      const totalUSD = Math.round(totalINR / 84);

      return {
        ...f,
        id: `${f.id}-${count}pax`,
        isRoundTrip,
        outboundFarePerPersonINR: outboundFare,
        returnFarePerPersonINR: returnFare,
        outboundTotalPriceINR: outboundTotal,
        returnTotalPriceINR: returnTotal,
        totalPriceINR: totalINR,
        totalPriceUSD: totalUSD,
        pricePerPersonINR: pricePerPerson,
        originCity: params.origin ? params.origin.replace(/\s*\(.*\)/, '').trim() : f.originCity,
        adjacentFamilySeatsRequested: true,
        source: 'sample' as const,
        sourceLabel: 'Sample data'
      };
    });

    // Calculate deterministic tags (Lowest Fare / Fastest / Best Value / Recommended)
    return this.calculateLabels(scaledFlights);
  }

  /**
   * Deterministically calculates competitive tags based on price and duration metrics
   */
  calculateLabels(flights: FlightItem[]): FlightItem[] {
    if (!flights || flights.length === 0) return [];
    if (flights.length === 1) {
      return [{ ...flights[0], tag: 'Recommended' }];
    }

    // 1. Helper to parse duration string (e.g. "2h 45m" -> 165 minutes)
    const parseMinutes = (durStr: string): number => {
      let minutes = 0;
      const hoursMatch = durStr.match(/(\d+)\s*h/i);
      const minsMatch = durStr.match(/(\d+)\s*m/i);
      if (hoursMatch) minutes += parseInt(hoursMatch[1], 10) * 60;
      if (minsMatch) minutes += parseInt(minsMatch[1], 10);
      return minutes || 180;
    };

    // Find lowest price and shortest duration
    let minPrice = Infinity;
    let minPriceIdx = 0;
    let minDuration = Infinity;
    let minDurationIdx = 0;

    flights.forEach((f, idx) => {
      if (f.totalPriceINR < minPrice) {
        minPrice = f.totalPriceINR;
        minPriceIdx = idx;
      }
      const mins = parseMinutes(f.duration);
      if (mins < minDuration) {
        minDuration = mins;
        minDurationIdx = idx;
      }
    });

    return flights.map((f, idx) => {
      if (idx === minPriceIdx) {
        return { ...f, tag: 'Lowest Fare' };
      }
      if (idx === minDurationIdx) {
        return { ...f, tag: 'Fastest' };
      }
      if (f.adjacentFamilySeatsGuaranteed) {
        return { ...f, tag: 'Best for Families' };
      }
      return { ...f, tag: 'Recommended' };
    });
  }
}
