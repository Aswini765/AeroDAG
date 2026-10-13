/**
 * AeroDAG Flight Agent
 * 
 * Responsibility: Identifies and verifies optimal air transport options matching TripContext.
 * Allowed Tools: searchFlights, getFlightDetails, checkFlightAvailability
 * Strict Constraints: Does NOT book flights, execute payments, or modify hotels/itineraries.
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import { FlightItem } from '../../../types/travelBooking';
import { inferTripScope } from '../../travelCatalog';

export interface FlightAgentOutput {
  selectedFlight: FlightItem;
  availableFlights: FlightItem[];
}

export class FlightAgent extends BaseAgent<TripContext, FlightAgentOutput> {
  readonly id: AgentId = 'flight-agent';
  readonly name = 'Flight Agent';
  readonly description = 'Searches, scores, and verifies flight options suitable for origin, destination, and passenger count.';

  readonly capabilities: AgentCapability[] = [
    { name: 'FlightSearch', description: 'Searches domestic and international flights' },
    { name: 'SeatVerification', description: 'Verifies seat inventory availability' },
    { name: 'AirlineScoring', description: 'Ranks flights based on budget, stops, and schedules' }
  ];

  readonly allowedTools = ['searchFlights', 'getFlightDetails', 'checkFlightAvailability'] as const;

  validateInput(input: unknown): input is TripContext {
    if (typeof input !== 'object' || input === null) return false;
    const ctx = input as TripContext;
    return typeof ctx.destination === 'string' && ctx.destination.length > 0;
  }

  validateOutput(output: unknown): output is FlightAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as FlightAgentOutput;
    return (
      typeof out.selectedFlight === 'object' &&
      out.selectedFlight !== null &&
      typeof out.selectedFlight.id === 'string' &&
      Array.isArray(out.availableFlights)
    );
  }

  protected async run(
    ctx: TripContext,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<FlightAgentOutput> {
    const origin = (ctx.origin || 'Bengaluru (BLR)').trim();
    const destination = (ctx.destination || 'Goa, India').trim();
    const adults = Math.max(1, ctx.adultsCount || 2);
    const children = Math.max(0, ctx.childrenCount || 0);
    const seniors = Math.max(0, ctx.seniorsCount || 0);
    const totalTravellers = Math.max(adults + children + seniors, ctx.totalTravellers || adults + children);
    const scope = ctx.scope || inferTripScope(origin, destination);

    // Tool 1: searchFlights
    const flights = await this.callTool<any, FlightItem[]>(
      'searchFlights',
      {
        origin,
        destination,
        dates: ctx.dates || 'Upcoming',
        travellerCount: totalTravellers,
        adultsCount: adults,
        childrenCount: children,
        scope,
        budgetCeilingINR: ctx.budgetTotalINR || undefined
      },
      context,
      toolCalls
    );

    if (flights.length === 0) {
      throw new Error(`No flights available between ${origin} and ${destination}.`);
    }

    // Select primary best-fit flight
    const selected = flights[0];

    // Tool 2: checkFlightAvailability
    await this.callTool<any, any>(
      'checkFlightAvailability',
      {
        flightId: selected.id,
        passengerCount: totalTravellers
      },
      context,
      toolCalls
    );

    return {
      selectedFlight: selected,
      availableFlights: flights
    };
  }
}
