/**
 * AeroDAG Knowledge Need Detector
 * 
 * Determines whether a user message requires RAG retrieval vs. normal conversational
 * planning/parameter extraction or trip modification. Enriches queries with Trip Context.
 */

import { TripContext } from '../requirementEngine';
import { KnowledgeCategory, KnowledgeNeedDecision } from '../../types/travelKnowledge';

export class KnowledgeNeedDetector {
  private static readonly MODIFICATION_PATTERNS = [
    /\bmake\s+(?:it|this|the\s+hotel|flights?)\s+cheaper\b/i,
    /\b(?:cheaper|lower\s+cost|reduce\s+(?:price|cost|budget)|save\s+money)\b/i,
    /\bremove\s+(?:the\s+)?(?:beach|museums?|hiking|day\s+\d+)\b/i,
    /\bchange\s+(?:my\s+)?(?:budget|dates?|origin|hotel|flight)\b/i,
    /\b(?:actually|switch\s+to|update)\s+(?:budget|dates?|hotel)\b/i,
    /\b(?:plan\s+(?:a|my)|build\s+my\s+trip|book\s+my\s+trip)\b/i,
    /\b(?:we\s+want|looking\s+for)\s+(?:a\s+)?(?:[\w-]+\s+)?trip\b/i,
    /\bwe\s+are\s+\d+\s+adults?.*trip\b/i,
    /^\s*\d+\s+adults?(?:\s+and\s+\d+\s+(?:kids?|children))?\s*$/i,
    /^\s*(?:ages?\s*)?\d+(?:\s*,\s*\d+)*\s*$/i,
    /^\s*(?:₹\s*)?\d+(?:,\d+)*(?:\s*(?:lakh|lac|k))?\s*$/i
  ];

  private static readonly KNOWLEDGE_PATTERNS = [
    /\b(?:visa|evisa|e-visa|voa|visa-on-arrival|consul|embassy|permit)\b/i,
    /\b(?:passport(?:\s+validity)?|blank\s+pages|validity\s+period)\b/i,
    /\b(?:entry\s+requirements?|border\s+control|customs|visit\s+japan\s+web|sg\s+arrival\s+card|sgac)\b/i,
    /\b(?:documents?|identification|photo\s+id|aadhaar|digiyatra|bcas)\b/i,
    /\b(?:what\s+should\s+(?:we|i)\s+(?:know|prepare|consider)|preparation|checklist)\b/i,
    /\b(?:travell?ing\s+with\s+(?:children|kids?|minors?|infants?)|strollers?|nursing)\b/i,
    /\b(?:cannot\s+walk|elderly|senior|wheelchair|accessibility|step\s+count|stairs)\b/i,
    /\b(?:airport\s+(?:rules|terminal|transit|skytrain)|changi|suvarnabhumi|noi\s+bai)\b/i,
    /\b(?:taxi\s+(?:scams?|rates?)|goamiles|grab\s+app|mrt|suica|pasmo|transit\s+pass)\b/i,
    /\b(?:beach\s+safety|red\s+flags?|drishti|swimming\s+rules|safety\s+rules|hygiene)\b/i,
    /\b(?:currency|dong|baht|yen|cash\s+or\s+card|sim\s+cards?|esim)\b/i
  ];

  /**
   * Decides if the message represents a genuine knowledge inquiry
   */
  static detectNeed(message: string, tripContext?: TripContext): KnowledgeNeedDecision {
    return this.evaluate(message, tripContext);
  }

