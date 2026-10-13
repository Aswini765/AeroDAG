/**
 * AeroDAG Activity Agent
 * 
 * Responsibility: Recommends curated attractions, nature tours, cultural immersions,
 * and dining experiences tailored to child safety, senior pacing, and walking intensity.
 * Allowed Tools: searchActivities, getActivityDetails
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import { ActivityItem } from '../../../types/travelBooking';

export interface ActivityAgentOutput {
  activities: ActivityItem[];
  availableActivities: ActivityItem[];
}

export class ActivityAgent extends BaseAgent<TripContext, ActivityAgentOutput> {
  readonly id: AgentId = 'activity-agent';
  readonly name = 'Activity Agent';
  readonly description = 'Discovers and curates experiences matching party demographic pacing and mobility tolerances.';

  readonly capabilities: AgentCapability[] = [
    { name: 'ActivitySearch', description: 'Finds verified activities by destination and duration' },
    { name: 'PacingFilter', description: 'Filters experiences by low walking intensity and shade' },
    { name: 'FamilySafetyCheck', description: 'Validates safety gear and child suitability scores' }
  ];

  readonly allowedTools = ['searchActivities', 'getActivityDetails'] as const;

  validateInput(input: unknown): input is TripContext {
    if (typeof input !== 'object' || input === null) return false;
    const ctx = input as TripContext;
    return typeof ctx.destination === 'string' && ctx.destination.length > 0;
  }

  validateOutput(output: unknown): output is ActivityAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as ActivityAgentOutput;
    return Array.isArray(out.activities) && Array.isArray(out.availableActivities);
  }

  protected async run(
    ctx: TripContext,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<ActivityAgentOutput> {
    const destination = (ctx.destination || 'Goa, India').trim();
    const durationDays = Math.max(1, ctx.durationDays || 7);
    const childAges = Array.isArray(ctx.childrenAges) ? ctx.childrenAges : [];
    const hasSeniors = (ctx.seniorsCount || 0) > 0 || ctx.walkingIntensity === 'Low';
    const walkingPreference = ctx.walkingIntensity || (hasSeniors ? 'Low' : 'Moderate');

    // Tool 1: searchActivities
    const allActivities = await this.callTool<any, ActivityItem[]>(
      'searchActivities',
      {
        destination,
        childAges,
        hasSeniors,
        walkingPreference,
        durationDays,
        budgetINR: ctx.budgetTotalINR || undefined
      },
      context,
      toolCalls
    );

    // Select subset matching trip duration (e.g. 1 major activity per day, max 5)
    const selectedCount = Math.min(allActivities.length, Math.max(2, durationDays - 2));
    const selected = allActivities.slice(0, selectedCount);

    return {
      activities: selected,
      availableActivities: allActivities
    };
  }
}
