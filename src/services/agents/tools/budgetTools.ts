/**
 * AeroDAG Budget Tools
 * 
 * Invokes the deterministic financial arithmetic engine.
 * Never delegates financial arithmetic, totals, overages, or savings to LLM reasoning.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { TripPlanBudget, Currency } from '../../../types/travelBooking';

export interface CalculateBudgetArgs {
  targetBudgetINR: number;
  flightsCostINR: number;
  hotelCostINR: number;
  transportCostINR: number;
  activitiesCostINR: number;
  diningEstimateINR: number;
  otherCostsINR?: number;
  currency?: Currency;
  foreignCurrencyBreakdowns?: Array<{
    amount: number;
    sourceCurrency: string;
    exchangeRate: number;
    rateTimestamp: string;
    targetCurrency: string;
    convertedAmount: number;
    provider: string;
    cached?: boolean;
    isStale?: boolean;
  }>;
}

export const calculateBudgetTool: ToolDefinition<CalculateBudgetArgs, TripPlanBudget> = {
  name: 'calculateBudget',
  description: 'Deterministically compute total package costs, remaining allowances, and overage thresholds.',
  category: 'budget',
  timeoutMs: 3000,
  inputSchema: {
    type: 'object',
    properties: {
      targetBudgetINR: { type: 'number', description: 'Target trip budget in INR' },
      flightsCostINR: { type: 'number', description: 'Total flight expenses' },
      hotelCostINR: { type: 'number', description: 'Total hotel lodging expenses' },
      transportCostINR: { type: 'number', description: 'Total ground transfer expenses' },
      activitiesCostINR: { type: 'number', description: 'Total sightseeing expenses' },
      diningEstimateINR: { type: 'number', description: 'Estimated dining allowance' },
      otherCostsINR: { type: 'number', description: 'Visa and auxiliary costs' }
    },
    required: ['targetBudgetINR', 'flightsCostINR', 'hotelCostINR', 'transportCostINR', 'activitiesCostINR']
  },

  validateInput(input: unknown): ToolValidationResult<CalculateBudgetArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be a valid non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const target = Number(raw.targetBudgetINR);
    if (isNaN(target) || target <= 0) {
      return { valid: false, errors: ["'targetBudgetINR' must be a positive number"] };
    }

    return {
      valid: true,
      data: {
        targetBudgetINR: target,
        flightsCostINR: Math.max(0, Number(raw.flightsCostINR) || 0),
        hotelCostINR: Math.max(0, Number(raw.hotelCostINR) || 0),
        transportCostINR: Math.max(0, Number(raw.transportCostINR) || 0),
        activitiesCostINR: Math.max(0, Number(raw.activitiesCostINR) || 0),
        diningEstimateINR: Math.max(0, Number(raw.diningEstimateINR) || 0),
        otherCostsINR: Math.max(0, Number(raw.otherCostsINR) || 0),
        currency: (raw.currency as Currency) || 'INR'
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<TripPlanBudget> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Budget output must be an object'] };
    }
    const b = output as TripPlanBudget;
    if (typeof b.grandTotalINR !== 'number' || typeof b.targetINR !== 'number') {
      return { valid: false, errors: ['Malformed budget result: missing grandTotalINR or targetINR'] };
    }

    // Mathematical verification: Verify sum matches parts
    const expected =
      b.flightsCostINR +
      b.hotelCostINR +
      b.transportCostINR +
      b.activitiesCostINR +
      b.diningEstimateINR +
      b.otherCostsINR;

    if (Math.abs(b.grandTotalINR - expected) > 1) {
      return {
        valid: false,
        errors: [`Deterministic sum check failed: grandTotalINR (${b.grandTotalINR}) != sum of components (${expected})`]
      };
    }

    return { valid: true, data: b };
  },

  async execute(args: CalculateBudgetArgs, context: ToolExecutionContext): Promise<TripPlanBudget> {
    const flightsCostINR = Math.round(args.flightsCostINR);
    const hotelCostINR = Math.round(args.hotelCostINR);
    const transportCostINR = Math.round(args.transportCostINR);
    const activitiesCostINR = Math.round(args.activitiesCostINR);
    const diningEstimateINR = Math.round(args.diningEstimateINR);
    const otherCostsINR = Math.round(args.otherCostsINR || 0);

    const grandTotalINR =
      flightsCostINR + hotelCostINR + transportCostINR + activitiesCostINR + diningEstimateINR + otherCostsINR;

    const remainingBudgetINR = args.targetBudgetINR - grandTotalINR;
    const isOverBudget = remainingBudgetINR < 0;
    const overBudgetAmountINR = isOverBudget ? Math.abs(remainingBudgetINR) : 0;

    return {
      targetINR: args.targetBudgetINR,
      flightsCostINR,
      hotelCostINR,
      transportCostINR,
      activitiesCostINR,
      diningEstimateINR,
      otherCostsINR,
      grandTotalINR,
      remainingBudgetINR,
      overBudgetAmountINR,
      isOverBudget,
      statusMessage: isOverBudget
        ? `Over budget by ₹${overBudgetAmountINR.toLocaleString()}`
        : `Within budget with ₹${remainingBudgetINR.toLocaleString()} remaining`,
      foreignCurrencyBreakdowns: args.foreignCurrencyBreakdowns
    };
  }
};
