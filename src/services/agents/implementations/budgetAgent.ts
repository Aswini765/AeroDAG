/**
 * AeroDAG Budget Agent
 * 
 * Responsibility: Executes deterministic financial calculations across trip components.
 * Allowed Tools: calculateBudget
 * Strict Rule: LLM never calculates sums, remaining buffers, or overages.
 * The deterministic arithmetic engine is the sole source of truth.
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripPlanBudget, Currency } from '../../../types/travelBooking';

export interface BudgetAgentInput {
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

export class BudgetAgent extends BaseAgent<BudgetAgentInput, TripPlanBudget> {
  readonly id: AgentId = 'budget-agent';
  readonly name = 'Budget Agent';
  readonly description = 'Computes deterministic totals, overage variances, and remaining budgets without LLM math.';

  readonly capabilities: AgentCapability[] = [
    { name: 'DeterministicMath', description: 'Enforces pure arithmetic budget totaling' },
    { name: 'VarianceAnalysis', description: 'Computes exact remaining buffers and overages' }
  ];

  readonly allowedTools = ['calculateBudget'] as const;

  validateInput(input: unknown): input is BudgetAgentInput {
    if (typeof input !== 'object' || input === null) return false;
    const inp = input as BudgetAgentInput;
    return typeof inp.targetBudgetINR === 'number' && inp.targetBudgetINR > 0;
  }

  validateOutput(output: unknown): output is TripPlanBudget {
    if (typeof output !== 'object' || output === null) return false;
    const b = output as TripPlanBudget;
    return (
      typeof b.grandTotalINR === 'number' &&
      typeof b.targetINR === 'number' &&
      typeof b.isOverBudget === 'boolean'
    );
  }

  protected async run(
    input: BudgetAgentInput,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<TripPlanBudget> {
    // Strictly delegate calculation to calculateBudget tool
    return this.callTool<any, TripPlanBudget>(
      'calculateBudget',
      {
        targetBudgetINR: input.targetBudgetINR,
        flightsCostINR: input.flightsCostINR,
        hotelCostINR: input.hotelCostINR,
        transportCostINR: input.transportCostINR,
        activitiesCostINR: input.activitiesCostINR,
        diningEstimateINR: input.diningEstimateINR,
        otherCostsINR: input.otherCostsINR || 0,
        currency: input.currency || 'INR',
        foreignCurrencyBreakdowns: input.foreignCurrencyBreakdowns
      },
      context,
      toolCalls
    );
  }
}
