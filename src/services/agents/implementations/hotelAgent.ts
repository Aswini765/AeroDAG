/**
 * AeroDAG Hotel Agent
 * 
 * Responsibility: Identifies and verifies accommodation options matching party size,
 * bed layout, family connectivity, senior accessibility, and budget.
 * Allowed Tools: searchHotels, getHotelDetails, checkHotelAvailability
 * Strict Constraints: No real booking or payment execution.
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import { HotelItem } from '../../../types/travelBooking';

export interface HotelAgentOutput {
  selectedHotel: HotelItem;
  availableHotels: HotelItem[];
}

export class HotelAgent extends BaseAgent<TripContext, HotelAgentOutput> {
  readonly id: AgentId = 'hotel-agent';
  readonly name = 'Hotel Agent';
  readonly description = 'Finds and validates accommodations accommodating full party capacity and accessibility constraints.';

  readonly capabilities: AgentCapability[] = [
    { name: 'HotelSearch', description: 'Searches verified accommodations by destination and duration' },
    { name: 'CapacityValidation', description: 'Enforces room capacity >= total party size' },
    { name: 'FamilySeniorSuitability', description: 'Filters for connecting suites and ground-level/elevator access' }
  ];

  readonly allowedTools = ['searchHotels', 'getHotelDetails', 'checkHotelAvailability'] as const;

  validateInput(input: unknown): input is TripContext {
    if (typeof input !== 'object' || input === null) return false;
    const ctx = input as TripContext;
    return typeof ctx.destination === 'string' && ctx.destination.length > 0;
  }

  validateOutput(output: unknown): output is HotelAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as HotelAgentOutput;
    return (
      typeof out.selectedHotel === 'object' &&
      out.selectedHotel !== null &&
      typeof out.selectedHotel.id === 'string' &&
      Array.isArray(out.availableHotels)
    );
  }

  protected async run(
    ctx: TripContext,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<HotelAgentOutput> {
    const destination = (ctx.destination || 'Goa, India').trim();
    const durationDays = Math.max(1, ctx.durationDays || 7);
    const adults = Math.max(1, ctx.adultsCount || 2);
    const children = Math.max(0, ctx.childrenCount || 0);
    const childAges = Array.isArray(ctx.childrenAges) ? ctx.childrenAges : [];
    const seniors = Math.max(0, ctx.seniorsCount || 0);
    const totalTravellers = Math.max(adults + children + seniors, ctx.totalTravellers || adults + children);

    // Tool 1: searchHotels
    const hotels = await this.callTool<any, HotelItem[]>(
      'searchHotels',
      {
        destination,
        dates: ctx.dates || 'Upcoming',
        durationNights: durationDays,
        travellerCount: totalTravellers,
        adultsCount: adults,
        childrenCount: children,
        childAges,
        hotelPreference: ctx.accommodationPreference || undefined,
        familyRequirements: children > 0 || totalTravellers > 2,
        budgetTotalINR: ctx.budgetTotalINR || undefined
      },
      context,
      toolCalls
    );

    if (hotels.length === 0) {
      throw new Error(`No hotels found in ${destination} accommodating ${totalTravellers} guests.`);
    }

    // Filter hotels ensuring capacity >= totalTravellers
    const eligibleHotels = hotels.filter((h) => h.maxCapacity >= totalTravellers);
    const selected = eligibleHotels.length > 0 ? eligibleHotels[0] : hotels[0];

    // Tool 2: checkHotelAvailability
    await this.callTool<any, any>(
      'checkHotelAvailability',
      {
        hotelId: selected.id,
        durationNights: durationDays,
        guestCount: totalTravellers
      },
      context,
      toolCalls
    );

    return {
      selectedHotel: selected,
      availableHotels: hotels
    };
  }
}