  static evaluate(message: string, tripContext?: TripContext): KnowledgeNeedDecision {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // 1. Check if this is an explicit trip modification or planning onboarding command
    for (const pattern of this.MODIFICATION_PATTERNS) {
      if (pattern.test(lower)) {
        return {
          needsKnowledge: false,
          reason: 'Operational trip modification or planning command.',
          refinedQuery: trimmed
        };
      }
    }

    // 2. Check if any knowledge intent pattern matches
    const isKnowledgeInquiry = this.KNOWLEDGE_PATTERNS.some((pat) => pat.test(lower));

    // Also check for explicit question words paired with travel concepts
    const isQuestionAboutDestination =
      (lower.includes('?') || lower.startsWith('what') || lower.startsWith('do ') || lower.startsWith('how ') || lower.startsWith('can ')) &&
      (lower.includes('need') || lower.includes('require') || lower.includes('rules') || lower.includes('safe') || lower.includes('bring') || lower.includes('carry'));

    if (!isKnowledgeInquiry && !isQuestionAboutDestination) {
      return {
        needsKnowledge: false,
        reason: 'Standard conversational input or preference declaration.',
        refinedQuery: trimmed
      };
    }

    // 3. Detect Destination
    let detectedDestination: string | undefined;
    if (lower.includes('vietnam') || lower.includes('hanoi') || lower.includes('halong') || lower.includes('da nang')) {
      detectedDestination = 'Vietnam';
    } else if (lower.includes('singapore') || lower.includes('changi')) {
      detectedDestination = 'Singapore';
    } else if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('phuket') || lower.includes('krabi')) {
      detectedDestination = 'Thailand';
    } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto') || lower.includes('osaka')) {
      detectedDestination = 'Japan';
    } else if (lower.includes('goa')) {
      detectedDestination = 'Goa';
    } else if (tripContext?.destination) {
      // Inherit from active Trip Context!
      detectedDestination = this.cleanDestination(tripContext.destination);
    } else if (/\b(?:to|in|visit|around|within)\s+india\b/i.test(lower) || lower.includes('domestic travel')) {
      detectedDestination = 'India';
    } else {
      // Extract target destination from query phrases like "for <place>", "travel to <place>", "to <place>", "in <place>"
      const destMatch = trimmed.match(/\b(?:travel\s+to|fly\s+to|visit\s+to|heading\s+to|for|to|in|visit|visiting)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
      if (destMatch) {
        const candidate = destMatch[1].replace(/[?!.,;:]/g, '').trim();
        const nonDestWords = ['a', 'an', 'the', 'my', 'our', 'this', 'that', 'visa', 'trip', 'travel', 'vacation', 'holiday', 'flight', 'hotel', 'entry', 'passport', 'kids', 'family', 'children'];
        if (candidate && !nonDestWords.includes(candidate.toLowerCase())) {
          detectedDestination = candidate;
        }
      }
    }

    // 4. Detect Category
    let detectedCategory: KnowledgeCategory | undefined;
    if (lower.includes('visa') || lower.includes('evisa') || lower.includes('voa') || lower.includes('permit')) {
      detectedCategory = 'VISA';
    } else if (lower.includes('passport') || lower.includes('validity') || lower.includes('pages')) {
      detectedCategory = 'PASSPORT';
    } else if (lower.includes('id') || lower.includes('aadhaar') || lower.includes('documents') || lower.includes('entry')) {
      detectedCategory = 'ENTRY_REQUIREMENTS';
    } else if (lower.includes('child') || lower.includes('kid') || lower.includes('family') || lower.includes('stroller')) {
      detectedCategory = 'FAMILY_TRAVEL';
    } else if (lower.includes('senior') || lower.includes('elderly') || lower.includes('walk') || lower.includes('wheelchair')) {
      detectedCategory = 'SENIOR_TRAVEL';
    } else if (lower.includes('airport') || lower.includes('changi') || lower.includes('digiyatra')) {
      detectedCategory = 'AIRPORT';
    } else if (lower.includes('transit') || lower.includes('transport') || lower.includes('taxi') || lower.includes('grab') || lower.includes('metro')) {
      detectedCategory = 'TRANSPORT';
    } else if (lower.includes('prep') || lower.includes('currency') || lower.includes('cash') || lower.includes('sim') || lower.includes('rules')) {
      detectedCategory = 'TRAVEL_POLICY';
    }

    // 5. Construct Contextually Enriched Query
    let refinedQuery = trimmed;
    if (detectedDestination && !lower.includes(detectedDestination.toLowerCase())) {
      refinedQuery = `${detectedDestination} ${refinedQuery}`;
    }

    // Incorporate party constraints from Trip Context if available and relevant
    if (tripContext) {
      if (tripContext.childrenCount && tripContext.childrenCount > 0 && !lower.includes('child') && !lower.includes('kid')) {
        refinedQuery += ' family with children';
      }
      if (tripContext.seniorsCount && tripContext.seniorsCount > 0 && !lower.includes('senior')) {
        refinedQuery += ' senior elderly travellers';
      }
      if (tripContext.walkingIntensity === 'Low' && !lower.includes('walk')) {
        refinedQuery += ' low walking accessibility';
      }
    }

    return {
      needsKnowledge: true,
      detectedDestination,
      detectedCategory,
      reason: `Detected travel knowledge inquiry for ${detectedDestination || 'trip'} [${detectedCategory || 'GENERAL'}].`,
      refinedQuery
    };
  }

  private static cleanDestination(raw: string): string {
    const l = raw.toLowerCase();
    if (l.includes('vietnam')) return 'Vietnam';
    if (l.includes('singapore')) return 'Singapore';
    if (l.includes('thailand')) return 'Thailand';
    if (l.includes('japan')) return 'Japan';
    if (l.includes('goa')) return 'Goa';
    if (l.includes('india')) return 'India';
    return raw.replace(/,.*$/, '').trim();
  }
}
