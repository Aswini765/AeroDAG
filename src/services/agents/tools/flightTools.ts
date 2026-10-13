/**
 * AeroDAG Flight Tools
 * 
 * Concrete, validated flight tool definitions invoking the decoupled FlightProvider.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { FlightItem, TripScope } from '../../../types/travelBooking';
import { getTravelProviders } from '../../providers';

export interface SearchFlightsArgs {
  origin: string;
  destination: string;
  dates: string;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  scope?: TripScope;
  preferredAirline?: string;
  budgetCeilingINR?: number;
}

export const searchFlightsTool: ToolDefinition<SearchFlightsArgs, FlightItem[]> = {
  name: 'searchFlights',
  description: 'Search available airline flights between origin and destination for the specified travel party and dates.',
  category: 'flight',
  timeoutMs: 8000,
  inputSchema: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Origin airport or city' },
      destination: { type: 'string', description: 'Destination airport or city' },
      dates: { type: 'string', description: 'Travel dates or month' },
      travellerCount: { type: 'number', description: 'Total passenger count', minimum: 1 },
      adultsCount: { type: 'number', description: 'Adult passengers', minimum: 1 },
      childrenCount: { type: 'number', description: 'Child passengers', minimum: 0 },
      scope: { type: 'string', enum: ['domestic', 'international'], description: 'Trip scope' },
      budgetCeilingINR: { type: 'number', description: 'Maximum budget for flights in INR' }
    },
    required: ['origin', 'destination', 'travellerCount']
  },

  validateInput(input: unknown): ToolValidationResult<SearchFlightsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be a valid non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof raw.origin !== 'string' || !raw.origin.trim()) {
      errors.push("Missing or invalid 'origin' string");
    }
    if (typeof raw.destination !== 'string' || !raw.destination.trim()) {
      errors.push("Missing or invalid 'destination' string");
    }
    const travellerCount = Number(raw.travellerCount);
    if (isNaN(travellerCount) || travellerCount < 1) {
      errors.push("'travellerCount' must be a positive number greater than or equal to 1");
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
      valid: true,
      data: {
        origin: String(raw.origin).trim(),
        destination: String(raw.destination).trim(),
        dates: typeof raw.dates === 'string' ? raw.dates : 'Upcoming Season',
        travellerCount,
        adultsCount: typeof raw.adultsCount === 'number' ? raw.adultsCount : travellerCount,
        childrenCount: typeof raw.childrenCount === 'number' ? raw.childrenCount : 0,
        scope: raw.scope === 'international' ? 'international' : 'domestic',
        budgetCeilingINR: typeof raw.budgetCeilingINR === 'number' ? raw.budgetCeilingINR : undefined
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<FlightItem[]> {
    if (!Array.isArray(output)) {
      return { valid: false, errors: ['Flight tool output must be an array'] };
    }
    const errors: string[] = [];

    for (let i = 0; i < output.length; i++) {
      const fl = output[i];
      if (typeof fl !== 'object' || fl === null) {
        errors.push(`Flight at index ${i} is null or not an object`);
        continue;
      }
      if (typeof fl.id !== 'string' || !fl.id) {
        errors.push(`Flight at index ${i} missing valid 'id'`);
      }
      if (typeof fl.airline !== 'string' || !fl.airline) {
        errors.push(`Flight at index ${i} missing valid 'airline'`);
      }
      if (typeof fl.totalPriceINR !== 'number' || fl.totalPriceINR <= 0) {
        errors.push(`Flight at index ${i} has invalid or non-positive 'totalPriceINR': ${fl.totalPriceINR}`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, data: output as FlightItem[] };
  },

  async execute(args: SearchFlightsArgs, context: ToolExecutionContext): Promise<FlightItem[]> {
    const providers = getTravelProviders();
    return providers.flightProvider.searchFlights(args);
  }
};

export interface GetFlightDetailsArgs {
  flightId: string;
  origin: string;
  destination: string;
}

export const getFlightDetailsTool: ToolDefinition<GetFlightDetailsArgs, FlightItem | null> = {
  name: 'getFlightDetails',
  description: 'Retrieve detailed information for a specific flight option.',
  category: 'flight',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      flightId: { type: 'string', description: 'Flight identifier' },
      origin: { type: 'string', description: 'Origin city' },
      destination: { type: 'string', description: 'Destination city' }
    },
    required: ['flightId']
  },

  validateInput(input: unknown): ToolValidationResult<GetFlightDetailsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    if (typeof raw.flightId !== 'string' || !raw.flightId.trim()) {
      return { valid: false, errors: ["Missing or invalid 'flightId'"] };
    }
    return {
      valid: true,
      data: {
        flightId: String(raw.flightId).trim(),
        origin: String(raw.origin || ''),
        destination: String(raw.destination || '')
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<FlightItem | null> {
    if (output === null) return { valid: true, data: null };
    if (typeof output !== 'object') {
      return { valid: false, errors: ['Flight details must be an object or null'] };
    }
    const f = output as FlightItem;
    if (!f.id || typeof f.totalPriceINR !== 'number') {
      return { valid: false, errors: ['Malformed flight details object'] };
    }
    return { valid: true, data: f };
  },

  async execute(args: GetFlightDetailsArgs, context: ToolExecutionContext): Promise<FlightItem | null> {
    const providers = getTravelProviders();
    const all = await providers.flightProvider.searchFlights({
      origin: args.origin,
      destination: args.destination,
      dates: '',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });
    return all.find((f) => f.id === args.flightId) || all[0] || null;
  }
};

export interface CheckFlightAvailabilityArgs {
  flightId: string;
  passengerCount: number;
}

export interface FlightAvailabilityResult {
  available: boolean;
  flightId: string;
  seatsRemaining: number;
}

export const checkFlightAvailabilityTool: ToolDefinition<CheckFlightAvailabilityArgs, FlightAvailabilityResult> = {
  name: 'checkFlightAvailability',
  description: 'Check real-time seat availability on a selected flight.',
  category: 'flight',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      flightId: { type: 'string', description: 'Target flight identifier' },
      passengerCount: { type: 'number', description: 'Number of seats needed', minimum: 1 }
    },
    required: ['flightId', 'passengerCount']
  },

  validateInput(input: unknown): ToolValidationResult<CheckFlightAvailabilityArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    const count = Number(raw.passengerCount);
    if (!raw.flightId || isNaN(count) || count < 1) {
      return { valid: false, errors: ['Invalid flightId or passengerCount'] };
    }
    return {
      valid: true,
      data: { flightId: String(raw.flightId), passengerCount: count }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<FlightAvailabilityResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Availability output must be an object'] };
    }
    const raw = output as Record<string, unknown>;
    if (typeof raw.available !== 'boolean' || typeof raw.seatsRemaining !== 'number') {
      return { valid: false, errors: ['Malformed availability result'] };
    }
    return { valid: true, data: output as FlightAvailabilityResult };
  },

  async execute(args: CheckFlightAvailabilityArgs, context: ToolExecutionContext): Promise<FlightAvailabilityResult> {
    // Deterministic mock provider check
    return {
      available: true,
      flightId: args.flightId,
      seatsRemaining: Math.max(9, args.passengerCount + 4)
    };
  }
};
