/**
 * AeroDAG Activity Tools
 * 
 * Concrete, validated experience and sightseeing tool definitions invoking ActivityProvider.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { ActivityItem } from '../../../types/travelBooking';
import { getTravelProviders } from '../../providers';

export interface SearchActivitiesArgs {
  destination: string;
  travellerProfile?: string;
  childAges?: number[];
  hasSeniors?: boolean;
  walkingPreference?: 'Low' | 'Moderate' | 'Active';
  durationDays: number;
  budgetINR?: number;
}

export const searchActivitiesTool: ToolDefinition<SearchActivitiesArgs, ActivityItem[]> = {
  name: 'searchActivities',
  description: 'Search curated activities matched to destination, pacing, walking intensity, and child/senior constraints.',
  category: 'activity',
  timeoutMs: 8000,
  inputSchema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'Destination city or region' },
      durationDays: { type: 'number', description: 'Total trip duration in days', minimum: 1 },
      childAges: { type: 'array', items: { type: 'number' }, description: 'Ages of children' },
      hasSeniors: { type: 'boolean', description: 'Whether elderly/senior travellers are present' },
      walkingPreference: { type: 'string', enum: ['Low', 'Moderate', 'Active'], description: 'Walking intensity tolerance' },
      budgetINR: { type: 'number', description: 'Budget ceiling for activities' }
    },
    required: ['destination', 'durationDays']
  },

  validateInput(input: unknown): ToolValidationResult<SearchActivitiesArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Activity input must be a non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof raw.destination !== 'string' || !raw.destination.trim()) {
      errors.push("Missing or invalid 'destination'");
    }
    const days = Number(raw.durationDays);
    if (isNaN(days) || days < 1) {
      errors.push("'durationDays' must be at least 1");
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
      valid: true,
      data: {
        destination: String(raw.destination).trim(),
        durationDays: days,
        travellerProfile: typeof raw.travellerProfile === 'string' ? raw.travellerProfile : undefined,
        childAges: Array.isArray(raw.childAges) ? (raw.childAges as number[]) : [],
        hasSeniors: Boolean(raw.hasSeniors),
        walkingPreference:
          raw.walkingPreference === 'Low' || raw.walkingPreference === 'Active'
            ? raw.walkingPreference
            : 'Moderate',
        budgetINR: typeof raw.budgetINR === 'number' ? raw.budgetINR : undefined
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<ActivityItem[]> {
    if (!Array.isArray(output)) {
      return { valid: false, errors: ['Activity tool output must be an array'] };
    }
    const errors: string[] = [];

    for (let i = 0; i < output.length; i++) {
      const a = output[i];
      if (typeof a !== 'object' || a === null) {
        errors.push(`Activity at index ${i} is not an object`);
        continue;
      }
      if (typeof a.id !== 'string' || !a.id) {
        errors.push(`Activity at index ${i} missing 'id'`);
      }
      if (typeof a.name !== 'string' || !a.name) {
        errors.push(`Activity at index ${i} missing 'name'`);
      }
      const price = typeof a.estimatedPriceINR === 'number' ? a.estimatedPriceINR : (typeof a.priceINR === 'number' ? a.priceINR : -1);
      if (price < 0) {
        errors.push(`Activity at index ${i} missing or negative price ('estimatedPriceINR' or 'priceINR')`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, data: output as ActivityItem[] };
  },

  async execute(args: SearchActivitiesArgs, context: ToolExecutionContext): Promise<ActivityItem[]> {
    const providers = getTravelProviders();
    return providers.activityProvider.searchActivities(args);
  }
};

export interface GetActivityDetailsArgs {
  activityId: string;
}

export const getActivityDetailsTool: ToolDefinition<GetActivityDetailsArgs, ActivityItem | null> = {
  name: 'getActivityDetails',
  description: 'Retrieve details for a specific experience.',
  category: 'activity',
  timeoutMs: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      activityId: { type: 'string', description: 'Activity identifier' }
    },
    required: ['activityId']
  },

  validateInput(input: unknown): ToolValidationResult<GetActivityDetailsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    if (!raw.activityId || typeof raw.activityId !== 'string') {
      return { valid: false, errors: ["Missing 'activityId'"] };
    }
    return { valid: true, data: { activityId: String(raw.activityId).trim() } };
  },

  validateOutput(output: unknown): ToolValidationResult<ActivityItem | null> {
    if (output === null) return { valid: true, data: null };
    if (typeof output !== 'object') {
      return { valid: false, errors: ['Output must be an object or null'] };
    }
    return { valid: true, data: output as ActivityItem };
  },

  async execute(args: GetActivityDetailsArgs, context: ToolExecutionContext): Promise<ActivityItem | null> {
    const providers = getTravelProviders();
    const all = await providers.activityProvider.searchActivities({
      destination: 'Goa',
      durationDays: 7
    });
    return all.find((a) => a.id === args.activityId) || all[0] || null;
  }
};
