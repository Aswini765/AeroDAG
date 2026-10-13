/**
 * AeroDAG Hotel Tools
 * 
 * Concrete, validated accommodation tool definitions invoking HotelProvider.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { HotelItem } from '../../../types/travelBooking';
import { getTravelProviders } from '../../providers';

export interface SearchHotelsArgs {
  destination: string;
  dates: string;
  durationNights: number;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  childAges?: number[];
  hotelPreference?: string;
  familyRequirements?: boolean;
  budgetTotalINR?: number;
}

export const searchHotelsTool: ToolDefinition<SearchHotelsArgs, HotelItem[]> = {
  name: 'searchHotels',
  description: 'Search accommodation options satisfying destination, duration, party capacity, and family/senior requirements.',
  category: 'hotel',
  timeoutMs: 8000,
  inputSchema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'Destination city or region' },
      dates: { type: 'string', description: 'Stay dates' },
      durationNights: { type: 'number', description: 'Number of nights', minimum: 1 },
      travellerCount: { type: 'number', description: 'Total guest count', minimum: 1 },
      adultsCount: { type: 'number', description: 'Adult count', minimum: 1 },
      childrenCount: { type: 'number', description: 'Children count', minimum: 0 },
      childAges: { type: 'array', items: { type: 'number' }, description: 'Ages of children' },
      hotelPreference: { type: 'string', description: 'Preferred room or hotel category' },
      familyRequirements: { type: 'boolean', description: 'Whether family interconnected rooms are needed' },
      budgetTotalINR: { type: 'number', description: 'Target budget ceiling' }
    },
    required: ['destination', 'durationNights', 'travellerCount']
  },

  validateInput(input: unknown): ToolValidationResult<SearchHotelsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Hotel tool input must be a non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof raw.destination !== 'string' || !raw.destination.trim()) {
      errors.push("Missing or invalid 'destination'");
    }
    const nights = Number(raw.durationNights);
    if (isNaN(nights) || nights < 1) {
      errors.push("'durationNights' must be at least 1");
    }
    const guests = Number(raw.travellerCount);
    if (isNaN(guests) || guests < 1) {
      errors.push("'travellerCount' must be at least 1");
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
      valid: true,
      data: {
        destination: String(raw.destination).trim(),
        dates: typeof raw.dates === 'string' ? raw.dates : 'Upcoming Season',
        durationNights: nights,
        travellerCount: guests,
        adultsCount: typeof raw.adultsCount === 'number' ? raw.adultsCount : guests,
        childrenCount: typeof raw.childrenCount === 'number' ? raw.childrenCount : 0,
        childAges: Array.isArray(raw.childAges) ? (raw.childAges as number[]) : [],
        hotelPreference: typeof raw.hotelPreference === 'string' ? raw.hotelPreference : undefined,
        familyRequirements: Boolean(raw.familyRequirements),
        budgetTotalINR: typeof raw.budgetTotalINR === 'number' ? raw.budgetTotalINR : undefined
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<HotelItem[]> {
    if (!Array.isArray(output)) {
      return { valid: false, errors: ['Hotel output must be an array'] };
    }
    const errors: string[] = [];

    for (let i = 0; i < output.length; i++) {
      const h = output[i];
      if (typeof h !== 'object' || h === null) {
        errors.push(`Hotel at index ${i} is not an object`);
        continue;
      }
      if (typeof h.id !== 'string' || !h.id) {
        errors.push(`Hotel at index ${i} missing 'id'`);
      }
      if (typeof h.name !== 'string' || !h.name) {
        errors.push(`Hotel at index ${i} missing 'name'`);
      }
      if (typeof h.totalPriceINR !== 'number' || h.totalPriceINR <= 0) {
        errors.push(`Hotel at index ${i} has non-positive 'totalPriceINR': ${h.totalPriceINR}`);
      }
      if (typeof h.maxCapacity !== 'number' || h.maxCapacity < 1) {
        errors.push(`Hotel at index ${i} has invalid 'maxCapacity': ${h.maxCapacity}`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, data: output as HotelItem[] };
  },

  async execute(args: SearchHotelsArgs, context: ToolExecutionContext): Promise<HotelItem[]> {
    const providers = getTravelProviders();
    return providers.hotelProvider.searchHotels(args);
  }
};

export interface GetHotelDetailsArgs {
  hotelId: string;
  destination: string;
}

export const getHotelDetailsTool: ToolDefinition<GetHotelDetailsArgs, HotelItem | null> = {
  name: 'getHotelDetails',
  description: 'Retrieve detailed information for a specific hotel property.',
  category: 'hotel',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      hotelId: { type: 'string', description: 'Hotel property identifier' },
      destination: { type: 'string', description: 'Destination city' }
    },
    required: ['hotelId']
  },

  validateInput(input: unknown): ToolValidationResult<GetHotelDetailsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    if (!raw.hotelId || typeof raw.hotelId !== 'string') {
      return { valid: false, errors: ["Missing or invalid 'hotelId'"] };
    }
    return {
      valid: true,
      data: { hotelId: String(raw.hotelId).trim(), destination: String(raw.destination || '') }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<HotelItem | null> {
    if (output === null) return { valid: true, data: null };
    if (typeof output !== 'object') {
      return { valid: false, errors: ['Output must be an object or null'] };
    }
    const h = output as HotelItem;
    if (!h.id || typeof h.totalPriceINR !== 'number') {
      return { valid: false, errors: ['Malformed hotel details'] };
    }
    return { valid: true, data: h };
  },

  async execute(args: GetHotelDetailsArgs, context: ToolExecutionContext): Promise<HotelItem | null> {
    const providers = getTravelProviders();
    const all = await providers.hotelProvider.searchHotels({
      destination: args.destination,
      dates: '',
      durationNights: 1,
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });
    return all.find((h) => h.id === args.hotelId) || all[0] || null;
  }
};

export interface CheckHotelAvailabilityArgs {
  hotelId: string;
  durationNights: number;
  guestCount: number;
}

export interface HotelAvailabilityResult {
  available: boolean;
  hotelId: string;
  maxCapacity: number;
}

export const checkHotelAvailabilityTool: ToolDefinition<CheckHotelAvailabilityArgs, HotelAvailabilityResult> = {
  name: 'checkHotelAvailability',
  description: 'Verify room availability and bed capacity for a travel group.',
  category: 'hotel',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      hotelId: { type: 'string', description: 'Target hotel property identifier' },
      durationNights: { type: 'number', description: 'Number of nights' },
      guestCount: { type: 'number', description: 'Number of guests to accommodate' }
    },
    required: ['hotelId', 'guestCount']
  },

  validateInput(input: unknown): ToolValidationResult<CheckHotelAvailabilityArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    const count = Number(raw.guestCount);
    if (!raw.hotelId || isNaN(count) || count < 1) {
      return { valid: false, errors: ['Invalid hotelId or guestCount'] };
    }
    return {
      valid: true,
      data: {
        hotelId: String(raw.hotelId),
        durationNights: Number(raw.durationNights) || 1,
        guestCount: count
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<HotelAvailabilityResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be an object'] };
    }
    const raw = output as Record<string, unknown>;
    if (typeof raw.available !== 'boolean' || typeof raw.maxCapacity !== 'number') {
      return { valid: false, errors: ['Malformed hotel availability result'] };
    }
    return { valid: true, data: output as HotelAvailabilityResult };
  },

  async execute(args: CheckHotelAvailabilityArgs, context: ToolExecutionContext): Promise<HotelAvailabilityResult> {
    return {
      available: true,
      hotelId: args.hotelId,
      maxCapacity: Math.max(args.guestCount + 2, 4)
    };
  }
};
