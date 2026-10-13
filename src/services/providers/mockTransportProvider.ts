/**
 * AeroDAG Deterministic Mock Transport Provider
 * 
 * Provides airport transfers, chauffeured local cabs, self-drive rentals,
 * Indian Railways trains (Vande Bharat Express for domestic routes), and metro passes.
 */

import { TransferItem, TrainItem } from '../../types/travelBooking';
import {
  TransportProvider,
  TransportSearchParams,
  TransportOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { normalizeTransport } from './normalizers';
import {
  MOCK_TRANSFERS_GOA,
  MOCK_TRAINS_GOA,
  MOCK_TRANSFERS_COORG,
  MOCK_TRANSFERS_KERALA,
  MOCK_TRANSFERS_MYSURU,
  MOCK_TRAINS_MYSURU,
  MOCK_TRANSFERS_SINGAPORE,
  MOCK_TRANSFERS_THAILAND,
  MOCK_TRANSFERS_JAPAN
} from '../destinationsData';
import { MOCK_TRANSFERS_VIETNAM } from '../travelCatalog';

export class MockTransportProvider implements TransportProvider {
  public readonly providerName = 'MockTransportProvider';
  public readonly category = 'transport' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: false,
    domestic: true,
    international: true
  };

  async searchTransportOptions(params: TransportSearchParams): Promise<TransportOption[]> {
    const transfers = await this.searchTransfers(params);
    return transfers.map(t => normalizeTransport(t, this.providerName, true));
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 8,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock transport provider active'
    };
  }

  async searchTransfers(params: TransportSearchParams): Promise<TransferItem[]> {
    const dest = (params.destination || '').toLowerCase();
    const partySize = Math.max(1, params.travellerCount || 2);

    let baseTransfers: TransferItem[] = [];

    if (dest.includes('goa')) {
      baseTransfers = MOCK_TRANSFERS_GOA;
    } else if (dest.includes('coorg')) {
      baseTransfers = MOCK_TRANSFERS_COORG;
    } else if (dest.includes('kerala') || dest.includes('munnar') || dest.includes('alleppey')) {
      baseTransfers = MOCK_TRANSFERS_KERALA;
    } else if (dest.includes('mysuru') || dest.includes('mysore')) {
      baseTransfers = MOCK_TRANSFERS_MYSURU;
    } else if (dest.includes('singapore')) {
      baseTransfers = MOCK_TRANSFERS_SINGAPORE;
    } else if (dest.includes('thailand') || dest.includes('bangkok') || dest.includes('phuket')) {
      baseTransfers = MOCK_TRANSFERS_THAILAND;
    } else if (dest.includes('japan') || dest.includes('tokyo') || dest.includes('kyoto')) {
      baseTransfers = MOCK_TRANSFERS_JAPAN;
    } else if (dest.includes('vietnam') || dest.includes('hanoi')) {
      baseTransfers = MOCK_TRANSFERS_VIETNAM;
    } else {
      const isDomestic = params.scope === 'domestic';
      baseTransfers = [
        {
          id: 'tr-dyn-1',
          title: `Pre-Booked Private Airport Transfer (${partySize > 3 ? 'AC Minivan' : 'AC Sedan'})`,
          vehicleType: partySize > 3 ? 'Toyota Innova Crysta / AC Minivan' : 'Premium Sedan',
          capacityPassengers: Math.max(4, partySize),
          luggageCapacity: Math.max(4, partySize),
          priceINR: isDomestic ? 1800 : 3200,
          priceUSD: isDomestic ? 22 : 38,
          description: 'Meet-and-greet airport pickup with dedicated name placard, bottled mineral water, and direct hotel drop-off.',
          duration: '45 mins',
          pickupLocation: `${params.destination} International Airport`,
          dropLocation: 'Your Selected Hotel / Resort'
        },
        {
          id: 'tr-dyn-2',
          title: 'Full-Day Private Chauffeur Cab (Dedicated Sightseeing)',
          vehicleType: partySize > 3 ? 'AC Tempo / MPV' : 'Comfort AC Sedan',
          capacityPassengers: Math.max(4, partySize),
          luggageCapacity: 3,
          priceINR: isDomestic ? 3500 : 5800,
          priceUSD: isDomestic ? 42 : 69,
          description: '8 hours / 80 km air-conditioned vehicle with courteous local English/Hindi-speaking driver for all sightseeing.',
          duration: '8 Hours',
          pickupLocation: 'Hotel Lobby',
          dropLocation: 'City Sightseeing & Return'
        }
      ];
    }

    // Adjust vehicle type and capacity to ensure entire party fits comfortably
    return baseTransfers.map((t) => {
      if (partySize > 4 && t.capacityPassengers < partySize) {
        return {
          ...t,
          vehicleType: 'Executive 6-Seater MPV / AC Minivan',
          capacityPassengers: partySize,
          luggageCapacity: partySize,
          priceINR: Math.round(t.priceINR * 1.25),
          priceUSD: Math.round(t.priceUSD * 1.25),
          source: 'sample' as const,
          sourceLabel: 'Sample data'
        };
      }
      return {
        ...t,
        source: 'sample' as const,
        sourceLabel: 'Sample data'
      };
    });
  }

  async searchTrains(params: TransportSearchParams): Promise<TrainItem[]> {
    const origin = (params.origin || '').toLowerCase();
    const dest = (params.destination || '').toLowerCase();
    const count = Math.max(1, params.travellerCount || 1);

    if (dest.includes('goa')) {
      // Train 17309 runs Yesvantpur Jn (Bengaluru) <-> Vasco Da Gama (Goa)
      if (origin.includes('blr') || origin.includes('bengaluru') || origin.includes('bangalore') || origin.includes('yesvantpur')) {
        const blrTrain = MOCK_TRAINS_GOA.find((t) => t.trainNumber === '17309');
        if (blrTrain) {
          return [{
            ...blrTrain,
            totalPriceINR: blrTrain.pricePerPersonINR * count,
            source: 'sample' as const,
            sourceLabel: 'Sample data'
          }];
        }
      }
      // No train route available in demo data for other origins
      return [];
    }

    if (dest.includes('mysuru') || dest.includes('mysore')) {
      if (origin.includes('blr') || origin.includes('bengaluru') || origin.includes('bangalore')) {
        return MOCK_TRAINS_MYSURU.map(t => ({
          ...t,
          totalPriceINR: t.pricePerPersonINR * count,
          source: 'sample' as const,
          sourceLabel: 'Sample data'
        }));
      }
    }

    return [];
  }
}
