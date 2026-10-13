/**
 * AeroDAG Transport Tools
 * 
 * Concrete, validated ground transfer and transit tool definitions invoking TransportProvider.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { TransferItem, TripScope } from '../../../types/travelBooking';
import { getTravelProviders } from '../../providers';

export interface SearchTransportArgs {
  origin: string;
  destination: string;
  scope: TripScope;
  travellerCount: number;
  luggageCount?: number;
  preferredMode?: 'Flight' | 'Train' | 'Cab' | 'Combo';
}

export const searchTransportTool: ToolDefinition<SearchTransportArgs, TransferItem[]> = {
  name: 'searchTransport',
  description: 'Search available airport transfers, private cabs, and shuttle options matching passenger count and luggage needs.',
  category: 'transport',
  timeoutMs: 6000,
  inputSchema: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Origin city' },
      destination: { type: 'string', description: 'Destination city' },
      scope: { type: 'string', enum: ['domestic', 'international'], description: 'Trip scope' },
      travellerCount: { type: 'number', description: 'Passenger count', minimum: 1 },
      luggageCount: { type: 'number', description: 'Number of luggage bags' }
    },
    required: ['destination', 'travellerCount']
  },

  validateInput(input: unknown): ToolValidationResult<SearchTransportArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof raw.destination !== 'string' || !raw.destination.trim()) {
      errors.push("Missing 'destination'");
    }
    const count = Number(raw.travellerCount);
    if (isNaN(count) || count < 1) {
      errors.push("'travellerCount' must be at least 1");
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
      valid: true,
      data: {
        origin: String(raw.origin || 'Airport'),
        destination: String(raw.destination).trim(),
        scope: raw.scope === 'international' ? 'international' : 'domestic',
        travellerCount: count,
        luggageCount: typeof raw.luggageCount === 'number' ? raw.luggageCount : count
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<TransferItem[]> {
    if (!Array.isArray(output)) {
      return { valid: false, errors: ['Output must be an array of TransferItems'] };
    }
    const errors: string[] = [];

    for (let i = 0; i < output.length; i++) {
      const t = output[i];
      if (typeof t !== 'object' || t === null) {
        errors.push(`Transfer at index ${i} is not an object`);
        continue;
      }
      if (!t.id || typeof t.id !== 'string') {
        errors.push(`Transfer at index ${i} missing 'id'`);
      }
      if (typeof t.priceINR !== 'number' || t.priceINR <= 0) {
        errors.push(`Transfer at index ${i} has non-positive 'priceINR': ${t.priceINR}`);
      }
      if (typeof t.capacityPassengers !== 'number' || t.capacityPassengers < 1) {
        errors.push(`Transfer at index ${i} has invalid 'capacityPassengers'`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, data: output as TransferItem[] };
  },

  async execute(args: SearchTransportArgs, context: ToolExecutionContext): Promise<TransferItem[]> {
    const providers = getTravelProviders();
    return providers.transportProvider.searchTransfers(args);
  }
};

export interface EstimateTransferArgs {
  destination: string;
  pickupLocation: string;
  dropLocation: string;
  passengers: number;
}

export interface TransferEstimateResult {
  estimatedPriceINR: number;
  vehicleType: string;
  pickupLocation: string;
  dropLocation: string;
}

export const estimateTransferTool: ToolDefinition<EstimateTransferArgs, TransferEstimateResult> = {
  name: 'estimateTransfer',
  description: 'Provide an estimated fare for a private chauffeur transfer between two designated locations.',
  category: 'transport',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'Destination city' },
      pickupLocation: { type: 'string', description: 'Pickup location' },
      dropLocation: { type: 'string', description: 'Drop location' },
      passengers: { type: 'number', description: 'Passenger count', minimum: 1 }
    },
    required: ['pickupLocation', 'dropLocation', 'passengers']
  },

  validateInput(input: unknown): ToolValidationResult<EstimateTransferArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    const pax = Number(raw.passengers);
    if (!raw.pickupLocation || !raw.dropLocation || isNaN(pax) || pax < 1) {
      return { valid: false, errors: ['Missing pickup/drop locations or invalid passengers count'] };
    }
    return {
      valid: true,
      data: {
        destination: String(raw.destination || 'Destination'),
        pickupLocation: String(raw.pickupLocation),
        dropLocation: String(raw.dropLocation),
        passengers: pax
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<TransferEstimateResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be an object'] };
    }
    const raw = output as Record<string, unknown>;
    if (typeof raw.estimatedPriceINR !== 'number' || raw.estimatedPriceINR <= 0) {
      return { valid: false, errors: ['Malformed transfer estimate result'] };
    }
    return { valid: true, data: output as TransferEstimateResult };
  },

  async execute(args: EstimateTransferArgs, context: ToolExecutionContext): Promise<TransferEstimateResult> {
    const isLargeGroup = args.passengers > 4;
    return {
      estimatedPriceINR: isLargeGroup ? 3500 : 1800,
      vehicleType: isLargeGroup ? 'Toyota Innova Crysta (6-Seater AC)' : 'Sedan Chauffeur (4-Seater AC)',
      pickupLocation: args.pickupLocation,
      dropLocation: args.dropLocation
    };
  }
};
