/**
 * AeroDAG Transport Agent
 * 
 * Responsibility: Identifies and verifies ground transportation, airport transfers,
 * and private chauffeur options tailored to luggage volume and party headcount.
 * Allowed Tools: searchTransport, estimateTransfer
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import { TransferItem } from '../../../types/travelBooking';
import { inferTripScope } from '../../travelCatalog';

export interface TransportAgentOutput {
  selectedTransfer: TransferItem;
  availableTransfers: TransferItem[];
}

export class TransportAgent extends BaseAgent<TripContext, TransportAgentOutput> {
  readonly id: AgentId = 'transport-agent';
  readonly name = 'Transport Agent';
  readonly description = 'Recommends ground transfers based on destination, group headcount, luggage, and accessibility.';

  readonly capabilities: AgentCapability[] = [
    { name: 'TransferSearch', description: 'Finds verified airport and local transit options' },
    { name: 'CapacityLuggageMatch', description: 'Matches vehicle size to baggage count and passengers' },
    { name: 'FareEstimation', description: 'Estimates point-to-point transfer rates' }
  ];

  readonly allowedTools = ['searchTransport', 'estimateTransfer'] as const;

  validateInput(input: unknown): input is TripContext {
    if (typeof input !== 'object' || input === null) return false;
    const ctx = input as TripContext;
    return typeof ctx.destination === 'string' && ctx.destination.length > 0;
  }

  validateOutput(output: unknown): output is TransportAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as TransportAgentOutput;
    return (
      typeof out.selectedTransfer === 'object' &&
      out.selectedTransfer !== null &&
      typeof out.selectedTransfer.id === 'string' &&
      Array.isArray(out.availableTransfers)
    );
  }

  protected async run(
    ctx: TripContext,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<TransportAgentOutput> {
    const origin = (ctx.origin || 'Airport').trim();
    const destination = (ctx.destination || 'Goa, India').trim();
    const adults = Math.max(1, ctx.adultsCount || 2);
    const children = Math.max(0, ctx.childrenCount || 0);
    const seniors = Math.max(0, ctx.seniorsCount || 0);
    const totalTravellers = Math.max(adults + children + seniors, ctx.totalTravellers || adults + children);
    const scope = ctx.scope || inferTripScope(origin, destination);

    // Tool 1: searchTransport
    const transfers = await this.callTool<any, TransferItem[]>(
      'searchTransport',
      {
        origin,
        destination,
        scope,
        travellerCount: totalTravellers,
        luggageCount: totalTravellers,
        preferredMode: ctx.transportMode || undefined
      },
      context,
      toolCalls
    );

    if (transfers.length === 0) {
      throw new Error(`No ground transfers found for ${destination}.`);
    }

    // Filter transfers accommodating totalTravellers
    const eligible = transfers.filter((t) => t.capacityPassengers >= totalTravellers);
    const selected = eligible.length > 0 ? eligible[0] : transfers[0];

    return {
      selectedTransfer: selected,
      availableTransfers: transfers
    };
  }
}
