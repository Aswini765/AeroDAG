/**
 * AeroDAG — Destination Profile Types for AI-Generated Indian Destinations
 */

export interface NearestAirport {
  code: string; // 3-letter uppercase IATA code, e.g. "CJB"
  name: string;
  driveHoursToCenter: number; // 0 to 24
}

export interface NearestRailway {
  name: string;
  driveHoursToCenter: number; // 0 to 24
}

export interface StayArea {
  name: string;
  whyStayHere: string;
  priceLevel: 'budget' | 'mid' | 'premium';
}

export interface TopSight {
  name: string;
  area: string;
  hoursNeeded: number; // 0.5 to 12
}

export interface TypicalDailyCostPerPersonINR {
  stay: {
    budget: number; // ₹200 to ₹50,000
    mid: number;
    premium: number;
  };
  food: number;
  localTransport: number;
  activities: number;
}

export interface DestinationProfile {
  name: string;
  state: string;
  isInIndia: boolean;
  nearestAirports: NearestAirport[];
  nearestRailway: NearestRailway | null;
  stayAreas: StayArea[]; // 3–4 areas
  topSights: TopSight[]; // 6–10 sights
  typicalDailyCostPerPersonINR: TypicalDailyCostPerPersonINR;
  bestMonths: string;
  weatherNote: string;
  localTips: string[]; // exactly 3 tips
  vegFriendly: 'low' | 'medium' | 'high';
}

export type DestinationProfileApiResponse =
  | { unsupported: true; place?: string }
  | DestinationProfile;
