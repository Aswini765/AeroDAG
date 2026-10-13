// src/services/destinationSuggestions.ts
// When someone asks for a place we don't plan yet, point them to the closest
// experience we DO plan, so the request doesn't dead-end.

export interface DestinationSuggestion {
  /** Covered destination to offer instead, e.g. "Coorg" */
  destination: 'Goa' | 'Coorg' | 'Kerala' | 'Mysuru';
  /** Why it's similar, finishing the sentence "<dest> is the closest match: …" */
  reason: string;
}

const GROUPS: Array<{ places: string[]; suggestion: DestinationSuggestion }> = [
  {
    places: [
      'ooty', 'coonoor', 'kodaikanal', 'yercaud', 'chikmagalur', 'chikkamagaluru', 'sakleshpur', 'manali', 'shimla',
      'kasol', 'dharamshala', 'mcleodganj', 'mussoorie', 'nainital', 'auli', 'darjeeling', 'gangtok', 'kashmir',
      'srinagar', 'gulmarg', 'pahalgam', 'ladakh', 'leh', 'spiti', 'lonavala', 'mahabaleshwar', 'matheran', 'shillong',
      'tawang', 'switzerland'
    ],
    suggestion: { destination: 'Coorg', reason: 'misty hills, coffee estates and cool weather' }
  },
  {
    places: [
      'pondicherry', 'puducherry', 'pondy', 'gokarna', 'andaman', 'andamans', 'havelock', 'port blair', 'lakshadweep',
      'diu', 'daman', 'alibaug', 'tarkarli', 'murudeshwar', 'udupi', 'mangalore', 'mangaluru', 'vizag', 'visakhapatnam',
      'puri', 'maldives', 'bali', 'phuket', 'krabi', 'thailand', 'mauritius'
    ],
    suggestion: { destination: 'Goa', reason: 'beaches, seafood and an easy, relaxed pace' }
  },
  {
    places: [
      'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'rajasthan', 'hampi', 'badami', 'agra', 'taj mahal', 'varanasi',
      'khajuraho', 'madurai', 'thanjavur', 'tanjore', 'mahabalipuram', 'gwalior', 'orchha'
    ],
    suggestion: { destination: 'Mysuru', reason: 'palaces, heritage and great local food' }
  },
  {
    places: [
      'kabini', 'bandipur', 'nagarhole', 'jim corbett', 'corbett', 'ranthambore', 'kaziranga', 'sundarbans',
      'rishikesh', 'sri lanka', 'srilanka', 'kanyakumari', 'rameswaram'
    ],
    suggestion: { destination: 'Kerala', reason: 'backwaters, wildlife and green, slow-paced nature' }
  }
];

export function suggestAlternative(place: string): DestinationSuggestion | null {
  const p = place.toLowerCase().trim();
  if (!p) return null;
  for (const g of GROUPS) {
    if (g.places.some((x) => p.includes(x) || (p.length >= 4 && x.includes(p)))) return g.suggestion;
  }
  return null;
}

/** Swap the unsupported place for the suggestion, keeping everything else the user said. */
export function swapPlaceInText(text: string, place: string, replacement: string): string {
  const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return re.test(text) ? text.replace(re, replacement) : `${text.trim()} (${replacement})`;
}

/** Find a well-known place we don't plan yet inside free text, e.g. "Ooty with my family" -> "Ooty". */
export function findKnownUnsupportedPlace(text: string): string | null {
  const lower = text.toLowerCase();
  for (const g of GROUPS) {
    for (const place of g.places) {
      if (new RegExp(`\\b${place}\\b`).test(lower)) {
        return place.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }
  return null;
}

/** No place named, but a kind of trip is ("beach holiday", "hill station"): suggest the best fit. */
export function suggestFromTripType(text: string): (DestinationSuggestion & { tripType: string }) | null {
  const lower = text.toLowerCase();
  const types: Array<[RegExp, string, DestinationSuggestion]> = [
    [/\b(beach|beaches|sea ?side|coast|island)\b/, 'a beach trip', GROUPS[1].suggestion],
    [/\b(hill ?station|hills|mountains?|trek|trekking|snow|cool weather)\b/, 'a hill trip', GROUPS[0].suggestion],
    [/\b(backwaters?|houseboat|wildlife|safari|jungle|nature)\b/, 'a nature trip', GROUPS[3].suggestion],
    [/\b(palace|palaces|heritage|history|historic|temples?|culture)\b/, 'a heritage trip', GROUPS[2].suggestion]
  ];
  for (const [re, tripType, suggestion] of types) {
    if (re.test(lower)) return { ...suggestion, tripType };
  }
  return null;
}
