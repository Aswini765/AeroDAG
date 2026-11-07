/**
 * AeroDAG Hotel Review & Authentic Destination Reviews Extractor
 * 
 * Cleans hotel names (removes price tags, stars, room type fragments)
 * without stripping '(demo)' or '(sample)' tags, and generates 4 clean
 * outbound search links under 'Read real reviews':
 * - Google Maps
 * - TripAdvisor
 * - Booking.com
 * - MakeMyTrip
 * 
 * Zero fake reviews, zero fake ratings, zero invented guest personas.
 */

import { HotelItem } from '../types/travelBooking';

export interface HotelReviewProfile {
  cleanName: string;
  fullLocation: string;
  externalLinks: {
    googleMapsReviewsUrl: string;
    tripAdvisorUrl: string;
    bookingComUrl: string;
    makeMyTripUrl: string;
  };
}

/**
 * Strips pricing artifacts like "~₹3,500/night", "4★ hotel in Amer" from raw hotel names.
 * Does NOT strip '(demo)' or '(sample)'.
 */
export function cleanHotelName(rawName: string, areaFallback?: string): string {
  if (!rawName) return areaFallback || 'Heritage Stay';

  let cleaned = rawName
    // remove "~₹X,XXX/night" or "~₹X,XXX"
    .replace(/~?\s*₹\s*[\d,]+\s*\/?\s*(night|day)?/gi, '')
    // remove "4★ hotel in Amer" -> keep name or area
    .replace(/^\s*\d+★\s*(hotel|resort|stay|suite|inn)?\s*(in\s+)?/gi, '')
    // remove trailing commas or dashes
    .replace(/[,-\s]+$/, '')
    // clean multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If cleaning stripped almost everything, provide a reputable name with area
  if (!cleaned || cleaned.length < 3) {
    cleaned = areaFallback ? `${areaFallback} Heritage Resort` : 'Boutique Hotel & Resort';
  }

  return cleaned;
}

/**
 * Generates authoritative outbound search URLs for any hotel item.
 */
export function extractHotelReviews(hotel: HotelItem, destinationName?: string): HotelReviewProfile {
  const destClean = (destinationName || hotel.city || 'Goa').replace(/,.*$/, '').trim();
  const areaClean = (hotel.area || hotel.city || destClean).replace(/,.*$/, '').trim();
  const nameClean = cleanHotelName(hotel.name, areaClean);

  const fullLocation = `${nameClean}, ${areaClean}, ${destClean}`;
  const encodedQuery = encodeURIComponent(`${nameClean} ${destClean}`);
  const encodedCity = encodeURIComponent(destClean);

  // 4 Outbound search links under "Read real reviews" (Prompt 2 requirement)
  const googleMapsReviewsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  const tripAdvisorUrl = `https://www.tripadvisor.in/Search?q=${encodedQuery}`;
  const bookingComUrl = `https://www.booking.com/searchresults.html?ss=${encodedQuery}`;
  const makeMyTripUrl = `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodedCity}`;

  return {
    cleanName: nameClean,
    fullLocation,
    externalLinks: {
      googleMapsReviewsUrl,
      tripAdvisorUrl,
      bookingComUrl,
      makeMyTripUrl
    }
  };
}
