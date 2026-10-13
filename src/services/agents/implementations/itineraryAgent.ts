/**
 * AeroDAG Itinerary Agent
 * 
 * Responsibility: Synthesizes validated travel components (flights, hotels, transfers, activities)
 * into a coherent day-by-day itinerary respecting day boundaries, transit buffers,
 * family pacing, and senior accessibility.
 * Strict Constraints: Does NOT perform financial arithmetic.
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import {
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityItem,
  ActivityDayItem,
  DiningItem,
  MapWaypoint
} from '../../../types/travelBooking';
import { TripPlanningEngine } from '../../tripPlanningEngine';
import { getProviderRegistry } from '../../providers/providerRegistry';
import { MapProvider, ItineraryRouteAnalysis, ItineraryWeatherAnalysis } from '../../providers/types';
import { ContextTravelEvaluator } from '../../providers/contextTravelEvaluator';

export interface ItineraryAgentInput {
  tripContext: TripContext;
  flight: FlightItem;
  hotel: HotelItem;
  transfer: TransferItem;
  activities: ActivityItem[];
}

export interface ItineraryAgentOutput {
  itinerary: ActivityDayItem[];
  diningSuggestions: DiningItem[];
  mapWaypoints: MapWaypoint[];
  routeAnalysis?: ItineraryRouteAnalysis;
  weatherAnalysis?: ItineraryWeatherAnalysis;
}

export class ItineraryAgent extends BaseAgent<ItineraryAgentInput, ItineraryAgentOutput> {
  readonly id: AgentId = 'itinerary-agent';
  readonly name = 'Itinerary Agent';
  readonly description = 'Synthesizes validated flight, hotel, and activity options into a coherent, paced daily schedule.';

  readonly capabilities: AgentCapability[] = [
    { name: 'ScheduleAssembly', description: 'Builds daily morning/afternoon/evening schedules' },
    { name: 'PacingEnforcement', description: 'Inserts rest downtime and transit buffers for families and seniors' },
    { name: 'WaypointMapping', description: 'Generates geographic waypoints for itinerary route visualization' }
  ];

  readonly allowedTools = [] as const; // Coordinates domain scheduling models without external transactional APIs

  validateInput(input: unknown): input is ItineraryAgentInput {
    if (typeof input !== 'object' || input === null) return false;
    const inp = input as ItineraryAgentInput;
    return (
      typeof inp.tripContext === 'object' &&
      inp.tripContext !== null &&
      typeof inp.flight === 'object' &&
      inp.flight !== null &&
      typeof inp.hotel === 'object' &&
      inp.hotel !== null &&
      typeof inp.transfer === 'object' &&
      inp.transfer !== null &&
      Array.isArray(inp.activities)
    );
  }

  validateOutput(output: unknown): output is ItineraryAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as ItineraryAgentOutput;
    return (
      Array.isArray(out.itinerary) &&
      out.itinerary.length > 0 &&
      Array.isArray(out.diningSuggestions) &&
      Array.isArray(out.mapWaypoints)
    );
  }

  protected async run(
    input: ItineraryAgentInput,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<ItineraryAgentOutput> {
    const { tripContext, flight, hotel, transfer, activities } = input;
    const destination = (tripContext.destination || 'Goa, India').trim();
    const durationDays = Math.max(1, tripContext.durationDays || 7);
    const seniors = Math.max(0, tripContext.seniorsCount || 0);
    const childAges = Array.isArray(tripContext.childrenAges) ? tripContext.childrenAges : [];
    const totalTravellers = tripContext.totalTravellers || (tripContext.adultsCount || 2) + (tripContext.childrenCount || 0) + seniors;

    // Resolve dining recommendations
    const diningSuggestions: DiningItem[] = (TripPlanningEngine as any).resolveDiningSuggestions(
      destination,
      tripContext.dietaryPreference || undefined
    );

    // Generate paced day-by-day itinerary
    const walkingIntensity =
      tripContext.walkingIntensity ||
      (seniors > 0 || tripContext.travelStyle === 'Relaxed' ? 'Low' : 'Moderate');

    const itinerary: ActivityDayItem[] = (TripPlanningEngine as any).generateDayItinerary({
      destination,
      origin: tripContext.origin || 'Bengaluru (BLR)',
      durationDays,
      dates: tripContext.dates || 'Upcoming Season',
      totalTravellers,
      childAges,
      seniors,
      walkingIntensity,
      allActivities: activities,
      selectedHotel: hotel,
      diningSuggestions
    });

    // Generate geographic route waypoints
    const mapWaypoints: MapWaypoint[] = TripPlanningEngine.generateMapWaypoints({
      origin: tripContext.origin || 'Bengaluru (BLR)',
      destination,
      hotel,
      itinerary
    });

    let routeAnalysis: ItineraryRouteAnalysis | undefined;
    try {
      const stops = mapWaypoints.map(w => ({ name: w.name, location: w.area }));
      if (stops.length >= 2) {
        const mapProvider = getProviderRegistry().resolveProvider<MapProvider>('maps');
        routeAnalysis = await ContextTravelEvaluator.evaluateItineraryRoutes(stops, mapProvider);
      }
    } catch {
      // Degrade safely if map route calculation encounters error
    }

    return {
      itinerary,
      diningSuggestions,
      mapWaypoints,
      routeAnalysis
    };
  }
}
