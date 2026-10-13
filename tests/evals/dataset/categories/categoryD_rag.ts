/**
 * Category D: RAG Retrieval, Groundedness & Regulatory Accuracy Scenarios
 * 
 * Evaluates semantic retrieval relevance, official authority citations,
 * grounded claim validation, and uncertainty handling on missing knowledge.
 */

import { EvaluationScenario } from '../../types/evalTypes';
import { RequirementEngine } from '../../../../src/services/requirementEngine';

export const categoryDScenarios: EvaluationScenario[] = [
  {
    id: 'D1_vietnam_visa_grounded',
    category: 'RAG',
    description: 'Inquiry regarding visa regulations for Indian citizens traveling to Vietnam',
    input: 'Do Indian passport holders need a visa to visit Vietnam?',
    expectedBehavior: 'Retrieve official Vietnam immigration knowledge; cite Vietnam National Immigration Department; state 30-day e-Visa requirement',
    expectedOutput: {
      destination: 'Vietnam',
      shouldBeGrounded: true,
      expectedConfidence: 'HIGH',
      expectedAuthoritySources: ['Vietnam National Immigration Department'],
      mustContainText: ['e-Visa', 'Vietnam']
    },
    evaluatorConfig: {
      useRagEvaluator: true
    },
    tags: ['rag', 'visa', 'vietnam', 'grounded']
  },
  {
    id: 'D2_singapore_family_stroller',
    category: 'RAG',
    description: 'Family travel inquiry on stroller friendliness and MRT accessibility in Singapore',
    input: 'Is Singapore MRT and public transit stroller-friendly for toddlers?',
    expectedBehavior: 'Retrieve Singapore Tourism Board guidance; explain lift access, wide fare gates, and priority seating',
    expectedOutput: {
      destination: 'Singapore',
      shouldBeGrounded: true,
      expectedConfidence: 'HIGH',
      expectedAuthoritySources: ['Singapore Tourism Board'],
      mustContainText: ['MRT', 'stroller']
    },
    evaluatorConfig: {
      useRagEvaluator: true
    },
    tags: ['rag', 'family', 'singapore', 'transit']
  },
  {
    id: 'D3_japan_transit_preparation',
    category: 'RAG',
    description: 'Travel preparation inquiry for Japan transit passes and electronic payment',
    input: 'What travel card should I buy for local trains in Tokyo, and how does Visit Japan Web work?',
    expectedBehavior: 'Retrieve Japan National Tourism Organization documents; cite Suica/Pasmo and Visit Japan Web customs QR code',
    expectedOutput: {
      destination: 'Japan',
      shouldBeGrounded: true,
      expectedConfidence: 'HIGH',
      expectedAuthoritySources: ['Japan National Tourism Organization'],
      mustContainText: ['Suica', 'Pasmo']
    },
    evaluatorConfig: {
      useRagEvaluator: true
    },
    tags: ['rag', 'japan', 'transit', 'customs']
  },
  {
    id: 'D4_thailand_senior_accessibility',
    category: 'RAG',
    description: 'Health and mobility advice for senior travelers visiting Bangkok and Phuket',
    input: 'What precautions should elderly travelers take in Thailand regarding heat and temple steps?',
    expectedBehavior: 'Retrieve Tourism Authority of Thailand medical/wellness documents; recommend hydration, morning temple visits, and wheelchair ramps',
    expectedOutput: {
      destination: 'Thailand',
      shouldBeGrounded: true,
      expectedConfidence: 'HIGH',
      expectedAuthoritySources: ['Tourism Authority of Thailand'],
      mustContainText: ['heat', 'morning']
    },
    evaluatorConfig: {
      useRagEvaluator: true
    },
    tags: ['rag', 'thailand', 'senior', 'health']
  },
  {
    id: 'D5_unknown_destination_uncertainty',
    category: 'RAG',
    description: 'Inquiry regarding visa rules for a mythical or unknown country (Atlantis)',
    input: 'Do Indian passport holders need a visa to travel to Atlantis?',
    context: {
      ...RequirementEngine.createEmptyContext(),
      destination: 'Atlantis'
    },
    expectedBehavior: 'Acknowledge lack of verified knowledge, cite 0 sources, return explicit UNCERTAIN confidence; zero hallucinated visa rules',
    expectedOutput: {
      destination: 'Atlantis',
      shouldBeGrounded: false,
      expectedConfidence: 'UNCERTAIN',
      mustContainText: ['do not have verified regulatory knowledge']
    },
    evaluatorConfig: {
      useRagEvaluator: true
    },
    tags: ['rag', 'uncertainty', 'hallucination_prevention', 'unknown_destination']
  }
];
