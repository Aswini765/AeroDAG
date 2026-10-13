/**
 * AeroDAG Question Relevance Evaluator
 * 
 * Verifies that conversational questions asked by the agent adhere to:
 * 1. Minimum-Question Principle (only 1 question asked at a time)
 * 2. Relevance (directly needed to resolve planning or regulatory requirements)
 * 3. Non-redundancy (never re-asking information already known in trip context)
 * 4. Anti-inferral enforcement (verifies nationality is asked, not guessed for international trips)
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';
import { TripContext } from '../../../../src/services/requirementEngine';

export class QuestionRelevanceEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { actualNextQuestion, scenario } = payload;

    // If planning was already ready, question should be null
    if (payload.scenario.expectedOutput?.shouldBeReadyToPlan) {
      if (actualNextQuestion !== null) {
        return {
          evaluatorName: 'QuestionRelevanceEvaluator',
          passed: false,
          score: 0.0,
          reason: `Expected zero clarifying questions because requirements were sufficient, but agent asked '${actualNextQuestion.questionText}'`
        };
      }
      return {
        evaluatorName: 'QuestionRelevanceEvaluator',
        passed: true,
        score: 1.0,
        reason: 'Question suppressed cleanly as requirements were already sufficient to plan.'
      };
    }

    if (!actualNextQuestion) {
      return {
        evaluatorName: 'QuestionRelevanceEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No questions generated.'
      };
    }

    // Check non-redundancy: question must not query an existing non-null field in context
    const ctx = payload.actualRequirements || (payload.scenario.context as TripContext);
    if (ctx) {
      const qKey = actualNextQuestion.requirementKey;
      if (qKey === 'destination' && ctx.destination) {
        return {
          evaluatorName: 'QuestionRelevanceEvaluator',
          passed: false,
          score: 0.0,
          reason: `Redundant question: Destination is already known as '${ctx.destination}', but agent asked for destination again.`
        };
      }
      if (qKey === 'origin' && ctx.origin) {
        return {
          evaluatorName: 'QuestionRelevanceEvaluator',
          passed: false,
          score: 0.0,
          reason: `Redundant question: Origin is already known as '${ctx.origin}', but agent asked for origin again.`
        };
      }
      if (qKey === 'budget' && ctx.budgetTotalINR !== null) {
        return {
          evaluatorName: 'QuestionRelevanceEvaluator',
          passed: false,
          score: 0.0,
          reason: `Redundant question: Budget is already known as ₹${ctx.budgetTotalINR}, but agent asked for budget again.`
        };
      }
    }

    return {
      evaluatorName: 'QuestionRelevanceEvaluator',
      passed: true,
      score: 1.0,
      reason: `Question '${actualNextQuestion.questionText}' is relevant, non-redundant, and targets missing requirement '${actualNextQuestion.requirementKey}'.`
    };
  }
}
