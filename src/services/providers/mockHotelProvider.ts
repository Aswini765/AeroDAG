/**
 * AeroDAG Deterministic Mock Hotel Provider
 * 
 * Generates verified hotel and resort options based on destination, dates,
 * party size, minor children count, budget tier, and family requirements.
 * Ensures verified bed configurations and total stay price calculations.
 */

import { HotelItem } from '../../types/travelBooking';
import {
  HotelProvider,
  HotelSearchParams,
  HotelOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { normalizeHotel } from './normalizers';
import {
  MOCK_HOTELS_GOA,
  MOCK_HOTELS_COORG,
  MOCK_HOTELS_KERALA,
  MOCK_HOTELS_MYSURU,
  MOCK_HOTELS_SINGAPORE,
  MOCK_HOTELS_THAILAND,
  MOCK_HOTELS_JAPAN
} from '../destinationsData';
import { MOCK_HOTELS_VIETNAM } from '../travelCatalog';

export class MockHotelProvider implements HotelProvider {
  public readonly providerName = 'MockHotelProvider';
  public readonly category = 'hotels' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: false,
    domestic: true,
    international: true,
    cancellationPolicy: true
  };

  async searchHotelOptions(params: HotelSearchParams): Promise<HotelOption[]> {
    const hotels = await this.searchHotels(params);
    return hotels.map(h => normalizeHotel(h, this.providerName, true));
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 12,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock hotel inventory active'
    };
  }

  async searchHotels(params: HotelSearchParams): Promise<HotelItem[]> {
    const dest = (params.destination || '').toLowerCase();
    const nights = Math.max(1, params.durationNights || 5);
    const partySize = Math.max(1, params.travellerCount || 2);
    const hasKids = (params.childrenCount || 0) > 0;

    let baseHotels: HotelItem[] = [];

    if (dest.includes('goa')) {
      baseHotels = MOCK_HOTELS_GOA;
    } else if (dest.includes('coorg')) {
      baseHotels = MOCK_HOTELS_COORG;
    } else if (dest.includes('kerala') || dest.includes('munnar') || dest.includes('alleppey')) {
      baseHotels = MOCK_HOTELS_KERALA;
    } else if (dest.includes('mysuru') || dest.includes('mysore')) {
      baseHotels = MOCK_HOTELS_MYSURU;
    } else if (dest.includes('singapore')) {
      baseHotels = MOCK_HOTELS_SINGAPORE;
    } else if (dest.includes('thailand') || dest.includes('bangkok') || dest.includes('phuket')) {
      baseHotels = MOCK_HOTELS_THAILAND;
    } else if (dest.includes('japan') || dest.includes('tokyo') || dest.includes('kyoto')) {
      baseHotels = MOCK_HOTELS_JAPAN;
    } else if (dest.includes('vietnam') || dest.includes('hanoi') || dest.includes('halong')) {
      baseHotels = MOCK_HOTELS_VIETNAM;
    } else {
      // Dynamic fallback hotel set
      baseHotels = [
        {
          id: 'ht-dyn-1',
          name: `${params.destination} Grand Heritage Resort & Spa`,
          area: 'Central Promenade',
          city: params.destination,
          starRating: 4,
          reviewScore: 4.6,
          reviewsCount: 420,
          roomType: partySize > 2 ? 'Family Connecting Garden Suite' : 'Deluxe King Room',
          bedConfiguration: partySize > 2 ? '1 King Bed + 2 Single Beds' : '1 King Bed',
          maxCapacity: Math.max(4, partySize),
          capacityVerifiedForFamily: hasKids,
          pricePerNightINR: 4500,
          totalPriceINR: 4500 * nights,
          pricePerNightUSD: 54,
          totalPriceUSD: 54 * nights,
          amenities: ['Swimming Pool', 'Complimentary Breakfast', 'Kids Play Zone', 'Free High-Speed Wi-Fi', 'Airport Shuttle'],
          breakfastIncluded: true,
          freeCancellation: true,
          distanceFromCenter: '1.2 km from town center',
          imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
          tag: hasKids ? 'Family-Friendly' : 'Best Match'
        },
        {
          id: 'ht-dyn-2',
          name: `The Royal Vista Boutique Hotel`,
          area: 'Historic District',
          city: params.destination,
          starRating: 3,
          reviewScore: 4.3,
          reviewsCount: 280,
          roomType: 'Comfort Double Suite',
          bedConfiguration: '1 Queen Bed + 1 Rollaway Bed',
          maxCapacity: Math.max(3, partySize),
          capacityVerifiedForFamily: hasKids,
          pricePerNightINR: 2800,
          totalPriceINR: 2800 * nights,
          pricePerNightUSD: 33,
          totalPriceUSD: 33 * nights,
          amenities: ['Breakfast Buffet', 'Free Wi-Fi', '24/7 Front Desk', 'AC'],
          breakfastIncluded: true,
          freeCancellation: true,
          distanceFromCenter: '0.5 km from center',
          imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          tag: 'Within Budget'
        },
        {
          id: 'ht-dyn-3',
          name: `Imperial Oasis Luxury Resort`,
          area: 'Scenic Bay',
          city: params.destination,
          starRating: 5,
          reviewScore: 4.9,
          reviewsCount: 890,
          roomType: 'Presidential Family Villa with Private Plunge Pool',
          bedConfiguration: '2 King Beds + Dedicated Lounge',
          maxCapacity: Math.max(5, partySize),
          capacityVerifiedForFamily: true,
          pricePerNightINR: 9500,
          totalPriceINR: 9500 * nights,
          pricePerNightUSD: 113,
          totalPriceUSD: 113 * nights,
          amenities: ['Private Pool', 'Luxury Spa', 'Butler Service', 'All-Inclusive Breakfast & High Tea', 'Beachfront'],
          breakfastIncluded: true,
          freeCancellation: true,
          distanceFromCenter: '3.0 km from center',
          imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
          tag: 'Luxury Splurge'
        }
      ];
    }

    // Adapt prices based on duration nights and capacity
    return baseHotels.map((h) => {
      const perNight = h.pricePerNightINR;
      const totalINR = perNight * nights;
      const totalUSD = Math.round(totalINR / 84);

      let bedConfig = h.bedConfiguration;
      let roomType = h.roomType;
      if (partySize >= 4 && !roomType.toLowerCase().includes('family') && !roomType.toLowerCase().includes('suite')) {
        roomType = `Family Connected Suite (${roomType})`;
        bedConfig = '1 King Bed + 2 Twin Beds (Connecting family layout)';
      }

      return {
        ...h,
        pricePerNightINR: perNight,
        totalPriceINR: totalINR,
        pricePerNightUSD: Math.round(perNight / 84),
        totalPriceUSD: totalUSD,
        roomType,
        bedConfiguration: bedConfig,
        maxCapacity: Math.max(h.maxCapacity, partySize),
        capacityVerifiedForFamily: hasKids ? true : h.capacityVerifiedForFamily,
        cancellationPolicy: h.cancellationPolicy || (h.freeCancellation ? 'Free cancellation up to 48 hours before check-in' : 'Non-refundable rate'),
        source: 'sample' as const,
        sourceLabel: 'Sample data'
      };
    });
  }
}
